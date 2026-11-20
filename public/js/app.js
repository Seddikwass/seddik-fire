// Football Tunisia 2026 — interface et navigation
import * as C from './career.js';
import { Match } from './match.js';
import { TACTIC_PRESETS, getCoachAdvice } from './tactics.js';
import * as Dr from './dressing.js';
import * as Tx from './transfers.js';
import * as Y from './youth.js';
import * as CAF from './caf.js';
import * as Online from './online.js';
import * as A from './audio.js';
import * as S from './storage.js';
import { t, setLang, getLang } from './i18n.js';
import { CLUBS, CAF_CLUBS, STAFF_ROLES, INFRA, FORMATIONS, FORMATION_POS, POS_GROUP, SEASON_LABEL, VERIFIED_ON, DATA_VERSION } from './data.js';
import { esc, fmtMoney, fmtShort, crestSVG, clamp } from './util.js';

export const APP_VERSION = '3.37.0';
let settings = S.loadSettings();
let st = null, view = 'home', args = {}, match = null, syncStatus = '', dataOverrides = null, serverInfo = null;
const $ = s => document.querySelector(s);
const app = () => $('#app');
setLang(settings.lang);
A.setAudio(settings.sound, settings.volume); A.setVoice(settings.voice);

// ------------------------------------------------------------------ utilitaires UI
function toast(msg, type = 'info') {
  const el = $('#toast'); el.textContent = msg; el.className = 'show ' + type;
  clearTimeout(toast.t); toast.t = setTimeout(() => el.className = '', 3200);
}
function modal(html, opts = {}) {
  const m = $('#modal'); m.innerHTML = `<div class="mbox ${opts.wide ? 'wide' : ''}" role="dialog" aria-modal="true">${html}</div>`; m.className = 'show';
  m.onclick = e => { if (e.target === m && !opts.locked) closeModal(); };
}
function closeModal() { $('#modal').className = ''; $('#modal').innerHTML = ''; }
function confirmBox(text, onYes, yes = 'Valider') {
  modal(`<h3>Confirmation</h3><p>${text}</p><div class="row end"><button class="btn ghost" data-a="closeModal">${t('Annuler')}</button><button class="btn primary" id="cfYes">${t(yes)}</button></div>`);
  $('#cfYes').onclick = () => { closeModal(); onYes(); };
}
const crest = (id, size) => { const c = st ? C.clubObj(st, id) : (CLUBS.find(x => x.id === id) || CAF_CLUBS.find(x => x.id === id)); return c ? crestSVG(c, size) : ''; };
const bar = (v, max = 100, cls = '') => `<span class="bar ${cls}"><i style="width:${clamp(v / max * 100, 0, 100)}%"></i></span>`;
const ovrCls = o => o >= 75 ? 'o-a' : o >= 65 ? 'o-b' : o >= 55 ? 'o-c' : 'o-d';
function save(note) { if (!st) return; S.autosave(st, s => { syncStatus = s; const el = $('#sync'); if (el) el.textContent = syncLabel(); }); if (note) toast(note, 'ok'); }
function syncLabel() { const a = S.auth(); if (!a) return '💾 Sauvegarde locale'; return navigator.onLine ? `☁ ${a.username} — ${syncStatus || 'prêt'}` : '⚠ Hors ligne — sauvegarde locale'; }
function go(v, a = {}) { view = v; args = a; render(); const m = $('main'); if (m) m.scrollTop = 0; }

// ------------------------------------------------------------------ rendu principal
function render() {
  if (match && view !== 'match') { match.destroy(); match = null; }
  const V = VIEWS[view] || VIEWS.home;
  if (['home', 'newCareer', 'quick', 'online', 'settingsHome', 'account', 'match', 'gameOver', 'postmatchQuick'].includes(view)) app().innerHTML = V();
  else app().innerHTML = shell(V());
  if (view === 'match') startMatchView();
  if (view === 'online') loadLeaderboard();
}
const NAV = [
  ['hub', '🏠', 'Accueil'], ['prematch', '⚽', 'Match'], ['squad', '👥', 'Effectif'], ['youth', '🎓', 'Formation'], ['tactics', '📋', 'Tactique'], ['transfers', '💱', 'Transferts'],
  ['staff', '🧑‍💼', 'Staff'], ['medical', '🩺', 'Médical'], ['finances', '💰', 'Finances'], ['infra', '🏟', 'Infrastructures'],
  ['comps', '🏆', 'Compétitions'], ['tables', '📊', 'Classements'], ['president', '🗳', 'Président'], ['settings', '⚙', 'Paramètres'],
];
function shell(inner) {
  const uc = st.clubs[st.userClub];
  return `<div class="shell">
  <header class="top"><div class="club">${crest(st.userClub, 30)}<div><b>${esc(uc.name)}</b><small>${t('Saison')} ${st.season}-${st.season + 1} · ${C.slotLabel(st)}</small></div></div>
   <div class="kpis"><span title="${t('Trésorerie')}">💰 <b class="${uc.budget < 0 ? 'neg' : ''}">${fmtShort(uc.budget)}</b></span><span title="${t('Confiance')}">🗳 ${Math.round(st.president.trust)}%</span><span title="${t('Supporters')}">📣 ${Math.round(uc.fans.sat)}%</span><span id="sync" class="sync">${syncLabel()}</span></div></header>
  <nav class="rail">${NAV.map(([v, i, l]) => `<button class="${view === v ? 'on' : ''}" data-a="nav" data-v="${v}"><span>${i}</span><em>${t(l)}</em></button>`).join('')}<button data-a="nav" data-v="home"><span>⏏</span><em>${t('Quitter')}</em></button></nav>
  <main>${inner}</main></div>`;
}

