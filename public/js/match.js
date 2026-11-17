// Moteur de match 2.5D — caméra télévisée en perspective, 11 contre 11, IA, contrôles tactiles, ralentis.
import { clamp, lerp } from './util.js';
import { FORMATIONS } from './data.js';
import * as A from './audio.js';

const HL = 52.5, HW = 34, GOAL_W = 3.66, GOAL_H = 2.44, G = 9.81;
const DT = 1 / 60;
const SKIN = ['#8d5524', '#c68642', '#e0ac69', '#a0662f', '#5c3a1e', '#f1c27d'];

const LINES = {
  fr: {
    kickoff: ['Coup d\'envoi ! {h} contre {a}.', 'C\'est parti au {st} !'],
    goal: ['BUT ! {p} trompe le gardien !', 'BUUUT pour {t} ! Signé {p} !', 'Quelle frappe de {p} ! {t} marque !'],
    save: ['Superbe arrêt de {p} !', 'Le gardien {p} s\'interpose !'],
    miss: ['Juste à côté !', 'Ça passe au-dessus !', 'Pas cadré.'],
    post: ['Sur le poteau !'],
    foul: ['Faute de {p}.', 'Coup franc sifflé.'],
    yellow: ['Carton jaune pour {p}.'],
    red: ['Carton rouge ! {p} est expulsé !'],
    corner: ['Corner pour {t}.'],
    penalty: ['Penalty pour {t} !'],
    half: ['C\'est la mi-temps. {h} {sh} - {sa} {a}.'],
    full: ['Coup de sifflet final ! {h} {sh} - {sa} {a}.'],
    chance: ['Grosse occasion pour {t} !', '{p} s\'infiltre dans la surface !'],
    injury: ['{p} est touché, il reste au sol.'],
  },
  ar: {
    kickoff: ['انطلاق المباراة! {h} ضد {a}.'], goal: ['هدف! {p} يسجل ل{t}!', 'هدددف! رائع من {p}!'], save: ['تصد رائع من {p}!'],
    miss: ['بجانب القائم!', 'فوق العارضة!'], post: ['القائم!'], foul: ['خطأ من {p}.'], yellow: ['بطاقة صفراء ل{p}.'], red: ['بطاقة حمراء! طرد {p}!'],
    corner: ['ركنية ل{t}.'], penalty: ['ضربة جزاء ل{t}!'], half: ['نهاية الشوط الأول. {h} {sh} - {sa} {a}.'], full: ['نهاية المباراة! {h} {sh} - {sa} {a}.'],
    chance: ['فرصة خطيرة ل{t}!'], injury: ['{p} مصاب.'],
  },
};
LINES.en = LINES.fr;

const v2len = (x, y) => Math.hypot(x, y);
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy || 1;
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / l2, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

