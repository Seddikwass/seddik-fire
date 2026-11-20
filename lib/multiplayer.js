// Salons de match en ligne : création par code, arrivée d'un adversaire, simulation officielle
// sur le serveur à 60 images/s, envoi de l'état 15 fois par seconde, reconnexion et classement.
import crypto from 'node:crypto';

// Le moteur de match est partagé avec le jeu : on fournit les objets de navigateur qu'il attend.
const stubCtx = () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) });
globalThis.window ??= { addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1, innerWidth: 800, innerHeight: 400 };
globalThis.document ??= { addEventListener() {}, removeEventListener() {}, hidden: false, createElement: () => ({ getContext: stubCtx }) };

const { NetMatch } = await import('../public/js/netmatch.js');
const { getNetSnapshot } = await import('../public/js/match.js');
const C = await import('../public/js/career.js');
const { CLUBS } = await import('../public/js/data.js');

const DT = 1 / 60, SNAP_EVERY = 4, STATS_EVERY = 60;
const WAIT_TIMEOUT = 10 * 60 * 1000, ABANDON_TIMEOUT = 90 * 1000, DURATION = 5;
const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const rooms = new Map();
let teamSource = null;

const cleanName = n => String(n || 'Joueur').replace(/[<>&"'`]/g, '').trim().slice(0, 16) || 'Joueur';
const validClub = id => CLUBS.some(c => c.id === id);
function newCode() { let c; do { c = Array.from({ length: 4 }, () => CODE_CHARS[crypto.randomInt(CODE_CHARS.length)]).join(''); } while (rooms.has(c)); return c; }
function seeded(seed) { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; }; }
function teams(home, away) {
  teamSource ??= C.newCareer({ clubId: 'est', seed: 99 });
  const h = C.matchTeam(teamSource, home, false), a = C.matchTeam(teamSource, away, true);
  if (h.kit.shirt === a.kit.shirt) a.kit = { shirt: '#f4f4f4', trim: '#222', shorts: '#222' };
  return [h, a];
}

export function createMultiplayer({ store, log = () => {} } = {}) {
  const send = (ws, obj) => ws && ws.open && ws.send(obj);
  const broadcast = (room, obj) => room.players.forEach(p => p && send(p.ws, obj));

  function start(room) {
    const [home, away] = teams(room.players[0].club, room.players[1].club);
    room.home = home; room.away = away;
    const canvas = { clientWidth: 800, clientHeight: 400, getContext: stubCtx };
    room.match = new NetMatch({
      canvas, home, away, random: seeded(crypto.randomInt(1, 2 ** 31)),
      settings: { duration: DURATION, voice: false, replays: false, assist: true, difficulty: 1, lang: 'fr' },
      onEnd: res => finish(room, res),
    });
    room.match.destroy = () => {};
    room.status = 'playing'; room.tick = 0; room.last = Date.now(); room.acc = 0;
    room.players.forEach((p, side) => send(p.ws, { t: 'start', side, home, away, duration: DURATION, names: room.players.map(x => x.name) }));
    log('info', 'match en ligne lancé', { code: room.code, home: home.id, away: away.id });
  }

  async function finish(room, res) {
    if (room.status === 'ended') return;
    room.status = 'ended';
    const summary = { hg: res.hg, ag: res.ag, events: res.events, stats: res.stats };
    broadcast(room, { t: 'end', res: summary, home: room.home, away: room.away, names: room.players.map(p => p.name) });
    await recordResult(room.players.map(p => p.name), res.hg, res.ag).catch(e => log('warn', 'classement non enregistré', { e: String(e) }));
    setTimeout(() => rooms.delete(room.code), 30000);
  }

  async function recordResult([homeName, awayName], hg, ag) {
    if (!store?.getKV) return;
    const board = (await store.getKV('mp_board')) || {};
    const row = n => (board[n] ??= { w: 0, d: 0, l: 0, gf: 0, ga: 0 });
    const h = row(homeName), a = row(awayName);
    h.gf += hg; h.ga += ag; a.gf += ag; a.ga += hg;
    if (hg > ag) { h.w++; a.l++; } else if (hg < ag) { a.w++; h.l++; } else { h.d++; a.d++; }
    await store.setKV('mp_board', board);
  }

  async function leaderboard() {
    const board = (store?.getKV && (await store.getKV('mp_board'))) || {};
    return Object.entries(board).map(([name, r]) => ({ name, ...r, pts: r.w * 3 + r.d, played: r.w + r.d + r.l }))
      .sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf).slice(0, 20);
  }

  function onConnection(ws) {
    let room = null, side = -1;
    ws.on('message', msg => {
      if (!msg || typeof msg !== 'object') return;
      if (msg.t === 'create') {
        if (room) return;
        if (!validClub(msg.club)) return send(ws, { t: 'err', msg: 'Club inconnu.' });
        const code = newCode(), token = crypto.randomBytes(12).toString('hex');
        room = { code, status: 'waiting', created: Date.now(), players: [{ ws, token, name: cleanName(msg.name), club: msg.club, connected: true }, null] };
        side = 0; rooms.set(code, room);
        send(ws, { t: 'created', code, token, side });
      } else if (msg.t === 'join') {
        if (room) return;
        const r = rooms.get(String(msg.code || '').toUpperCase().trim());
        if (!r) return send(ws, { t: 'err', msg: 'Salon introuvable. Vérifiez le code.' });
        if (r.status !== 'waiting' || r.players[1]) return send(ws, { t: 'err', msg: 'Ce salon est déjà complet.' });
        if (!validClub(msg.club)) return send(ws, { t: 'err', msg: 'Club inconnu.' });
        if (msg.club === r.players[0].club) return send(ws, { t: 'err', msg: 'Votre adversaire a déjà choisi ce club. Choisissez-en un autre.' });
        const token = crypto.randomBytes(12).toString('hex');
        r.players[1] = { ws, token, name: cleanName(msg.name), club: msg.club, connected: true };
        room = r; side = 1;
        send(ws, { t: 'joined', code: r.code, token, side });
        start(r);
      } else if (msg.t === 'rejoin') {
        const r = rooms.get(String(msg.code || '').toUpperCase());
        const s = r?.players.findIndex(p => p && p.token === msg.token);
        if (!r || s < 0 || r.status === 'ended') return send(ws, { t: 'err', msg: 'Impossible de reprendre ce match.' });
        room = r; side = s;
        r.players[s].ws = ws; r.players[s].connected = true; r.players[s].leftAt = null;
        r.match?.setConnected(s, true);
        send(ws, { t: 'start', side: s, home: r.home, away: r.away, duration: DURATION, names: r.players.map(x => x?.name), resumed: true });
        broadcast(r, { t: 'opp', side: s, status: 'back' });
      } else if (room?.match && side >= 0) {
        if (msg.t === 'in') room.match.setInput(side, msg);
        else if (msg.t === 'act') room.match.action(side, String(msg.a));
        else if (msg.t === 'forfeit') { room.match.score[side] = 0; room.match.score[1 - side] = Math.max(3, room.match.score[1 - side]); room.match.finish(); }
      }
    });
    ws.on('close', () => {
      if (!room || side < 0) return;
      const p = room.players[side]; if (!p || p.ws !== ws) return;
      p.connected = false; p.leftAt = Date.now();
      if (room.status === 'waiting') { rooms.delete(room.code); return; }
      room.match?.setConnected(side, false);
      broadcast(room, { t: 'opp', side, status: 'left' });
    });
  }

  // Boucle de simulation : pas fixe de 1/60 s, état envoyé 15 fois par seconde.
  const loop = setInterval(() => {
    const now = Date.now();
    for (const room of rooms.values()) {
      if (room.status === 'waiting' && now - room.created > WAIT_TIMEOUT) { room.players[0] && send(room.players[0].ws, { t: 'err', msg: 'Aucun adversaire : salon fermé.' }); rooms.delete(room.code); continue; }
      if (room.status !== 'playing') continue;
      if (room.players.every(p => !p.connected && now - (p.leftAt || now) > ABANDON_TIMEOUT)) { rooms.delete(room.code); continue; }
      room.acc += Math.min(0.25, (now - room.last) / 1000); room.last = now;
      while (room.acc >= DT && room.status === 'playing') {
        const m = room.match;
        m.step(DT);
        if (m.state === 'goal' && m.stateT <= 0) m.afterGoal();
        room.acc -= DT; room.tick++;
        if (room.tick % SNAP_EVERY === 0 && room.status === 'playing') broadcast(room, { t: 's', s: getNetSnapshot(m, room.tick % STATS_EVERY === 0) });
      }
    }
  }, 1000 / 60);
  loop.unref?.();

  return { onConnection, leaderboard, rooms, stop: () => clearInterval(loop) };
}
