// Test de bout en bout (navigateur Chromium, écran de téléphone en paysage)
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:3000';
const OUT = process.env.OUT || 'shots';
const errors = [];
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR' });
const p = await ctx.newPage();
p.on('pageerror', e => errors.push('pageerror: ' + e.message));
p.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
const shot = async n => { await p.waitForTimeout(250); await p.screenshot({ path: `${OUT}/${n}.png` }); console.log('📸', n); };
const click = async sel => { await p.click(sel); await p.waitForTimeout(200); };
await p.goto(BASE); await p.waitForSelector('.title-in'); await p.waitForTimeout(700); await shot('01-accueil');
await click('[data-v=newCareer]'); await shot('02-choix-club');
await click('[data-a=pickClub][data-id=ca]'); await shot('03-options-carriere');
await click('[data-a=startCareer]'); await p.waitForSelector('.dash'); await shot('04-hub');
await click('[data-a=nav][data-v=president]'); await click('[data-a=sponsor][data-id=stable]'); await shot('05-president');
await click('[data-a=nav][data-v=squad]'); await shot('06-effectif');
await click('tr[data-a=player]'); await shot('07-fiche-joueur'); await click('[data-a=closeModal]');
await click('[data-a=nav][data-v=tactics]'); await shot('08-tactique');
await click('[data-a=nav][data-v=transfers]'); await shot('09-transferts');
await click('[data-a=nav][data-v=staff]'); await shot('10-staff');
await click('[data-a=nav][data-v=finances]'); await shot('11-finances');
await click('[data-a=nav][data-v=infra]'); await shot('12-infrastructures');
await click('[data-a=nav][data-v=comps]'); await click('[data-tab=CL]'); await shot('13-ligue-champions');
await click('[data-a=nav][data-v=tables]'); await shot('14-classement');
await click('[data-a=nav][data-v=medical]'); await shot('15-medical');
await click('[data-a=nav][data-v=settings]'); await shot('16-parametres');
// match joué
await click('[data-a=nav][data-v=prematch]'); await shot('17-avant-match');
await p.selectOption('#pmDur', '3');
await click('[data-a=playMatch]'); await p.waitForSelector('#cv'); await p.waitForTimeout(2500); await shot('18-match-coup-envoi');
// joystick : glisser vers la droite et passer / tirer
const vp = p.viewportSize();
await p.mouse.move(150, vp.height - 100); await p.mouse.down(); await p.mouse.move(220, vp.height - 110, { steps: 5 });
await p.waitForTimeout(1500);
await p.dispatchEvent('#bPass', 'pointerdown'); await p.dispatchEvent('#bPass', 'pointerup');
await p.waitForTimeout(1500); await shot('19-match-action');
await p.dispatchEvent('#bShoot', 'pointerdown'); await p.waitForTimeout(500); await p.dispatchEvent('#bShoot', 'pointerup');
await p.mouse.up();
await p.waitForTimeout(4000); await shot('20-match-jeu');
const info = await p.evaluate(() => { const m = window.__ft26.match; return m ? { min: m.minute, score: m.score, state: m.state, shots: m.stats.shots, passes: m.stats.passes, sel: m.selected?.name } : null; });
console.log('état du match', JSON.stringify(info));
await click('#bPause'); await shot('21-pause');
await click('#pSim'); await p.waitForSelector('.post', { timeout: 15000 }); await shot('22-apres-match');
await click('[data-v=hub]'); await shot('23-hub-apres-match');
// avancer plusieurs étapes en simulation
for (let i = 0; i < 6; i++) { const btn = await p.$('[data-a=advance]'); if (btn) await click('[data-a=advance]'); else { await click('[data-a=nav][data-v=prematch]'); await click('[data-a=simMatch]'); await click('[data-v=hub]'); } }
await shot('24-hub-avance');
// rechargement : la carrière est restaurée
await p.reload(); await p.waitForSelector('.title-in'); await click('[data-a=continue]'); await p.waitForSelector('.dash'); await shot('25-reprise');
const slot = await p.evaluate(() => window.__ft26.st.slot); console.log('créneau après reprise', slot);
// arabe
await click('[data-a=nav][data-v=settings]'); await p.selectOption('select[data-k=lang]', 'ar'); await p.waitForTimeout(300); await click('[data-a=nav][data-v=hub]'); await shot('26-hub-arabe');
await p.selectOption && (await click('[data-a=nav][data-v=settings]'), await p.selectOption('select[data-k=lang]', 'fr'));
// match rapide spectateur 
await click('[data-a=nav][data-v=home]'); await click('[data-v=quick]'); await p.selectOption('#qside', '-1'); await p.selectOption('#qdur', '3'); await click('[data-a=quickPlay]');
await p.waitForTimeout(6000); await shot('27-match-rapide-ia');
const q = await p.evaluate(() => { const m = window.__ft26.match; return { min: Math.round(m.minute), score: m.score, shots: m.stats.shots, passes: m.stats.passes, ok: m.stats.passOk }; });
console.log('IA contre IA après 6 s :', JSON.stringify(q));
console.log(errors.length ? 'ERREURS:\n' + errors.join('\n') : 'Aucune erreur JavaScript');
await b.close();
