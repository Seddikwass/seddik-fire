// Audio 100 % synthétisé (Web Audio) : ambiance de stade, sifflet, frappes, darbouka originale.
// Aucune musique ni enregistrement protégé. Voix : synthèse vocale du navigateur ou moteur natif Android.
let ctx = null, master = null, crowdGain = null, crowdFilter = null, crowdLowFilter = null, crowdHighFilter = null, drumTimer = null;
let enabled = true, volume = 0.8, excitement = 0.2;
// Bus séparés (réglages indépendants) : effets de jeu, public, commentaires.
let fxBus = null, crowdBus = null, mix = { fx: 1, crowd: 1, comment: 1 };

export function audioInit() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = enabled ? volume : 0; master.connect(ctx.destination);
  fxBus = ctx.createGain(); fxBus.gain.value = mix.fx; fxBus.connect(master);
  crowdBus = ctx.createGain(); crowdBus.gain.value = mix.crowd; crowdBus.connect(master);
  // bruit brun en boucle → foule
  const len = ctx.sampleRate * 3, buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.2; } }
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  // Trois bandes complémentaires donnent une foule plus large et moins monotone
  // sans télécharger d'enregistrement : grave des tribunes, médiums et clameur aiguë.
  crowdLowFilter = ctx.createBiquadFilter();
  crowdLowFilter.type = 'lowpass'; crowdLowFilter.frequency.value = 260;
  crowdFilter = ctx.createBiquadFilter();
  crowdFilter.type = 'bandpass'; crowdFilter.frequency.value = 700; crowdFilter.Q.value = 0.6;
  crowdHighFilter = ctx.createBiquadFilter();
  crowdHighFilter.type = 'highpass'; crowdHighFilter.frequency.value = 1450;
  const lowGain = ctx.createGain(); lowGain.gain.value = 0.46;
  const midGain = ctx.createGain(); midGain.gain.value = 0.72;
  const highGain = ctx.createGain(); highGain.gain.value = 0.2;
  crowdGain = ctx.createGain(); crowdGain.gain.value = 0;
  src.connect(crowdLowFilter).connect(lowGain).connect(crowdGain);
  src.connect(crowdFilter).connect(midGain).connect(crowdGain);
  src.connect(crowdHighFilter).connect(highGain).connect(crowdGain);
  crowdGain.connect(crowdBus);
  src.start();
}
export function setMix({ fx, crowd, comment } = {}) {
  if (fx != null) mix.fx = clampV(fx); if (crowd != null) mix.crowd = clampV(crowd); if (comment != null) mix.comment = clampV(comment);
  if (fxBus) fxBus.gain.value = mix.fx; if (crowdBus) crowdBus.gain.value = mix.crowd;
}
export function getMix() { return { ...mix }; }
function clampV(v) { v = Number(v); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1; }
export function setAudio(on, vol) { enabled = on; if (vol != null) volume = vol; if (master) master.gain.value = enabled ? volume : 0; }
export function audioSuspend() { if (ctx && ctx.state === 'running') ctx.suspend(); stopDrums(); stopChant(); stopSing(); }
export function audioResume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

