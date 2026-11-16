// Audio 100 % synthétisé (Web Audio) : ambiance de stade, sifflet, frappes, darbouka originale.
// Aucune musique ni enregistrement protégé. Voix : synthèse vocale du navigateur ou moteur natif Android.
let ctx = null, master = null, crowdGain = null, crowdFilter = null, drumTimer = null;
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
  crowdFilter = ctx.createBiquadFilter(); crowdFilter.type = 'bandpass'; crowdFilter.frequency.value = 700; crowdFilter.Q.value = 0.6;
  crowdGain = ctx.createGain(); crowdGain.gain.value = 0;
  src.connect(crowdFilter).connect(crowdGain).connect(master); src.start();
}
export function setAudio(on, vol) { enabled = on; if (vol != null) volume = vol; if (master) master.gain.value = enabled ? volume : 0; }
export function audioSuspend() { if (ctx && ctx.state === 'running') ctx.suspend(); stopDrums(); }
export function audioResume() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

export function crowd(level) { // 0..1
  excitement = level;
  if (!crowdGain) return;
  crowdGain.gain.setTargetAtTime(0.10 + level * 0.45, ctx.currentTime, 0.4);
  crowdFilter.frequency.setTargetAtTime(500 + level * 900, ctx.currentTime, 0.4);
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
  crowdFilter.frequency.setValueAtTime(1500, t);
  noiseBurst(1.6, 2200, 0.6, 'bandpass');
  startDrums(8);
}
export function netSound() { noiseBurst(0.25, 900, 0.4, 'highpass'); }
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
