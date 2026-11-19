// Séance de tirs au but — règles officielles (Lois du jeu IFAB, loi 10) et modèle de tir.
// Fonctions pures : testables sans rendu ni moteur de match.
import { clamp } from './util.js';

export const GOAL_HALF_WIDTH = 3.66;
export const GOAL_HEIGHT = 2.44;

// État de la séance : 5 tirs chacun en alternance, fin anticipée dès qu'une équipe
// ne peut plus rattraper l'autre, puis mort subite par paires de tirs.
export function getShootoutStatus(kicks = [[], []]) {
  const taken = [kicks[0].length, kicks[1].length];
  const goals = [kicks[0].filter(Boolean).length, kicks[1].filter(Boolean).length];
  let decided = false;
  if (taken[0] <= 5 && taken[1] <= 5) {
    const left = [5 - taken[0], 5 - taken[1]];
    if (goals[0] + left[0] < goals[1] || goals[1] + left[1] < goals[0]) decided = true;
  }
  if (!decided && taken[0] >= 5 && taken[0] === taken[1] && goals[0] !== goals[1]) decided = true;
  const winner = decided ? (goals[0] > goals[1] ? 0 : 1) : null;
  return { taken, goals, decided, winner, suddenDeath: taken[0] >= 5 && taken[1] >= 5 };
}

// Équipe qui tire ensuite : alternance stricte à partir de l'équipe désignée.
export function getNextKicker(kicks = [[], []], first = 0) {
  const a = kicks[first].length, b = kicks[1 - first].length;
  return a > b ? 1 - first : first;
}

// Ordre des tireurs : meilleurs finisseurs d'abord, gardien en dernier ;
// tous les joueurs éligibles tirent avant qu'un même joueur tire une seconde fois.
export function getShootoutOrder(players = []) {
  const eligible = players.filter(p => p && !p.sentOff && !p.subbedOff);
  const score = p => (p.isGK ? -1000 : 0) + (p.a?.sho ?? 50) * 0.55 + (p.a?.tec ?? 50) * 0.3 + (p.stamina ?? 1) * 15;
  return eligible.slice().sort((x, y) => score(y) - score(x));
}

// Choix de l'IA tireuse : côté, hauteur et puissance (une panenka rare au centre).
export function getAIPenaltyChoice(shooter = {}, roll = Math.random) {
  const sho = clamp(shooter.a?.sho ?? 50, 0, 100) / 100;
  const r = roll();
  if (r < 0.08) return { aimY: (roll() - 0.5) * 0.8, power: 0.45 + roll() * 0.2, lift: 0.9 + roll() * 0.5 };
  const side = roll() < 0.5 ? -1 : 1;
  return {
    aimY: side * (1.9 + roll() * (1.3 + sho * 0.5)),
    power: 0.58 + roll() * 0.32,
    lift: roll() < 0.35 ? 1.5 + roll() * 0.6 : 0.25 + roll() * 0.7,
  };
}

// Trajectoire réellement frappée : la dispersion dépend de la finition, de la
// technique et d'une puissance excessive (ballon au-dessus ou à côté).
export function getPenaltyStrike({ aimY = 0, lift = 0.8, power = 0.7, shooting = 50, technique = 50, roll = Math.random } = {}) {
  const sho = clamp(shooting, 0, 100) / 100, tec = clamp(technique, 0, 100) / 100;
  const over = Math.max(0, power - 0.82) / 0.18;
  const spread = 0.2 + (1 - sho) * 0.7 + (1 - tec) * 0.25 + over * 0.5;
  const y = clamp(aimY, -3.6, 3.6) + (roll() - 0.5) * 2 * spread;
  const z = clamp(lift + over * 0.9 + (roll() - 0.5) * 2 * (0.12 + (1 - tec) * 0.3 + over * 0.35), 0.1, 3.2);
  const speed = 18 + clamp(power, 0, 1) * 12 + sho * 3;
  return { y, z, speed };
}

// Plongeon du gardien IA : il lit le tireur avec une probabilité liée à sa note.
export function getAIKeeperDive(strikeY = 0, rating = 50, roll = Math.random) {
  const read = 0.3 + clamp(rating, 0, 100) / 420;
  const r = roll();
  if (r < 0.12) return 0; // reste au centre
  const correct = Math.sign(strikeY) || 1;
  return roll() < read ? correct : (roll() < 0.5 ? -1 : 1);
}

// Issue du tir : à côté / au-dessus, arrêt ou but. Le gardien couvre une zone
// autour de sa position finale ; les tirs dans les coins et puissants la réduisent.
export function getPenaltyOutcome({ y = 0, z = 0.8, speed = 24, dive = 0, keeperRating = 50, roll = Math.random } = {}) {
  if (Math.abs(y) > GOAL_HALF_WIDTH - 0.08 || z > GOAL_HEIGHT - 0.04) return { result: 'miss', keeperY: dive * 1.9 };
  const keeperY = dive * 1.9;
  const gk = clamp(keeperRating, 0, 100) / 100;
  let reach = (dive ? 1.25 : 0.7) + (gk - 0.5) * 0.45;
  if (z > 1.9 || z < 0.35) reach *= 0.82;
  if (Math.abs(y) > 2.9) reach *= 0.8;
  reach *= 1 - clamp((speed - 24) / 30, 0, 0.25);
  const gap = Math.abs(y - keeperY);
  if (gap < reach && roll() < 0.5) return { result: 'saved', keeperY };
  // Poteau ou barre rentrant/sortant sur une frappe à la limite.
  if ((Math.abs(y) > GOAL_HALF_WIDTH - 0.3 || z > GOAL_HEIGHT - 0.2) && roll() < 0.3) return { result: 'post', keeperY };
  return { result: 'goal', keeperY };
}
