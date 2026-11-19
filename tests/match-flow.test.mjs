// Rythme de jeu : temporisation défensive, interceptions réalistes et décisions du porteur.
import assert from 'node:assert/strict';
globalThis.window = { addEventListener() {}, removeEventListener() {}, devicePixelRatio: 1, innerWidth: 800, innerHeight: 400 };
globalThis.document = { addEventListener() {}, removeEventListener() {}, hidden: false, createElement: () => ({ getContext: () => new Proxy({}, { get: () => () => ({ addColorStop() {} }) }) }) };
const { getJockeyPoint, getAITackleCommitChance, getMovingBallInterceptChance, getCarrierPassDecision, AI_FOUL_SCALE } = await import('../public/js/match.js');

// Le défenseur temporise entre le porteur et son propre but, à distance de tacle.
const carrier = { x: 10, y: 5, vx: 0, vy: 0 };
const jockeyRight = getJockeyPoint(carrier, 1);
assert.ok(jockeyRight.x < carrier.x, 'une équipe attaquant vers +x défend son but en -x');
const gap = Math.hypot(jockeyRight.x - carrier.x, jockeyRight.y - carrier.y);
assert.ok(gap > 1.2 && gap < 2.2, 'distance de temporisation réaliste : ' + gap.toFixed(2));
const jockeyLeft = getJockeyPoint(carrier, -1);
assert.ok(jockeyLeft.x > carrier.x, 'sens inverse : le défenseur se place côté +x');
console.log('JOCKEY OK — temporisation côté but à distance de tacle');

// Un bon défenseur s'engage plus souvent qu'un mauvais, sans jamais tacler à chaque image.
const strong = getAITackleCommitChance({ a: { def: 90 } }, { a: { dri: 50 } }, 1.0);
const weak = getAITackleCommitChance({ a: { def: 40 } }, { a: { dri: 85 } }, 1.6);
assert.ok(strong > weak, 'la qualité défensive augmente l engagement');
assert.ok(strong <= 0.5 && weak >= 0.08, 'engagement borné');
assert.ok(AI_FOUL_SCALE > 0 && AI_FOUL_SCALE < 1, 'les fautes IA sont atténuées');
console.log('TACKLE COMMIT OK — engagement sélectif selon défense, dribble et distance');

// Interception : contre certain sur la trajectoire, rare quand le ballon passe loin et vite.
assert.equal(getMovingBallInterceptChance(0.2, 20, 50), 1, 'ballon dans le corps : contre');
const near = getMovingBallInterceptChance(0.6, 10, 70);
const far = getMovingBallInterceptChance(1.0, 20, 70);
assert.ok(near > far, 'plus le ballon passe près, plus l interception est probable');
assert.ok(far < 0.1, 'passe rapide à un mètre : interception rare');
assert.ok(getMovingBallInterceptChance(0.7, 10, 90) > getMovingBallInterceptChance(0.7, 10, 40), 'un défenseur fort lit mieux la passe');
console.log('INTERCEPTION OK — distance à la trajectoire, vitesse du ballon et lecture défensive');

// Décisions du porteur : conduite dans l'espace, passe sous pression, tempo et passe vers l'avant.
const option = { score: 12, tx: 25 };
assert.equal(getCarrierPassDecision({ pressure: 6, laneClearance: 6, option, carrierX: 10, roll: 0.9 }).pass, false, 'espace libre : le porteur conduit');
assert.equal(getCarrierPassDecision({ pressure: 0.9, option: { score: -4, tx: 0 }, carrierX: 10, roll: 0.9 }).reason, 'pressed');
assert.equal(getCarrierPassDecision({ pressure: 6, laneClearance: 6, option, carrierX: 10, roll: 0.1 }).reason, 'progressive');
assert.equal(getCarrierPassDecision({ pressure: 6, laneClearance: 6, option: { score: 3, tx: 8 }, carrierX: 10, carryTime: 4, roll: 0.9 }).reason, 'tempo');
assert.equal(getCarrierPassDecision({ pressure: 0.5, option: null }).pass, false, 'aucune option : pas de passe');
console.log('CARRIER DECISIONS OK — conduite, pression, progression et tempo');

// Commandes : changement de joueur côté but, centre contextuel et fautes utilisateur atténuées.
const { getSwitchCandidateScore, isCrossingZone, USER_FOUL_SCALE } = await import('../public/js/match.js');
const ballAt = { x: 0, y: 0 };
// Équipe qui attaque vers +x : son but est en -x, « côté but » = x plus petit que le ballon.
const goalSidePlayer = { x: -6, y: 2, vx: 0, vy: 0 };
const beatenPlayer = { x: 5, y: 1, vx: 0, vy: 0 };
assert.ok(getSwitchCandidateScore(goalSidePlayer, ballAt, 1) < getSwitchCandidateScore(beatenPlayer, ballAt, 1), 'le défenseur placé côté but est prioritaire sur un joueur dépassé');
assert.ok(getSwitchCandidateScore({ x: -3, y: 0 }, ballAt, 1) < getSwitchCandidateScore({ x: -20, y: 10 }, ballAt, 1), 'à position équivalente, le plus proche passe devant');
assert.equal(isCrossingZone({ x: 40, y: 22 }, 1), true, 'couloir droit près de la ligne de but : centre');
assert.equal(isCrossingZone({ x: 40, y: 5 }, 1), false, 'axe : pas de centre automatique');
assert.equal(isCrossingZone({ x: -40, y: 22 }, -1), true, 'sens inverse respecté');
assert.ok(USER_FOUL_SCALE > 0.3 && USER_FOUL_SCALE < 1, 'tacles utilisateur moins souvent sifflés');
console.log('USER CONTROLS OK — changement de joueur côté but, centre contextuel et fautes');
