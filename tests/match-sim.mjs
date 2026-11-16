// Banc d'essai headless du moteur de match : IA contre IA sur 90 minutes (sans rendu)
globalThis.window = { addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1, innerWidth: 800, innerHeight: 400 };
globalThis.document = { addEventListener() {}, removeEventListener() {}, hidden: false, createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) }) };
globalThis.devicePixelRatio = 1; globalThis.innerWidth = 800; globalThis.innerHeight = 400; globalThis.performance = globalThis.performance || { now: Date.now };
const { Match } = await import('../public/js/match.js');
const C = await import('../public/js/career.js');
const st = C.newCareer({ clubId: 'est', seed: 5 });
const N = Number(process.argv[2] || 6);
const tot = { goals: 0, shots: 0, on: 0, passes: 0, ok: 0, fouls: 0, corners: 0, restarts: {} };
for (let k = 0; k < N; k++) {
  const ids = ['est', 'ca', 'css', 'ess', 'usm', 'asm', 'ob', 'eshs'];
  const h = ids[(k * 2) % ids.length], a = ids[(k * 2 + 1) % ids.length];
  const canvas = { clientWidth: 800, clientHeight: 400, getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) };
  const m = new Match({ canvas, home: C.matchTeam(st, h), away: C.matchTeam(st, a, true), userSide: null, settings: { duration: 5, voice: false, replays: false } });
  const orig = m.setRestart.bind(m); m.setRestart = (type, ...r) => { tot.restarts[type] = (tot.restarts[type] || 0) + 1; return orig(type, ...r); };
  m.r = Math.random; let steps = 0;
  while (!m.ended && steps < 60 * 60 * 30) { if (m.state === 'goal') { m.step(1 / 60); if (m.stateT <= 0) { m.afterGoal(); } } else m.step(1 / 60); if (m.replay) m.skipReplay(); if (m.state === 'fulltime' && m.stateT <= 0) break; steps++; }
  const s = m.stats;
  console.log(`${h} ${m.score[0]}-${m.score[1]} ${a} | tirs ${s.shots} cadrés ${s.onTarget} passes ${s.passOk}/${s.passes} poss ${s.poss.map(x => Math.round(x))} fautes ${s.fouls} corners ${s.corners} min ${Math.round(m.minute)}`);
  tot.goals += m.score[0] + m.score[1]; tot.shots += s.shots[0] + s.shots[1]; tot.on += s.onTarget[0] + s.onTarget[1]; tot.passes += s.passes[0] + s.passes[1]; tot.ok += s.passOk[0] + s.passOk[1]; tot.fouls += s.fouls[0] + s.fouls[1]; tot.corners += s.corners[0] + s.corners[1];
}
console.log('MOYENNES / match :', Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, typeof v === 'number' ? (v / N).toFixed(1) : Object.fromEntries(Object.entries(v).map(([a, b]) => [a, (b / N).toFixed(1)]))])));
