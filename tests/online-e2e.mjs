// Match en ligne de bout en bout : deux navigateurs, salon par code, match en direct, abandon, résultat.
import { chromium } from '/opt/npm-tools/node_modules/playwright/index.mjs';
const BASE = process.env.BASE || 'http://127.0.0.1:3000', OUT = process.env.OUT || '/tmp';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] });
const mk = async () => { const ctx = await b.newContext({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'fr-FR' }); const p = await ctx.newPage(); p.errs = []; p.on('pageerror', e => p.errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') p.errs.push(m.text()); }); return p; };
const A = await mk(), B = await mk();
for (const p of [A, B]) { await p.goto(BASE); await p.waitForSelector('.title-in'); await p.click('[data-v=online]'); await p.waitForSelector('#olName'); }
await A.fill('#olName', 'Wassim'); await A.selectOption('#olClub', 'est'); await A.click('[data-a=createRoom]');
await A.waitForSelector('.room-code'); const code = (await A.textContent('.room-code')).trim();
await A.screenshot({ path: `${OUT}/ol-1-salon.png` }); console.log('📸 salon', code);
await B.fill('#olName', 'Ami'); await B.selectOption('#olClub', 'ca'); await B.fill('#olCode', code.toLowerCase()); await B.click('[data-a=joinRoom]');
await Promise.all([A.waitForSelector('#cv'), B.waitForSelector('#cv')]);
await A.waitForFunction(() => window.__ft26.match?.net && window.__ft26.match.minute > 0.3, null, { timeout: 30000 });
const sideA = await A.evaluate(() => window.__ft26.match.userSide), sideB = await B.evaluate(() => window.__ft26.match.userSide);
// B pousse son joystick : son joueur sélectionné doit bouger sur les DEUX écrans (état officiel du serveur).
const selB = await B.evaluate(() => { const m = window.__ft26.match; return m.selected?.i; });
const yBefore = await A.evaluate(i => window.__ft26.match.teams[1].ps[i].y, selB);
await B.evaluate(() => { const m = window.__ft26.match; m.input.jx = 0; m.input.jy = 1; m.input.sprint = true; });
await B.waitForTimeout(1500);
const yAfter = await A.evaluate(i => window.__ft26.match.teams[1].ps[i].y, selB);
await A.screenshot({ path: `${OUT}/ol-2-match-A.png` }); await B.screenshot({ path: `${OUT}/ol-3-match-B.png` });
const scoreA = await A.evaluate(() => window.__ft26.match.score.join('-')), scoreB = await B.evaluate(() => window.__ft26.match.score.join('-'));
console.log('côtés', sideA, sideB, '| déplacement du joueur de B vu par A :', yBefore.toFixed(1), '→', yAfter.toFixed(1), '| scores', scoreA, scoreB);
if (sideA !== 0 || sideB !== 1) throw new Error('côtés incorrects');
if (Math.abs(yAfter - yBefore) < 2) throw new Error('les commandes de B ne sont pas appliquées');
// Abandon de A depuis le menu.
await A.click('#bPause'); await A.click('#pForfeit'); await A.click('#cfYes');
await Promise.all([A.waitForSelector('text=Rejouer en ligne', { timeout: 15000 }), B.waitForSelector('text=Rejouer en ligne', { timeout: 15000 })]);
await B.screenshot({ path: `${OUT}/ol-4-fin-B.png` });
const errs = [...A.errs, ...B.errs];
console.log(errs.length ? 'Erreurs JavaScript : ' + errs.join(' | ') : 'Aucune erreur JavaScript');
await b.close();
if (errs.length) process.exit(1);
