// Commentaire : phrases contextuelles, trois langues complètes, pas de répétition immédiate.
import assert from 'node:assert/strict';
const { LINES, getGoalCommentKeys, pickLine, fillLine, getMatchFlavor } = await import('../public/js/commentary.js');

// Chaque langue couvre toutes les situations du français, et l'anglais n'est plus du français.
for (const lang of ['en', 'ar']) {
  for (const key of Object.keys(LINES.fr)) assert.ok(LINES[lang][key]?.length, `${lang} : clé manquante ${key}`);
}
assert.notEqual(LINES.en.goal[0], LINES.fr.goal[0], 'le commentaire anglais est réellement en anglais');
for (const lang of Object.keys(LINES)) for (const [key, lines] of Object.entries(LINES[lang])) for (const l of lines) {
  const vars = l.match(/\{(\w+)\}/g) || [];
  for (const v of vars) assert.ok(['{h}', '{a}', '{p}', '{t}', '{sh}', '{sa}', '{st}', '{w}', '{k}'].includes(v), `${lang}.${key} : variable inconnue ${v}`);
}
console.log('COMMENTARY LANGS OK — français, anglais et arabe complets');

const k = (o) => getGoalCommentKeys(o);
assert.equal(k({ own: true })[0], 'goal_own');
assert.equal(k({ scorerGoals: 3, scoreAfter: [3, 0], team: 0 })[0], 'goal_hattrick');
assert.equal(k({ minute: 89, scoreAfter: [2, 1], team: 0 })[0], 'goal_late', 'but de la victoire en fin de match');
assert.equal(k({ scoreAfter: [1, 1], team: 1 })[0], 'goal_equaliser');
assert.equal(k({ scoreAfter: [1, 0], team: 0, kind: 'penalty' })[0], 'goal_penalty');
assert.equal(k({ scoreAfter: [1, 0], team: 0, kind: 'freekick' })[0], 'goal_freekick');
assert.equal(k({ scoreAfter: [1, 0], team: 0, kind: 'header' })[0], 'goal_header');
assert.equal(k({ scoreAfter: [1, 0], team: 0, distance: 28 })[0], 'goal_long');
assert.equal(k({ scoreAfter: [4, 0], team: 0 })[0], 'goal_rout');
assert.equal(k({ scoreAfter: [1, 0], team: 0 }).at(-1), 'goal', 'la phrase générique reste en secours');
console.log('GOAL CONTEXT OK — triplé, fin de match, égalisation, penalty, coup franc, tête, frappe lointaine');

const mem = new Map();
let prev = null;
for (let i = 0; i < 30; i++) { const line = pickLine('fr', 'goal', () => 0.1, mem); assert.notEqual(line.text, prev, 'pas deux fois la même phrase de suite'); prev = line.text; }
assert.equal(pickLine('fr', ['inexistante', 'save'], () => 0).key, 'save', 'repli sur la clé suivante');
assert.equal(fillLine('{p} pour {t}', { p: 'Ali', t: 'EST' }), 'Ali pour EST');
assert.equal(getMatchFlavor('ca', 'est'), 'derby', 'derby de la capitale dans les deux sens');
assert.equal(getMatchFlavor('est', 'ess'), 'big');
assert.equal(getMatchFlavor('usm', 'ob'), null);
console.log('COMMENTARY PICK OK — sans répétition, repli, derby de la capitale');

// Les réactions du public ne plantent pas sans contexte audio (serveur, tests, audio coupé).
globalThis.window = {}; globalThis.performance = globalThis.performance || { now: () => 0 };
const A = await import('../public/js/audio.js');
for (const fn of ['ooh', 'groan', 'applause', 'crowdWhistles', 'chant', 'stopChant']) assert.doesNotThrow(() => A[fn](), fn);
console.log('CROWD AUDIO OK — réactions du public sûres sans contexte audio');
