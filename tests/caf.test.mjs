// Compétitions CAF : tirages (chapeaux, protection par pays), tableau final, déplacements, rotation.
import assert from 'node:assert/strict';
const K = await import('../public/js/caf.js');
const C = await import('../public/js/career.js');
const D = await import('../public/js/data.js');
let seed = 9; const r = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 0x100000000; };

// Groupes : un club de chaque chapeau, pas deux clubs du même pays.
const teams = [['a', 95, 'EGY'], ['b', 92, 'EGY'], ['c', 90, 'MAR'], ['d', 88, 'MAR'], ['e', 80, 'TUN'], ['f', 79, 'TUN'], ['g', 78, 'ALG'], ['h', 77, 'RSA'], ['i', 70, 'EGY'], ['j', 69, 'TAN'], ['k', 68, 'MAR'], ['l', 67, 'NGA'], ['m', 60, 'TUN'], ['n', 59, 'ALG'], ['o', 58, 'GHA'], ['p', 57, 'COD']].map(([id, rep, country]) => ({ id, rep, country }));
for (let i = 0; i < 50; i++) {
  const { groups, pots } = K.drawGroups(teams, r);
  assert.equal(groups.length, 4);
  for (const g of groups) {
    assert.equal(g.length, 4);
    assert.equal(new Set(g.map(t => t.country)).size, 4, 'pas deux clubs du même pays');
    pots.forEach(pot => assert.equal(g.filter(t => pot.includes(t)).length, 1, 'un club par chapeau'));
  }
}
console.log('GROUP DRAW OK — chapeaux et protection par pays sur 50 tirages');

// Quarts : premier contre deuxième d'un autre groupe ; demies : paires complètes.
const w = [0, 1, 2, 3].map(g => ({ id: 'w' + g, group: g, country: ['EGY', 'MAR', 'TUN', 'RSA'][g] }));
const ru = [0, 1, 2, 3].map(g => ({ id: 'r' + g, group: g, country: ['MAR', 'EGY', 'ALG', 'TUN'][g] }));
for (let i = 0; i < 50; i++) {
  const qf = K.drawQuarters(w, ru, r);
  assert.equal(new Set(qf.map(p => p.runner.id)).size, 4);
  for (const p of qf) assert.notEqual(p.winner.group, p.runner.group, 'pas de revanche de groupe');
}
const sf = K.drawOpen(w, r);
assert.equal(sf.length, 2); assert.equal(new Set(sf.flat().map(t => t.id)).size, 4);
console.log('KNOCKOUT DRAW OK — quarts croisés, demies en tirage intégral');

// Déplacements : plus loin = plus cher et plus fatigant.
const alg = K.travelInfo('ALG'), rsa = K.travelInfo('RSA');
assert.equal(K.travelInfo('EGY').toCity, 'au Caire'); assert.equal(K.travelInfo('ALG').toCity, 'à Alger');
assert.ok(rsa.km > alg.km && rsa.cost > alg.cost && rsa.fatigue > alg.fatigue && rsa.hours > alg.hours);
for (const c of D.CAF_CLUBS) assert.ok(K.COUNTRIES[c.country], 'distance connue pour ' + c.country);
console.log('TRAVEL OK — coût, fatigue et durée selon la distance, tous les pays couverts');

// Rotation : un titulaire fatigué est remplacé par un joueur frais du même poste ; le gardien reste.
const mk = (id, pos, fitness, ovr = 70) => ({ id, pos, fitness, ovr });
const lineup = [mk('gk', 'GK', 0.7), mk('dc', 'DC', 0.6), mk('bu', 'BU', 0.95)];
const pool = [...lineup, mk('dc2', 'DC', 1, 68), mk('gk2', 'GK', 1, 66), mk('bu2', 'BU', 1, 60)];
const plan = K.rotationPlan(lineup, pool, ['GK', 'DC', 'BU'], p => p.ovr);
assert.deepEqual(plan.map(c => c.in.id), ['dc2'], 'seul le défenseur fatigué tourne');
console.log('ROTATION OK — fatigués remplacés au même poste, gardien préservé');

// Carrière : tirage annoncé, voyage CAF payé selon la distance, rotation appliquée.
let groupsOk = true;
for (let s2 = 1; s2 <= 10; s2++) {
  const st = C.newCareer({ clubId: 'est', seed: s2 });
  for (const comp of ['CL', 'CC']) for (const g of st.comps[comp].groups) { const cs = g.map(id => st.clubs[id] ? 'TUN' : D.CAF_CLUBS.find(c => c.id === id).country); if (new Set(cs).size < cs.length) groupsOk = false; }
}
assert.ok(groupsOk, 'carrières : aucun groupe CAF avec deux clubs du même pays');
const st = C.newCareer({ clubId: 'est', seed: 4 });
assert.ok(st.news.some(n => /Tirage Ligue des Champions/.test(n.text || '')), 'tirage annoncé');
let trip = null, k = 0;
while (!trip && k++ < 40) { const f = C.userFixture(st); trip = C.nextTrip(st, f); if (!trip) C.advance(st); }
assert.ok(trip, 'un déplacement CAF arrive');
const before = st.ledger.length;
const t0 = st.clubs.est.tactics, starters = t0.lineup.map(id => st.players[id]);
for (const p of C.squad(st, 'est')) p.fitness = 1;
C.advance(st);
const tripLine = st.ledger.slice(before).find(l => l.cat === 'déplacements');
assert.ok(tripLine && tripLine.a === -trip.cost && tripLine.label.includes(trip.toCity), 'coût du déplacement débité selon la distance');
assert.ok(starters.every(p => p.travelLag > 0), 'les joueurs du déplacement accusent une fatigue de voyage durable');
const lag0 = starters[1].travelLag; C.advance(st); assert.ok(starters[1].travelLag < lag0, 'la fatigue de voyage se résorbe');
const t = st.clubs.est.tactics; st.players[t.lineup[3]].fitness = 0.5;
const changes = C.rotateLineup(st);
assert.ok(changes.length >= 1 && !t.lineup.includes(changes[0].out.id), 'rotation appliquée à la composition');
console.log('CAF CAREER OK — tirages valides, déplacement ' + trip.toCity + ', rotation appliquée');
