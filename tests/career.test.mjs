// Test headless : 2 saisons complètes simulées + transferts, staff, médical, élection
import * as C from '../public/js/career.js';
import assert from 'node:assert/strict';
const t0 = Date.now();
const st = C.newCareer({ clubId: 'ca', difficulty: 1, objective: 'afrique', presidentName: 'Test', seed: 12345 });
assert.equal(Object.values(st.clubs).filter(c => c.div === 1).length, 16, '16 clubs L1');
assert.equal(st.fixtures.filter(f => f.comp === 'L1').length, 240, '240 matchs L1');
const budget0 = st.clubs.ca.budget;
// transfert : acheter un joueur libre
st.window = 'été';
const free = C.marketList(st, { free: true })[0];
const n = C.makeOffer(st, free.p.id, { type: 'achat', fee: 0, signing: 10000, wage: C.wageDemand(st, free.p, 'rotation') + 500, years: 2, role: 'rotation' });
assert.ok(n.ok, n.msg);
C.respondNow(st, n.n.id);
assert.equal(n.n.status, 'accord', n.n.msg);
const c1 = C.confirmTransfer(st, n.n.id); assert.ok(c1.ok, c1.msg);
const c2 = C.confirmTransfer(st, n.n.id); assert.ok(!c2.ok, 'doublon bloqué');
assert.equal(st.players[free.p.id].clubId, 'ca');
// staff : licencier puis recruter un médecin
const doc = C.staffOf(st, 'doctor')[0];
assert.ok(C.fireStaff(st, doc.id).ok);
const cand = st.staffMarket.find(s => s.role === 'doctor');
let h = C.hireStaff(st, cand.id, Math.round(cand.wage * cand.demand) + 100, 2); assert.ok(h.ok, h.msg);
// infra
assert.ok(C.upgradeInfra(st, 'medical').ok);
// saison
let guard = 0, played = 0;
while (st.season === 2026 && guard++ < 200) {
  const uf = C.userFixture(st);
  const rep = C.advance(st);
  if (rep.user) played++;
  if (rep.error) throw new Error(rep.error);
}
const h0 = st.history[0];
console.log('Saison 1 :', h0, 'matchs utilisateur :', played, 'trophées :', st.trophies.map(t => t.name));
assert.ok(played >= 30, 'au moins 30 matchs joués par le club');
assert.equal(st.season, 2027);
assert.equal(Object.values(st.clubs).filter(c => c.div === 1).length, 16, 'toujours 16 clubs L1 après montées/descentes');
console.log('Ledger catégories :', Object.keys(C.financeSummary(st, 2026).by).join(', '));
// élection en début de saison 2 ? (mandat jusqu'à 2027)
console.log('Élection en cours :', !!st.election, 'confiance', st.president.trust);
// saison 2
guard = 0;
while (st.season === 2027 && guard++ < 200 && !st.gameOver) { const r = C.advance(st); if (r.error) throw new Error(r.error); }
console.log('Saison 2 :', st.history[1]);
if (st.election && !st.election.done) { const e = C.runElection(st, 'rigueur', ['meeting', 'media']); console.log('Élection :', e.won, e.shares.map(s => s.name + ' ' + s.pct + '%').join(' | ')); }
// sauvegarde JSON
const json = JSON.stringify(st);
console.log('Taille sauvegarde :', Math.round(json.length / 1024), 'Ko — durée', Date.now() - t0, 'ms');
const back = C.migrate(JSON.parse(json)); assert.equal(back.season, st.season);
console.log('OK — tous les tests carrière passent');
