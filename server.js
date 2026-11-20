// Football Tunisia 2026 — serveur web + API (Node.js, sans framework)
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { openStore } from './lib/store.js';
import { attachWebSocket } from './lib/ws.js';
import { createMultiplayer } from './lib/multiplayer.js';

const PKG = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url)));
const PORT = Number(process.env.PORT || 3000);
const PUB = path.resolve('public');
const SECRET = process.env.SESSION_SECRET || (process.env.NODE_ENV === 'production' ? null : 'dev-secret-non-securise');
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || null;
const COMMIT = process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || 'local';
if (!SECRET) { console.error('SESSION_SECRET manquant en production : arrêt.'); process.exit(1); }
const log = (lvl, msg, extra = {}) => console.log(JSON.stringify({ t: new Date().toISOString(), lvl, msg, ...extra }));
const store = await openStore();
// Comptes en ligne : uniquement avec une base persistante (PostgreSQL) en production
const ACCOUNTS = store.kind === 'postgres' || process.env.NODE_ENV !== 'production' || process.env.ALLOW_FILE_STORE === '1';
log('info', 'démarrage', { version: PKG.version, commit: COMMIT, store: store.kind });

// ---------- sécurité
const scrypt = (pw, salt) => new Promise((ok, ko) => crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, (e, k) => e ? ko(e) : ok(k)));
async function hashPw(pw) { const salt = crypto.randomBytes(16); const k = await scrypt(pw, salt); return `scrypt$${salt.toString('hex')}$${k.toString('hex')}`; }
async function checkPw(pw, stored) { const [, s, h] = stored.split('$'); const k = await scrypt(pw, Buffer.from(s, 'hex')); return crypto.timingSafeEqual(k, Buffer.from(h, 'hex')); }
const b64 = s => Buffer.from(s).toString('base64url');
function sign(uid, username) { const body = b64(JSON.stringify({ uid, u: username, exp: Date.now() + 30 * 864e5 })); return body + '.' + crypto.createHmac('sha256', SECRET).update(body).digest('base64url'); }
function verify(tok) {
  if (!tok) return null; const [body, sig] = tok.split('.'); if (!body || !sig) return null;
  const exp = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (sig.length !== exp.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(exp))) return null;
  try { const d = JSON.parse(Buffer.from(body, 'base64url').toString()); return d && typeof d === 'object' && Number.isFinite(d.exp) && d.exp > Date.now() ? d : null; } catch { return null; }
}
const hits = new Map();
function limited(ip, key, max, winMs) { const k = ip + key, now = Date.now(); const a = (hits.get(k) || []).filter(t => now - t < winMs); a.push(now); hits.set(k, a); return a.length > max; }
// Nettoyage mémoire sans effacer prématurément les fenêtres glissantes de 15 minutes.
setInterval(() => {
  const cutoff = Date.now() - 15 * 60e3;
  for (const [key, times] of hits) {
    const active = times.filter(t => t > cutoff);
    if (active.length) hits.set(key, active);
    else hits.delete(key);
  }
}, 60e3).unref();

