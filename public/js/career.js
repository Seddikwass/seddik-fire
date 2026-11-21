// Moteur de carrière : saisons, compétitions, finances, transferts, staff, médical, élections.
import { CLUBS, CAF_CLUBS, RULES, START_CAF, START_CUP_HOLDER, START_CHAMPION, FIRST, LAST, FOREIGN_FIRST, FOREIGN_LAST, FOREIGN_NAT, STAFF_ROLES, INFRA, FORMATIONS, FORMATION_POS, POS_GROUP, REAL_SQUADS, REAL_XI, KIT_DESIGNS, KIT_DESIGNS_AWAY } from './data.js';
import { rng, clamp, uid, deepCopy } from './util.js';
import { quickSim } from './match.js';
import * as Dr from './dressing.js';
import * as Tx from './transfers.js';
import * as Y from './youth.js';
import * as K from './caf.js';

export const SAVE_VERSION = 3;
const POS_LIST = ['GK', 'DD', 'DC', 'DG', 'MDC', 'MC', 'MD', 'MG', 'MOC', 'AD', 'AG', 'BU'];
const SQUAD_TEMPLATE = ['GK', 'GK', 'GK', 'DD', 'DD', 'DC', 'DC', 'DC', 'DC', 'DG', 'DG', 'MDC', 'MDC', 'MC', 'MC', 'MC', 'MD', 'MG', 'MOC', 'AD', 'AG', 'BU', 'BU', 'BU'];
export const DIFFS = ['Facile', 'Normal', 'Difficile', 'Légende'];
export const OBJECTIVES = { maintien: 'Maintien', afrique: 'Qualification africaine', podium: 'Podium', titre: 'Titre', coupe: 'Coupe de Tunisie' };
const INJURIES = [
  { n: 'Contusion', sev: 'légère', w: [1, 2], rel: 0.03 }, { n: 'Entorse de la cheville', sev: 'modérée', w: [2, 5], rel: 0.10 },
  { n: 'Élongation des ischio-jambiers', sev: 'modérée', w: [2, 4], rel: 0.15 }, { n: 'Déchirure du mollet', sev: 'modérée', w: [3, 6], rel: 0.15 },
  { n: 'Pubalgie', sev: 'modérée', w: [3, 7], rel: 0.20 }, { n: 'Tendinite rotulienne', sev: 'légère', w: [1, 3], rel: 0.18 },
  { n: 'Fracture du métatarse', sev: 'grave', w: [8, 12], rel: 0.05 }, { n: 'Rupture du ligament croisé', sev: 'grave', w: [20, 30], rel: 0.10 },
  { n: 'Commotion', sev: 'légère', w: [1, 2], rel: 0.02 },
];
const PRIZE = { l1: [2400000, 1700000, 1300000, 1000000, 800000, 650000], cupRound: 120000, cupWin: 900000, clGroup: 2100000, clQF: 1300000, clSF: 1900000, clWin: 6000000, ccGroup: 1200000, ccQF: 700000, ccSF: 1000000, ccWin: 3000000, sup: 400000 };

// ------------------------------------------------------------------ joueurs
export function ovrOf(p, pos = p.pos) {
  const a = p.attrs;
  const g = POS_GROUP[pos] || 'M';
  if (pos === 'GK') return Math.round(a.gk * 0.85 + a.phy * 0.1 + a.pas * 0.05);
  if (g === 'D') return Math.round(a.def * 0.45 + a.phy * 0.2 + a.pac * 0.15 + a.pas * 0.12 + a.dri * 0.08);
  if (g === 'M') return Math.round(a.pas * 0.32 + a.dri * 0.22 + a.def * 0.14 + a.sho * 0.12 + a.phy * 0.1 + a.pac * 0.1);
  return Math.round(a.sho * 0.38 + a.pac * 0.22 + a.dri * 0.22 + a.phy * 0.1 + a.pas * 0.08);
}
function posFit(p, pos) {
  if (p.pos === pos) return 1;
  if (p.pos2 === pos) return 0.95;
  if (POS_GROUP[p.pos] === POS_GROUP[pos]) return 0.88;
  if (pos === 'GK' || p.pos === 'GK') return 0.3;
  return 0.7;
}
export function valueOf(p, season) {
  const o = p.ovr, age = p.age;
  let v = Math.pow(Math.max(o - 40, 1), 2.6) * 55;
  v *= age <= 21 ? 1.5 : age <= 24 ? 1.3 : age <= 28 ? 1.0 : age <= 31 ? 0.7 : 0.35;
  v *= 1 + Math.max(0, p.pot - o) / 60;
  const yrs = Math.max(0, (p.contractEnd ?? season) - season);
  v *= yrs <= 0 ? 0.25 : yrs === 1 ? 0.75 : 1;
  return Math.round(v / 1000) * 1000;
}
function wageFor(ovr, rep) { return Math.round((Math.pow(Math.max(ovr - 35, 1), 2.1) * 7.5 * (0.6 + rep / 160)) / 50) * 50; }

function genAttrs(r, pos, target) {
  const g = POS_GROUP[pos];
  const n = (m) => clamp(Math.round(r.norm(m, 5)), 20, 97);
  const t = target;
  const a = { pac: n(t), sho: n(t - 6), pas: n(t - 2), dri: n(t - 2), def: n(t - 10), phy: n(t), gk: n(25) };
  if (pos === 'GK') Object.assign(a, { gk: n(t + 6), pac: n(t - 15), sho: n(30), dri: n(35), def: n(40) });
  else if (g === 'D') Object.assign(a, { def: n(t + 7), sho: n(t - 18), dri: n(t - 10), phy: n(t + 3) });
  else if (g === 'M') Object.assign(a, { pas: n(t + 6), dri: n(t + 3), def: n(pos === 'MDC' ? t + 3 : t - 8), sho: n(pos === 'MOC' ? t + 2 : t - 6) });
  else Object.assign(a, { sho: n(t + 7), pac: n(t + 5), dri: n(t + 4), def: n(t - 25) });
  return a;
}
export function genPlayer(r, pos, target, clubId, season, opts = {}) {
  const foreign = !opts.youth && r() < 0.12;
  const first = foreign ? r.pick(FOREIGN_FIRST) : r.pick(FIRST), last = foreign ? r.pick(FOREIGN_LAST) : r.pick(LAST);
  const age = opts.age ?? (opts.youth ? r.int(16, 18) : clamp(Math.round(r.norm(26, 4)), 18, 35));
  const attrs = genAttrs(r, pos, target - (age < 21 ? 4 : 0));
  const p = {
    id: uid('p'), first, last, name: `${first} ${last}`, age, nat: foreign ? r.pick(FOREIGN_NAT) : 'TUN', pos,
    pos2: r() < 0.5 ? r.pick(POS_LIST.filter(x => POS_GROUP[x] === POS_GROUP[pos] && x !== pos)) || null : null,
    foot: r() < 0.72 ? 'Droit' : r() < 0.85 ? 'Gauche' : 'Les deux', height: Math.round(r.norm(pos === 'GK' ? 188 : 179, 6)),
    attrs, morale: 70, form: 1, fitness: 1, clubId, num: 0, injury: null, suspended: 0, yellows: 0,
    stats: { apps: 0, goals: 0, assists: 0, rsum: 0, cs: 0 }, career: [], loan: null, listed: false, happiness: 70, role: 'rotation', fictif: true,
  };
  p.ovr = ovrOf(p);
  const growth = age <= 18 ? r.int(8, 24) : age <= 21 ? r.int(4, 16) : age <= 24 ? r.int(1, 8) : 0;
  p.pot = clamp(p.ovr + growth, p.ovr, 92);
  p.contractEnd = season + (opts.youth ? 3 : r.int(1, 4));
  p.wage = opts.youth ? 400 : wageFor(p.ovr, opts.rep ?? 60);
  p.value = valueOf(p, season);
  return p;
}
function genStaff(r, role, rep, season) {
  const ab = clamp(Math.round(r.norm(30 + rep * 0.55, 9)), 15, 95);
  const R = STAFF_ROLES.find(x => x.id === role);
  return {
    id: uid('s'), role, name: `${r.pick(FIRST)} ${r.pick(LAST)}`, age: r.int(32, 64), ability: ab,
    rep: clamp(ab + r.int(-10, 10), 10, 99), wage: Math.round(R.base * (0.5 + ab / 70) / 50) * 50,
    contractEnd: season + r.int(1, 3), demand: 1 + r.int(5, 25) / 100,
    spec: role === 'head' ? r.pick(['Offensif', 'Défensif', 'Possession', 'Contre-attaque', 'Pressing']) : null, fictif: true,
  };
}

// ------------------------------------------------------------------ création
export function newCareer(opts) {
  const seed = opts.seed ?? Math.floor(Math.random() * 1e9);
  const r = rng(seed);
  const season = 2026;
  const clubsSrc = deepCopy(opts.clubs || CLUBS);
  if (opts.custom) {
    const c = opts.custom;
    const replaced = clubsSrc.find(x => x.id === opts.replaceId) || clubsSrc.filter(x => x.div === 1).sort((a, b) => a.rep - b.rep)[0];
    Object.assign(replaced, { id: 'custom', name: c.name, short: c.short.toUpperCase().slice(0, 4), city: c.city, stadium: c.stadium || 'Stade municipal de ' + c.city, capacity: 8000, colors: [c.c1, c.c2], away: [c.c2, c.c1], rep: 50, fictif: true });
    opts.clubId = 'custom';
  }
  const st = {
    v: SAVE_VERSION, seed, rs: 0, createdAt: Date.now(), updatedAt: Date.now(), season, slot: 0, difficulty: opts.difficulty ?? 1,
    userClub: opts.clubId, president: { name: opts.presidentName || 'Président', trust: 60, mandateEnd: season + 1, elected: 1, history: [] },
    objective: opts.objective || 'afrique', finObjective: opts.finObjective || 'equilibre',
    clubs: {}, players: {}, staff: {}, staffMarket: [], fixtures: [], slots: [], comps: {}, news: [], ledger: [], loans: [],
    offers: [], negotiations: [], txLog: [], history: [], trophies: [], settingsGame: { allowDebt: false },
    training: { intensity: 1, focus: 'equilibre', individual: {} }, ticketPrice: 1, winBonus: 1, construction: [],
    adRewardsToday: { day: '', n: 0 }, caf: { cl: START_CAF.cl.slice(), cc: START_CAF.cc.slice() }, cupHolder: START_CUP_HOLDER, champion: START_CHAMPION,
    gameOver: null, election: null, lastResult: null, dataNote: 'Joueurs et staff fictifs ; clubs réels en données de démonstration',
  };
  for (const c of clubsSrc) {
    const budget = Math.round(Math.pow(c.rep, 2) * (c.div === 1 ? 950 : 500) / 1000) * 1000;
    st.clubs[c.id] = {
      ...c, budget, debt: 0, fans: { sat: 60, base: clamp(0.25 + c.rep / 160, 0.2, 0.85) },
      infra: Object.fromEntries(INFRA.map(i => [i.id, clamp(Math.round(c.rep / 22), 1, 5)])),
      tactics: { formation: r.pick(Object.keys(FORMATIONS)), mentality: 0, pressing: 1, width: 1, line: 0, tempo: 1, lineup: [], bench: [], captain: null, takers: {}, instr: {} },
      coach: `${r.pick(FIRST)} ${r.pick(LAST)}`, titles: { l1: 0, cup: 0, cl: 0, cc: 0 }, morale: 60, cohesion: 60,
    };
    const target = c.div === 1 ? 46 + c.rep * 0.3 : 44 + c.rep * 0.2;
    let num = 1;
    // Effectif réel (option) : chaque poste du gabarit prend le prochain joueur réel du même groupe.
    const pool = opts.realNames === false ? null : (REAL_SQUADS[c.id] || []).map(e => ({ name: e[0], g: e[1], nat: e[2], born: e[3], num: e[4], pos: e[5] }));
    const usedNums = new Set(), reserved = new Set((pool || []).map(e => e.num).filter(Boolean));
    const takeReal = pos => {
      if (!pool || !pool.length) return null;
      const g = POS_GROUP[pos] === 'G' || pos === 'GK' ? 'G' : POS_GROUP[pos];
      let i = pool.findIndex(e => e.g === g && e.pos === pos);
      if (i < 0) i = pool.findIndex(e => e.g === g && !e.pos);
      if (i < 0) i = pool.findIndex(e => e.g === g);
      return i < 0 ? null : pool.splice(i, 1)[0];
    };
    const applyReal = (p, e) => {
      const parts = e.name.split(' ');
      Object.assign(p, { first: parts[0], last: parts.slice(1).join(' ') || parts[0], name: e.name, nat: e.nat || '—', fictif: false, real: true });
      if (e.born) p.age = season - e.born;
      if (e.num && !usedNums.has(e.num)) p.num = e.num;
      p.ovr = ovrOf(p); p.value = valueOf(p, season);
    };
    const squadPos = [...SQUAD_TEMPLATE];
    for (const pos of squadPos) {
      const p = genPlayer(r, pos, target + r.int(-4, 4), c.id, season, { rep: c.rep });
      p.num = pos === 'GK' && num > 1 && num < 12 ? (num === 2 ? 16 : 30) : num; num++;
      const e = takeReal(pos); const fixed = e && e.num && !usedNums.has(e.num);
      if (e) applyReal(p, e);
      if (!fixed) while (usedNums.has(p.num) || reserved.has(p.num)) p.num += 1;
      usedNums.add(p.num);
      st.players[p.id] = p;
    }
    // Joueurs réels restants (listes plus longues que le gabarit) : ajoutés à l'effectif à leur poste.
    if (pool) while (pool.length && Object.values(st.players).filter(x => x.clubId === c.id).length < 40) {
      const e = pool.shift();
      const pos = e.pos || (e.g === 'G' ? 'GK' : e.g === 'D' ? 'DC' : e.g === 'M' ? 'MC' : 'BU');
      const p = genPlayer(r, pos, target + r.int(-6, 2), c.id, season, { rep: c.rep });
      p.num = 33; const fixed = e.num && !usedNums.has(e.num); applyReal(p, e); if (!fixed) while (usedNums.has(p.num) || reserved.has(p.num)) p.num++; usedNums.add(p.num);
      st.players[p.id] = p;
    }
    for (let i = 0; i < 3; i++) { const p = genPlayer(r, r.pick(POS_LIST.slice(1)), target - 10, c.id, season, { youth: true }); p.num = 40 + i; while (usedNums.has(p.num) || reserved.has(p.num)) p.num++; usedNums.add(p.num); p.role = 'jeune'; st.players[p.id] = p; }
    autoLineup(st, c.id);
    if (pool) applyRealXI(st, c.id);
  }
  // agents libres
  for (let i = 0; i < 45; i++) { const p = genPlayer(r, r.pick(POS_LIST), r.int(48, 66), null, season, { rep: 50 }); p.contractEnd = season; st.players[p.id] = p; }
  // staff du club joueur
  const uc = st.clubs[st.userClub];
  for (const R of STAFF_ROLES) for (let i = 0; i < R.count; i++) { const s = genStaff(r, R.id, uc.rep, season); st.staff[s.id] = s; }
  const head = Object.values(st.staff).find(s => s.role === 'head'); if (head) uc.coach = head.name;
  refreshStaffMarket(st, r);
  // Première génération U19 du centre de formation.
  for (let i = 0; i < 6; i++) { const p = genPlayer(r, r.pick(POS_LIST), 34 + uc.rep * 0.18 + uc.infra.academy * 3, uc.id, season, { youth: true }); Object.assign(p, { role: 'jeune', num: 0, academy: true, wage: 300 }); st.players[p.id] = p; }
  st.prospects = []; st.youthScouting = null;
  st.rs = r.state();
  st.cafSquads = {};
  setupSeason(st);
  if (st.cafDrawNews) { addNews(st, st.cafDrawNews, 'comp'); st.cafDrawNews = null; }
  addNews(st, `Bienvenue, ${st.president.name} ! Vous prenez la présidence de ${uc.name}. Objectif fixé : ${OBJECTIVES[st.objective]}.`, 'club');
  addNews(st, `Données : clubs de Ligue 1 ${season}-${season + 1} vérifiés le 16/11/2026. ${opts.realNames === false ? 'Tous les joueurs et membres du staff sont fictifs.' : 'Effectifs réels (EST, CA, CSS, ESS, USM, relevés le 21/11/2026) complétés par des joueurs fictifs ; notes de jeu et staff fictifs.'}`, 'info');
  return st;
}
const R = st => { const r = rng(st.rs || st.seed); return r; };
const saveR = (st, r) => { st.rs = r.state(); };

