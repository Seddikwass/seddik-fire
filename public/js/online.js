// Client du match en ligne : connexion WebSocket, salon, envoi des commandes et
// affichage fluide de l'état officiel calculé par le serveur.
import { applyNetSnapshot } from './match.js';
import * as A from './audio.js';

// Adresse du serveur de match : le site lui-même, ou le serveur Render dans l'application Android.
export function wsUrl(loc = window.location, apiBase = window.FT26_API) {
  if (apiBase) { const u = new URL(apiBase); return `${u.protocol === 'https:' ? 'wss' : 'ws'}://${u.host}/ws`; }
  return `${loc.protocol === 'https:' ? 'wss' : 'ws'}://${loc.host}/ws`;
}

export function connectOnline({ onMessage, onClose, url = wsUrl() } = {}) {
  const ws = new WebSocket(url);
  const queue = [];
  ws.onopen = () => { while (queue.length) ws.send(queue.shift()); };
  ws.onmessage = e => { try { onMessage?.(JSON.parse(e.data)); } catch (err) { /* message invalide */ } };
  ws.onclose = () => onClose?.();
  return {
    ws,
    send(obj) { const s = JSON.stringify(obj); if (ws.readyState === 1) ws.send(s); else if (ws.readyState === 0) queue.push(s); },
    close() { try { ws.close(); } catch (e) {} },
  };
}

// Relie un Match local (rendu seulement) au serveur : état lissé, sons, commandes.
export function linkMatch(m, conn) {
  let latest = null, prevScore = [0, 0], prevTicker = '', prevState = '', prevKick = new Map();
  const input = { jx: 0, jy: 0, sprint: false };
  let lastSent = 0;
  m.net = {
    push(snap) { latest = snap; },
    frame(dt) {
      if (!latest) return;
      // Lissage : on rejoint l'état officiel sans à-coups entre deux envois du serveur.
      applyNetSnapshot(m, latest, Math.min(1, dt * 14));
      // Sons et commentaire déduits de l'état reçu.
      if (latest.sc[0] !== prevScore[0] || latest.sc[1] !== prevScore[1]) {
        const team = latest.sc[0] > prevScore[0] ? 0 : 1;
        if (prevState) { A.netSound(); m.crowdReact('goal', team); }
        prevScore = latest.sc.slice();
      }
      if (latest.st !== prevState) { if (latest.st === 'halftime' || latest.st === 'fulltime') A.whistle(true); prevState = latest.st; }
      if (latest.tk && latest.tk !== prevTicker) { prevTicker = latest.tk; if (m.settings.voice) A.speak(latest.tk, m.settings.lang); }
      for (const T of m.teams) for (const p of T.ps) { const k = p.kickT || 0, was = prevKick.get(p) || 0; if (k > was + 0.1) A.kick(0.6); prevKick.set(p, k); }
      // Commandes envoyées au serveur 20 fois par seconde au plus, uniquement si elles changent.
      const now = performance.now();
      const changed = m.input.jx !== input.jx || m.input.jy !== input.jy || m.input.sprint !== input.sprint;
      if ((changed && now - lastSent > 50) || now - lastSent > 500) {
        input.jx = m.input.jx; input.jy = m.input.jy; input.sprint = m.input.sprint;
        conn.send({ t: 'in', jx: Math.round(input.jx * 100) / 100, jy: Math.round(input.jy * 100) / 100, sprint: input.sprint });
        lastSent = now;
      }
    },
  };
  // Les boutons envoient des actions au lieu d'agir localement.
  m.btnShootDown = () => { m.input.shooting = true; m.input.shootHold = 0; conn.send({ t: 'act', a: 'shootDown' }); };
  m.btnShootUp = () => { m.input.shooting = false; conn.send({ t: 'act', a: 'shootUp' }); };
  m.btnPass = through => conn.send({ t: 'act', a: through ? 'through' : 'pass' });
  m.switchPlayer = () => conn.send({ t: 'act', a: 'switch' });
  // Relâcher PROFONDEUR en défense arrête le pressing côté serveur.
  let pressLocal = false;
  Object.defineProperty(m.input, 'press', { configurable: true, get: () => pressLocal, set: v => { if (pressLocal && !v) conn.send({ t: 'act', a: 'pressUp' }); pressLocal = !!v; } });
  // Jauge de puissance locale pendant l'appui sur TIR.
  const step0 = m.net.frame;
  m.net.frame = dt => { if (m.input.shooting) m.input.shootHold = Math.min(1, (m.input.shootHold || 0) + dt * 1.25); step0(dt); };
  return m.net;
}