export class Match {
  constructor(opts) {
    this.o = opts;
    this.canvas = opts.canvas; this.c = this.canvas.getContext('2d');
    this.settings = Object.assign({ duration: 5, difficulty: 1, assist: true, quality: 'high', fps: 60, voice: true, lang: 'fr' }, opts.settings || {});
    this.userSide = opts.userSide; // 0, 1 ou null (spectateur)
    this.teams = [this.makeTeam(opts.home, 0), this.makeTeam(opts.away, 1)];
    this.ball = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, owner: null, last: null, lastTeam: 0, prevOwnerT: -1 };
    this.score = [0, 0]; this.minute = 0; this.half = 1; this.clock = 0;
    this.stats = { poss: [0, 0], shots: [0, 0], onTarget: [0, 0], passes: [0, 0], passOk: [0, 0], fouls: [0, 0], corners: [0, 0], yellows: [0, 0], reds: [0, 0] };
    this.events = []; this.state = 'kickoff'; this.stateT = 0; this.kickTeam = 0;
    this.input = { jx: 0, jy: 0, sprint: false, shootHold: 0, shooting: false, press: false };
    this.selected = null; this.cam = { x: 0, y: 0, zoom: 1 };
    this.replayBuf = []; this.replay = null; this.paused = false; this.ended = false;
    this.msg = null; this.msgT = 0; this.ticker = ''; this.tickerT = 0;
    this.goalFxT = 0; this.goalFxTeam = 0;
    this.r = Math.random; this.acc = 0; this.last = 0; this.frameSkip = 0;
    this.subsLeft = [5, 5];
    this.crowdTex = null;
    this.halfLen = 45;
    this.secondsPerMinute = (this.settings.duration * 60) / 90;
    this.setupKickoff(0);
    this.resize = this.resize.bind(this); this.loop = this.loop.bind(this);
    this.onVis = () => { if (document.hidden) { this.paused = true; A.audioSuspend(); this.o.onPause && this.o.onPause(); } };
    window.addEventListener('resize', this.resize); document.addEventListener('visibilitychange', this.onVis);
    this.resize();
  }

  makeTeam(t, side) {
    const form = FORMATIONS[t.formation] || FORMATIONS['4-3-3'];
    const ps = t.players.slice(0, 11).map((p, i) => ({
      id: p.id, name: p.name, num: p.num || i + 1, pos: p.pos, a: p.attrs, team: side, i,
      isGK: i === 0, base: form[i], x: 0, y: 0, vx: 0, vy: 0, face: side === 0 ? 1 : -1, anim: Math.random() * 6,
      stamina: clamp(p.fitness ?? 1, 0.5, 1), cd: 0, tackleCd: 0, run: 0, diveT: 0, slideT: 0, slideDir: 1, jumpT: 0, jumpCd: 0, yellow: 0, sentOff: false, injured: false,
      instr: p.instr || '', skin: SKIN[(p.name || '').length % SKIN.length], rating: 6.5, touches: 0, goals: 0, assists: 0, minutes: 0,
    }));
    return {
      side, name: t.name, short: t.short, kit: t.kit || { shirt: t.colors[0], trim: t.colors[1], shorts: t.colors[1] },
      gkKit: t.gkKit || { shirt: '#2fb84a', trim: '#111', shorts: '#111' },
      ps, bench: (t.bench || []).map(b => ({ ...b })), mentality: t.mentality || 0, pressing: t.pressing ?? 1, formation: t.formation,
      width: t.width ?? 1, line: t.line ?? 0, takers: t.takers || {},
      dir: side === 0 ? 1 : -1, stadium: t.stadium,
    };
  }

  // ---------------- cycle de vie ----------------
  start() { this.running = true; this.last = performance.now(); A.audioInit(); A.crowd(0.25); requestAnimationFrame(this.loop); }
  destroy() { this.running = false; window.removeEventListener('resize', this.resize); document.removeEventListener('visibilitychange', this.onVis); A.stopDrums(); A.crowd(0); }
  resize() {
    const dpr = this.settings.quality === 'low' ? 1 : this.settings.quality === 'medium' ? Math.min(1.5, devicePixelRatio || 1) : Math.min(2, devicePixelRatio || 1);
    const w = this.canvas.clientWidth || innerWidth, h = this.canvas.clientHeight || innerHeight;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.W = this.canvas.width; this.H = this.canvas.height; this.dpr = dpr;
  }
  loop(now) {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    if (this.settings.fps === 30 && (this.frameSkip ^= 1)) return;
    let dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    if (!this.paused) {
      if (this.replay) this.updateReplay(dt);
      else { this.acc += dt; while (this.acc >= DT) { this.step(DT); this.acc -= DT; } }
    }
    this.render();
  }
  lang() { return LINES[this.settings.lang] || LINES.fr; }
  say(key, vars = {}, priority = false) {
    const arr = this.lang()[key]; if (!arr) return;
    let s = arr[Math.floor(this.r() * arr.length)];
    const T = this.teams;
    const all = { h: T[0].short, a: T[1].short, sh: this.score[0], sa: this.score[1], st: T[0].stadium || 'stade', ...vars };
    s = s.replace(/\{(\w+)\}/g, (m, k) => all[k] ?? '');
    this.ticker = s; this.tickerT = 4;
    if (this.settings.voice) A.speak(s, this.settings.lang, priority);
  }
  banner(text, t = 2) { this.msg = text; this.msgT = t; }

  // ---------------- positions ----------------
  formationPos(p, inPoss) {
    const T = this.teams[p.team], d = T.dir, b = this.ball;
    const bnx = b.x * d, bny = b.y * d;
    let [bx, by] = p.base;
    if (p.isGK) {
      const gx = -HL + 1.5 + clamp((bnx + HL) * 0.04, 0, 4);
      return [gx * d, clamp(bny * 0.15, -2.5, 2.5) * d];
    }
    const line = bx < -28 ? 0 : bx < -12 ? 1 : 2;
    const push = (inPoss ? [20, 24, 27] : [7, 6, 4])[line] + T.mentality * 3 + (line === 0 ? T.line * 4 : T.line * 2);
    let nx = bx + push + bnx * (inPoss ? 0.38 : 0.42) + (p.instr === 'def' ? -6 : p.instr === 'att' && inPoss ? 6 : 0);
    let ny = by * (inPoss ? 1.08 : 0.72) * (0.85 + T.width * 0.15) + bny * (inPoss ? 0.18 : 0.32);
    if (!inPoss) nx = Math.min(nx, bnx + 6 + (line === 2 ? 14 : 0));
    // appel en profondeur des attaquants
    if (inPoss && line === 2 && p.run > 0) nx += 10;
    nx = clamp(nx, -HL + 3, HL - 4); ny = clamp(ny, -HW + 1.5, HW - 1.5);
    return [nx * d, ny * d];
  }
  setupKickoff(team) {
    this.kickTeam = team;
    for (const T of this.teams) for (const p of T.ps) {
      const [bx, by] = p.base;
      const nx = p.isGK ? -HL + 1.5 : Math.min(bx * 0.95, -1.5), ny = by * 0.85;
      p.x = nx * T.dir; p.y = ny * T.dir; p.vx = p.vy = 0;
    }
    const T = this.teams[team];
    const taker = T.ps.filter(p => !p.isGK && !p.sentOff).sort((a, b) => b.base[0] - a.base[0])[0];
    taker.x = -0.6 * T.dir; taker.y = 0;
    const b = this.ball; b.x = b.y = b.z = b.vx = b.vy = b.vz = 0; b.owner = null;
    this.restart = { type: 'kickoff', team, taker, x: 0, y: 0 };
    this.state = 'restart'; this.stateT = 1.4;
    if (this.userSide === team) this.select(taker);
  }
  setRestart(type, team, x, y) {
    const T = this.teams[team];
    let taker;
    if (type === 'goalkick') taker = T.ps[0];
    else taker = T.ps.filter(p => !p.sentOff && !p.isGK).sort((a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y))[0];
    if (type === 'penalty') taker = T.ps.filter(p => !p.sentOff && !p.isGK).sort((a, b) => b.a.sho - a.a.sho)[0];
    const pref = { penalty: T.takers.penalty, corner: T.takers.corner, freekick: T.takers.freekick }[type];
    const designated = pref && T.ps.find(p => p.id === pref && !p.sentOff);
    if (designated && (type === 'penalty' || Math.hypot(designated.x - x, designated.y - y) < 40)) taker = designated;
    const b = this.ball; b.x = x; b.y = y; b.z = 0; b.vx = b.vy = b.vz = 0; b.owner = null;
    this.restart = { type, team, taker, x, y };
    this.state = 'restart'; this.stateT = type === 'penalty' ? 2.2 : type === 'throw' ? 0.9 : 1.3;
    if (type === 'corner') this.stats.corners[team]++;
    if (this.userSide === team) this.select(taker);
    else if (this.userSide != null) this.autoSelectDefender();
  }

  // ---------------- simulation ----------------
  step(dt) {
    if (this.tickerT > 0) this.tickerT -= dt;
    if (this.msgT > 0) this.msgT -= dt;
    this.goalFxT = Math.max(0, (this.goalFxT || 0) - dt);
    for (const T of this.teams) for (const p of T.ps) { p.diveT = Math.max(0, (p.diveT || 0) - dt); p.slideT = Math.max(0, (p.slideT || 0) - dt); }
    if (this.state === 'restart') return this.stepRestart(dt);
    if (this.state === 'goal') { this.stateT -= dt; this.moveAll(dt, true); this.physics(dt); if (this.stateT <= 0) this.startReplay(); return; }
    if (this.state === 'halftime') { this.stateT -= dt; if (this.stateT <= 0) { this.half = 2; for (const T of this.teams) T.dir *= -1; this.setupKickoff(1); } return; }
    if (this.state === 'fulltime') { this.stateT -= dt; if (this.stateT <= 0 && !this.ended) this.finish(); return; }
    // horloge
    this.clock += dt;
    const gm = this.clock / this.secondsPerMinute + (this.half === 2 ? 45 : 0);
    this.minute = Math.min(gm, this.half === 1 ? 45 + 2 : 90 + 4);
    const limit = this.half === 1 ? 45 + this.addTime(1) : 90 + this.addTime(2);
    if (gm >= limit && !this.ball.inFlightShot) {
      A.whistle(true);
      if (this.half === 1) { this.state = 'halftime'; this.stateT = 2.5; this.clock = 0; this.banner('MI-TEMPS', 2.5); this.say('half', {}, true); }
      else { this.state = 'fulltime'; this.stateT = 2.5; this.banner('FIN DU MATCH', 2.5); this.say('full', {}, true); }
      return;
    }
    const own = this.ball.owner ? this.ball.owner.team : this.ball.lastTeam;
    this.stats.poss[own] += dt;
    this.ai(dt); this.userControl(dt); this.moveAll(dt); this.physics(dt); this.contacts(dt); this.rules();
    this.record();
    for (const T of this.teams) for (const p of T.ps) if (!p.sentOff) p.minutes += dt / this.secondsPerMinute;
    // ambiance
    const b = this.ball, atk = Math.abs(b.x) > 30 ? 0.55 : 0.25;
    if ((this.crowdT = (this.crowdT || 0) + dt) > 0.5) { this.crowdT = 0; A.crowd(atk); }
  }
  addTime(h) { return this._add?.[h] ?? ((this._add = this._add || {})[h] = h === 1 ? 1 + Math.floor(this.r() * 2) : 2 + Math.floor(this.r() * 4)); }

  stepRestart(dt) {
    const R = this.restart, b = this.ball;
    this.stateT -= dt;
    // placement des joueurs
    for (const T of this.teams) for (const p of T.ps) {
      if (p.sentOff) continue;
      let tx, ty;
      if (p === R.taker) {
        const d = T.dir;
        if (R.type === 'kickoff') { tx = -0.6 * d; ty = 0; }
        else if (R.type === 'throw') { tx = R.x; ty = R.y + Math.sign(R.y) * 0.6; }
        else { const gx = d * HL, ang = Math.atan2(0 - R.y, gx - R.x); tx = R.x - Math.cos(ang) * 0.7; ty = R.y - Math.sin(ang) * 0.7; }
      } else if (R.type === 'penalty') {
        if (p.isGK && p.team !== R.team) { tx = this.teams[p.team].dir * -HL + this.teams[p.team].dir * 0.3; ty = 0; }
        else { const d = this.teams[R.team].dir; tx = d * 30 + (p.i % 5) * d * 1.2; ty = (p.i - 5) * 2.2; }
      } else if (R.type === 'kickoff') {
        const [bx, by] = p.base; tx = (p.isGK ? -HL + 1.5 : Math.min(bx * 0.95, -1.5)) * T.dir; ty = by * 0.85 * T.dir;
      } else if (R.type === 'corner') {
        const atk = p.team === R.team, d = this.teams[R.team].dir;
        if (p.isGK) { const pd = this.teams[p.team].dir; tx = -HL * pd + pd * 0.8; ty = 0; }
        else if (atk && p.base[0] > -30) { tx = d * (HL - 7 - (p.i % 3) * 3); ty = ((p.i % 5) - 2) * 3.5; }
        else if (!atk) { tx = d * (HL - 5 - (p.i % 4) * 2.5); ty = ((p.i % 6) - 2.5) * 3; }
        else { const fp = this.formationPos(p, true); tx = fp[0]; ty = fp[1]; }
      } else { const fp = this.formationPos(p, p.team === R.team); tx = fp[0]; ty = fp[1]; }
      this.moveTo(p, tx, ty, dt, 1.4, true);
    }
    b.x = R.x; b.y = R.y; b.z = 0; b.vx = b.vy = b.vz = 0;
    if (this.stateT <= 0) {
      R.taker.x = R.type === 'kickoff' ? -0.6 * this.teams[R.team].dir : R.taker.x;
      b.owner = R.taker; b.last = R.taker; b.lastTeam = R.team; R.taker.cd = 0;
      this.state = 'play'; this.setPiece = R.type; this.setPieceT = 0;
      if (R.type !== 'throw' && R.type !== 'goalkick') A.whistle();
      if (this.userSide !== R.team || R.type === 'goalkick') this.aiThink = 0.35;
    }
  }

  select(p) { if (p && !p.sentOff) this.selected = p; }
  autoSelectDefender() {
    if (this.userSide == null) return;
    const T = this.teams[this.userSide], b = this.ball;
    let best = null, bd = 1e9;
    for (const p of T.ps) { if (p.isGK || p.sentOff) continue; const d = Math.hypot(p.x - b.x, p.y - b.y); if (d < bd) { bd = d; best = p; } }
    this.select(best);
  }
  switchPlayer() {
    if (this.userSide == null) return;
    const T = this.teams[this.userSide], b = this.ball;
    const cand = T.ps.filter(p => !p.isGK && !p.sentOff && p !== this.selected)
      .sort((a, c) => Math.hypot(a.x + a.vx * 0.5 - b.x, a.y + a.vy * 0.5 - b.y) - Math.hypot(c.x + c.vx * 0.5 - b.x, c.y + c.vy * 0.5 - b.y));
    if (cand[0]) this.select(cand[0]);
  }

  speedOf(p, sprint) {
    const base = 5.4 + (p.a.pac / 100) * 3.0;
    let s = base * (sprint ? 1.28 : 1) * (0.72 + 0.28 * p.stamina);
    if (this.ball.owner === p) s *= 0.86 + p.a.dri / 1000;
    if (p.injured) s *= 0.6;
    if (p.team !== this.userSide && this.userSide != null) s *= [0.9, 0.97, 1.02, 1.07][this.settings.difficulty] || 1;
    return s;
  }
  moveTo(p, tx, ty, dt, mult = 1, nostam = false, sprint = false) {
    const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy);
    const sp = this.speedOf(p, sprint) * mult;
    let wx = 0, wy = 0;
    if (d > 0.25) { const s = Math.min(sp, d * 2.2); wx = dx / d * s; wy = dy / d * s; }
    this.applyVel(p, wx, wy, dt);
    if (sprint && !nostam) p.stamina = Math.max(0.3, p.stamina - dt * 0.012 * (1.2 - p.a.phy / 200));
    else p.stamina = Math.min(1, p.stamina + dt * 0.002);
  }
  applyVel(p, wx, wy, dt) {
    const acc = 9 + p.a.pac / 20;
    p.vx += clamp(wx - p.vx, -acc * dt, acc * dt);
    p.vy += clamp(wy - p.vy, -acc * dt, acc * dt);
  }
  moveAll(dt, celebrate = false) {
    for (const T of this.teams) for (const p of T.ps) {
      if (p.sentOff) { p.x = 0; p.y = -HW - 6; continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.x = clamp(p.x, -HL - 2, HL + 2); p.y = clamp(p.y, -HW - 2, HW + 2);
      const sp = Math.hypot(p.vx, p.vy);
      p.anim += sp * dt * 2.2;
      p.jumpT = Math.max(0, (p.jumpT || 0) - dt);
      p.jumpCd = Math.max(0, (p.jumpCd || 0) - dt);
      // Duel aérien : le joueur le plus proche saute pour contester un ballon haut.
      const ball = this.ball;
      if (!p.isGK && p.jumpCd <= 0 && ball.z > 1.15 && ball.z < 5.2 && Math.hypot(p.x - ball.x, p.y - ball.y) < 3.2 && Math.abs(p.vz || 0) < 0.01) {
        p.jumpT = 0.42; p.jumpCd = 0.9;
      }
      if (sp > 0.3) p.face = p.vx >= 0 ? 1 : -1;
      if (p.cd > 0) p.cd -= dt; if (p.tackleCd > 0) p.tackleCd -= dt;
      if (p.run > 0) p.run -= dt;
      if (celebrate) { p.vx *= 0.9; p.vy *= 0.9; }
    }
    // séparation simple
    const all = this.teams[0].ps.concat(this.teams[1].ps);
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const a = all[i], c = all[j]; if (a.sentOff || c.sentOff) continue;
      const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
      if (d > 0 && d < 0.9) {
        const nx = dx / d, ny = dy / d, push = (0.9 - d) * 0.5;
        a.x -= nx * push; a.y -= ny * push; c.x += nx * push; c.y += ny * push;
        // léger échange d'impulsion pour éviter l'effet de joueurs qui se traversent
        const closing = (a.vx - c.vx) * nx + (a.vy - c.vy) * ny;
        if (closing > 0) { const impulse = Math.min(1.8, closing * 0.16); a.vx -= nx * impulse; a.vy -= ny * impulse; c.vx += nx * impulse; c.vy += ny * impulse; }
      }
    }
  }

  // ---------------- IA ----------------
  ai(dt) {
    const b = this.ball, own = b.owner;
    const possTeam = own ? own.team : (b.last ? b.lastTeam : -1);
    for (const T of this.teams) {
      const inPoss = possTeam === T.side;
      // presseurs
      let pressers = [];
      if (!inPoss) {
        const cand = T.ps.filter(p => !p.isGK && !p.sentOff).map(p => ({ p, d: Math.hypot(p.x - b.x, p.y - b.y) })).sort((a, c) => a.d - c.d);
        pressers = cand.slice(0, T.pressing >= 2 ? 2 : 1).map(c => c.p);
        if (T.pressing === 0 && cand[0] && Math.abs(b.x - (-HL * T.dir)) > 50) pressers = [];
      }
      for (const p of T.ps) {
        if (p.sentOff) continue;
        if (p === this.selected && this.userSide === T.side) continue; // contrôlé par l'utilisateur
        if (p === own) { this.aiCarrier(p, dt); continue; }
        if (p.isGK) { this.aiKeeper(p, dt); continue; }
        // receveur désigné : va au-devant du ballon
        const pi = this.passInfo;
        if (!own && pi && pi.to === p && pi.t < 3) { const tgt = this.receivePoint(p, pi); this.moveTo(p, tgt.x, tgt.y, dt, 1, false, true); continue; }
        // balle libre : le plus proche va la chercher
        if (!own) {
          const t = this.ballLanding();
          const mine = this.closestTo(T, t.x, t.y);
          if (mine === p) { this.moveTo(p, t.x, t.y, dt, 1, false, true); continue; }
        }
        if (pressers.includes(p) && own) {
          const lead = 0.35;
          const tx = own.x + own.vx * lead - (pressers[0] === p ? 0 : T.dir * 3), ty = own.y + own.vy * lead;
          this.moveTo(p, tx, ty, dt, 1, false, Math.hypot(own.x - p.x, own.y - p.y) > 4);
          if (pressers[0] === p) this.tryTackle(p, false);
          continue;
        }
        if (inPoss && (p.base[0] > -14 || p.instr === 'run') && p.run <= 0 && this.r() < dt * (p.instr === 'run' ? 0.45 : 0.15)) p.run = 2.5;
        let [tx, ty] = this.formationPos(p, inPoss);
        if (!inPoss) { // marquage
          const opp = this.teams[1 - T.side].ps;
          let mk = null, md = 9;
          for (const o of opp) { if (o.sentOff || o.isGK) continue; const d = Math.hypot(o.x - tx, o.y - ty); if (d < md) { md = d; mk = o; } }
          if (mk && (p.base[0] < -12 || p.instr === 'mark')) { const gx = -HL * T.dir, k = p.instr === 'mark' ? 0.05 : 0.12; tx = lerp(mk.x, gx, k); ty = lerp(mk.y, 0, k); }
        }
        this.moveTo(p, tx, ty, dt, 1, false, Math.hypot(tx - p.x, ty - p.y) > 12);
      }
    }
  }
  // point de réception : projection du joueur sur la trajectoire du ballon
  receivePoint(p, pi) {
    const b = this.ball, vx = b.vx, vy = b.vy, v2 = vx * vx + vy * vy;
    if (v2 < 4) return { x: b.x, y: b.y };
    const t = clamp(((p.x - b.x) * vx + (p.y - b.y) * vy) / v2, 0.05, 2);
    return { x: b.x + vx * t, y: b.y + vy * t };
  }
  closestTo(T, x, y) {
    let best = null, bd = 1e9;
    for (const p of T.ps) { if (p.sentOff || p.isGK) continue; const d = Math.hypot(p.x - x, p.y - y) / this.speedOf(p, true); if (d < bd) { bd = d; best = p; } }
    return best;
  }
  ballLanding() {
    const b = this.ball;
    if (b.z < 0.5 && Math.hypot(b.vx, b.vy) < 2) return { x: b.x, y: b.y };
    const tz = b.vz > 0 || b.z > 0 ? (b.vz + Math.sqrt(b.vz * b.vz + 2 * G * b.z)) / G : 0;
    const t = clamp(Math.max(tz, 0.35), 0, 2);
    return { x: clamp(b.x + b.vx * t * 0.8, -HL, HL), y: clamp(b.y + b.vy * t * 0.8, -HW, HW) };
  }
  aiKeeper(p, dt) {
    const T = this.teams[p.team], b = this.ball, d = T.dir, gx = -HL * d;
    // ballon proche et libre dans la surface : sortie
    const inBox = Math.abs(b.x - gx) < 16 && Math.abs(b.y) < 20;
    if (!b.owner && inBox && Math.hypot(b.x - p.x, b.y - p.y) < 9 && b.z < 2 && !b.inFlightShot) { this.moveTo(p, b.x, b.y, dt, 1.1, true, true); return; }
    const [tx, ty] = this.formationPos(p, false);
    // couvre l'angle
    const ang = Math.atan2(b.y - 0, b.x - gx);
    const r = clamp(Math.hypot(b.x - gx, b.y) * 0.08, 0.6, 3.5);
    const ax = gx + Math.cos(ang) * r, ay = clamp(Math.sin(ang) * r, -GOAL_W + 0.4, GOAL_W - 0.4);
    this.moveTo(p, b.inFlightShot ? p.x : ax, ay, dt, 1.1, true, true);
  }
  aiCarrier(p, dt) {
    const T = this.teams[p.team], d = T.dir, gx = HL * d;
    if (this.aiThink == null) this.aiThink = 0;
    this.aiThink -= dt;
    const distG = Math.hypot(gx - p.x, p.y), opp = this.teams[1 - p.team].ps;
    let press = 99; for (const o of opp) if (!o.sentOff) press = Math.min(press, Math.hypot(o.x - p.x, o.y - p.y));
    if (p.isGK) { // dégagement / relance
      this.moveTo(p, p.x, p.y, dt);
      if (this.aiThink <= 0) { const opt = this.bestPass(p, null, false); if (opt && opt.score > -5 && this.r() < 0.6) this.pass(p, opt.p, false); else this.clearance(p); }
      return;
    }
    if (this.setPiece === 'corner' && this.aiThink <= 0) { this.cross(p); return; }
    if (this.setPiece === 'penalty' && this.aiThink <= 0) { this.shoot(p, 0.75 + this.r() * 0.2); return; }
    // dribble vers le but en évitant le défenseur le plus proche
    let tx = gx, ty = p.y * 0.6;
    let near = null, nd = 99; for (const o of opp) { if (o.sentOff) continue; const dd = Math.hypot(o.x - p.x, o.y - p.y); if (dd < nd && (o.x - p.x) * d > -1) { nd = dd; near = o; } }
    if (near && nd < 6) { ty = p.y + (p.y > near.y ? 6 : -6); }
    this.moveTo(p, tx, clamp(ty, -HW + 2, HW - 2), dt, 1, false, nd > 5);
    if (this.aiThink > 0) return;
    this.aiThink = 0.25 + this.r() * 0.2;
    const angleOK = Math.abs(p.y) < 19 && (gx - p.x) * d > 0;
    const shootP = (distG < 12 ? 0.65 : distG < 18 ? 0.38 : distG < 24 ? 0.16 : distG < 30 ? 0.05 : 0) * (press < 2 ? 1.3 : 1);
    if (angleOK && this.r() < shootP) { this.shoot(p, clamp(0.5 + (distG / 45), 0.4, 0.95)); return; }
    // centre depuis le couloir
    if ((gx - p.x) * d < 18 && Math.abs(p.y) > 15 && this.r() < 0.45) { this.cross(p); return; }
    const opt = this.bestPass(p, null, false);
    if (press < 3 && opt && opt.score > -6) { this.pass(p, opt.p, opt.through); return; }
    if (opt && opt.score > 10 && this.r() < 0.3) { this.pass(p, opt.p, opt.through); return; }
    if (this.r() < 0.03 && opt) this.pass(p, opt.p, false);
  }
  bestPass(p, dir, through) {
    const T = this.teams[p.team], d = T.dir, opp = this.teams[1 - p.team].ps;
    let best = null;
    for (const t of T.ps) {
      if (t === p || t.sentOff) continue;
      let tx = t.x + t.vx * 0.6, ty = t.y + t.vy * 0.6;
      const th = through || (t.base[0] > -14 && t.run > 0);
      if (th) { tx += d * 5; }
      const dx = tx - p.x, dy = ty - p.y, dist = Math.hypot(dx, dy);
      if (dist < 4 || dist > 45) continue;
      let score = (dx * d) * 0.7 - Math.max(0, dist - 25) * 0.4 + (Math.abs(HL * d - tx) < 25 ? 6 : 0);
      if (dir) { const cos = (dx * dir[0] + dy * dir[1]) / dist; if (cos < 0.45) continue; score += cos * 25; }
      let risk = 0;
      for (const o of opp) { if (o.sentOff) continue; const sd = segDist(o.x, o.y, p.x, p.y, tx, ty); if (sd < 2.2) risk += (2.2 - sd) * 6; }
      let open = 99; for (const o of opp) if (!o.sentOff) open = Math.min(open, Math.hypot(o.x - tx, o.y - ty));
      score += Math.min(open, 8) * 1.2 - risk;
      if (t.isGK) score -= 12;
      if (!best || score > best.score) best = { p: t, score, through: th, tx, ty };
    }
    return best;
  }

  // ---------------- actions ----------------
  kickBall(p, vx, vy, vz, power = 0.5) {
    const b = this.ball;
    b.owner = null; b.vx = vx; b.vy = vy; b.vz = vz; b.z = Math.max(b.z, 0.12); b.last = p; b.lastTeam = p.team;
    p.cd = 0.35; p.touches++; this.setPiece = null;
    A.kick(power);
  }
  pass(p, t, through, lofted = false) {
    const T = this.teams[p.team], d = T.dir;
    let tx = t.x, ty = t.y;
    const dist0 = Math.hypot(tx - p.x, ty - p.y);
    const lob = lofted || dist0 > 32;
    let speed = clamp(dist0 * (lob ? 0.55 : 0.75) + 7, 9, lob ? 20 : 22);
    const tf = dist0 / speed;
    tx += t.vx * tf * 0.9; ty += t.vy * tf * 0.9;
    if (through) tx += d * (4 + dist0 * 0.08);
    const assist = p.team === this.userSide && this.settings.assist ? 0.5 : 1;
    const err = (1 - p.a.pas / 100) * 0.11 * assist + (p.team !== this.userSide ? 0.02 : 0);
    let ang = Math.atan2(ty - p.y, tx - p.x) + (this.r() - 0.5) * 2 * err;
    const dist = Math.hypot(tx - p.x, ty - p.y);
    speed = clamp(dist * (lob ? 0.55 : 0.75) + 7, 9, lob ? 20 : 22);
    const vz = lob ? clamp(dist * 0.32, 4, 11) : 0.6;
    this.kickBall(p, Math.cos(ang) * speed, Math.sin(ang) * speed, vz, 0.4);
    this.stats.passes[p.team]++;
    this.passInfo = { from: p, to: t, team: p.team, t: 0, tx: p.x + Math.cos(ang) * dist, ty: p.y + Math.sin(ang) * dist };
    if (p.team === this.userSide && this.userSide != null) this.select(t);
  }
  cross(p) {
    const T = this.teams[p.team], d = T.dir;
    const targets = T.ps.filter(t => !t.sentOff && !t.isGK && t !== p && Math.abs(t.x - d * HL) < 18 && Math.abs(t.y) < 14);
    const t = targets.sort((a, c) => (c.a.phy + c.a.sho) - (a.a.phy + a.a.sho))[0];
    if (t) this.pass(p, t, false, true); else this.clearance(p);
  }
  clearance(p) {
    const d = this.teams[p.team].dir, ang = (this.r() - 0.5) * 0.9;
    const sp = 24 + this.r() * 6;
    this.kickBall(p, Math.cos(ang) * sp * d, Math.sin(ang) * sp, 11 + this.r() * 4, 0.8);
  }
  shoot(p, power = 0.7, aimY = null) {
    const T = this.teams[p.team], d = T.dir, gx = HL * d;
    const gk = this.teams[1 - p.team].ps[0];
    let ty = aimY != null ? aimY : (gk.y > 0 ? -1 : 1) * (1.5 + this.r() * 1.8);
    let tz = 0.3 + this.r() * 1.6;
    const assist = p.team === this.userSide && this.settings.assist ? 0.65 : 1;
    const skill = p.a.sho / 100;
    const err = (0.4 + (1 - skill) * 2.6 + power * power * 1.4) * assist * (p.team !== this.userSide ? 1.15 : 1);
    ty += (this.r() - 0.5) * 2 * err; tz += (this.r() - 0.3) * err * 0.7 + Math.max(0, power - 0.8) * 1.5;
    const dist = Math.hypot(gx - p.x, ty - p.y);
    const speed = 16 + power * 15 + skill * 4;
    const t = dist / speed;
    const vz = clamp((tz - 0.12 + 0.5 * G * t * t) / t, 0.5, 12);
    const ang = Math.atan2(ty - p.y, gx - p.x);
    this.kickBall(p, Math.cos(ang) * speed, Math.sin(ang) * speed, vz, 0.6 + power * 0.4);
    // Rotation latérale selon l'angle de frappe : tirs enroulés plus naturels.
    this.ball.spin = clamp(((ty - p.y) / Math.max(8, dist)) * (0.55 + power * 0.75) * skill, -0.85, 0.85);
    this.ball.inFlightShot = { team: p.team, shooter: p, t: 0 };
    this.stats.shots[p.team]++;
    const onT = Math.abs(ty) < GOAL_W && tz < GOAL_H;
    if (onT) this.stats.onTarget[p.team]++;
    if (this.r() < 0.5) this.say('chance', { t: T.short, p: p.name });
  }
  tryTackle(p, user) {
    const b = this.ball, c = b.owner;
    if (p.tackleCd > 0) return false;
    if (!c || c.team === p.team) {
      if (user && !c && Math.hypot(b.x - p.x, b.y - p.y) < 2.2 && b.z < 1) { p.vx += (b.x - p.x) * 3; p.vy += (b.y - p.y) * 3; p.tackleCd = 0.6; }
      return false;
    }
    const dist = Math.hypot(c.x - p.x, c.y - p.y);
    if (dist > (user ? 2.4 : 1.7)) { if (user) { p.tackleCd = 0.5; p.vx += (c.x - p.x) * 2.5; p.vy += (c.y - p.y) * 2.5; } return false; }
    p.tackleCd = user ? 0.7 : 0.9 + this.r() * 0.6;
    const diff = this.settings.difficulty;
    let chance = 0.38 + (p.a.def - c.a.dri) / 160 + (user ? 0.12 : 0) - (c.team === this.userSide ? [0.12, 0.05, 0, -0.04][diff] : 0);
    if (this.r() < chance) {
      b.owner = null; b.last = p; b.lastTeam = p.team;
      p.slideT = 0.38; p.slideDir = Math.sign(c.y - p.y) || 1;
      if (this.r() < 0.55) { b.owner = p; } else { b.vx = (this.r() - 0.5) * 8; b.vy = (this.r() - 0.5) * 8; }
      c.cd = 0.6; p.rating += 0.1;
      if (p.team === this.userSide) this.select(p);
      return true;
    }
    // faute ?
    const foulP = (user ? 0.22 : 0.12) * (1 + (dist > 1.4 ? 0.5 : 0));
    if (this.r() < foulP) this.foul(p, c);
    return false;
  }
  foul(p, victim) {
    this.stats.fouls[p.team]++; p.rating -= 0.2;
    A.whistle();
    const T = this.teams[victim.team], d = T.dir;
    const inBox = victim.x * d > HL - 16.5 && Math.abs(victim.y) < 20.16;
    const card = this.r();
    if (card < 0.04) this.sendOff(p, 'red');
    else if (card < 0.22 || inBox && card < 0.4) { p.yellow++; this.stats.yellows[p.team]++; this.addEvent('yellow', p); this.say('yellow', { p: p.name }); if (p.yellow >= 2) this.sendOff(p, 'red2'); }
    else this.say('foul', { p: p.name });
    if (this.r() < 0.03) { victim.injured = true; this.addEvent('injury', victim); this.say('injury', { p: victim.name }, true); }
    if (inBox) { this.banner('PENALTY !', 1.8); this.say('penalty', { t: T.short }, true); this.setRestart('penalty', victim.team, d * (HL - 11), 0); }
    else this.setRestart('freekick', victim.team, clamp(victim.x, -HL + 1, HL - 1), clamp(victim.y, -HW + 1, HW - 1));
  }
  sendOff(p, why) {
    p.sentOff = true; this.stats.reds[p.team]++; this.addEvent('red', p);
    this.say('red', { p: p.name }, true);
    if (this.selected === p) this.switchPlayer();
    if (p.isGK) { // un joueur de champ prend les gants
      const T = this.teams[p.team], rep = T.ps.find(q => !q.sentOff && !q.isGK);
      if (rep) { rep.isGK = true; T.ps[0] = rep; T.ps[rep.i] = p; [rep.i, p.i] = [0, rep.i]; [rep.base, p.base] = [p.base, rep.base]; }
    }
  }
  addEvent(type, p, extra = {}) { this.events.push({ type, min: Math.max(1, Math.round(this.minute)), team: p.team, pid: p.id, name: p.name, ...extra }); }

  // ---------------- utilisateur ----------------
  userControl(dt) {
    if (this.userSide == null) return;
    const p = this.selected; if (!p || p.sentOff) { this.autoSelectDefender(); return; }
    const inp = this.input, b = this.ball;
    const mag = Math.hypot(inp.jx, inp.jy);
    const T = this.teams[this.userSide];
    if (b.owner === p) {
      if (mag > 0.15) { const s = this.speedOf(p, inp.sprint) * Math.min(1, mag); this.applyVel(p, inp.jx / mag * s, inp.jy / mag * s, dt); if (inp.sprint) p.stamina = Math.max(0.3, p.stamina - dt * 0.012); }
      else this.applyVel(p, 0, 0, dt);
      if (inp.shooting) inp.shootHold = Math.min(1, inp.shootHold + dt * 1.25);
    } else {
      if (inp.press && b.owner && b.owner.team !== p.team) {
        const c = b.owner; this.moveTo(p, c.x + c.vx * 0.3, c.y + c.vy * 0.3, dt, 1, false, true);
        // un second coéquipier presse aussi
        const mate = T.ps.filter(q => q !== p && !q.isGK && !q.sentOff).sort((a, c2) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c2.x - b.x, c2.y - b.y))[0];
        if (mate) this.moveTo(mate, c.x - T.dir * 2, c.y, dt, 1, false, true);
      } else if (mag > 0.15) { const s = this.speedOf(p, inp.sprint) * Math.min(1, mag); this.applyVel(p, inp.jx / mag * s, inp.jy / mag * s, dt); if (inp.sprint) p.stamina = Math.max(0.3, p.stamina - dt * 0.012); }
      else if (this.settings.assist) { // assistance : se replace automatiquement
        const own = b.owner; const poss = own ? own.team === p.team : false;
        if (!own && this.passInfo && this.passInfo.to === p) { const tg = this.receivePoint(p, this.passInfo); this.moveTo(p, tg.x, tg.y, dt, 1, false, true); return; }
        if (!own) { const t = this.ballLanding(); if (this.closestTo(T, t.x, t.y) === p) { this.moveTo(p, t.x, t.y, dt, 1, false, true); return; } }
        const [tx, ty] = this.formationPos(p, poss); this.moveTo(p, tx, ty, dt, 0.9);
      } else this.applyVel(p, 0, 0, dt);
    }
  }
  // appelé par l'interface
  btnPass(through = false) {
    const p = this.selected, b = this.ball;
    if (!p || this.state !== 'play') return;
    if (b.owner !== p) { if (through) this.input.press = true; else this.switchPlayer(); return; }
    const mag = Math.hypot(this.input.jx, this.input.jy);
    const dir = mag > 0.2 ? [this.input.jx / mag, this.input.jy / mag] : [p.face, 0];
    const opt = this.bestPass(p, dir, through) || this.bestPass(p, null, through);
    if (opt) this.pass(p, opt.p, through || opt.through, this.setPiece === 'corner');
  }
  btnShootDown() { const p = this.selected; if (p && this.ball.owner === p) { this.input.shooting = true; this.input.shootHold = 0.15; } }
  btnShootUp() {
    const p = this.selected, inp = this.input;
    if (!p || this.state !== 'play') { inp.shooting = false; return; }
    if (this.ball.owner === p && inp.shooting) {
      const mag = Math.hypot(inp.jx, inp.jy);
      const aimY = mag > 0.3 ? clamp(inp.jy / mag * 3.2, -3.3, 3.3) : null;
      this.shoot(p, clamp(inp.shootHold, 0.2, 1), aimY);
    } else if (this.ball.owner && this.ball.owner.team !== p.team) this.tryTackle(p, true);
    else if (!this.ball.owner) this.tryTackle(p, true);
    inp.shooting = false; inp.shootHold = 0;
  }

  // ---------------- physique ----------------
  physics(dt) {
    const b = this.ball;
    if (b.owner) {
      const p = b.owner, sp = Math.hypot(p.vx, p.vy);
      const fx = sp > 0.5 ? p.vx / sp : p.face, fy = sp > 0.5 ? p.vy / sp : 0;
      const off = 0.55 + Math.min(sp, 8) * 0.05 + Math.sin(p.anim * 1.6) * 0.08;
      b.x = p.x + fx * off; b.y = p.y + fy * off; b.z = 0; b.vx = p.vx; b.vy = p.vy; b.vz = 0;
      return;
    }
    // Effet Magnus léger : la rotation courbe la trajectoire en vol.
    // Le spin décroît progressivement et n'affecte pas les ballons contrôlés.
    if (b.z > 0.02 && b.spin) {
      const spin = clamp(b.spin, -1, 1);
      b.vx += -b.vy * spin * 0.2 * dt;
      b.vy += b.vx * spin * 0.2 * dt;
      b.spin *= Math.exp(-0.42 * dt);
      if (Math.abs(b.spin) < 0.015) b.spin = 0;
    }
    b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt;
    if (b.z > 0) { b.vz -= G * dt; b.vx *= 1 - 0.08 * dt; b.vy *= 1 - 0.08 * dt; }
    if (b.z <= 0) {
      b.z = 0;
      if (b.vz < -1.5) { b.vz = -b.vz * 0.5; } else { b.vz = 0; }
      const f = 1 - 1.1 * dt; b.vx *= f; b.vy *= f;
    }
    if (b.inFlightShot) b.inFlightShot.t += dt;
    if (this.passInfo) this.passInfo.t += dt;
    // poteaux / barre
    for (const s of [-1, 1]) {
      if (Math.abs(Math.abs(b.x) - HL) < 0.25 && Math.sign(b.x) === s) {
        for (const py of [-GOAL_W, GOAL_W]) if (Math.abs(b.y - py) < 0.2 && b.z < GOAL_H) { b.vx *= -0.6; b.vy += (this.r() - 0.5) * 6; this.say('post'); A.kick(0.9); }
        if (Math.abs(b.y) < GOAL_W && Math.abs(b.z - GOAL_H) < 0.15) { b.vz = -Math.abs(b.vz) * 0.5; b.vx *= -0.5; this.say('post'); }
      }
    }
  }
  contacts(dt) {
    const b = this.ball;
    if (b.owner) return;
    // gardien face à un tir
    const shot = b.inFlightShot;
    for (const T of this.teams) {
      const gk = T.ps[0]; if (gk.sentOff) continue;
      const gxLine = -HL * T.dir;
      if (shot && shot.team !== T.side && (b.vx * -T.dir) > 4) {
        const tcross = (gxLine - b.x) / b.vx;
        if (tcross > 0 && tcross < 0.6) {
          const yc = b.y + b.vy * tcross, zc = b.z + b.vz * tcross - 0.5 * G * tcross * tcross;
          if (Math.abs(yc) < GOAL_W + 0.3 && zc < GOAL_H + 0.3) {
            const reach = 1.6 + gk.a.gk / 100 * 1.6 + (gk.team === this.userSide ? 0 : [-.3, 0, .15, .3][this.settings.difficulty] || 0);
            const need = Math.abs(yc - gk.y);
            gk.vy += clamp((yc - gk.y) * 14, -18, 18) * dt * 8; // plongeon
            gk.dive = Math.sign(yc - gk.y) * Math.min(1, need / 2);
            if (need > 0.45) { gk.diveT = Math.max(gk.diveT || 0, 0.42); gk.diveDir = Math.sign(yc - gk.y) || 1; }
            if (!shot.judged && tcross < 0.18) {
              shot.judged = true;
              const sp = Math.hypot(b.vx, b.vy);
              let pSave = need < reach ? 0.92 - (need / reach) * 0.55 - (sp - 20) * 0.012 + (gk.a.gk - 70) / 200 : 0.02;
              if (Math.abs(yc) > GOAL_W - 0.5 && zc > GOAL_H - 0.6) pSave -= 0.25; // lucarne
              if (this.r() < clamp(pSave, 0.02, 0.95)) {
                if (sp < 22 && this.r() < 0.55) { b.owner = gk; b.last = gk; b.lastTeam = gk.team; b.inFlightShot = null; }
                else if (this.r() < 0.45) { b.vx = b.vx * 0.25; b.vy = (yc >= gk.y ? 1 : -1) * (7 + this.r() * 5); b.vz = 2 + this.r() * 3; b.last = gk; b.lastTeam = gk.team; b.inFlightShot = null; } // détourné en corner
                else { b.vx = -b.vx * 0.35; b.vy = (this.r() - 0.5) * 14; b.vz = 3 + this.r() * 3; b.last = gk; b.lastTeam = gk.team; b.inFlightShot = null; }
                gk.rating += 0.4; this.say('save', { p: gk.name }); this.addEvent('save', gk);
                A.crowd(0.7);
                return;
              }
            }
          } else if (!shot.missSaid && tcross < 0.15) { shot.missSaid = true; this.say('miss'); }
        }
      }
      if (shot && shot.t > 2.5) b.inFlightShot = null;
    }
    // contrôle du ballon
    let best = null, bd = 1e9;
    for (const T of this.teams) for (const p of T.ps) {
      if (p.sentOff || p.cd > 0) continue;
      const d = Math.hypot(p.x - b.x, p.y - b.y);
      const reachZ = p.isGK && Math.abs(b.x - (-HL * T.dir)) < 17 && Math.abs(b.y) < 21 ? 2.6 : 1.0;
      const rad = this.passInfo && this.passInfo.to === p ? 1.7 : 1.1;
      if (d < rad && b.z < reachZ && d < bd) { bd = d; best = p; }
      // tête
      if (!p.isGK && d < 1.1 && b.z >= 1.1 && b.z < 2.4 && p.cd <= 0) this.header(p);
    }
    if (best) {
      const rel = Math.hypot(b.vx - best.vx, b.vy - best.vy);
      const ctl = 17 + best.a.dri / 8 + (best.isGK ? 10 : 0) + (this.passInfo && this.passInfo.to === best ? 4 : 0);
      if (rel > ctl && this.r() < 0.6) { b.vx *= 0.35; b.vy *= 0.35; b.vz = Math.abs(b.vz) * 0.3 + 1; best.cd = 0.25; b.last = best; b.lastTeam = best.team; return; }
      const prevTeam = b.lastTeam, pi = this.passInfo;
      b.owner = best; b.last = best; b.inFlightShot = null; best.touches++;
      if (pi && pi.team === best.team && pi.from !== best) { this.stats.passOk[best.team]++; pi.from.rating += 0.03; best.lastPasser = pi.from; }
      else best.lastPasser = null;
      this.passInfo = null;
      b.lastTeam = best.team;
      if (this.userSide != null && best.team === this.userSide) this.select(best);
      else if (this.userSide != null && prevTeam === this.userSide && best.team !== this.userSide && this.settings.assist) this.autoSelectDefender();
    }
  }
  header(p) {
    const b = this.ball, T = this.teams[p.team], d = T.dir, gx = HL * d;
    p.cd = 0.5; b.last = p; b.lastTeam = p.team; b.owner = null;
    if (Math.abs(gx - p.x) < 16 && Math.abs(p.y) < 12) {
      const ty = (this.r() - 0.5) * 7, ang = Math.atan2(ty - p.y, gx - p.x), sp = 13 + p.a.phy / 12;
      b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp; b.vz = -1 + this.r() * 3;
      b.inFlightShot = { team: p.team, shooter: p, t: 0 }; this.stats.shots[p.team]++;
      if (Math.abs(ty) < GOAL_W) this.stats.onTarget[p.team]++;
    } else { b.vx = d * (8 + this.r() * 6); b.vy = (this.r() - 0.5) * 8; b.vz = 3; }
    A.kick(0.4);
  }
  rules() {
    const b = this.ball;
    if (b.owner) return;
    if (Math.abs(b.x) > HL) {
      const s = Math.sign(b.x);
      // quelle équipe défend ce but ?
      const defSide = this.teams[0].dir * s < 0 ? 0 : 1; // l'équipe dont le but est de ce côté
      if (Math.abs(b.y) < GOAL_W && b.z < GOAL_H) return this.goal(1 - defSide);
      if (b.lastTeam === defSide) this.setRestart('corner', 1 - defSide, s * (HL - 0.4), Math.sign(b.y) * (HW - 0.4));
      else this.setRestart('goalkick', defSide, s * (HL - 5.5), Math.sign(b.y) * 4);
      return;
    }
    if (Math.abs(b.y) > HW) this.setRestart('throw', 1 - b.lastTeam, clamp(b.x, -HL + 1, HL - 1), Math.sign(b.y) * (HW - 0.2));
  }
  goal(team) {
    const b = this.ball, scorer = b.last && b.last.team === team ? b.last : null;
    this.score[team]++;
    const T = this.teams[team];
    let name = scorer ? scorer.name : 'c.s.c.';
    if (scorer) { scorer.goals++; scorer.rating += 1; if (scorer.lastPasser) { scorer.lastPasser.assists++; scorer.lastPasser.rating += 0.5; } }
    this.events.push({ type: 'goal', min: Math.max(1, Math.round(this.minute)), team, pid: scorer?.id, name, own: !scorer, assist: scorer?.lastPasser?.name });
    b.vx *= 0.2; b.vy *= 0.2; b.inFlightShot = null;
    this.state = 'goal'; this.stateT = 2.2;
    this.goalFxT = 2.2; this.goalFxTeam = team; this.goalFxScorer = scorer ? scorer.name : 'BUT CONTRE SON CAMP';
    this.banner('BUT ! ' + T.short, 2.2);
    A.netSound(); A.roar();
    this.say('goal', { p: name, t: T.short }, true);
    this.lastGoalTeam = team;
    if (this.o.onGoal) this.o.onGoal(team);
  }

  // ---------------- ralenti ----------------
  record() {
    if ((this.recT = (this.recT || 0) + 1) % 2) return;
    const f = { b: [this.ball.x, this.ball.y, this.ball.z], p: [] };
    for (const T of this.teams) for (const p of T.ps) f.p.push([p.x, p.y, p.face, p.anim, p.vx, p.vy]);
    this.replayBuf.push(f); if (this.replayBuf.length > 150) this.replayBuf.shift();
  }
  startReplay() {
    if (this.settings.replays === false || this.replayBuf.length < 20) return this.afterGoal();
    this.replay = { frames: this.replayBuf.slice(-130), i: 0 };
    this.banner('RALENTI', 99);
  }
  updateReplay(dt) {
    this.replay.i += dt * 30 * 0.5;
    if (this.replay.i >= this.replay.frames.length - 1) this.skipReplay();
  }
  skipReplay() { if (!this.replay) return; this.replay = null; this.msgT = 0; this.afterGoal(); }
  afterGoal() { this.replayBuf = []; this.setupKickoff(1 - this.lastGoalTeam); }

  // ---------------- fin ----------------
  finish() {
    this.ended = true; this.running = false;
    A.crowd(0.1);
    const res = this.result();
    this.destroy();
    this.o.onEnd && this.o.onEnd(res);
  }
  result() {
    const players = [];
    for (const T of this.teams) for (const p of T.ps) players.push({ id: p.id, team: T.side, minutes: Math.round(p.minutes), goals: p.goals, assists: p.assists, rating: clamp(Math.round(p.rating * 10) / 10, 3, 10), stamina: p.stamina, injured: p.injured, yellow: p.yellow, red: p.sentOff });
    const tp = this.stats.poss[0] + this.stats.poss[1] || 1;
    return { hg: this.score[0], ag: this.score[1], events: this.events, stats: { ...this.stats, possPct: [Math.round(this.stats.poss[0] / tp * 100), Math.round(this.stats.poss[1] / tp * 100)] }, players, played: true };
  }
  // termine le match en simulation rapide (minutes restantes)
  simulateRest(strengthH, strengthA) {
    const rem = Math.max(0, 90 - this.minute) / 90;
    const lamH = rem * 1.35 * Math.pow(strengthH / strengthA, 1.4), lamA = rem * 1.1 * Math.pow(strengthA / strengthH, 1.4);
    const pois = l => { const L = Math.exp(-l); let k = 0, p = 1; do { k++; p *= Math.random(); } while (p > L); return k - 1; };
    const add = [pois(lamH), pois(lamA)];
    for (let s = 0; s < 2; s++) for (let i = 0; i < add[s]; i++) {
      const T = this.teams[s], c = T.ps.filter(p => !p.sentOff && !p.isGK); const sc = c[Math.floor(Math.random() * c.length)];
      this.score[s]++; sc.goals++; this.events.push({ type: 'goal', min: Math.round(this.minute + Math.random() * (90 - this.minute)), team: s, pid: sc.id, name: sc.name });
    }
    this.minute = 90; this.finish();
  }
  substitute(side, outIdx, benchIdx) {
    const T = this.teams[side];
    if (this.subsLeft[side] <= 0) return false;
    const out = T.ps[outIdx], inn = T.bench[benchIdx];
    if (!out || !inn || out.sentOff || inn.used) return false;
    const np = { ...out, id: inn.id, name: inn.name, num: inn.num, pos: inn.pos, a: inn.attrs, stamina: inn.fitness ?? 1, yellow: 0, injured: false, rating: 6.5, goals: 0, assists: 0, minutes: 0, touches: 0, skin: SKIN[inn.name.length % SKIN.length] };
    inn.used = true; out.subbedOff = true;
    this.subbedOff = this.subbedOff || []; this.subbedOff.push(out);
    T.ps[outIdx] = np; if (this.selected === out) this.select(np);
    if (this.ball.owner === out) this.ball.owner = np;
    this.subsLeft[side]--;
    this.events.push({ type: 'sub', min: Math.round(this.minute), team: side, pid: np.id, name: np.name, outName: out.name, outId: out.id });
    return true;
  }
  allPlayersForResult() {
    const r = this.result();
    for (const p of this.subbedOff || []) r.players.push({ id: p.id, team: p.team, minutes: Math.round(p.minutes), goals: p.goals, assists: p.assists, rating: Math.round(p.rating * 10) / 10, stamina: p.stamina, injured: p.injured, yellow: p.yellow, red: false });
    return r;
  }

  // ---------------- rendu ----------------
  proj(x, y, z) {
    const C = this.camC, f = this.camF, r = this.camR, u = this.camU;
    const dx = x - C[0], dy = y - C[1], dz = z - C[2];
    const zc = dx * f[0] + dy * f[1] + dz * f[2];
    const xc = dx * r[0] + dy * r[1] + dz * r[2];
    const yc = dx * u[0] + dy * u[1] + dz * u[2];
    const k = this.focal / Math.max(zc, 0.1);
    return [this.W / 2 + xc * k, this.H * 0.5 - yc * k, k, zc];
  }
  setCamera(bx, by, close = false) {
    const aspect = this.W / this.H;
    const target = clamp(bx, -HL + 6, HL - 6);
    this.cam.x = lerp(this.cam.x, target, close ? 0.2 : 0.06);
    this.cam.y = lerp(this.cam.y, by, 0.04);
    const z = this.settings.zoom || 1;
    const camY = -44 + this.cam.y * 0.35 + (close ? 16 : 0), camZ = (close ? 11 : 17) / Math.sqrt(z);
    const C = [this.cam.x, camY, camZ], T = [this.cam.x, this.cam.y * 0.6 + (close ? 4 : 0), 0];
    let f = [T[0] - C[0], T[1] - C[1], T[2] - C[2]]; const fl = Math.hypot(...f); f = f.map(v => v / fl);
    let r = [f[1], -f[0], 0]; const rl = Math.hypot(...r); r = r.map(v => v / rl);
    const u = [r[1] * f[2] - r[2] * f[1], r[2] * f[0] - r[0] * f[2], r[0] * f[1] - r[1] * f[0]];
    this.camC = C; this.camF = f; this.camR = r; this.camU = u;
    this.focal = Math.min(this.H * 2.3, this.W * 1.25) * (close ? 1.3 : 1) * z;
  }
  render() {
    const c = this.c, W = this.W, H = this.H;
    let frame = null;
    if (this.replay) { const fr = this.replay.frames, i = Math.floor(this.replay.i); frame = fr[Math.min(i, fr.length - 1)]; }
    const bx = frame ? frame.b[0] : this.ball.x, by = frame ? frame.b[1] : this.ball.y;
    this.setCamera(bx, by, !!frame);
    // ciel / fond
    const g = c.createLinearGradient(0, 0, 0, H * 0.4);
    g.addColorStop(0, '#05070d'); g.addColorStop(1, '#16213a');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    this.drawStands(); this.drawPitch(); this.drawGoal(-1, true); this.drawGoal(1, true);
    // entités triées par profondeur
    const ents = [];
    let k = 0;
    for (const T of this.teams) for (const p of T.ps) {
      const fp = frame ? frame.p[k] : null; k++;
      if (p.sentOff && !frame) continue;
      ents.push({ y: fp ? fp[1] : p.y, draw: () => this.drawPlayer(p, fp) });
    }
    const bz = frame ? frame.b[2] : this.ball.z;
    ents.push({ y: by + 0.01, draw: () => this.drawBall(bx, by, bz) });
    ents.sort((a, b) => b.y - a.y);
    for (const e of ents) e.draw();
    this.drawGoal(-1, false); this.drawGoal(1, false);
    this.drawHUD(!!frame);
    if (!frame && this.goalFxT > 0) this.drawGoalCelebration();
  }
  drawGoalCelebration() {
    const c = this.c, d = this.dpr, t = this.goalFxT, team = this.teams[this.goalFxTeam];
    const pulse = 0.5 + 0.5 * Math.sin((2.2 - t) * 17);
    c.save();
    c.fillStyle = `rgba(255,255,255,${0.045 + pulse * 0.055})`; c.fillRect(0, 0, this.W, this.H);
    const w = Math.min(this.W - 28 * d, 420 * d), h = 88 * d, x = (this.W - w) / 2, y = this.H * 0.19;
    c.fillStyle = 'rgba(5,10,18,0.88)'; c.fillRect(x, y, w, h);
    c.fillStyle = team.kit.shirt; c.fillRect(x, y, 7 * d, h);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillStyle = '#fff'; c.font = `900 ${Math.max(24, 36 * d)}px system-ui,Arial`;
    c.fillText('BUUUUT !', this.W / 2, y + 31 * d);
    c.fillStyle = team.kit.trim === team.kit.shirt ? '#ffe16a' : team.kit.trim;
    c.font = `800 ${Math.max(13, 18 * d)}px system-ui,Arial`;
    c.fillText(`${team.short}  ${this.score[0]} - ${this.score[1]}`, this.W / 2, y + 59 * d);
    c.fillStyle = '#fff'; c.font = `700 ${Math.max(10, 12 * d)}px system-ui,Arial`;
    c.fillText(this.goalFxScorer || 'BUT !', this.W / 2, y + 78 * d);
    // confettis légers et déterministes, sans allocations d'images
    for (let i = 0; i < 28; i++) {
      const phase = (i * 2.399 + (2.2 - t) * (1.8 + (i % 5) * 0.25));
      const px = this.W / 2 + Math.cos(phase) * (24 + (2.2 - t) * (35 + i % 7 * 8)) * d;
      const py = y + h + Math.sin(phase * 1.3) * (10 + (2.2 - t) * (18 + i % 6 * 5)) * d;
      c.globalAlpha = Math.max(0, t / 2.2) * 0.85; c.fillStyle = i % 2 ? team.kit.trim : '#fff';
      c.fillRect(px, py, (2 + i % 3) * d, (4 + i % 4) * d);
    }
    c.restore();
  }
  buildCrowd() {
    const cv = document.createElement('canvas'); cv.width = 2048; cv.height = 256;
    const x = cv.getContext('2d');
    const g = x.createLinearGradient(0, 0, 0, 256); g.addColorStop(0, '#0d0f16'); g.addColorStop(1, '#232733');
    x.fillStyle = g; x.fillRect(0, 0, 2048, 256);
    const cols = [this.teams[0].kit.shirt, this.teams[0].kit.trim, '#e70013', '#ffffff', '#3a3f4c', this.teams[1].kit.shirt];
    // rangées de spectateurs (tête + buste), plus sombres vers le haut
    for (let row = 0; row < 26; row++) {
      const py = 6 + row * 9.6, shade = 0.45 + row / 26 * 0.55;
      for (let px = Math.random() * 6; px < 2048; px += 5 + Math.random() * 4) {
        const away = px > 1720;
        if (Math.random() < 0.08) continue;
        x.globalAlpha = shade;
        x.fillStyle = away ? (Math.random() < 0.6 ? this.teams[1].kit.shirt : '#2a2e38') : cols[Math.floor(Math.random() * (Math.random() < 0.72 ? 2 : 5))];
        x.fillRect(px, py + 3, 4, 5);
        x.fillStyle = ['#8d5524', '#c68642', '#e0ac69', '#5c3a1e'][(px * 7 + row) % 4 | 0];
        x.fillRect(px + 0.5, py, 3, 3);
      }
    }
    x.globalAlpha = 1;
    x.save(); x.scale(2, 2);
    // drapeaux tunisiens stylisés (cercle + croissant + étoile simplifiés)
    for (let i = 0; i < 6; i++) {
      const fx = 60 + i * 160, fy = 30 + (i % 2) * 40;
      x.fillStyle = '#e70013'; x.fillRect(fx, fy, 46, 30);
      x.fillStyle = '#fff'; x.beginPath(); x.arc(fx + 23, fy + 15, 9, 0, 7); x.fill();
      x.fillStyle = '#e70013'; x.beginPath(); x.arc(fx + 24, fy + 15, 6.5, 0, 7); x.fill();
      x.fillStyle = '#fff'; x.beginPath(); x.arc(fx + 26.5, fy + 15, 5.2, 0, 7); x.fill();
      x.fillStyle = '#e70013'; x.fillRect(fx + 26, fy + 13.5, 3, 3);
    }
    // tifo bande
    x.fillStyle = this.teams[0].kit.shirt; x.fillRect(380, 100, 260, 16); x.fillStyle = this.teams[0].kit.trim === this.teams[0].kit.shirt ? '#000' : this.teams[0].kit.trim; x.font = 'bold 12px Arial'; x.textAlign = 'center'; x.fillText((this.teams[0].short + ' • ' + this.teams[0].short + ' • ' + this.teams[0].short), 510, 112);
    x.restore();
    this.crowdTex = cv;
    const ad = document.createElement('canvas'); ad.width = 2048; ad.height = 40; const a = ad.getContext('2d');
    const boards = [['#0b3d91', '#fff', 'FOOTBALL TUNISIA 2026'], ['#e70013', '#fff', 'تونس • TUNISIE'], ['#111', '#f5c400', 'JASMIN SPORT'], ['#0f7b3c', '#fff', 'SAHEL • SFAX • TUNIS'], ['#fff', '#e70013', 'قرطاج 2026'], ['#5b2c83', '#fff', 'DJERBA AIR'], ['#f39200', '#111', 'HARISSA ENERGY'], ['#1d1d1d', '#fff', 'KAIROUAN TELECOM']];
    for (let i = 0; i < 8; i++) { const [bg, fg, tx] = boards[i]; a.fillStyle = bg; a.fillRect(i * 256, 0, 256, 40); a.fillStyle = fg; a.font = 'bold 22px Arial'; a.textAlign = 'center'; a.fillText(tx, i * 256 + 128, 28); }
    this.adTex = ad;
  }
  drawStands() {
    const c = this.c;
    if (this.settings.quality !== 'low' && !this.crowdTex) this.buildCrowd();
    if (!this.adTex) this.buildCrowd();
    // tribune lointaine : bandes horizontales
    const rows = this.settings.quality === 'low' ? 6 : 18;
    for (let i = 0; i < rows; i++) {
      const y0 = 38 + i * 1.6, z0 = i * 1.05, y1 = y0 + 1.6, z1 = z0 + 1.05;
      const a = this.proj(-75, y0, z0), b = this.proj(-75, y1, z1);
      const r0 = this.proj(75, y0, z0);
      const w = r0[0] - a[0], h = a[1] - b[1] + 1;
      if (this.crowdTex) c.drawImage(this.crowdTex, 0, (1 - (i + 1) / rows) * 256, 2048, 256 / rows, a[0], b[1], w, h);
      else { c.fillStyle = i % 2 ? '#262a35' : '#20232c'; c.fillRect(a[0], b[1], w, h); }
    }
    // toit / projecteurs
    const top = this.proj(0, 38 + rows * 1.6, rows * 1.05);
    c.fillStyle = '#0a0c12'; c.fillRect(0, 0, this.W, Math.max(0, top[1]));
    for (const lx of [-60, -20, 20, 60]) { const p = this.proj(lx, 70, 30); const gr = c.createRadialGradient(p[0], p[1], 0, p[0], p[1], 60 * this.dpr); gr.addColorStop(0, '#fffbe6'); gr.addColorStop(0.2, '#fff6c855'); gr.addColorStop(1, '#0000'); c.fillStyle = gr; c.fillRect(p[0] - 60 * this.dpr, p[1] - 60 * this.dpr, 120 * this.dpr, 120 * this.dpr); }
    // panneaux publicitaires
    const a = this.proj(-62, 36, 0), b = this.proj(-62, 36, 0.9), r = this.proj(62, 36, 0);
    c.drawImage(this.adTex, a[0], b[1], r[0] - a[0], a[1] - b[1]);
  }
  poly(pts, fill) { const c = this.c; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fillStyle = fill; c.fill(); }
  drawPitch() {
    const c = this.c;
    // gazon autour
    this.poly([this.proj(-62, -40, 0), this.proj(62, -40, 0), this.proj(62, 36, 0), this.proj(-62, 36, 0)], '#2b6f2a');
    const n = 14, sw = 2 * HL / n;
    for (let i = 0; i < n; i++) {
      const x0 = -HL + i * sw, x1 = x0 + sw;
      this.poly([this.proj(x0, -HW, 0), this.proj(x1, -HW, 0), this.proj(x1, HW, 0), this.proj(x0, HW, 0)], i % 2 ? '#3d8f37' : '#357f31');
    }
    c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = Math.max(1, 2 * this.dpr);
    const line = pts => { c.beginPath(); pts.forEach((p, i) => { const q = this.proj(p[0], p[1], 0); i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); }); c.stroke(); };
    line([[-HL, -HW], [HL, -HW], [HL, HW], [-HL, HW], [-HL, -HW]]);
    line([[0, -HW], [0, HW]]);
    const circ = (cx, cy, r, a0 = 0, a1 = Math.PI * 2) => { const pts = []; for (let i = 0; i <= 40; i++) { const a = a0 + (a1 - a0) * i / 40; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } line(pts); };
    circ(0, 0, 9.15);
    for (const s of [-1, 1]) {
      line([[s * HL, -20.16], [s * (HL - 16.5), -20.16], [s * (HL - 16.5), 20.16], [s * HL, 20.16]]);
      line([[s * HL, -9.16], [s * (HL - 5.5), -9.16], [s * (HL - 5.5), 9.16], [s * HL, 9.16]]);
      const a = Math.acos(5.5 / 9.15);
      if (s > 0) circ(HL - 11, 0, 9.15, Math.PI - a, Math.PI + a); else circ(-HL + 11, 0, 9.15, -a, a);
      const ps = this.proj(s * (HL - 11), 0, 0); c.fillStyle = '#fff'; c.beginPath(); c.arc(ps[0], ps[1], 2 * this.dpr, 0, 7); c.fill();
    }
    const cs = this.proj(0, 0, 0); c.fillStyle = '#fff'; c.beginPath(); c.arc(cs[0], cs[1], 2 * this.dpr, 0, 7); c.fill();
  }
  drawGoal(s, back) {
    const c = this.c, x = s * HL, xb = s * (HL + 2);
    c.lineWidth = Math.max(1, 1 * this.dpr);
    if (back) {
      c.strokeStyle = 'rgba(255,255,255,0.35)';
      for (let i = 0; i <= 8; i++) { const yy = -GOAL_W + i * GOAL_W / 4; const a = this.proj(x, yy, GOAL_H), b = this.proj(xb, yy, GOAL_H * 0.6), d = this.proj(xb, yy, 0); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.lineTo(d[0], d[1]); c.stroke(); }
      for (let j = 0; j <= 4; j++) { const z = j * GOAL_H * 0.6 / 4; const a = this.proj(xb, -GOAL_W, z), b = this.proj(xb, GOAL_W, z); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
      return;
    }
    c.strokeStyle = '#f4f4f4'; c.lineWidth = Math.max(2, 3.5 * this.dpr);
    const l = this.proj(x, -GOAL_W, 0), lt = this.proj(x, -GOAL_W, GOAL_H), r = this.proj(x, GOAL_W, 0), rt = this.proj(x, GOAL_W, GOAL_H);
    c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(lt[0], lt[1]); c.lineTo(rt[0], rt[1]); c.lineTo(r[0], r[1]); c.stroke();
  }
  drawPlayer(p, fp) {
    const c = this.c;
    const x = fp ? fp[0] : p.x, y = fp ? fp[1] : p.y, face = fp ? fp[2] : p.face, anim = fp ? fp[3] : p.anim;
    const vx = fp ? fp[4] : p.vx, vy = fp ? fp[5] : p.vy;
    const T = this.teams[p.team], kit = p.isGK ? T.gkKit : T.kit;
    const ground = this.proj(x, y, 0); const s = ground[2]; // px par mètre
    if (ground[3] < 1) return;
    const jump = fp ? 0 : Math.max(0, Math.min(1, (p.jumpT || 0) / 0.42));
    const g = [ground[0], ground[1] - Math.sin(jump * Math.PI) * 0.62 * s, ground[2], ground[3]];
    const hgt = 1.8 * s, w = 0.5 * s;
    // ombre et effets d'action au sol : plongeon du gardien / tacle glissé
    c.fillStyle = 'rgba(0,0,0,0.35)'; c.beginPath(); c.ellipse(ground[0] + 0.25 * s, ground[1], 0.45 * s * (1 - jump * 0.22), 0.14 * s, 0, 0, 7); c.fill();
    const divePulse = Math.max(0, Math.min(1, (p.diveT || 0) / 0.42));
    const slidePulse = Math.max(0, Math.min(1, (p.slideT || 0) / 0.38));
    if (divePulse > 0.02 || slidePulse > 0.02) {
      const dir = p.isGK ? (p.diveDir || 1) : (p.slideDir || 1);
      c.save(); c.globalAlpha = 0.28 * Math.max(divePulse, slidePulse); c.strokeStyle = p.isGK ? '#f5f8ff' : kit.trim;
      c.lineWidth = Math.max(1, 0.09 * s); c.lineCap = 'round';
      c.beginPath(); c.moveTo(g[0] - 0.7 * s, g[1] - dir * 0.18 * s); c.lineTo(g[0] - 1.35 * s, g[1] - dir * 0.32 * s); c.stroke();
      c.beginPath(); c.moveTo(g[0] - 0.55 * s, g[1] + dir * 0.12 * s); c.lineTo(g[0] - 1.05 * s, g[1] + dir * 0.24 * s); c.stroke(); c.restore();
    }
    // repère joueur sélectionné
    if (p === this.selected && !fp) {
      c.strokeStyle = '#ffe14a'; c.lineWidth = Math.max(2, 0.08 * s);
      c.beginPath(); c.ellipse(g[0], g[1], 0.7 * s, 0.24 * s, 0, 0, 7); c.stroke();
      c.fillStyle = '#ffe14a'; c.beginPath(); c.moveTo(g[0], g[1] - hgt - 0.25 * s); c.lineTo(g[0] - 0.22 * s, g[1] - hgt - 0.6 * s); c.lineTo(g[0] + 0.22 * s, g[1] - hgt - 0.6 * s); c.fill();
      // jauge de tir
      if (this.input.shooting) { const pw = this.input.shootHold; c.fillStyle = '#0008'; c.fillRect(g[0] - 0.6 * s, g[1] - hgt - 0.95 * s, 1.2 * s, 0.18 * s); c.fillStyle = pw > 0.85 ? '#ff4d4d' : '#ffe14a'; c.fillRect(g[0] - 0.6 * s, g[1] - hgt - 0.95 * s, 1.2 * s * pw, 0.18 * s); }
    }
    const sp = Math.hypot(vx, vy), sw = Math.sin(anim * 1.6) * Math.min(1, sp / 4) * 0.45;
    const hipY = g[1] - hgt * 0.47;
    // jambes
    c.strokeStyle = p.skin; c.lineWidth = Math.max(1.5, 0.15 * s); c.lineCap = 'round';
    for (const k of [-1, 1]) { c.beginPath(); c.moveTo(g[0] + k * 0.1 * s, hipY); c.lineTo(g[0] + k * 0.1 * s + sw * k * 0.5 * s * face, g[1] - 0.05 * s); c.stroke(); }
    // chaussettes
    c.strokeStyle = kit.shirt; c.lineWidth = Math.max(1.5, 0.17 * s);
    for (const k of [-1, 1]) { const fx = g[0] + k * 0.1 * s + sw * k * 0.5 * s * face; c.beginPath(); c.moveTo(fx - sw * k * 0.12 * s * face, g[1] - 0.45 * s); c.lineTo(fx, g[1] - 0.08 * s); c.stroke(); }
    // crampons sombres avec semelle claire, visibles en course
    c.strokeStyle = '#17191d'; c.lineWidth = Math.max(1.8, 0.11 * s); c.lineCap = 'round';
    for (const k of [-1, 1]) {
      const fx = g[0] + k * 0.1 * s + sw * k * 0.5 * s * face;
      c.beginPath(); c.moveTo(fx, g[1] - 0.08 * s); c.lineTo(fx + face * 0.13 * s, g[1] - 0.015 * s); c.stroke();
      c.strokeStyle = '#d9dce2'; c.lineWidth = Math.max(0.7, 0.035 * s);
      c.beginPath(); c.moveTo(fx - 0.04 * s, g[1] - 0.02 * s); c.lineTo(fx + face * 0.12 * s, g[1] - 0.02 * s); c.stroke();
      c.strokeStyle = '#17191d'; c.lineWidth = Math.max(1.8, 0.11 * s);
    }
    // short : volume, coutures et liseré aux couleurs du club
    c.fillStyle = kit.shorts; c.fillRect(g[0] - w * 0.5, hipY - 0.06 * s, w, 0.3 * s);
    c.fillStyle = kit.trim; c.globalAlpha = 0.9;
    c.fillRect(g[0] - w * 0.5, hipY - 0.06 * s, Math.max(1, 0.035 * s), 0.3 * s);
    c.fillRect(g[0] + w * 0.465, hipY - 0.06 * s, Math.max(1, 0.035 * s), 0.3 * s);
    c.globalAlpha = 1;
    c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = Math.max(0.7, 0.025 * s);
    c.beginPath(); c.moveTo(g[0], hipY - 0.02 * s); c.lineTo(g[0], hipY + 0.2 * s); c.stroke();
    // maillot : rendu textile enrichi, panneaux, fines rayures et col
    const tY = g[1] - hgt * 0.82, tH = hgt * 0.37;
    const shirtX = g[0] - w * 0.55, shirtW = w * 1.1;
    c.save();
    this.rr(shirtX, tY, shirtW, tH, 0.1 * s); c.clip();
    c.fillStyle = kit.shirt; c.fillRect(shirtX, tY, shirtW, tH);
    // Motifs distincts par club : créations originales inspirées des couleurs,
    // sans prétendre reproduire un maillot officiel sous licence.
    const kitId = T.id || T.short || '';
    const pattern = kit.pattern || ({
      est: 'hoops', ca: 'stripes', css: 'pinstripes', ess: 'hoops',
      st: 'sash', usm: 'split', cab: 'stripes', esz: 'split',
      esm: 'stripes', usbg: 'hoops', asm: 'sash', ob: 'split'
    }[kitId] || (p.team === 0 ? 'stripes' : 'sash'));
    c.fillStyle = kit.trim;
    c.globalAlpha = 0.78;
    if (pattern === 'stripes' || pattern === 'pinstripes') {
      const count = pattern === 'pinstripes' ? 7 : 3;
      const band = shirtW / (count * 2 + 1);
      for (let n = 0; n < count; n++) {
        const width = pattern === 'pinstripes' ? Math.max(0.7, band * 0.28) : band;
        c.fillRect(shirtX + band * (1 + n * 2), tY, width, tH);
      }
    } else if (pattern === 'hoops') {
      c.fillRect(shirtX, tY + tH * 0.28, shirtW, Math.max(1, tH * 0.15));
      c.fillRect(shirtX, tY + tH * 0.67, shirtW, Math.max(1, tH * 0.13));
    } else if (pattern === 'sash') {
      c.beginPath(); c.moveTo(shirtX + shirtW * 0.68, tY); c.lineTo(shirtX + shirtW * 0.91, tY);
      c.lineTo(shirtX + shirtW * 0.34, tY + tH); c.lineTo(shirtX + shirtW * 0.11, tY + tH); c.closePath(); c.fill();
    } else if (pattern === 'split') {
      c.fillRect(shirtX + shirtW * 0.5, tY, shirtW * 0.5, tH);
    }
    c.globalAlpha = 1;
    // Panneaux latéraux légèrement ombrés pour donner du volume au tissu
    c.fillStyle = 'rgba(0,0,0,0.13)';
    c.fillRect(shirtX, tY, shirtW * 0.13, tH);
    c.fillRect(shirtX + shirtW * 0.87, tY, shirtW * 0.13, tH);
    // Rayures fines aux couleurs du club, visibles sans surcharger les petits sprites
    c.globalAlpha = 0.42;
    c.fillStyle = kit.trim;
    for (let stripe = 1; stripe <= 4; stripe++) {
      const sx = shirtX + shirtW * stripe / 5;
      c.fillRect(sx - Math.max(0.45, 0.018 * s), tY, Math.max(0.9, 0.036 * s), tH);
    }
    c.globalAlpha = 1;
    // Bande centrale / détail distinctif du maillot
    c.fillStyle = kit.trim;
    c.fillRect(g[0] - w * 0.055, tY, w * 0.11, tH);
    // Reflet textile discret sur le haut du torse
    const sheen = c.createLinearGradient(shirtX, tY, shirtX + shirtW, tY + tH);
    sheen.addColorStop(0, 'rgba(255,255,255,0.16)');
    sheen.addColorStop(0.48, 'rgba(255,255,255,0.015)');
    sheen.addColorStop(1, 'rgba(0,0,0,0.12)');
    c.fillStyle = sheen; c.fillRect(shirtX, tY, shirtW, tH);
    c.restore();
    // Col contrasté
    c.strokeStyle = kit.trim; c.lineWidth = Math.max(1, 0.055 * s);
    c.beginPath(); c.arc(g[0], tY + 0.015 * s, 0.105 * s, 0.12 * Math.PI, 0.88 * Math.PI); c.stroke();
    // bras, manches et poignets contrastés
    c.strokeStyle = kit.shirt; c.lineWidth = Math.max(1.5, 0.13 * s);
    for (const k of [-1, 1]) {
      const ax = g[0] + k * w * 0.5, ex = g[0] + k * w * 0.62 - sw * k * 0.35 * s * face;
      const ey = tY + tH * 0.85;
      c.beginPath(); c.moveTo(ax, tY + 0.08 * s); c.lineTo(ex, ey); c.stroke();
      c.strokeStyle = kit.trim; c.lineWidth = Math.max(1.2, 0.075 * s);
      c.beginPath(); c.moveTo(ax + (ex - ax) * 0.72, tY + 0.08 * s + (ey - (tY + 0.08 * s)) * 0.72);
      c.lineTo(ex, ey); c.stroke();
      c.strokeStyle = kit.shirt; c.lineWidth = Math.max(1.5, 0.13 * s);
    }
    // tête
    c.fillStyle = p.skin; c.beginPath(); c.arc(g[0], tY - 0.14 * s, 0.13 * s, 0, 7); c.fill();
    c.fillStyle = '#1b130d'; c.beginPath(); c.arc(g[0] - face * 0.02 * s, tY - 0.18 * s, 0.12 * s, Math.PI, 0); c.fill();
    // numéro
    if (s > 14) { c.fillStyle = kit.trim === kit.shirt ? '#000' : '#fff'; c.font = `bold ${Math.round(0.24 * s)}px Arial`; c.textAlign = 'center'; c.fillText(p.num, g[0], tY + tH * 0.62); }
    // nom
    if ((p === this.selected || p === this.ball.owner) && !fp && s > 8) {
      c.font = `600 ${Math.round(Math.max(10 * this.dpr, 0.3 * s))}px system-ui,Arial`; c.textAlign = 'center';
      const nm = p.name.split(' ').slice(-1)[0];
      c.fillStyle = '#000a'; const tw = c.measureText(nm).width + 8; c.fillRect(g[0] - tw / 2, g[1] + 0.25 * s, tw, 0.42 * s);
      c.fillStyle = p.team === this.userSide ? '#ffe14a' : '#fff'; c.fillText(nm, g[0], g[1] + 0.56 * s);
    }
  }
  rr(x, y, w, h, r) { const c = this.c; c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  drawBall(x, y, z) {
    const c = this.c, sh = this.proj(x, y, 0), b = this.proj(x, y, z + 0.11);
    const r = Math.max(2.5 * this.dpr, 0.13 * b[2]);
    c.fillStyle = 'rgba(0,0,0,0.4)'; c.beginPath(); c.ellipse(sh[0], sh[1], r * 1.1, r * 0.4, 0, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(b[0], b[1], r, 0, 7); c.fill();
    c.fillStyle = '#222'; c.beginPath(); c.arc(b[0] + r * 0.2, b[1] - r * 0.15, r * 0.35, 0, 7); c.fill();
    c.strokeStyle = '#0006'; c.lineWidth = 1; c.beginPath(); c.arc(b[0], b[1], r, 0, 7); c.stroke();
  }
  drawHUD(isReplay) {
    const c = this.c, d = this.dpr, T = this.teams;
    // tableau des scores
    const x0 = 12 * d, y0 = 10 * d, h = 30 * d;
    c.font = `800 ${15 * d}px system-ui,Arial`; c.textBaseline = 'middle'; c.textAlign = 'left';
    const min = Math.floor(this.minute), lab = `${T[0].short}  ${this.score[0]} - ${this.score[1]}  ${T[1].short}`;
    const tw = c.measureText(lab).width;
    c.fillStyle = '#0b0f1acc'; c.fillRect(x0, y0, tw + 92 * d, h);
    c.fillStyle = T[0].kit.shirt; c.fillRect(x0, y0, 5 * d, h); c.fillStyle = T[1].kit.shirt; c.fillRect(x0 + tw + 26 * d, y0, 5 * d, h);
    c.fillStyle = '#fff'; c.fillText(lab, x0 + 14 * d, y0 + h / 2);
    c.fillStyle = '#e70013'; c.fillRect(x0 + tw + 34 * d, y0, 58 * d, h);
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.fillText(`${String(min).padStart(2, '0')}'`, x0 + tw + 63 * d, y0 + h / 2);
    // bandeau commentaire
    if (this.tickerT > 0 && this.ticker) {
      c.font = `600 ${13 * d}px system-ui,Arial`; const w = c.measureText(this.ticker).width + 24 * d;
      c.fillStyle = '#000000b0'; c.fillRect(this.W / 2 - w / 2, y0 + h + 8 * d, w, 26 * d);
      c.fillStyle = '#fff'; c.fillText(this.ticker, this.W / 2, y0 + h + 21 * d);
    }
    if (this.msgT > 0 && this.msg) {
      c.font = `900 ${Math.round(this.H * 0.09)}px system-ui,Arial`; c.textAlign = 'center';
      c.fillStyle = '#000a'; c.fillText(this.msg, this.W / 2 + 3 * d, this.H * 0.36 + 3 * d);
      c.fillStyle = isReplay ? '#ffe14a' : '#fff'; c.fillText(this.msg, this.W / 2, this.H * 0.36);
    }
    if (isReplay) { c.font = `700 ${13 * d}px system-ui`; c.fillStyle = '#fff'; c.fillText('Touchez pour passer', this.W / 2, this.H * 0.44); }
    // radar
    const mw = 120 * d, mh = 78 * d, mx = this.W / 2 - mw / 2, my = this.H - mh - 8 * d;
    c.fillStyle = '#0a3d0fcc'; c.fillRect(mx, my, mw, mh); c.strokeStyle = '#ffffff88'; c.lineWidth = 1; c.strokeRect(mx, my, mw, mh);
    c.beginPath(); c.moveTo(mx + mw / 2, my); c.lineTo(mx + mw / 2, my + mh); c.stroke();
    for (const Tm of T) for (const p of Tm.ps) { if (p.sentOff) continue; c.fillStyle = p === this.selected ? '#ffe14a' : Tm.kit.shirt; c.beginPath(); c.arc(mx + (p.x + HL) / (2 * HL) * mw, my + (HW - p.y) / (2 * HW) * mh, (p === this.selected ? 3.2 : 2.4) * d, 0, 7); c.fill(); }
    c.fillStyle = '#fff'; c.beginPath(); c.arc(mx + (this.ball.x + HL) / (2 * HL) * mw, my + (HW - this.ball.y) / (2 * HW) * mh, 2 * d, 0, 7); c.fill();
    c.textBaseline = 'alphabetic';
  }
}

// ---------- Simulation statistique rapide (sans rendu) ----------
export function quickSim(strH, strA, r = Math.random, homeAdv = 1.08) {
  const ratio = (strH * homeAdv) / strA;
  const lamH = 1.25 * Math.pow(ratio, 2.2), lamA = 1.05 * Math.pow(1 / ratio, 2.2);
  const pois = l => { const L = Math.exp(-Math.min(l, 6)); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; };
  return [Math.min(pois(lamH), 8), Math.min(pois(lamA), 8)];
}