export function crowd(level) { // 0..1
  excitement = Math.max(0, Math.min(1, Number(level) || 0));
  if (!crowdGain || !ctx) return;
  const t = ctx.currentTime, e = excitement;
  crowdGain.gain.setTargetAtTime(0.10 + e * 0.45, t, 0.4);
  crowdLowFilter.frequency.setTargetAtTime(210 + e * 170, t, 0.55);
  crowdFilter.frequency.setTargetAtTime(500 + e * 900, t, 0.4);
  crowdHighFilter.frequency.setTargetAtTime(1750 + e * 1550, t, 0.5);
}
function noiseBurst(dur, freq, gain, type = 'lowpass') {
  if (!ctx || !enabled) return;
  const len = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2);
  const s = ctx.createBufferSource(); s.buffer = b; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.value = gain; s.connect(f).connect(g).connect(fxBus); s.start();
}
export function kick(power = 0.5) { noiseBurst(0.09, 380 + power * 400, 0.5 + power * 0.6); }
export function whistle(long = false) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
  o.frequency.value = 2900; lfo.frequency.value = 38; lg.gain.value = 120; lfo.connect(lg).connect(o.frequency);
  const d = long ? 0.9 : 0.35;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.02); g.gain.setValueAtTime(0.18, t + d - 0.05); g.gain.linearRampToValueAtTime(0, t + d);
  o.connect(g).connect(fxBus); o.start(t); lfo.start(t); o.stop(t + d); lfo.stop(t + d);
}
export function roar() { // clameur après un but
  if (!crowdGain) return;
  const t = ctx.currentTime;
  crowdGain.gain.cancelScheduledValues(t); crowdGain.gain.setValueAtTime(crowdGain.gain.value, t);
  crowdGain.gain.linearRampToValueAtTime(1.0, t + 0.4); crowdGain.gain.linearRampToValueAtTime(0.35, t + 5);
  crowdLowFilter.frequency.setTargetAtTime(420, t, 0.15);
  crowdFilter.frequency.setValueAtTime(1500, t);
  crowdHighFilter.frequency.setTargetAtTime(2350, t, 0.15);
  noiseBurst(1.6, 2200, 0.6, 'bandpass');
  startDrums(8);
}
export function netSound() { noiseBurst(0.25, 900, 0.4, 'highpass'); }
export function saveSound() {
  if (!ctx || !enabled) return;
  noiseBurst(0.18, 1250, 0.42, 'bandpass');
  const t = ctx.currentTime, o = ctx.createOscillator(), g = ctx.createGain();
  o.type = 'triangle'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(72, t + 0.16);
  g.gain.setValueAtTime(0.24, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  o.connect(g).connect(fxBus); o.start(t); o.stop(t + 0.19);
}
export function impact(power = 0.5) {
  noiseBurst(0.07 + power * 0.05, 520 + power * 420, 0.22 + power * 0.25, 'lowpass');
}
function drum(t, freq, dec, g0) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + dec);
  g.gain.setValueAtTime(g0, t); g.gain.exponentialRampToValueAtTime(0.001, t + dec);
  o.connect(g).connect(crowdBus); o.start(t); o.stop(t + dec);
}
// rythme de darbouka original (dum-tek-tek-dum-tek) joué par les tribunes
export function startDrums(seconds = 6) {
  if (!ctx || !enabled) return; stopDrums();
  const pattern = [[0, 'D'], [0.25, 'T'], [0.375, 'T'], [0.5, 'D'], [0.75, 'T']];
  const bar = 1.0; let t0 = ctx.currentTime + 0.05; const end = t0 + seconds;
  const sched = () => {
    while (t0 < ctx.currentTime + 0.6 && t0 < end) {
      for (const [o, k] of pattern) k === 'D' ? drum(t0 + o, 110, 0.25, 0.5) : drum(t0 + o, 420, 0.08, 0.22);
      t0 += bar;
    }
    if (t0 >= end) stopDrums();
  };
  sched(); drumTimer = setInterval(sched, 200);
}
export function stopDrums() { if (drumTimer) clearInterval(drumTimer); drumTimer = null; }
// ---------- Réactions du public (synthèse) ----------
// Souffle collectif « ooooh » : bruit filtré dont la hauteur monte puis retombe.
export function ooh(strength = 0.7) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime, dur = 1.4;
  const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 3.2;
  f.frequency.setValueAtTime(380, t); f.frequency.linearRampToValueAtTime(620, t + 0.35); f.frequency.linearRampToValueAtTime(300, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.4 * strength, t + 0.25); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(crowdBus); src.start(t); src.stop(t + dur);
}
// Soupir déçu des tribunes (but encaissé par l'équipe à domicile).
export function groan() {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime, dur = 1.8;
  const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2.4;
  f.frequency.setValueAtTime(520, t); f.frequency.exponentialRampToValueAtTime(190, t + dur);
  const g = ctx.createGain(); g.gain.setValueAtTime(1.1, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  src.connect(f).connect(g).connect(crowdBus); src.start(t); src.stop(t + dur);
  if (crowdGain) { crowdGain.gain.cancelScheduledValues(t); crowdGain.gain.setValueAtTime(crowdGain.gain.value, t); crowdGain.gain.linearRampToValueAtTime(0.06, t + 1.2); }
}
// Applaudissements : claquements courts répartis aléatoirement.
export function applause(seconds = 2, density = 45) {
  if (!ctx || !enabled) return;
  const t0 = ctx.currentTime, n = Math.floor(seconds * density);
  const len = Math.floor(ctx.sampleRate * 0.03), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const bus = ctx.createBiquadFilter(); bus.type = 'bandpass'; bus.frequency.value = 1800; bus.Q.value = 0.7;
  const g = ctx.createGain(); g.gain.value = 0.32; bus.connect(g).connect(crowdBus);
  for (let i = 0; i < n; i++) {
    const s = ctx.createBufferSource(); s.buffer = buf; s.playbackRate.value = 0.8 + Math.random() * 0.5;
    const fade = 1 - i / n; const sg = ctx.createGain(); sg.gain.value = 0.3 + fade * 0.7;
    s.connect(sg).connect(bus); s.start(t0 + Math.random() * seconds);
  }
}
// Sifflets du public : nombreux sifflets aigus désaccordés.
export function crowdWhistles(seconds = 1.6) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime;
  const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.028, t + 0.15); g.gain.setValueAtTime(0.028, t + seconds - 0.4); g.gain.linearRampToValueAtTime(0, t + seconds);
  g.connect(crowdBus);
  for (let i = 0; i < 9; i++) {
    const o = ctx.createOscillator(); o.type = 'sine';
    const start = t + Math.random() * 0.35, f0 = 2300 + Math.random() * 1500;
    o.frequency.setValueAtTime(f0, start); o.frequency.linearRampToValueAtTime(f0 * (0.92 + Math.random() * 0.16), start + seconds * 0.8);
    const og = ctx.createGain(); og.gain.value = 0.5 + Math.random() * 0.5;
    o.connect(og).connect(g); o.start(start); o.stop(t + seconds);
  }
}
// Chant des tribunes : claquements de mains en rythme sur la darbouka.
let chantTimer = null;
export function chant(seconds = 7) {
  if (!ctx || !enabled) return;
  stopChant();
  const clapLen = Math.floor(ctx.sampleRate * 0.05), clapBuf = ctx.createBuffer(1, clapLen, ctx.sampleRate), cd = clapBuf.getChannelData(0);
  for (let i = 0; i < clapLen; i++) cd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / clapLen, 2);
  const clap = (when, gain) => {
    // Une tribune entière : plusieurs claquements légèrement décalés.
    for (let k = 0; k < 6; k++) {
      const s = ctx.createBufferSource(); s.buffer = clapBuf; s.playbackRate.value = 0.85 + Math.random() * 0.3;
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400 + Math.random() * 600;
      const g = ctx.createGain(); g.gain.value = gain;
      s.connect(f).connect(g).connect(crowdBus); s.start(when + Math.random() * 0.025);
    }
  };
  const pattern = [0, 0.5, 1.0, 1.25, 1.5]; // clap · clap · clap-clap-clap
  let t0 = ctx.currentTime + 0.05; const end = t0 + seconds;
  const sched = () => {
    while (t0 < ctx.currentTime + 0.6 && t0 < end) {
      for (const o of pattern) clap(t0 + o, 0.12);
      t0 += 2;
    }
    if (t0 >= end) stopChant();
  };
  sched(); chantTimer = setInterval(sched, 200);
  startDrums(seconds);
}
// Chœur des tribunes : quelques milliers de voix (oscillateurs désaccordés + formant de voyelle « o »).
// mood 'ole' : « Olé, olé, olé, olé » quand l'équipe à domicile mène ; 'push' : encouragement montant.
let singNodes = [];
export function sing(mood = 'ole', seconds = 8) {
  if (!ctx || !enabled) return;
  stopSing();
  const mel = mood === 'ole'
    ? [[64, 0.45], [64, 0.45], [67, 0.45], [64, 0.9], [62, 0.45], [64, 0.45], [67, 0.45], [69, 0.9], [67, 0.45], [64, 1.1]]
    : [[57, 0.5], [60, 0.5], [62, 0.5], [64, 1.0], [62, 0.5], [60, 0.5], [57, 1.2]];
  const out = ctx.createGain(); out.gain.value = 0;
  const f1 = ctx.createBiquadFilter(); f1.type = 'bandpass'; f1.frequency.value = 520; f1.Q.value = 1.6;
  const f2 = ctx.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = 1400;
  out.connect(f1).connect(f2).connect(crowdBus);
  const t0 = ctx.currentTime + 0.05, end = t0 + seconds;
  out.gain.linearRampToValueAtTime(0.055, t0 + 0.6); out.gain.setValueAtTime(0.055, end - 0.8); out.gain.linearRampToValueAtTime(0, end);
  const voices = [];
  for (let v = 0; v < 6; v++) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.detune.value = (v - 2.5) * 9;
    const g = ctx.createGain(); g.gain.value = 0.16; o.connect(g).connect(out); o.start(t0); o.stop(end + 0.1); voices.push(o);
  }
  let t = t0, i = 0;
  while (t < end) {
    const [note, dur] = mel[i % mel.length]; const hz = 440 * Math.pow(2, (note - 12 - 69) / 12) * 2;
    for (const o of voices) o.frequency.setValueAtTime(hz, t);
    t += dur; i++;
  }
  singNodes = voices.concat([out]);
}
export function stopSing() { for (const n of singNodes) { try { n.stop ? n.stop() : n.disconnect(); } catch (e) {} } singNodes = []; }
export function stopChant() { if (chantTimer) clearInterval(chantTimer); chantTimer = null; }
export function click() { if (!ctx || !enabled) return; drum(ctx.currentTime, 900, 0.04, 0.1); }

