// SEDDIK LEAGUE — défis et récompenses cosmétiques (aucun avantage de jeu : pas de pay-to-win).
// Évaluation pure à partir du résultat d'un match : testable sans navigateur.

export const BALL_SKINS = {
  classic: { label: 'Classique', colors: [[0.95, 0.96, 0.93], [0.42, 0.44, 0.46], [0.05, 0.06, 0.08]] },
  rades: { label: 'Radès (rouge et blanc)', colors: [[0.97, 0.96, 0.94], [0.72, 0.1, 0.12], [0.78, 0.06, 0.09]] },
  medina: { label: 'Médina (bleu de Sidi Bou Saïd)', colors: [[0.96, 0.97, 0.98], [0.1, 0.38, 0.7], [0.05, 0.3, 0.62]] },
  nuit: { label: 'Nuit dorée', colors: [[0.1, 0.1, 0.12], [0.75, 0.58, 0.18], [0.95, 0.78, 0.25]] },
};
export const BOOT_SKINS = {
  auto: { label: 'Variées (par joueur)', colors: null },
  or: { label: 'Or', colors: ['#d8a928', '#5b4210'] },
  jasmin: { label: 'Jasmin (blanc et vert)', colors: ['#f4f6f2', '#1e8a4a'] },
};

// Chaque défi : condition sur le match terminé, récompense cosmétique éventuelle.
export const CHALLENGES = [
  { id: 'tuto', label: 'Bien préparé', desc: 'Terminer le tutoriel.', reward: null },
  { id: 'first_win', label: 'Première victoire', desc: 'Gagner un match (rapide ou carrière).', reward: { type: 'ball', id: 'rades' } },
  { id: 'clean', label: 'La muraille', desc: 'Gagner sans encaisser de but.', reward: { type: 'boots', id: 'jasmin' } },
  { id: 'big', label: 'Démonstration', desc: 'Gagner avec au moins 3 buts d’écart.', reward: null },
  { id: 'header', label: 'Jeu de tête', desc: 'Marquer de la tête.', reward: null },
  { id: 'weak', label: 'Ambidextre', desc: 'Marquer du mauvais pied.', reward: { type: 'ball', id: 'medina' } },
  { id: 'long', label: 'Frappe lointaine', desc: 'Marquer de plus de 22 mètres.', reward: null },
  { id: 'comeback', label: 'Remontada', desc: 'Gagner après avoir été mené au score.', reward: { type: 'boots', id: 'or' } },
  { id: 'derby', label: 'Roi du derby', desc: 'Gagner une grande affiche (derby de la capitale, classique du Sahel…).', reward: { type: 'ball', id: 'nuit' } },
  { id: 'hard', label: 'Expert', desc: 'Gagner en difficulté « Difficile » ou plus.', reward: null },
];

const DERBIES = [['est', 'ca'], ['est', 'ess'], ['ess', 'css'], ['ca', 'ess'], ['est', 'css'], ['ca', 'css'], ['ess', 'usm'], ['ca', 'st'], ['est', 'st']];
const isDerby = (a, b) => DERBIES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

// res : { hg, ag, events } ; ctx : { userSide (0/1), homeId, awayId, difficulty }
export function evaluateChallenges(res, ctx = {}) {
  const side = ctx.userSide;
  if (side !== 0 && side !== 1 || !res) return [];
  const gf = side === 0 ? res.hg : res.ag, ga = side === 0 ? res.ag : res.hg;
  const won = gf > ga;
  const goals = (res.events || []).filter(e => e.type === 'goal').sort((a, b) => a.min - b.min);
  const mine = goals.filter(e => e.team === side && !e.own);
  // Score minute par minute : l'utilisateur a-t-il été mené ?
  let s = [0, 0], trailed = false;
  for (const g of goals) { s[g.team]++; if (s[1 - side] > s[side]) trailed = true; }
  const out = [];
  if (won) out.push('first_win');
  if (won && ga === 0) out.push('clean');
  if (gf - ga >= 3) out.push('big');
  if (mine.some(e => e.kind === 'header')) out.push('header');
  if (mine.some(e => e.weakFoot)) out.push('weak');
  if (mine.some(e => e.kind === 'long')) out.push('long');
  if (won && trailed) out.push('comeback');
  if (won && isDerby(ctx.homeId, ctx.awayId)) out.push('derby');
  if (won && (Number(ctx.difficulty) || 0) >= 2) out.push('hard');
  return out;
}

// Enregistre les défis réussis ; renvoie la liste des nouveaux (pour l'annonce à l'écran).
export function recordChallenges(progress, ids, date = new Date().toISOString().slice(0, 10)) {
  const p = progress && typeof progress === 'object' ? progress : {};
  p.done = p.done || {};
  const fresh = [];
  for (const id of ids) if (CHALLENGES.some(c => c.id === id) && !p.done[id]) { p.done[id] = date; fresh.push(id); }
  return { progress: p, fresh };
}
export function unlockedSkins(progress) {
  const done = progress?.done || {};
  const balls = ['classic'], boots = ['auto'];
  for (const c of CHALLENGES) if (done[c.id] && c.reward) (c.reward.type === 'ball' ? balls : boots).push(c.reward.id);
  return { balls, boots };
}
