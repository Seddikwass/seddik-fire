// Joueur automatique utilisant UNIQUEMENT les commandes de l'interface (joystick, passe, tir, sprint, pressing)
globalThis.window = { addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1 };
globalThis.document = { addEventListener() {}, removeEventListener() {}, hidden: false, createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) }) };
globalThis.devicePixelRatio = 1; globalThis.innerWidth = 800; globalThis.innerHeight = 400;
const { Match } = await import('../public/js/match.js');
const C = await import('../public/js/career.js');
const st = C.newCareer({ clubId: 'est', seed: 11 });
const N = Number(process.argv[2] || 3), diff = Number(process.argv[3] ?? 1);
let gf = 0, ga = 0, shots = 0;
for (let k = 0; k < N; k++) {
  const canvas = { clientWidth: 800, clientHeight: 400, getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) };
  const m = new Match({ canvas, home: C.matchTeam(st, 'usm'), away: C.matchTeam(st, 'st', true), userSide: 0, settings: { duration: 5, voice: false, replays: false, difficulty: diff, assist: true } });
  let t = 0, holding = 0;
  while (!m.ended && t < 60 * 60 * 20) {
    const p = m.selected, b = m.ball, T = m.teams[0], gx = 52.5 * T.dir;
    if (m.state === 'play' && p) {
      if (b.owner === p) {
        const dx = gx - p.x, dy = -p.y, d = Math.hypot(dx, dy);
        m.input.jx = dx / d; m.input.jy = dy / d; m.input.sprint = d > 25;
        if (holding > 0) { holding--; if (holding === 0) { m.btnShootUp(); shots++; } }
        else if (d < 19 && Math.abs(p.y) < 16) { m.btnShootDown(); holding = 25; }
        else if (t % 90 === 0) { const opp = m.teams[1].ps.some(o => Math.hypot(o.x - p.x, o.y - p.y) < 2.5); if (opp) m.btnPass(Math.random() < 0.4); }
      } else {
        holding = 0; m.input.shooting = false;
        const dx = b.x - p.x, dy = b.y - p.y, d = Math.hypot(dx, dy) || 1;
        m.input.jx = dx / d; m.input.jy = dy / d; m.input.sprint = d > 6;
        if (b.owner && b.owner.team === 1 && d < 2) { m.btnShootDown(); m.btnShootUp(); }
        if (t % 120 === 0 && d > 15) m.btnPass(false); // changer de joueur
      }
    }
    m.step(1 / 60); if (m.replay) m.skipReplay(); if (m.state === 'goal' && m.stateT <= 0) m.afterGoal(); t++;
  }
  console.log(`match ${k + 1} : vous ${m.score[0]} - ${m.score[1]} IA · tirs ${m.stats.shots} · passes ${m.stats.passOk}/${m.stats.passes} · poss ${m.stats.poss.map(Math.round)}`);
  gf += m.score[0]; ga += m.score[1];
}
console.log(`Total difficulté ${diff} : ${gf}-${ga} sur ${N} matchs`);