export function refreshStaffMarket(st, r) {
  st.staffMarket = [];
  const rep = st.clubs[st.userClub].rep;
  for (const Ro of STAFF_ROLES) for (let i = 0; i < 4; i++) st.staffMarket.push(genStaff(r, Ro.id, clamp(rep + r.int(-25, 20), 20, 99), st.season));
}
export function addNews(st, text, type = 'info') { st.news.unshift({ id: uid('n'), text, type, season: st.season, slot: st.slot, t: Date.now() }); st.news = st.news.slice(0, 80); }
function ledger(st, amount, cat, label) {
  const c = st.clubs[st.userClub];
  c.budget += amount;
  st.ledger.push({ s: st.season, w: st.slot, a: Math.round(amount), cat, label });
  if (st.ledger.length > 600) st.ledger = st.ledger.slice(-600);
}
export function clubPlayers(st, cid) { return Object.values(st.players).filter(p => p.clubId === cid && !(p.loan && p.loan.to && p.loan.from === cid)).concat(Object.values(st.players).filter(p => p.loan && p.loan.to === cid && p.clubId !== cid)); }
export function squad(st, cid) { return Object.values(st.players).filter(p => !p.academy && (p.loan ? p.loan.to === cid : p.clubId === cid)); }
// Équipe U19 du centre de formation (hors effectif professionnel).
export function academy(st, cid = st.userClub) { return Object.values(st.players).filter(p => p.academy && p.clubId === cid && !p.loan); }
export const available = p => !p.injury && !p.suspended;

// ------------------------------------------------------------------ composition
export function autoLineup(st, cid) {
  const c = st.clubs[cid], t = c.tactics;
  const form = FORMATION_POS[t.formation] || FORMATION_POS['4-3-3'];
  const pool = squad(st, cid).filter(available);
  const used = new Set(), lineup = [];
  // gardien d'abord, puis postes rares
  const order = form.map((pos, i) => ({ pos, i })).sort((a, b) => (a.pos === 'GK' ? -1 : 0) - (b.pos === 'GK' ? -1 : 0));
  for (const { pos, i } of order) {
    let best = null, bs = -1;
    for (const p of pool) { if (used.has(p.id)) continue; const s = ovrOf(p, pos) * posFit(p, pos) * (0.85 + 0.15 * p.fitness) * (p.xi ? 1.1 : 1); if (s > bs) { bs = s; best = p; } }
    if (best) { used.add(best.id); lineup[i] = best.id; }
  }
  t.lineup = lineup;
  t.bench = pool.filter(p => !used.has(p.id)).sort((a, b) => b.ovr - a.ovr).slice(0, 9).map(p => p.id);
  if (!t.captain || !used.has(t.captain)) t.captain = lineup.map(id => st.players[id]).filter(Boolean).sort((a, b) => b.age + b.ovr - a.age - a.ovr)[0]?.id;
  const sh = lineup.map(id => st.players[id]).filter(Boolean).sort((a, b) => b.attrs.sho - a.attrs.sho)[0];
  const ps = lineup.map(id => st.players[id]).filter(Boolean).sort((a, b) => b.attrs.pas - a.attrs.pas)[0];
  t.takers = { penalty: sh?.id, freekick: ps?.id, corner: ps?.id };
}
// Onze réel du dernier match : formation + titulaires par nom ; les titulaires réels gardent un léger bonus de sélection.
export function applyRealXI(st, cid) {
  const R = REAL_XI[cid]; if (!R) return false;
  const c = st.clubs[cid], t = c.tactics, sq = squad(st, cid);
  const ids = R.xi.map(n => sq.find(p => p.name === n)?.id);
  if (ids.some(id => !id)) return false;
  for (const id of ids) st.players[id].xi = true;
  t.formation = R.formation; t.lineup = ids;
  t.bench = sq.filter(p => !ids.includes(p.id) && available(p)).sort((a, b) => b.ovr - a.ovr).slice(0, 9).map(p => p.id);
  t.realXI = R.match;
  return true;
}
// remplace uniquement les titulaires indisponibles (blessés, suspendus, partis) en gardant les choix de l'utilisateur
export function repairLineup(st, cid) {
  const c = st.clubs[cid], t = c.tactics, form = FORMATION_POS[t.formation] || FORMATION_POS['4-3-3'];
  if (!t.lineup || t.lineup.length !== 11) return autoLineup(st, cid);
  const mine = p => p && (p.loan ? p.loan.to === cid : p.clubId === cid);
  const used = new Set(t.lineup.filter(id => mine(st.players[id]) && available(st.players[id])));
  const pool = squad(st, cid).filter(p => available(p) && !used.has(p.id));
  let changed = [];
  t.lineup = t.lineup.map((id, i) => {
    const p = st.players[id];
    if (mine(p) && available(p)) return id;
    const benchFirst = pool.filter(q => !used.has(q.id)).sort((a, b) => (t.bench.includes(b.id) - t.bench.includes(a.id)) || ovrOf(b, form[i]) * posFit(b, form[i]) - ovrOf(a, form[i]) * posFit(a, form[i]));
    const rep = benchFirst.sort((a, b) => ovrOf(b, form[i]) * posFit(b, form[i]) - ovrOf(a, form[i]) * posFit(a, form[i]))[0];
    if (!rep) return id;
    used.add(rep.id); changed.push([p ? p.name : '?', rep.name]); return rep.id;
  });
  t.bench = t.bench.filter(id => !used.has(id) && mine(st.players[id]) && available(st.players[id]));
  for (const p of squad(st, cid).filter(p => available(p) && !used.has(p.id) && !t.bench.includes(p.id)).sort((a, b) => b.ovr - a.ovr)) { if (t.bench.length >= 9) break; t.bench.push(p.id); }
  return changed;
}
export function validLineup(st, cid) {
  const t = st.clubs[cid].tactics;
  if (!t.lineup || t.lineup.length !== 11) return false;
  return t.lineup.every(id => st.players[id] && available(st.players[id]) && (st.players[id].loan ? st.players[id].loan.to === cid : st.players[id].clubId === cid));
}
export function teamStrength(st, cid, forMatch = true) {
  const c = st.clubs[cid];
  if (!c) { const caf = CAF_CLUBS.find(x => x.id === cid); return caf ? 42 + caf.rep * 0.33 : 55; }
  if (cid !== st.userClub) { if (!validLineup(st, cid)) autoLineup(st, cid); } else if (!validLineup(st, cid)) repairLineup(st, cid);
  const t = c.tactics, form = FORMATION_POS[t.formation];
  let s = 0, n = 0;
  t.lineup.forEach((id, i) => { const p = st.players[id]; if (!p) return; s += ovrOf(p, form[i]) * posFit(p, form[i]) * (0.82 + 0.18 * p.fitness) * (0.93 + p.morale / 1000); n++; });
  let str = n ? s / 11 : 40;
  if (cid === st.userClub) {
    const head = staffOf(st, 'head')[0];
    str += head ? (head.ability - 50) / 25 : -2;
    str += (c.cohesion - 60) / 40;
    str += (c.infra.pitch - 3) * 0.3;
    if (forMatch) str += [1.5, 0, -1, -2][st.difficulty] || 0;
  }
  return str;
}
export function staffOf(st, role) { return Object.values(st.staff).filter(s => s.role === role); }
const staffAb = (st, role, def = 40) => { const l = staffOf(st, role); return l.length ? l.reduce((a, s) => a + s.ability, 0) / l.length : def; };

// ------------------------------------------------------------------ calendrier
function roundRobin(ids, r) {
  const n = ids.length, arr = ids.slice(); if (n % 2) arr.push(null);
  for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; }
  const rounds = [], m = arr.length;
  for (let k = 0; k < m - 1; k++) {
    const rd = [];
    for (let i = 0; i < m / 2; i++) { const a = arr[i], b = arr[m - 1 - i]; if (a && b) rd.push(k % 2 ? [b, a] : [a, b]); }
    rounds.push(rd); arr.splice(1, 0, arr.pop());
  }
  return rounds.concat(rounds.map(rd => rd.map(([a, b]) => [b, a])));
}
export function setupSeason(st) {
  const r = R(st);
  st.slots = []; st.fixtures = []; st.slot = 0; st.comps = {};
  const l1 = Object.values(st.clubs).filter(c => c.div === 1).map(c => c.id);
  const l2 = Object.values(st.clubs).filter(c => c.div === 2).map(c => c.id);
  const rr1 = roundRobin(l1, r), rr2 = roundRobin(l2, r);
  st.comps.L1 = { id: 'L1', name: 'Ligue 1', teams: l1, rounds: rr1.length };
  st.comps.L2 = { id: 'L2', name: 'Ligue 2 (simulation simplifiée)', teams: l2, rounds: rr2.length };
  st.comps.CUP = { id: 'CUP', name: 'Coupe de Tunisie', teams: l1.concat(l2), round: 0, roundsNames: ['32es', '16es', '8es', 'Quarts', 'Demies', 'Finale'], alive: l1.concat(l2) };
  // CAF : 16 équipes, 4 groupes de 4, puis quarts/demies/finale aller-retour (format simplifié configurable)
  const cafPool = CAF_CLUBS.slice().sort((a, b) => b.rep - a.rep);
  const clT = st.caf.cl.filter(id => st.clubs[id]).concat(cafPool.slice(0, 16 - st.caf.cl.length).map(c => c.id));
  const ccT = st.caf.cc.filter(id => st.clubs[id]).concat(cafPool.slice(16 - st.caf.cl.length, 16 - st.caf.cl.length + 16 - st.caf.cc.length).map(c => c.id));
  // Tirage CAF : chapeaux selon le niveau, pas deux clubs du même pays dans un groupe.
  const cafInfo = id => st.clubs[id] ? { id, rep: st.clubs[id].rep, country: 'TUN' } : { id, rep: CAF_CLUBS.find(c => c.id === id)?.rep ?? 50, country: CAF_CLUBS.find(c => c.id === id)?.country ?? '?' };
  const mkGroups = teams => K.drawGroups(teams.map(cafInfo), r).groups.map(g => g.map(t => t.id));
  st.comps.CL = { id: 'CL', name: 'Ligue des Champions CAF', groups: mkGroups(clT), ko: [], stage: 'groups', note: 'Format simplifié : tours préliminaires non modélisés' };
  st.comps.CC = { id: 'CC', name: 'Coupe de la Confédération CAF', groups: mkGroups(ccT), ko: [], stage: 'groups', note: 'Format simplifié : tours préliminaires non modélisés' };
  for (const comp of ['CL', 'CC']) {
    const C = st.comps[comp], gi = C.groups.findIndex(g => g.includes(st.userClub));
    if (gi >= 0) st.cafDrawNews = `🎲 Tirage ${C.name} : groupe ${'ABCD'[gi]} avec ${C.groups[gi].filter(id => id !== st.userClub).map(id => { const c = cafInfo(id); return `${clubName(st, id)} ${K.COUNTRIES[c.country]?.flag || ''}`; }).join(', ')}.`;
  }
  // créneaux
  const push = (type, data = {}) => st.slots.push({ type, ...data });
  push('SUP');
  const cafAfter = { 3: 1, 5: 2, 7: 3, 9: 4, 11: 5, 13: 6, 18: 'QF1', 19: 'QF2', 22: 'SF1', 23: 'SF2', 26: 'F1', 27: 'F2' };
  const cupAfter = { 8: 0, 15: 1, 17: 2, 21: 3, 25: 4, 30: 5 };
  for (let k = 1; k <= 30; k++) {
    push('LEAGUE', { round: k });
    if (cafAfter[k] != null) push('CAF', { md: cafAfter[k] });
    if (cupAfter[k] != null) push('CUP', { round: cupAfter[k] });
  }
  push('END');
  // fixtures de championnat
  rr1.forEach((rd, i) => rd.forEach(([h, a]) => st.fixtures.push(fx('L1', i + 1, h, a))));
  rr2.forEach((rd, i) => rd.forEach(([h, a]) => st.fixtures.push(fx('L2', i + 1, h, a))));
  // groupes CAF : 6 journées
  for (const cid of ['CL', 'CC']) st.comps[cid].groups.forEach((g, gi) => {
    const rr = roundRobin(g, r);
    rr.forEach((rd, i) => rd.forEach(([h, a]) => st.fixtures.push(fx(cid, i + 1, h, a, { group: gi }))));
  });
  // supercoupe
  const sh = st.champion, sa = st.cupHolder !== st.champion ? st.cupHolder : l1.filter(x => x !== st.champion).sort((a, b) => st.clubs[b].rep - st.clubs[a].rep)[0];
  if (st.clubs[sh] && st.clubs[sa]) st.fixtures.push(fx('SUP', 1, sh, sa, { neutral: true, ko: true }));
  saveR(st, r);
  // début de saison : abonnements et sponsors
  const uc = st.clubs[st.userClub];
  const abon = Math.round(uc.capacity * (0.6 + uc.infra.stadium * 0.1) * uc.fans.base * 0.25 * (8 + uc.rep / 10) * [0.8, 1, 1.25][st.ticketPrice] * 4);
  ledger(st, abon, 'billetterie', 'Abonnements de la saison');
  st.sponsorOffers = sponsorOffers(st);
  st.window = 'été';
}
function fx(comp, round, h, a, extra = {}) { return { id: uid('f'), comp, round, h, a, played: false, hg: null, ag: null, ...extra }; }
export function sponsorOffers(st) {
  const c = st.clubs[st.userClub], base = 25000 + c.rep * c.rep * 18;
  const fin = staffAb(st, 'findir') / 100;
  return [
    { id: 'stable', name: 'Jasmin Telecom (offre stable)', monthly: Math.round(base * (1 + fin * 0.2)), bonus: 0 },
    { id: 'perf', name: 'Carthage Bank (offre à la performance)', monthly: Math.round(base * 0.7 * (1 + fin * 0.2)), bonus: Math.round(base * 0.25) },
    { id: 'long', name: 'Sahara Énergie (3 saisons)', monthly: Math.round(base * 0.9 * (1 + fin * 0.2)), bonus: 0, years: 3 },
  ];
}
export function chooseSponsor(st, id) {
  const o = (st.sponsorOffers || []).find(x => x.id === id); if (!o) return 'Offre introuvable';
  st.sponsor = { ...o, until: st.season + (o.years || 1) - 1 }; st.sponsorOffers = null;
  addNews(st, `Contrat signé avec ${o.name}.`, 'finance');
  return null;
}
export function slotLabel(st, i = st.slot) {
  const s = st.slots[i]; if (!s) return '';
  const d = new Date(Date.UTC(st.season, 7, 22 + i * 6));
  const date = d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', timeZone: 'UTC' });
  if (s.type === 'SUP') return `${date} — Supercoupe`;
  if (s.type === 'LEAGUE') return `${date} — Ligue 1, J${s.round}`;
  if (s.type === 'CAF') return `${date} — CAF ${typeof s.md === 'number' ? 'groupes J' + s.md : { QF1: 'quarts aller', QF2: 'quarts retour', SF1: 'demies aller', SF2: 'demies retour', F1: 'finale aller', F2: 'finale retour' }[s.md]}`;
  if (s.type === 'CUP') return `${date} — Coupe de Tunisie, ${st.comps.CUP.roundsNames[s.round]}`;
  return `${date} — Fin de saison`;
}
export function slotFixtures(st, i = st.slot) {
  const s = st.slots[i]; if (!s) return [];
  if (s.type === 'SUP') return st.fixtures.filter(f => f.comp === 'SUP');
  if (s.type === 'LEAGUE') return st.fixtures.filter(f => (f.comp === 'L1' || f.comp === 'L2') && f.round === s.round);
  if (s.type === 'CAF') {
    if (typeof s.md === 'number') return st.fixtures.filter(f => (f.comp === 'CL' || f.comp === 'CC') && f.round === s.md && f.group != null);
    ensureCafKO(st, s.md);
    return st.fixtures.filter(f => (f.comp === 'CL' || f.comp === 'CC') && f.koStage === s.md);
  }
  if (s.type === 'CUP') { ensureCupRound(st, s.round); return st.fixtures.filter(f => f.comp === 'CUP' && f.round === s.round); }
  return [];
}
export function userFixture(st, i = st.slot) { return slotFixtures(st, i).find(f => !f.played && (f.h === st.userClub || f.a === st.userClub)); }

