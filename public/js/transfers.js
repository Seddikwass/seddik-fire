// Négociations de transfert en plusieurs tours : club vendeur, agent du joueur, clauses.
// Fonctions pures : la carrière les appelle, l'interface affiche leurs propositions.

export const MAX_ROUNDS = 3;
export const AGENT_STYLES = {
  gourmand: { label: 'Agent gourmand', wage: 1.12, fee: 0.1, flex: 0.035 },
  raisonnable: { label: 'Agent raisonnable', wage: 1, fee: 0.06, flex: 0.07 },
  proche: { label: 'Proche du joueur', wage: 0.96, fee: 0.03, flex: 0.1 },
};
const r1000 = v => Math.round(v / 1000) * 1000;
const r50 = v => Math.round(v / 50) * 50;

// Agent attribué de façon stable à chaque joueur (anciennes sauvegardes comprises).
export function agentOf(p) {
  if (p.agent && AGENT_STYLES[p.agent]) return p.agent;
  let h = 7; for (const ch of String(p.id || p.name || '')) h = (h * 33 + ch.charCodeAt(0)) >>> 0;
  return (p.agent = ['raisonnable', 'gourmand', 'raisonnable', 'proche', 'gourmand'][h % 5]);
}

// Réponse du club vendeur à la valeur de l'offre (indemnité + bonus + revente + échange).
export function clubDecision({ value = 0, ask = 1, round = 0, roll = Math.random } = {}) {
  const ratio = value / Math.max(1, ask);
  if (ratio >= 1) return { decision: 'accept' };
  if (ratio >= 0.9 && roll() < (ratio - 0.88) * 5) return { decision: 'accept' };
  if (ratio < 0.55) return { decision: 'reject', reason: 'insult' };
  if (round >= MAX_ROUNDS) return { decision: 'reject', reason: 'patience' };
  // Le club concède un peu plus à chaque tour, sans jamais descendre sous l'offre reçue.
  const concede = 0.12 + 0.1 * round;
  return { decision: 'counter', counter: Math.max(r1000(value * 1.02), r1000(ask - (ask - value) * concede)) };
}

// Conditions personnelles réclamées par l'agent.
export function personalTerms({ demand = 1000, style = 'raisonnable', fee = 0, freeAgent = false, value = 0, wantsClause = false } = {}) {
  const a = AGENT_STYLES[style] || AGENT_STYLES.raisonnable;
  const wage = r50(demand * a.wage);
  return {
    wage,
    signing: r1000(wage * 3),
    agentFee: Math.max(2000, r1000(freeAgent ? wage * 4 * (a.fee / 0.06) : fee * a.fee)),
    releaseClause: wantsClause ? r1000(Math.max(value, 50000) * 2.5) : 0,
  };
}

// Un joueur ambitieux dont le niveau dépasse le club exige une clause libératoire.
export function wantsReleaseClause(p, clubRep = 60) {
  return (p.ovr || 50) >= 62 && (p.ovr || 50) > clubRep * 0.85 && (p.age || 25) <= 29;
}

function packageScore(offer, terms, extras = 0) {
  const part = (got, want) => want > 0 ? Math.min(1.25, (got || 0) / want) : 1;
  let score = 0.65 * part(offer.wage, terms.wage) + 0.15 * part(offer.signing, terms.signing) + 0.2 * part(offer.agentFee, terms.agentFee) + extras;
  if (terms.releaseClause) {
    if (!offer.releaseClause) score -= 0.1;
    else if (offer.releaseClause > terms.releaseClause * 1.25) score -= 0.08;
  }
  return score;
}

// Réponse de l'agent : accord, contre-proposition (au plus 3 tours) ou refus.
export function agentDecision({ offer = {}, terms, style = 'raisonnable', extras = 0, round = 0, roll = Math.random } = {}) {
  const a = AGENT_STYLES[style] || AGENT_STYLES.raisonnable;
  const score = packageScore(offer, terms, extras);
  if (score >= 0.97 || roll() < (score - 0.9) * 2) return { decision: 'accept', score };
  // Premier contact : l'agent annonce ses conditions sauf offre indécente ; ensuite sa patience s'use.
  const wageRatio = (offer.wage || 0) / Math.max(1, terms.wage);
  if ((round === 0 ? wageRatio < 0.7 : score < 0.72) || round >= MAX_ROUNDS) return { decision: 'reject', score };
  // L'agent se rapproche de l'offre à chaque tour selon sa souplesse.
  const k = Math.min(0.6, a.flex * (round + 1) * 2);
  const meet = (want, got) => (got || 0) >= want ? want : want - (want - (got || 0)) * k;
  const counter = {
    wage: r50(meet(terms.wage, offer.wage)),
    signing: r1000(meet(terms.signing, offer.signing)),
    agentFee: r1000(meet(terms.agentFee, offer.agentFee)),
    releaseClause: terms.releaseClause ? (offer.releaseClause && offer.releaseClause <= terms.releaseClause * 1.25 ? offer.releaseClause : terms.releaseClause) : 0,
  };
  return { decision: 'counter', score, counter };
}

// Un club adverse paie-t-il la clause libératoire d'un joueur ?
export function clauseTriggered({ clause = 0, value = 0, buyerBudget = 0, ovr = 50, roll = Math.random } = {}) {
  if (!clause || buyerBudget < clause) return false;
  const bargain = value / clause; // plus la clause est basse par rapport à la valeur, plus elle attire
  return roll() < Math.min(0.12, Math.max(0, (bargain - 0.35)) * 0.12 * (ovr >= 65 ? 1.5 : 1));
}
