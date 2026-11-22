// Sauvegarde locale (hors ligne) + synchronisation serveur prudente (comptes optionnels)
const KEY = 'ft26_career', KEY_SET = 'ft26_settings', KEY_AUTH = 'ft26_auth', KEY_PENDING = 'ft26_pending_sync';
export const API = (window.FT26_API || '') + '/api';

export function loadSettings() {
  const def = { lang: 'fr', sound: true, volume: 0.8, voice: true, commentary: 'auto', duration: 5, difficulty: 1, assist: true, quality: 'high', camera: 'near', fps: 60, replays: true, ceremony: true, weather: 'auto', realNames: true, leftHanded: false, btnScale: 1, adsConsent: null };
  try { return Object.assign(def, JSON.parse(localStorage.getItem(KEY_SET) || '{}')); } catch (e) { return def; }
}
export function saveSettings(s) { try { localStorage.setItem(KEY_SET, JSON.stringify(s)); } catch (e) {} }

export function loadLocal() {
  try { const t = localStorage.getItem(KEY); return t ? JSON.parse(t) : null; } catch (e) { console.warn('Lecture sauvegarde impossible', e); return null; }
}
export function saveLocal(st) {
  try { localStorage.setItem(KEY, JSON.stringify(st)); return true; }
  catch (e) { console.error('Sauvegarde locale impossible', e); return false; }
}
export function clearLocal() { localStorage.removeItem(KEY); }
export function auth() { try { return JSON.parse(localStorage.getItem(KEY_AUTH) || 'null'); } catch (e) { return null; } }
function setAuth(a) { if (a) localStorage.setItem(KEY_AUTH, JSON.stringify(a)); else localStorage.removeItem(KEY_AUTH); }

async function call(path, opts = {}) {
  const a = auth();
  const headers = { 'Content-Type': 'application/json' };
  if (a && a.token) headers.Authorization = 'Bearer ' + a.token;
  const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), opts.timeout || 15000);
  try {
    const res = await fetch(API + path, { method: opts.method || 'GET', headers, body: opts.body ? JSON.stringify(opts.body) : undefined, signal: ctl.signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const err = new Error(data.error || `Erreur serveur (${res.status})`); err.status = res.status; err.data = data; throw err; }
    return data;
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('Le serveur ne répond pas (réseau lent ou serveur en veille). Réessayez dans un instant.');
    if (e instanceof TypeError) throw new Error('Pas de connexion au serveur. Vous pouvez continuer à jouer hors ligne.');
    throw e;
  } finally { clearTimeout(to); }
}
export async function health() { return call('/health', { timeout: 60000 }); }
export async function register(username, password) { const d = await call('/auth/register', { method: 'POST', body: { username, password } }); setAuth({ token: d.token, username: d.username }); void syncPending(); return d; }
export async function login(username, password) { const d = await call('/auth/login', { method: 'POST', body: { username, password } }); setAuth({ token: d.token, username: d.username }); void syncPending(); return d; }
export function logout() { setAuth(null); }
export async function fetchRemote() { return call('/save'); }
export async function pushRemote(st, force = false) {
  const body = { data: st, updatedAt: st.updatedAt, baseRevision: st._rev ?? null, force };
  const d = await call('/save', { method: 'PUT', body, timeout: 30000 });
  st._rev = d.revision;
  localStorage.removeItem(KEY_PENDING);
  return d;
}
export function markPending() { localStorage.setItem(KEY_PENDING, '1'); }
export const hasPending = () => !!localStorage.getItem(KEY_PENDING);
export async function fetchDataOverrides() { try { return await call('/data', { timeout: 8000 }); } catch (e) { return null; } }

let timer = null;
// sauvegarde automatique : locale immédiate, serveur différé (si connecté)
export function autosave(st, onStatus) {
  st.updatedAt = Date.now();
  const ok = saveLocal(st);
  if (!auth()) { onStatus && onStatus(ok ? 'local' : 'erreur'); return; }
  markPending();
  clearTimeout(timer);
  timer = setTimeout(async () => {
    if (!navigator.onLine) { onStatus && onStatus('hors ligne — en attente'); return; }
    try { await pushRemote(st); saveLocal(st); onStatus && onStatus('synchronisé'); }
    catch (e) { onStatus && onStatus(e.status === 409 ? 'conflit' : 'en attente'); if (e.status === 409) window.dispatchEvent(new CustomEvent('ft26-conflict', { detail: e.data })); }
  }, 2500);
}


// Reprise automatique des sauvegardes locales mises en attente hors ligne.
let pendingSync = null;
export async function syncPending() {
  if (pendingSync) return pendingSync;
  if (!auth() || !hasPending() || !navigator.onLine) return false;
  const snapshot = loadLocal();
  if (!snapshot) return false;
  pendingSync = (async () => {
    try {
      await pushRemote(snapshot);
      saveLocal(snapshot);
      window.dispatchEvent(new CustomEvent('ft26-sync', { detail: { status: 'synchronisé' } }));
      return true;
    } catch (e) {
      if (e.status === 409) window.dispatchEvent(new CustomEvent('ft26-conflict', { detail: e.data }));
      return false;
    } finally { pendingSync = null; }
  })();
  return pendingSync;
}
if (typeof window !== 'undefined') {
  // Reprendre aussi les sauvegardes en attente dès le premier chargement, pas seulement au retour réseau.
  if (navigator.onLine) Promise.resolve().then(() => syncPending());
  window.addEventListener('online', () => { syncPending(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') syncPending();
  });
}