// ---------- Voix (commentaire) ----------
let voiceOn = true, lastSpoke = 0;
let nativeTts = null;
try { if (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) nativeTts = window.Capacitor.registerPlugin('NativeTts'); } catch (e) { nativeTts = null; }
export function setVoice(on) { voiceOn = on; if (!on) { try { speechSynthesis.cancel(); } catch (e) {} } }
export function voiceAvailable() {
  if (nativeTts) return 'natif Android';
  if ('speechSynthesis' in window) return 'navigateur';
  return null;
}
export function speak(text, lang = 'fr', priority = false, opts = {}) {
  if (!voiceOn || !enabled) return;
  const now = performance.now();
  if (!priority && !opts.queue && now - lastSpoke < 3500) return;
  if (!opts.queue) lastSpoke = now;
  const base = String(lang).slice(0, 2);
  const tag = lang === 'ar_tv' ? 'ar-SA' : base === 'ar' ? 'ar-TN' : base === 'en' ? 'en-GB' : 'fr-FR';
  // Intonation : plus aiguë et rapide sur les buts, plus posée pour le consultant.
  const mood = opts.mood, tv = lang === 'ar_tv';
  const rate = mood === 'goal' ? (tv ? 1.22 : 1.16) : mood === 'high' ? 1.16 : mood === 'analyst' ? 0.98 : 1.1;
  const pitch = mood === 'goal' ? (tv ? 1.35 : 1.2) : mood === 'high' ? 1.12 : mood === 'analyst' ? 0.82 : 1;
  if (nativeTts) { nativeTts.speak({ text, lang: tag, rate, pitch, queue: !!opts.queue }).catch(() => {}); return; }
  if (!('speechSynthesis' in window)) return;
  try {
    if (priority && !opts.queue) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = tag; u.rate = rate; u.pitch = pitch; u.volume = volume * mix.comment;
    const vs = speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith(base));
    // Consultant : une deuxième voix si l'appareil en a plusieurs.
    const v = mood === 'analyst' && vs.length > 1 ? vs[1] : (vs.find(v => v.lang.toLowerCase() === tag.toLowerCase()) || vs[0]);
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (e) {}
}

