// Mercato : club vendeur en plusieurs tours, agent du joueur, clauses libératoires.
import assert from 'node:assert/strict';
const Tx = await import('../public/js/transfers.js');
const C = await import('../public/js/career.js');
const fixed = v => () => v;

// Club vendeur.
assert.equal(Tx.clubDecision({ value: 100, ask: 100 }).decision, 'accept');
const c0 = Tx.clubDecision({ value: 80000, ask: 100000, round: 0, roll: fixed(0.99) });
const c2 = Tx.clubDecision({ value: 80000, ask: 100000, round: 2, roll: fixed(0.99) });
assert.equal(c0.decision, 'counter'); assert.ok(c0.counter < 100000 && c0.counter > 80000, 'contre-offre entre l’offre et le prix');
assert.ok(c2.counter < c0.counter, 'le club cède davantage au fil des tours');
assert.equal(Tx.clubDecision({ value: 40000, ask: 100000 }).reason, 'insult', 'offre insultante');
assert.equal(Tx.clubDecision({ value: 80000, ask: 100000, round: Tx.MAX_ROUNDS, roll: fixed(0.99) }).reason, 'patience', 'patience limitée à 3 tours');
console.log('CLUB ROUNDS OK — contre-offres dégressives, insulte, patience');

// Agent.
const terms = Tx.personalTerms({ demand: 10000, style: 'gourmand', fee: 500000, value: 400000, wantsClause: true });
assert.ok(terms.wage > 10000 && terms.agentFee >= 50000 && terms.releaseClause === 1000000, 'agent gourmand : salaire et commission élevés, clause demandée');
assert.ok(Tx.personalTerms({ demand: 10000, style: 'proche', fee: 500000 }).agentFee < terms.agentFee, 'un proche du joueur prend moins');
const first = Tx.agentDecision({ offer: { wage: 9000, signing: 0, agentFee: 0 }, terms, style: 'gourmand', round: 0, roll: fixed(0.99) });
assert.equal(first.decision, 'counter', 'au premier contact l’agent annonce ses conditions');
assert.ok(first.counter.releaseClause === terms.releaseClause, 'la clause reste exigée');
assert.equal(Tx.agentDecision({ offer: first.counter, terms: first.counter, style: 'gourmand', round: 1, roll: fixed(0.99) }).decision, 'accept', 'accepter sa contre-proposition conclut l’accord');
assert.equal(Tx.agentDecision({ offer: { wage: 1000 }, terms, round: 0, roll: fixed(0.99) }).decision, 'reject', 'offre indécente rejetée');
assert.equal(Tx.agentDecision({ offer: { wage: 9000 }, terms, round: Tx.MAX_ROUNDS, roll: fixed(0.99) }).decision, 'reject', 'patience de l’agent limitée');
assert.ok(Tx.wantsReleaseClause({ ovr: 75, age: 24 }, 60) && !Tx.wantsReleaseClause({ ovr: 55, age: 24 }, 60), 'seuls les joueurs ambitieux exigent une clause');
console.log('AGENT OK — styles, conditions, contre-propositions, clause exigée');

// Parcours complet en carrière (aléa reproductible : certaines décisions de club utilisent Math.random).
{ let seedR = 7; Math.random = () => (seedR = (seedR * 16807) % 2147483647) / 2147483647; }
const st = C.newCareer({ clubId: 'ca', seed: 21 }); st.window = 'été'; st.settingsGame.allowDebt = true;
const target = Object.values(st.players).filter(p => p.clubId && p.clubId !== 'ca' && p.ovr >= 64 && p.ovr <= 74 && p.age >= 24).sort((a, b) => b.ovr - a.ovr)[3];
const ask = C.askingPrice(st, target), dem = C.wageDemand(st, target, 'titulaire');
const r = C.makeOffer(st, target.id, { type: 'achat', fee: Math.round(ask * 0.8), wage: Math.round(dem * 0.92), signing: dem * 2, agentFee: 30000, years: 3, role: 'titulaire' });
let n = C.respondNow(st, r.n.id);
assert.equal(n.status, 'contre-offre');
assert.ok(['contre-offre joueur', 'accord'].includes(C.acceptClubCounter(st, n.id).n.status), 'le club accepte son propre prix, puis l’agent annonce ses conditions ou accepte directement');
let k = 0; while (n.status === 'contre-offre joueur' && k++ < 3) C.acceptAgentCounter(st, n.id);
assert.equal(n.status, 'accord');
const before = st.clubs.ca.budget;
assert.ok(C.confirmTransfer(st, n.id).ok);
assert.equal(before - st.clubs.ca.budget, n.fee + n.signing + n.agentFee, 'indemnité + prime + commission débitées');
assert.equal(target.releaseClause || 0, n.releaseClause || 0, 'la clause figure au contrat');
// Négociation poursuivie : même dossier, compteur de tours conservé.
const t2 = Object.values(st.players).filter(p => p.clubId && p.clubId !== 'ca' && p.ovr >= 60 && p !== target)[5];
const a2 = C.askingPrice(st, t2);
const r2 = C.makeOffer(st, t2.id, { type: 'achat', fee: Math.round(a2 * 0.75), wage: 5000, signing: 0, years: 2 }); C.respondNow(st, r2.n.id);
if (r2.n.status === 'contre-offre') { const again = C.makeOffer(st, t2.id, { type: 'achat', fee: Math.round(a2 * 0.8), wage: 5000, signing: 0, years: 2 }); assert.equal(again.n.id, r2.n.id, 'même négociation'); assert.equal(again.n.round, 1); }
// Offre insultante : discussions bloquées.
const t3 = Object.values(st.players).filter(p => p.clubId && p.clubId !== 'ca' && p.ovr >= 58 && p !== target && p !== t2)[8];
const r3 = C.makeOffer(st, t3.id, { type: 'achat', fee: 1000, wage: 3000, signing: 0, years: 2 }); C.respondNow(st, r3.n.id);
assert.equal(C.makeOffer(st, t3.id, { type: 'achat', fee: C.askingPrice(st, t3), wage: 3000, signing: 0, years: 2 }).ok, false, 'club fâché pendant 4 semaines');
// Clause payée : le club vendeur est court-circuité.
const t4 = Object.values(st.players).filter(p => p.clubId && p.clubId !== 'ca' && ![target, t2, t3].includes(p))[30]; t4.releaseClause = 150000;
const r4 = C.makeOffer(st, t4.id, { type: 'achat', fee: 150000, wage: 3000, signing: 0, years: 2 });
assert.equal(r4.n.step, 'joueur'); assert.ok(r4.n.clausePaid);
console.log('CAREER MERCATO OK — contre-offres, agent, commission, clause, blocage, dossier suivi');

// Un club adverse peut lever la clause d’un de vos joueurs.
assert.equal(Tx.clauseTriggered({ clause: 100000, value: 300000, buyerBudget: 50000, roll: fixed(0) }), false, 'budget insuffisant');
assert.equal(Tx.clauseTriggered({ clause: 100000, value: 300000, buyerBudget: 500000, ovr: 70, roll: fixed(0) }), true, 'clause sous-évaluée levée');
assert.equal(Tx.clauseTriggered({ clause: 1000000, value: 300000, buyerBudget: 5000000, roll: fixed(0) }), false, 'clause dissuasive');
console.log('CLAUSE OK — levée par un club adverse seulement si elle est attractive et finançable');
