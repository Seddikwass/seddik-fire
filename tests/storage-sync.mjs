// Vérifie qu'une sauvegarde locale en attente repart automatiquement après connexion.
import assert from 'node:assert/strict';
const data = new Map();
globalThis.localStorage = {
  getItem: k => data.has(k) ? data.get(k) : null,
  setItem: (k,v) => data.set(k,String(v)),
  removeItem: k => data.delete(k),
};
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
globalThis.document = { addEventListener() {}, visibilityState: 'visible' };
globalThis.CustomEvent = class { constructor(type, init={}) { this.type=type; this.detail=init.detail; } };
globalThis.window = { FT26_API:'', addEventListener() {}, dispatchEvent() {} };
const calls = [];
globalThis.fetch = async (url, opts={}) => {
  calls.push({url,method:opts.method||'GET'});
  if (url.endsWith('/api/auth/login')) return new Response(JSON.stringify({token:'test-token',username:'joueur'}),{status:200});
  if (url.endsWith('/api/save')) return new Response(JSON.stringify({revision:1}),{status:200});
  throw new Error('URL inattendue '+url);
};
const S = await import('../public/js/storage.js?storage-sync-test');
S.saveLocal({season:2026,clubs:{},players:{},updatedAt:Date.now()});
S.markPending();
await S.login('joueur','motdepasse');
await new Promise(resolve => setImmediate(resolve));
assert.ok(calls.some(x=>x.url.endsWith('/api/save') && x.method==='PUT'),'la sauvegarde doit être envoyée après connexion');
assert.equal(S.hasPending(),false,'le marqueur pending doit être retiré après synchronisation');
assert.equal(S.loadLocal()._rev,1,'la révision serveur doit être enregistrée localement');
console.log('synchronisation après connexion OK');