// ---------------------------------------------------------------- packs de voix enregistrées (sous licence)
// Un pack = fichiers audio par événement (goal, save, miss, kickoff…). Proposé uniquement si sa licence est renseignée.
let voicePacks = [], activePack = null, clipBusyUntil = 0;
export async function loadVoicePacks() {
  try { const r = await fetch('voices/manifest.json', { cache: 'no-cache' }); const j = await r.json(); voicePacks = (j.packs || []).filter(p => p && p.id && p.licence && p.licence.holder && p.licence.contract && p.clips); } catch (e) { voicePacks = []; }
  return voicePacks;
}
export function getVoicePacks() { return voicePacks; }
export function setVoicePack(id) { activePack = voicePacks.find(p => p.id === id) || null; }
// Joue une réplique enregistrée pour l'événement ; renvoie false s'il n'y en a pas (le jeu utilise alors la synthèse vocale).
export function playCommentClip(key, priority = false) {
  if (!activePack || !voiceOn || !enabled) return false;
  const list = activePack.clips[key] || activePack.clips[String(key).split('_')[0]];
  if (!list || !list.length) return false;
  const now = performance.now(); if (!priority && now < clipBusyUntil) return true;
  try { const a = new Audio(`voices/${activePack.id}/${list[Math.floor(Math.random() * list.length)]}`); a.volume = volume * mix.comment; a.play().catch(() => {}); clipBusyUntil = now + 3200; return true; } catch (e) { return false; }
}