function ensureCupRound(st, round) {
  const C = st.comps.CUP;
  if (st.fixtures.some(f => f.comp === 'CUP' && f.round === round)) return;
  const r = R(st);
  let alive = C.alive.slice();
  if (round > 0) { // vainqueurs du tour précédent
    alive = st.fixtures.filter(f => f.comp === 'CUP' && f.round === round - 1 && f.played).map(f => f.winner);
  }
  // tour 0 : 32 places → exemptions pour les têtes de série si moins de 32 équipes
  let byes = [];
  if (round === 0) {
    const size = 32; const sorted = alive.slice().sort((a, b) => st.clubs[b].rep - st.clubs[a].rep);
    const nByes = Math.max(0, size - alive.length);
    byes = sorted.slice(0, nByes);
    alive = alive.filter(x => !byes.includes(x));
  }
  const sh = alive.slice().sort(() => r() - 0.5);
  for (let i = 0; i + 1 < sh.length; i += 2) st.fixtures.push(fx('CUP', round, sh[i], sh[i + 1], { ko: true }));
  for (const b of byes) st.fixtures.push({ ...fx('CUP', round, b, null, { ko: true }), played: true, bye: true, winner: b, hg: 0, ag: 0 });
  if (sh.length % 2) { const b = sh[sh.length - 1]; st.fixtures.push({ ...fx('CUP', round, b, null, { ko: true }), played: true, bye: true, winner: b, hg: 0, ag: 0 }); }
  C.round = round;
  saveR(st, r);
  const mine = st.fixtures.find(f => f.comp === 'CUP' && f.round === round && (f.h === st.userClub || f.a === st.userClub));
  if (mine && !mine.bye) addNews(st, `Tirage de la Coupe (${C.roundsNames[round]}) : ${clubName(st, mine.h)} – ${clubName(st, mine.a)}.`, 'comp');
  if (mine && mine.bye) addNews(st, `Coupe de Tunisie : ${clubName(st, st.userClub)} est exempté de ce tour.`, 'comp');
}
export function groupTable(st, comp, gi) {
  const g = st.comps[comp].groups[gi];
  return table(st, st.fixtures.filter(f => f.comp === comp && f.group === gi), g);
}
function ensureCafKO(st, stage) {
  for (const comp of ['CL', 'CC']) {
    const C = st.comps[comp];
    if (st.fixtures.some(f => f.comp === comp && f.koStage === stage)) continue;
    const r = R(st);
    if (stage === 'QF1') {
      const q = [], winners = [], runners = [];
      const info = (id, gi) => ({ id, group: gi, country: st.clubs[id] ? 'TUN' : CAF_CLUBS.find(c => c.id === id)?.country ?? '?' });
      C.groups.forEach((g, gi) => { const t = groupTable(st, comp, gi); q.push(t[0].id, t[1].id); winners.push(info(t[0].id, gi)); runners.push(info(t[1].id, gi)); });
      C.stage = 'QF';
      // Tirage : premier contre deuxième d'un autre groupe ; aller chez le deuxième, retour chez le premier.
      const pairs = K.drawQuarters(winners, runners, r).map(p => [p.winner.id, p.runner.id]);
      C.ko = pairs.map(p => ({ stage: 'QF', a: p[1], b: p[0] }));
      pairs.forEach(([a, b]) => st.fixtures.push(fx(comp, 0, b, a, { koStage: 'QF1', tie: a + '|' + b })));
      const mine = pairs.find(p => p.includes(st.userClub));
      if (mine) addNews(st, `🎲 Tirage des quarts (${C.name}) : ${clubName(st, mine[0] === st.userClub ? mine[1] : mine[0])}.`, 'comp');
      if (q.includes(st.userClub)) addNews(st, `${C.name} : qualifié pour les quarts de finale !`, 'comp');
    } else if (stage === 'QF2' || stage === 'SF2' || stage === 'F2') {
      const first = stage.replace('2', '1');
      st.fixtures.filter(f => f.comp === comp && f.koStage === first).forEach(f => st.fixtures.push(fx(comp, 0, f.a, f.h, { koStage: stage, tie: f.tie, leg1: f.id })));
    } else if (stage === 'SF1' || stage === 'F1') {
      const prev = stage === 'SF1' ? 'QF2' : 'SF2';
      const winners = st.fixtures.filter(f => f.comp === comp && f.koStage === prev && f.played).map(f => f.winner);
      C.stage = stage === 'SF1' ? 'SF' : 'F';
      // Demi-finales : tirage intégral ; finale : les deux qualifiés.
      const country = id => st.clubs[id] ? 'TUN' : CAF_CLUBS.find(c => c.id === id)?.country ?? '?';
      const pairs = stage === 'SF1' ? K.drawOpen(winners.map(id => ({ id, country: country(id) })), r).map(([a, b]) => [a.id, b.id]) : [[winners[0], winners[1]]].filter(p => p[0] && p[1]);
      for (const [a, b] of pairs) {
        st.fixtures.push(fx(comp, 0, a, b, { koStage: stage, tie: a + '|' + b }));
        if (a === st.userClub || b === st.userClub) addNews(st, `🎲 ${stage === 'SF1' ? 'Tirage des demi-finales' : 'Finale'} (${C.name}) : ${clubName(st, a === st.userClub ? b : a)}.`, 'comp');
      }
    }
    saveR(st, r);
  }
}
export function clubName(st, id) { if (!id) return '—'; return st.clubs[id]?.name || CAF_CLUBS.find(c => c.id === id)?.name || id; }
export function clubShort(st, id) { return st.clubs[id]?.short || CAF_CLUBS.find(c => c.id === id)?.short || '?'; }
export function clubObj(st, id) { return st.clubs[id] || CAF_CLUBS.find(c => c.id === id); }

// ------------------------------------------------------------------ classements
export function table(st, fixtures, teams) {
  const rows = Object.fromEntries(teams.map(id => [id, { id, name: clubName(st, id), p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] }]));
  for (const f of fixtures) {
    if (!f.played || f.bye) continue;
    const H = rows[f.h], A2 = rows[f.a]; if (!H || !A2) continue;
    H.p++; A2.p++; H.gf += f.hg; H.ga += f.ag; A2.gf += f.ag; A2.ga += f.hg;
    if (f.hg > f.ag) { H.w++; A2.l++; H.pts += RULES.pointsWin; H.form.push('V'); A2.form.push('D'); }
    else if (f.hg < f.ag) { A2.w++; H.l++; A2.pts += RULES.pointsWin; H.form.push('D'); A2.form.push('V'); }
    else { H.d++; A2.d++; H.pts += RULES.pointsDraw; A2.pts += RULES.pointsDraw; H.form.push('N'); A2.form.push('N'); }
  }
  return Object.values(rows).sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf || a.name.localeCompare(b.name));
}
export function leagueTable(st, comp = 'L1') { return table(st, st.fixtures.filter(f => f.comp === comp), st.comps[comp].teams); }
export function topScorers(st, n = 15) {
  return Object.values(st.players).filter(p => p.stats.goals > 0 && p.clubId && st.clubs[p.clubId]?.div === 1).sort((a, b) => b.stats.goals - a.stats.goals || b.stats.assists - a.stats.assists).slice(0, n);
}

// ------------------------------------------------------------------ résultats
function cafSquad(st, id) {
  if (st.cafSquads[id]) return st.cafSquads[id];
  const c = CAF_CLUBS.find(x => x.id === id), r = rng((st.seed ^ id.split('').reduce((a, ch) => a * 31 + ch.charCodeAt(0), 7)) >>> 0);
  const target = 44 + c.rep * 0.33;
  const list = SQUAD_TEMPLATE.slice(0, 20).map((pos, i) => { const p = genPlayer(r, pos, target, null, st.season); p.num = i + 1; p.cafClub = id; return p; });
  st.cafSquads[id] = list;
  return list;
}
// --- Maillots : domicile / extérieur / troisième selon le conflit de couleurs ---
const THIRD_KITS = [
  { pattern: 'plain', shirt: '#1b2a4a', alt: '#ffffff', trim: '#ffffff', shorts: '#1b2a4a', socks: '#1b2a4a', third: true },
  { pattern: 'plain', shirt: '#6a2c91', alt: '#ffffff', trim: '#ffffff', shorts: '#6a2c91', socks: '#6a2c91', third: true },
  { pattern: 'plain', shirt: '#f07c1a', alt: '#111111', trim: '#111111', shorts: '#111111', socks: '#f07c1a', third: true },
];
export function clubKit(id, mode = false) {
  if (mode === 'third' || typeof mode === 'number') return { ...THIRD_KITS[Number(mode) || 0] };
  const d = mode ? KIT_DESIGNS_AWAY[id] : KIT_DESIGNS[id];
  return d ? { ...d } : null;
}
const hexRgb = h => { const m = /^#?([0-9a-f]{6})$/i.exec(String(h || '')); const n = m ? parseInt(m[1], 16) : 0x808080; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const kitMains = k => [k.shirt].concat(k.pattern && k.pattern !== 'plain' && k.pattern !== 'chestBand' && k.pattern !== 'sash' ? [k.alt] : []).map(hexRgb);
export function kitsClash(a, b) {
  if (!a || !b) return false;
  for (const x of kitMains(a)) for (const y of kitMains(b)) { const d = Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]); if (d < 120) return true; }
  return false;
}
// Mode de maillot du visiteur : false (domicile) si pas de conflit, sinon true (extérieur), sinon 0/1/2 (troisième).
export function awayKitMode(homeId, awayId) {
  if (!KIT_DESIGNS[awayId]) return true;
  const h = clubKit(homeId, false) || { shirt: (CLUBS.find(c => c.id === homeId) || CAF_CLUBS.find(c => c.id === homeId))?.colors?.[0] };
  for (const mode of [false, true, 0, 1, 2]) { const k = clubKit(awayId, mode); if (k && !kitsClash(h, k)) return mode; }
  return true;
}
export function matchTeam(st, id, kitAway = false) {
  const c = st.clubs[id];
  if (c) {
    if (id !== st.userClub) { if (!validLineup(st, id)) autoLineup(st, id); } else if (!validLineup(st, id)) repairLineup(st, id);
    const t = c.tactics; const form = FORMATION_POS[t.formation];
    // Le moral pèse légèrement sur le rendement réel en match (−3 % à +2 %).
    const withMorale = p => { const k = Dr.moraleFactor(p.morale ?? 70); const a = {}; for (const [key, v] of Object.entries(p.attrs)) a[key] = typeof v === 'number' ? Math.round(v * k) : v; return a; };
    const mk = p => ({ id: p.id, name: p.name, num: p.num, pos: p.pos, attrs: withMorale(p), fitness: p.fitness, instr: t.instr?.[p.id] || '' });
    const kit = clubKit(id, kitAway), kitCols = kitAway === true ? c.away : c.colors;
    return { id, name: c.name, short: c.short, colors: kit ? [kit.shirt, kit.trim] : kitCols, kit: kit || { shirt: kitCols[0], trim: kitCols[1], shorts: kitAway ? kitCols[0] : '#f2f2f2' }, formation: t.formation, mentality: t.mentality, pressing: t.pressing, width: t.width, line: t.line, takers: t.takers || {}, stadium: c.stadium, players: t.lineup.map(i => mk(st.players[i])), bench: t.bench.map(i => st.players[i]).filter(Boolean).map(mk), formPos: form };
  }
  const caf = CAF_CLUBS.find(x => x.id === id), sq = cafSquad(st, id);
  const cols = kitAway ? [caf.colors[1], caf.colors[0]] : caf.colors;
  const order = FORMATION_POS['4-3-3'], used = new Set(), xi = [];
  for (const pos of order) { const p = sq.filter(q => !used.has(q.id)).sort((a, b) => ovrOf(b, pos) * posFit(b, pos) - ovrOf(a, pos) * posFit(a, pos))[0]; used.add(p.id); xi.push(p); }
  const mk = p => ({ id: p.id, name: p.name, num: p.num, pos: p.pos, attrs: p.attrs, fitness: 1 });
  return { id, name: caf.name, short: caf.short, colors: cols, kit: { shirt: cols[0], trim: cols[1], shorts: cols[1] }, formation: '4-3-3', mentality: 0, pressing: 1, stadium: caf.name, players: xi.map(mk), bench: sq.filter(p => !used.has(p.id)).slice(0, 7).map(mk) };
}

// applique un résultat (joué ou simulé) à une rencontre
export function applyResult(st, f, res) {
  const r = R(st);
  f.hg = res.hg; f.ag = res.ag; f.played = true;
  if (res.stats) f.stats = res.stats;
  if (res.events) f.events = res.events.filter(e => e.type === 'goal' || e.type === 'red' || e.type === 'yellow' || e.type === 'injury').slice(0, 30);
  // tirs au but si nécessaire
  if (f.ko && f.hg === f.ag) {
    const ph = 3 + Math.floor(r() * 3), pa = ph + (r() < 0.5 ? 1 : -1);
    f.pens = res.pens || [Math.max(ph, pa) === ph ? ph : ph, pa];
    if (f.pens[0] === f.pens[1]) f.pens[1]--;
  }
  if (f.ko) f.winner = f.hg > f.ag ? f.h : f.hg < f.ag ? f.a : (f.pens[0] > f.pens[1] ? f.h : f.a);
  if (f.koStage && /2$/.test(f.koStage)) { // match retour : cumul
    const l1 = st.fixtures.find(x => x.id === f.leg1);
    const aggA = f.ag + (l1 ? l1.hg : 0), aggH = f.hg + (l1 ? l1.ag : 0); // f.h = équipe extérieure à l'aller
    f.agg = [aggH, aggA];
    if (aggH !== aggA) f.winner = aggH > aggA ? f.h : f.a;
    else { const pH = 3 + Math.floor(r() * 3), pA = pH + (r() < 0.5 ? 1 : -1); f.pens = res.pens || [pH, pA === pH ? pH - 1 : pA]; f.winner = f.pens[0] > f.pens[1] ? f.h : f.a; }
  }
  // statistiques joueurs
  for (const side of ['h', 'a']) {
    const cid = f[side]; const goals = side === 'h' ? f.hg : f.ag;
    if (!st.clubs[cid]) continue;
    const c = st.clubs[cid];
    if (res.players) continue; // traité par applyPlayedStats
    const xi = (c.tactics.lineup.length === 11 ? c.tactics.lineup : []).map(id => st.players[id]).filter(Boolean);
    for (const p of xi) { p.stats.apps++; p.stats.rsum += 6 + r() * 1.6 + (goals > (side === 'h' ? f.ag : f.hg) ? 0.4 : 0); p.fitness = clamp(p.fitness - 0.12 + p.attrs.phy / 1500, 0.55, 1); }
    for (let g = 0; g < goals; g++) {
      const w = xi.map(p => (POS_GROUP[p.pos] === 'A' ? 5 : POS_GROUP[p.pos] === 'M' ? 2 : p.pos === 'GK' ? 0 : 0.6) * p.attrs.sho);
      const sc = pickW(xi, w, r); if (sc) { sc.stats.goals++; sc.stats.rsum += 1; }
      const as = pickW(xi.filter(x => x !== sc), xi.filter(x => x !== sc).map(p => p.attrs.pas * (p.pos === 'GK' ? 0.1 : 1)), r); if (as && r() < 0.75) as.stats.assists++;
    }
    const conceded = side === 'h' ? f.ag : f.hg;
    if (conceded === 0 && xi[0]) xi[0].stats.cs++;
    // cartons & blessures
    const nY = Math.floor(r() * 3.2);
    for (let i = 0; i < nY; i++) { const p = xi[Math.floor(r() * xi.length)]; if (p) { p.yellows++; if (p.yellows % RULES.yellowSuspension === 0) { p.suspended = 1; if (cid === st.userClub) addNews(st, `${p.name} est suspendu pour le prochain match (cumul de cartons).`, 'medical'); } } }
    if (r() < 0.03) { const p = xi[Math.floor(r() * xi.length)]; if (p) { p.suspended = 1 + Math.floor(r() * 2); if (cid === st.userClub) addNews(st, `Carton rouge pour ${p.name} : ${p.suspended} match(s) de suspension.`, 'medical'); } }
    const injP = injuryRisk(st, cid);
    if (r() < injP) { const p = xi[Math.floor(r() * xi.length)]; if (p) injure(st, p, r); }
  }
  saveR(st, r);
}
function pickW(arr, w, r) { const tot = w.reduce((a, b) => a + b, 0); if (!tot) return null; let x = r() * tot; for (let i = 0; i < arr.length; i++) { x -= w[i]; if (x <= 0) return arr[i]; } return arr[arr.length - 1]; }
export function injuryRisk(st, cid) {
  let p = 0.13;
  if (cid === st.userClub) {
    const c = st.clubs[cid];
    p *= [0.8, 1, 1.35][st.training.intensity];
    p *= 1.15 - staffAb(st, 'fitness', 35) / 250 - c.infra.medical * 0.03 - c.infra.pitch * 0.02;
  }
  return clamp(p, 0.03, 0.3);
}
export function injure(st, p, r) {
  const inj = pickW(INJURIES, INJURIES.map(i => i.sev === 'grave' ? 0.6 : i.sev === 'modérée' ? 3 : 4), r);
  let weeks = r.int(inj.w[0], inj.w[1]);
  const isUser = (p.loan ? p.loan.to : p.clubId) === st.userClub;
  if (isUser) {
    const doc = staffAb(st, 'doctor', 35), phys = staffAb(st, 'physio', 35), med = st.clubs[st.userClub].infra.medical;
    weeks = Math.max(1, Math.round(weeks * (1.25 - doc / 250 - phys / 400 - med * 0.04) + r.int(-1, 1)));
  }
  p.injury = { name: inj.n, sev: inj.sev, total: weeks, left: weeks, relapse: inj.rel, diagnosed: !isUser || staffAb(st, 'doctor', 30) > 25, treatment: 'standard', phase: 'soins' };
  if (isUser) addNews(st, `Blessure : ${p.name} — ${inj.n} (${inj.sev}), indisponibilité estimée ${weeks} semaine(s).`, 'medical');
}
// statistiques détaillées depuis le moteur de match
export function applyPlayedStats(st, f, res, userIsHome) {
  for (const pr of res.players) {
    const p = st.players[pr.id]; if (!p) continue;
    if (pr.minutes > 0) { p.stats.apps++; p.stats.rsum += pr.rating; }
    p.stats.goals += pr.goals; p.stats.assists += pr.assists;
    p.fitness = clamp(p.fitness - 0.1 * (pr.minutes / 90) + 0.02, 0.5, 1);
    if (pr.yellow) { p.yellows += pr.yellow; if (p.yellows % RULES.yellowSuspension === 0) p.suspended = 1; }
    if (pr.red) p.suspended = 1 + (pr.yellow >= 2 ? 0 : 1);
    if (pr.injured) injure(st, p, R(st));
  }
  const userGoalsAgainst = userIsHome ? res.ag : res.hg;
  const uc = st.clubs[st.userClub];
  const gk = st.players[uc.tactics.lineup[0]]; if (gk && userGoalsAgainst === 0) gk.stats.cs++;
}

