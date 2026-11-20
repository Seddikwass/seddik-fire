// Vestiaire : attentes de temps de jeu, personnalités, entretiens, promesses, réunions et effet du moral.
import assert from 'node:assert/strict';
const Dr = await import('../public/js/dressing.js');
const C = await import('../public/js/career.js');
const mk = (o = {}) => ({ id: 'p' + Math.random(), name: 'Joueur', age: 26, role: 'rotation', happiness: 60, morale: 60, stats: { apps: 5, rsum: 33 }, ...o });

// Temps de jeu et attentes.
const key = mk({ role: 'cle' }), sub = mk({ role: 'rotation' });
for (let i = 0; i < 6; i++) Dr.recordPlayingTime([key, sub], [], [sub.id]);
assert.equal(Dr.playingShare(sub), 0.5, 'entré en jeu = ½');
assert.ok(Dr.playingTimeGap(key) < -0.5, 'joueur clé jamais aligné : gros déficit');
assert.ok(Dr.playingTimeGap(sub) > 0, 'remplaçant utilisé régulièrement : satisfait');
const injured = mk({ injury: { left: 3 } }); Dr.recordPlayingTime([injured], [], []);
assert.equal(injured.playLog, undefined, 'un blessé ne perd pas de temps de jeu');
const h0 = key.happiness; Dr.weeklyHappiness([key, sub]);
assert.ok(key.happiness < h0 && sub.happiness >= 60, 'le joueur clé sur le banc perd en satisfaction, le remplaçant utilisé non');
const hot = mk({ role: 'cle', personality: 'temperament', playLog: [0, 0, 0, 0, 0, 0] }), calm = mk({ role: 'cle', personality: 'discret', playLog: [0, 0, 0, 0, 0, 0] });
Dr.weeklyHappiness([hot, calm]);
assert.ok(hot.happiness < calm.happiness, 'un tempérament réagit plus fort qu’un discret');
console.log('PLAYING TIME OK — attentes par rôle, blessés épargnés, personnalités');

// Promesses : tenue → confiance, rompue → sanction.
const kept = mk({ role: 'rotation' }), broken = mk({ role: 'rotation' });
assert.ok(Dr.talkTo(kept, 'promise').ok); assert.ok(Dr.talkTo(broken, 'promise').ok);
assert.equal(Dr.talkTo(kept, 'promise').ok, false, 'pas deux promesses en même temps');
for (let i = 0; i < 5; i++) Dr.recordPlayingTime([kept, broken], [kept.id], []);
const ev = Dr.weeklyHappiness([kept, broken]);
assert.ok(ev.some(e => e.type === 'promise-kept' && e.p === kept));
assert.ok(ev.some(e => e.type === 'promise-broken' && e.p === broken));
assert.ok(kept.happiness > broken.happiness + 30, 'promesse tenue nettement mieux vécue');
console.log('PROMISES OK — suivi sur 5 matchs, tenue et rompue');

// Entretiens.
const star = mk({ stats: { apps: 10, rsum: 74 }, personality: 'pro' });
const m0 = star.morale; assert.ok(Dr.talkTo(star, 'praise').ok); assert.ok(star.morale > m0, 'féliciter un joueur en forme le motive');
assert.equal(Dr.talkTo(star, 'praise').ok, false, 'un entretien tous les 3 matchs');
const poorPro = mk({ stats: { apps: 10, rsum: 58 }, personality: 'pro' }), poorHot = mk({ stats: { apps: 10, rsum: 58 }, personality: 'temperament' });
Dr.talkTo(poorPro, 'demand'); Dr.talkTo(poorHot, 'demand');
assert.ok(poorPro.morale > 60 && poorHot.morale < 60, 'exiger plus : le professionnel se reprend, le tempérament se braque');
const wants = mk({ listed: 'demande' });
assert.ok(Dr.talkTo(wants, 'acceptTransfer').ok); assert.equal(wants.listed, true, 'accepter : placé sur la liste');
const refused = mk({ listed: 'demande', personality: 'pro' }); Dr.talkTo(refused, 'refuseTransfer');
assert.equal(refused.listed, false); assert.ok(refused.happiness < 60);
console.log('TALKS OK — féliciter, exiger, demandes de départ, délai entre entretiens');

// Ambiance et réunions.
const group = [mk({ happiness: 20, personality: 'leader' }), mk({ happiness: 25 }), mk({ happiness: 80 })];
const room = Dr.dressingRoomState(group);
assert.ok(room.crisis, 'un leader mécontent plus un autre frondeur = crise');
const calmRes = Dr.teamMeeting(group, 'calm', { room });
assert.ok(calmRes.ok && calmRes.cohesion > 0, 'apaiser un vestiaire tendu');
const happyGroup = [mk({ happiness: 85 }), mk({ happiness: 80 })];
assert.ok(Dr.teamMeeting(happyGroup, 'demand', { recentPoints: 2.5 }).cohesion < 0, 'hausser le ton après de bons résultats : contre-productif');
assert.ok(Dr.moraleFactor(100) > 1 && Dr.moraleFactor(0) < 1, 'le moral pèse sur le rendement');
console.log('ROOM OK — crise, réunions d’équipe, effet du moral');

// Carrière : branchement, cooldown de réunion et saison simulée raisonnable.
const st = C.newCareer({ clubId: 'est', seed: 9 });
assert.ok(C.holdTeamMeeting(st, 'motivate').ok);
assert.equal(C.holdTeamMeeting(st, 'motivate').ok, false, 'une réunion tous les 4 matchs');
for (let i = 0; i < 30 && st.slot < st.slots.length; i++) C.advance(st);
const sq = C.squad(st, 'est');
const demands = sq.filter(p => p.listed === 'demande').length;
assert.ok(demands <= 3, 'pas de vague de demandes de départ : ' + demands);
assert.ok(C.dressingRoom(st).mood >= 45, 'ambiance correcte sans mauvaise gestion');
const t = C.matchTeam(st, 'est');
assert.ok(t.players.every(p => p.attrs && typeof p.attrs.pac === 'number'), 'attributs de match valides avec le moral');
console.log('CAREER DRESSING OK — saison simulée : ' + demands + ' demande(s), ambiance ' + C.dressingRoom(st).label);