// ------------------------------------------------------------------ écran titre
const VIEWS = {};
VIEWS.home = () => {
  const has = !!S.loadLocal();
  return `<div class="title"><div class="title-bg"></div><div class="title-in">
   <div class="logo"><span class="ball">⚽</span><h1>FOOTBALL <b>TUNISIA</b> <i>2026</i></h1><p>Ligue 1 ${SEASON_LABEL} · Coupe de Tunisie · CAF · Gestion de club</p></div>
   <div class="menu">
    ${has ? `<button class="btn big primary" data-a="continue">▶ ${t('Continuer')}</button>` : ''}
    <button class="btn big ${has ? '' : 'primary'}" data-a="nav" data-v="newCareer">🏆 ${t('Nouvelle carrière')}</button>
    <button class="btn big" data-a="nav" data-v="quick">⚡ ${t('Match rapide')}</button>
    <button class="btn big" data-a="nav" data-v="online">🌐 Match en ligne</button>
    <div class="row"><button class="btn" data-a="nav" data-v="settingsHome">⚙ ${t('Paramètres')}</button><button class="btn" data-a="nav" data-v="account">👤 ${t('Compte')}</button></div>
   </div>
   <p class="fine">v${APP_VERSION} · données ${DATA_VERSION} (vérifiées le ${VERIFIED_ON}) · joueurs fictifs · <a href="privacy.html" target="_blank">Confidentialité</a></p>
  </div></div>`;
};
VIEWS.newCareer = () => {
  const step = args.step || 1;
  const clubs = (dataOverrides?.clubs || CLUBS).filter(c => c.div === 1).sort((a, b) => b.rep - a.rep);
  if (step === 1) return `<div class="page"><div class="ph"><button class="btn ghost" data-a="nav" data-v="home">← ${t('Retour')}</button><h2>${t('Choisir un club')}</h2></div>
    <p class="hint">Ligue 1 ${SEASON_LABEL} — 16 clubs vérifiés le ${VERIFIED_ON}. Écussons provisoires originaux, joueurs fictifs.</p>
    <div class="grid clubs">${clubs.map(c => `<button class="clubcard" data-a="pickClub" data-id="${c.id}">${crestSVG(c, 42)}<b>${esc(c.name)}</b><small>${esc(c.city)} · ${'★'.repeat(Math.max(1, Math.round(c.rep / 20)))}</small></button>`).join('')}
    <button class="clubcard custom" data-a="customClub">➕<b>${t('Créer un club fictif')}</b><small>Remplace le club le plus modeste de L1</small></button></div></div>`;
  const c = args.custom ? { name: args.custom.name, city: args.custom.city, colors: [args.custom.c1, args.custom.c2], short: args.custom.short, id: 'custom' } : clubs.find(x => x.id === args.clubId);
  return `<div class="page narrow"><div class="ph"><button class="btn ghost" data-a="nav" data-v="newCareer">← ${t('Retour')}</button><h2>${t('Nouvelle carrière')}</h2></div>
   <div class="card center">${crestSVG(c, 64)}<h3>${esc(c.name)}</h3><p>${esc(c.city)}</p></div>
   <label>Nom du président<input id="ncPres" maxlength="30" value="${esc(args.pres || 'Wassim')}"></label>
   <label>${t('Difficulté')}<select id="ncDiff">${C.DIFFS.map((d, i) => `<option value="${i}" ${i === settings.difficulty ? 'selected' : ''}>${t(d)}</option>`).join('')}</select></label>
   <label>${t('Objectif')} sportif<select id="ncObj">${Object.entries(C.OBJECTIVES).map(([k, v]) => `<option value="${k}" ${k === (c.rep >= 80 ? 'titre' : c.rep >= 65 ? 'afrique' : 'maintien') ? 'selected' : ''}>${t(v)}</option>`).join('')}</select></label>
   <label>Objectif financier<select id="ncFin"><option value="equilibre">Équilibre budgétaire</option><option value="benefice">Dégager un bénéfice</option><option value="invest">Investir (déficit toléré)</option></select></label>
   <button class="btn big primary" data-a="startCareer">🏁 Commencer la carrière</button></div>`;
};
VIEWS.quick = () => {
  const all = (dataOverrides?.clubs || CLUBS).slice().sort((a, b) => b.rep - a.rep).concat(CAF_CLUBS.map(c => ({ ...c, city: c.country })));
  const h = args.h || 'est', a = args.a || 'ca';
  const opt = sel => all.map(c => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.name)}</option>`).join('');
  return `<div class="page narrow"><div class="ph"><button class="btn ghost" data-a="nav" data-v="home">← ${t('Retour')}</button><h2>${t('Match rapide')}</h2></div>
   <div class="vs"><div>${crest(h, 56)}<select id="qh">${opt(h)}</select></div><b>VS</b><div>${crest(a, 56)}<select id="qa">${opt(a)}</select></div></div>
   <label>Vous contrôlez<select id="qside"><option value="0">Domicile</option><option value="1">Extérieur</option><option value="-1">Personne (spectateur)</option></select></label>
   <label>${t('Durée du match')}<select id="qdur">${[3, 5, 8, 10, 15].map(m => `<option ${m === settings.duration ? 'selected' : ''} value="${m}">${m} min</option>`).join('')}</select></label>
   <label class="check"><input type="checkbox" id="qko"> Tirs au but en cas d'égalité (match de coupe)</label>
   <button class="btn big primary" data-a="quickPlay">⚽ ${t('Jouer')}</button></div>`;
};

// ------------------------------------------------------------------ hub
VIEWS.hub = () => {
  const uc = st.clubs[st.userClub];
  if (st.gameOver) return goGameOver();
  const nf = C.userFixture(st) || null;
  const ni = C.nextUserFixtureIndex(st);
  const t1 = C.leagueTable(st, uc.div === 1 ? 'L1' : 'L2'); const pos = t1.findIndex(x => x.id === st.userClub) + 1;
  const row = t1[pos - 1];
  const inj = C.squad(st, st.userClub).filter(p => p.injury).length;
  const neg = st.negotiations.filter(n => n.status === 'accord' || n.status === 'contre-offre' || n.status === 'contre-offre joueur').length + st.offers.filter(o => o.status === 'en attente').length;
  const nextF = ni >= 0 ? C.userFixture(st, ni) : null;
  return `<div class="dash">
   <section class="card next">${nextF ? `<h3>${t('Prochain match')}</h3><small>${C.slotLabel(st, ni)}${ni > st.slot ? ' (après ' + (ni - st.slot) + ' étape(s))' : ''}</small>
     <div class="fixture">${crest(nextF.h, 46)}<div><b>${esc(C.clubName(st, nextF.h))}</b><span>vs</span><b>${esc(C.clubName(st, nextF.a))}</b>${C.isDerby(nextF.h, nextF.a) ? '<em class="tag hot">Affiche à forte rivalité</em>' : ''}</div>${crest(nextF.a, 46)}</div>` : '<h3>Aucun match à venir</h3>'}
     <div class="row">${nf ? `<button class="btn primary big" data-a="nav" data-v="prematch">⚽ ${t('Jouer')} / ${t('Simuler')}</button>` : `<button class="btn primary big" data-a="advance">⏭ ${st.slots[st.slot]?.type === 'END' ? 'Terminer la saison' : t('Avancer')}</button>`}</div></section>
   <section class="card"><h3>${uc.div === 1 ? t('Ligue 1') : 'Ligue 2'}</h3><div class="big">${row && row.p ? `${pos}<sup>e</sup>` : '—'}</div><small dir="ltr">${row ? `${row.pts} pts · ${row.w}V ${row.d}N ${row.l}D · ${row.gf}-${row.ga}` : ''}</small>
     <p>${t('Objectif')} : <b>${t(C.OBJECTIVES[st.objective])}</b></p><button class="btn small" data-a="nav" data-v="tables">${t('Classements')} →</button></section>
   <section class="card"><h3>${t('Club')}</h3>
     <div class="kv"><span>${t('Trésorerie')}</span><b class="${uc.budget < 0 ? 'neg' : ''}">${fmtMoney(uc.budget)}</b><span>${t('Masse salariale')}</span><b>${fmtMoney(C.squad(st, st.userClub).reduce((a, p) => a + p.wage, 0))}/mois</b>
     <span>${t('Confiance')} (président)</span><b>${bar(st.president.trust)}</b><span>${t('Satisfaction')} supporters</span><b>${bar(uc.fans.sat)}</b><span>${t('Cohésion')}</span><b>${bar(uc.cohesion)}</b><span>${t('Mercato')}</span><b>${st.window ? 'ouvert (' + st.window + ')' : 'fermé'}</b></div></section>
   <section class="card"><h3>${t('À traiter')}</h3><ul class="todo">
     ${st.sponsorOffers ? '<li data-a="nav" data-v="president">📝 Choisir un sponsor principal</li>' : ''}
     ${st.election && !st.election.done ? '<li data-a="nav" data-v="president">🗳 Élection en cours !</li>' : ''}
     ${neg ? `<li data-a="nav" data-v="transfers" data-tab="neg">💱 ${neg} dossier(s) de transfert</li>` : ''}
     ${inj ? `<li data-a="nav" data-v="medical">🩺 ${inj} joueur(s) blessé(s)</li>` : ''}
     ${C.squad(st, st.userClub).filter(p => p.contractEnd <= st.season).length ? `<li data-a="nav" data-v="squad" data-tab="contrats">📄 Contrats en fin de saison</li>` : ''}
     <li data-a="adReward">🎁 ${t('Regarder une pub (récompense)')}</li></ul></section>
   <section class="card wide"><h3>${t('Actualités')}</h3><ul class="news">${st.news.slice(0, 12).map(n => `<li class="n-${n.type}">${esc(n.text)}</li>`).join('')}</ul></section></div>`;
};
function goGameOver() { setTimeout(() => go('gameOver'), 0); return ''; }
VIEWS.gameOver = () => {
  const g = st.gameOver, offers = C.jobOffers(st);
  return `<div class="page narrow center"><h2>${g.reason === 'election' ? 'Élection perdue' : 'Démission'}</h2>
   <p>${g.reason === 'election' ? `Vous avez obtenu ${g.pct} % des voix. ${esc(g.winner)} prend la présidence.` : 'Vous avez quitté la présidence.'}</p>
   <h3>Propositions d'autres clubs</h3>${offers.length ? offers.map(c => `<button class="btn big" data-a="newClub" data-id="${c.id}">${crestSVG(c, 24)} ${esc(c.name)}</button>`).join('') : '<p>Aucune offre pour le moment.</p>'}
   <button class="btn ghost" data-a="nav" data-v="newCareer">Recommencer une carrière</button></div>`;
};

// ------------------------------------------------------------------ avant-match
VIEWS.prematch = () => {
  const f = C.userFixture(st);
  if (!f) return `<div class="card"><h3>Pas de match à cette étape</h3><p>${C.slotLabel(st)}</p><button class="btn primary" data-a="advance">⏭ ${t('Avancer')}</button></div>`;
  const home = f.h === st.userClub, opp = home ? f.a : f.h;
  const ch = C.repairLineup(st, st.userClub);
  if (ch && ch.length) toast('Composition ajustée : ' + ch.map(([a, b]) => `${a} → ${b}`).join(', '));
  const me = C.teamStrength(st, st.userClub, false), them = C.teamStrength(st, opp, false);
  const lu = st.clubs[st.userClub].tactics.lineup.map(id => st.players[id]).filter(Boolean);
  const comp = { L1: t('Ligue 1'), L2: 'Ligue 2', CUP: t('Coupe de Tunisie'), CL: t('Ligue des Champions CAF'), CC: t('Coupe de la Confédération CAF'), SUP: t('Supercoupe') }[f.comp];
  return `<div class="prematch"><div class="card center"><small>${comp} · ${C.slotLabel(st)}</small>
   <div class="fixture xl">${crest(f.h, 72)}<div><b>${esc(C.clubName(st, f.h))}</b><span>${f.neutral ? 'terrain neutre' : 'à ' + esc(C.clubObj(st, f.h)?.stadium || C.clubObj(st, f.h)?.country || '')}</span><b>${esc(C.clubName(st, f.a))}</b></div>${crest(f.a, 72)}</div>
   <div class="kv inline"><span>Force estimée</span><b>${Math.round(me)} vs ${Math.round(them)}</b><span>${t('Formation')}</span><b>${st.clubs[st.userClub].tactics.formation}</b></div>
   <div class="row center"><button class="btn primary big" data-a="playMatch">🎮 ${t('Jouer')} le match</button><button class="btn big" data-a="simMatch">⚡ Simulation rapide</button></div>
   <div class="row center"><button class="btn small" data-a="nav" data-v="tactics">📋 ${t('Tactique')}</button><button class="btn small" data-a="nav" data-v="squad">👥 ${t('Effectif')}</button>
   <label class="inline">${t('Durée du match')} <select id="pmDur">${[3, 5, 8, 10, 15].map(m => `<option ${m === settings.duration ? 'selected' : ''} value="${m}">${m} min</option>`).join('')}</select></label></div></div>
   ${prematchExtras(f)}
   <div class="card"><h3>${t('Titulaires')}</h3><div class="xi">${lu.map((p, i) => `<span class="${p.fitness < 0.75 ? 'tired' : ''}"><i>${FORMATION_POS[st.clubs[st.userClub].tactics.formation][i]}</i> ${p.num}. ${esc(p.name)} <b class="${ovrCls(p.ovr)}">${p.ovr}</b></span>`).join('')}</div></div></div>`;
};

function prematchExtras(f) {
  const trip = C.nextTrip(st, f), rot = C.rotationAdvice(st);
  const tired = st.clubs[st.userClub].tactics.lineup.map(id => st.players[id]).filter(p => p && p.fitness < 0.8);
  let out = '';
  if (trip) out += `<div class="card"><h3>✈️ Déplacement ${esc(trip.toCity)} ${trip.flag}</h3><p>~${trip.km.toLocaleString('fr-FR')} km depuis Tunis · ~${trip.hours} h de vol · coût ${fmtMoney(trip.cost)} · fatigue du groupe −${Math.round(trip.fatigue * 100)} % après le match.</p></div>`;
  if (tired.length) out += `<div class="card"><h3>🔄 Rotation conseillée</h3><p>${tired.length} titulaire(s) fatigué(s) : ${tired.map(p => `${esc(p.name)} (${Math.round(p.fitness * 100)} %)`).join(', ')}.</p>
    ${rot.length ? `<p class="hint">Proposition : ${rot.map(c => `${esc(c.out.name)} → ${esc(c.in.name)}`).join(' · ')}</p><button class="btn primary small" data-a="rotate">Faire tourner l'effectif</button>` : '<p class="hint">Aucun remplaçant frais de niveau comparable sur le banc.</p>'}</div>`;
  return out;
}

// ------------------------------------------------------------------ effectif
VIEWS.squad = () => {
  const tab = args.tab || 'liste';
  const uc = st.clubs[st.userClub], tac = uc.tactics;
  let list = C.squad(st, st.userClub);
  const role = p => tac.lineup.includes(p.id) ? 'T' : tac.bench.includes(p.id) ? 'R' : p.role === 'jeune' || p.age <= 19 ? 'J' : 'X';
  const order = { GK: 0, DD: 1, DC: 2, DG: 3, MDC: 4, MC: 5, MD: 6, MG: 7, MOC: 8, AD: 9, AG: 10, BU: 11 };
  list.sort((a, b) => ('TRJX'.indexOf(role(a)) - 'TRJX'.indexOf(role(b))) || order[a.pos] - order[b.pos]);
  if (tab === 'contrats') list = list.slice().sort((a, b) => a.contractEnd - b.contractEnd);
  const tabs = [['liste', 'Joueurs'], ['vestiaire', '🗣️ Vestiaire'], ['contrats', t('Contrats')], ['entrainement', t('Entraînement')], ['stats', t('Statistiques')]];
  let body = '';
  if (tab === 'liste') body = `<p class="hint">T = ${t('Titulaires')} · R = ${t('Remplaçants')} · J = ${t('Jeunes')} · X = ${t('Réserve')}. Touchez un joueur pour sa fiche. <button class="btn small" data-a="autoXI">Composition automatique</button></p>
    <table class="tbl"><thead><tr><th></th><th>#</th><th>Joueur</th><th>Poste</th><th>Âge</th><th>Note</th><th>Pot.</th><th>${t('Forme')}</th><th>${t('Moral')}</th><th>Valeur</th><th></th></tr></thead><tbody>
    ${list.map(p => `<tr data-a="player" data-id="${p.id}" class="${p.injury ? 'inj' : ''}"><td><span class="role r${role(p)}">${role(p)}</span></td><td>${p.num}</td><td>${esc(p.name)}${tac.captain === p.id ? ' <b class="cap">C</b>' : ''}${p.loan && p.loan.to === st.userClub ? ' <em class="tag">prêt</em>' : ''}${p.listed ? ' <em class="tag">transférable</em>' : ''}</td><td>${p.pos}${p.pos2 ? '/' + p.pos2 : ''}</td><td>${p.age}</td><td><b class="${ovrCls(p.ovr)}">${p.ovr}</b></td><td>${p.pot}</td><td>${bar(p.fitness * 100, 100, 'sm')}</td><td>${bar(p.morale, 100, 'sm')}</td><td>${fmtShort(p.value)}</td><td>${p.injury ? '🩹' : p.suspended ? '🟥' : ''}</td></tr>`).join('')}</tbody></table>`;
  if (tab === 'contrats') body = `<table class="tbl"><thead><tr><th>Joueur</th><th>Note</th><th>Salaire</th><th>Fin</th><th>Rôle</th><th>Satisfaction</th><th></th></tr></thead><tbody>
    ${list.filter(p => !p.loan || p.loan.to !== st.userClub).map(p => `<tr><td>${esc(p.name)}</td><td>${p.ovr}</td><td>${fmtMoney(p.wage)}</td><td class="${p.contractEnd <= st.season ? 'neg' : ''}">juin ${p.contractEnd + 1}</td><td>${p.role}</td><td>${bar(p.happiness, 100, 'sm')}</td><td><button class="btn small" data-a="renew" data-id="${p.id}">${t('Prolonger')}</button></td></tr>`).join('')}</tbody></table>`;
  if (tab === 'entrainement') {
    const tr = st.training;
    body = `<div class="card"><h3>${t('Entraînement')} collectif</h3>
     <label>Intensité<select data-a="setTrain" data-k="intensity">${['Légère (récupération, moins de blessures)', 'Normale', 'Intense (progression +, blessures +)'].map((x, i) => `<option value="${i}" ${tr.intensity === i ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
     <label>Thème<select data-a="setTrain" data-k="focus">${[['equilibre', 'Équilibré'], ['physique', 'Physique'], ['technique', 'Technique'], ['tactique', 'Tactique (cohésion)'], ['attaque', 'Attaque'], ['defense', 'Défense'], ['recuperation', 'Récupération']].map(([k, v]) => `<option value="${k}" ${tr.focus === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
     <p class="hint">Qualité : adjoints ${Math.round(C.staffOf(st, 'assistant').reduce((a, s) => a + s.ability, 0) / Math.max(1, C.staffOf(st, 'assistant').length))}/100 · centre d'entraînement niv. ${uc.infra.training}. Risque de blessure par match : ${Math.round(C.injuryRisk(st, st.userClub) * 100)} %.</p></div>
     <div class="card"><h3>Programmes individuels</h3><table class="tbl"><tbody>${list.filter(p => p.age <= 25).map(p => `<tr><td>${esc(p.name)} (${p.age} ans, ${p.ovr}→${p.pot})</td><td><select data-a="setIndiv" data-id="${p.id}"><option value="">Selon le thème collectif</option>${[['pac', 'Vitesse'], ['sho', 'Tir'], ['pas', 'Passe'], ['dri', 'Dribble'], ['def', 'Défense'], ['phy', 'Physique'], ['gk', 'Gardien']].map(([k, v]) => `<option value="${k}" ${tr.individual[p.id] === k ? 'selected' : ''}>${v}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table></div>`;
  }
  if (tab === 'vestiaire') body = dressingHTML();
  if (tab === 'stats') body = `<table class="tbl"><thead><tr><th>Joueur</th><th>MJ</th><th>Buts</th><th>Passes D.</th><th>Note moy.</th><th>Clean sheets</th></tr></thead><tbody>${list.slice().sort((a, b) => b.stats.goals - a.stats.goals || b.stats.apps - a.stats.apps).map(p => `<tr data-a="player" data-id="${p.id}"><td>${esc(p.name)}</td><td>${p.stats.apps}</td><td>${p.stats.goals}</td><td>${p.stats.assists}</td><td>${p.stats.apps ? (p.stats.rsum / p.stats.apps).toFixed(1) : '-'}</td><td>${p.pos === 'GK' ? p.stats.cs : ''}</td></tr>`).join('')}</tbody></table>`;
  return `<div class="ph"><h2>${t('Effectif')} <small>(${list.length} joueurs, ${t('Joueurs fictifs').toLowerCase()})</small></h2><div class="tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-a="nav" data-v="squad" data-tab="${k}">${l}</button>`).join('')}</div></div>${body}`;
};
function moodCls(v) { return v >= 70 ? 'pos' : v >= 45 ? '' : 'neg'; }
function playShareText(p) { const sh = Dr.playingShare(p); return sh == null ? '—' : Math.round(sh * 100) + ' %'; }
function dressingHTML() {
  const room = C.dressingRoom(st), uc = st.clubs[st.userClub];
  const list = room.players.slice().sort((a, b) => a.happiness - b.happiness);
  return `<div class="card"><h3>Ambiance du vestiaire : <span class="${moodCls(room.mood)}">${room.label}</span> (${room.mood}/100)</h3>
   <div class="row wrap"><span>Cohésion ${bar(uc.cohesion)}</span><span>${room.unhappy.length} joueur(s) mécontent(s)</span>${room.crisis ? '<b class="neg">⚠️ Tensions : agissez avant que le groupe ne se fissure.</b>' : ''}</div>
   <h4>Réunion d'équipe ${room.meetingCd ? `<small>(possible dans ${room.meetingCd} match(s))</small>` : ''}</h4>
   <div class="row wrap">${Object.entries(Dr.MEETINGS).map(([k, l]) => `<button class="btn small" data-a="meeting" data-k="${k}" ${room.meetingCd ? 'disabled' : ''}>${l}</button>`).join('')}</div>
   <p class="hint">Motiver fonctionne dans un groupe serein, apaiser quand il est tendu, hausser le ton après de mauvais résultats.</p></div>
   <table class="tbl"><thead><tr><th>Joueur</th><th>Personnalité</th><th>Rôle</th><th>Temps de jeu</th><th>Satisfaction</th><th>Moral</th><th></th></tr></thead><tbody>
   ${list.map(p => `<tr><td data-a="player" data-id="${p.id}">${esc(p.name)}${uc.tactics.captain === p.id ? ' <b class="cap">C</b>' : ''}${p.listed === 'demande' ? ' <em class="tag neg">veut partir</em>' : ''}${p.promise ? ` <em class="tag">promesse (${Math.max(0, p.promise.left)} m.)</em>` : ''}</td>
     <td>${Dr.PERSONALITIES[Dr.personalityOf(p)].label}</td><td>${Dr.ROLE_LABEL[p.role] || p.role} <small>(${Math.round((Dr.ROLE_EXPECT[p.role] ?? 0.2) * 100)} %)</small></td>
     <td class="${Dr.playingTimeGap(p) < -0.15 ? 'neg' : ''}">${playShareText(p)}</td><td>${bar(p.happiness, 100, 'sm')}</td><td>${bar(p.morale, 100, 'sm')}</td>
     <td><button class="btn small" data-a="talk" data-id="${p.id}">💬 Discuter</button></td></tr>`).join('')}</tbody></table>
   <p class="hint">Temps de jeu = part des 8 derniers matchs (titulaire = 1, entré en jeu = ½). Entre parenthèses : l'attente liée au rôle.</p>`;
}
function talkModal(id) {
  const p = st.players[id]; if (!p) return;
  const kind = Dr.personalityOf(p), can = Dr.canTalk(p);
  const avg = p.stats.apps ? (p.stats.rsum / p.stats.apps).toFixed(1) : '—';
  const options = ['praise', 'demand', 'promise', 'reassure'].filter(k => k !== 'promise' || !p.promise);
  if (p.listed === 'demande') options.push('acceptTransfer', 'refuseTransfer');
  modal(`<h3>💬 Entretien avec ${esc(p.name)}</h3>
   <p>${Dr.PERSONALITIES[kind].label} · ${Dr.ROLE_LABEL[p.role] || p.role} · temps de jeu ${playShareText(p)} (attendu ${Math.round((Dr.ROLE_EXPECT[p.role] ?? 0.2) * 100)} %) · note moyenne ${avg}</p>
   <p>Satisfaction ${bar(p.happiness)} Moral ${bar(p.morale)}</p>
   ${p.promise ? `<p class="hint">🤝 Promesse en cours : ${Math.round(p.promise.share * 100)} % de titularisations, encore ${Math.max(0, p.promise.left)} match(s).</p>` : ''}
   ${!can && !p.listed ? '<p class="hint">Un entretien a eu lieu récemment : attendez quelques matchs.</p>' : ''}
   <div class="talk-opts">${options.map(k => `<button class="btn ${k.includes('Transfer') ? '' : 'small'}" data-a="doTalk" data-id="${p.id}" data-k="${k}" ${!can && !k.includes('Transfer') ? 'disabled' : ''}>${Dr.TALKS[k]}</button>`).join('')}</div>
   <div class="row end"><button class="btn ghost" data-a="closeModal">${t('Fermer')}</button></div>`);
}
function playerModal(id) {
  const p = st.players[id]; if (!p) return;
  const mine = p.clubId === st.userClub || (p.loan && p.loan.to === st.userClub);
  const tac = st.clubs[st.userClub].tactics;
  const a = p.attrs;
  const attr = (k, l) => `<span>${l}</span><b>${a[k]}</b>${bar(a[k])}`;
  modal(`<div class="pcard"><div class="phead"><div class="pnum">${p.num || ''}</div><div><h3>${esc(p.name)} <small>${p.nat} · ${p.age} ans · ${p.height} cm · pied ${p.foot.toLowerCase()}</small></h3>
   <p>${p.pos}${p.pos2 ? ' / ' + p.pos2 : ''} · ${esc(C.clubName(st, p.loan ? p.loan.to : p.clubId) || 'Libre')} · <b class="${ovrCls(p.ovr)}">${p.ovr}</b> (pot. ${mine ? p.pot : '~' + p.pot}) · ${fmtMoney(p.value)}</p>
   <p class="hint">Joueur fictif généré. ${Tx.AGENT_STYLES[Tx.agentOf(p)].label}${p.releaseClause ? ` · 🔓 clause libératoire ${fmtMoney(p.releaseClause)}` : ''} · Contrat jusqu'en juin ${p.contractEnd + 1} · ${fmtMoney(p.wage)}/mois · ${t('Moral')} ${Math.round(p.morale)} · ${t('Forme')} ${Math.round(p.fitness * 100)}%${mine ? ` · ${Dr.PERSONALITIES[Dr.personalityOf(p)].label} · satisfaction ${Math.round(p.happiness)} · temps de jeu ${playShareText(p)}` : ''}</p></div></div>
   <div class="attrs">${attr('pac', 'Vitesse')}${attr('sho', 'Tir')}${attr('pas', 'Passe')}${attr('dri', 'Dribble')}${attr('def', 'Défense')}${attr('phy', 'Physique')}${attr('gk', 'Gardien')}</div>
   ${p.injury ? `<p class="inj">🩹 ${p.injury.diagnosed ? esc(p.injury.name) + ' (' + p.injury.sev + ')' : 'Blessure (diagnostic en attente)'} — ${Math.ceil(p.injury.left)} sem.</p>` : ''}
   <p class="hint">Saison : ${p.stats.apps} MJ, ${p.stats.goals} buts, ${p.stats.assists} passes D.${p.career.length ? ' · Historique : ' + p.career.slice(-3).map(c => `${c.season} ${C.clubShort(st, c.club)} ${c.apps}MJ/${c.goals}b`).join(', ') : ''}</p>
   <div class="row wrap">${mine ? `
     <button class="btn small" data-a="setCaptain" data-id="${p.id}">${t('Capitaine')}</button>
     <button class="btn small" data-a="setNumber" data-id="${p.id}">N° de maillot</button>
     <button class="btn small" data-a="toggleList" data-id="${p.id}">${p.listed ? 'Retirer de la liste des transferts' : 'Placer sur la liste des transferts'}</button>
     <button class="btn small" data-a="renew" data-id="${p.id}">${t('Prolonger')}</button>
     ${p.clubId === st.userClub ? `<button class="btn small danger" data-a="release" data-id="${p.id}">Résilier</button>` : ''}
     <button class="btn small" data-a="setRole" data-id="${p.id}">Rôle : ${Dr.ROLE_LABEL[p.role] || p.role}</button>
     <button class="btn small primary" data-a="talk" data-id="${p.id}">💬 Discuter</button>
     ${p.clubId === st.userClub && !p.loan && p.age <= 23 ? `<button class="btn small" data-a="loanYouth" data-id="${p.id}">🔁 Prêter pour progresser</button>` : ''}
     ${tac.lineup.includes(p.id) ? '' : `<button class="btn small primary" data-a="toXI" data-id="${p.id}">Faire entrer dans le XI</button>`}`
    : `<button class="btn primary" data-a="offer" data-id="${p.id}">Faire une offre</button><button class="btn" data-a="offer" data-id="${p.id}" data-loan="1">Demander un prêt</button>`}
     <button class="btn ghost" data-a="closeModal">${t('Fermer')}</button></div></div>`, { wide: true });
}

// ------------------------------------------------------------------ tactique
VIEWS.tactics = () => {
  const tac = st.clubs[st.userClub].tactics, form = FORMATIONS[tac.formation], pos = FORMATION_POS[tac.formation];
  const pl = tac.lineup.map(id => st.players[id]);
  const sel = args.sel ?? null;
  const opts = (k, arr) => arr.map(([v, l]) => `<option value="${v}" ${String(tac[k]) === String(v) ? 'selected' : ''}>${l}</option>`).join('');
  return `<div class="ph"><h2>${t('Tactique')}</h2></div><div class="tac">
   <div class="pitch2d">${form.map(([x, y], i) => { const p = pl[i]; const row = { GK: 0, DD: 1, DC: 1, DG: 1, MDC: 2, MC: 3, MD: 3, MG: 3, MOC: 4, AD: 5, AG: 5, BU: 5 }[pos[i]]; return `<button class="dot ${sel === i ? 'sel' : ''} ${p && !C.available(p) ? 'bad' : ''}" style="left:${clamp((y + 34) / 68 * 100, 9, 91)}%;bottom:${3 + row * 16.5}%" data-a="tacSlot" data-i="${i}"><b>${p ? p.num : '?'}</b><small>${pos[i]} · ${p ? esc(p.last) : '—'}</small><i class="${p ? ovrCls(C.ovrOf(p, pos[i])) : ''}">${p ? C.ovrOf(p, pos[i]) : ''}</i></button>`; }).join('')}</div>
   <div class="tacside">
    <p class="hint">${sel != null ? `Choisissez le joueur pour le poste <b>${pos[sel]}</b> :` : 'Touchez un poste sur le terrain pour changer le joueur.'}</p>
    ${sel != null ? `<div class="pick">${C.squad(st, st.userClub).filter(p => C.available(p)).sort((a, b) => C.ovrOf(b, pos[sel]) - C.ovrOf(a, pos[sel])).map(p => `<button data-a="tacPick" data-id="${p.id}" data-i="${sel}">${p.num}. ${esc(p.name)} <i>${p.pos}</i> <b class="${ovrCls(C.ovrOf(p, pos[sel]))}">${C.ovrOf(p, pos[sel])}</b>${tac.lineup.includes(p.id) ? ' ✓' : ''}</button>`).join('')}</div>` : ''}
    <label>${t('Formation')}<select data-a="tacSet" data-k="formation">${Object.keys(FORMATIONS).map(f => `<option ${f === tac.formation ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
    <label>${t('Mentalité')}<select data-a="tacSet" data-k="mentality">${opts('mentality', [[-2, 'Très défensive'], [-1, 'Défensive'], [0, 'Équilibrée'], [1, 'Offensive'], [2, 'Très offensive']])}</select></label>
    <label>${t('Pressing')}<select data-a="tacSet" data-k="pressing">${opts('pressing', [[0, 'Bas'], [1, 'Moyen'], [2, 'Haut']])}</select></label>
    <label>${t('Largeur')}<select data-a="tacSet" data-k="width">${opts('width', [[0, 'Étroite'], [1, 'Normale'], [2, 'Large']])}</select></label>
    <label>${t('Ligne défensive')} / profondeur<select data-a="tacSet" data-k="line">${opts('line', [[-1, 'Basse'], [0, 'Normale'], [1, 'Haute']])}</select></label>
    <h4>Coups de pied arrêtés</h4>
    ${['penalty', 'freekick', 'corner'].map(k => `<label>${{ penalty: 'Tireur de penalty', freekick: 'Coups francs', corner: 'Corners' }[k]}<select data-a="taker" data-k="${k}">${pl.filter(Boolean).map(p => `<option value="${p.id}" ${tac.takers[k] === p.id ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}</select></label>`).join('')}
    <h4>Consignes individuelles</h4>
    ${pl.filter(Boolean).filter(p => p.pos !== 'GK').slice(0, 10).map(p => `<label class="inline">${esc(p.last)}<select data-a="instr" data-id="${p.id}">${[['', 'Standard'], ['def', 'Rester en défense'], ['att', 'Monter en attaque'], ['run', 'Appels en profondeur'], ['mark', 'Marquage serré']].map(([v, l]) => `<option value="${v}" ${(tac.instr[p.id] || '') === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>`).join('')}
    <h4>${t('Remplaçants')}</h4><p class="hint">${tac.bench.map(id => st.players[id]).filter(Boolean).map(p => `${p.num}. ${esc(p.last)}`).join(' · ')}</p>
    <button class="btn" data-a="autoXI">Composition automatique</button>
   </div></div>`;
};

// ------------------------------------------------------------------ transferts
VIEWS.transfers = () => {
  const tab = args.tab || 'marche';
  const f = args.f || {};
  const tabs = [['marche', t('Marché des transferts')], ['neg', t('Mes offres')], ['recues', t('Offres reçues')], ['vente', 'Mes joueurs à vendre'], ['hist', t('Historique')]];
  let body = '';
  if (tab === 'marche') {
    const list = C.marketList(st, f);
    body = `<div class="filters">
     <select id="fPos"><option value="ALL">Tous postes</option>${['G', 'D', 'M', 'A'].map(g => `<option value="${g}" ${f.pos === g ? 'selected' : ''}>${{ G: 'Gardiens', D: 'Défenseurs', M: 'Milieux', A: 'Attaquants' }[g]}</option>`).join('')}${Object.keys(POS_GROUP).map(p => `<option ${f.pos === p ? 'selected' : ''}>${p}</option>`).join('')}</select>
     <input id="fAge" type="number" placeholder="Âge max" value="${f.ageMax || ''}"><input id="fOvr" type="number" placeholder="Note min" value="${f.ovrMin || ''}"><input id="fPot" type="number" placeholder="Potentiel min" value="${f.potMin || ''}">
     <input id="fPrice" type="number" placeholder="Prix max (DT)" value="${f.priceMax || ''}"><input id="fWage" type="number" placeholder="Salaire max" value="${f.wageMax || ''}">
     <select id="fNat"><option value="">Toutes nationalités</option><option value="TUN" ${f.nat === 'TUN' ? 'selected' : ''}>Tunisiens</option><option value="ETR" ${f.nat === 'ETR' ? 'selected' : ''}>Étrangers</option></select>
     <select id="fCon"><option value="">Tout contrat</option><option value="fin" ${f.contract === 'fin' ? 'selected' : ''}>Fin de contrat cette saison</option></select>
     <label class="inline"><input id="fFree" type="checkbox" ${f.free ? 'checked' : ''}> Libres</label><input id="fQ" placeholder="Nom" value="${esc(f.q || '')}">
     <button class="btn small primary" data-a="filter">Rechercher</button></div>
     <p class="hint">Mercato : <b>${st.window ? 'ouvert (' + st.window + ')' : 'fermé — seuls les joueurs libres peuvent signer'}</b> · Budget : ${fmtMoney(st.clubs[st.userClub].budget)} · Masse salariale : ${fmtMoney(C.squad(st, st.userClub).reduce((a, p) => a + p.wage, 0))} / plafond ${fmtMoney(C.wageBudget(st) * 1.25)} · Les notes sont des estimations (±${list[0]?.est.range ?? 0}) selon vos recruteurs.</p>
     <table class="tbl"><thead><tr><th>Joueur</th><th>Club</th><th>Poste</th><th>Âge</th><th>Note</th><th>Pot.</th><th>Prix demandé</th><th>Salaire</th><th>Contrat</th></tr></thead><tbody>
     ${list.map(({ p, est, price }) => `<tr data-a="player" data-id="${p.id}"><td>${esc(p.name)} <small>${p.nat}</small></td><td>${p.clubId ? esc(C.clubShort(st, p.clubId)) : '<em class="tag">libre</em>'}</td><td>${p.pos}</td><td>${p.age}</td><td><b class="${ovrCls(est.ovr)}">${est.ovr}</b></td><td>${est.pot}</td><td>${p.clubId ? fmtShort(price) : '—'}</td><td>${fmtShort(p.wage)}</td><td>${p.contractEnd + 1}</td></tr>`).join('')}</tbody></table>`;
  }
  if (tab === 'neg') body = st.negotiations.length ? `<table class="tbl"><thead><tr><th>Joueur</th><th>Type</th><th>Offre</th><th>Statut</th></tr></thead><tbody>${st.negotiations.slice().reverse().map(n => { const p = st.players[n.pid]; return `<tr><td>${esc(p?.name || '?')}</td><td>${n.type === 'loan' ? 'Prêt' : n.swap ? 'Échange' : 'Achat'}</td><td>${fmtShort(n.fee)} + ${fmtShort(n.wage)}/mois${n.agentFee ? ` · agent ${fmtShort(n.agentFee)}` : ''}${n.releaseClause ? ` · clause ${fmtShort(n.releaseClause)}` : ''}${n.sellOn ? ` · ${n.sellOn}% revente` : ''}${n.bonus ? ` · bonus ${fmtShort(n.bonus)}` : ''}${n.round || n.playerRound ? ` <small>(tour ${Math.max(n.round || 0, n.playerRound || 0) + 1})</small>` : ''}</td><td><b>${n.status}</b><div class="neg-actions">${n.status === 'accord' ? `<button class="btn small primary" data-a="confirmTx" data-id="${n.id}">Confirmer</button>`
      : n.status === 'contre-offre' ? `<button class="btn small primary" data-a="acceptClub" data-id="${n.id}">Accepter ${fmtShort(n.counter)}</button> <button class="btn small" data-a="offer" data-id="${n.pid}">Négocier</button>`
      : n.status === 'contre-offre joueur' ? `<button class="btn small primary" data-a="acceptAgent" data-id="${n.id}">Accepter ses conditions</button> <button class="btn small" data-a="offer" data-id="${n.pid}">Négocier</button>` : ''}</div><small>${esc(n.msg || '')}</small></td></tr>`; }).join('')}</tbody></table>` : '<p class="hint">Aucune négociation. Ouvrez la fiche d\'un joueur du marché pour faire une offre.</p>';
  if (tab === 'recues') { const os = st.offers.filter(o => o.status === 'en attente'); body = os.length ? `<table class="tbl"><tbody>${os.map(o => { const p = st.players[o.pid]; return `<tr><td>${crest(o.club, 22)} ${esc(C.clubName(st, o.club))}</td><td>${esc(p?.name)} (${p?.ovr}, valeur ${fmtShort(p?.value || 0)})</td><td>${o.type === 'loan' ? 'Prêt' : fmtMoney(o.fee)}</td><td><button class="btn small primary" data-a="ansOffer" data-id="${o.id}" data-y="1">Accepter</button><button class="btn small" data-a="ansOffer" data-id="${o.id}" data-c="1">Contre-offre</button><button class="btn small ghost" data-a="ansOffer" data-id="${o.id}">Refuser</button></td></tr>`; }).join('')}</tbody></table>` : '<p class="hint">Aucune offre en attente. Placez des joueurs sur la liste des transferts pour attirer des offres.</p>'; }
  if (tab === 'vente') body = `<table class="tbl"><tbody>${C.squad(st, st.userClub).filter(p => p.clubId === st.userClub).sort((a, b) => b.value - a.value).map(p => `<tr><td>${esc(p.name)}</td><td>${p.ovr}</td><td>${fmtShort(p.value)}</td><td><button class="btn small" data-a="toggleList" data-id="${p.id}">${p.listed ? '✓ À vendre' : 'Mettre en vente'}</button></td></tr>`).join('')}</tbody></table>`;
  if (tab === 'hist') body = st.txLog.length ? `<table class="tbl"><tbody>${st.txLog.slice().reverse().map(x => `<tr><td>${x.season}</td><td>${esc(x.name)}</td><td>${x.type}</td><td>${esc(C.clubShort(st, x.from) || 'libre')} → ${esc(x.to ? C.clubShort(st, x.to) : 'libre')}</td><td>${fmtMoney(x.fee)}</td></tr>`).join('')}</tbody></table>` : '<p class="hint">Aucune transaction.</p>';
  return `<div class="ph"><h2>${t('Transferts')}</h2><div class="tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-a="nav" data-v="transfers" data-tab="${k}">${l}</button>`).join('')}</div></div>${body}`;
};
function offerModal(pid, loan, presetFee) {
  const p = st.players[pid];
  const ask = C.askingPrice(st, p), dem = C.wageDemand(st, p, 'rotation');
  // Négociation en cours : on repart de la dernière offre et des exigences connues.
  const prev = st.negotiations.find(n => n.pid === pid && (n.status === 'contre-offre' || n.status === 'contre-offre joueur'));
  const terms = prev?.status === 'contre-offre joueur' ? prev.terms : null;
  const agent = Tx.AGENT_STYLES[Tx.agentOf(p)];
  const pre = (k, d) => terms && terms[k] != null ? terms[k] : prev && prev[k] != null ? prev[k] : d;
  const mine = C.squad(st, st.userClub).filter(x => x.clubId === st.userClub);
  modal(`<h3>${loan ? 'Demande de prêt' : 'Offre'} — ${esc(p.name)}</h3>
   <p class="hint">${p.clubId ? `Prix demandé estimé : <b>${fmtMoney(ask)}</b> · ` : 'Joueur libre · '}Salaire souhaité ~ <b>${fmtMoney(dem)}</b>/mois · ${agent.label} · Trésorerie : ${fmtMoney(st.clubs[st.userClub].budget)}</p>
   ${p.releaseClause && p.clubId && !loan ? `<p class="hint">🔓 Clause libératoire : <b>${fmtMoney(p.releaseClause)}</b> — en la payant, ${esc(C.clubName(st, p.clubId))} ne peut pas refuser. <button class="btn small" type="button" id="oPayClause">Payer la clause</button></p>` : ''}
   ${prev ? `<p class="hint">🔁 Négociation en cours : ${esc(prev.msg || '')}</p>` : ''}
   <div class="form2">
   ${loan ? `<label>Frais de prêt (DT)<input id="oFee" type="number" value="0"></label><label>Part du salaire payée par vous<select id="oShare"><option value="1">100 %</option><option value="0.75">75 %</option><option value="0.5">50 %</option></select></label><label>Option d'achat (DT, 0 = sans)<input id="oOpt" type="number" value="0"></label>`
    : `<label>Indemnité de transfert (DT)<input id="oFee" type="number" value="${presetFee || (prev?.status === 'contre-offre' ? prev.counter : prev ? prev.fee : (p.clubId ? Math.round(ask * 0.9 / 1000) * 1000 : 0))}"></label>
      <label>Bonus (DT, objectifs)<input id="oBonus" type="number" value="0"></label><label>% à la revente<input id="oSell" type="number" min="0" max="50" value="0"></label>
      <label>Échange (joueur inclus)<select id="oSwap"><option value="">Aucun</option>${mine.map(m => `<option value="${m.id}">${esc(m.name)} (${fmtShort(m.value)})</option>`).join('')}</select></label>`}
   <label>Salaire mensuel (DT)<input id="oWage" type="number" value="${pre('wage', dem)}"></label>
   <label>Prime à la signature (DT)<input id="oSign" type="number" value="${pre('signing', loan ? 0 : Math.round(dem * 3))}"></label>
   ${loan ? '' : `<label>Commission d'agent (DT)<input id="oAgent" type="number" value="${pre('agentFee', 0)}"></label>
   <label>Clause libératoire (DT, 0 = aucune)<input id="oClause" type="number" value="${pre('releaseClause', 0)}"></label>`}
   <label>Durée du contrat<select id="oYears">${[1, 2, 3, 4, 5].map(y => `<option ${y === 3 ? 'selected' : ''}>${y}</option>`).join('')}</select></label>
   <label>Rôle dans l'équipe<select id="oRole"><option value="cle">Joueur clé</option><option value="titulaire">Titulaire</option><option value="rotation" selected>Rotation</option><option value="espoir">Espoir</option></select></label></div>
   <div class="row end"><button class="btn ghost" data-a="closeModal">${t('Annuler')}</button><button class="btn primary" id="oSend">Envoyer l'offre</button></div>`, { wide: true });
  if ($('#oPayClause')) $('#oPayClause').onclick = () => { $('#oFee').value = p.releaseClause; toast('Indemnité fixée au montant de la clause.', 'ok'); };
  $('#oSend').onclick = () => {
    const v = id => Number(($(id) || {}).value || 0);
    const offer = loan ? { type: 'loan', loanFee: v('#oFee'), fee: 0, wageShare: v('#oShare') || 1, option: v('#oOpt'), wage: v('#oWage'), signing: v('#oSign'), years: 1, role: $('#oRole').value }
      : { type: 'achat', fee: v('#oFee'), bonus: v('#oBonus'), sellOn: clamp(v('#oSell'), 0, 50), swap: $('#oSwap').value || null, wage: v('#oWage'), signing: v('#oSign'), agentFee: v('#oAgent'), releaseClause: v('#oClause'), years: v('#oYears'), role: $('#oRole').value };
    if (offer.wage <= 0) return toast('Indiquez un salaire.', 'err');
    const r = C.makeOffer(st, pid, offer);
    if (!r.ok) return toast(r.msg, 'err');
    // Joueur libre, clause payée ou discussion déjà au stade de l'agent : réponse immédiate.
    if (!p.clubId || r.n.step === 'joueur') C.respondNow(st, r.n.id);
    closeModal(); save(); toast(r.n.status === 'accord' ? r.n.msg : r.msg, r.n.status === 'refusée' ? 'err' : 'ok');
    go('transfers', { tab: 'neg' });
  };
}

// ------------------------------------------------------------------ staff
VIEWS.youth = () => {
  const uc = st.clubs[st.userClub], q = C.scoutQualityOf(st);
  const u19 = C.academy(st).sort((a, b) => b.pot - a.pot);
  const sc = st.youthScouting, prospects = st.prospects || [];
  const est = p => p.scoutedRange || Y.potentialRange(p.pot, Math.min(1, q + 0.25), p.id.charCodeAt(2) + p.id.charCodeAt(3));
  const loans = C.loanedOut(st);
  return `<div class="ph"><h2>🎓 Centre de formation</h2></div>
   <div class="card"><div class="row wrap"><span>Académie niveau <b>${uc.infra.academy}</b></span><span>Responsable de la formation <b>${Math.round(C.staffOf(st, 'academy').reduce((a, s) => Math.max(a, s.ability), 0))}/100</b></span><span>Recruteurs : précision <b>${Math.round(q * 100)} %</b></span><span>U19 <b>${u19.length}/${Y.ACADEMY_MAX}</b> · bourses ${fmtMoney(u19.reduce((a, p) => a + (p.wage || 300), 0))}/mois</span></div>
   <p class="hint">La qualité des jeunes dépend du niveau de l'académie (Infrastructures) et du responsable de la formation (Staff). Les recruteurs déterminent la précision du potentiel estimé.</p></div>
   <div class="card"><h3>🔎 Détection régionale</h3>
   ${sc ? `<p>Mission en cours : <b>${Y.REGIONS[sc.region].label}</b> — encore ${sc.weeksLeft} semaine(s).</p>` : '<p class="hint">Envoyez vos recruteurs dans une région : chaque semaine de mission peut révéler un talent.</p>'}
   <div class="regions">${Object.entries(Y.REGIONS).map(([k, r]) => `<button class="btn region" data-a="scoutRegion" data-k="${k}" ${sc ? 'disabled' : ''}><b>${r.label}</b><small>${fmtMoney(r.cost)} · ${r.weeks} sem. · profils : ${r.pos.slice(0, 3).join(', ')}${k === 'diaspora' ? ' · talents rares, mission chère' : ''}</small></button>`).join('')}</div></div>
   <div class="card"><h3>Talents détectés</h3>${prospects.length ? `<table class="tbl"><thead><tr><th>Joueur</th><th>Âge</th><th>Poste</th><th>Note</th><th>Potentiel estimé</th><th>Région</th><th>Prime</th><th></th></tr></thead><tbody>${prospects.map(x => `<tr><td>${esc(x.player.name)}</td><td>${x.player.age}</td><td>${x.player.pos}</td><td>${x.player.ovr}</td><td><b>${x.range.low}–${x.range.high}</b></td><td>${esc(Y.REGIONS[x.region].label.split(' (')[0])}</td><td>${fmtMoney(x.fee)}</td><td><button class="btn small primary" data-a="signProspect" data-id="${x.id}">Signer</button> <button class="btn small ghost" data-a="rejectProspect" data-id="${x.id}">Écarter</button></td></tr>`).join('')}</tbody></table><p class="hint">Un talent non signé est perdu après une dizaine de semaines.</p>` : '<p class="hint">Aucun talent pour l\'instant.</p>'}</div>
   <div class="card"><h3>U19</h3>${u19.length ? `<table class="tbl"><thead><tr><th>Joueur</th><th>Âge</th><th>Poste</th><th>Note</th><th>Potentiel estimé</th><th></th></tr></thead><tbody>${u19.map(p => { const r = est(p); return `<tr><td data-a="player" data-id="${p.id}">${esc(p.name)}</td><td>${p.age}</td><td>${p.pos}</td><td><b class="${ovrCls(p.ovr)}">${p.ovr}</b></td><td>${r.low}–${r.high}</td><td class="neg-actions"><button class="btn small primary" data-a="promoteYouth" data-id="${p.id}">Promouvoir</button><button class="btn small" data-a="loanYouth" data-id="${p.id}">Prêter</button><button class="btn small ghost" data-a="releaseYouth" data-id="${p.id}">Libérer</button></td></tr>`; }).join('')}</tbody></table>` : '<p class="hint">Le centre de formation est vide.</p>'}</div>
   <div class="card"><h3>Prêts de développement</h3>${loans.length ? `<table class="tbl"><thead><tr><th>Joueur</th><th>Club d'accueil</th><th>Temps de jeu</th><th>Progression</th></tr></thead><tbody>${loans.map(p => `<tr><td>${esc(p.name)} (${p.age} ans)</td><td>${esc(C.clubName(st, p.loan.to))}</td><td>~${Math.round((p.loanPlaying ?? 0.5) * 100)} %</td><td>${p.loanStartOvr ?? p.ovr} → <b>${p.ovr}</b></td></tr>`).join('')}</tbody></table>` : '<p class="hint">Aucun joueur prêté. Un jeune qui joue régulièrement en prêt progresse plus vite qu\'à l\'entraînement.</p>'}</div>`;
};
function loanModal(pid) {
  const p = st.players[pid]; const targets = C.loanTargetsFor(st, pid);
  modal(`<h3>🔁 Prêter ${esc(p.name)} (${p.age} ans, ${p.ovr})</h3><p class="hint">Prêt jusqu'à la fin de saison, salaire pris en charge par le club d'accueil. Plus le temps de jeu est élevé, plus il progresse.</p>
   <div class="talk-opts">${targets.map(t => `<button class="btn" data-a="doLoan" data-id="${p.id}" data-club="${t.club.id}"><b>${esc(t.club.name)}</b><br><small>temps de jeu attendu ~${Math.round(t.playing * 100)} %</small></button>`).join('')}</div>
   <div class="row end"><button class="btn ghost" data-a="closeModal">${t('Annuler')}</button></div>`);
}
VIEWS.staff = () => {
  const tab = args.tab || 'equipe';
  const roleName = id => STAFF_ROLES.find(r => r.id === id)?.fr;
  const tabs = [['equipe', 'Organigramme'], ['marche', 'Recruter']];
  let body;
  if (tab === 'equipe') body = STAFF_ROLES.map(R => { const list = C.staffOf(st, R.id); return `<div class="srow"><h4>${R.fr} <small>(${list.length}/${R.count})</small></h4>${list.map(s => `<div class="staff"><b>${esc(s.name)}</b> <span>${s.age} ans</span> ${bar(s.ability)} <b>${s.ability}</b>${s.spec ? ` <em class="tag">${s.spec}</em>` : ''} <span>${fmtShort(s.wage)}/mois · fin ${s.contractEnd + 1}</span><button class="btn small" data-a="staffRenew" data-id="${s.id}">${t('Prolonger')}</button><button class="btn small danger" data-a="staffFire" data-id="${s.id}">${t('Licencier')}</button></div>`).join('') || '<p class="neg">Poste vacant — effets du poste perdus !</p>'}</div>`; }).join('')
    + `<p class="hint">Effets : entraîneur → force de l'équipe et moral ; adjoints → progression ; préparateur physique → récupération & prévention ; entraîneur des gardiens → progression des gardiens ; directeur sportif → prix négociés ; directeur financier → sponsors & boutique ; médecin & kinés → durée des blessures et rechutes ; recruteurs → précision des notes du marché ; centre de formation → qualité des jeunes. Staff fictif.</p>`;
  else body = `<table class="tbl"><thead><tr><th>Candidat</th><th>Poste</th><th>Niveau</th><th>Réputation</th><th>Demande</th><th></th></tr></thead><tbody>${st.staffMarket.slice().sort((a, b) => a.role.localeCompare(b.role) || b.ability - a.ability).map(s => `<tr><td>${esc(s.name)} <small>${s.age} ans</small>${s.spec ? ` <em class="tag">${s.spec}</em>` : ''}</td><td>${roleName(s.role)}</td><td>${bar(s.ability)} ${s.ability}</td><td>${s.rep}</td><td>${fmtShort(Math.round(s.wage * s.demand))}/mois</td><td><button class="btn small primary" data-a="staffHire" data-id="${s.id}">Négocier</button></td></tr>`).join('')}</tbody></table>`;
  return `<div class="ph"><h2>${t('Staff')}</h2><div class="tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-a="nav" data-v="staff" data-tab="${k}">${l}</button>`).join('')}</div></div>${body}`;
};

// ------------------------------------------------------------------ médical
VIEWS.medical = () => {
  const sq = C.squad(st, st.userClub);
  const inj = sq.filter(p => p.injury), uc = st.clubs[st.userClub];
  const doc = C.staffOf(st, 'doctor')[0];
  return `<div class="ph"><h2>${t('Médical')}</h2></div>
   <div class="card"><p>Médecin-chef : <b>${doc ? esc(doc.name) + ' (' + doc.ability + '/100)' : 'aucun — diagnostics retardés !'}</b> · Kinés : ${C.staffOf(st, 'physio').length} · Centre médical niv. ${uc.infra.medical} · Risque de blessure/match : <b>${Math.round(C.injuryRisk(st, st.userClub) * 100)} %</b></p></div>
   <h3>Blessés (${inj.length})</h3>${inj.length ? `<table class="tbl"><thead><tr><th>Joueur</th><th>${t('Diagnostic')}</th><th>Gravité</th><th>Durée restante</th><th>Phase</th><th>Rechute</th><th>${t('Traitement')}</th></tr></thead><tbody>${inj.map(p => `<tr><td>${esc(p.name)}</td><td>${p.injury.diagnosed ? esc(p.injury.name) : `<button class="btn small" data-a="exam" data-id="${p.id}">Examen</button>`}</td><td>${p.injury.sev}</td><td>~${Math.ceil(p.injury.left)} sem.</td><td>${p.injury.phase}</td><td>${Math.round(p.injury.relapse * ({ standard: 1, intensif: 1.6, prudent: 0.4 }[p.injury.treatment]) * 100)} %</td><td><select data-a="treat" data-id="${p.id}">${[['standard', 'Repos & soins standard'], ['intensif', 'Rééducation intensive (25 000 DT, +35 % vitesse, rechute ×1,6)'], ['prudent', 'Retour prudent (5 000 DT, plus lent, rechute ×0,4)']].map(([k, l]) => `<option value="${k}" ${p.injury.treatment === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td></tr>`).join('')}</tbody></table>` : '<p class="hint">Aucun blessé. 👍</p>'}
   <h3>Charge & fatigue</h3><table class="tbl"><thead><tr><th>Joueur</th><th>${t('Forme')}</th><th>Avis du staff</th></tr></thead><tbody>${sq.filter(p => !p.injury).sort((a, b) => a.fitness - b.fitness).slice(0, 12).map(p => `<tr><td>${esc(p.name)}</td><td>${bar(p.fitness * 100, 100, 'sm')} ${Math.round(p.fitness * 100)}%</td><td>${p.fitness < 0.7 ? '⚠ Repos conseillé (risque accru)' : p.fitness < 0.85 ? 'Gérer le temps de jeu' : 'Apte'}</td></tr>`).join('')}</tbody></table>
   <p class="hint">Les blessures restent imprévisibles : le staff et les installations réduisent la durée et le risque sans les supprimer.</p>`;
};

// ------------------------------------------------------------------ finances
VIEWS.finances = () => {
  const uc = st.clubs[st.userClub], fs = C.financeSummary(st);
  const cats = Object.entries(fs.by).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...cats.map(([, v]) => Math.abs(v)));
  const wages = C.squad(st, st.userClub).reduce((a, p) => a + p.wage, 0), staffW = Object.values(st.staff).reduce((a, s) => a + s.wage, 0);
  return `<div class="ph"><h2>${t('Finances')}</h2></div>
   <div class="grid3"><div class="card"><h4>${t('Trésorerie')}</h4><div class="big ${uc.budget < 0 ? 'neg' : ''}">${fmtMoney(uc.budget)}</div><small>Dette : ${fmtMoney(uc.debt)}</small></div>
   <div class="card"><h4>Résultat ${st.season}-${st.season + 1}</h4><div class="big ${fs.net < 0 ? 'neg' : 'pos'}">${fmtMoney(fs.net)}</div><small>${t('Revenus')} ${fmtShort(fs.inc)} · ${t('Dépenses')} ${fmtShort(-fs.exp)}</small></div>
   <div class="card"><h4>${t('Masse salariale')}</h4><div class="big">${fmtShort(wages + staffW)}/mois</div><small>Joueurs ${fmtShort(wages)} · Staff ${fmtShort(staffW)} · Plafond joueurs ${fmtShort(C.wageBudget(st) * 1.25)}</small></div></div>
   <div class="card"><h3>Rapport par poste</h3>${cats.map(([k, v]) => `<div class="hbar"><span>${k}</span><i class="${v < 0 ? 'neg' : 'pos'}" style="width:${Math.abs(v) / max * 70}%"></i><b>${fmtShort(v)}</b></div>`).join('')}</div>
   <div class="grid2"><div class="card"><h3>Billetterie</h3><label>Prix des billets<select data-a="ticket">${['Populaire (affluence +, recette/billet −)', 'Normal', 'Élevé (recette +, satisfaction −)'].map((x, i) => `<option value="${i}" ${st.ticketPrice === i ? 'selected' : ''}>${x}</option>`).join('')}</select></label>
     <label>Primes de victoire<select data-a="winBonus">${['Faibles', 'Normales', 'Élevées (moral +)'].map((x, i) => `<option value="${i}" ${st.winBonus === i ? 'selected' : ''}>${x}</option>`).join('')}</select></label></div>
    <div class="card"><h3>Banque</h3><p class="hint">Emprunt sur 12 mois, taux selon l'endettement. Soldes négatifs : ${st.settingsGame.allowDebt ? 'autorisés' : 'interdits'}.</p><div class="row wrap">${[500000, 1000000, 2000000].map(a => `<button class="btn small" data-a="loan" data-amt="${a}">Emprunter ${fmtShort(a)}</button>`).join('')}</div>
    <label class="inline"><input type="checkbox" data-a="allowDebt" ${st.settingsGame.allowDebt ? 'checked' : ''}> Autoriser le découvert (confiance −)</label></div></div>
   <div class="card"><h3>Dernières opérations</h3><table class="tbl"><tbody>${st.ledger.slice(-25).reverse().map(l => `<tr><td>${l.s}</td><td>${esc(l.label)}</td><td>${l.cat}</td><td class="${l.a < 0 ? 'neg' : 'pos'}">${fmtMoney(l.a)}</td></tr>`).join('')}</tbody></table></div>`;
};

// ------------------------------------------------------------------ infrastructures
VIEWS.infra = () => {
  const uc = st.clubs[st.userClub];
  const eff = { stadium: `Capacité ${Math.round(uc.capacity * (0.6 + uc.infra.stadium * 0.1)).toLocaleString('fr-FR')} places utilisables`, pitch: 'Qualité du jeu, moins de blessures', lights: 'Matchs en nocturne, droits TV (niv. 3+)', training: 'Progression des joueurs', academy: 'Qualité et nombre des jeunes', medical: 'Récupération et prévention' };
  return `<div class="ph"><h2>${t('Infrastructures')}</h2></div><div class="grid3">${INFRA.map(I => { const lv = uc.infra[I.id], c = st.construction.find(x => x.id === I.id); return `<div class="card infra"><h4>${I.fr}</h4><div class="stars">${'★'.repeat(lv)}${'☆'.repeat(5 - lv)}</div><p class="hint">${eff[I.id]}</p>${c ? `<p>🏗 Travaux en cours : ${c.left} sem.</p>` : lv < 5 ? `<button class="btn small primary" data-a="upgrade" data-id="${I.id}">${t('Améliorer')} — ${fmtShort(I.cost * lv)}</button>` : '<p>Niveau maximal</p>'}</div>`; }).join('')}</div>
   <div class="card"><h3>${t('Supporters')}</h3><div class="kv"><span>${t('Satisfaction')}</span><b>${bar(uc.fans.sat)} ${Math.round(uc.fans.sat)}%</b><span>Ambiance</span><b>${uc.fans.sat > 75 ? 'Bouillante 🔥' : uc.fans.sat > 50 ? 'Bonne' : uc.fans.sat > 30 ? 'Tendue' : 'Hostile'}</b><span>Base de supporters</span><b>${Math.round(uc.fans.base * 100)}%</b><span>Pression médiatique</span><b>${st.president.trust < 35 ? 'Forte' : st.president.trust < 60 ? 'Modérée' : 'Faible'}</b></div></div>`;
};

// ------------------------------------------------------------------ compétitions / classements
function tableHTML(rows, hl = st.userClub, zones = {}) {
  return `<table class="tbl std"><thead><tr><th>#</th><th>Club</th><th>J</th><th>V</th><th>N</th><th>D</th><th>BP</th><th>BC</th><th>Diff</th><th>Pts</th><th>Forme</th></tr></thead><tbody>${rows.map((r, i) => `<tr class="${r.id === hl ? 'me' : ''} ${zones[i] || ''}"><td>${i + 1}</td><td>${crest(r.id, 18)} ${esc(r.name)}</td><td>${r.p}</td><td>${r.w}</td><td>${r.d}</td><td>${r.l}</td><td>${r.gf}</td><td>${r.ga}</td><td>${r.gf - r.ga}</td><td><b>${r.pts}</b></td><td class="form">${r.form.slice(-5).map(x => `<i class="f${x}">${x}</i>`).join('')}</td></tr>`).join('')}</tbody></table>`;
}
VIEWS.tables = () => {
  const tab = args.tab || 'L1';
  const z1 = { 0: 'z-cl', 1: 'z-cl', 2: 'z-cc', 13: 'z-dn', 14: 'z-dn', 15: 'z-dn' }, z2 = { 0: 'z-up', 1: 'z-up', 2: 'z-up' };
  let body = '';
  if (tab === 'L1') body = tableHTML(C.leagueTable(st, 'L1'), st.userClub, z1) + `<p class="hint legend"><i class="z-cl"></i> Ligue des Champions CAF <i class="z-cc"></i> Coupe de la Confédération (+ vainqueur de coupe) <i class="z-dn"></i> Relégation (nombre à confirmer pour 2026-27). Départage : points, différence, buts marqués (règlement LNFP à confirmer).</p>`;
  if (tab === 'L2') body = '<p class="hint">Ligue 2 : poule unique simplifiée (le format réel comporte deux groupes) — liste de clubs provisoire.</p>' + tableHTML(C.leagueTable(st, 'L2'), st.userClub, z2);
  if (tab === 'buteurs') body = `<table class="tbl"><thead><tr><th>#</th><th>Joueur (fictif)</th><th>Club</th><th>Buts</th><th>Passes D.</th></tr></thead><tbody>${C.topScorers(st).map((p, i) => `<tr class="${p.clubId === st.userClub ? 'me' : ''}"><td>${i + 1}</td><td>${esc(p.name)}</td><td>${esc(C.clubShort(st, p.clubId))}</td><td><b>${p.stats.goals}</b></td><td>${p.stats.assists}</td></tr>`).join('')}</tbody></table>`;
  if (tab === 'cal') { const mine = st.fixtures.filter(f => (f.h === st.userClub || f.a === st.userClub) && !f.bye); const order = f => { for (let i = 0; i < st.slots.length; i++) if (C.slotFixtures(st, i).includes(f)) return i; return 999; };
    body = `<table class="tbl"><tbody>${mine.map(f => ({ f, i: f.comp === 'L1' || f.comp === 'L2' ? st.slots.findIndex(s => s.type === 'LEAGUE' && s.round === f.round) : f.comp === 'SUP' ? 0 : f.group != null ? st.slots.findIndex(s => s.type === 'CAF' && s.md === f.round) : f.comp === 'CUP' ? st.slots.findIndex(s => s.type === 'CUP' && s.round === f.round) : st.slots.findIndex(s => s.type === 'CAF' && s.md === f.koStage) })).sort((a, b) => a.i - b.i).map(({ f, i }) => `<tr class="${f.played ? '' : 'future'}"><td>${C.slotLabel(st, i)}</td><td>${esc(C.clubName(st, f.h))}</td><td><b>${f.played ? `${f.hg}-${f.ag}${f.pens ? ` (${f.pens[0]}-${f.pens[1]} tab)` : ''}` : '–'}</b></td><td>${esc(C.clubName(st, f.a))}</td></tr>`).join('')}</tbody></table>`; void order; }
  const tabs = [['L1', 'Ligue 1'], ['L2', 'Ligue 2'], ['buteurs', t('Buteurs')], ['cal', t('Calendrier')]];
  return `<div class="ph"><h2>${t('Classements')}</h2><div class="tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-a="nav" data-v="tables" data-tab="${k}">${t(l)}</button>`).join('')}</div></div>${body}`;
};
VIEWS.comps = () => {
  const tab = args.tab || 'CUP';
  let body = '';
  const fxRow = f => `<tr class="${f.h === st.userClub || f.a === st.userClub ? 'me' : ''}"><td>${crest(f.h, 18)} ${esc(C.clubName(st, f.h))}</td><td><b>${f.bye ? 'exempt' : f.played ? `${f.hg}-${f.ag}` : '–'}</b>${f.pens ? `<small> (${f.pens[0]}-${f.pens[1]} tab)</small>` : ''}${f.agg ? `<small> cumul ${f.agg[0]}-${f.agg[1]}</small>` : ''}</td><td>${f.a ? crest(f.a, 18) + ' ' + esc(C.clubName(st, f.a)) : ''}</td></tr>`;
  if (tab === 'CUP') {
    const C2 = st.comps.CUP;
    body = `<p class="hint">Élimination directe sur un match, tirs au but en cas d'égalité. Participants : 16 clubs de L1 + clubs de L2 (liste provisoire).</p>` + C2.roundsNames.map((n, r) => { const fx = st.fixtures.filter(f => f.comp === 'CUP' && f.round === r); return fx.length ? `<h4>${n}</h4><table class="tbl"><tbody>${fx.map(fxRow).join('')}</tbody></table>` : `<h4>${n}</h4><p class="hint">Tirage à venir.</p>`; }).join('');
  }
  if (tab === 'CL' || tab === 'CC') {
    const K = st.comps[tab];
    const flagOf = id => CAF.COUNTRIES[st.clubs[id] ? 'TUN' : C.clubObj(st, id)?.country]?.flag || '';
    body = `<p class="hint">${esc(K.note)} · Tirage par chapeaux selon le niveau, jamais deux clubs du même pays dans un groupe. 4 groupes de 4, les 2 premiers en quarts (premier contre deuxième d'un autre groupe, retour chez le premier), demi-finales en tirage intégral ; matchs aller-retour, sans règle des buts à l'extérieur (à vérifier). Clubs africains : niveaux estimés.</p>
     <div class="grid2">${K.groups.map((g, gi) => `<div><h4>Groupe ${'ABCD'[gi]} <small>${g.map(flagOf).join(' ')}</small></h4>${tableHTML(C.groupTable(st, tab, gi))}</div>`).join('')}</div>
     ${['QF1', 'QF2', 'SF1', 'SF2', 'F1', 'F2'].map(s => { const fx = st.fixtures.filter(f => f.comp === tab && f.koStage === s); return fx.length ? `<h4>${{ QF1: 'Quarts aller', QF2: 'Quarts retour', SF1: 'Demies aller', SF2: 'Demies retour', F1: 'Finale aller', F2: 'Finale retour' }[s]}</h4><table class="tbl"><tbody>${fx.map(fxRow).join('')}</tbody></table>` : ''; }).join('')}`;
  }
  if (tab === 'SUP') { const fx = st.fixtures.filter(f => f.comp === 'SUP'); body = `<p class="hint">Champion contre vainqueur de la Coupe (ou dauphin), match unique sur terrain neutre — format à confirmer.</p><table class="tbl"><tbody>${fx.map(fxRow).join('')}</tbody></table>`; }
  if (tab === 'palmares') body = `<h3>Palmarès du club</h3><ul>${st.trophies.map(x => `<li>🏆 ${x.season}-${x.season + 1} : ${esc(x.name)}</li>`).join('') || '<li>Aucun trophée pour le moment.</li>'}</ul><h3>Saisons</h3><table class="tbl"><tbody>${st.history.map(h => `<tr><td>${h.season}-${h.season + 1}</td><td>${h.div === 1 ? 'L1' : 'L2'} ${h.pos}e</td><td>${h.met ? '✅ objectif' : '❌ objectif'}</td><td>Champion : ${esc(C.clubShort(st, h.champion))}</td><td>${fmtShort(h.fin)}</td></tr>`).join('')}</tbody></table>`;
  const tabs = [['CUP', t('Coupe de Tunisie')], ['CL', t('Ligue des Champions CAF')], ['CC', t('Coupe de la Confédération CAF')], ['SUP', t('Supercoupe')], ['palmares', 'Palmarès']];
  return `<div class="ph"><h2>${t('Compétitions')}</h2><div class="tabs">${tabs.map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-a="nav" data-v="comps" data-tab="${k}">${l}</button>`).join('')}</div></div>${body}`;
};

// ------------------------------------------------------------------ président & élections
VIEWS.president = () => {
  const P = st.president, E = st.election, uc = st.clubs[st.userClub];
  let el = '';
  if (E && !E.done) el = `<div class="card hl"><h3>🗳 ${E.extraordinary ? 'Vote de confiance' : t('Élections')} — ${E.members.toLocaleString('fr-FR')} membres votants</h3>
    <h4>${t('Candidats')}</h4><ul>${E.candidates.map(c => `<li><b>${esc(c.name)}</b> — programme « ${c.program.name} » : ${c.program.fr}</li>`).join('')}</ul>
    <label>Votre ${t('Programme électoral').toLowerCase()}<select id="elProg">${E.programs.map(p => `<option value="${p.id}">${p.name} — ${p.fr}</option>`).join('')}</select></label>
    <h4>Actions de campagne</h4>${C.CAMPAIGN.map(a => `<label class="inline"><input type="checkbox" class="elAct" value="${a.id}"> ${a.name}${a.promise ? ' (engagement à tenir la saison prochaine)' : ''}</label>`).join('<br>')}
    <p class="hint">Estimation de votre score de base : ${Math.round(C.electionScore(st) * 100)} % (résultats, finances, satisfaction, confiance, réputation).</p>
    <button class="btn primary big" data-a="vote">Lancer le vote</button></div>`;
  else if (E && E.done) el = `<div class="card"><h3>${t('Résultats')} de l'élection</h3>${E.results.map(r => `<div class="hbar"><span>${esc(r.name)}</span><i class="${r.me ? 'pos' : ''}" style="width:${r.pct * 0.7}%"></i><b>${r.pct}% (${r.votes.toLocaleString('fr-FR')})</b></div>`).join('')}<button class="btn small" data-a="clearElection">OK</button></div>`;
  return `<div class="ph"><h2>${t('Président')} — ${esc(P.name)}</h2></div>${el}
   <div class="grid2"><div class="card"><h3>Mandat</h3><div class="kv"><span>${t('Confiance')} des membres</span><b>${bar(P.trust)} ${Math.round(P.trust)}%</b><span>Fin du mandat</span><b>été ${P.mandateEnd + 1}</b><span>Mandats</span><b>${P.elected}</b><span>Objectif sportif</span><b>${t(C.OBJECTIVES[st.objective])}</b><span>Objectif financier</span><b>${{ equilibre: 'Équilibre', benefice: 'Bénéfice', invest: 'Investissement' }[st.finObjective]}</b></div>
     <label>Modifier l'objectif sportif (début de saison)<select data-a="setObj">${Object.entries(C.OBJECTIVES).map(([k, v]) => `<option value="${k}" ${st.objective === k ? 'selected' : ''}>${t(v)}</option>`).join('')}</select></label>
     <button class="btn danger" data-a="resign">${t('Démissionner')}</button></div>
    <div class="card"><h3>Sponsor principal</h3>${st.sponsorOffers ? st.sponsorOffers.map(o => `<button class="btn block" data-a="sponsor" data-id="${o.id}">${esc(o.name)} — ${fmtShort(o.monthly)}/mois${o.bonus ? ` + ${fmtShort(o.bonus)} par victoire ×10` : ''}${o.years ? ` · ${o.years} saisons` : ''}</button>`).join('') : st.sponsor ? `<p>${esc(st.sponsor.name)} : ${fmtMoney(st.sponsor.monthly)}/mois (jusqu'en ${st.sponsor.until + 1})</p>` : '<p>Aucun</p>'}
     <h3>Historique électoral</h3><ul>${P.history.map(h => `<li>${h.season} : ${h.won ? 'élu' : 'battu'} (${h.pct} %)${h.extraordinary ? ' — vote de confiance' : ''}</li>`).join('') || '<li>Premier mandat en cours.</li>'}</ul></div></div>
   <div class="card"><h3>Infos club</h3><p>${esc(uc.name)} · ${esc(uc.city)} · ${esc(uc.stadium)} (${uc.capacity.toLocaleString('fr-FR')} places) · Réputation ${uc.rep}/100 · Titres (en carrière) : L1 ${uc.titles.l1}, Coupe ${uc.titles.cup}, C1 ${uc.titles.cl}, C2 ${uc.titles.cc}</p><p class="hint">Couleurs et écusson provisoires (création originale). Rivalités affichées à titre de jeu.</p></div>`;
};

// ------------------------------------------------------------------ paramètres / compte
function settingsHTML() {
  const sel = (k, arr) => `<select data-a="setting" data-k="${k}">${arr.map(([v, l]) => `<option value="${v}" ${String(settings[k]) === String(v) ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const va = A.voiceAvailable();
  return `<div class="card"><h3>${t('Paramètres')}</h3><div class="form2">
   <label>${t('Langue')}${sel('lang', [['fr', 'Français'], ['ar', 'العربية'], ['en', 'English (partiel)']])}</label>
   <label>${t('Son')}${sel('sound', [[true, 'Activé'], [false, 'Coupé']])}</label>
   <label>Volume<input type="range" min="0" max="1" step="0.1" value="${settings.volume}" data-a="setting" data-k="volume"></label>
   <label>${t('Commentaires vocaux')} <small>(${va ? 'synthèse ' + va : 'non disponible sur cet appareil — commentaires texte uniquement'})</small>${sel('voice', [[true, 'Activés'], [false, 'Texte seulement']])}</label>
   <label>${t('Durée du match')}${sel('duration', [[3, '3 min'], [5, '5 min'], [8, '8 min'], [10, '10 min'], [15, '15 min']])}</label>
   <label>${t('Difficulté')} (matchs)${sel('difficulty', C.DIFFS.map((d, i) => [i, t(d)]))}</label>
   <label>${t('Assistance passe/tir')}${sel('assist', [[true, 'Activée'], [false, 'Désactivée']])}</label>
   <label>${t('Qualité graphique')}${sel('quality', [['low', 'Basse (économie batterie)'], ['medium', 'Moyenne'], ['high', 'Haute']])}</label>
   <label>${t('Images/seconde')}${sel('fps', [[30, '30'], [60, '60']])}</label>
   <label>Ralentis après les buts${sel('replays', [[true, 'Oui'], [false, 'Non']])}</label>
   <label>Cérémonie d'avant-match (TV)${sel('ceremony', [[true, 'Oui'], [false, 'Non']])}</label>
   <label>Disposition des commandes${sel('leftHanded', [[false, 'Joystick à gauche'], [true, 'Joystick à droite (gaucher)']])}</label>
   <label>Taille des boutons${sel('btnScale', [[0.85, 'Petits'], [1, 'Normaux'], [1.2, 'Grands']])}</label>
   <label>Publicités personnalisées${sel('adsConsent', [[null, 'Non choisi'], [true, 'Accepter'], [false, 'Refuser (pubs non personnalisées)']])}</label></div>
   <p class="hint">Test de la voix : <button class="btn small" data-a="testVoice">🔊 Tester</button></p></div>`;
}
VIEWS.settings = () => `<div class="ph"><h2>${t('Paramètres')}</h2></div>${settingsHTML()}${accountHTML()}<div class="card"><h3>Sauvegarde</h3><div class="row wrap"><button class="btn" data-a="saveNow">💾 ${t('Sauvegarder')} maintenant</button><button class="btn" data-a="exportSave">⬇ Exporter (fichier)</button><label class="btn">⬆ Importer<input type="file" accept=".json" data-a="importSave" hidden></label></div></div>`;
VIEWS.settingsHome = () => `<div class="page narrow"><div class="ph"><button class="btn ghost" data-a="nav" data-v="home">← ${t('Retour')}</button><h2>${t('Paramètres')}</h2></div>${settingsHTML()}</div>`;
function accountHTML() {
  const a = S.auth();
 if (serverInfo && serverInfo.accounts === false) return `<div class="card"><h3>${t('Compte')} & synchronisation</h3><p class="hint">⚠ Comptes en ligne indisponibles pour le moment (base de données du serveur non configurée). Votre carrière est sauvegardée sur cet appareil ; utilisez « Exporter » pour la transférer.</p></div>`;
  if (!serverInfo) return `<div class="card"><h3>${t('Compte')} & synchronisation</h3><p class="hint">Serveur injoignable : mode hors ligne (sauvegarde locale). <button class="btn small" data-a="retryServer">Réessayer</button></p></div>`;
  return `<div class="card"><h3>${t('Compte')} & synchronisation</h3>${a ? `<p>Connecté : <b>${esc(a.username)}</b> · ${syncLabel()}</p><div class="row wrap"><button class="btn" data-a="syncNow">☁ ${t('Synchroniser')}</button><button class="btn" data-a="loadRemote">⬇ Charger la sauvegarde du serveur</button><button class="btn ghost" data-a="logout">${t('Déconnexion')}</button></div>`
    : `<p class="hint">Facultatif : un compte sauvegarde votre carrière sur le serveur (PostgreSQL) pour la retrouver sur un autre appareil. Sans compte, la sauvegarde reste locale.</p><div class="form2"><label>Nom d'utilisateur<input id="acU" autocomplete="username" maxlength="32"></label><label>Mot de passe (8 caractères min.)<input id="acP" type="password" autocomplete="current-password"></label></div><div class="row"><button class="btn primary" data-a="login">${t('Connexion')}</button><button class="btn" data-a="register">${t('Inscription')}</button></div>`}</div>`;
}
VIEWS.account = () => `<div class="page narrow"><div class="ph"><button class="btn ghost" data-a="nav" data-v="home">← ${t('Retour')}</button><h2>${t('Compte')}</h2></div>${accountHTML()}</div>`;

// ------------------------------------------------------------------ match
 VIEWS.match = () => `<div class="match ${settings.leftHanded ? 'lefty' : ''} ${args.userSide == null ? 'spect' : ''}" style="--bs:${settings.btnScale}"><canvas id="cv" role="img" aria-label="Terrain de football animé, match à onze contre onze. Utilisez les commandes tactiles pour jouer."></canvas>
  <div id="joyZone" class="joyzone" role="group" aria-label="Commande directionnelle : maintenir et glisser pour déplacer le joueur"><div id="joy" class="joy"><div class="knob"></div></div></div>
  <div class="btns"><button id="bShoot" type="button" aria-pressed="false" class="mb shoot">${t('Tir')}</button><button id="bPass" type="button" aria-pressed="false" class="mb pass">${t('Passe')}</button><button id="bThru" type="button" aria-pressed="false" class="mb thru">${t('Profondeur')}</button><button id="bSprint" type="button" aria-pressed="false" class="mb sprint">${t('Sprint')}</button></div>
  <button id="bPause" class="mpause" aria-label="${t('Pause')}">❚❚</button>
  ${args.userSide != null ? `<button id="bTac" class="mtac" aria-label="Consignes tactiques" aria-expanded="false">📋</button>
  <div id="tacBar" class="tacbar" hidden role="group" aria-label="Consignes rapides">${Object.entries(TACTIC_PRESETS).map(([k, p]) => `<button type="button" data-preset="${k}"><span>${p.icon}</span>${p.label}</button>`).join('')}</div>` : ''}<div id="mLoad" class="mload">Chargement du match…</div></div>`;
function startMatchView() {
  const cv = $('#cv'); const ctx = args;
  const m = new Match({
    canvas: cv, home: ctx.home, away: ctx.away, userSide: ctx.userSide, knockout: ctx.knockout || null,
    settings: { duration: ctx.duration || settings.duration, difficulty: settings.difficulty, assist: settings.assist, quality: settings.quality, fps: Number(settings.fps), voice: settings.voice, lang: getLang(), replays: settings.replays, ceremony: settings.ceremony !== false },
    onEnd: res => onMatchEnd(res), onPause: () => pauseMenu(),
  });
  match = m;
  if (ctx.online && online?.conn) { Online.linkMatch(m, online.conn); m.settings.replays = false; m.settings.ceremony = false; m.ceremony = null; }
  $('#mLoad').remove();
  bindControls(m);
  m.start();
  A.whistle();
}
function bindControls(m) {
  const joy = $('#joy'), knob = joy.querySelector('.knob'), zone = $('#joyZone');
  let jid = null, ox = 0, oy = 0; const R = 55;
  const setJ = (dx, dy) => { const d = Math.hypot(dx, dy), k = d > R ? R / d : 1; knob.style.transform = `translate(${dx * k}px,${dy * k}px)`; m.input.jx = dx * k / R; m.input.jy = -dy * k / R; };
  zone.addEventListener('pointerdown', e => { jid = e.pointerId; zone.setPointerCapture(jid); const r = zone.getBoundingClientRect(); ox = e.clientX; oy = e.clientY; joy.style.left = (e.clientX - r.left) + 'px'; joy.style.top = (e.clientY - r.top) + 'px'; joy.classList.add('act'); setJ(0, 0); A.audioInit(); if (m.ceremony) m.endCeremony(); else if (m.replay) m.skipReplay(); });
  zone.addEventListener('pointermove', e => { if (e.pointerId === jid) setJ(e.clientX - ox, e.clientY - oy); });
  const end = e => { if (e.pointerId === jid) { jid = null; setJ(0, 0); joy.classList.remove('act'); } };
  zone.addEventListener('pointerup', end); zone.addEventListener('pointercancel', end);
  const heldReleases = [];
  const hold = (id, down, up) => {
    const b = $(id); let activePointer = null;
    const release = e => {
      if (activePointer === null || (e && e.pointerId !== activePointer)) return;
      const pointerId = activePointer; activePointer = null;
      b.classList.remove('on');
      b.setAttribute('aria-pressed', 'false');
      if (up) up();
      try { if (b.hasPointerCapture?.(pointerId)) b.releasePointerCapture(pointerId); } catch (err) {}
    };
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (activePointer !== null) return;
      activePointer = e.pointerId;
      try { b.setPointerCapture(e.pointerId); } catch (err) {}
      b.classList.add('on');
      b.setAttribute('aria-pressed', 'true');
      A.audioInit();
      down();
    });
    b.addEventListener('pointerup', release);
    b.addEventListener('pointercancel', release);
    b.addEventListener('lostpointercapture', release);
    heldReleases.push(() => release());
  };
  hold('#bShoot', () => m.btnShootDown(), () => m.btnShootUp());
  hold('#bPass', () => m.btnPass(false));
  hold('#bThru', () => m.btnPass(true), () => { m.input.press = false; });
  hold('#bSprint', () => { m.input.sprint = true; }, () => { m.input.sprint = false; });
  const releaseAll = () => {
    if (jid !== null) { jid = null; setJ(0, 0); joy.classList.remove('act'); }
    heldReleases.forEach(release => release());
    m.btnShootUp();
    m.input.jx = 0; m.input.jy = 0; m.input.sprint = false; m.input.press = false;
    document.querySelectorAll('.mb.on').forEach(b => b.classList.remove('on'));
  };
  const onVisibility = () => { if (document.hidden) releaseAll(); };
  window.addEventListener('blur', releaseAll);
  document.addEventListener('visibilitychange', onVisibility);
  $('#bPause').onclick = () => { m.paused = true; pauseMenu(); };
  // Consignes rapides sans interrompre le jeu.
  const tacBar = $('#tacBar'), bTac = $('#bTac');
  const markPreset = () => { const T = m.teams[m.userSide]; tacBar?.querySelectorAll('[data-preset]').forEach(b => b.classList.toggle('on', b.dataset.preset === T?.preset)); };
  const setPreset = key => { if (m.userSide == null) return; if (m.net) online?.conn?.send({ t: 'act', a: 'preset:' + key }); m.setTacticPreset(m.userSide, key); markPreset(); m.banner(TACTIC_PRESETS[key].icon + ' ' + TACTIC_PRESETS[key].label.toUpperCase(), 1.4); };
  if (bTac && tacBar) {
    bTac.onclick = () => { tacBar.hidden = !tacBar.hidden; bTac.setAttribute('aria-expanded', String(!tacBar.hidden)); markPreset(); };
    tacBar.onclick = e => { const b = e.target.closest('[data-preset]'); if (!b) return; setPreset(b.dataset.preset); tacBar.hidden = true; bTac.setAttribute('aria-expanded', 'false'); };
  }
  m._presetKeys = { Digit1: 'park', Digit2: 'counter', Digit3: 'balanced', Digit4: 'press', Digit5: 'allout' };
  m._setPreset = setPreset;
  $('#cv').addEventListener('pointerdown', () => { if (m.ceremony) m.endCeremony(); else if (m.replay) m.skipReplay(); });
  // clavier (PC)
  const keys = {};
  const upd = () => { m.input.jx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0); m.input.jy = (keys.ArrowUp || keys.KeyW ? 1 : 0) - (keys.ArrowDown || keys.KeyS ? 1 : 0); m.input.sprint = !!(keys.ShiftLeft || keys.ShiftRight); };
  m._kd = e => { if (keys[e.code]) return; keys[e.code] = true; upd(); A.audioInit(); if (e.code === 'Space' || e.code === 'KeyX') m.btnShootDown(); if (e.code === 'KeyC') m.btnPass(false); if (e.code === 'KeyV') m.btnPass(true); if (e.code === 'KeyQ') m.switchPlayer(); if (m._presetKeys?.[e.code]) m._setPreset(m._presetKeys[e.code]); if (e.code === 'Escape' || e.code === 'KeyP') { m.paused = true; pauseMenu(); } if (m.ceremony && (e.code === 'Enter' || e.code === 'Space')) m.endCeremony(); else if (m.replay && e.code === 'Enter') m.skipReplay(); };
  m._ku = e => { keys[e.code] = false; upd(); if (e.code === 'Space' || e.code === 'KeyX') m.btnShootUp(); if (e.code === 'KeyV') m.input.press = false; };
  addEventListener('keydown', m._kd); addEventListener('keyup', m._ku);
  const od = m.destroy.bind(m); m.destroy = () => {
    releaseAll();
    window.removeEventListener('blur', releaseAll);
    document.removeEventListener('visibilitychange', onVisibility);
    removeEventListener('keydown', m._kd); removeEventListener('keyup', m._ku);
    clearInterval(m._lbl); od();
  };
  // libellés contextuels (attaque / défense)
  m._lbl = setInterval(() => {
    const att = m.state === 'shootout' || (m.ball.owner && m.selected && m.ball.owner === m.selected);
    $('#bShoot') && ($('#bShoot').textContent = att ? t('Tir') : t('Tacle'));
    $('#bPass') && ($('#bPass').textContent = att ? t('Passe') : t('Changer'));
    $('#bThru') && ($('#bThru').textContent = att ? t('Profondeur') : t('Pressing'));
    const z = $('.btns'); if (z) z.classList.toggle('def', !att);
  }, 150);
}
function pauseMenu() {
  if (!match) return;
  if (match.net) {
    modal(`<h3>Match en ligne</h3><p class="hint">Le match continue pendant que ce menu est ouvert.</p><div class="row wrap"><button class="btn primary" id="pRes">▶ ${t('Reprendre')}</button><button class="btn danger" id="pForfeit">Abandonner (défaite 3-0)</button></div>`);
    $('#pRes').onclick = () => { closeModal(); match.paused = false; };
    $('#pForfeit').onclick = () => confirmBox('Abandonner le match ? Votre adversaire gagne 3-0.', () => { online?.conn?.send({ t: 'forfeit' }); closeModal(); });
    return;
  }
  if (document.getElementById('pRes')) return;
  const m = match, side = m.userSide;
  const T = side != null ? m.teams[side] : null;
  modal(`<h3>${t('Pause')} — ${m.teams[0].short} ${m.score[0]}-${m.score[1]} ${m.teams[1].short} (${Math.floor(m.minute)}')</h3>
   <div class="row wrap"><button class="btn primary" id="pRes">▶ ${t('Reprendre')}</button>${T ? `<button class="btn" id="pSub">🔁 Remplacements (${m.subsLeft[side]})</button>` : ''}<button class="btn" id="pSim">⚡ Simuler la fin</button><button class="btn danger" id="pQuit">${t('Quitter')}</button></div>
   ${T ? `<label>${t('Mentalité')}<select id="pMen">${[[-2, 'Très défensive'], [-1, 'Défensive'], [0, 'Équilibrée'], [1, 'Offensive'], [2, 'Très offensive']].map(([v, l]) => `<option value="${v}" ${T.mentality === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
   <label>${t('Pressing')}<select id="pPre">${[[0, 'Bas'], [1, 'Moyen'], [2, 'Haut']].map(([v, l]) => `<option value="${v}" ${T.pressing === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
   <label>Formation<select id="pForm">${Object.keys(FORMATIONS).map(f => `<option ${T.formation === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
   <label>Largeur<select id="pWid">${[[0, 'Resserrée'], [1, 'Normale'], [2, 'Large']].map(([v, l]) => `<option value="${v}" ${T.width === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
   <label>Ligne défensive<select id="pLine">${[[-1, 'Basse'], [0, 'Normale'], [1, 'Haute']].map(([v, l]) => `<option value="${v}" ${T.line === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
   <div class="row wrap presets">${Object.entries(TACTIC_PRESETS).map(([k, p]) => `<button class="btn small ${T.preset === k ? 'primary' : ''}" data-preset="${k}">${p.icon} ${p.label}</button>`).join('')}</div>
   ${coachAdviceHTML(m, side)}
   <div class="stamina">${T.ps.filter(p => !p.sentOff).map(p => `<div class="st-row"><span>${p.num}. ${esc(p.name)}${p.yellow ? ' 🟨' : ''}${p.injured ? ' 🩹' : ''}</span><i style="--v:${Math.round(p.stamina * 100)}%" class="${p.stamina < 0.45 ? 'low' : p.stamina < 0.6 ? 'mid' : ''}"></i></div>`).join('')}</div>` : ''}
   <p class="hint">Stats : tirs ${m.stats.shots[0]}-${m.stats.shots[1]} · cadrés ${m.stats.onTarget[0]}-${m.stats.onTarget[1]} · passes réussies ${m.stats.passOk[0]}/${m.stats.passes[0]} - ${m.stats.passOk[1]}/${m.stats.passes[1]} · fautes ${m.stats.fouls[0]}-${m.stats.fouls[1]}</p>
   <p class="hint">Commandes : joystick (ou flèches/WASD) · Tir maintenu = puissance (Espace) · Passe (C) · Profondeur (V) · Sprint (Maj) · Changer de joueur (Q).</p>`, { locked: true });
  const resume = () => { closeModal(); m.paused = false; m.last = performance.now(); A.audioResume(); };
  $('#pRes').onclick = resume;
  if (T) {
    $('#pMen').onchange = e => { T.mentality = Number(e.target.value); T.preset = null; };
    $('#pPre').onchange = e => { T.pressing = Number(e.target.value); T.preset = null; };
    $('#pForm').onchange = e => { m.changeFormation(side, e.target.value); };
    $('#pWid').onchange = e => { T.width = Number(e.target.value); T.preset = null; };
    $('#pLine').onchange = e => { T.line = Number(e.target.value); T.preset = null; };
    document.querySelectorAll('.presets [data-preset]').forEach(b => b.onclick = () => { m.setTacticPreset(side, b.dataset.preset); pauseMenu(); });
    document.querySelectorAll('[data-advice]').forEach(b => b.onclick = () => {
      const a = getCoachAdvice(T, { minute: m.minute, goalDiff: m.score[side] - m.score[1 - side], subsLeft: m.subsLeft[side] })[Number(b.dataset.advice)];
      if (!a) return;
      if (a.type === 'sub') { if (m.substitute(side, a.out, a.in)) toast(`${a.outName} → ${a.inName}`, 'ok'); }
      else if (a.type === 'preset') m.setTacticPreset(side, a.preset);
      pauseMenu();
    });
    $('#pSub').onclick = () => subMenu(m, side);
  }
  $('#pSim').onclick = () => { closeModal(); const sh = args.strH || 60, sa = args.strA || 60; m.simulateRest(sh, sa); };
  $('#pQuit').onclick = () => confirmBox(args.career ? 'Quitter le match ? Il sera terminé en simulation rapide pour préserver le calendrier.' : 'Quitter le match ?', () => { if (args.career) { const sh = args.strH || 60, sa = args.strA || 60; m.simulateRest(sh, sa); } else { m.destroy(); match = null; go('home'); } });
}
function coachAdviceHTML(m, side) {
  const T = m.teams[side];
  const advice = getCoachAdvice(T, { minute: m.minute, goalDiff: m.score[side] - m.score[1 - side], subsLeft: m.subsLeft[side] });
  if (!advice.length) return '<p class="hint">🧑‍💼 Adjoint : rien à signaler, l\'équipe tient le rythme.</p>';
  return `<div class="advice"><h4>🧑‍💼 Conseils de l'adjoint</h4>${advice.map((a, i) => `<div class="adv-row"><span>${a.type === 'sub' ? `🔁 ${esc(a.outName)} → ${esc(a.inName)} <small>(${esc(a.reason)})</small>` : `${TACTIC_PRESETS[a.preset].icon} Passer en « ${TACTIC_PRESETS[a.preset].label} » <small>(${esc(a.reason)})</small>`}</span><button class="btn small primary" data-advice="${i}">Appliquer</button></div>`).join('')}</div>`;
}
function subMenu(m, side) {
  const T = m.teams[side];
  modal(`<h3>Remplacements (${m.subsLeft[side]} restants)</h3><div class="grid2"><div><h4>Sortant</h4>${T.ps.map((p, i) => p.sentOff ? '' : `<label class="inline"><input type="radio" name="sOut" value="${i}"> ${p.num}. ${esc(p.name)} <small>${Math.round(p.stamina * 100)}%${p.injured ? ' 🩹' : ''}</small></label>`).join('<br>')}</div>
   <div><h4>Entrant</h4>${T.bench.map((b, i) => b.used ? '' : `<label class="inline"><input type="radio" name="sIn" value="${i}"> ${b.num}. ${esc(b.name)} <small>${b.pos}</small></label>`).join('<br>')}</div></div>
   <div class="row end"><button class="btn ghost" id="sBack">${t('Retour')}</button><button class="btn primary" id="sOk">${t('Valider')}</button></div>`, { locked: true, wide: true });
  $('#sBack').onclick = () => pauseMenu();
  $('#sOk').onclick = () => { const o = document.querySelector('[name=sOut]:checked'), i = document.querySelector('[name=sIn]:checked'); if (!o || !i) return toast('Choisissez un sortant et un entrant.', 'err'); if (m.substitute(side, Number(o.value), Number(i.value))) toast('Remplacement effectué', 'ok'); pauseMenu(); };
}
function onMatchEnd(res) {
  const ctx = args; match = null;
  if (ctx.career) {
    const f = st.fixtures.find(x => x.id === ctx.fixtureId);
    const full = res;
    const userRes = { hg: full.hg, ag: full.ag, pens: full.pens, events: full.events, stats: full.stats, players: full.players };
    const rep = C.advance(st, userRes);
    save();
    go('postmatch', { f: f.id, res: full, userSide: ctx.userSide });
  } else go('postmatchQuick', { res, home: ctx.home, away: ctx.away });
}
VIEWS.postmatch = () => {
  const f = st.fixtures.find(x => x.id === args.f), res = args.res;
  return postHTML(C.clubName(st, f.h), C.clubName(st, f.a), f.hg, f.ag, res, f) + `<div class="row center"><button class="btn primary big" data-a="nav" data-v="hub">${t('Continuer')}</button></div>`;
};
// ------------------------------------------------------------------ match en ligne
let online = null; // { conn, status, code, side, token }
function onlineSession() { try { return JSON.parse(sessionStorage.getItem('ft26-online') || 'null'); } catch (e) { return null; } }
function setOnlineSession(v) { try { v ? sessionStorage.setItem('ft26-online', JSON.stringify(v)) : sessionStorage.removeItem('ft26-online'); } catch (e) {} }
function onlineConnect() {
  if (online?.conn && online.conn.ws.readyState <= 1) return online.conn;
  online = online || {};
  online.conn = Online.connectOnline({
    onMessage: onlineMessage,
    onClose: () => { if (match?.net) { toast('Connexion perdue : tentative de reprise…', 'err'); setTimeout(onlineResume, 1500); } else if (online?.status === 'waiting') { online.status = 'idle'; render(); } },
  });
  return online.conn;
}
function onlineMessage(msg) {
  if (msg.t === 'err') { toast(msg.msg, 'err'); if (online) online.status = 'idle'; if (view === 'online') render(); return; }
  if (msg.t === 'created') { Object.assign(online, { status: 'waiting', code: msg.code, side: 0, token: msg.token }); setOnlineSession({ code: msg.code, token: msg.token }); if (view === 'online') render(); return; }
  if (msg.t === 'joined') { Object.assign(online, { code: msg.code, side: 1, token: msg.token }); setOnlineSession({ code: msg.code, token: msg.token }); return; }
  if (msg.t === 'start') {
    online.status = 'playing'; online.names = msg.names;
    if (match?.net) return; // reprise : le match est déjà affiché
    go('match', { online: true, home: msg.home, away: msg.away, userSide: msg.side, duration: msg.duration });
    return;
  }
  if (msg.t === 's') { match?.net?.push(msg.s); return; }
  if (msg.t === 'opp') { const me = online?.side; if (msg.side !== me) { toast(msg.status === 'left' ? 'Adversaire déconnecté : l\'IA prend le relais.' : 'Votre adversaire est de retour.', msg.status === 'left' ? 'err' : 'ok'); match && match.banner(msg.status === 'left' ? 'ADVERSAIRE DÉCONNECTÉ' : 'ADVERSAIRE DE RETOUR', 2); } return; }
  if (msg.t === 'end') {
    setOnlineSession(null);
    if (match) { match.running = false; match.destroy(); match = null; }
    online.status = 'idle';
    go('postmatchQuick', { res: msg.res, home: msg.home, away: msg.away, online: true, names: msg.names });
    online.conn?.close(); online = null;
  }
}
function onlineResume() {
  const sess = onlineSession(); if (!sess) return;
  if (online) online.conn = null;
  const conn = onlineConnect();
  Object.assign(online, { code: sess.code, token: sess.token });
  conn.send({ t: 'rejoin', code: sess.code, token: sess.token });
}
VIEWS.online = () => {
  const st0 = online?.status || 'idle', sess = onlineSession();
  const clubs = CLUBS.filter(c => c.div === 1 || !c.div).sort((a, b) => a.name.localeCompare(b.name, 'fr'));
  const name = settings.onlineName || '';
  if (st0 === 'waiting') return `<div class="page"><div class="card center"><h2>🌐 Salon créé</h2><p>Donnez ce code à votre adversaire :</p>
    <div class="room-code">${esc(online.code)}</div>
    <div class="row center"><button class="btn primary" data-a="shareCode">📤 Partager le code</button><button class="btn ghost" data-a="leaveOnline">Annuler</button></div>
    <p class="hint">En attente d'un adversaire… Le match démarre dès qu'il entre le code (match de 5 minutes, chacun dirige son équipe, l'IA remplace un joueur déconnecté).</p></div></div>`;
  return `<div class="page"><div class="ph"><h2>🌐 Match en ligne</h2></div>
   ${sess ? `<div class="card"><p>Un match en ligne est en cours sur cet appareil.</p><button class="btn primary" data-a="resumeOnline">Reprendre le match</button></div>` : ''}
   <div class="card"><div class="form2"><label>Pseudo<input id="olName" maxlength="16" value="${esc(name)}" placeholder="Votre pseudo"></label>
    <label>Votre club<select id="olClub">${clubs.map(c => `<option value="${c.id}" ${c.id === (settings.onlineClub || 'est') ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label></div>
    <div class="row wrap"><button class="btn primary big" data-a="createRoom">➕ Créer un salon</button></div>
    <div class="row wrap"><label class="inline">Code<input id="olCode" maxlength="4" class="code-in" placeholder="ABCD" autocapitalize="characters"></label><button class="btn big" data-a="joinRoom">➡️ Rejoindre</button></div>
    <p class="hint">Match de 5 minutes contre un ami, en temps réel. Le serveur arbitre le match pour les deux joueurs. Connexion internet nécessaire.</p></div>
   <div class="card"><h3>🏆 Classement en ligne</h3><div id="olBoard"><p class="hint">Chargement…</p></div></div></div>`;
};
async function loadLeaderboard() {
  const box = $('#olBoard'); if (!box) return;
  try {
    const r = await fetch(S.API + '/mp/leaderboard'); const { leaderboard } = await r.json();
    box.innerHTML = leaderboard.length ? `<table class="tbl"><thead><tr><th>#</th><th>Joueur</th><th>J</th><th>V</th><th>N</th><th>D</th><th>Diff</th><th>Pts</th></tr></thead><tbody>${leaderboard.map((x, i) => `<tr><td>${i + 1}</td><td>${esc(x.name)}</td><td>${x.played}</td><td>${x.w}</td><td>${x.d}</td><td>${x.l}</td><td>${x.gf - x.ga}</td><td><b>${x.pts}</b></td></tr>`).join('')}</tbody></table>` : '<p class="hint">Aucun match joué pour l\'instant. Soyez le premier !</p>';
  } catch (e) { box.innerHTML = '<p class="hint">Classement indisponible hors connexion.</p>'; }
}
function onlineIdentity() {
  const name = ($('#olName')?.value || '').trim(), club = $('#olClub')?.value;
  if (!name) { toast('Choisissez un pseudo.', 'err'); return null; }
  settings.onlineName = name; settings.onlineClub = club; S.saveSettings(settings);
  return { name, club };
}
VIEWS.postmatchQuick = () => `<div class="page">${args.online && args.names ? `<p class="center hint">🌐 Match en ligne : <b>${esc(args.names[0] || '')}</b> (${esc(args.home.short || '')}) contre <b>${esc(args.names[1] || '')}</b> (${esc(args.away.short || '')})</p>` : ''}${postHTML(args.home.name, args.away.name, args.res.hg, args.res.ag, args.res)}<div class="row center"><button class="btn primary big" data-a="nav" data-v="${args.online ? 'online' : 'quick'}">${args.online ? 'Rejouer en ligne' : 'Rejouer'}</button><button class="btn big" data-a="nav" data-v="home">${t('Accueil')}</button></div></div>`;
function postHTML(hn, an, hg, ag, res, f = null) {
  const s = res.stats;
  const ev = (res.events || []).filter(e => ['goal', 'yellow', 'red', 'injury', 'sub', 'shootout'].includes(e.type)).sort((a, b) => a.min - b.min);
  const players = [...(res.players || [])].sort((a, b) => (b.rating || 0) - (a.rating || 0) || (b.goals || 0) - (a.goals || 0));
  const mvp = players[0];
  const teamName = side => side === 0 ? hn : an;
  return `<div class="card center post"><small>${t('Fin du match')}</small><div class="score">${esc(hn)} <b>${hg} - ${ag}</b> ${esc(an)}</div>${f && f.pens ? `<p>Tirs au but : ${f.pens[0]}-${f.pens[1]}</p>` : (!f && res.pens ? `<p>Tirs au but : ${res.pens[0]}-${res.pens[1]}</p>` : '')}${f && f.agg ? `<p>Cumul : ${f.agg[0]}-${f.agg[1]}</p>` : ''}${f && f.attendance ? `<p class="hint">${f.attendance.toLocaleString('fr-FR')} spectateurs</p>` : ''}
   ${mvp ? `<section class="mvp-card"><small>🏆 JOUEUR DU MATCH</small><h3>${esc(mvp.name || 'Joueur')}</h3><b>${Number(mvp.rating || 0).toFixed(1)}/10</b><p>${esc(teamName(mvp.team))} · ${mvp.goals || 0} but(s) · ${mvp.assists || 0} passe(s) décisive(s)</p></section>` : ''}
   <ul class="events">${ev.map(e => `<li class="${e.team ? 'r' : 'l'}">${e.min}' ${{ goal: '⚽', yellow: '🟨', red: '🟥', injury: '🩹', sub: '🔁', shootout: '🎯' }[e.type]} ${esc(e.name)}${e.assist ? ` <small>(passe ${esc(e.assist)})</small>` : ''}${e.outName ? ` <small>↔ ${esc(e.outName)}</small>` : ''}</li>`).join('')}</ul>
   ${s ? `<table class="tbl stats"><tbody>${[['Possession', s.possPct[0] + ' %', s.possPct[1] + ' %'], ['Tirs', s.shots[0], s.shots[1]], ['Cadrés', s.onTarget[0], s.onTarget[1]], ['Passes réussies', `${s.passOk[0]}/${s.passes[0]}`, `${s.passOk[1]}/${s.passes[1]}`], ['Corners', s.corners[0], s.corners[1]], ['Fautes', s.fouls[0], s.fouls[1]], ['Cartons', s.yellows[0] + s.reds[0], s.yellows[1] + s.reds[1]]].map(([l, a, b]) => `<tr><td>${a}</td><th>${l}</th><td>${b}</td></tr>`).join('')}</tbody></table>` : ''}
   ${players.length ? `<h3 class="section-title">Notes des joueurs</h3><table class="tbl player-ratings"><thead><tr><th>Joueur</th><th>Équipe</th><th>Min.</th><th>B</th><th>P.D.</th><th>Note</th></tr></thead><tbody>${players.slice(0, 12).map(p => `<tr><td>${esc(p.name || 'Joueur')}${p.red ? ' 🟥' : ''}${p.yellow ? ' 🟨' : ''}</td><td>${esc(teamName(p.team))}</td><td>${p.minutes || 0}</td><td>${p.goals || 0}</td><td>${p.assists || 0}</td><td><b>${Number(p.rating || 0).toFixed(1)}</b></td></tr>`).join('')}</tbody></table>` : ''}</div>`;
}
VIEWS.seasonEnd = () => {
  const r = args.review;
  return `<div class="card center"><h2>Fin de saison ${st.season - 1}-${st.season}</h2><p>Classement final : <b>${r.pos}e</b> (${r.div === 1 ? 'Ligue 1' : 'Ligue 2'}) — objectif ${r.met ? '<b class="pos">atteint ✅</b>' : '<b class="neg">manqué ❌</b>'}</p>
   <ul>${st.trophies.filter(x => x.season === st.season - 1).map(x => `<li>🏆 ${esc(x.name)}</li>`).join('')}</ul><ul class="news">${st.news.slice(0, 10).map(n => `<li>${esc(n.text)}</li>`).join('')}</ul>
   <button class="btn primary big" data-a="nav" data-v="hub">Saison suivante →</button></div>`;
};

// ------------------------------------------------------------------ actions
const ACT = {
  closeModal: () => closeModal(),
  nav: el => { const v = el.dataset.v; const a = {}; if (el.dataset.tab) a.tab = el.dataset.tab; if (v === 'home' && st) save(); if (st && st.gameOver && !['home', 'newCareer', 'settings', 'gameOver'].includes(v)) return go('gameOver'); go(v, a); },
  continue: () => { const d = C.migrate(S.loadLocal()); if (!d) return toast('Sauvegarde illisible.', 'err'); st = d; go(st.gameOver ? 'gameOver' : 'hub'); },
  pickClub: el => go('newCareer', { step: 2, clubId: el.dataset.id }),
  customClub: () => {
    modal(`<h3>${t('Créer un club fictif')}</h3><div class="form2"><label>Nom<input id="cuN" maxlength="32" value="Jeunesse Sportive de Carthage"></label><label>Sigle (4 lettres)<input id="cuS" maxlength="4" value="JSC"></label><label>Ville<input id="cuV" maxlength="24" value="Carthage"></label><label>Stade<input id="cuSt" maxlength="40" value="Stade de Carthage"></label><label>Couleur 1<input id="cu1" type="color" value="#0a6e5a"></label><label>Couleur 2<input id="cu2" type="color" value="#ffffff"></label></div><div class="row end"><button class="btn primary" id="cuOk">${t('Valider')}</button></div>`);
    $('#cuOk').onclick = () => { const custom = { name: $('#cuN').value.trim() || 'Club fictif', short: ($('#cuS').value.trim() || 'CF').toUpperCase(), city: $('#cuV').value.trim() || 'Tunis', stadium: $('#cuSt').value.trim(), c1: $('#cu1').value, c2: $('#cu2').value }; closeModal(); go('newCareer', { step: 2, custom }); };
  },
  startCareer: () => {
    const go2 = () => {
      const opts = { clubId: args.clubId, custom: args.custom, difficulty: Number($('#ncDiff').value), objective: $('#ncObj').value, finObjective: $('#ncFin').value, presidentName: $('#ncPres').value.trim() || 'Président', clubs: dataOverrides?.clubs };
      st = C.newCareer(opts); save('Carrière créée et sauvegardée'); go('hub');
    };
    if (S.loadLocal()) confirmBox('Une carrière existe déjà sur cet appareil. La remplacer ? (pensez à l\'exporter si besoin)', go2, 'Remplacer'); else go2();
  },
  quickPlay: () => {
    const fake = C.newCareer({ clubId: 'est', seed: 99 });
    const h = $('#qh').value, a = $('#qa').value; if (h === a) return toast('Choisissez deux équipes différentes.', 'err');
    const side = Number($('#qside').value);
    const home = C.matchTeam(fake, h, false), away = C.matchTeam(fake, a, true);
    if (home.kit.shirt === away.kit.shirt) away.kit = { shirt: '#f4f4f4', trim: '#222', shorts: '#222' };
    go('match', { home, away, knockout: $('#qko')?.checked ? { aggBefore: [0, 0] } : null, userSide: side < 0 ? null : side, duration: Number($('#qdur').value), strH: C.teamStrength(fake, h, false), strA: C.teamStrength(fake, a, false) });
  },
  advance: () => {
    if (C.userFixture(st)) return go('prematch');
    const r = C.advance(st);
    if (r.error) return toast(r.error, 'err');
    save();
    if (r.seasonEnd) return go('seasonEnd', { review: r.review });
    if (st.gameOver) return go('gameOver');
    render();
  },
  playMatch: () => {
    const f = C.userFixture(st); if (!f) return;
    settings.duration = Number($('#pmDur').value); S.saveSettings(settings);
    const home = C.matchTeam(st, f.h, false), away = C.matchTeam(st, f.a, true);
    if (home.kit.shirt.toLowerCase() === away.kit.shirt.toLowerCase()) { away.kit = { shirt: away.colors[1] !== home.kit.shirt ? away.colors[1] : '#f4f4f4', trim: '#222', shorts: '#222' }; }
    save();
    // Élimination directe : match unique (coupe, supercoupe) ou retour CAF avec cumul de l'aller.
    const leg1 = f.leg1 ? st.fixtures.find(x => x.id === f.leg1) : null;
    const knockout = f.ko ? { aggBefore: [0, 0] } : (leg1 && /2$/.test(f.koStage || '') && leg1.played) ? { aggBefore: [leg1.ag, leg1.hg] } : null;
    go('match', { career: true, fixtureId: f.id, home, away, knockout, userSide: f.h === st.userClub ? 0 : 1, strH: C.teamStrength(st, f.h, false), strA: C.teamStrength(st, f.a, false) });
  },
  simMatch: () => { const f = C.userFixture(st); const r = C.advance(st); save(); if (r.user) go('postmatch', { f: r.user.id, res: { hg: r.user.hg, ag: r.user.ag, events: r.user.events || [] } }); else render(); void f; },
  player: el => playerModal(el.dataset.id),
  offer: el => { closeModal(); offerModal(el.dataset.id, !!el.dataset.loan, el.dataset.fee ? Number(el.dataset.fee) : null); },
  acceptClub: el => { const r = C.acceptClubCounter(st, el.dataset.id); save(); toast(r.msg, r.ok ? 'ok' : 'err'); render(); },
  acceptAgent: el => { const r = C.acceptAgentCounter(st, el.dataset.id); save(); toast(r.msg, r.ok ? 'ok' : 'err'); render(); },
  confirmTx: el => { const n = st.negotiations.find(x => x.id === el.dataset.id); const p = st.players[n.pid]; confirmBox(`Confirmer ${n.type === 'loan' ? 'le prêt' : 'le transfert'} de <b>${esc(p.name)}</b> pour ${fmtMoney(n.type === 'loan' ? n.loanFee || 0 : n.fee + n.signing + (n.agentFee || 0))} (indemnité, prime${n.agentFee ? ' et commission d\'agent' : ''}) et ${fmtMoney(n.wage)}/mois${n.releaseClause ? `, clause libératoire ${fmtMoney(n.releaseClause)}` : ''} ?`, () => { const r = C.confirmTransfer(st, n.id); toast(r.msg, r.ok ? 'ok' : 'err'); save(); render(); }); },
  ansOffer: el => {
    const o = st.offers.find(x => x.id === el.dataset.id);
    if (el.dataset.c) { modal(`<h3>Contre-offre</h3><label>Montant demandé (DT)<input id="coV" type="number" value="${Math.round(o.fee * 1.2)}"></label><div class="row end"><button class="btn primary" id="coOk">Envoyer</button></div>`); $('#coOk').onclick = () => { const v = Number($('#coV').value); closeModal(); confirmBox(`Envoyer une contre-offre à ${fmtMoney(v)} ? En cas d'accord, la vente sera conclue immédiatement.`, () => { const r = C.answerOffer(st, o.id, false, v); toast(r.msg, r.ok ? 'ok' : 'err'); save(); render(); }); }; return; }
    if (el.dataset.y) return confirmBox(`Accepter l'offre de ${esc(C.clubName(st, o.club))} (${o.type === 'loan' ? 'prêt' : fmtMoney(o.fee)}) pour ${esc(st.players[o.pid].name)} ?`, () => { const r = C.answerOffer(st, o.id, true); toast(r.msg, r.ok ? 'ok' : 'err'); save(); render(); });
    const r = C.answerOffer(st, o.id, false); toast(r.msg); save(); render();
  },
  filter: () => { const v = id => $(id).value; go('transfers', { tab: 'marche', f: { pos: v('#fPos'), ageMax: Number(v('#fAge')) || null, ovrMin: Number(v('#fOvr')) || null, potMin: Number(v('#fPot')) || null, priceMax: Number(v('#fPrice')) || null, wageMax: Number(v('#fWage')) || null, nat: v('#fNat'), contract: v('#fCon'), free: $('#fFree').checked, q: v('#fQ') } }); },
  toggleList: el => { const p = st.players[el.dataset.id]; p.listed = !p.listed; save(); closeModal(); toast(p.listed ? `${p.name} est sur la liste des transferts.` : `${p.name} retiré de la liste.`); render(); },
  release: el => { const p = st.players[el.dataset.id]; confirmBox(`Résilier le contrat de ${esc(p.name)} ? Une indemnité sera versée.`, () => { const r = C.releasePlayer(st, p.id); toast(r.msg, r.ok ? 'ok' : 'err'); closeModal(); save(); render(); }, 'Résilier'); },
  renew: el => {
    const p = st.players[el.dataset.id]; const dem = C.wageDemand(st, p, p.role);
    modal(`<h3>Prolongation — ${esc(p.name)}</h3><p class="hint">Salaire actuel ${fmtMoney(p.wage)} · demande estimée ~${fmtMoney(dem)} · fin actuelle juin ${p.contractEnd + 1}</p><div class="form2"><label>Salaire mensuel<input id="rnW" type="number" value="${dem}"></label><label>Années supplémentaires<select id="rnY">${[1, 2, 3, 4].map(y => `<option>${y}</option>`).join('')}</select></label><label>Rôle<select id="rnR">${['cle', 'titulaire', 'rotation', 'espoir'].map(r => `<option ${p.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></label></div><div class="row end"><button class="btn primary" id="rnOk">Proposer</button></div>`);
    $('#rnOk').onclick = () => { const w = Number($('#rnW').value), y = Number($('#rnY').value), ro = $('#rnR').value; closeModal(); confirmBox(`Proposer ${fmtMoney(w)}/mois jusqu'en ${Math.max(p.contractEnd, st.season) + y + 1} ?`, () => { const r = C.renewContract(st, p.id, w, Math.max(p.contractEnd - st.season, 0) + y, ro); toast(r.msg, r.ok ? 'ok' : 'err'); save(); render(); }); };
  },
  setCaptain: el => { st.clubs[st.userClub].tactics.captain = el.dataset.id; save(); closeModal(); toast('Nouveau capitaine désigné.', 'ok'); render(); },
  setNumber: el => { const p = st.players[el.dataset.id]; const n = Number(prompt('Numéro de maillot (1-99)', p.num)); if (!n || n < 1 || n > 99) return; if (C.squad(st, st.userClub).some(x => x.num === n && x.id !== p.id)) return toast('Numéro déjà attribué.', 'err'); p.num = n; save(); closeModal(); render(); },
  talk: el => talkModal(el.dataset.id),
  createRoom: () => { const id = onlineIdentity(); if (!id) return; onlineConnect().send({ t: 'create', ...id }); },
  joinRoom: () => { const id = onlineIdentity(); if (!id) return; const code = ($('#olCode')?.value || '').trim().toUpperCase(); if (code.length !== 4) return toast('Entrez le code à 4 caractères.', 'err'); onlineConnect().send({ t: 'join', code, ...id }); },
  leaveOnline: () => { online?.conn?.close(); online = null; setOnlineSession(null); render(); },
  resumeOnline: () => onlineResume(),
  shareCode: async () => { const text = `Rejoins-moi sur Football Tunisia 2026 : match en ligne, code ${online?.code} — ${location.origin}`; try { if (navigator.share) await navigator.share({ text }); else { await navigator.clipboard.writeText(text); toast('Invitation copiée.', 'ok'); } } catch (e) {} },
  rotate: () => { const ch = C.rotateLineup(st); save(); toast(ch.length ? 'Rotation : ' + ch.map(c => `${c.out.name} → ${c.in.name}`).join(', ') : 'Aucun changement.', ch.length ? 'ok' : 'info'); render(); },
  scoutRegion: el => { const r = C.startScouting(st, el.dataset.k); save(); toast(r.msg, r.ok ? 'ok' : 'err'); render(); },
  signProspect: el => { const r = C.signProspect(st, el.dataset.id); save(); toast(r.msg, r.ok ? 'ok' : 'err'); render(); },
  rejectProspect: el => { C.rejectProspect(st, el.dataset.id); save(); render(); },
  promoteYouth: el => { const r = C.promoteYouth(st, el.dataset.id); save(); toast(r.msg, r.ok ? 'ok' : 'err'); render(); },
  releaseYouth: el => { const p = st.players[el.dataset.id]; confirmBox(`Libérer <b>${esc(p.name)}</b> du centre de formation ?`, () => { const r = C.releaseYouth(st, p.id); save(); toast(r.msg, r.ok ? 'ok' : 'err'); render(); }); },
  loanYouth: el => loanModal(el.dataset.id),
  doLoan: el => { const r = C.loanForDevelopment(st, el.dataset.id, el.dataset.club); save(); closeModal(); toast(r.msg, r.ok ? 'ok' : 'err'); render(); },
  doTalk: el => { const r = C.talkToPlayer(st, el.dataset.id, el.dataset.k); save(); toast(r.msg, r.ok ? 'ok' : 'err'); if (r.ok) { closeModal(); render(); } },
  meeting: el => { const r = C.holdTeamMeeting(st, el.dataset.k); save(); toast(r.msg, r.ok ? 'ok' : 'err'); render(); },
  setRole: el => { const p = st.players[el.dataset.id]; const roles = ['cle', 'titulaire', 'rotation', 'espoir', 'jeune']; p.role = roles[(roles.indexOf(p.role) + 1) % roles.length]; save(); playerModal(p.id); },
  toXI: el => { closeModal(); go('tactics', { sel: null, add: el.dataset.id }); toast('Touchez le poste où placer ce joueur.'); args.pending = el.dataset.id; },
  autoXI: () => { C.autoLineup(st, st.userClub); save('Composition automatique appliquée'); render(); },
  tacSlot: el => { const i = Number(el.dataset.i); if (args.pending) { placeInLineup(args.pending, i); args.pending = null; return; } go('tactics', { sel: args.sel === i ? null : i }); },
  tacPick: el => placeInLineup(el.dataset.id, Number(el.dataset.i)),
  adReward: () => showRewardAd(),
  upgrade: el => { const I = INFRA.find(i => i.id === el.dataset.id); confirmBox(`Lancer les travaux « ${I.fr} » pour ${fmtMoney(I.cost * st.clubs[st.userClub].infra[I.id])} ?`, () => { const r = C.upgradeInfra(st, I.id); toast(r.msg, r.ok ? 'ok' : 'err'); save(); render(); }); },
  loan: el => { const a = Number(el.dataset.amt); confirmBox(`Contracter un emprunt de ${fmtMoney(a)} ?`, () => { const r = C.takeLoan(st, a); toast(r.msg, r.ok ? 'ok' : 'err'); save(); render(); }); },
  staffHire: el => { const s = st.staffMarket.find(x => x.id === el.dataset.id); const dem = Math.round(s.wage * s.demand); modal(`<h3>Recruter ${esc(s.name)}</h3><p class="hint">${STAFF_ROLES.find(r => r.id === s.role).fr} · niveau ${s.ability} · demande ${fmtMoney(dem)}/mois · prime de signature = 2 mois</p><div class="form2"><label>Salaire proposé<input id="shW" type="number" value="${dem}"></label><label>Durée<select id="shY"><option>1</option><option selected>2</option><option>3</option></select></label></div><div class="row end"><button class="btn primary" id="shOk">Proposer</button></div>`); $('#shOk').onclick = () => { const w = Number($('#shW').value), y = Number($('#shY').value); closeModal(); confirmBox(`Engager ${esc(s.name)} à ${fmtMoney(w)}/mois (prime ${fmtMoney(w * 2)}) ?`, () => { const r = C.hireStaff(st, s.id, w, y); toast(r.msg, r.ok ? 'ok' : 'err'); save(); render(); }); }; },
  staffFire: el => { const s = st.staff[el.dataset.id]; confirmBox(`Licencier ${esc(s.name)} ? Des indemnités seront versées.`, () => { const r = C.fireStaff(st, s.id); toast(r.msg, r.ok ? 'ok' : 'err'); save(); render(); }, 'Licencier'); },
  staffRenew: el => { const s = st.staff[el.dataset.id]; const dem = Math.round(s.wage * s.demand); confirmBox(`Prolonger ${esc(s.name)} de 2 saisons à ${fmtMoney(dem)}/mois ?`, () => { const r = C.renewStaff(st, s.id, dem, Math.max(0, s.contractEnd - st.season) + 2); toast(r.msg, r.ok ? 'ok' : 'err'); save(); render(); }); },
  exam: el => { C.medicalExam(st, el.dataset.id); save(); render(); },
  vote: () => { const prog = $('#elProg').value, acts = [...document.querySelectorAll('.elAct:checked')].map(x => x.value); confirmBox('Lancer le vote des membres ? Le résultat est définitif.', () => { const r = C.runElection(st, prog, acts); save(); toast(r.won ? 'Vous êtes élu ! 🎉' : 'Défaite électorale…', r.won ? 'ok' : 'err'); if (!r.won) setTimeout(() => go('gameOver'), 1500); render(); }); },
  clearElection: () => { st.election = null; save(); render(); },
  resign: () => confirmBox('Démissionner de la présidence ? Votre mandat prend fin immédiatement.', () => { C.resign(st); save(); go('gameOver'); }, 'Démissionner'),
  sponsor: el => { const r = C.chooseSponsor(st, el.dataset.id); if (r) toast(r, 'err'); save(); render(); },
  newClub: el => confirmBox(`Prendre la présidence de ${esc(C.clubName(st, el.dataset.id))} ?`, () => { C.takeNewClub(st, el.dataset.id); save(); go('hub'); }),
  testVoice: () => { A.audioInit(); A.setVoice(true); A.speak(getLang() === 'ar' ? 'هدف رائع في الملعب' : 'But magnifique ! Le stade explose !', getLang(), true); A.setVoice(settings.voice); A.roar(); },
  saveNow: () => save('Sauvegardé'),
  retryServer: async () => { toast('Connexion au serveur… (peut prendre ~1 min si le serveur était en veille)'); try { serverInfo = await S.health(); toast('Serveur joignable ✓', 'ok'); } catch (e) { toast(e.message, 'err'); } render(); },
  exportSave: () => { const b = new Blob([JSON.stringify(st)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `ft26-carriere-${st.season}.json`; a.click(); },
  login: () => doAuth('login'), register: () => doAuth('register'),
  logout: () => { S.logout(); toast('Déconnecté'); render(); },
  syncNow: async () => { try { await S.pushRemote(st); S.saveLocal(st); syncStatus = 'synchronisé'; toast('Synchronisé ✓', 'ok'); } catch (e) { if (e.status === 409) conflict(e.data); else toast(e.message, 'err'); } render(); },
  loadRemote: async () => { try { const d = await S.fetchRemote(); if (!d.data) return toast('Aucune sauvegarde sur le serveur.'); confirmBox(`Remplacer la carrière locale par celle du serveur (saison ${d.data.season}, ${new Date(d.updatedAt).toLocaleString('fr-FR')}) ?`, () => { st = C.migrate(d.data); st._rev = d.revision; S.saveLocal(st); go('hub'); }); } catch (e) { toast(e.message, 'err'); } },
};
function placeInLineup(pid, i) {
  const tac = st.clubs[st.userClub].tactics;
  const j = tac.lineup.indexOf(pid);
  const prev = tac.lineup[i];
  if (j >= 0) tac.lineup[j] = prev; // échange de postes
  else { tac.bench = tac.bench.filter(x => x !== pid); if (prev) tac.bench.unshift(prev); tac.bench = tac.bench.slice(0, 9); }
  tac.lineup[i] = pid;
  save(); go('tactics', { sel: null });
}
function conflict(data) {
  modal(`<h3>Conflit de sauvegarde</h3><p>Le serveur contient une version plus récente (${data && data.updatedAt ? new Date(data.updatedAt).toLocaleString('fr-FR') : '?'}) que celle de cet appareil.</p><div class="row wrap"><button class="btn" id="cfL">Garder celle de cet appareil</button><button class="btn primary" id="cfR">Charger celle du serveur</button></div>`, { locked: true });
  $('#cfL').onclick = async () => { closeModal(); try { await S.pushRemote(st, true); toast('Sauvegarde de cet appareil envoyée.', 'ok'); } catch (e) { toast(e.message, 'err'); } };
  $('#cfR').onclick = async () => { closeModal(); try { const d = await S.fetchRemote(); st = C.migrate(d.data); st._rev = d.revision; S.saveLocal(st); go('hub'); } catch (e) { toast(e.message, 'err'); } };
}
window.addEventListener('ft26-conflict', e => conflict(e.detail));
async function doAuth(kind) {
  const u = $('#acU').value.trim(), p = $('#acP').value;
  if (u.length < 3 || p.length < 8) return toast('Nom (3+) et mot de passe (8+) requis.', 'err');
  toast('Connexion au serveur…');
  try {
    await (kind === 'login' ? S.login(u, p) : S.register(u, p));
    toast(kind === 'login' ? 'Connecté ✓' : 'Compte créé ✓', 'ok');
    try { const d = await S.fetchRemote(); if (d.data && (!st || d.data.updatedAt > (st.updatedAt || 0))) confirmBox(`Une sauvegarde serveur existe (saison ${d.data.season}). La charger ?`, () => { st = C.migrate(d.data); st._rev = d.revision; S.saveLocal(st); go('hub'); }); else if (st) save(); } catch (e) {}
    render();
  } catch (e) { toast(e.message, 'err'); }
}
// Publicité récompensée : AdMob natif sur Android si disponible, sinon simulation clairement signalée (web)
async function showRewardAd() {
  const isNative = window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform();
  let native = null;
  if (isNative) { try { native = window.Capacitor.registerPlugin ? window.Capacitor.registerPlugin('AdMob') : window.Capacitor.Plugins.AdMob; } catch (e) { native = window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob; } }
  const grant = () => { const r = C.adReward(st); toast(r.msg, r.ok ? 'ok' : 'err'); save(); render(); };
  if (st.adRewardsToday.day === new Date().toISOString().slice(0, 10) && st.adRewardsToday.n >= 3) return toast('Limite de 3 récompenses par jour atteinte.', 'err');
  if (native) {
    try {
      const AdMob = native; const cfg = window.FT_ADS || {};
      await AdMob.initialize({ initializeForTesting: !!cfg.test });
      let rewarded = false;
      const h = await AdMob.addListener('onRewardedVideoAdReward', () => { rewarded = true; });
      await AdMob.prepareRewardVideoAd({ adId: cfg.rewarded, isTesting: !!cfg.test, npa: settings.adsConsent !== true });
      await AdMob.showRewardVideoAd();
      h && h.remove && h.remove();
      if (rewarded) grant(); else toast('Publicité interrompue : pas de récompense.');
    } catch (e) { toast('Publicité indisponible pour le moment.', 'err'); }
    return;
  }
  modal(`<h3>Publicité récompensée (simulation web)</h3><p class="hint">Sur la version web, aucune régie publicitaire n'est intégrée : cet écran simule une publicité de 5 secondes. Sur Android, une vraie publicité AdMob est affichée.</p><div class="adsim"><div id="adBar"></div></div>`, { locked: true });
  let k = 0; const it = setInterval(() => { k++; const b = $('#adBar'); if (b) b.style.width = k * 20 + '%'; if (k >= 5) { clearInterval(it); closeModal(); grant(); } }, 1000);
}

// ------------------------------------------------------------------ événements
document.addEventListener('click', e => {
  const el = e.target.closest('[data-a]');
  if (!el || el.tagName === 'SELECT' || (el.tagName === 'INPUT' && el.type !== 'button')) return;
  const fn = ACT[el.dataset.a]; if (fn) { A.audioInit(); A.click(); fn(el); }
});
document.addEventListener('change', e => {
  const el = e.target; const a = el.dataset.a; if (!a) return;
  const v = el.type === 'checkbox' ? el.checked : el.value;
  const val = v === 'true' ? true : v === 'false' ? false : v === 'null' ? null : (el.type !== 'checkbox' && v !== '' && !isNaN(v) ? Number(v) : v);
  if (a === 'setting') { settings[el.dataset.k] = val; S.saveSettings(settings); if (el.dataset.k === 'lang') setLang(val); A.setAudio(settings.sound, settings.volume); A.setVoice(settings.voice); render(); }
  if (!st) return;
  const tac = st.clubs[st.userClub].tactics;
  if (a === 'tacSet') { tac[el.dataset.k] = el.dataset.k === 'formation' ? v : Number(v); if (el.dataset.k === 'formation') C.repairLineup(st, st.userClub); save(); render(); }
  if (a === 'taker') { tac.takers[el.dataset.k] = v; save(); }
  if (a === 'instr') { tac.instr[el.dataset.id] = v; save(); }
  if (a === 'setTrain') { st.training[el.dataset.k] = el.dataset.k === 'intensity' ? Number(v) : v; save(); render(); }
  if (a === 'setIndiv') { if (v) st.training.individual[el.dataset.id] = v; else delete st.training.individual[el.dataset.id]; save(); }
  if (a === 'treat') { const r = C.setTreatment(st, el.dataset.id, v); toast(r.msg, r.ok ? 'ok' : 'err'); save(); render(); }
  if (a === 'ticket') { st.ticketPrice = Number(v); save(); }
  if (a === 'winBonus') { st.winBonus = Number(v); save(); }
  if (a === 'allowDebt') { st.settingsGame.allowDebt = el.checked; if (el.checked) st.president.trust = clamp(st.president.trust - 3, 0, 100); save(); render(); }
  if (a === 'setObj') { st.objective = v; save(); render(); }
  if (a === 'importSave') { const f = el.files[0]; if (!f) return; f.text().then(txt => { try { const d = C.migrate(JSON.parse(txt)); if (!d.clubs || !d.players) throw 0; st = d; S.saveLocal(st); toast('Carrière importée ✓', 'ok'); go('hub'); } catch (e2) { toast('Fichier invalide.', 'err'); } }); }
});
// importation : l'input file utilise data-a mais n'est pas un clic
addEventListener('online', () => { const el = $('#sync'); if (el) el.textContent = syncLabel(); if (st && S.auth() && S.hasPending()) save(); });
addEventListener('offline', () => { const el = $('#sync'); if (el) el.textContent = syncLabel(); toast('Connexion perdue : la partie continue hors ligne.'); });
document.addEventListener('visibilitychange', () => { if (document.hidden && st) S.saveLocal(st); });
window.addEventListener('error', e => { console.error(e.error || e.message); });

// ------------------------------------------------------------------ démarrage
(async function boot() {
  clearTimeout(window.__ftBootTimer);
  render();
  const splash = $('#splash'); if (splash) setTimeout(() => splash.classList.add('hide'), 400);
  S.health().then(h => { serverInfo = h; if (['account', 'settings', 'settingsHome'].includes(view)) render(); }).catch(() => { serverInfo = null; });
  dataOverrides = await S.fetchDataOverrides();
  if (dataOverrides && dataOverrides.clubs && view === 'newCareer') render();
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform())) navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then(reg => reg.update()).catch(() => {});
  window.__ft26 = { get st() { return st; }, get match() { return match; }, C, go };
  // Android (Capacitor) : bouton retour, mise en arrière-plan / reprise après veille
  const cap = window.Capacitor;
  if (cap && cap.isNativePlatform && cap.isNativePlatform()) {
    try {
      const App = cap.registerPlugin('App');
      App.addListener('backButton', () => {
        if ($('#modal').className === 'show') { closeModal(); if (match) { match.paused = false; match.last = performance.now(); } return; }
        if (match) { match.paused = true; pauseMenu(); return; }
        if (view === 'home') App.exitApp(); else if (st && view !== 'hub' && view !== 'gameOver') go('hub'); else go('home');
      });
      App.addListener('appStateChange', s2 => {
        if (!s2.isActive) { if (st) S.saveLocal(st); if (match && !match.paused) { match.paused = true; A.audioSuspend(); pauseMenu(); } }
        else A.audioResume();
      });
    } catch (e) { console.warn('Plugin App indisponible', e); }
  }
})();
