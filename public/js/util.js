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

// Maillot en SVG (motif réel : rayures, cerceaux, damier, bande, écharpe…), pour les écrans d'avant-match.
let jerseySeq = 0;
export function jerseySVG(kit = {}, size = 64, num = '') {
  const id = 'js' + (++jerseySeq), s = kit.shirt || '#888', a = kit.alt || kit.trim || '#fff', tr = kit.trim || a, sl = kit.sleeves || (kit.pattern === 'hoops' ? a : s);
  const body = 'M16 6 L24 3 Q32 8 40 3 L48 6 L60 16 L53 26 L48 22 L48 58 L16 58 L16 22 L11 26 L4 16 Z';
  let pat = '';
  const p = kit.pattern;
  if (p === 'stripes') { const n = Math.min(6, Math.max(4, Math.round((kit.stripes || 10) / 3))), w = 32 / (n * 2); for (let i = 0; i < n; i++) pat += `<rect x="${16 + (i * 2 + 1) * w}" y="0" width="${w}" height="64" fill="${a}"/>`; }
  else if (p === 'hoops') { for (let i = 0; i < 4; i++) pat += `<rect x="0" y="${12 + i * 12}" width="64" height="6" fill="${a}"/>`; }
  else if (p === 'checkers') { for (let i = 0; i < 8; i++) for (let j = 0; j < 9; j++) if ((i + j) % 2) pat += `<rect x="${i * 8}" y="${j * 7}" width="8" height="7" fill="${a}"/>`; }
  else if (p === 'chestBand') pat = `<rect x="0" y="20" width="64" height="9" fill="${a}"/>`;
  else if (p === 'centerStripe') pat = `<rect x="27" y="0" width="10" height="64" fill="${a}"/>`;
  else if (p === 'sash') pat = `<path d="M10 4 L22 4 L54 60 L42 60Z" fill="${a}"/><path d="M22 4 L26 4 L58 60 L54 60Z" fill="${kit.alt2 || tr}"/>`;
  const sleeves = `<path d="M16 6 L4 16 L11 26 L16 22Z M48 6 L60 16 L53 26 L48 22Z" fill="${sl}"/>`;
  const numTxt = num ? `<text x="32" y="46" text-anchor="middle" font-family="Arial,sans-serif" font-weight="900" font-size="15" fill="${p && p !== 'plain' ? '#fff' : tr}" stroke="#0006" stroke-width="0.6">${esc(String(num))}</text>` : '';
  return `<svg class="jersey" width="${size}" height="${size}" viewBox="0 0 64 64"><defs><clipPath id="${id}"><path d="${body}"/></clipPath><linearGradient id="${id}g" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".18"/><stop offset=".45" stop-color="#fff" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient></defs><g clip-path="url(#${id})"><rect width="64" height="64" fill="${s}"/>${pat}${sleeves}<path d="M24 3 Q32 10 40 3 L40 6 Q32 13 24 6Z" fill="${tr}"/><rect width="64" height="64" fill="url(#${id}g)"/></g><path d="${body}" fill="none" stroke="#0008" stroke-width="1.4"/>${numTxt}</svg>`;
}