// ------------------------------------------------------------------ avancement
// Simule tous les matchs non joués du créneau, puis applique les effets hebdomadaires.
export function advance(st, userResult = null) {
  if (st.gameOver) return { error: 'Carrière terminée' };
  const s = st.slots[st.slot];
  if (!s) return { error: 'Saison terminée' };
  if (s.type === 'END') return endSeason(st);
  const fixtures = slotFixtures(st);
  const playing = new Set(fixtures.filter(f => !f.played).flatMap(f => [f.h, f.a]));
  const preSusp = Object.values(st.players).filter(p => p.suspended > 0 && playing.has(p.loan ? p.loan.to : p.clubId));
  const r = R(st);
  const report = { results: [], user: null };
  for (const f of fixtures) {
    if (f.played) continue;
    const isUser = f.h === st.userClub || f.a === st.userClub;
    let res;
    if (isUser && userResult) { res = userResult; }
    else {
      const sh = teamStrength(st, f.h), sa = teamStrength(st, f.a);
      const [hg, ag] = quickSim(sh, sa, r, f.neutral ? 1 : 1.08);
      res = { hg, ag };
    }
    applyResult(st, f, res);
    if (isUser && userResult && userResult.players) applyPlayedStats(st, f, userResult, f.h === st.userClub);
    if (isUser) { report.user = f; afterUserMatch(st, f, r, userResult); }
    report.results.push(f);
  }
  for (const p of preSusp) p.suspended = Math.max(0, p.suspended - 1);
  saveR(st, r);
  weekly(st);
  // fin des groupes CAF : élimination ?
  if (s.type === 'CAF' && s.md === 6) for (const comp of ['CL', 'CC']) {
    const C = st.comps[comp]; const gi = C.groups.findIndex(g => g.includes(st.userClub));
    if (gi >= 0) { const t = groupTable(st, comp, gi), pos = t.findIndex(x => x.id === st.userClub);
      if (pos >= 2) addNews(st, `${C.name} : éliminé en phase de groupes (${pos + 1}e).`, 'comp');
      else { ledger(st, comp === 'CL' ? PRIZE.clGroup : PRIZE.ccGroup, 'primes', `Prime ${C.name} (phase de groupes)`); } }
  }
  if (s.type === 'CAF' && /2$/.test(String(s.md))) for (const f of fixtures) if ((f.h === st.userClub || f.a === st.userClub)) {
    const comp = st.comps[f.comp]; const won = f.winner === st.userClub;
    const key = { QF2: 'QF', SF2: 'SF', F2: 'Win' }[s.md];
    if (won) { ledger(st, PRIZE[(f.comp === 'CL' ? 'cl' : 'cc') + key], 'primes', `Prime ${comp.name} (${key === 'Win' ? 'vainqueur' : key})`); if (key === 'Win') { st.clubs[st.userClub].titles[f.comp.toLowerCase()]++; st.trophies.push({ season: st.season, name: comp.name }); addNews(st, `🏆 ${clubName(st, st.userClub)} remporte la ${comp.name} !`, 'trophy'); } }
    else addNews(st, `${comp.name} : élimination (${key === 'Win' ? 'finale perdue' : key}).`, 'comp');
  }
  if (s.type === 'CUP') {
    const mf = fixtures.find(f => f.h === st.userClub || f.a === st.userClub);
    if (mf && !mf.bye) { if (mf.winner === st.userClub) { ledger(st, PRIZE.cupRound, 'primes', 'Prime de qualification en Coupe'); if (s.round === 5) { ledger(st, PRIZE.cupWin, 'primes', 'Victoire en Coupe de Tunisie'); st.clubs[st.userClub].titles.cup++; st.trophies.push({ season: st.season, name: 'Coupe de Tunisie' }); addNews(st, `🏆 ${clubName(st, st.userClub)} remporte la Coupe de Tunisie !`, 'trophy'); } } else addNews(st, 'Coupe de Tunisie : élimination.', 'comp'); }
    if (s.round === 5) { const fin = fixtures.find(f => !f.bye); if (fin) st.newCupHolder = fin.winner; }
  }
  if (s.type === 'SUP') { const f = fixtures[0]; if (f && f.winner === st.userClub) { ledger(st, PRIZE.sup, 'primes', 'Supercoupe remportée'); st.trophies.push({ season: st.season, name: 'Supercoupe de Tunisie' }); addNews(st, '🏆 Supercoupe remportée !', 'trophy'); } }
  st.slot++;
  st.updatedAt = Date.now();
  return report;
}
function afterUserMatch(st, f, r, userResult = null) {
  const uc = st.clubs[st.userClub], home = f.h === st.userClub;
  // Temps de jeu de chaque joueur (titulaire, entré en jeu, non utilisé) pour le vestiaire.
  {
    const lineup = uc.tactics.lineup || [];
    const played = userResult?.players ? userResult.players.filter(pr => pr.minutes > 0).map(pr => pr.id) : lineup;
    const starters = played.filter(id => lineup.includes(id));
    // Match simulé : les trois premiers remplaçants entrent habituellement en jeu.
    const subs = userResult?.players ? played.filter(id => !lineup.includes(id)) : (uc.tactics.bench || []).slice(0, 3);
    Dr.recordPlayingTime(squad(st, st.userClub), starters.length ? starters : lineup, subs);
    st.meetingCd = Math.max(0, (st.meetingCd || 0) - 1);
  }
  const gf = home ? f.hg : f.ag, ga = home ? f.ag : f.hg;
  const won = f.winner ? f.winner === st.userClub : gf > ga, lost = f.winner ? f.winner !== st.userClub : gf < ga;
  const opp = home ? f.a : f.h, oppRep = clubObj(st, opp)?.rep || 60;
  const derby = isDerby(st.userClub, opp);
  const mult = derby ? 2 : 1;
  const ds = won ? 3 + Math.max(0, (oppRep - uc.rep) / 10) : lost ? -3 - Math.max(0, (uc.rep - oppRep) / 10) : (oppRep > uc.rep ? 1 : -1);
  uc.fans.sat = clamp(uc.fans.sat + ds * mult, 0, 100);
  st.president.trust = clamp(st.president.trust + ds * 0.5 * mult, 0, 100);
  uc.morale = clamp(uc.morale + (won ? 5 : lost ? -5 : 0), 10, 100);
  for (const p of squad(st, st.userClub)) p.morale = clamp(p.morale + (won ? 3 : lost ? -3 : 0) + (uc.tactics.lineup.includes(p.id) ? 1 : -0.5), 5, 100);
  // primes de match
  if (won) { const bonus = squad(st, st.userClub).length * 250 * [0.5, 1, 1.6][st.winBonus]; ledger(st, -bonus, 'salaires', 'Primes de victoire'); }
  if (home && !f.neutral) {
    const cap = uc.capacity * (0.6 + uc.infra.stadium * 0.1);
    const fill = clamp(0.8 * uc.fans.base * (0.6 + uc.fans.sat / 100) * (0.75 + oppRep / 200) * (derby ? 1.5 : 1) * [1.15, 1, 0.8][st.ticketPrice] * (f.comp === 'CL' || f.comp === 'CC' ? 1.3 : 1), 0.08, 1);
    const att = Math.round(cap * fill);
    const price = (6 + uc.rep / 8) * [0.7, 1, 1.4][st.ticketPrice] * (f.comp === 'CL' ? 1.6 : 1);
    f.attendance = att;
    ledger(st, Math.round(att * price * 0.45), 'billetterie', `Billetterie vs ${clubShort(st, opp)} (${att.toLocaleString('fr-FR')} spectateurs)`);
    ledger(st, Math.round(att * (0.6 + uc.fans.sat / 120)), 'produits dérivés', 'Ventes en tribunes');
    if (uc.infra.lights >= 3) ledger(st, 15000 * uc.infra.lights, 'droits TV', 'Match en nocturne diffusé');
  } else {
    if ((f.comp === 'CL' || f.comp === 'CC') && !st.clubs[opp]) {
      // Déplacement continental : coût et fatigue selon la distance depuis Tunis.
      const trip = K.travelInfo(clubObj(st, opp)?.country);
      ledger(st, -trip.cost, 'déplacements', `Déplacement ${trip.toCity} (${clubShort(st, opp)}, ~${trip.km.toLocaleString('fr-FR')} km)`);
      for (const p of squad(st, st.userClub)) if (uc.tactics.lineup.includes(p.id) || uc.tactics.bench.includes(p.id)) { p.fitness = clamp(p.fitness - trip.fatigue, 0.4, 1); p.travelLag = (p.travelLag || 0) + trip.fatigue * 1.6; }
      if (trip.km >= 4000) addNews(st, `✈️ Retour ${trip.fromCity} : ~${trip.hours} h de vol, le groupe accuse la fatigue du voyage.`, 'club');
    } else ledger(st, -12000, 'déplacements', `Déplacement à ${clubShort(st, opp)}`);
  }
  if (st.sponsor && st.sponsor.bonus && won) ledger(st, st.sponsor.bonus / 10, 'sponsors', 'Bonus sponsor (victoire)');
  st.lastResult = { f: f.id, gf, ga, won, lost, opp };
  addNews(st, `${clubName(st, f.h)} ${f.hg}-${f.ag} ${clubName(st, f.a)}${f.pens ? ` (t.a.b. ${f.pens[0]}-${f.pens[1]})` : ''}${f.agg ? ` — cumul ${f.agg[0]}-${f.agg[1]}` : ''}`, 'result');
  if (derby) addNews(st, won ? 'Victoire dans une affiche à forte rivalité : les supporters exultent !' : lost ? 'Défaite dans une affiche à forte rivalité : la pression monte.' : 'Nul dans une affiche à forte rivalité.', 'fans');
}
const DERBIES = [['est', 'ca'], ['est', 'ess'], ['ess', 'css'], ['ca', 'ess'], ['est', 'css'], ['ca', 'css'], ['ess', 'usm'], ['ca', 'st'], ['est', 'st']];
export const isDerby = (a, b) => DERBIES.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

