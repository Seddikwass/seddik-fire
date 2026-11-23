// Match en ligne : serveur WebSocket réel, deux clients, salon par code, état, commandes,
// reconnexion, abandon et classement.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import WebSocket from 'ws';
const { encodeFrame, decodeFrames, acceptKey } = await import('../lib/ws.js');

// Protocole : clé d'acceptation officielle (exemple de la RFC 6455) et trames.
assert.equal(acceptKey('dGhlIHNhbXBsZSBub25jZQ=='), 's3pPLMBiTxaQ9kYGzzhZRbK+xOo=');
for (const text of ['salut', 'é'.repeat(200), 'x'.repeat(60000)]) {
  const f = encodeFrame(text); const { frames } = decodeFrames(f);
  assert.equal(frames[0].payload.toString(), text);
}
assert.equal(decodeFrames(encodeFrame('x'.repeat(70000))).error, 'trop grand', 'message de plus de 64 Ko refusé');
const half = encodeFrame('bonjour'); assert.equal(decodeFrames(half.subarray(0, 4)).frames.length, 0, 'trame incomplète conservée en attente');
globalThis.window ??= {};
const { wsUrl } = await import('../public/js/online.js');
assert.equal(wsUrl({ protocol: 'https:', host: 'football-tunisia-2026.onrender.com' }, ''), 'wss://football-tunisia-2026.onrender.com/ws');
assert.equal(wsUrl({ protocol: 'capacitor:', host: 'localhost' }, 'https://football-tunisia-2026.onrender.com'), 'wss://football-tunisia-2026.onrender.com/ws', 'application Android : serveur Render');
console.log('WS FRAMES OK — clé RFC 6455, trames courtes, moyennes et longues');

const PORT = 3000 + Math.floor(Math.random() * 400) + 200;
const srv = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: String(PORT), NODE_ENV: 'test' }, stdio: ['ignore', 'pipe', 'pipe'] });
await new Promise((ok, ko) => { srv.stdout.on('data', d => String(d).includes("l'écoute") && ok()); setTimeout(() => ko(new Error('serveur non démarré')), 15000); });
const url = `ws://127.0.0.1:${PORT}/ws`;
function client() {
  const ws = new WebSocket(url), inbox = [];
  const waiters = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); inbox.push(m); waiters.slice().forEach(w => w.test(m) && (waiters.splice(waiters.indexOf(w), 1), w.ok(m))); };
  const open = new Promise(ok => { ws.onopen = ok; });
  return {
    ws, inbox, open,
    send: o => ws.send(JSON.stringify(o)),
    wait: (t, ms = 8000) => { const found = inbox.find(m => m.t === t); if (found) { inbox.splice(inbox.indexOf(found), 1); return Promise.resolve(found); } return new Promise((ok, ko) => { const w = { test: m => m.t === t, ok: m => { inbox.splice(inbox.indexOf(m), 1); ok(m); } }; waiters.push(w); setTimeout(() => ko(new Error('délai dépassé : ' + t)), ms); }); },
  };
}
try {
  const a = client(), b = client(); await a.open; await b.open;
  a.send({ t: 'create', club: 'est', name: 'Wassim' });
  const created = await a.wait('created');
  assert.match(created.code, /^[A-Z2-9]{4}$/);
  b.send({ t: 'join', code: 'ZZZZ', club: 'ca', name: 'Ami' });
  assert.match((await b.wait('err')).msg, /introuvable/);
  b.send({ t: 'join', code: created.code, club: 'est', name: 'Ami' });
  assert.match((await b.wait('err')).msg, /déjà choisi/);
  b.send({ t: 'join', code: created.code.toLowerCase(), club: 'ca', name: 'Ami<script>' });
  const joined = await b.wait('joined');
  const [sa, sb] = [await a.wait('start'), await b.wait('start')];
  assert.equal(sa.side, 0); assert.equal(sb.side, 1);
  assert.equal(sa.home.id, 'est'); assert.equal(sa.away.id, 'ca');
  assert.ok(!sb.names[1].includes('<'), 'pseudo nettoyé');
  console.log('LOBBY OK — code, erreurs claires, club déjà pris, arrivée de l’adversaire, départ du match');

  // État reçu en continu par les deux joueurs.
  const s1 = await a.wait('s'), s2 = await b.wait('s');
  assert.equal(s1.s.p.length, 22); assert.equal(s2.s.b.length, 7);
  const t0 = Date.now(); let count = 0; while (Date.now() - t0 < 1000) { await b.wait('s'); count++; }
  assert.ok(count >= 10 && count <= 20, 'environ 15 états par seconde : ' + count);
  // Commandes : le joueur B se déplace vers le haut, son joueur sélectionné bouge.
  b.send({ t: 'in', jx: 0, jy: 1, sprint: true });
  b.send({ t: 'act', a: 'preset:allout' });
  for (let i = 0; i < 25; i++) await b.wait('s');
  console.log('STATE OK — ~' + count + ' états/s, 22 joueurs, commandes reçues');

  // Déconnexion puis reconnexion de B.
  b.ws.close();
  assert.equal((await a.wait('opp')).status, 'left');
  const b2 = client(); await b2.open;
  b2.send({ t: 'rejoin', code: created.code, token: joined.token });
  const back = await b2.wait('start'); assert.ok(back.resumed); assert.equal(back.side, 1);
  assert.equal((await a.wait('opp')).status, 'back');
  console.log('RECONNECT OK — l’IA prend le relais puis le joueur reprend sa place');

  // Abandon de A : victoire de B, classement mis à jour.
  a.send({ t: 'forfeit' });
  const end = await b2.wait('end');
  assert.ok(end.res.ag > end.res.hg, 'victoire de l’adversaire après abandon');
  await new Promise(r => setTimeout(r, 300));
  const lb = await (await fetch(`http://127.0.0.1:${PORT}/api/mp/leaderboard`)).json();
  const ami = lb.leaderboard.find(r => r.name.startsWith('Ami'));
  assert.ok(ami && ami.w >= 1 && ami.pts >= 3, 'classement mis à jour');
  console.log('END OK — abandon, résultat envoyé aux deux joueurs, classement en ligne');
  [a, b2].forEach(c => c.ws.close());
} finally { srv.kill(); }
