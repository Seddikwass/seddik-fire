// Serveur WebSocket minimal (RFC 6455) sans dépendance : poignée de main, trames texte,
// ping/pong, fermeture. Suffisant pour les messages JSON du match en ligne.
import crypto from 'node:crypto';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const MAX_PAYLOAD = 64 * 1024;

export function acceptKey(key) {
  return crypto.createHash('sha1').update(key + GUID).digest('base64');
}

export function encodeFrame(data, opcode = 1) {
  const payload = Buffer.isBuffer(data) ? data : Buffer.from(String(data));
  const len = payload.length;
  let header;
  if (len < 126) { header = Buffer.alloc(2); header[1] = len; }
  else if (len < 65536) { header = Buffer.alloc(4); header[1] = 126; header.writeUInt16BE(len, 2); }
  else { header = Buffer.alloc(10); header[1] = 127; header.writeBigUInt64BE(BigInt(len), 2); }
  header[0] = 0x80 | opcode;
  return Buffer.concat([header, payload]);
}

// Décode les trames complètes présentes dans le tampon ; renvoie le reste non consommé.
export function decodeFrames(buffer) {
  const frames = [];
  let off = 0;
  while (buffer.length - off >= 2) {
    const b0 = buffer[off], b1 = buffer[off + 1];
    const fin = (b0 & 0x80) !== 0, opcode = b0 & 0x0f, masked = (b1 & 0x80) !== 0;
    let len = b1 & 0x7f, pos = off + 2;
    if (len === 126) { if (buffer.length - pos < 2) break; len = buffer.readUInt16BE(pos); pos += 2; }
    else if (len === 127) { if (buffer.length - pos < 8) break; const big = buffer.readBigUInt64BE(pos); if (big > BigInt(MAX_PAYLOAD)) return { frames, rest: Buffer.alloc(0), error: 'trop grand' }; len = Number(big); pos += 8; }
    if (len > MAX_PAYLOAD) return { frames, rest: Buffer.alloc(0), error: 'trop grand' };
    const maskLen = masked ? 4 : 0;
    if (buffer.length - pos < maskLen + len) break;
    const mask = masked ? buffer.subarray(pos, pos + 4) : null;
    pos += maskLen;
    const payload = Buffer.from(buffer.subarray(pos, pos + len));
    if (mask) for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
    frames.push({ fin, opcode, payload, masked });
    off = pos + len;
  }
  return { frames, rest: buffer.subarray(off) };
}

// Attache un serveur WebSocket sur un chemin donné. onConnection(socketWrapper, req).
export function attachWebSocket(server, path, onConnection) {
  server.on('upgrade', (req, socket) => {
    const url = new URL(req.url, 'http://x');
    const key = req.headers['sec-websocket-key'];
    if (url.pathname !== path || !key || String(req.headers.upgrade).toLowerCase() !== 'websocket') { socket.destroy(); return; }
    socket.write([
      'HTTP/1.1 101 Switching Protocols', 'Upgrade: websocket', 'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${acceptKey(key)}`, '', '',
    ].join('\r\n'));
    socket.setNoDelay(true);
    let buf = Buffer.alloc(0), fragments = [], closed = false;
    const handlers = { message: () => {}, close: () => {} };
    const ws = {
      send(obj) { if (closed || socket.destroyed) return; try { socket.write(encodeFrame(typeof obj === 'string' ? obj : JSON.stringify(obj))); } catch (e) { /* socket fermé */ } },
      close(code = 1000) { if (closed) return; closed = true; try { const b = Buffer.alloc(2); b.writeUInt16BE(code); socket.end(encodeFrame(b, 8)); } catch (e) { socket.destroy(); } handlers.close(); },
      on(ev, fn) { handlers[ev] = fn; },
      get open() { return !closed && !socket.destroyed; },
    };
    const alive = setInterval(() => ws.open && socket.write(encodeFrame(Buffer.alloc(0), 9)), 25000);
    socket.on('data', chunk => {
      buf = Buffer.concat([buf, chunk]);
      const { frames, rest, error } = decodeFrames(buf);
      buf = rest;
      if (error) { ws.close(1009); return; }
      for (const f of frames) {
        if (!f.masked) { ws.close(1002); return; } // le client doit masquer ses trames
        if (f.opcode === 8) { ws.close(); return; }
        if (f.opcode === 9) { socket.write(encodeFrame(f.payload, 10)); continue; }
        if (f.opcode === 10) continue;
        if (f.opcode === 1 || f.opcode === 0) {
          fragments.push(f.payload);
          if (f.fin) { const text = Buffer.concat(fragments).toString('utf8'); fragments = []; try { handlers.message(JSON.parse(text)); } catch (e) { /* message invalide ignoré */ } }
        }
      }
    });
    const done = () => { clearInterval(alive); if (!closed) { closed = true; handlers.close(); } };
    socket.on('close', done); socket.on('error', done);
    onConnection(ws, req);
  });
}