function weekly(st) {
  const r = R(st);
  const uc = st.clubs[st.userClub];
  // blessures
  for (const p of Object.values(st.players)) {
    if (p.injury) {
      const isUser = (p.loan ? p.loan.to : p.clubId) === st.userClub;
      const spd = isUser ? ({ standard: 1, intensif: 1.35, prudent: 0.8 }[p.injury.treatment] || 1) : 1;
      p.injury.left -= spd;
      if (p.injury.left <= 0) {
        const relapse = r() < p.injury.relapse * ({ standard: 1, intensif: 1.6, prudent: 0.4 }[p.injury.treatment] || 1) * (isUser ? 1.2 - staffAb(st, 'physio', 35) / 200 : 1);
        if (relapse) { p.injury.left = Math.max(1, Math.round(p.injury.total * 0.4)); p.injury.phase = 'rechute'; if (isUser) addNews(st, `Rechute pour ${p.name} : nouvelle indisponibilité de ${p.injury.left} semaine(s).`, 'medical'); }
        else { p.injury = null; p.fitness = 0.75; if (isUser) addNews(st, `${p.name} a reçu l'autorisation médicale et reprend progressivement.`, 'medical'); }
      } else if (p.injury.left <= 1) p.injury.phase = 'réathlétisation';
      else if (p.injury.left < p.injury.total / 2) p.injury.phase = 'rééducation';
    }
    // récupération
    const rec = 0.05 + ((p.loan ? p.loan.to : p.clubId) === st.userClub ? [0.05, 0.02, -0.01][st.training.intensity] + staffAb(st, 'fitness', 35) / 2000 : 0.02);
    // Fatigue de voyage : freine la récupération, se résorbe de moitié chaque semaine.
    const lag = p.travelLag || 0;
    p.fitness = clamp(p.fitness + rec - lag, 0.4, 1);
    p.travelLag = lag > 0.004 ? lag * 0.5 : 0;
  }
  // entraînement (club joueur)
  training(st, r);
  youthWeek(st, r);
  // finances mensuelles (tous les 4 créneaux)
  if (st.slot % 4 === 3) monthly(st);
  // constructions
  for (const c of st.construction) { c.left--; if (c.left <= 0) { uc.infra[c.id] = Math.min(5, uc.infra[c.id] + 1); addNews(st, `Travaux terminés : ${INFRA.find(i => i.id === c.id).fr} niveau ${uc.infra[c.id]}.`, 'club'); } }
  st.construction = st.construction.filter(c => c.left > 0);
  // fenêtres de transfert
  const s = st.slots[st.slot];
  st.window = st.slot <= 6 ? 'été' : (s && s.type === 'LEAGUE' && s.round >= 14 && s.round <= 17) ? 'hiver' : null;
  if (st.window) { aiOffers(st, r); aiTransfers(st, r); }
  resolveNegotiations(st, r);
  // contrats : mécontentement
  for (const p of squad(st, st.userClub)) {
    if (p.contractEnd <= st.season && r() < 0.05) { p.happiness = clamp(p.happiness - 6, 0, 100); addNews(st, `${p.name} s'inquiète : son contrat expire en fin de saison.`, 'contract'); }
  }
  // Vestiaire : temps de jeu attendu selon le rôle, promesses, demandes de départ, ambiance.
  {
    const players = squad(st, st.userClub).filter(p => !(p.loan && p.loan.to !== st.userClub));
    for (const ev of Dr.weeklyHappiness(players)) {
      if (ev.type === 'promise-kept') addNews(st, `🤝 Promesse tenue : ${ev.p.name} a eu son temps de jeu et vous fait confiance.`, 'contract');
      else if (ev.type === 'promise-broken') { addNews(st, `💢 Promesse rompue : ${ev.p.name} n'a pas eu le temps de jeu promis. Le vestiaire l'a remarqué.`, 'contract'); uc.cohesion = clamp(uc.cohesion - 4, 0, 100); }
      else if (ev.type === 'wants-out' && r() < 0.25) { ev.p.listed = 'demande'; addNews(st, `${ev.p.name} est mécontent de son temps de jeu et demande à être transféré.`, 'contract'); }
    }
    const room = Dr.dressingRoomState(players, uc.tactics.captain);
    st.dressingCd = Math.max(0, (st.dressingCd || 0) - 1);
    if (room.crisis) {
      uc.cohesion = clamp(uc.cohesion - 1.5, 0, 100);
      for (const p of players) p.morale = clamp(p.morale - 0.8, 5, 100);
      if (st.dressingCd <= 0) { st.dressingCd = 4; addNews(st, `⚠️ Vestiaire sous tension : ${room.unhappy.slice(0, 3).map(p => p.name).join(', ')} expriment leur mécontentement.${room.unhappyLeaders.length ? ' Un cadre du vestiaire fait partie des frondeurs.' : ''}`, 'contract'); }
    } else if (room.mood >= 72) uc.cohesion = clamp(uc.cohesion + 0.4, 0, 100);
  }
  // confiance : assemblée extraordinaire
  if (st.president.trust < 12 && !st.election && r() < 0.3) startElection(st, true);
  // médias
  if (r() < 0.12) mediaPressure(st, r);
  saveR(st, r);
}
function mediaPressure(st, r) {
  const t = leagueTable(st), pos = t.findIndex(x => x.id === st.userClub) + 1, uc = st.clubs[st.userClub];
  if (!pos) return;
  const exp = { maintien: 12, afrique: 4, podium: 3, titre: 1, coupe: 8 }[st.objective];
  if (pos > exp + 3) addNews(st, `Presse : « ${uc.short} ${pos}e, le président sous pression ». La confiance des supporters vacille.`, 'media');
  else if (pos <= exp) addNews(st, `Presse : « ${uc.short} tient son rang » — les supporters saluent la gestion du président.`, 'media');
}
function training(st, r) {
  const uc = st.clubs[st.userClub];
  const coachQ = (staffAb(st, 'assistant', 35) + staffAb(st, 'head', 40)) / 200 * (0.8 + uc.infra.training * 0.1);
  const gkQ = staffAb(st, 'gkcoach', 35) / 100;
  const inten = [0.6, 1, 1.4][st.training.intensity];
  const focus = st.training.focus;
  for (const p of squad(st, st.userClub)) {
    if (p.injury) continue;
    const young = p.age <= 23 ? 1.6 : p.age <= 27 ? 0.8 : p.age <= 30 ? 0.3 : 0;
    const room = Math.max(0, p.pot - p.ovr);
    const chance = 0.18 * coachQ * inten * young * (room > 0 ? 1 : 0) * (0.8 + p.morale / 250);
    if (r() < chance) {
      const ind = st.training.individual[p.id];
      let key = ind || pickAttr(p, focus, r);
      if (p.pos === 'GK' && !ind) key = r() < 0.7 ? 'gk' : key;
      p.attrs[key] = clamp(p.attrs[key] + 1 + (p.pos === 'GK' && key === 'gk' && r() < gkQ ? 1 : 0), 1, 99);
      p.ovr = ovrOf(p);
    }
    p.fitness = clamp(p.fitness - (st.training.intensity === 2 ? 0.03 : 0), 0.4, 1);
    if (st.training.intensity === 2 && r() < 0.008) injure(st, p, r);
  }
  uc.cohesion = clamp(uc.cohesion + (focus === 'tactique' ? 1.2 : 0.4) * inten, 0, 100);
  if (focus === 'recuperation') for (const p of squad(st, st.userClub)) p.fitness = clamp(p.fitness + 0.04, 0, 1);
}
function pickAttr(p, focus, r) {
  const map = { physique: ['pac', 'phy'], technique: ['pas', 'dri'], attaque: ['sho', 'dri'], defense: ['def', 'phy'], tactique: ['pas', 'def'], recuperation: ['phy'], equilibre: ['pac', 'sho', 'pas', 'dri', 'def', 'phy'] };
  const g = POS_GROUP[p.pos];
  const pool = (map[focus] || map.equilibre).concat(g === 'A' ? ['sho'] : g === 'D' ? ['def'] : ['pas']);
  return r.pick(pool);
}
function monthly(st) {
  const uc = st.clubs[st.userClub];
  const wages = squad(st, st.userClub).reduce((a, p) => a + p.wage * (p.loan && p.loan.to === st.userClub ? (p.loan.wageShare ?? 1) : 1), 0)
    + Object.values(st.players).filter(p => p.loan && p.clubId === st.userClub && p.loan.to !== st.userClub).reduce((a, p) => a + p.wage * (1 - (p.loan.wageShare ?? 1)), 0);
  ledger(st, -wages, 'salaires', 'Salaires des joueurs (mensuel)');
  const youthWages = academy(st).reduce((a, p) => a + (p.wage || 300), 0);
  if (youthWages) ledger(st, -youthWages, 'formation', 'Bourses des U19 (mensuel)');
  const sw = Object.values(st.staff).reduce((a, s) => a + s.wage, 0);
  ledger(st, -sw, 'staff', 'Salaires du staff (mensuel)');
  const maint = Object.values(uc.infra).reduce((a, l) => a + l * 4500, 0);
  ledger(st, -maint, 'infrastructures', 'Entretien des installations');
  ledger(st, -(8000 + uc.infra.academy * 6000), 'formation', 'Fonctionnement du centre de formation');
  if (st.sponsor) ledger(st, st.sponsor.monthly, 'sponsors', `Sponsor ${st.sponsor.name}`);
  else ledger(st, Math.round(8000 + uc.rep * 200), 'sponsors', 'Petits partenaires locaux');
  const fin = staffAb(st, 'findir', 30) / 100;
  ledger(st, Math.round((uc.rep * 1400 + uc.fans.sat * 600) * (0.8 + fin * 0.4)), 'produits dérivés', 'Boutique et produits dérivés (simulé)');
  ledger(st, Math.round(60000 + uc.rep * uc.rep * 30), 'droits TV', 'Droits TV mensuels (barème simulé)');
  for (const L of st.loans) { if (L.left > 0) { const pay = Math.round(L.amount * (1 + L.rate) / L.months); ledger(st, -pay, 'dette', 'Remboursement emprunt'); L.left--; uc.debt = Math.max(0, uc.debt - L.amount / L.months); } }
  st.loans = st.loans.filter(l => l.left > 0);
  if (uc.budget < 0 && !st.settingsGame.allowDebt) {
    st.president.trust = clamp(st.president.trust - 4, 0, 100);
    addNews(st, 'Alerte du directeur financier : trésorerie négative ! Vendez, réduisez la masse salariale ou contractez un emprunt.', 'finance');
  }
  // autres clubs : variation de budget
  for (const c of Object.values(st.clubs)) if (c.id !== st.userClub) c.budget += Math.round(c.rep * 1200 - 30000 * Math.random());
}

