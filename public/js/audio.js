// Audio 100 % synthétisé (Web Audio) : ambiance de stade, sifflet, frappes, darbouka originale.
// Aucune musique ni enregistrement protégé. Voix : synthèse vocale du navigateur ou moteur natif Android.
let ctx = null, master = null, crowdGain = null, crowdFilter = null, crowdLowFilter = null, crowdHighFilter = null, drumTimer = null;
let enabled = true, volume = 0.8, excitement = 0.2;

export function audioInit() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = enabled ? volume : 0; master.connect(ctx.destination);
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
  crowdGain.connect(master);
  src.start();
}
export function setAudio(on, vol) { enabled = on; if (vol != null) volume = vol; if (master) master.gain.value = enabled ? volume : 0; }
export function audioSuspend() { if (ctx && ctx.state === 'running') ctx.suspend(); stopDrums(); stopChant(); }
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
  const g = ctx.createGain(); g.gain.value = gain; s.connect(f).connect(g).connect(master); s.start();
}
export function kick(power = 0.5) { noiseBurst(0.09, 380 + power * 400, 0.5 + power * 0.6); }
export function whistle(long = false) {
  if (!ctx || !enabled) return;
  const t = ctx.currentTime, o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain();
  o.frequency.value = 2900; lfo.frequency.value = 38; lg.gain.value = 120; lfo.connect(lg).connect(o.frequency);
  const d = long ? 0.9 : 0.35;
  g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.18, t + 0.02); g.gain.setValueAtTime(0.18, t + d - 0.05); g.gain.linearRampToValueAtTime(0, t + d);
  o.connect(g).connect(master); o.start(t); lfo.start(t); o.stop(t + d); lfo.stop(t + d);
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
  o.connect(g).connect(master); o.start(t); o.stop(t + 0.19);
}
export function impact(power = 0.5) {
  noiseBurst(0.07 + power * 0.05, 520 + power * 420, 0.22 + power * 0.25, 'lowpass');
}
function drum(t, freq, dec, g0) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.5, t + dec);
  g.gain.setValueAtTime(g0, t); g.gain.exponentialRampToValueAtTime(0.001, t + dec);
  o.connect(g).connect(master); o.start(t); o.stop(t + dec);
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
  src.connect(f).connect(g).connect(master); src.start(t); src.stop(t + dur);
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
  src.connect(f).connect(g).connect(master); src.start(t); src.stop(t + dur);
  if (crowdGain) { crowdGain.gain.cancelScheduledValues(t); crowdGain.gain.setValueAtTime(crowdGain.gain.value, t); crowdGain.gain.linearRampToValueAtTime(0.06, t + 1.2); }
}
// Applaudissements : claquements courts répartis aléatoirement.
export function applause(seconds = 2, density = 45) {
  if (!ctx || !enabled) return;
  const t0 = ctx.currentTime, n = Math.floor(seconds * density);
  const len = Math.floor(ctx.sampleRate * 0.03), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const bus = ctx.createBiquadFilter(); bus.type = 'bandpass'; bus.frequency.value = 1800; bus.Q.value = 0.7;
  const g = ctx.createGain(); g.gain.value = 0.32; bus.connect(g).connect(master);
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
  g.connect(master);
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
      s.connect(f).connect(g).connect(master); s.start(when + Math.random() * 0.025);
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
export function speak(text, lang = 'fr', priority = false) {
  if (!voiceOn || !enabled) return;
  const now = performance.now();
  if (!priority && now - lastSpoke < 3500) return;
  lastSpoke = now;
  const tag = lang === 'ar' ? 'ar-TN' : lang === 'en' ? 'en-GB' : 'fr-FR';
  if (nativeTts) { nativeTts.speak({ text, lang: tag, rate: 1.1 }).catch(() => {}); return; }
  if (!('speechSynthesis' in window)) return;
  try {
    if (priority) speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.lang = tag; u.rate = 1.12; u.volume = volume;
    const v = speechSynthesis.getVoices().find(v => v.lang && v.lang.toLowerCase().startsWith(lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch (e) {}
}
