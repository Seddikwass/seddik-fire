// Match en ligne : le serveur fait tourner la simulation officielle avec deux joueurs humains.
// Chaque joueur dirige son équipe ; si l'un se déconnecte, l'IA prend le relais.
import { Match } from './match.js';

export const blankInput = () => ({ jx: 0, jy: 0, sprint: false, shooting: false, shootHold: 0, press: false });

export class NetMatch extends Match {
  constructor(opts) {
    super({ ...opts, userSide: 0 });
    this.humans = [0, 1].map(side => ({ side, input: side === 0 ? this.input : blankInput(), selected: null, connected: true }));
    this.humans[0].selected = this.selected;
    // Le second joueur commence avec son avant-centre (comme le premier).
    const T1 = this.teams[1].ps;
    this.humans[1].selected = T1[T1.length - 1] || T1[1];
  }
  // Exécute une action dans le contexte d'un camp (joueur sélectionné, commandes, côté).
  withSide(side, fn) {
    const h = this.humans[side];
    const prev = { userSide: this.userSide, selected: this.selected, input: this.input };
    this.userSide = side; this.selected = h.selected; this.input = h.input;
    try { return fn(); }
    finally {
      h.selected = this.selected;
      this.userSide = prev.userSide; this.input = prev.input;
      this.selected = side === 0 ? h.selected : prev.selected;
    }
  }
  setInput(side, data = {}) {
    const inp = this.humans[side]?.input; if (!inp) return;
    const num = v => Math.max(-1, Math.min(1, Number(v) || 0));
    inp.jx = num(data.jx); inp.jy = num(data.jy); inp.sprint = !!data.sprint;
  }
  action(side, a) {
    const h = this.humans[side]; if (!h || !h.connected) return;
    if (String(a).startsWith('preset:')) { this.setTacticPreset(side, String(a).slice(7)); return; }
    this.withSide(side, () => {
      if (a === 'shootDown') this.btnShootDown();
      else if (a === 'shootUp') this.btnShootUp();
      else if (a === 'pass') this.btnPass(false);
      else if (a === 'through') this.btnPass(true);
      else if (a === 'pressUp') this.input.press = false;
      else if (a === 'switch') this.switchPlayer();
    });
  }
  setConnected(side, on) {
    const h = this.humans[side]; if (!h) return;
    h.connected = on;
    if (!on) Object.assign(h.input, blankInput());
  }
  step(dt) {
    const h0 = this.humans[0], h1 = this.humans[1];
    // Second joueur : ses commandes passent avant l'IA, qui ignore son joueur sélectionné.
    if (h1.connected && this.state === 'play') this.withSide(1, () => this.userControl(dt));
    // Premier joueur : contexte natif du moteur (ou IA complète s'il est déconnecté).
    this.userSide = h0.connected ? 0 : null;
    this.selected = h0.selected; this.input = h0.input;
    super.step(dt);
    h0.selected = this.selected;
    this.userSide = 0;
  }
}