// ------------------------------------------------------------------ transferts
export function marketList(st, f = {}) {
  const scoutQ = (staffAb(st, 'scout', 25) + staffOf(st, 'scout').length * 8) / 100;
  return Object.values(st.players).filter(p => {
    if (p.clubId === st.userClub || (p.loan && p.loan.to === st.userClub)) return false;
    if (p.cafClub) return false;
    if (f.pos && f.pos !== 'ALL' && (POS_GROUP[p.pos] !== f.pos && p.pos !== f.pos)) return false;
    if (f.ageMax && p.age > f.ageMax) return false; if (f.ageMin && p.age < f.ageMin) return false;
    if (f.ovrMin && p.ovr < f.ovrMin) return false; if (f.potMin && p.pot < f.potMin) return false;
    if (f.priceMax && askingPrice(st, p) > f.priceMax) return false; if (f.wageMax && p.wage > f.wageMax) return false;
    if (f.nat === 'TUN' && p.nat !== 'TUN') return false; if (f.nat === 'ETR' && p.nat === 'TUN') return false;
    if (f.contract === 'fin' && p.contractEnd > st.season) return false; if (f.free && p.clubId) return false;
    if (f.q && !p.name.toLowerCase().includes(f.q.toLowerCase())) return false;
    return true;
  }).map(p => ({ p, est: scouted(p, scoutQ), price: askingPrice(st, p) })).sort((a, b) => b.est.ovr - a.est.ovr).slice(0, f.limit || 120);
}
function scouted(p, q) { // brouillard de recrutement
  const err = Math.round((1 - clamp(q, 0, 1)) * 8);
  const h = p.id.charCodeAt(3) % (2 * err + 1) - err;
  return { ovr: clamp(p.ovr + Math.round(h / 2), 30, 99), pot: clamp(p.pot + h, 30, 99), range: err };
}
export function askingPrice(st, p) {
  if (!p.clubId) return 0;
  const c = st.clubs[p.clubId]; if (!c) return p.value;
  const sq = squad(st, p.clubId).filter(x => POS_GROUP[x.pos] === POS_GROUP[p.pos]).sort((a, b) => b.ovr - a.ovr);
  const key = sq.indexOf(p) < 2 ? 1.45 : 1.1;
  const listed = p.listed ? 0.85 : 1;
  const sd = staffAb(st, 'sportdir', 35);
  return Math.round(valueOf(p, st.season) * key * listed * (1.08 - sd / 500) / 1000) * 1000;
}
export function wageDemand(st, p, role = 'rotation') {
  const uc = st.clubs[st.userClub];
  const base = Math.max(p.wage * 1.1, wageFor(p.ovr, uc.rep));
  return Math.round(base * ({ cle: 1.25, titulaire: 1.1, rotation: 1, espoir: 0.85 }[role] || 1) / 50) * 50;
}
function wagesTotal(st) { return squad(st, st.userClub).reduce((a, p) => a + p.wage, 0); }
export function wageBudget(st) { const uc = st.clubs[st.userClub]; return Math.round((uc.rep * uc.rep * 55 + 60000) / 1000) * 1000; }
// Offre d'achat (ou de prêt) — retourne {ok, msg}
export function makeOffer(st, pid, offer) {
  const p = st.players[pid]; const uc = st.clubs[st.userClub];
  if (!p) return { ok: false, msg: 'Joueur introuvable.' };
  if (p.clubId === st.userClub) return { ok: false, msg: 'Ce joueur appartient déjà à votre club.' };
  if (!st.window && p.clubId) return { ok: false, msg: 'Le mercato est fermé (seuls les joueurs libres peuvent signer).' };
  if (st.negotiations.some(n => n.pid === pid && n.status === 'en cours')) return { ok: false, msg: 'Une négociation est déjà en cours pour ce joueur.' };
  const angry = st.negotiations.find(n => n.pid === pid && n.blockedUntil > st.slot);
  if (angry) return { ok: false, msg: `${clubName(st, p.clubId)} refuse de discuter après votre dernière offre. Réessayez dans ${angry.blockedUntil - st.slot} semaine(s).` };
  const previous = st.negotiations.find(n => n.pid === pid && (n.status === 'contre-offre' || n.status === 'contre-offre joueur'));
  const fee = Math.max(0, Math.round(offer.fee || 0)), sb = Math.max(0, Math.round(offer.signing || 0));
  if (offer.type !== 'loan' && fee + sb > uc.budget && !st.settingsGame.allowDebt) return { ok: false, msg: 'Budget insuffisant pour cette offre (solde négatif non autorisé).' };
  const newWages = wagesTotal(st) + (offer.wage || 0) * (offer.type === 'loan' ? (offer.wageShare ?? 1) : 1);
  if (newWages > wageBudget(st) * 1.25) return { ok: false, msg: `La masse salariale dépasserait le plafond (${Math.round(wageBudget(st) * 1.25).toLocaleString('fr-FR')} DT/mois).` };
  if (squad(st, st.userClub).length >= 34) return { ok: false, msg: 'Effectif complet (34 joueurs max).' };
  // Clause libératoire payée : le club vendeur ne peut pas s'y opposer.
  const clausePaid = offer.type !== 'loan' && p.releaseClause > 0 && p.clubId && fee >= p.releaseClause;
  if (previous) {
    // Nouvelle proposition dans la même négociation : le compteur de tours continue.
    Object.assign(previous, offer, { fee, signing: sb, status: 'en cours', round: (previous.round || 0) + 1, msg: '', clausePaid, step: clausePaid ? 'joueur' : previous.step });
    return { ok: true, msg: 'Nouvelle proposition transmise.', n: previous };
  }
  const n = { id: uid('t'), pid, from: p.clubId, status: 'en cours', created: st.slot, ...offer, fee, signing: sb, step: clausePaid ? 'joueur' : 'club', round: 0, clausePaid };
  // rivalité : offre concurrente
  const r = R(st);
  if (p.ovr > 60 && r() < 0.25) { const rival = Object.values(st.clubs).filter(c => c.div === 1 && c.id !== st.userClub && c.id !== p.clubId).sort(() => r() - 0.5)[0]; n.rival = rival.id; }
  saveR(st, r);
  st.negotiations.push(n);
  return { ok: true, msg: 'Offre transmise. Réponse à la prochaine étape du calendrier (ou immédiate pour un joueur libre).', n };
}
export function respondNow(st, nid) { const r = R(st); const n = st.negotiations.find(x => x.id === nid); if (n) evalNegotiation(st, n, r); saveR(st, r); return n; }
function resolveNegotiations(st, r) { for (const n of st.negotiations) if (n.status === 'en cours') evalNegotiation(st, n, r); st.negotiations = st.negotiations.filter(n => n.status === 'en cours' || n.status === 'accord' || n.blockedUntil > st.slot || st.slot - n.created < 8); }
function evalNegotiation(st, n, r) {
  const p = st.players[n.pid]; if (!p || p.clubId === st.userClub) { n.status = 'annulée'; return; }
  const uc = st.clubs[st.userClub];
  if (n.step === 'club') {
    if (!p.clubId) { n.step = 'joueur'; }
    else {
      const ask = askingPrice(st, p);
      if (n.type === 'loan') {
        const ok = p.age < 24 || squad(st, p.clubId).indexOf(p) > 18 || r() < 0.4;
        if (!ok || (st.clubs[p.clubId] && p.ovr > st.clubs[p.clubId].rep * 0.7 + 18)) { n.status = 'refusée'; n.msg = `${clubName(st, p.clubId)} refuse de prêter ce joueur.`; return; }
        n.step = 'joueur';
      } else {
        let val = n.fee + (n.bonus || 0) * 0.5 + (n.sellOn || 0) / 100 * p.value * 0.4;
        if (n.swap) { const sp = st.players[n.swap]; if (sp) val += valueOf(sp, st.season) * 0.85; }
        // Le club honore toujours sa propre dernière contre-proposition.
        const d = n.lastCounter && val >= n.lastCounter ? { decision: 'accept' } : Tx.clubDecision({ value: val, ask, round: n.round || 0, roll: r });
        if (d.decision === 'accept') { n.step = 'joueur'; n.round = 0; }
        else if (d.decision === 'counter') { n.status = 'contre-offre'; n.counter = d.counter; n.lastCounter = d.counter; n.msg = `${clubName(st, p.clubId)} fait une contre-proposition : ${d.counter.toLocaleString('fr-FR')} DT (tour ${(n.round || 0) + 1}/${Tx.MAX_ROUNDS}).`; return; }
        else if (d.reason === 'insult') { n.status = 'refusée'; n.blockedUntil = st.slot + 4; n.msg = `${clubName(st, p.clubId)} juge l'offre insultante et rompt les discussions pour 4 semaines.`; return; }
        else { n.status = 'refusée'; n.msg = `${clubName(st, p.clubId)} met fin aux discussions faute d'accord.`; return; }
      }
    }
  }
  if (n.step === 'joueur') {
    const demand = wageDemand(st, p, n.role);
    const fromRep = p.clubId ? st.clubs[p.clubId]?.rep ?? 50 : 40;
    const style = Tx.agentOf(p);
    // Conditions de l'agent : fixées au premier contact, puis ajustées par ses contre-propositions.
    n.terms = n.terms || Tx.personalTerms({ demand, style, fee: n.fee || 0, freeAgent: !p.clubId, value: p.value, wantsClause: n.type !== 'loan' && Tx.wantsReleaseClause(p, uc.rep) });
    if (n.type === 'loan') { n.terms.agentFee = 0; n.terms.releaseClause = 0; n.terms.signing = 0; }
    let extras = (uc.rep - fromRep) / 120 + ({ cle: 0.12, titulaire: 0.06, rotation: 0, espoir: -0.03 }[n.role] || 0) + (n.years >= 3 && p.age > 28 ? 0.06 : 0);
    if (n.rival) { const rv = st.clubs[n.rival]; extras -= (rv.rep - uc.rep) / 150 + 0.05; }
    if (n.type === 'loan') extras += 0.15;
    const d = Tx.agentDecision({ offer: { wage: n.wage, signing: n.signing, agentFee: n.agentFee || 0, releaseClause: n.releaseClause || 0 }, terms: n.terms, style, extras, round: n.playerRound || 0, roll: r });
    n.demand = demand; n.agentStyle = style;
    if (d.decision === 'accept') { n.status = 'accord'; n.msg = `Accord trouvé avec ${p.name} et son agent. Confirmez pour finaliser.`; }
    else if (d.decision === 'counter') {
      n.terms = d.counter; n.status = 'contre-offre joueur'; n.playerRound = (n.playerRound || 0) + 1;
      n.msg = `${Tx.AGENT_STYLES[style].label} : ${d.counter.wage.toLocaleString('fr-FR')} DT/mois, prime ${d.counter.signing.toLocaleString('fr-FR')} DT, commission ${d.counter.agentFee.toLocaleString('fr-FR')} DT${d.counter.releaseClause ? `, clause libératoire ${d.counter.releaseClause.toLocaleString('fr-FR')} DT` : ''} (tour ${n.playerRound}/${Tx.MAX_ROUNDS}).`;
    }
    else { n.status = 'refusée'; n.msg = n.rival && r() < 0.5 ? `${p.name} a préféré l'offre de ${clubName(st, n.rival)}.` : `${p.name} et son agent mettent fin aux discussions (salaire visé ~${n.terms.wage.toLocaleString('fr-FR')} DT/mois).`; }
  }
}
// confirmation finale (transaction atomique)
export function confirmTransfer(st, nid) {
  const n = st.negotiations.find(x => x.id === nid);
  if (!n || n.status !== 'accord') return { ok: false, msg: 'Aucun accord à confirmer.' };
  if (st.txLog.some(t => t.nid === nid)) return { ok: false, msg: 'Transaction déjà effectuée (doublon bloqué).' };
  const p = st.players[n.pid], uc = st.clubs[st.userClub];
  if (!p) return { ok: false, msg: 'Joueur introuvable.' };
  const cost = n.type === 'loan' ? (n.loanFee || 0) : n.fee + n.signing + (n.agentFee || 0);
  if (cost > uc.budget && !st.settingsGame.allowDebt) return { ok: false, msg: 'Fonds insuffisants au moment de la confirmation.' };
  const from = p.clubId;
  if (n.type === 'loan') {
    p.loan = { from, to: st.userClub, until: st.season, wageShare: n.wageShare ?? 1, option: n.option || 0 };
    if (n.loanFee) { ledger(st, -n.loanFee, 'transferts', `Prêt de ${p.name}`); if (st.clubs[from]) st.clubs[from].budget += n.loanFee; }
  } else {
    if (n.fee) ledger(st, -n.fee, 'transferts', `Achat de ${p.name}`);
    if (n.signing) ledger(st, -n.signing, 'transferts', `Prime à la signature de ${p.name}`);
    if (n.agentFee) ledger(st, -n.agentFee, 'transferts', `Commission d'agent (${p.name})`);
    if (from && st.clubs[from]) st.clubs[from].budget += n.fee;
    if (n.swap) { const sp = st.players[n.swap]; if (sp && sp.clubId === st.userClub) { sp.clubId = from; sp.listed = false; removeFromTactics(st, sp.id); addNews(st, `${sp.name} part à ${clubName(st, from)} dans l'échange.`, 'transfer'); } }
    p.clubId = st.userClub; p.loan = null; p.wage = n.wage; p.contractEnd = st.season + (n.years || 2); p.role = n.role || 'rotation'; p.sellOn = n.sellOn ? { club: from, pct: n.sellOn } : null;
    p.bonusClause = n.bonus || 0;
    p.releaseClause = n.releaseClause || 0;
    if (n.clausePaid) addNews(st, `${clubName(st, from)} ne peut s'opposer : la clause libératoire de ${p.name} a été payée.`, 'transfer');
  }
  if (n.type === 'loan') p.wageLoan = n.wage;
  p.listed = false; p.happiness = 75; p.morale = 75;
  const nums = new Set(squad(st, st.userClub).map(x => x.num)); let num = p.num; while (nums.has(num) || !num) num = (num % 99) + 1; p.num = num;
  if (from) removeFromTactics(st, p.id, from);
  st.txLog.push({ nid, pid: p.id, name: p.name, from, to: st.userClub, fee: cost, type: n.type || 'achat', season: st.season, slot: st.slot });
  n.status = 'finalisée';
  addNews(st, `Officiel : ${p.name} rejoint ${uc.name}${n.type === 'loan' ? ' (prêt)' : ''} — ${cost.toLocaleString('fr-FR')} DT.`, 'transfer');
  if (p.ovr >= uc.rep * 0.75) uc.fans.sat = clamp(uc.fans.sat + 3, 0, 100);
  return { ok: true, msg: `${p.name} a signé !` };
}
function removeFromTactics(st, pid, cid = st.userClub) {
  const c = st.clubs[cid]; if (!c) return;
  c.tactics.lineup = c.tactics.lineup.filter(x => x !== pid); c.tactics.bench = c.tactics.bench.filter(x => x !== pid);
  if (cid !== st.userClub || c.tactics.lineup.length < 11) autoLineup(st, cid);
}
// offres reçues pour nos joueurs
function aiOffers(st, r) {
  const mine = squad(st, st.userClub).filter(p => !p.loan || p.loan.to !== st.userClub);
  // Clauses libératoires : un club riche peut lever la clause sans votre accord.
  for (const p of mine) {
    if (!p.releaseClause || p.clubId !== st.userClub) continue;
    const buyer = Object.values(st.clubs).filter(c => c.id !== st.userClub && c.budget >= p.releaseClause && c.rep + 10 >= p.ovr).sort((a, b) => b.rep - a.rep)[0];
    if (!buyer || !Tx.clauseTriggered({ clause: p.releaseClause, value: p.value, buyerBudget: buyer.budget, ovr: p.ovr, roll: r })) continue;
    const fee = p.releaseClause;
    ledger(st, fee, 'transferts', `Clause libératoire de ${p.name} payée par ${buyer.name}`);
    buyer.budget -= fee; p.clubId = buyer.id; p.listed = false; p.releaseClause = 0;
    if (p.sellOn && p.sellOn.club) { const cut = Math.round(fee * p.sellOn.pct / 100); ledger(st, -cut, 'transferts', `Pourcentage à la revente (${clubName(st, p.sellOn.club)})`); p.sellOn = null; }
    st.txLog.push({ pid: p.id, name: p.name, from: st.userClub, to: buyer.id, fee, type: 'clause', season: st.season, slot: st.slot });
    removeFromTactics(st, p.id);
    addNews(st, `💥 ${buyer.name} lève la clause libératoire de ${p.name} (${fee.toLocaleString('fr-FR')} DT). Le joueur quitte le club.`, 'transfer');
  }
  for (const p of mine.filter(x => x.clubId === st.userClub)) {
    const ch = (p.listed ? 0.25 : 0.03) * (p.ovr > 65 ? 1.5 : 1);
    if (r() < ch) {
      const buyers = Object.values(st.clubs).filter(c => c.id !== st.userClub && c.budget > p.value * 0.6 && c.rep + 15 >= p.ovr);
      if (!buyers.length) continue;
      const b = r.pick(buyers);
      const fee = Math.round(p.value * (0.75 + r() * 0.6) * (p.listed ? 0.95 : 1.1) / 1000) * 1000;
      if (st.offers.some(o => o.pid === p.id && o.status === 'en attente')) continue;
      st.offers.push({ id: uid('o'), pid: p.id, club: b.id, fee, type: r() < 0.15 && p.age < 23 ? 'loan' : 'achat', status: 'en attente', slot: st.slot });
      addNews(st, `Offre reçue : ${b.name} propose ${fee.toLocaleString('fr-FR')} DT pour ${p.name}.`, 'transfer');
    }
  }
  st.offers = st.offers.filter(o => o.status === 'en attente' && st.slot - o.slot < 4 || o.status !== 'en attente' && st.slot - o.slot < 10);
}
export function answerOffer(st, oid, accept, counter = null) {
  const o = st.offers.find(x => x.id === oid);
  if (!o || o.status !== 'en attente') return { ok: false, msg: 'Offre expirée.' };
  const p = st.players[o.pid];
  if (!p || p.clubId !== st.userClub) { o.status = 'annulée'; return { ok: false, msg: 'Joueur indisponible.' }; }
  if (counter) {
    const r = R(st); const ok = counter <= o.fee * (1.15 + r() * 0.2); saveR(st, r);
    if (!ok) { o.status = 'retirée'; return { ok: false, msg: `${clubName(st, o.club)} retire son offre.` }; }
    o.fee = counter; accept = true;
  }
  if (!accept) { o.status = 'refusée'; p.happiness = clamp(p.happiness - (o.fee > p.value * 1.2 ? 8 : 2), 0, 100); return { ok: true, msg: 'Offre refusée.' }; }
  if (st.txLog.some(t => t.oid === oid)) return { ok: false, msg: 'Transaction déjà effectuée.' };
  if (o.type === 'loan') { p.loan = { from: st.userClub, to: o.club, until: st.season, wageShare: 0 }; ledger(st, 0, 'transferts', `Prêt de ${p.name} à ${clubName(st, o.club)}`); }
  else {
    ledger(st, o.fee, 'transferts', `Vente de ${p.name} à ${clubName(st, o.club)}`);
    st.clubs[o.club].budget -= o.fee; p.clubId = o.club; p.listed = false; p.loan = null;
    if (p.sellOn && p.sellOn.club) { const cut = Math.round(o.fee * p.sellOn.pct / 100); ledger(st, -cut, 'transferts', `Pourcentage à la revente (${clubName(st, p.sellOn.club)})`); p.sellOn = null; }
    const uc = st.clubs[st.userClub]; if (p.ovr >= uc.rep * 0.8) uc.fans.sat = clamp(uc.fans.sat - 4, 0, 100);
  }
  o.status = 'acceptée';
  st.txLog.push({ oid, pid: p.id, name: p.name, from: st.userClub, to: o.club, fee: o.type === 'loan' ? 0 : o.fee, type: o.type === 'loan' ? 'prêt sortant' : 'vente', season: st.season, slot: st.slot });
  removeFromTactics(st, p.id);
  addNews(st, `${p.name} quitte le club pour ${clubName(st, o.club)}${o.type === 'loan' ? ' (prêt)' : ''}.`, 'transfer');
  return { ok: true, msg: 'Transfert conclu.' };
}
export function releasePlayer(st, pid) {
  const p = st.players[pid]; if (!p || p.clubId !== st.userClub) return { ok: false, msg: 'Impossible.' };
  const months = Math.max(1, (p.contractEnd - st.season) * 12 + 4);
  const comp = Math.round(p.wage * months * 0.5);
  if (comp > st.clubs[st.userClub].budget && !st.settingsGame.allowDebt) return { ok: false, msg: `Indemnité de résiliation (${comp.toLocaleString('fr-FR')} DT) supérieure à la trésorerie.` };
  ledger(st, -comp, 'transferts', `Résiliation du contrat de ${p.name}`);
  p.clubId = null; p.listed = false; removeFromTactics(st, pid);
  st.txLog.push({ pid, name: p.name, from: st.userClub, to: null, fee: -comp, type: 'résiliation', season: st.season, slot: st.slot });
  return { ok: true, msg: `${p.name} est libéré (${comp.toLocaleString('fr-FR')} DT d'indemnité).` };
}
export function renewContract(st, pid, wage, years, role) {
  const p = st.players[pid]; if (!p || p.clubId !== st.userClub) return { ok: false, msg: 'Impossible.' };
  const demand = Math.round(wageDemand(st, p, role) * (p.happiness < 40 ? 1.15 : 1));
  const r = R(st); const ok = wage >= demand || (wage >= demand * 0.9 && r() < 0.5); saveR(st, r);
  if (!ok) { p.happiness = clamp(p.happiness - 4, 0, 100); return { ok: false, msg: `${p.name} refuse : il demande environ ${demand.toLocaleString('fr-FR')} DT/mois.` }; }
  if (wagesTotal(st) - p.wage + wage > wageBudget(st) * 1.25) return { ok: false, msg: 'Masse salariale dépassée.' };
  p.wage = wage; p.contractEnd = st.season + years; p.role = role; p.happiness = clamp(p.happiness + 15, 0, 100); p.listed = false;
  addNews(st, `${p.name} prolonge jusqu'en ${p.contractEnd + 1} (${wage.toLocaleString('fr-FR')} DT/mois).`, 'contract');
  return { ok: true, msg: 'Contrat prolongé.' };
}
function aiTransfers(st, r) {
  if (r() > 0.35) return;
  const ai = Object.values(st.clubs).filter(c => c.id !== st.userClub);
  const buyer = r.pick(ai);
  const cands = Object.values(st.players).filter(p => p.clubId && p.clubId !== st.userClub && p.clubId !== buyer.id && !p.cafClub && p.ovr > buyer.rep * 0.55 + 12 && p.value < buyer.budget * 0.5);
  if (!cands.length) return;
  const p = r.pick(cands), fee = Math.round(p.value * (0.9 + r() * 0.3) / 1000) * 1000;
  const from = p.clubId; st.clubs[from].budget += fee; buyer.budget -= fee; p.clubId = buyer.id; p.listed = false;
  autoLineup(st, from); autoLineup(st, buyer.id);
  addNews(st, `Mercato : ${p.name} passe de ${clubName(st, from)} à ${buyer.name} (${fee.toLocaleString('fr-FR')} DT).`, 'transfer');
}

// ------------------------------------------------------------------ staff
export function hireStaff(st, sid, wageOffer, years) {
  const s = st.staffMarket.find(x => x.id === sid); if (!s) return { ok: false, msg: 'Candidat introuvable.' };
  const Ro = STAFF_ROLES.find(x => x.id === s.role);
  const current = staffOf(st, s.role);
  if (current.length >= Ro.count) return { ok: false, msg: `Poste complet (${Ro.count} max). Libérez d'abord un ${Ro.fr.toLowerCase()}.` };
  const demand = Math.round(s.wage * s.demand);
  const r = R(st); const repOK = st.clubs[st.userClub].rep + 20 >= s.rep; const ok = repOK && (wageOffer >= demand || (wageOffer >= demand * 0.92 && r() < 0.5)); saveR(st, r);
  if (!ok) return { ok: false, msg: repOK ? `${s.name} refuse : il demande ${demand.toLocaleString('fr-FR')} DT/mois.` : `${s.name} juge le club pas assez prestigieux.` };
  const fee = Math.round(wageOffer * 2);
  if (fee > st.clubs[st.userClub].budget && !st.settingsGame.allowDebt) return { ok: false, msg: 'Trésorerie insuffisante pour la prime de signature.' };
  ledger(st, -fee, 'staff', `Prime de signature : ${s.name}`);
  s.wage = wageOffer; s.contractEnd = st.season + years;
  st.staff[s.id] = s; st.staffMarket = st.staffMarket.filter(x => x.id !== sid);
  if (s.role === 'head') st.clubs[st.userClub].coach = s.name;
  addNews(st, `Nomination : ${s.name} devient ${Ro.fr.toLowerCase()} (${s.ability}/100).`, 'staff');
  return { ok: true, msg: `${s.name} rejoint le staff.` };
}
export function fireStaff(st, sid) {
  const s = st.staff[sid]; if (!s) return { ok: false, msg: 'Introuvable.' };
  const months = Math.max(1, (s.contractEnd - st.season) * 12 + 3), comp = Math.round(s.wage * months * 0.5);
  if (comp > st.clubs[st.userClub].budget && !st.settingsGame.allowDebt) return { ok: false, msg: `Indemnité (${comp.toLocaleString('fr-FR')} DT) supérieure à la trésorerie.` };
  ledger(st, -comp, 'staff', `Licenciement de ${s.name}`);
  delete st.staff[sid];
  addNews(st, `${s.name} est licencié (${comp.toLocaleString('fr-FR')} DT d'indemnités).`, 'staff');
  if (s.role === 'head') st.clubs[st.userClub].morale = clamp(st.clubs[st.userClub].morale - 5, 0, 100);
  return { ok: true, msg: 'Contrat résilié.' };
}
export function renewStaff(st, sid, wage, years) {
  const s = st.staff[sid]; if (!s) return { ok: false, msg: 'Introuvable.' };
  const demand = Math.round(s.wage * s.demand);
  if (wage < demand * 0.95) return { ok: false, msg: `${s.name} demande ${demand.toLocaleString('fr-FR')} DT/mois.` };
  s.wage = wage; s.contractEnd = st.season + years; s.demand = 1.05;
  return { ok: true, msg: 'Contrat renouvelé.' };
}

