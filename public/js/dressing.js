// Vestiaire : attentes de temps de jeu, personnalités, discussions individuelles,
// promesses suivies, réunions d'équipe et ambiance collective.
// Fonctions pures sur des objets joueurs : aucune dépendance au rendu.

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// Part de titularisations attendue selon le statut promis au joueur.
export const ROLE_EXPECT = { cle: 0.75, titulaire: 0.55, rotation: 0.22, espoir: 0.08, jeune: 0.05 };
export const ROLE_LABEL = { cle: 'Joueur clé', titulaire: 'Titulaire', rotation: 'Rotation', espoir: 'Espoir', jeune: 'Jeune' };
export const PERSONALITIES = {
  leader: { label: 'Leader', influence: 2.2 },
  pro: { label: 'Professionnel', influence: 1 },
  temperament: { label: 'Tempérament', influence: 1.4 },
  discret: { label: 'Discret', influence: 0.6 },
};
const PLAY_LOG = 8;

// Personnalité stable déduite de l'identifiant (anciennes sauvegardes comprises).
export function personalityOf(p) {
  if (p.personality && PERSONALITIES[p.personality]) return p.personality;
  let h = 0; for (const ch of String(p.id || p.name || '')) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const keys = ['pro', 'pro', 'discret', 'temperament', 'leader', 'pro', 'discret'];
  let k = keys[h % keys.length];
  if (k === 'leader' && (p.age || 25) < 24) k = 'pro';
  return (p.personality = k);
}

// Temps de jeu : 1 titulaire, 0,5 entré en jeu, 0 non utilisé (les blessés ne comptent pas).
export function recordPlayingTime(players, starters = [], subs = []) {
  const s = new Set(starters), b = new Set(subs);
  for (const p of players) {
    if (p.injury) continue;
    p.playLog = (p.playLog || []).concat(s.has(p.id) ? 1 : b.has(p.id) ? 0.5 : 0).slice(-PLAY_LOG);
    p.matchesSinceTalk = (p.matchesSinceTalk ?? 99) + 1;
    if (p.promise) p.promise.left--;
  }
}

export function playingShare(p) {
  const log = p.playLog || [];
  return log.length ? log.reduce((a, b) => a + b, 0) / log.length : null;
}

// Écart entre le temps de jeu réel et l'attente du rôle (positif = satisfait).
export function playingTimeGap(p) {
  const share = playingShare(p);
  if (share == null || (p.playLog || []).length < 4) return 0;
  return share - (ROLE_EXPECT[p.role] ?? 0.3);
}

// Évolution hebdomadaire du bonheur et vérification des promesses.
// Retourne les événements à annoncer (promesse tenue / rompue, demande de départ).
export function weeklyHappiness(players, { won = 0, lost = 0 } = {}) {
  const events = [];
  for (const p of players) {
    personalityOf(p);
    const gap = playingTimeGap(p);
    let delta = gap >= 0 ? Math.min(2.5, 0.6 + gap * 3 + (p.happiness < 50 ? 1.2 : 0)) : clamp(gap * 5, -2.2, 0);
    if (p.personality === 'temperament' && delta < 0) delta *= 1.35;
    if (p.personality === 'discret' && delta < 0) delta *= 0.7;
    delta += won * 0.4 - lost * 0.3;
    if (delta > 0 && p.happiness > 85) delta *= 0.15; // la satisfaction plafonne naturellement
    // Retour progressif vers un niveau neutre quand rien ne pèse.
    if (Math.abs(gap) < 0.05) delta += (60 - p.happiness) * 0.05;
    if (p.promise) {
      if (p.promise.left <= 0) {
        const kept = (playingShare(p) ?? 0) >= p.promise.share;
        if (kept) { delta += 10; events.push({ type: 'promise-kept', p }); }
        else { delta -= 25; p.morale = clamp(p.morale - 10, 5, 100); events.push({ type: 'promise-broken', p }); }
        p.promise = null;
      }
    }
    p.happiness = clamp(p.happiness + delta, 0, 100);
    if (p.happiness < 20 && !p.listed && !p.loan && events.every(e => e.p !== p)) events.push({ type: 'wants-out', p });
  }
  // Une seule nouvelle demande de départ par semaine : la plus mécontente.
  const outs = events.filter(e => e.type === 'wants-out').sort((a, b) => a.p.happiness - b.p.happiness);
  return events.filter(e => e.type !== 'wants-out').concat(outs.slice(0, 1));
}

// Ambiance du vestiaire : moyenne pondérée par l'influence, leaders mécontents, risque de crise.
export function dressingRoomState(players, captainId = null) {
  let w = 0, sum = 0;
  const unhappy = [], leaders = [];
  for (const p of players) {
    const kind = personalityOf(p);
    const influence = PERSONALITIES[kind].influence * (p.id === captainId ? 1.8 : 1);
    sum += p.happiness * influence; w += influence;
    if (p.happiness < 35) unhappy.push(p);
    if (kind === 'leader' || p.id === captainId) leaders.push(p);
  }
  const mood = w ? sum / w : 60;
  const unhappyLeaders = unhappy.filter(p => leaders.includes(p));
  const crisis = unhappy.length >= 4 || unhappyLeaders.length >= 1 && unhappy.length >= 2;
  const label = mood >= 72 ? 'Excellente' : mood >= 58 ? 'Bonne' : mood >= 45 ? 'Tendue' : 'Explosive';
  return { mood: Math.round(mood), label, unhappy, leaders, unhappyLeaders, crisis };
}

