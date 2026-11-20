// Centre de formation : détection régionale, potentiel estimé, progression, promotion et prêts.
import assert from 'node:assert/strict';
const Y = await import('../public/js/youth.js');
const C = await import('../public/js/career.js');

// Fourchette de potentiel : plus les recruteurs sont bons, plus elle est étroite, et elle contient le vrai potentiel.
for (let seed = 0; seed < 40; seed++) {
  const good = Y.potentialRange(70, 0.95, seed), poor = Y.potentialRange(70, 0.2, seed);
  assert.ok(good.low <= 70 && good.high >= 70 && poor.low <= 70 && poor.high >= 70, 'le vrai potentiel est dans la fourchette');
  assert.ok(good.high - good.low < poor.high - poor.low, 'meilleurs recruteurs = estimation plus précise');
}
assert.ok(Y.findChance(0.9) > Y.findChance(0.2), 'de bons recruteurs trouvent plus souvent');
let s = 3; const r = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 0x100000000; };
const avg = (region, lvl) => { let t = 0; for (let i = 0; i < 400; i++) t += Y.prospectPotential({ region, academyLevel: lvl, roll: r }); return t / 400; };
assert.ok(avg('diaspora', 2) > avg('sud', 2), 'la diaspora révèle des talents plus rares');
assert.ok(avg('tunis', 5) > avg('tunis', 1), 'une meilleure académie forme de meilleurs jeunes');
console.log('SCOUTING OK — fourchettes, chances de détection, régions, niveau d’académie');

assert.ok(Y.academyGrowthChance({ academyLevel: 5, coach: 80, age: 16, room: 10 }) > Y.academyGrowthChance({ academyLevel: 1, coach: 30, age: 19, room: 10 }));
assert.equal(Y.academyGrowthChance({ room: 0 }), 0, 'potentiel atteint : plus de progression');
assert.ok(Y.loanPlayingTime(65, 30) > Y.loanPlayingTime(65, 80), 'un club plus faible fait davantage jouer');
assert.ok(Y.loanGrowthChance({ age: 19, room: 10, playing: 0.9 }) > Y.loanGrowthChance({ age: 19, room: 10, playing: 0.2 }), 'jouer fait progresser');
assert.equal(Y.loanGrowthChance({ age: 26, room: 10, playing: 1 }), 0);
console.log('GROWTH OK — académie, âge, prêts selon le temps de jeu');

// Parcours en carrière.
const st = C.newCareer({ clubId: 'ca', seed: 5 }); st.settingsGame.allowDebt = true;
const u0 = C.academy(st);
assert.equal(u0.length, 6, 'une première génération U19');
assert.ok(u0.every(p => !C.squad(st, 'ca').includes(p)), 'les U19 ne sont pas dans l’effectif professionnel');
assert.ok(C.startScouting(st, 'sud').ok);
assert.equal(C.startScouting(st, 'tunis').ok, false, 'une mission à la fois');
const before = Object.fromEntries(u0.map(p => [p.id, p.ovr]));
for (let i = 0; i < 6; i++) C.advance(st);
assert.ok((st.prospects || []).length >= 1, 'la mission révèle au moins un talent');
const x = st.prospects[0];
assert.ok(C.signProspect(st, x.id).ok);
assert.ok(C.academy(st).some(p => p.id === x.id), 'le talent signé rejoint les U19');
const best = C.academy(st).sort((a, b) => b.ovr - a.ovr)[0];
assert.ok(C.promoteYouth(st, best.id).ok);
assert.ok(C.squad(st, 'ca').some(p => p.id === best.id) && best.role === 'espoir', 'promu avec un statut d’espoir');
const loanee = C.academy(st)[0];
const target = C.loanTargetsFor(st, loanee.id)[0];
assert.ok(C.loanForDevelopment(st, loanee.id, target.club.id).ok);
assert.ok(C.loanedOut(st).some(p => p.id === loanee.id));
assert.equal(C.loanForDevelopment(st, best.id, target.club.id).ok, true, 'un espoir promu peut aussi être prêté');
for (let i = 0; i < 18; i++) C.advance(st);
const grown = C.academy(st).filter(p => before[p.id] != null).map(p => p.ovr - before[p.id]);
assert.ok(grown.length && grown.reduce((a, b) => a + b, 0) / grown.length >= 2, 'les U19 progressent en une demi-saison : ' + grown.join(','));
assert.ok(st.players[loanee.id].ovr > loanee.loanStartOvr, 'le jeune prêté progresse');
console.log(`ACADEMY CAREER OK — détection, signature, promotion, prêts ; progression U19 ${grown.join(',')} ; prêt ${loanee.loanStartOvr}→${st.players[loanee.id].ovr}`);