// ------------------------------------------------------------------ infrastructures / finances
export function upgradeInfra(st, id) {
  const uc = st.clubs[st.userClub], I = INFRA.find(i => i.id === id);
  if (uc.infra[id] >= 5) return { ok: false, msg: 'Niveau maximal atteint.' };
  if (st.construction.some(c => c.id === id)) return { ok: false, msg: 'Travaux déjà en cours.' };
  const cost = I.cost * uc.infra[id];
  if (cost > uc.budget && !st.settingsGame.allowDebt) return { ok: false, msg: `Coût ${cost.toLocaleString('fr-FR')} DT : trésorerie insuffisante.` };
  ledger(st, -cost, 'infrastructures', `Travaux : ${I.fr}`);
  st.construction.push({ id, left: 3 + uc.infra[id] * 2 });
  return { ok: true, msg: `Travaux lancés (${3 + uc.infra[id] * 2} semaines).` };
}
export function takeLoan(st, amount) {
  const uc = st.clubs[st.userClub];
  if (uc.debt + amount > uc.rep * 60000) return { ok: false, msg: 'La banque refuse : endettement trop élevé.' };
  const rate = 0.08 + uc.debt / (uc.rep * 600000);
  st.loans.push({ amount, rate, months: 12, left: 12 }); uc.debt += amount;
  ledger(st, amount, 'dette', `Emprunt bancaire (${Math.round(rate * 100)} %)`);
  return { ok: true, msg: `Emprunt de ${amount.toLocaleString('fr-FR')} DT accordé à ${Math.round(rate * 100)} %, remboursable sur 12 mois.` };
}
export function financeSummary(st, season = st.season) {
  const rows = st.ledger.filter(l => l.s === season);
  const by = {}; let inc = 0, exp = 0;
  for (const l of rows) { by[l.cat] = (by[l.cat] || 0) + l.a; if (l.a > 0) inc += l.a; else exp += l.a; }
  return { by, inc, exp, net: inc + exp, rows };
}
export function adReward(st) {
  const day = new Date().toISOString().slice(0, 10);
  if (st.adRewardsToday.day !== day) st.adRewardsToday = { day, n: 0 };
  if (st.adRewardsToday.n >= 3) return { ok: false, msg: 'Limite de 3 récompenses par jour atteinte.' };
  st.adRewardsToday.n++;
  const amt = 20000;
  ledger(st, amt, 'sponsors', 'Récompense publicitaire');
  return { ok: true, msg: `+${amt.toLocaleString('fr-FR')} DT ajoutés à la trésorerie.` };
}

// ------------------------------------------------------------------ médical
export function setTreatment(st, pid, treatment) {
  const p = st.players[pid]; if (!p || !p.injury) return { ok: false, msg: 'Aucune blessure.' };
  const cost = { standard: 0, intensif: 25000, prudent: 5000 }[treatment];
  if (cost > st.clubs[st.userClub].budget && !st.settingsGame.allowDebt) return { ok: false, msg: 'Trésorerie insuffisante.' };
  if (cost) ledger(st, -cost, 'médical', `Soins (${treatment}) : ${p.name}`);
  p.injury.treatment = treatment; p.injury.diagnosed = true;
  return { ok: true, msg: `Protocole « ${treatment} » appliqué à ${p.name}.` };
}
export function medicalExam(st, pid) {
  const p = st.players[pid]; if (!p) return null;
  if (p.injury) { p.injury.diagnosed = true; return p.injury; }
  return null;
}

// ------------------------------------------------------------------ élections
export function startElection(st, extraordinary = false) {
  const r = R(st);
  const progs = [
    { id: 'invest', name: 'Recrutement ambitieux', fr: 'Grandes signatures et ambitions de titre', appeal: 0.06, risk: 0.04 },
    { id: 'rigueur', name: 'Rigueur financière', fr: 'Assainir les comptes, zéro dette', appeal: 0.03, risk: 0 },
    { id: 'jeunes', name: 'Formation des jeunes', fr: 'Académie et talents tunisiens', appeal: 0.04, risk: 0.01 },
    { id: 'supporters', name: 'Proximité supporters', fr: 'Billets moins chers, stade modernisé', appeal: 0.05, risk: 0.02 },
  ];
  const n = 1 + (r() < 0.5 ? 1 : 0);
  const cands = [];
  for (let i = 0; i < n; i++) cands.push({ id: 'c' + i, name: `${r.pick(FIRST)} ${r.pick(LAST)}`, program: r.pick(progs), strength: 0.3 + r() * 0.4 });
  st.election = { extraordinary, candidates: cands, programs: progs, choice: null, campaign: [], members: 3000 + st.clubs[st.userClub].rep * 90, done: false };
  saveR(st, r);
  addNews(st, extraordinary ? 'Assemblée générale extraordinaire : un vote de confiance est organisé !' : 'Fin de mandat : les élections présidentielles sont ouvertes.', 'president');
}
export const CAMPAIGN = [
  { id: 'meeting', name: 'Rencontre avec les groupes de supporters', effect: 0.03, cost: 0 },
  { id: 'media', name: 'Grand entretien télévisé', effect: 0.02, cost: 0 },
  { id: 'bilan', name: 'Présenter le bilan financier', effect: 0.025, cost: 0, needs: 'finance' },
  { id: 'promesse', name: 'Promettre une recrue vedette', effect: 0.04, cost: 0, promise: true },
];
export function electionScore(st) {
  const uc = st.clubs[st.userClub], t = leagueTable(st), pos = t.findIndex(x => x.id === st.userClub) + 1 || 8;
  const exp = { maintien: 12, afrique: 4, podium: 3, titre: 1, coupe: 8 }[st.objective];
  const fin = financeSummary(st);
  let s = 0.25 + st.president.trust / 250 + uc.fans.sat / 400 + (exp - pos) * 0.012 + (uc.budget > 0 ? 0.04 : -0.08) + (fin.net > 0 ? 0.03 : -0.02) + st.trophies.filter(x => x.season === st.season).length * 0.05 + uc.rep / 1000;
  return clamp(s, 0.05, 0.9);
}
export function runElection(st, programId, actions) {
  const E = st.election; if (!E || E.done) return { ok: false, msg: 'Pas d\'élection en cours.' };
  const r = R(st);
  const prog = E.programs.find(p => p.id === programId) || E.programs[0];
  let mine = electionScore(st) + prog.appeal + (r() - 0.5) * 0.1;
  const fin = financeSummary(st);
  for (const a of actions) { const A2 = CAMPAIGN.find(c => c.id === a); if (!A2) continue; if (A2.needs === 'finance' && fin.net < 0) mine -= 0.02; else mine += A2.effect; if (A2.promise) st.promise = { type: 'star', season: st.season + 1 }; }
  const shares = [{ name: st.president.name + ' (vous)', me: true, w: Math.max(0.05, mine) }].concat(E.candidates.map(c => ({ name: c.name, prog: c.program.name, w: c.strength * (0.55 + r() * 0.3) })));
  if (E.extraordinary) { shares.length = 1; shares.push({ name: 'Défiance', w: 1 - mine }); }
  const tot = shares.reduce((a, s) => a + s.w, 0);
  let left = E.members;
  shares.forEach((s, i) => { s.votes = i === shares.length - 1 ? left : Math.round(E.members * s.w / tot); left -= s.votes; s.pct = Math.round(s.votes / E.members * 1000) / 10; });
  const winner = shares.slice().sort((a, b) => b.votes - a.votes)[0];
  E.results = shares; E.done = true; E.program = prog;
  const won = !!winner.me;
  st.president.history.push({ season: st.season, won, pct: shares[0].pct, extraordinary: E.extraordinary });
  if (won) {
    st.president.trust = clamp(st.president.trust + 15, 0, 100); st.president.elected++;
    if (!E.extraordinary) st.president.mandateEnd = st.season + 2;
    addNews(st, `Élection : ${st.president.name} est ${E.extraordinary ? 'confirmé' : 'réélu'} avec ${shares[0].pct} % des voix (programme « ${prog.name} »).`, 'president');
    if (prog.id === 'rigueur') st.finObjective = 'benefice';
    if (prog.id === 'supporters') st.ticketPrice = 0;
  } else {
    st.gameOver = { reason: 'election', season: st.season, pct: shares[0].pct, winner: winner.name };
    addNews(st, `Élection perdue : ${winner.name} devient président. Votre mandat s'achève.`, 'president');
  }
  saveR(st, r);
  return { ok: true, won, shares };
}
export function resign(st) {
  st.gameOver = { reason: 'resign', season: st.season };
  addNews(st, `${st.president.name} présente sa démission.`, 'president');
}
// offres de nouveaux clubs après une défaite/démission
export function jobOffers(st) {
  const myRep = st.clubs[st.userClub].rep, bonus = st.trophies.length * 3 - (st.gameOver?.reason === 'election' ? 8 : 3);
  return Object.values(st.clubs).filter(c => c.id !== st.userClub && c.rep <= myRep + bonus && c.div === 1).sort((a, b) => b.rep - a.rep).slice(0, 3);
}
export function takeNewClub(st, cid) {
  const old = st.userClub;
  st.userClub = cid; st.gameOver = null; st.election = null;
  st.president.trust = 55; st.president.mandateEnd = st.season + 2;
  st.staff = {}; const r = R(st);
  for (const Ro of STAFF_ROLES) for (let i = 0; i < Ro.count; i++) { const s = genStaff(r, Ro.id, st.clubs[cid].rep, st.season); st.staff[s.id] = s; }
  refreshStaffMarket(st, r); saveR(st, r);
  st.negotiations = []; st.offers = []; st.construction = [];
  addNews(st, `Nouveau départ : vous êtes élu président de ${st.clubs[cid].name} (après ${clubName(st, old)}).`, 'president');
}

// ------------------------------------------------------------------ fin de saison
export function seasonReview(st) {
  const t = leagueTable(st), pos = t.findIndex(x => x.id === st.userClub) + 1;
  const div = st.clubs[st.userClub].div;
  const tt = div === 2 ? leagueTable(st, 'L2') : t; const p2 = tt.findIndex(x => x.id === st.userClub) + 1;
  const obj = st.objective;
  const cupWon = st.trophies.some(x => x.season === st.season && x.name === 'Coupe de Tunisie');
  const met = div === 2 ? p2 <= RULES.promoted : obj === 'maintien' ? pos <= 16 - RULES.relegated : obj === 'afrique' ? pos <= 3 || cupWon : obj === 'podium' ? pos <= 3 : obj === 'titre' ? pos === 1 : cupWon;
  return { pos: div === 2 ? p2 : pos, div, met, cupWon };
}
function endSeason(st) {
  const r = R(st);
  const uc = st.clubs[st.userClub];
  const t1 = leagueTable(st, 'L1'), t2 = leagueTable(st, 'L2');
  const review = seasonReview(st);
  // titres & primes
  const champ = t1[0].id; st.clubs[champ].titles.l1++;
  addNews(st, `🏆 ${clubName(st, champ)} est champion de Tunisie ${st.season}-${st.season + 1} !`, 'trophy');
  if (champ === st.userClub) st.trophies.push({ season: st.season, name: 'Championnat de Tunisie' });
  const upos = t1.findIndex(x => x.id === st.userClub);
  if (upos >= 0 && upos < PRIZE.l1.length) ledger(st, PRIZE.l1[upos], 'primes', `Prime de classement (${upos + 1}e)`);
  // objectifs
  const delta = review.met ? 12 : -15;
  st.president.trust = clamp(st.president.trust + delta, 0, 100); uc.fans.sat = clamp(uc.fans.sat + delta / 2, 0, 100);
  addNews(st, review.met ? `Objectif « ${OBJECTIVES[st.objective]} » atteint (${review.pos}e) !` : `Objectif « ${OBJECTIVES[st.objective]} » manqué (${review.pos}e).`, 'president');
  if (st.promise && st.promise.season === st.season) { const bigSign = st.txLog.some(x => x.season === st.season && x.to === st.userClub && x.fee > 500000); if (!bigSign) { st.president.trust = clamp(st.president.trust - 10, 0, 100); addNews(st, 'Promesse électorale non tenue : aucune recrue vedette. Les membres sont déçus.', 'president'); } st.promise = null; }
  // réputation
  t1.forEach((row, i) => { const c = st.clubs[row.id]; c.rep = clamp(Math.round(c.rep + (8 - i) * 0.6), 30, 99); });
  // CAF
  const cl = [t1[0].id, t1[1].id];
  const cupH = st.newCupHolder || st.cupHolder;
  const cc = [t1[2].id]; cc.push(cl.includes(cupH) || cc.includes(cupH) || !st.clubs[cupH] || st.clubs[cupH].div !== 1 ? t1[3].id : cupH);
  // montées / descentes
  const down = t1.slice(-RULES.relegated).map(x => x.id), up = t2.slice(0, RULES.promoted).map(x => x.id);
  for (const id of down) st.clubs[id].div = 2; for (const id of up) st.clubs[id].div = 1;
  addNews(st, `Relégués : ${down.map(id => clubShort(st, id)).join(', ')} — Promus : ${up.map(id => clubShort(st, id)).join(', ')}.`, 'comp');
  if (down.includes(st.userClub)) { st.president.trust = clamp(st.president.trust - 20, 0, 100); addNews(st, `${uc.name} est relégué en Ligue 2. Coup dur pour le club.`, 'president'); }
  if (up.includes(st.userClub)) { st.president.trust = clamp(st.president.trust + 20, 0, 100); st.trophies.push({ season: st.season, name: 'Montée en Ligue 1' }); }
  st.history.push({ season: st.season, pos: review.pos, div: review.div, met: review.met, champion: champ, cup: cupH, fin: financeSummary(st).net, trophies: st.trophies.filter(x => x.season === st.season).map(x => x.name) });
  // joueurs : âge, progression, contrats, retraites
  for (const p of Object.values(st.players)) {
    if (p.cafClub) continue;
    const avgR = p.stats.apps ? p.stats.rsum / p.stats.apps : 6;
    p.career.push({ season: st.season, club: p.clubId, apps: p.stats.apps, goals: p.stats.goals, assists: p.stats.assists, avg: Math.round(avgR * 10) / 10 });
    if (p.career.length > 8) p.career.shift();
    p.age++;
    const growth = p.age <= 21 ? r.int(1, 5) : p.age <= 24 ? r.int(0, 3) : p.age <= 29 ? r.int(-1, 1) : p.age <= 32 ? r.int(-3, 0) : r.int(-5, -1);
    const playBonus = p.stats.apps > 15 ? 1 : 0;
    if (growth + playBonus !== 0) for (const k of ['pac', 'sho', 'pas', 'dri', 'def', 'phy', 'gk']) { if (growth < 0 && k === 'pac' || r() < 0.55) p.attrs[k] = clamp(p.attrs[k] + Math.sign(growth + playBonus) * r.int(0, Math.abs(growth + playBonus)), 15, 99); }
    p.ovr = Math.min(ovrOf(p), Math.max(p.pot, ovrOf(p) - 0));
    if (p.ovr > p.pot) p.pot = p.ovr;
    p.stats = { apps: 0, goals: 0, assists: 0, rsum: 0, cs: 0 }; p.yellows = 0; p.suspended = 0;
    if (p.loan && p.loan.until <= st.season) {
      if (p.loan.to === st.userClub) addNews(st, `Fin du prêt de ${p.name}, retour à ${clubName(st, p.loan.from)}.`, 'transfer');
      if (p.loan.from === st.userClub && p.loan.dev) addNews(st, `🔁 Retour de prêt : ${p.name} revient ${p.loanStartOvr != null ? `(${p.loanStartOvr} → ${p.ovr})` : ''}.`, 'transfer');
      p.loan = null; p.loanStartOvr = null;
    }
    // Fin de formation : à 20 ans, un U19 signe pro s'il a le niveau, sinon il quitte le club.
    if (p.academy && p.clubId === st.userClub && p.age >= 20) {
      const uc = st.clubs[st.userClub];
      if (p.ovr >= uc.rep * 0.55 + 18 || p.pot >= uc.rep * 0.6 + 30) { p.academy = false; p.role = 'espoir'; p.wage = Math.max(p.wage, 1200); addNews(st, `⬆️ Fin de formation : ${p.name} signe automatiquement son premier contrat pro.`, 'club'); }
      else { p.academy = false; p.clubId = null; addNews(st, `${p.name} termine sa formation sans contrat professionnel et quitte le club.`, 'club'); }
    }
    if (p.contractEnd <= st.season && p.clubId) {
      if (p.clubId === st.userClub) { addNews(st, `${p.name} quitte le club libre en fin de contrat.`, 'contract'); p.clubId = null; }
      else if (r() < 0.6) p.contractEnd = st.season + r.int(1, 3); else p.clubId = null;
    }
    if (p.age >= 35 && r() < (p.age - 33) * 0.3) { if (p.clubId === st.userClub) addNews(st, `${p.name} prend sa retraite sportive.`, 'contract'); delete st.players[p.id]; continue; }
    p.value = valueOf(p, st.season + 1);
  }
  st.cafSquads = {};
  // centre de formation : jeunes
  for (const c of Object.values(st.clubs)) {
    const q = c.id === st.userClub ? staffAb(st, 'academy', 35) / 100 * 10 + c.infra.academy * 3 : c.infra.academy * 3;
    const n = c.id === st.userClub ? 3 + Math.floor(c.infra.academy / 2) : 2;
    for (let i = 0; i < n; i++) { const p = genPlayer(r, r.pick(POS_LIST), 34 + c.rep * 0.18 + q, c.id, st.season + 1, { youth: true }); p.role = 'jeune'; p.num = 0; if (c.id === st.userClub) { p.academy = true; p.wage = 300; } st.players[p.id] = p; }
    if (c.id === st.userClub) addNews(st, `Centre de formation : ${n} jeunes de la génération ${st.season + 1} rejoignent les U19.`, 'club');
    // compléter les effectifs IA
    if (c.id !== st.userClub) {
      let sq = squad(st, c.id);
      while (sq.length < 22) { const free = Object.values(st.players).filter(p => !p.clubId && !p.cafClub).sort((a, b) => b.ovr - a.ovr)[0]; const p = free && free.ovr < c.rep * 0.6 + 30 ? free : genPlayer(r, r.pick(POS_LIST), 40 + c.rep * 0.3, c.id, st.season + 1, { rep: c.rep }); p.clubId = c.id; p.contractEnd = st.season + 1 + r.int(1, 3); st.players[p.id] = p; sq = squad(st, c.id); }
      // élaguer
      sq = squad(st, c.id).sort((a, b) => b.ovr - a.ovr);
      for (const p of sq.slice(30)) p.clubId = null;
    }
  }
  // numéros
  for (const c of Object.values(st.clubs)) { const used = new Set(); for (const p of squad(st, c.id)) { if (!p.num || used.has(p.num)) { let n = 2; while (used.has(n)) n++; p.num = n; } used.add(p.num); } }
  // libres : limiter
  const free = Object.values(st.players).filter(p => !p.clubId && !p.cafClub).sort((a, b) => b.ovr - a.ovr);
  for (const p of free.slice(70)) delete st.players[p.id];
  for (let i = 0; i < 15; i++) { const p = genPlayer(r, r.pick(POS_LIST), r.int(48, 64), null, st.season + 1); p.contractEnd = st.season + 1; st.players[p.id] = p; }
  // staff : contrats
  for (const s of Object.values(st.staff)) if (s.contractEnd <= st.season) { addNews(st, `${s.name} quitte le staff (fin de contrat).`, 'staff'); delete st.staff[s.id]; }
  refreshStaffMarket(st, r);
  // nouvelle saison
  st.caf = { cl, cc }; st.cupHolder = cupH; st.champion = champ; st.newCupHolder = null;
  if (st.sponsor && st.sponsor.until <= st.season) st.sponsor = null;
  st.season++;
  saveR(st, r);
  for (const c of Object.values(st.clubs)) autoLineup(st, c.id);
  setupSeason(st);
  if (st.cafDrawNews) { addNews(st, st.cafDrawNews, 'comp'); st.cafDrawNews = null; }
  st.objective = st.clubs[st.userClub].div === 2 ? 'maintien' : st.objective;
  if (st.president.mandateEnd < st.season) startElection(st, false);
  addNews(st, `Nouvelle saison ${st.season}-${st.season + 1} ! Fixez vos objectifs et préparez le mercato d'été.`, 'club');
  st.updatedAt = Date.now();
  return { seasonEnd: true, review };
}