// Discussion individuelle. Retourne la réaction ; une discussion par joueur tous les 3 matchs.
export const TALKS = {
  praise: 'Féliciter',
  demand: 'Exiger plus',
  promise: 'Promettre du temps de jeu',
  reassure: 'Rassurer sur son avenir',
  acceptTransfer: 'Accepter sa demande de départ',
  refuseTransfer: 'Refuser sa demande de départ',
};
export function canTalk(p) { return (p.matchesSinceTalk ?? 99) >= 3; }

export function talkTo(p, action, roll = Math.random) {
  if (!TALKS[action]) return { ok: false, msg: 'Discussion inconnue.' };
  const transferAnswer = action === 'acceptTransfer' || action === 'refuseTransfer';
  if (!transferAnswer && !canTalk(p)) return { ok: false, msg: `${p.name} a déjà eu un entretien récemment. Attendez quelques matchs.` };
  const kind = personalityOf(p);
  const avg = p.stats?.apps ? p.stats.rsum / p.stats.apps : 6.5;
  const share = playingShare(p);
  let dm = 0, dh = 0, text = '';
  switch (action) {
    case 'praise':
      if (avg >= 6.9 || (p.form ?? 1) > 1.02) { dm = 7; dh = 3; text = 'Il apprécie la reconnaissance et se sent en confiance.'; }
      else { dm = 1; dh = -1; text = 'Il trouve les compliments peu crédibles au vu de ses dernières sorties.'; }
      break;
    case 'demand':
      if (avg < 6.4) {
        if (kind === 'pro' || kind === 'leader') { dm = 5; text = 'Il accepte la critique et promet de se reprendre.'; }
        else if (kind === 'temperament') { dm = -6; dh = -8; text = 'Il réagit très mal et conteste publiquement la critique.'; }
        else { dm = -2; dh = -2; text = 'Il encaisse sans rien dire, un peu abattu.'; }
      } else { dm = -4; dh = -6; text = 'Il ne comprend pas ce reproche alors qu\'il est en forme.'; }
      break;
    case 'promise':
      if (p.promise) return { ok: false, msg: 'Une promesse est déjà en cours avec ce joueur.' };
      p.promise = { share: Math.min(0.9, (ROLE_EXPECT[p.role] ?? 0.3) + 0.15), left: 5 };
      dh = 14; dm = 4; text = `Il vous fait confiance : vous devez lui donner au moins ${Math.round(p.promise.share * 100)} % de titularisations sur les 5 prochains matchs.`;
      break;
    case 'reassure':
      if (share != null && share < (ROLE_EXPECT[p.role] ?? 0.3) - 0.15 && roll() < 0.6) { dh = -3; text = 'Les mots ne suffisent pas : il attend du temps de jeu.'; }
      else { dh = 6; dm = 2; text = 'Il se sent important pour le projet.'; }
      break;
    case 'acceptTransfer':
      if (!p.listed) return { ok: false, msg: 'Ce joueur n\'a pas demandé à partir.' };
      p.listed = true; dh = 12; text = 'Il est soulagé : il est désormais placé sur la liste des transferts.';
      break;
    case 'refuseTransfer':
      if (p.listed !== 'demande') return { ok: false, msg: 'Aucune demande de départ en attente.' };
      p.listed = false; dh = kind === 'discret' ? -4 : -12; dm = -5;
      text = kind === 'temperament' ? 'Il est furieux et menace d\'aller voir la presse.' : 'Il est déçu mais reste au club.';
      break;
  }
  p.morale = clamp(p.morale + dm, 5, 100);
  p.happiness = clamp(p.happiness + dh, 0, 100);
  if (!transferAnswer) p.matchesSinceTalk = 0;
  return { ok: true, msg: `${p.name} : ${text}`, dm, dh };
}

// Réunion d'équipe (une tous les 4 matchs) : l'effet dépend de l'ambiance et des résultats.
export const MEETINGS = { motivate: 'Motiver le groupe', calm: 'Apaiser les tensions', demand: 'Hausser le ton' };
export function teamMeeting(players, action, { recentPoints = 1.5, room = null } = {}) {
  const state = room || dressingRoomState(players);
  let dm = 0, dh = 0, cohesion = 0, text = '';
  if (action === 'motivate') {
    if (state.mood >= 50) { dm = 5; cohesion = 2; text = 'Le groupe repart gonflé à bloc.'; }
    else { dm = 1; text = 'Le discours tombe à plat dans un vestiaire tendu.'; }
  } else if (action === 'calm') {
    if (state.mood < 58) { dh = 6; cohesion = 3; text = 'Les tensions retombent, le groupe se ressoude.'; }
    else { dm = -1; text = 'Les joueurs ne voyaient pas de problème à régler.'; }
  } else if (action === 'demand') {
    if (recentPoints < 1.2) { dm = 6; cohesion = 1; text = 'Le message passe : les joueurs savent que les résultats ne suffisent pas.'; }
    else { dm = -5; dh = -4; cohesion = -3; text = 'Le groupe trouve la critique injuste après de bons résultats.'; }
  } else return { ok: false, msg: 'Réunion inconnue.' };
  for (const p of players) {
    const k = personalityOf(p);
    const scale = action === 'demand' && k === 'temperament' && dm < 0 ? 1.5 : 1;
    p.morale = clamp(p.morale + dm * scale, 5, 100);
    p.happiness = clamp(p.happiness + dh * scale, 0, 100);
  }
  return { ok: true, msg: text, dm, dh, cohesion };
}

// Effet du moral en match : de −3 % (moral au plus bas) à +2 % (moral au plus haut).
export function moraleFactor(morale = 70) {
  return 0.97 + clamp(Number(morale) || 0, 0, 100) / 100 * 0.05;
}
