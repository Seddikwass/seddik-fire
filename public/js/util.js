// Utilitaires communs
export function rng(seed) { // mulberry32 — aléatoire reproductible
  let a = seed >>> 0;
  const f = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  f.int = (lo, hi) => lo + Math.floor(f() * (hi - lo + 1));
  f.pick = arr => arr[Math.floor(f() * arr.length)];
  f.norm = (m = 0, s = 1) => { let u = 0, v = 0; while (!u) u = f(); while (!v) v = f(); return m + s * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  f.state = () => a; f.setState = s => { a = s >>> 0; };
  return f;
}
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const fmtMoney = n => {
  const s = Math.round(n).toLocaleString('fr-FR').replace(/ | /g, ' ');
  return '\u2066' + s + ' DT\u2069'; // isolat bidi : lisible en arabe (RTL)
};
export const fmtShort = n => {
  const a = Math.abs(n), sg = n < 0 ? '-' : '';
  const w = x => '\u2066' + x + '\u2069';
  if (a >= 1e6) return w(sg + (a / 1e6).toFixed(a >= 1e7 ? 1 : 2).replace('.', ',') + ' M DT');
  if (a >= 1e3) return w(sg + Math.round(a / 1e3) + ' k DT');
  return w(sg + Math.round(a) + ' DT');
};
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const uid = (p = 'id') => p + '_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
export function poisson(lambda, r) { const L = Math.exp(-lambda); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; }
export const deepCopy = o => JSON.parse(JSON.stringify(o));

// Écusson original généré (SVG) à partir des couleurs et du sigle
export function crestSVG(club, size = 40) {
  const [c1, c2] = club.colors || ['#888', '#fff'];
  const txt = (club.short || '?').slice(0, 4);
  const fs = txt.length > 3 ? 9 : 11;
  const h = (club.id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const style = h % 3;
  const pattern = style === 0
    ? `<path d="M20 4 L20 44" stroke="${c2}" stroke-width="7"/>`
    : style === 1 ? `<path d="M3 18 L37 18 L37 26 L3 26Z" fill="${c2}"/>` : `<path d="M3 5 L37 40" stroke="${c2}" stroke-width="7"/>`;
  return `<svg class="crest" width="${size}" height="${size * 1.15}" viewBox="0 0 40 46" aria-label="${txt}"><defs><clipPath id="cl${club.id}"><path d="M3 3 H37 V24 C37 35 28 41 20 44 C12 41 3 35 3 24Z"/></clipPath></defs><g clip-path="url(#cl${club.id})"><rect width="40" height="46" fill="${c1}"/>${pattern}</g><path d="M3 3 H37 V24 C37 35 28 41 20 44 C12 41 3 35 3 24Z" fill="none" stroke="#0007" stroke-width="2"/><rect x="7" y="13" width="26" height="13" rx="3" fill="#0009"/><text x="20" y="23.5" text-anchor="middle" font-family="Arial,sans-serif" font-weight="800" font-size="${fs}" fill="#fff">${esc(txt)}</text></svg>`;
}