export function nextUserFixtureIndex(st) { for (let i = st.slot; i < st.slots.length; i++) if (userFixture(st, i)) return i; return -1; }
export function migrate(st) {
  if (!st || typeof st !== 'object') return null;
  if (!st.v) st.v = 1;
  if (st.v < 3) { st.settingsGame = st.settingsGame || { allowDebt: false }; st.adRewardsToday = st.adRewardsToday || { day: '', n: 0 }; st.v = 3; }
  return st;
}

// ---------- Vestiaire : actions de l'entraîneur ----------
export function dressingRoom(st) {
  const uc = st.clubs[st.userClub];
  const players = squad(st, st.userClub).filter(p => !(p.loan && p.loan.to !== st.userClub));
  return { ...Dr.dressingRoomState(players, uc.tactics.captain), players, meetingCd: st.meetingCd || 0 };
}
export function talkToPlayer(st, pid, action) {
  const p = st.players[pid];
  if (!p || (p.loan ? p.loan.to : p.clubId) !== st.userClub) return { ok: false, msg: 'Joueur introuvable dans votre effectif.' };
  const r = R(st); const res = Dr.talkTo(p, action, r); saveR(st, r);
  if (res.ok && action === 'refuseTransfer' && Dr.personalityOf(p) === 'temperament') addNews(st, `${p.name} déplore publiquement le refus de son transfert.`, 'media');
  return res;
}
export function holdTeamMeeting(st, action) {
  if ((st.meetingCd || 0) > 0) return { ok: false, msg: `Prochaine réunion d'équipe possible dans ${st.meetingCd} match(s).` };
  const uc = st.clubs[st.userClub];
  const recent = st.fixtures.filter(f => f.played && (f.h === st.userClub || f.a === st.userClub)).slice(-4);
  const pts = recent.length ? recent.reduce((a, f) => { const home = f.h === st.userClub, gf = home ? f.hg : f.ag, ga = home ? f.ag : f.hg; const won = f.winner ? f.winner === st.userClub : gf > ga; return a + (won ? 3 : gf === ga && !f.winner ? 1 : 0); }, 0) / recent.length : 1.5;
  const room = dressingRoom(st);
  const res = Dr.teamMeeting(room.players, action, { recentPoints: pts, room });
  if (res.ok) { uc.cohesion = clamp(uc.cohesion + res.cohesion, 0, 100); st.meetingCd = 4; }
  return res;
}

// Accepter telle quelle la contre-proposition de l'agent.
export function acceptAgentCounter(st, nid) {
  const n = st.negotiations.find(x => x.id === nid);
  if (!n || n.status !== 'contre-offre joueur' || !n.terms) return { ok: false, msg: 'Aucune contre-proposition à accepter.' };
  Object.assign(n, { wage: n.terms.wage, signing: n.terms.signing, agentFee: n.terms.agentFee, releaseClause: n.terms.releaseClause, status: 'en cours' });
  const r = R(st); evalNegotiation(st, n, r); saveR(st, r);
  return { ok: n.status === 'accord', msg: n.msg, n };
}
// Accepter la contre-proposition du club vendeur (indemnité demandée).
export function acceptClubCounter(st, nid) {
  const n = st.negotiations.find(x => x.id === nid);
  if (!n || n.status !== 'contre-offre' || !n.counter) return { ok: false, msg: 'Aucune contre-proposition du club.' };
  const uc = st.clubs[st.userClub];
  if (n.counter + (n.signing || 0) > uc.budget && !st.settingsGame.allowDebt) return { ok: false, msg: 'Budget insuffisant pour cette indemnité.' };
  n.fee = n.counter; n.status = 'en cours'; n.round = (n.round || 0) + 1;
  const r = R(st); evalNegotiation(st, n, r); saveR(st, r);
  return { ok: n.status !== 'refusée', msg: n.msg || 'Indemnité acceptée : place aux conditions personnelles.', n };
}

// ---------- Centre de formation ----------
function scoutQuality(st) { return clamp((staffAb(st, 'scout', 25) + staffOf(st, 'scout').length * 8) / 100, 0, 1); }
function youthWeek(st, r) {
  const uc = st.clubs[st.userClub];
  // Missions de détection en région.
  const sc = st.youthScouting;
  if (sc && sc.weeksLeft > 0) {
    sc.weeksLeft--;
    const q = scoutQuality(st);
    if (r() < Y.findChance(q, sc.region)) {
      const reg = Y.REGIONS[sc.region];
      const pos = r.pick(reg.pos);
      const p = genPlayer(r, pos, 40 + uc.infra.academy * 2 + (reg.quality - 1) * 20, null, st.season, { youth: true, age: r.int(15, 17) });
      for (const k of reg.attrs) p.attrs[k] = clamp(p.attrs[k] + r.int(2, 5), 1, 99);
      p.ovr = ovrOf(p);
      p.pot = Math.max(p.ovr + 4, Y.prospectPotential({ region: sc.region, academyLevel: uc.infra.academy, roll: r }));
      p.nat = sc.region === 'diaspora' ? 'TUN' : p.nat;
      p.region = sc.region;
      const range = Y.potentialRange(p.pot, q, p.id.charCodeAt(2) + p.id.charCodeAt(3));
      st.prospects = (st.prospects || []).concat({ id: p.id, player: p, range, region: sc.region, fee: Y.prospectFee(range.high), found: st.slot });
      addNews(st, `🔎 Détection (${reg.label}) : ${p.name}, ${p.age} ans, ${p.pos}, potentiel estimé ${range.low}-${range.high}.`, 'club');
    }
    if (sc.weeksLeft <= 0) { addNews(st, `Mission de détection terminée : ${Y.REGIONS[sc.region].label}.`, 'club'); st.youthScouting = null; }
  }
  st.prospects = (st.prospects || []).filter(x => st.slot - x.found < 10);
  // Progression des U19.
  const coach = staffAb(st, 'academy', 35);
  for (const p of academy(st)) {
    if (p.injury) continue;
    const chance = Y.academyGrowthChance({ academyLevel: uc.infra.academy, coach, age: p.age, room: p.pot - p.ovr, morale: p.morale });
    if (r() < chance) growYouth(p, r);
  }
  // Prêts de développement : nos jeunes prêtés progressent selon leur temps de jeu.
  for (const p of Object.values(st.players)) {
    if (!p.loan || p.loan.from !== st.userClub || p.injury) continue;
    const host = st.clubs[p.loan.to];
    const playing = Y.loanPlayingTime(p.ovr, host?.rep ?? 50);
    p.loanPlaying = playing;
    if (r() < Y.loanGrowthChance({ age: p.age, room: p.pot - p.ovr, playing })) growYouth(p, r);
  }
}
export function startScouting(st, region) {
  const reg = Y.REGIONS[region];
  if (!reg) return { ok: false, msg: 'Région inconnue.' };
  if (st.youthScouting) return { ok: false, msg: `Une mission est déjà en cours (${Y.REGIONS[st.youthScouting.region].label}).` };
  if (!staffOf(st, 'scout').length) return { ok: false, msg: 'Engagez au moins un recruteur dans le staff.' };
  const uc = st.clubs[st.userClub];
  if (uc.budget < reg.cost && !st.settingsGame.allowDebt) return { ok: false, msg: 'Budget insuffisant pour cette mission.' };
  ledger(st, -reg.cost, 'formation', `Mission de détection : ${reg.label}`);
  st.youthScouting = { region, weeksLeft: reg.weeks, started: st.slot };
  return { ok: true, msg: `Recruteurs envoyés : ${reg.label} (${reg.weeks} semaines).` };
}
export function signProspect(st, id) {
  const x = (st.prospects || []).find(y => y.id === id);
  if (!x) return { ok: false, msg: 'Ce jeune n\'est plus disponible.' };
  if (academy(st).length >= Y.ACADEMY_MAX) return { ok: false, msg: `Centre de formation complet (${Y.ACADEMY_MAX} jeunes au maximum).` };
  const uc = st.clubs[st.userClub];
  if (uc.budget < x.fee && !st.settingsGame.allowDebt) return { ok: false, msg: 'Budget insuffisant.' };
  const p = x.player;
  Object.assign(p, { clubId: st.userClub, academy: true, wage: 300, role: 'jeune', contractEnd: st.season + 3, scoutedRange: x.range });
  st.players[p.id] = p;
  st.prospects = st.prospects.filter(y => y.id !== id);
  ledger(st, -x.fee, 'formation', `Signature U19 : ${p.name}`);
  addNews(st, `🎓 ${p.name} (${p.age} ans) rejoint le centre de formation.`, 'club');
  return { ok: true, msg: `${p.name} rejoint les U19.` };
}
export function rejectProspect(st, id) { st.prospects = (st.prospects || []).filter(y => y.id !== id); return { ok: true, msg: 'Talent écarté.' }; }
export function promoteYouth(st, pid) {
  const p = st.players[pid];
  if (!p || !p.academy || p.clubId !== st.userClub) return { ok: false, msg: 'Jeune introuvable.' };
  if (squad(st, st.userClub).length >= 34) return { ok: false, msg: 'Effectif professionnel complet (34 joueurs).' };
  p.academy = false; p.role = 'espoir'; p.wage = Math.max(p.wage, 1200); p.contractEnd = Math.max(p.contractEnd, st.season + 3);
  const nums = new Set(squad(st, st.userClub).map(x => x.num)); let num = 30; while (nums.has(num)) num++; p.num = num;
  p.happiness = clamp(p.happiness + 15, 0, 100); p.morale = clamp(p.morale + 10, 5, 100);
  addNews(st, `⬆️ ${p.name} (${p.age} ans) signe son premier contrat professionnel.`, 'club');
  return { ok: true, msg: `${p.name} est promu en équipe première.` };
}
export function releaseYouth(st, pid) {
  const p = st.players[pid];
  if (!p || !p.academy || p.clubId !== st.userClub) return { ok: false, msg: 'Jeune introuvable.' };
  p.academy = false; p.clubId = null; p.listed = false;
  addNews(st, `${p.name} quitte le centre de formation.`, 'club');
  return { ok: true, msg: `${p.name} est libéré.` };
}
export function loanTargetsFor(st, pid) {
  const p = st.players[pid]; if (!p) return [];
  return Y.loanTargets(Object.values(st.clubs), p, st.userClub);
}
export function loanForDevelopment(st, pid, clubId) {
  const p = st.players[pid];
  if (!p || p.clubId !== st.userClub || p.loan) return { ok: false, msg: 'Joueur indisponible pour un prêt.' };
  if (p.age > 23) return { ok: false, msg: 'Les prêts de développement concernent les joueurs de 23 ans au plus.' };
  const c = st.clubs[clubId];
  if (!c || clubId === st.userClub) return { ok: false, msg: 'Club d\'accueil invalide.' };
  if (p.academy) { p.academy = false; p.role = 'espoir'; p.wage = Math.max(p.wage, 800); }
  p.loan = { from: st.userClub, to: clubId, until: st.season, wageShare: 0, dev: true }; p.loanStartOvr = p.ovr;
  removeFromTactics(st, p.id);
  const playing = Y.loanPlayingTime(p.ovr, c.rep);
  addNews(st, `🔁 ${p.name} est prêté à ${c.name} jusqu'à la fin de saison pour progresser (temps de jeu attendu ~${Math.round(playing * 100)} %).`, 'transfer');
  return { ok: true, msg: `${p.name} prêté à ${c.name}.` };
}

// Progression ciblée d'un jeune : les attributs qui comptent pour son poste.
function growYouth(p, r) {
  const g = POS_GROUP[p.pos];
  const keys = p.pos === 'GK' ? ['gk', 'gk', 'phy'] : g === 'D' ? ['def', 'def', 'phy', 'pac'] : g === 'M' ? ['pas', 'pas', 'dri', 'def'] : ['sho', 'sho', 'pac', 'dri'];
  const key = r.pick(keys);
  p.attrs[key] = clamp(p.attrs[key] + 2, 1, 99);
  p.ovr = Math.min(ovrOf(p), p.pot);
}
export function scoutQualityOf(st) { return scoutQuality(st); }
export function loanedOut(st) { return Object.values(st.players).filter(p => p.loan && p.loan.from === st.userClub); }

// Rotation conseillée : titulaires fatigués remplacés par le meilleur joueur frais au même poste.
export function rotationAdvice(st, threshold = 0.8) {
  const uc = st.clubs[st.userClub], t = uc.tactics;
  const slots = FORMATION_POS[t.formation] || FORMATION_POS['4-3-3'];
  const lineup = t.lineup.map(id => st.players[id]);
  const pool = squad(st, st.userClub);
  return K.rotationPlan(lineup, pool, slots, (p, pos) => ovrOf(p, pos) * posFit(p, pos), threshold);
}
export function rotateLineup(st, threshold = 0.8) {
  const uc = st.clubs[st.userClub], t = uc.tactics;
  const changes = rotationAdvice(st, threshold);
  for (const c of changes) {
    t.lineup[c.index] = c.in.id;
    t.bench = t.bench.filter(id => id !== c.in.id);
    if (!t.bench.includes(c.out.id)) t.bench.unshift(c.out.id);
    t.bench = t.bench.slice(0, 9);
  }
  return changes;
}
export function nextTrip(st, f) {
  if (!f || (f.comp !== 'CL' && f.comp !== 'CC') || f.h === st.userClub) return null;
  const opp = clubObj(st, f.h);
  return opp && !st.clubs[f.h] ? K.travelInfo(opp.country) : null;
}
