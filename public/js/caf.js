// Compétitions CAF : tirages au sort (chapeaux, protection par pays), tableau final,
// déplacements (distance depuis Tunis, coût, fatigue) et rotation de l'effectif.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Distances aériennes approximatives depuis Tunis (km), capitale ou grande ville de football.
export const COUNTRIES = {
  TUN: { label: 'Tunisie', city: 'Tunis', km: 0, flag: '🇹🇳' },
  LBY: { label: 'Libye', city: 'Tripoli', km: 530, flag: '🇱🇾' },
  ALG: { label: 'Algérie', city: 'Alger', km: 640, flag: '🇩🇿' },
  MAR: { label: 'Maroc', city: 'Casablanca', km: 1700, flag: '🇲🇦' },
  EGY: { label: 'Égypte', city: 'Le Caire', km: 2100, flag: '🇪🇬' },
  MLI: { label: 'Mali', city: 'Bamako', km: 2900, flag: '🇲🇱' },
  MTN: { label: 'Mauritanie', city: 'Nouakchott', km: 3000, flag: '🇲🇷' },
  SUD: { label: 'Soudan', city: 'Omdurman', km: 3200, flag: '🇸🇩' },
  NGA: { label: 'Nigeria', city: 'Lagos', km: 3300, flag: '🇳🇬' },
  GUI: { label: 'Guinée', city: 'Conakry', km: 3500, flag: '🇬🇳' },
  GHA: { label: 'Ghana', city: 'Accra', km: 3500, flag: '🇬🇭' },
  CIV: { label: 'Côte d\'Ivoire', city: 'Abidjan', km: 3700, flag: '🇨🇮' },
  COD: { label: 'RD Congo', city: 'Kinshasa', km: 4400, flag: '🇨🇩' },
  RWA: { label: 'Rwanda', city: 'Kigali', km: 4600, flag: '🇷🇼' },
  ANG: { label: 'Angola', city: 'Luanda', km: 5000, flag: '🇦🇴' },
  TAN: { label: 'Tanzanie', city: 'Dar es Salaam', km: 5400, flag: '🇹🇿' },
  ZAM: { label: 'Zambie', city: 'Lusaka', km: 6000, flag: '🇿🇲' },
  BOT: { label: 'Botswana', city: 'Gaborone', km: 6700, flag: '🇧🇼' },
  RSA: { label: 'Afrique du Sud', city: 'Johannesburg', km: 7000, flag: '🇿🇦' },
};

// « à Tunis », mais « au Caire ».
export function toCity(city = '') { return city.startsWith('Le ') ? 'au ' + city.slice(3) : 'à ' + city; }
export function fromCity(city = '') { return city.startsWith('Le ') ? 'du ' + city.slice(3) : 'de ' + city; }

export function travelInfo(country = 'TUN') {
  const c = COUNTRIES[country] || COUNTRIES.TUN;
  const km = c.km;
  return {
    ...c, km, toCity: toCity(c.city), fromCity: fromCity(c.city),
    cost: Math.round((km ? 25000 + km * 14 : 12000) / 1000) * 1000,
    fatigue: km ? clamp(km / 7000 * 0.08, 0.015, 0.08) : 0,
    hours: km ? Math.round((km / 750 + 1.5) * 2) / 2 : 1,
  };
}

const shuffle = (arr, roll) => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(roll() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// Tirage des groupes : 4 chapeaux selon le niveau, un club par chapeau dans chaque groupe,
// jamais deux clubs du même pays dans un groupe (retour arrière si une impasse survient).
export function drawGroups(teams = [], roll = Math.random, groupCount = 4) {
  const sorted = teams.slice().sort((a, b) => b.rep - a.rep);
  const size = Math.ceil(sorted.length / groupCount);
  const pots = Array.from({ length: size }, (_, i) => sorted.slice(i * groupCount, (i + 1) * groupCount));
  for (let attempt = 0; attempt < 200; attempt++) {
    const groups = Array.from({ length: groupCount }, () => []);
    let ok = true;
    for (const pot of pots) {
      for (const team of shuffle(pot, roll)) {
        const open = shuffle(groups.map((g, i) => i), roll).filter(i => groups[i].length < pots.indexOf(pot) + 1 && !groups[i].some(t => t.country === team.country));
        if (!open.length) { ok = false; break; }
        groups[open[0]].push(team);
      }
      if (!ok) break;
    }
    if (ok) return { groups, pots };
  }
  // Repli (cas impossible) : répartition par chapeau sans contrainte de pays.
  return { groups: Array.from({ length: groupCount }, (_, gi) => pots.map(p => p[gi]).filter(Boolean)), pots };
}

// Quarts : un premier de groupe contre un deuxième d'un autre groupe (et d'un autre pays si possible) ;
// le premier de groupe reçoit au retour.
export function drawQuarters(winners = [], runners = [], roll = Math.random) {
  for (const strictCountry of [true, false]) {
    for (let attempt = 0; attempt < 200; attempt++) {
      const rs = shuffle(runners, roll);
      const okPairs = winners.every((w, i) => rs[i].group !== w.group && (!strictCountry || rs[i].country !== w.country));
      if (okPairs) return winners.map((w, i) => ({ winner: w, runner: rs[i] }));
    }
  }
  return winners.map((w, i) => ({ winner: w, runner: runners[(i + 1) % runners.length] }));
}

// Tirage intégral (demi-finales) : paires aléatoires, en évitant un duel national si possible.
export function drawOpen(teams = [], roll = Math.random) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const s = shuffle(teams, roll), pairs = [];
    for (let i = 0; i + 1 < s.length; i += 2) pairs.push([s[i], s[i + 1]]);
    if (attempt > 60 || pairs.every(([a, b]) => a.country !== b.country)) return pairs;
  }
  return [];
}

// Rotation : remplace les titulaires fatigués par le meilleur remplaçant frais au même poste.
export function rotationPlan(lineup = [], pool = [], slots = [], fit = () => 1, threshold = 0.8) {
  const used = new Set(lineup.map(p => p?.id));
  const changes = [];
  lineup.forEach((p, i) => {
    if (!p || i === 0 && slots[0] === 'GK' && p.fitness >= 0.6) return; // le gardien ne tourne qu'en cas de grosse fatigue
    if (p.fitness >= threshold) return;
    const options = pool.filter(q => !used.has(q.id) && !q.injury && !q.suspended && q.fitness >= 0.9 && (slots[i] === 'GK') === (q.pos === 'GK'));
    options.sort((a, b) => fit(b, slots[i]) - fit(a, slots[i]));
    const best = options[0];
    if (best && fit(best, slots[i]) >= fit(p, slots[i]) * 0.86) { changes.push({ index: i, out: p, in: best }); used.add(best.id); }
  });
  return changes;
}
