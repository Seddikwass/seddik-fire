// Centre de formation : détection régionale, potentiel estimé, progression des U19,
// promotion en équipe première et prêts de développement. Fonctions pures.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Régions de détection : coût par mission, qualité moyenne et profils dominants.
export const REGIONS = {
  tunis: { label: 'Grand Tunis', cost: 6000, quality: 1, weeks: 3, attrs: ['dri', 'pas'], pos: ['MOC', 'AD', 'AG', 'MC'] },
  sahel: { label: 'Sahel (Sousse, Monastir, Mahdia)', cost: 6000, quality: 1, weeks: 3, attrs: ['pas', 'sho'], pos: ['MC', 'BU', 'MOC'] },
  sfax: { label: 'Sfax et le Centre-Est', cost: 5000, quality: 0.95, weeks: 3, attrs: ['def', 'phy'], pos: ['DC', 'MDC', 'DD', 'DG'] },
  nordouest: { label: 'Nord-Ouest (Béja, Jendouba, Le Kef)', cost: 4000, quality: 0.85, weeks: 4, attrs: ['phy', 'def'], pos: ['DC', 'MDC', 'GK', 'BU'] },
  sud: { label: 'Sud (Gabès, Médenine, Gafsa)', cost: 4000, quality: 0.85, weeks: 4, attrs: ['pac', 'dri'], pos: ['AD', 'AG', 'BU', 'DD', 'DG'] },
  diaspora: { label: 'Diaspora (Europe)', cost: 18000, quality: 1.25, weeks: 5, attrs: ['pas', 'dri', 'pac'], pos: ['MOC', 'AD', 'AG', 'MC', 'DC'] },
};
export const ACADEMY_MAX = 20;

// Précision de la fourchette de potentiel selon la qualité des recruteurs (0..1).
export function potentialRange(pot, scoutQ = 0.5, seed = 0) {
  const err = Math.round((1 - clamp(scoutQ, 0, 1)) * 14) + 4;
  const offset = ((seed % (2 * err + 1)) - err) / 3;
  const mid = Math.round(pot + offset);
  return { low: clamp(mid - err, 35, 99), high: clamp(mid + err, 35, 99) };
}

// Chance hebdomadaire de dénicher un talent pendant une mission.
export function findChance(scoutQ = 0.5, region = 'tunis') {
  const reg = REGIONS[region] || REGIONS.tunis;
  return clamp(0.35 + scoutQ * 0.4, 0.2, 0.85) * (region === 'diaspora' ? 0.7 : 1);
}

// Potentiel d'un talent détecté : la région, l'académie et le hasard comptent.
export function prospectPotential({ region = 'tunis', academyLevel = 1, roll = Math.random } = {}) {
  const reg = REGIONS[region] || REGIONS.tunis;
  const base = 52 + academyLevel * 2.5 + (reg.quality - 1) * 25;
  const pot = base + roll() * 26 * reg.quality + (roll() < 0.06 ? 10 : 0); // pépite rare
  return Math.round(clamp(pot, 45, 94));
}

// Progression hebdomadaire d'un jeune : académie, responsable de la formation, âge, marge.
export function academyGrowthChance({ academyLevel = 1, coach = 40, age = 17, room = 10, morale = 70 } = {}) {
  if (room <= 0) return 0;
  const ageK = age <= 17 ? 1.15 : age <= 19 ? 1 : 0.7;
  return clamp((0.08 + academyLevel * 0.035 + coach / 900) * ageK * (0.85 + morale / 400), 0, 0.45);
}

// Prêt de développement : un jeune qui joue progresse plus vite qu'à l'entraînement.
export function loanGrowthChance({ age = 20, room = 10, playing = 0.6 } = {}) {
  if (room <= 0 || age > 24) return 0;
  return clamp(0.04 + playing * 0.16 - Math.max(0, age - 21) * 0.03, 0, 0.22);
}

// Temps de jeu attendu en prêt : un club plus faible fait davantage jouer le jeune.
export function loanPlayingTime(playerOvr = 55, clubRep = 50) {
  return clamp(0.35 + (playerOvr - (clubRep * 0.6 + 25)) / 30, 0.1, 0.95);
}

// Prêt de développement : clubs qui peuvent accueillir le jeune, le plus utile d'abord.
export function loanTargets(clubs = [], player = {}, userClub = '') {
  return clubs
    .filter(c => c.id !== userClub && c.rep < 75)
    .map(c => ({ club: c, playing: loanPlayingTime(player.ovr, c.rep) }))
    .sort((a, b) => b.playing * 2 + b.club.rep / 100 - (a.playing * 2 + a.club.rep / 100))
    .slice(0, 6);
}

// Prime à la signature d'un jeune (selon le potentiel estimé).
export function prospectFee(potHigh = 70) {
  return Math.round(clamp((potHigh - 50) * 400, 1000, 20000) / 500) * 500;
}
