// Test headless : 2 saisons complètes simulées + transferts, staff, médical, élection
import * as D from '../public/js/data.js';
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

{
  const { REAL_SQUADS, KIT_DESIGNS } = await import('../public/js/data.js');
  const st = C.newCareer({ clubId: 'est', seed: 11 });
  for (const id of Object.keys(REAL_SQUADS)) {
    const sq = Object.values(st.players).filter(p => p.clubId === id && p.num > 0);
    const real = sq.filter(p => p.real);
    assert.ok(real.length >= Math.min(REAL_SQUADS[id].length, 24), `${id} : joueurs réels intégrés (${real.length})`);
    assert.equal(new Set(sq.map(p => p.num)).size, sq.length, `${id} : pas de numéro en double`);
    assert.ok(real.every(p => !p.fictif && p.name && p.ovr > 0), `${id} : joueurs réels complets`);
  }
  const est = Object.values(st.players).filter(p => p.clubId === 'est' && p.real);
  assert.ok(est.some(p => p.name === 'Youssef Msakni' && p.age === 36), 'âge réel calculé depuis l année de naissance');
  const usm = Object.values(st.players).filter(p => p.clubId === 'usm' && p.real);
  assert.ok(usm.some(p => p.name === 'Ahmed Bouassida' && p.num === 9), 'numéro réel conservé (USM)');
  const off = C.newCareer({ clubId: 'est', seed: 11, realNames: false });
  assert.equal(Object.values(off.players).filter(p => p.real).length, 0, 'option désactivée : uniquement des joueurs fictifs');
  const t = C.matchTeam(st, 'ca', false);
  assert.equal(t.kit.pattern, 'hoops', 'Club Africain à domicile : maillot à cerceaux rouges et blancs');
  assert.equal(C.matchTeam(st, 'est', true).kit.shirt, '#1a2340', 'à l extérieur : maillot extérieur bleu marine 2026-27');
  // Conflit de couleurs : le visiteur garde son maillot domicile s'il n'y a pas de conflit, sinon extérieur / troisième.
  assert.equal(C.awayKitMode('css', 'cab'), false, 'CSS (noir/blanc) vs CAB (jaune) : pas de conflit');
  assert.equal(C.awayKitMode('est', 'esz'), true, 'EST vs ESZ (rouge/jaune) : maillot extérieur');
  assert.notEqual(C.awayKitMode('ca', 'ess'), false, 'CA vs ESS (rouge) : changement');
  // Onze réel du dernier match appliqué à la création de carrière.
  { const st2 = C.newCareer({ clubId: 'ca', seed: 5 });
    assert.equal(Object.keys(D.REAL_XI).length, 16, '16 clubs avec leur dernier onze');
    for (const [cid, R] of Object.entries(D.REAL_XI)) {
      assert.deepEqual(st2.clubs[cid].tactics.lineup.map(id => st2.players[id].name).sort(), [...R.xi].sort(), `XI réel ${cid}`);
      assert.ok(R.source && R.url && R.date && R.status === 'official', `provenance ${cid}`);
      assert.equal(new Set(R.xi).size, 11, `11 joueurs distincts ${cid}`);
      const gk = st2.players[st2.clubs[cid].tactics.lineup[0]]; assert.equal(gk.pos, 'GK', `gardien ${cid}`);
    }
    const stF = C.newCareer({ clubId: 'ca', seed: 5, realNames: false });
    assert.ok(!stF.clubs.est.tactics.realXI, 'option fictive : pas de XI réel'); }
  for (const h of Object.keys(D.KIT_DESIGNS)) for (const a of Object.keys(D.KIT_DESIGNS)) if (h !== a) {
    assert.ok(!C.kitsClash(C.clubKit(h, false), C.clubKit(a, C.awayKitMode(h, a))), `maillots distincts ${h}-${a}`);
  }
  assert.ok(Object.values(KIT_DESIGNS).every(k => /^#[0-9a-f]{6}$/i.test(k.shirt) && /^#[0-9a-f]{6}$/i.test(k.alt)), 'couleurs de maillot valides');
  console.log('REAL SQUADS OK — 5 effectifs réels, numéros uniques, option fictive, maillots réels');
}

// Historique des compositions (archive non destructive, Master Production Bible)
{
  const L = await import('../public/js/lineups.js');
  const D2 = await import('../public/js/data.js');
  for (const cid of Object.keys(D2.REAL_XI)) {
    const H = L.lineupHistory(cid);
    if (!H.length || !H[0].latest) throw new Error('historique sans dernier onze : ' + cid);
    for (const h of H) if (h.xi.length !== 11 || !h.source) throw new Error('entrée historique invalide : ' + cid + ' ' + h.date);
  }
  if (L.lineupHistory('ca').length < 2) throw new Error('historique CA incomplet');
  if (!D2.REAL_XI.eshs.xi.includes('Nour Karoui') || D2.REAL_XI.eshs.xi.includes('N. El Beji')) throw new Error('ESHS non réconcilié');
  if (!D2.KIT_PROVENANCE.est || D2.KIT_PROVENANCE.est.status !== 'à confirmer') throw new Error('provenance maillot');
  console.log('LINEUP HISTORY OK — ' + Object.keys(D2.REAL_XI).length + ' clubs, archive et provenance des tenues');
}