// ---------- HTTP utilitaires
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.txt': 'text/plain; charset=utf-8' };
const SEC_HEADERS = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN', 'X-Permitted-Cross-Domain-Policies': 'none', 'X-Download-Options': 'noopen', 'Strict-Transport-Security': 'max-age=31536000; includeSubDomains', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()' };
function send(res, code, obj, req) {
  const body = JSON.stringify(obj);
  const h = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...SEC_HEADERS, ...cors(req) };
  if (body.length > 2048 && /gzip/.test(req?.headers['accept-encoding'] || '')) { res.writeHead(code, { ...h, 'Content-Encoding': 'gzip' }); res.end(zlib.gzipSync(body)); }
  else { res.writeHead(code, h); res.end(body); }
}
// CORS : l'application Android (https://localhost dans la WebView Capacitor) appelle l'API Render
function cors(req) { const o = req?.headers.origin; if (!o) return {}; const ok = /^https?:\/\/localhost(:\d+)?$/.test(o) || o === 'capacitor://localhost' || (process.env.ALLOWED_ORIGINS || '').split(',').includes(o); return ok ? { 'Access-Control-Allow-Origin': o, 'Access-Control-Allow-Headers': 'Content-Type, Authorization', 'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS', Vary: 'Origin' } : {}; }
function readBody(req, max = 6e6) {
  return new Promise((ok, ko) => {
    let n = 0, settled = false;
    const chunks = [];
    req.on('data', chunk => {
      if (settled) return;
      n += chunk.length;
      if (n > max) {
        settled = true;
        chunks.length = 0;
        ko(Object.assign(new Error('Requête trop volumineuse'), { status: 413 }));
        // Drainer le flux pour pouvoir renvoyer proprement le 413 sans stocker la suite.
        req.resume();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (settled) return;
      try { settled = true; ok(chunks.length ? JSON.parse(Buffer.concat(chunks)) : {}); }
      catch { settled = true; ko(Object.assign(new Error('JSON invalide'), { status: 400 })); }
    });
    req.on('error', error => { if (!settled) { settled = true; ko(error); } });
  });
}
const userOf = req => verify((req.headers.authorization || '').replace(/^Bearer /, ''));
const isAdmin = req => ADMIN_TOKEN && (req.headers['x-admin-token'] || '') .length === ADMIN_TOKEN.length && crypto.timingSafeEqual(Buffer.from(req.headers['x-admin-token']), Buffer.from(ADMIN_TOKEN));

// ---------- API
async function api(req, res, url) {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const p = url.pathname, m = req.method;
  if (m === 'OPTIONS') { res.writeHead(204, cors(req)); return res.end(); }
  if (p === '/api/health') return send(res, 200, { ok: true, version: PKG.version, commit: COMMIT, store: store.kind, persistent: store.kind === 'postgres', accounts: ACCOUNTS, time: new Date().toISOString() }, req);
  if (!ACCOUNTS && (p.startsWith('/api/auth/') || p.startsWith('/api/save'))) return send(res, 503, { error: 'Comptes en ligne temporairement indisponibles (base de données non configurée). Votre partie reste sauvegardée sur cet appareil.' }, req);
  if (p === '/api/mp/leaderboard' && m === 'GET') return send(res, 200, { leaderboard: await mp.leaderboard() }, req);
  if (p === '/api/mp/status' && m === 'GET') return send(res, 200, { rooms: mp.rooms.size }, req);
  if (p === '/api/data' && m === 'GET') { const d = await store.getKV('data_overrides'); return send(res, 200, d || {}, req); }
  if (p === '/api/auth/register' || p === '/api/auth/login') {
    if (m !== 'POST') return send(res, 405, { error: 'Méthode non autorisée' }, req);
    if (limited(ip, 'auth', 20, 15 * 60e3)) return send(res, 429, { error: 'Trop de tentatives, réessayez dans 15 minutes.' }, req);
    const { username, password } = await readBody(req, 4096);
    const u = String(username || '').trim().toLowerCase();
    if (!/^[a-z0-9_.-]{3,32}$/.test(u)) return send(res, 400, { error: 'Nom d\'utilisateur : 3 à 32 caractères (lettres, chiffres, . _ -).' }, req);
    if (typeof password !== 'string' || password.length < 8 || password.length > 200) return send(res, 400, { error: 'Mot de passe : 8 caractères minimum.' }, req);
    if (p.endsWith('register')) {
      const id = await store.createUser(u, await hashPw(password));
      if (!id) return send(res, 409, { error: 'Ce nom d\'utilisateur est déjà pris.' }, req);
      log('info', 'inscription', { uid: id });
      return send(res, 201, { token: sign(id, u), username: u }, req);
    }
    const usr = await store.getUser(u);
    if (!usr || !(await checkPw(password, usr.pass))) return send(res, 401, { error: 'Identifiants incorrects.' }, req);
    await store.touchUser(usr.id);
    return send(res, 200, { token: sign(usr.id, u), username: u }, req);
  }
  if (p === '/api/save') {
    const who = userOf(req); if (!who) return send(res, 401, { error: 'Session expirée : reconnectez-vous.' }, req);
    if (m === 'GET') { const s = await store.getSave(who.uid); return send(res, 200, s || { data: null }, req); }
    if (m === 'PUT') {
      if (limited(ip, 'save', 120, 60e3)) return send(res, 429, { error: 'Trop de sauvegardes, patientez.' }, req);
      const b = await readBody(req);
      if (!b.data || typeof b.data !== 'object' || !b.data.clubs || !b.data.players) return send(res, 400, { error: 'Sauvegarde invalide.' }, req);
      const r = await store.putSave(who.uid, b.data, b.baseRevision ?? null, !!b.force);
      if (r.conflict) return send(res, 409, { error: 'Conflit : une sauvegarde plus récente existe sur le serveur.', ...r }, req);
      return send(res, 200, { ok: true, revision: r.revision }, req);
    }
  }
  if (p === '/api/save/history') { const who = userOf(req); if (!who) return send(res, 401, { error: 'Non connecté' }, req); return send(res, 200, { history: await store.history(who.uid) }, req); }
  if (p === '/api/save/restore' && m === 'POST') { const who = userOf(req); if (!who) return send(res, 401, { error: 'Non connecté' }, req); const b = await readBody(req, 1000); const r = await store.restoreRevision(who.uid, Number(b.revision)); return r ? send(res, 200, { ok: true, revision: r.revision }, req) : send(res, 404, { error: 'Révision introuvable' }, req); }
  // --- administration (jeton ADMIN_TOKEN dans l'en-tête X-Admin-Token)
  if (p.startsWith('/api/admin/')) {
    if (!ADMIN_TOKEN) return send(res, 503, { error: 'Administration désactivée : définissez ADMIN_TOKEN.' }, req);
    if (limited(ip, 'admin', 60, 60e3)) return send(res, 429, { error: 'Trop de requêtes' }, req);
    if (!isAdmin(req)) { log('warn', 'accès admin refusé', { ip }); return send(res, 403, { error: 'Jeton administrateur invalide.' }, req); }
    if (p === '/api/admin/stats') return send(res, 200, { ...(await store.stats()), store: store.kind, version: PKG.version, commit: COMMIT }, req);
    if (p === '/api/admin/data' && m === 'PUT') { const b = await readBody(req, 2e6); if (b.clubs && !Array.isArray(b.clubs)) return send(res, 400, { error: 'clubs doit être une liste' }, req); await store.setKV('data_overrides', { ...b, updatedAt: new Date().toISOString() }); log('info', 'données admin mises à jour', { clubs: b.clubs?.length }); return send(res, 200, { ok: true }, req); }
    if (p === '/api/admin/data' && m === 'GET') return send(res, 200, (await store.getKV('data_overrides')) || {}, req);
    if (p === '/api/admin/backup') { log('info', 'export de sauvegarde'); return send(res, 200, await store.dump(), req); }
    if (p === '/api/admin/restore' && m === 'POST') { const b = await readBody(req, 200e6); await store.restore(b); log('warn', 'restauration effectuée', { users: b.users?.length }); return send(res, 200, { ok: true }, req); }
  }
  return send(res, 404, { error: 'Route inconnue' }, req);
}

// ---------- fichiers statiques
function serveStatic(req, res, url) {
  let rel = decodeURIComponent(url.pathname); if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.join(PUB, path.normalize(rel).replace(/^(\.\.[/\\])+/, ''));
  if (file !== PUB && !file.startsWith(PUB + path.sep)) { res.writeHead(403, SEC_HEADERS); return res.end(); }
  fs.stat(file, (err, s) => {
    if (err || !s.isFile()) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store', ...SEC_HEADERS }); return res.end('Introuvable'); }
    const ext = path.extname(file), type = MIME[ext] || 'application/octet-stream';
    const cache = ['.html', '.js', '.css', '.webmanifest'].includes(ext) || file.endsWith('sw.js') ? 'no-cache' : 'public, max-age=3600';
    const h = { 'Content-Type': type, 'Cache-Control': cache, ...SEC_HEADERS };
    if (/\.(js|css|html|json|webmanifest|svg)$/.test(ext) && /gzip/.test(req.headers['accept-encoding'] || '')) { res.writeHead(200, { ...h, 'Content-Encoding': 'gzip' }); fs.createReadStream(file).pipe(zlib.createGzip()).pipe(res); }
    else { res.writeHead(200, { ...h, 'Content-Length': s.size }); fs.createReadStream(file).pipe(res); }
  });
}
const server = http.createServer(async (req, res) => {
  const t0 = Date.now(); const url = new URL(req.url, 'http://x');
  res.on('finish', () => { if (url.pathname.startsWith('/api/')) log('info', 'requête', { m: req.method, p: url.pathname, s: res.statusCode, ms: Date.now() - t0 }); });
  try { if (url.pathname.startsWith('/api/')) await api(req, res, url); else serveStatic(req, res, url); }
  catch (e) { log('error', 'erreur', { p: url.pathname, err: e.message }); if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : 'Erreur interne du serveur' }, req); }
});
// Match en ligne : WebSocket sur /ws, simulation officielle côté serveur.
const mp = createMultiplayer({ store, log });
attachWebSocket(server, '/ws', ws => mp.onConnection(ws));
server.listen(PORT, () => log('info', `serveur à l'écoute`, { port: PORT }));
const stop = () => { log('info', 'arrêt'); mp.stop(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 5000).unref(); };
process.on('SIGTERM', stop); process.on('SIGINT', stop);

// Render deployment refresh marker — Football Tunisia 2026 v3.14.0 (2026-11-19)
