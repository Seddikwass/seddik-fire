// SEDDIK LEAGUE — WebGL 3D match renderer (no external runtime dependencies).
// The match simulation remains deterministic and shared with the 2D fallback.
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo));
const mix = (a, b, t) => a + (b - a) * t;
const norm3 = v => {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
};
const sub3 = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross3 = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot3 = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export function get3DQualityProfile(quality = 'high') {
  if (quality === 'low') return { pixelRatio: 1, crowd: 96, sphereSegments: 7, detail: 0, seatRows: 2, turfDetail: 28, crowdMotion: 0 };
  if (quality === 'medium') return { pixelRatio: 1.3, crowd: 260, sphereSegments: 9, detail: 1, seatRows: 3, turfDetail: 92, crowdMotion: 16 };
  return { pixelRatio: 1.55, crowd: 620, sphereSegments: 12, detail: 2, seatRows: 5, turfDetail: 224, crowdMotion: 36 };
}

export function get3DBallShadowProfile(height = 0) {
  const h = clamp(height, 0, 12);
  const spread = 1 + h * 0.075;
  return {
    radiusX: 0.27 * spread,
    radiusZ: 0.16 * spread,
    opacity: clamp(0.72 / (1 + h * 0.28), 0.16, 0.72),
  };
}

export function get3DCrowdMotionPose(clockSeconds = 0, index = 0, intensity = 1) {
  const time = Number.isFinite(clockSeconds) ? clockSeconds : 0;
  const seed = Number.isFinite(index) ? index : 0;
  const energy = clamp(intensity, 0, 1.5);
  const phase = time * 3.6 + seed * 1.73;
  const wave = Math.sin(phase);
  return {
    armLift: clamp((0.42 + wave * 0.34) * energy, 0.12, 0.88),
    armSwing: Math.sin(phase * 0.72 + 0.8) * 0.12 * energy,
    sway: Math.sin(phase * 0.5 + 1.1) * 0.055 * energy,
  };
}

// Placement des arbitres (visuel) : diagonale de l'arbitre central à distance du ballon,
// juges de ligne alignés sur l'avant-dernier défenseur de leur moitié de terrain.
export function getOfficialTargets(match = {}) {
  const ball = match.ball || {}, bx = Number(ball.x) || 0, by = Number(ball.y) || 0;
  const HLm = 52.5, HWm = 34;
  const side = bx >= 0 ? 1 : -1;
  const ref = { x: clamp(bx - side * 9, -40, 40), y: clamp(by + (by > 0 ? -11 : 11), -24, 24) };
  const line = (half) => {
    let defLine = 0;
    for (const T of match.teams || []) {
      const ownGoal = -(T.dir || 1) * HLm;
      if (Math.sign(ownGoal) !== half) continue;
      const xs = (T.ps || []).filter(p => !p.sentOff).map(p => p.x * half).sort((a, b) => b - a);
      defLine = Math.max(0, xs[1] ?? 0, bx * half);
    }
    return clamp(defLine, 0, HLm - 1) * half;
  };
  return { ref, ar1: { x: line(1), y: -HWm - 0.8 }, ar2: { x: line(-1), y: HWm + 0.7 } };
}
export function getPlayer3DPose(player = {}, frame = null) {
  const p = frame || [];
  const x = Number.isFinite(p[0]) ? p[0] : (Number.isFinite(player.x) ? player.x : 0);
  const y = Number.isFinite(p[1]) ? p[1] : (Number.isFinite(player.y) ? player.y : 0);
  const vx = Number.isFinite(p[4]) ? p[4] : (Number.isFinite(player.vx) ? player.vx : 0);
  const vy = Number.isFinite(p[5]) ? p[5] : (Number.isFinite(player.vy) ? player.vy : 0);
  const speed = Math.hypot(vx, vy);
  const acceleration = clamp(Number.isFinite(p[28]) ? p[28] :
    (Number.isFinite(player.motionAccel) ? player.motionAccel : 0), -1, 1);
  const heading = Number.isFinite(p[26]) ? p[26] :
    (Number.isFinite(player.heading) ? player.heading : Math.atan2(vy, vx || player.face || 1));
  const anim = Number.isFinite(p[3]) ? p[3] : (Number.isFinite(player.anim) ? player.anim : 0);
  const slide = Number.isFinite(p[8]) ? p[8] : (Number.isFinite(player.slideT) ? player.slideT : 0);
  const dive = Number.isFinite(p[7]) ? p[7] : (Number.isFinite(player.diveT) ? player.diveT : 0);
  const jump = Number.isFinite(p[6]) ? p[6] : (Number.isFinite(player.jumpT) ? player.jumpT : 0);
  const kick = Number.isFinite(p[9]) ? p[9] : (Number.isFinite(player.kickT) ? player.kickT : 0);
  const header = Number.isFinite(p[10]) ? p[10] : (Number.isFinite(player.headerT) ? player.headerT : 0);
  const firstTouch = Number.isFinite(p[11]) ? p[11] : (Number.isFinite(player.firstTouchT) ? player.firstTouchT : 0);
  const stumble = Number.isFinite(p[12]) ? p[12] : (Number.isFinite(player.stumbleT) ? player.stumbleT : 0);
  const keeperCatch = Number.isFinite(p[13]) ? p[13] : (Number.isFinite(player.keeperCatchT) ? player.keeperCatchT : 0);
  const keeperPunch = Number.isFinite(p[14]) ? p[14] : (Number.isFinite(player.keeperPunchT) ? player.keeperPunchT : 0);
  const headerDir = Number.isFinite(p[15]) ? p[15] : player.headerDir;
  const diveDir = Number.isFinite(p[16]) ? p[16] : player.diveDir;
  const slideDir = Number.isFinite(p[17]) ? p[17] : player.slideDir;
  const kickDir = Number.isFinite(p[18]) ? p[18] : player.kickDir;
  const firstTouchDir = Number.isFinite(p[19]) ? p[19] : player.firstTouchDir;
  const stumbleDir = Number.isFinite(p[20]) ? p[20] : player.stumbleDir;
  const diveHeight = Number.isFinite(p[21]) ? p[21] : player.diveHeight;
  const diveStretch = Number.isFinite(p[22]) ? p[22] : player.diveStretch;
  const kickFootSide = Number.isFinite(p[27]) ? p[27] : player.kickFootSide;
  const contact = Number.isFinite(p[23]) ? p[23] : (Number.isFinite(player.contactT) ? player.contactT : 0);
  const contactDir = Number.isFinite(p[24]) ? p[24] : player.contactDir;
  const slideDuration = Number.isFinite(p[25]) && p[25] > 0 ? p[25] : (player.slideDuration || 0.38);
  const celebrate = Number.isFinite(player.celebrateT) ? player.celebrateT : 0;
  return {
    x, y, vx, vy, speed, heading, phase: anim * 1.12,
    // Déplacement arrière (> 0,5 = recul face au jeu) : la foulée s'inverse au lieu de « patiner ».
    backpedal: speed > 0.3 ? clamp(-(vx * Math.cos(heading) + vy * Math.sin(heading)) / speed, 0, 1) : 0,
    kickProgress: 1 - clamp(kick / 0.34, 0, 1),
    headerProgress: 1 - clamp(header / 0.44, 0, 1),
    firstTouchProgress: 1 - clamp(firstTouch / 0.32, 0, 1),
    slideProgress: 1 - clamp(slide / Math.max(0.12, slideDuration), 0, 1),
    kickStyle: player.kickStyle || 'pass',
    kickPower: clamp(Number(player.kickPower) || 0.5, 0, 1),
    kickFootSide: kickFootSide === -1 ? -1 : 1,
    lean: clamp(speed * 0.022, 0, 0.19),
    acceleration,
    accelerationLean: clamp(acceleration * 0.085, -0.075, 0.085),
    driveBurst: clamp(acceleration / 0.78, 0, 1),
    brakeBrace: clamp(-acceleration / 0.78, 0, 1),
    turnLean: clamp(-(Number.isFinite(player.turn) ? player.turn : 0) * speed * 0.022, -0.16, 0.16),
    bodyBob: speed > 0.18
      ? Math.abs(Math.sin(anim * 2.24)) * clamp(speed / 9, 0, 1) * (0.045 + Math.max(0, acceleration) * 0.01)
      : 0,
    sprint: clamp((speed - 6.2) / 3.8, 0, 1),
    slide: clamp(slide / Math.max(0.12, slideDuration), 0, 1),
    dive: clamp(dive / 0.52, 0, 1),
    jump: clamp(jump * 2.1, 0, 0.36),
    kick: clamp(kick / 0.34, 0, 1),
    header: clamp(header / 0.44, 0, 1),
    firstTouch: clamp(firstTouch / 0.32, 0, 1),
    stumble: clamp(stumble / 0.24, 0, 1),
    keeperCatch: clamp(keeperCatch / 0.48, 0, 1),
    keeperPunch: clamp(keeperPunch / 0.42, 0, 1),
    contact: clamp(contact / 0.22, 0, 1),
    celebrate: clamp(celebrate / 2.2, 0, 1),
    acroKind: (Number.isFinite(p[32]) ? p[32] : (player.acroKind === 'bicycle' ? 2 : player.acroKind === 'volley' ? 1 : 0)),
    acroT: Number.isFinite(p[31]) ? p[31] : (Number(player.acroT) || 0),
    skill: clamp((Number.isFinite(p[29]) ? p[29] : (Number(player.skillT) || 0)) / 0.42, 0, 1),
    skillDir: (Number.isFinite(p[30]) ? p[30] : player.skillDir) < 0 ? -1 : 1,
    idle: clamp(1 - speed / 1.2, 0, 1),
    celebrateHop: celebrate > 0 ? Math.abs(Math.sin(celebrate * 7.5)) * clamp(celebrate / 0.6, 0, 1) * 0.16 : 0,
    diveDir: diveDir || 1,
    slideDir: slideDir || 1,
    kickDir: kickDir || 1,
    headerDir: headerDir || 1,
    firstTouchDir: firstTouchDir || 1,
    stumbleDir: stumbleDir || 1,
    contactDir: contactDir || 1,
    diveHeight: clamp(Number.isFinite(diveHeight) ? diveHeight : 0, -1, 1),
    diveStretch: clamp(Number.isFinite(diveStretch) ? diveStretch : 0, 0, 1),
  };
}

export function getPlayer3DActionWeights(pose = {}) {
  const slide = clamp(pose.slide || 0, 0, 1);
  const dive = clamp(pose.dive || 0, 0, 1);
  const kick = clamp(pose.kick || 0, 0, 1);
  const firstTouch = clamp(pose.firstTouch || 0, 0, 1);
  const header = clamp(pose.header || 0, 0, 1);
  const stumble = clamp(pose.stumble || 0, 0, 1);
  const contact = clamp(pose.contact || 0, 0, 1);
  const keeperCatch = clamp(pose.keeperCatch || 0, 0, 1);
  const keeperPunch = clamp(pose.keeperPunch || 0, 0, 1);
  const diveStretch = clamp(pose.diveStretch || 0, 0, 1);
  const driveBurst = clamp(pose.driveBurst || 0, 0, 1);
  const brakeBrace = clamp(pose.brakeBrace || 0, 0, 1);
  const kickProgress = clamp(Number.isFinite(pose.kickProgress) ? pose.kickProgress : 1 - kick, 0, 1);
  const headerProgress = clamp(Number.isFinite(pose.headerProgress) ? pose.headerProgress : 1 - header, 0, 1);
  const touchProgress = clamp(Number.isFinite(pose.firstTouchProgress) ? pose.firstTouchProgress : 1 - firstTouch, 0, 1);
  const slideProgress = clamp(Number.isFinite(pose.slideProgress) ? pose.slideProgress : 1 - slide, 0, 1);
  const diveProgress = clamp(1 - dive, 0, 1);
  const activeDive = dive > 0.015;
  const diveFlight = activeDive ? Math.sin(diveProgress * Math.PI) : 0;
  const diveLaunch = activeDive ? clamp(1 - diveProgress / 0.28, 0, 1) : 0;
  const diveLanding = activeDive ? clamp((diveProgress - 0.68) / 0.32, 0, 1) : 0;
  const slideLunge = Math.sin(slideProgress * Math.PI);
  // Hors d'un tacle actif, aucune extension parasite ne doit rester dans la foulée.
  const activeSlide = slide > 0.015;
  const tackleReach = activeSlide
    ? Math.sin(clamp(slideProgress / 0.68, 0, 1) * Math.PI / 2) * (1 - slideProgress * 0.22)
    : 0;
  const tackleRecovery = activeSlide ? clamp((slideProgress - 0.58) / 0.42, 0, 1) : 0;
  const diveReach = clamp(dive * (0.34 + diveStretch * 0.66), 0, 1);
  const keeperLeadReach = clamp(Math.max(keeperCatch * 0.72, diveReach * (0.64 + diveFlight * 0.36)), 0, 1);
  const keeperBalanceReach = clamp(Math.max(keeperPunch * 0.58, diveReach * (0.28 + diveLanding * 0.38)), 0, 1);
  return {
    gait: clamp(1 - Math.max(slideLunge, dive * 0.92, stumble * 0.28), 0, 1),
    driveBurst,
    brakeBrace,
    diveReach,
    diveFlight,
    diveLaunch,
    diveLanding,
    keeperLeadReach,
    keeperBalanceReach,
    catchReach: clamp(Math.max(keeperCatch, dive * 0.78), 0, 1),
    punchReach: clamp(Math.max(keeperPunch, dive * 0.54), 0, 1),
    kickPulse: clamp(Math.sin(kickProgress * Math.PI), 0, 1),
    kickWindup: clamp((kick - 0.58) / 0.42, 0, 1),
    // Suivi de frappe : monte après le contact puis retombe à zéro — jamais de jambe tendue au repos.
    kickFollowThrough: kick > 0.005 ? clamp((0.78 - kick) / 0.4, 0, 1) * clamp(kick / 0.16, 0, 1) : 0,
    firstTouchPulse: clamp(Math.sin(touchProgress * Math.PI), 0, 1),
    firstTouchAbsorb: clamp(Math.sin(touchProgress * Math.PI) * (1 - touchProgress * 0.24), 0, 1),
    headerDrive: clamp(Math.sin(headerProgress * Math.PI), 0, 1),
    headerBrace: clamp(1 - Math.abs(headerProgress - 0.32) / 0.5, 0, 1) * header,
    slideLunge: clamp(slideLunge, 0, 1),
    tackleReach: clamp(tackleReach, 0, 1),
    tackleRecovery,
    tackleArmSpread: clamp(tackleReach * (0.58 + tackleRecovery * 0.42), 0, 1),
    brace: clamp(Math.max(contact, stumble * 0.82, header * 0.45), 0, 1),
    stumble,
  };
}

function perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2), nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0,
  ]);
}
function lookAt(eye, center, up) {
  const z = norm3(sub3(eye, center));
  const x = norm3(cross3(up, z));
  const y = cross3(z, x);
  return new Float32Array([
    x[0], y[0], z[0], 0,
    x[1], y[1], z[1], 0,
    x[2], y[2], z[2], 0,
    -dot3(x, eye), -dot3(y, eye), -dot3(z, eye), 1,
  ]);
}
function multiply4(a, b) {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
    out[c * 4 + r] =
      a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] +
      a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  }
  return out;
}

// Caméra 3D de diffusion plus proche : elle exploite le suivi progressif du moteur
// et resserre le cadre sans perdre les lignes du terrain en format paysage.
export function get3DCameraPose(match = {}, replay = null, aspect = 16 / 9) {
  const cam = match.cam || {};
  const tvCam = typeof match.getTvCamera === 'function' ? match.getTvCamera() : null;
  if (tvCam) {
    const c = tvCam, safe = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
    return { eye: c.eye, target: c.target, zoom: 1, aspect: safe, ballHeight: 0, focusLift: 0, portrait: 0, fovy: safe < 1.15 ? c.fovy * 1.35 : c.fovy, angle: 'ceremony',
      distance: Math.hypot(c.eye[0] - c.target[0], c.eye[1] - c.target[1], c.eye[2] - c.target[2]) };
  }
  const plan = replay && match.replay?.segs ? match.replay : null;
  const angle = plan ? plan.segs[plan.seg]?.angle : null;
  const segCam = plan ? plan.segs[plan.seg] : null;
  if (segCam && Array.isArray(segCam.eye) && Array.isArray(segCam.target)) {
    const safe = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
    return { eye: segCam.eye, target: segCam.target, zoom: 1, aspect: safe, ballHeight: 0, focusLift: 0, portrait: 0, fovy: segCam.fovy || 0.5, angle: 'custom',
      distance: Math.hypot(segCam.eye[0] - segCam.target[0], segCam.eye[1] - segCam.target[1], segCam.eye[2] - segCam.target[2]) };
  }
  if (angle === 'goal' || angle === 'close') {
    const b = Array.isArray(replay.b) ? replay.b : [0, 0, 0];
    const bx = Number.isFinite(b[0]) ? b[0] : 0, by = Number.isFinite(b[1]) ? b[1] : 0, bz = clamp(Number.isFinite(b[2]) ? b[2] : 0, 0, 10);
    const gs = plan.goalSide >= 0 ? 1 : -1;
    const safe = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
    let eye, target, fovy;
    if (angle === 'goal') {
      // Caméra en hauteur derrière le filet, qui regarde l'action arriver.
      eye = [gs * 56, 5.6, clamp(-by * 0.35, -10, 10)];
      target = [clamp(bx, -50, 50) - gs * 4, 0.9 + bz * 0.4, -by * 0.85];
      fovy = safe < 1.15 ? 0.85 : 0.62;
    } else {
      // Caméra au bord du terrain, basse, qui accompagne le ballon.
      const t = (plan.i - plan.segs[plan.seg].from) * 0.012;
      eye = [bx - gs * (8 - t * 2), 3.1, -by + 10.5 + Math.sin(t) * 1.5];
      target = [bx + gs * 1.5, 1.0 + bz * 0.5, -by];
      fovy = safe < 1.15 ? 0.95 : 0.72;
    }
    return { eye, target, zoom: 1, aspect: safe, ballHeight: bz, focusLift: 0, portrait: 0, fovy, angle,
      distance: Math.hypot(eye[0] - target[0], eye[1] - target[1], eye[2] - target[2]) };
  }
  const zoom = replay ? 1.02 : clamp(cam.actionZoom || 1, 1, 1.16);
  const targetX = clamp(Number.isFinite(cam.x) ? cam.x : 0, -48, 48);
  const targetZ = clamp(Number.isFinite(cam.y) ? -cam.y : 0, -28, 28);
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const ball = replay?.b ? replay.b : match.ball;
  const rawBallHeight = Array.isArray(ball)
    ? (Number.isFinite(ball[2]) ? ball[2] : 0)
    : (Number.isFinite(ball?.z) ? ball.z : 0);
  const ballHeight = clamp(rawBallHeight, 0, 12);
  // La caméra suit légèrement les centres et trajectoires hautes : les lobes,
  // têtes et frappes aériennes restent dans le champ au lieu de disparaître.
  const focusLift = clamp(ballHeight * 0.16, 0, 1.55);
  // Sur écran étroit, on recule modérément pour garder les appels et les lignes
  // latérales visibles sans rendre les joueurs minuscules.
  const portrait = clamp((1.25 - safeAspect) / 0.7, 0, 1);
  // Réglage « Caméra » : TV proche (défaut, joueurs ~25 % plus grands), standard ou large (lecture tactique).
  const camPref = { near: 0.8, tv: 1, far: 1.2 }[match?.settings?.camera] || 1;
  const distanceScale = (1 + portrait * 0.16) * camPref;
  // Caméra de retransmission : assez proche pour lire les joueurs, assez haute
  // pour voir les lignes de passe (≈ 23 m de haut, ≈ 30 m en retrait du ballon).
  // v3.47 : angle « TV moderne » plus bas (≈ 27° au lieu de 38°) et focale plus longue :
  // joueurs plus grands, perspective proche des retransmissions et des jeux de foot actuels.
  const eye = [
    targetX - 2.4 / zoom * distanceScale,
    16.5 / zoom * distanceScale + focusLift * 0.42,
    targetZ + 31.5 / zoom * distanceScale,
  ];
  const target = [targetX, focusLift, targetZ - 2.2];
  return {
    eye,
    target,
    zoom,
    aspect: safeAspect,
    ballHeight,
    focusLift,
    portrait,
    fovy: safeAspect < 1.15 ? 0.9 : 0.64,
    distance: Math.hypot(eye[0] - targetX, eye[1] - target[1], eye[2] - target[2]),
  };
}
function parseColor(value, fallback = [0.8, 0.8, 0.8]) {
  if (typeof value !== 'string') return fallback;
  let s = value.trim().toLowerCase();
  if (s.startsWith('#')) {
    s = s.slice(1);
    if (s.length === 3) s = s.split('').map(x => x + x).join('');
    if (/^[0-9a-f]{6}$/.test(s)) return [
      parseInt(s.slice(0, 2), 16) / 255,
      parseInt(s.slice(2, 4), 16) / 255,
      parseInt(s.slice(4, 6), 16) / 255,
    ];
  }
  const named = { white: [0.94, 0.95, 0.92], black: [0.035, 0.04, 0.05], red: [0.8, 0.06, 0.08], green: [0.08, 0.38, 0.16], blue: [0.08, 0.2, 0.7], gold: [0.84, 0.62, 0.22] };
  return named[s] || fallback;
}
function makeGeometry() { return []; }
// Sommet : position, normale, couleur et phase d'animation (0 = statique, >0 = spectateur).
const VERTEX_FLOATS = 10;
let currentAnim = 0;
function pushVertex(out, p, n, c) {
  out.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2], currentAnim);
}
function triangle(out, a, b, c, color, normals = null) {
  const n = norm3(cross3(sub3(b, a), sub3(c, a)));
  pushVertex(out, a, normals ? normals[0] : n, color);
  pushVertex(out, b, normals ? normals[1] : n, color);
  pushVertex(out, c, normals ? normals[2] : n, color);
}
function quad(out, a, b, c, d, color, normal) {
  triangle(out, a, b, c, color, normal ? [normal, normal, normal] : null);
  triangle(out, a, c, d, color, normal ? [normal, normal, normal] : null);
}
function box(out, center, size, color) {
  const [x, y, z] = center, [sx, sy, sz] = size;
  const x0 = x - sx / 2, x1 = x + sx / 2, y0 = y - sy / 2, y1 = y + sy / 2, z0 = z - sz / 2, z1 = z + sz / 2;
  const c = color;
  quad(out, [x0,y0,z1], [x1,y0,z1], [x1,y1,z1], [x0,y1,z1], c, [0,0,1]);
  quad(out, [x1,y0,z0], [x0,y0,z0], [x0,y1,z0], [x1,y1,z0], c, [0,0,-1]);
  quad(out, [x1,y0,z1], [x1,y0,z0], [x1,y1,z0], [x1,y1,z1], c, [1,0,0]);
  quad(out, [x0,y0,z0], [x0,y0,z1], [x0,y1,z1], [x0,y1,z0], c, [-1,0,0]);
  quad(out, [x0,y1,z1], [x1,y1,z1], [x1,y1,z0], [x0,y1,z0], c, [0,1,0]);
  quad(out, [x0,y0,z0], [x1,y0,z0], [x1,y0,z1], [x0,y0,z1], c, [0,-1,0]);
}
function cylinder(out, a, b, radius, color, segments = 8, radiusTop = radius) {
  const axis = norm3(sub3(b, a));
  const reference = Math.abs(axis[1]) < 0.88 ? [0, 1, 0] : [1, 0, 0];
  const u = norm3(cross3(axis, reference)), v = norm3(cross3(axis, u));
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments * Math.PI * 2, t1 = (i + 1) / segments * Math.PI * 2;
    const r0 = [u[0] * Math.cos(t0) + v[0] * Math.sin(t0), u[1] * Math.cos(t0) + v[1] * Math.sin(t0), u[2] * Math.cos(t0) + v[2] * Math.sin(t0)];
    const r1 = [u[0] * Math.cos(t1) + v[0] * Math.sin(t1), u[1] * Math.cos(t1) + v[1] * Math.sin(t1), u[2] * Math.cos(t1) + v[2] * Math.sin(t1)];
    const aa = [a[0] + r0[0] * radius, a[1] + r0[1] * radius, a[2] + r0[2] * radius];
    const ab = [a[0] + r1[0] * radius, a[1] + r1[1] * radius, a[2] + r1[2] * radius];
    const ba = [b[0] + r0[0] * radiusTop, b[1] + r0[1] * radiusTop, b[2] + r0[2] * radiusTop];
    const bb = [b[0] + r1[0] * radiusTop, b[1] + r1[1] * radiusTop, b[2] + r1[2] * radiusTop];
    // Normales lissées par sommet (avec la pente du cône) : membres ronds, sans facettes visibles.
    const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) || 1, k = (radius - radiusTop) / L;
    const n0 = norm3([r0[0] + axis[0] * k, r0[1] + axis[1] * k, r0[2] + axis[2] * k]);
    const n1 = norm3([r1[0] + axis[0] * k, r1[1] + axis[1] * k, r1[2] + axis[2] * k]);
    triangle(out, aa, ba, bb, color, [n0, n0, n1]);
    triangle(out, aa, bb, ab, color, [n0, n1, n1]);
  }
}
function orientedEllipsoid(out, c, fx, uy, sz, rf, ru, rs, color, seg = 8, rings = 6) {
  const pt = (lat, lon) => {
    const y = Math.cos(lat), rr = Math.sin(lat), a = rr * Math.cos(lon), b = rr * Math.sin(lon);
    const p = [c[0] + fx[0] * a * rf + uy[0] * y * ru + sz[0] * b * rs, c[1] + fx[1] * a * rf + uy[1] * y * ru + sz[1] * b * rs, c[2] + fx[2] * a * rf + uy[2] * y * ru + sz[2] * b * rs];
    const na = a / Math.max(rf, 0.001), ny = y / Math.max(ru, 0.001), nb = b / Math.max(rs, 0.001);
    return { p, n: norm3([fx[0] * na + uy[0] * ny + sz[0] * nb, fx[1] * na + uy[1] * ny + sz[1] * nb, fx[2] * na + uy[2] * ny + sz[2] * nb]) };
  };
  for (let iy = 0; iy < rings; iy++) for (let ix = 0; ix < seg; ix++) {
    const A = pt(Math.PI * iy / rings, Math.PI * 2 * ix / seg), B = pt(Math.PI * (iy + 1) / rings, Math.PI * 2 * ix / seg);
    const C = pt(Math.PI * (iy + 1) / rings, Math.PI * 2 * (ix + 1) / seg), D = pt(Math.PI * iy / rings, Math.PI * 2 * (ix + 1) / seg);
    let col = color;
    if (typeof color === 'function') {
      // Motif du maillot évalué au centre de la facette, en coordonnées locales (avant, haut, côté).
      const lat = Math.PI * (iy + 0.5) / rings, lon = Math.PI * 2 * (ix + 0.5) / seg;
      col = color(Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon));
    }
    pushVertex(out, A.p, A.n, col); pushVertex(out, B.p, B.n, col); pushVertex(out, C.p, C.n, col);
    pushVertex(out, A.p, A.n, col); pushVertex(out, C.p, C.n, col); pushVertex(out, D.p, D.n, col);
  }
}
// Motifs de maillot : rayures verticales, cerceaux horizontaux, bande centrale, uni.
export function kitPatternColor(kit, shirt, alt, alt2 = alt) {
  const pattern = kit?.pattern;
  if (!pattern || pattern === 'plain') return shirt;
  const n = Number(kit.stripes || kit.hoops) || (pattern === 'hoops' ? 7 : 10);
  const sep = kit.sep ? parseColor(kit.sep, null) : null;
  return (a, y, b) => {
    if (pattern === 'stripes3') { const lon = Math.atan2(b, a), u = Math.floor((lon / (Math.PI * 2) + 0.5) * n + 0.5); return [shirt, alt, alt2][((u % 3) + 3) % 3]; }
    if (pattern === 'stripes') { const lon = Math.atan2(b, a), u = (lon / (Math.PI * 2) + 0.5) * n + 0.5, f = u - Math.floor(u); if (sep && (f < 0.035 || f > 0.965)) return sep; return Math.floor(u) % 2 ? alt : shirt; }
    if (pattern === 'hoops') return Math.floor((y + 1) / 2 * n) % 2 ? alt : shirt;
    if (pattern === 'centerStripe') return Math.abs(b) < 0.34 ? alt : shirt;
    if (pattern === 'chestBand') return y > 0.08 && y < 0.46 ? alt : shirt;
    if (pattern === 'checkers') { const lon = Math.atan2(b, a); return (Math.floor((lon / (Math.PI * 2) + 0.5) * 12) + Math.floor((y + 1) * 3.2)) % 2 ? alt : shirt; }
    if (pattern === 'sash') { const s = Math.abs(a * 0.72 - y * 0.7 + 0.05); return s < 0.2 ? alt : s < 0.29 ? alt2 : shirt; }
    return shirt;
  };
}
// Rotation incrémentale d'une matrice 3×3 (lignes) autour de l'axe ω, d'angle |ω|·dt (formule de Rodrigues).
function rotateMatrix3(M, w, dt) {
  const ang = Math.hypot(w[0], w[1], w[2]) * dt; if (!(ang > 1e-6)) return M;
  const k = [w[0] / (ang / dt), w[1] / (ang / dt), w[2] / (ang / dt)], c = Math.cos(ang), s = Math.sin(ang), t = 1 - c;
  const Rm = [t*k[0]*k[0]+c, t*k[0]*k[1]-s*k[2], t*k[0]*k[2]+s*k[1], t*k[0]*k[1]+s*k[2], t*k[1]*k[1]+c, t*k[1]*k[2]-s*k[0], t*k[0]*k[2]-s*k[1], t*k[1]*k[2]+s*k[0], t*k[2]*k[2]+c];
  const o = new Array(9);
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) o[i*3+j] = Rm[i*3]*M[j] + Rm[i*3+1]*M[3+j] + Rm[i*3+2]*M[6+j];
  // Ré-orthonormalisation légère pour éviter la dérive numérique.
  const n0 = Math.hypot(o[0], o[3], o[6]) || 1, n1 = Math.hypot(o[1], o[4], o[7]) || 1, n2 = Math.hypot(o[2], o[5], o[8]) || 1;
  for (let i = 0; i < 3; i++) { o[i*3] /= n0; o[i*3+1] /= n1; o[i*3+2] /= n2; }
  return o;
}
const PHI = (1 + Math.sqrt(5)) / 2;
const BALL_PENTAGONS = [[0,1,PHI],[0,1,-PHI],[0,-1,PHI],[0,-1,-PHI],[1,PHI,0],[1,-PHI,0],[-1,PHI,0],[-1,-PHI,0],[PHI,0,1],[PHI,0,-1],[-PHI,0,1],[-PHI,0,-1]].map(v => { const l = Math.hypot(...v); return v.map(c => c / l); });
const BALL_DEFAULT_PALETTE = [[0.95, 0.96, 0.93], [0.42, 0.44, 0.46], [0.05, 0.06, 0.08]];
export function ballPanelColor(local, palette = null) {
  let best = -1; for (const c of BALL_PENTAGONS) best = Math.max(best, local[0]*c[0] + local[1]*c[1] + local[2]*c[2]);
  const P = palette || BALL_DEFAULT_PALETTE;
  return best > 0.968 ? P[2] : best > 0.958 ? P[1] : P[0];
}
function addPanelBall(out, c, r, M, seg, rings, palette = null) {
  const pt = (lat, lon) => { const d = [Math.sin(lat) * Math.cos(lon), Math.cos(lat), Math.sin(lat) * Math.sin(lon)]; return { p: [c[0] + d[0] * r, c[1] + d[1] * r, c[2] + d[2] * r], n: d }; };
  for (let iy = 0; iy < rings; iy++) for (let ix = 0; ix < seg; ix++) {
    const A = pt(Math.PI * iy / rings, Math.PI * 2 * ix / seg), B = pt(Math.PI * (iy + 1) / rings, Math.PI * 2 * ix / seg);
    const C = pt(Math.PI * (iy + 1) / rings, Math.PI * 2 * (ix + 1) / seg), D = pt(Math.PI * iy / rings, Math.PI * 2 * (ix + 1) / seg);
    const m = [(A.n[0]+B.n[0]+C.n[0]+D.n[0])/4, (A.n[1]+B.n[1]+C.n[1]+D.n[1])/4, (A.n[2]+B.n[2]+C.n[2]+D.n[2])/4];
    const ml = Math.hypot(...m) || 1;
    // Direction dans le repère du ballon : transposée de la rotation.
    const local = [(M[0]*m[0]+M[3]*m[1]+M[6]*m[2])/ml, (M[1]*m[0]+M[4]*m[1]+M[7]*m[2])/ml, (M[2]*m[0]+M[5]*m[1]+M[8]*m[2])/ml];
    const col = ballPanelColor(local, palette);
    pushVertex(out, A.p, A.n, col); pushVertex(out, B.p, B.n, col); pushVertex(out, C.p, C.n, col);
    pushVertex(out, A.p, A.n, col); pushVertex(out, C.p, C.n, col); pushVertex(out, D.p, D.n, col);
  }
}
// Bouffée de fumée : disque face caméra, opaque au centre et transparent sur les bords (passe translucide).
function softPuff(out, c, r, color, cam, alpha = 1) {
  if (!cam) return;
  let f = [cam.target[0] - cam.eye[0], cam.target[1] - cam.eye[1], cam.target[2] - cam.eye[2]]; const fl = Math.hypot(...f) || 1; f = f.map(v => v / fl);
  let rt = [f[2], 0, -f[0]]; const rl = Math.hypot(...rt) || 1; rt = rt.map(v => v / rl);
  const up = [rt[1] * f[2] - rt[2] * f[1], rt[2] * f[0] - rt[0] * f[2], rt[0] * f[1] - rt[1] * f[0]];
  const n = [-f[0], -f[1], -f[2]], seg = 14;
  const P = (a, k) => [c[0] + (rt[0] * Math.cos(a) + up[0] * Math.sin(a)) * r * k, c[1] + (rt[1] * Math.cos(a) + up[1] * Math.sin(a)) * r * k, c[2] + (rt[2] * Math.cos(a) + up[2] * Math.sin(a)) * r * k];
  for (let i = 0; i < seg; i++) {
    const a = i / seg * Math.PI * 2, b = (i + 1) / seg * Math.PI * 2;
    currentAnim = alpha; pushVertex(out, c, n, color);
    currentAnim = alpha * 0.55; pushVertex(out, P(a, 0.55), n, color); pushVertex(out, P(b, 0.55), n, color);
    pushVertex(out, P(a, 0.55), n, color); currentAnim = 0; pushVertex(out, P(a, 1), n, color); pushVertex(out, P(b, 1), n, color);
    currentAnim = alpha * 0.55; pushVertex(out, P(a, 0.55), n, color); currentAnim = 0; pushVertex(out, P(b, 1), n, color); currentAnim = alpha * 0.55; pushVertex(out, P(b, 0.55), n, color);
  }
  currentAnim = 0;
}
function sphere(out, center, scale, color, seg = 8, rings = 6) {
  const [cx, cy, cz] = center, [rx, ry, rz] = scale;
  const point = (lat, lon) => {
    const y = Math.cos(lat), rr = Math.sin(lat), x = rr * Math.cos(lon), z = rr * Math.sin(lon);
    return { p: [cx + x * rx, cy + y * ry, cz + z * rz], n: norm3([x / Math.max(rx, 0.001), y / Math.max(ry, 0.001), z / Math.max(rz, 0.001)]) };
  };
  for (let iy = 0; iy < rings; iy++) for (let ix = 0; ix < seg; ix++) {
    const a = point(Math.PI * iy / rings, Math.PI * 2 * ix / seg);
    const b = point(Math.PI * (iy + 1) / rings, Math.PI * 2 * ix / seg);
    const c = point(Math.PI * (iy + 1) / rings, Math.PI * 2 * (ix + 1) / seg);
    const d = point(Math.PI * iy / rings, Math.PI * 2 * (ix + 1) / seg);
    triangle(out, a.p, b.p, c.p, color, [a.n,b.n,c.n]);
    triangle(out, a.p, c.p, d.p, color, [a.n,c.n,d.n]);
  }
}
function tube(out, a, b, radius, color, segments = 7) { cylinder(out, a, b, radius, color, segments); }
function ring(out, x, y, z, radius, color, segments = 24, tubeRadius = 0.045) {
  for (let i = 0; i < segments; i++) {
    const a = i / segments * Math.PI * 2, b = (i + 1) / segments * Math.PI * 2;
    tube(out, [x + Math.cos(a) * radius, y, z + Math.sin(a) * radius],
      [x + Math.cos(b) * radius, y, z + Math.sin(b) * radius], tubeRadius, color, 5);
  }
}
function rect(out, x0, x1, z0, z1, y, color) {
  quad(out, [x0,y,z0], [x1,y,z0], [x1,y,z1], [x0,y,z1], color, [0,1,0]);
}
const DIGIT_SEGMENTS = {
  '0': 'abcdef', '1': 'bc', '2': 'abged', '3': 'abgcd', '4': 'fgbc',
  '5': 'afgcd', '6': 'afgecd', '7': 'abc', '8': 'abcdefg', '9': 'abfgcd',
};
function addKitNumber(out, point, forward, centerY, number, color, scale = 1, facing = 1) {
  const text = String(Math.max(0, Number(number) || 0)).slice(-2);
  const width = 0.095 * scale, height = 0.155 * scale, gap = 0.025 * scale;
  const total = text.length * width + (text.length - 1) * gap;
  const segments = {
    a: [-height/2, -width/2, -height/2, width/2],
    b: [-height/2, width/2, 0, width/2],
    c: [0, width/2, height/2, width/2],
    d: [height/2, -width/2, height/2, width/2],
    e: [0, -width/2, height/2, -width/2],
    f: [-height/2, -width/2, 0, -width/2],
    g: [0, -width/2, 0, width/2],
  };
  for (let digitIndex = 0; digitIndex < text.length; digitIndex++) {
    const chars = DIGIT_SEGMENTS[text[digitIndex]] || DIGIT_SEGMENTS['0'];
    // Vu de face, le côté gauche du lecteur est le côté +s du joueur ; dans le dos c'est l'inverse.
    const centerSide = (-total/2 + width/2 + digitIndex*(width+gap)) * facing;
    for (const key of chars) {
      const [y0,s0,y1,s1] = segments[key];
      tube(out, point(forward, centerY-y0, centerSide+s0*facing),
        point(forward, centerY-y1, centerSide+s1*facing), 0.012*scale, color, 5);
    }
  }
}
function addArmPose(out, shoulder, elbow, hand, sleeve, skin, trim, detail, glove = false, longSleeve = glove) {
  // Manche courte jusqu'à mi-bras avec revers ; le gardien garde ses manches longues.
  if (glove || longSleeve) cylinder(out, shoulder, elbow, 0.105, sleeve, 8, 0.075);
  else {
    const cuff = [shoulder[0] + (elbow[0] - shoulder[0]) * 0.52, shoulder[1] + (elbow[1] - shoulder[1]) * 0.52, shoulder[2] + (elbow[2] - shoulder[2]) * 0.52];
    cylinder(out, shoulder, cuff, 0.106, sleeve, 10, 0.094);
    // Biceps : léger galbe sous la manche.
    cylinder(out, cuff, elbow, 0.074, skin, 9, 0.062);
    if (detail > 0) { const k = 0.07, c2 = [cuff[0] - (elbow[0] - shoulder[0]) * k, cuff[1] - (elbow[1] - shoulder[1]) * k, cuff[2] - (elbow[2] - shoulder[2]) * k]; cylinder(out, c2, cuff, 0.1, trim, 8, 0.096); }
  }
  // Avant-bras galbé (plus épais sous le coude, poignet fin).
  const fm = [elbow[0] + (hand[0] - elbow[0]) * 0.35, elbow[1] + (hand[1] - elbow[1]) * 0.35, elbow[2] + (hand[2] - elbow[2]) * 0.35];
  const fc = glove || longSleeve ? sleeve : skin;
  cylinder(out, elbow, fm, glove || longSleeve ? 0.07 : 0.06, fc, 9, glove || longSleeve ? 0.066 : 0.058);
  cylinder(out, fm, hand, glove || longSleeve ? 0.066 : 0.058, fc, 9, 0.038);
  if (detail > 0) {
    sphere(out, elbow, [0.062,0.062,0.062], fc, 7, 5);
    // Main orientée dans l'axe de l'avant-bras : paume aplatie + pouce (gant plus large pour le gardien).
    let d = [hand[0] - elbow[0], hand[1] - elbow[1], hand[2] - elbow[2]]; const dl = Math.hypot(...d) || 1; d = d.map(v => v / dl);
    const ref = Math.abs(d[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
    const u = norm3(cross3(d, ref)), w = norm3(cross3(d, u));
    const hc = [hand[0] + d[0] * 0.05, hand[1] + d[1] * 0.05, hand[2] + d[2] * 0.05];
    orientedEllipsoid(out, hc, u, d, w, glove ? 0.05 : 0.026, glove ? 0.085 : 0.07, glove ? 0.072 : 0.045, glove ? trim : skin, 8, 5);
    orientedEllipsoid(out, [hc[0] + w[0] * 0.04 + d[0] * -0.01, hc[1] + w[1] * 0.04 - d[1] * 0.01, hc[2] + w[2] * 0.04 - d[2] * 0.01], u, d, w, glove ? 0.03 : 0.016, glove ? 0.04 : 0.032, 0.016, glove ? trim : skin, 5, 3);
  } else {
    sphere(out, hand, [0.07,0.075,0.07], glove ? trim : skin, 6, 4);
  }
}

const VS = 'attribute vec3 aPosition; attribute vec3 aNormal; attribute vec3 aColor; attribute float aAnim; uniform mat4 uViewProjection; uniform float uTime; uniform float uExcite; uniform float uFx; varying vec3 vNormal; varying vec3 vColor; varying float vDepth; varying vec3 vWorld; varying float vFxA; varying float vFx; void main(){ vec3 p=aPosition; vFxA=aAnim; vFx=uFx; if(uFx<0.5&&aAnim>0.0){ float beat=sin(uTime*(4.2+fract(aAnim*7.31)*2.6)+aAnim*61.0); p.y+=max(beat,0.0)*(0.05+0.2*uExcite)*(0.4+fract(aAnim*3.7)); p.x+=sin(uTime*1.3+aAnim*17.0)*0.04; } vNormal=aNormal; vColor=aColor; if(uFx<0.5&&aAnim<0.0){ float w=0.5+0.5*sin(uTime*2.4-(p.x+p.z)*0.45); vColor=aColor*(0.7+0.45*w)+vec3(0.3*uExcite*max(sin(uTime*15.0),0.0)); } vWorld=p; gl_Position=uViewProjection*vec4(p,1.0); vDepth=gl_Position.w; }';
const FS = '#ifdef GL_FRAGMENT_PRECISION_HIGH\nprecision highp float;\n#else\nprecision mediump float;\n#endif\nuniform vec3 uFog; uniform vec3 uEye; uniform float uRim; uniform vec3 uFogRange; uniform vec3 uLight; uniform float uWet; uniform float uAlpha; varying vec3 vNormal; varying vec3 vColor; varying float vDepth; varying vec3 vWorld; varying float vFxA; varying float vFx; void main(){ vec3 n=normalize(vNormal); vec3 sun=normalize(vec3(-0.42,0.86,0.31)); vec3 fillA=normalize(vec3(0.58,0.42,-0.66)); vec3 fillB=normalize(vec3(-0.76,0.28,-0.36)); float key=max(dot(n,sun),0.0); float rim=max(dot(n,fillA),0.0); float fill=max(dot(n,fillB),0.0); float hemi=0.5+0.5*max(n.y,0.0); float spec=pow(max(dot(n,normalize(sun+vec3(0.0,0.8,0.15))),0.0),24.0)*0.14; float lighting=0.42+0.6*key+0.18*rim+0.12*fill+0.13*hemi; vec3 lit=vColor*lighting+vec3(spec); if(uRim>0.0){ vec3 V=normalize(uEye-vWorld); vec3 amb=mix(vec3(0.26,0.4,0.24),vec3(0.6,0.66,0.84),0.5+0.5*n.y); float nv=max(dot(n,V),0.0); float fres=pow(1.0-nv,2.6); float sh=pow(max(dot(n,normalize(sun+V)),0.0),30.0); float wkey=clamp((dot(n,sun)+0.38)/1.38,0.0,1.0); float ao=0.74+0.26*smoothstep(0.02,0.95,vWorld.y); float lum0=dot(vColor,vec3(0.3,0.59,0.11)); float warm=step(vColor.b*1.18,vColor.g)*step(vColor.g*1.08,vColor.r)*step(0.12,lum0)*step(lum0,0.75); vec3 sss=vec3(0.09,0.03,0.0)*warm*(1.0-key); vec3 lp=(vColor*(amb*0.66+0.7*wkey*wkey+0.18*rim+0.1*fill)+sss)*ao+vec3(sh*(0.1+0.1*warm))+vec3(1.0,0.95,0.86)*fres*0.36*(0.35+0.65*max(n.y+0.3,0.0)); lit=mix(lit,lp,uRim); } if(uWet>0.0&&n.y>0.85){ vec3 Vw=normalize(uEye-vWorld); float gl2=pow(max(dot(n,normalize(sun+Vw)),0.0),46.0); float fr=pow(1.0-max(dot(n,Vw),0.0),4.0); lit+=vec3(0.75,0.8,0.9)*(gl2*0.6+fr*0.34)*uWet; lit*=1.0-0.12*uWet*(1.0-uRim); } float grassM=step(0.95,n.y)*step(vWorld.y,0.05)*step(vColor.r*1.55,vColor.g)*step(vColor.b*1.5,vColor.g)*step(abs(vWorld.x),57.0)*step(abs(vWorld.z),39.0); if(grassM>0.5){ vec2 q=vWorld.xz; float f1=fract(sin(dot(floor(q*3.0),vec2(12.9898,78.233)))*43758.5453); float f2=fract(sin(dot(floor(q*0.9+0.37),vec2(39.346,11.135)))*24634.6345); float mid=sin(q.x*0.9+sin(q.y*0.7)*1.6)*sin(q.y*1.1+q.x*0.23); vec3 Vg=normalize(uEye-vWorld); float bandI=floor((q.x+52.5)/5.25); float dirB=mod(bandI,2.0)*2.0-1.0; float inPitch=step(abs(q.x),52.5)*step(abs(q.y),34.0); float sheen=Vg.x/(length(Vg.xz)+0.001)*dirB*inPitch; lit*=1.0+(f1-0.5)*0.07+(f2-0.5)*0.06+mid*0.03+sheen*0.075; } lit*=uLight; vec3 color=pow(max(lit,vec3(0.0)),vec3(0.94)); float fog=smoothstep(uFogRange.x,uFogRange.y,vDepth)*uFogRange.z; color=mix(color,uFog,fog); if(vFx<0.5){ vec3 x=color; vec3 ac=clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14),0.0,1.0); color=mix(color,ac,grassM>0.5?0.0:0.5); float lum=dot(color,vec3(0.2126,0.7152,0.0722)); color=mix(vec3(lum),color,grassM>0.5?0.96:1.05); color=mix(color,color*color*(3.0-2.0*color),grassM>0.5?0.1:0.22); } gl_FragColor=vec4(color,vFx>0.5?uAlpha*clamp(vFxA,0.0,1.0):uAlpha); }';

function compile(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source); gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Échec shader WebGL';
    gl.deleteShader(shader); throw new Error(message);
  }
  return shader;
}
function programFor(gl) {
  const vs = compile(gl, gl.VERTEX_SHADER, VS), fs = compile(gl, gl.FRAGMENT_SHADER, FS);
  const program = gl.createProgram();
  gl.attachShader(program, vs); gl.attachShader(program, fs); gl.linkProgram(program);
  gl.deleteShader(vs); gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || 'Échec programme WebGL');
  return program;
}

const SKY_HORIZON = [0.2, 0.25, 0.34], SKY_MID = [0.07, 0.11, 0.2], SKY_TOP = [0.02, 0.035, 0.08];
// Ambiances : ciel, brume, lumière globale, pelouse mouillée, type d'ombres et pluie.
export function getWeatherProfile(kind = 'night') {
  const P = {
    night: { sky: [[0.31, 0.36, 0.47], [0.11, 0.16, 0.27], [0.03, 0.052, 0.105]], fog: [0.31, 0.36, 0.47], fogRange: [62, 214, 0.36], light: [1.22, 1.18, 1.14], wet: 0, shadows: 'flood', rain: 0 },
    day: { sky: [[0.66, 0.77, 0.9], [0.4, 0.6, 0.86], [0.2, 0.42, 0.8]], fog: [0.7, 0.79, 0.9], fogRange: [70, 230, 0.32], light: [1.24, 1.19, 1.07], wet: 0, shadows: 'sun', rain: 0 },
    rain: { sky: [[0.2, 0.22, 0.26], [0.12, 0.13, 0.16], [0.06, 0.07, 0.09]], fog: [0.22, 0.24, 0.28], fogRange: [26, 130, 0.72], light: [0.72, 0.76, 0.84], wet: 1, shadows: 'soft', rain: 1 },
    fog: { sky: [[0.46, 0.48, 0.52], [0.36, 0.38, 0.42], [0.26, 0.28, 0.32]], fog: [0.5, 0.52, 0.56], fogRange: [12, 78, 0.9], light: [0.93, 0.94, 0.97], wet: 0.25, shadows: 'soft', rain: 0 },
  };
  return P[kind] || P.night;
}
function seededNoise(seed) { let v = seed >>> 0; return () => { v = (Math.imul(v, 1664525) + 1013904223) >>> 0; return v / 4294967296; }; }
function gradientQuad(out, a, b, c, d, bottom, top) {
  const n = [0, 0, 1];
  pushVertex(out, a, n, bottom); pushVertex(out, b, n, bottom); pushVertex(out, c, n, top);
  pushVertex(out, a, n, bottom); pushVertex(out, c, n, top); pushVertex(out, d, n, top);
}
// Quad vertical face à l'axe z (facing = ±1) et face à l'axe x.
function rectV(out, x0, x1, y0, y1, z, color, facing = 1) { quad(out, [x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z], color, [0, 0, facing]); }
function rectVZ(out, x, z0, z1, y0, y1, color, facing = 1) { quad(out, [x, y0, z0], [x, y0, z1], [x, y1, z1], [x, y1, z0], color, [facing, 0, 0]); }
// Supporter : buste et tête tournés vers la pelouse, parfois une écharpe levée.
// Chaussures modernes : couleur principale + semelle/virgule contrastée.
const BOOT_COLORS=[[[0.04,0.045,0.05],[0.95,0.95,0.95]],[[0.93,0.93,0.92],[0.06,0.06,0.07]],[[0.85,1.0,0.12],[0.05,0.05,0.06]],[[1.0,0.42,0.08],[0.08,0.08,0.1]],[[0.1,0.35,1.0],[0.95,0.95,0.95]],[[1.0,0.3,0.6],[0.06,0.06,0.07]],[[0.9,0.08,0.1],[0.95,0.95,0.95]],[[0.04,0.045,0.05],[1.0,0.76,0.1]]];
const HAIR_COLORS=[[0.03,0.025,0.02],[0.06,0.04,0.03],[0.13,0.08,0.045],[0.24,0.15,0.07],[0.5,0.38,0.2],[0.02,0.02,0.025]];
function nameHash(text) { let h = 2166136261; for (const ch of String(text || '')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822507) >>> 0; h ^= h >>> 13; return h >>> 0; }
export function playerLook(player = {}, index = 0) {
  const h = nameHash((player.id ?? '') + '|' + (player.name || index));
  const styles = ['crop', 'crop', 'buzz', 'afro', 'fade', 'long', 'bald', 'quiff'];
  const style = styles[h % styles.length];
  const hair = HAIR_COLORS[(h >>> 4) % (style === 'afro' ? 2 : HAIR_COLORS.length)];
  const hairHighlight = hair.map(v => Math.min(1, v * 1.22 + 0.035));
  const boots = BOOT_COLORS[(h >>> 13) % BOOT_COLORS.length];
  const eyePalette = [[0.12,0.075,0.035],[0.22,0.12,0.055],[0.08,0.13,0.16],[0.24,0.2,0.12]];
  const eye = eyePalette[(h >>> 17) % eyePalette.length];
  const beardStyle = ((h >>> 9) % 5);
  return { style, hair, hairHighlight, eye, beard: beardStyle < 3, beardStyle, boot: boots[0], bootAccent: boots[1] };
}
// Coiffure posée sur une tête de demi-axes 0.125 (avant) × 0.15 (haut) × 0.112 (côté).
function addHair(out, bodyPoint, f, bodyY, look, detail, ell, tilt = 0, k = 1) {
  const c = look.hair, y = bodyY + 0.62;
  const E = (df, dy, rf, ru, rs, seg = 10, rings = 6) => ell(bodyPoint(f + df * k, y + dy * k, 0), rf * k, ru * k, rs * k, c, seg, rings, tilt);
  switch (look.style) {
    case 'bald': break;
    case 'buzz': E(-0.012, 0.03, 0.128, 0.13, 0.116); break;
    case 'afro': E(-0.035, 0.085, 0.16, 0.13, 0.155, 10, 6); break;
    case 'long': E(-0.025, 0.045, 0.132, 0.12, 0.12); E(-0.085, -0.05, 0.06, 0.12, 0.11, 7, 4); break;
    case 'quiff': E(-0.025, 0.045, 0.128, 0.12, 0.118); E(0.045, 0.13, 0.075, 0.05, 0.08, 7, 4); break;
    case 'fade': E(-0.02, 0.075, 0.12, 0.09, 0.105); break;
    default: E(-0.025, 0.05, 0.13, 0.12, 0.118); if (detail > 0) E(0.07, 0.1, 0.04, 0.03, 0.09, 6, 3);
  }
  if (detail > 0 && look.hairHighlight && (look.style === 'long' || look.style === 'quiff')) {
    // Mèche légèrement éclaircie pour casser l'aspect uniforme des cheveux en gros plan.
    ell(bodyPoint(f + (look.style === 'quiff' ? 0.055 : -0.075) * k, y + 0.115 * k, -0.018 * k),
      0.052 * k, 0.018 * k, 0.035 * k, look.hairHighlight, 7, 4, tilt);
  }
  if (look.beard && detail > 0) {
    // Barbe courte, bouc ou moustache : variation stable par joueur.
    if (look.beardStyle === 0) E(0.055, -0.075, 0.07, 0.06, 0.095, 7, 4);
    else if (look.beardStyle === 1) E(0.058, -0.09, 0.052, 0.045, 0.08, 7, 4);
    else E(0.075, -0.045, 0.06, 0.025, 0.075, 7, 3);
  }
}
function spectator(out, x, y, z, facing, shirt, skin, scarf) {
  // Vecteur latéral perpendiculaire à l'orientation (fonctionne aussi dans les virages en arc).
  const sx = -facing[2], sz = facing[0];
  const off = (u, v, w) => [x + sx * u + facing[0] * w, y + v, z + sz * u + facing[2] * w];
  const n = facing;
  const panel = (u0, u1, v0, v1, w, c) => { const a = off(u0, v0, w), b = off(u1, v0, w), cc = off(u1, v1, w), d = off(u0, v1, w); pushVertex(out, a, n, c); pushVertex(out, b, n, c); pushVertex(out, cc, n, c); pushVertex(out, a, n, c); pushVertex(out, cc, n, c); pushVertex(out, d, n, c); };
  const tri = (p0, p1, p2, c) => { pushVertex(out, p0, n, c); pushVertex(out, p1, n, c); pushVertex(out, p2, n, c); };
  // Buste trapézoïdal (épaules plus larges que la taille) : 2 triangles, même budget que l'ancien rectangle.
  tri(off(-0.2, 0, 0), off(0.2, 0, 0), off(0.29, 0.74, 0), shirt); tri(off(-0.2, 0, 0), off(0.29, 0.74, 0), off(-0.29, 0.74, 0), shirt);
  // Tête hexagonale : 4 triangles, le haut aux couleurs des cheveux.
  const hair = (Math.abs(x * 7.3 + z * 3.1) % 1) < 0.5 ? [0.07, 0.05, 0.04] : [0.16, 0.11, 0.07];
  const H = (u, v) => off(u, v, 0.02);
  tri(H(-0.07, 0.78), H(0.07, 0.78), H(0.12, 0.96), skin); tri(H(-0.07, 0.78), H(0.12, 0.96), H(-0.12, 0.96), skin);
  tri(H(-0.12, 0.96), H(0.12, 0.96), H(0, 1.09), hair);
  if (scarf) panel(-0.42, 0.42, 1.22, 1.36, 0.05, scarf);
}
function seatBlock(out, x, y, z, facing, color) {
  const c = color.map(v => v * 0.55);
  box(out, [x, y + 0.2, z], facing[0] === 0 ? [0.42, 0.4, 0.38] : [0.38, 0.4, 0.42], c);
}

export class MatchRenderer3D {
  constructor(hostCanvas, match) {
    this.wx = getWeatherProfile(match?.weather);
    this.hostCanvas = hostCanvas;
    this.qualityName = match.settings.quality || 'high';
    this.quality = get3DQualityProfile(this.qualityName);
    this.match = match;
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'ft26-3d-canvas';
    this.canvas.setAttribute('aria-hidden', 'true');
    this.canvas.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;z-index:0;';
    hostCanvas.parentElement.insertBefore(this.canvas, hostCanvas);
    this.gl = this.canvas.getContext('webgl', { alpha: false, antialias: true, depth: true, stencil: false, powerPreference: match.settings.quality === 'high' ? 'high-performance' : 'default' }) ||
      this.canvas.getContext('experimental-webgl', { alpha: false, antialias: true, depth: true });
    if (!this.gl) throw new Error('WebGL indisponible');
    const gl = this.gl;
    this.program = programFor(gl);
    this.positionLoc = gl.getAttribLocation(this.program, 'aPosition');
    this.normalLoc = gl.getAttribLocation(this.program, 'aNormal');
    this.colorLoc = gl.getAttribLocation(this.program, 'aColor');
    this.animLoc = gl.getAttribLocation(this.program, 'aAnim');
    this.matrixLoc = gl.getUniformLocation(this.program, 'uViewProjection');
    this.timeLoc = gl.getUniformLocation(this.program, 'uTime');
    this.exciteLoc = gl.getUniformLocation(this.program, 'uExcite');
    this.fogLoc = gl.getUniformLocation(this.program, 'uFog');
    this.eyeLoc = gl.getUniformLocation(this.program, 'uEye');
    this.rimLoc = gl.getUniformLocation(this.program, 'uRim');
    this.fogRangeLoc = gl.getUniformLocation(this.program, 'uFogRange');
    this.lightLoc = gl.getUniformLocation(this.program, 'uLight');
    this.wetLoc = gl.getUniformLocation(this.program, 'uWet');
    this.staticBuffer = gl.createBuffer();
    this.dynamicBuffer = gl.createBuffer();
    this.staticCount = 0;
    this.width = 0; this.height = 0;
    this.lost = false;
    this.canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; this.canvas.style.display = 'none'; });
    this.staticGeometry = makeGeometry();
    this.dynamicGeometry = makeGeometry();
    this.fxGeometry = makeGeometry();
    this.fxBuffer = gl.createBuffer();
    this.alphaLoc = gl.getUniformLocation(this.program, 'uAlpha');
    this.fxLoc = gl.getUniformLocation(this.program, 'uFx');
    this.buildStadium(match);
    this.uploadStatic();
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(this.wx.fog[0], this.wx.fog[1], this.wx.fog[2], 1);
    this.resize();
  }
  buildStadium(match) {
    const g = this.staticGeometry, profile = this.quality;
    currentAnim = 0;
    const home = parseColor(match.teams[0]?.kit?.shirt, [0.72,0.07,0.1]);
    const homeTrim = parseColor(match.teams[0]?.kit?.trim, [0.95,0.95,0.92]);
    const away = parseColor(match.teams[1]?.kit?.shirt, [0.08,0.2,0.48]);
    const awayTrim = parseColor(match.teams[1]?.kit?.trim, [0.95,0.95,0.92]);
    const rand = seededNoise(1337);
    // Ciel nocturne en dégradé derrière le stade (horizon éclairé par les projecteurs).
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2, b = (i + 1) / 24 * Math.PI * 2, R = 150;
      const p0 = [Math.cos(a) * R, -2, Math.sin(a) * R], p1 = [Math.cos(b) * R, -2, Math.sin(b) * R];
      const q0 = [Math.cos(a) * R, 42, Math.sin(a) * R], q1 = [Math.cos(b) * R, 42, Math.sin(b) * R];
      const r0 = [Math.cos(a) * R * 0.8, 95, Math.sin(a) * R * 0.8], r1 = [Math.cos(b) * R * 0.8, 95, Math.sin(b) * R * 0.8];
      const sk = (this.wx || getWeatherProfile()).sky;
      gradientQuad(g, p0, p1, q1, q0, sk[0], sk[1]);
      gradientQuad(g, q0, q1, r1, r0, sk[1], sk[2]);
    }
    // Sol extérieur et pelouse : bandes de tonte dans les deux sens, légères variations naturelles.
    box(g, [0,-1.2,0], [190,1.8,150], [0.05,0.07,0.08]);
    box(g, [0,-0.2,0], [116,0.35,80], [0.1,0.3,0.13]);
    const cols = profile.detail >= 2 ? 48 : profile.detail === 1 ? 30 : 18, rows = profile.detail >= 2 ? 30 : profile.detail === 1 ? 18 : 10;
    const W = 112, H = 76;
    // Couleur de la pelouse en un point : bandes de tonte franches, ondulations douces et usure.
    const turf = (x, z) => {
      const inside = Math.abs(x) <= 52.6 && Math.abs(z) <= 34.1;
      const band = Math.floor((x + 52.5) / 5.25) % 2 ? 1.075 : 0.94;
      const soft = 1 + Math.sin(x * 0.21 + z * 0.13) * 0.006 + Math.sin(x * 0.07 - z * 0.31) * 0.006;
      const wear = Math.max(0, 1 - Math.hypot(Math.abs(x) - 48.5, z / 1.7) / 8) * 0.14 + Math.max(0, 1 - Math.hypot(x, z) / 6) * 0.04;
      const k = (inside ? band : 0.86) * soft;
      return [(0.125 + wear * 0.32) * k, (0.375 - wear * 0.55) * k, (0.15 + wear * 0.08) * k];
    };
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) {
      const x0 = -W / 2 + i * W / cols, x1 = x0 + W / cols, z0 = -H / 2 + j * H / rows, z1 = z0 + H / rows;
      // Les bandes restent nettes : chaque case prend la teinte de sa bande, les nuances sont fondues aux coins.
      const bandX = (x0 + x1) / 2;
      const corner = (x, z) => { const c = turf(bandX + (x - bandX) * 0.001, z); const t = turf(x, z); return [c[0] * 0.6 + t[0] * 0.4, c[1] * 0.6 + t[1] * 0.4, c[2] * 0.6 + t[2] * 0.4]; };
      const up = [0, 1, 0], y = 0.004;
      const a = [x0, y, z0], b = [x1, y, z0], c = [x1, y, z1], d = [x0, y, z1];
      const ca = corner(x0, z0), cb = corner(x1, z0), cc = corner(x1, z1), cd = corner(x0, z1);
      pushVertex(g, a, up, ca); pushVertex(g, b, up, cb); pushVertex(g, c, up, cc);
      pushVertex(g, a, up, ca); pushVertex(g, c, up, cc); pushVertex(g, d, up, cd);
    }
    // Touchlines, halfway line, centre circle, penalty areas and goal areas.
    const white = [0.91,0.94,0.88], softWhite = [0.76,0.82,0.76];
    const line = (a,b,r=0.075,c=white) => tube(g,a,b,r,c,6);
    const y = 0.075;
    line([-52.5,y,-34],[52.5,y,-34]); line([-52.5,y,34],[52.5,y,34]);
    line([-52.5,y,-34],[-52.5,y,34]); line([52.5,y,-34],[52.5,y,34]);
    line([0,y,-34],[0,y,34]);
    for (let i=0;i<64;i++) {
      const a=i/64*Math.PI*2,b=(i+1)/64*Math.PI*2;
      line([Math.cos(a)*9.15,y,Math.sin(a)*9.15],[Math.cos(b)*9.15,y,Math.sin(b)*9.15],0.07);
    }
    sphere(g,[0,y+0.025,0],[0.13,0.035,0.13],white,8,4);
    for (const s of [-1,1]) {
      const x=s*52.5;
      line([x,y,-20.16],[s*(52.5-16.5),y,-20.16]);
      line([s*(52.5-16.5),y,-20.16],[s*(52.5-16.5),y,20.16]);
      line([s*(52.5-16.5),y,20.16],[x,y,20.16]);
      line([x,y,-9.16],[s*(52.5-5.5),y,-9.16]);
      line([s*(52.5-5.5),y,-9.16],[s*(52.5-5.5),y,9.16]);
      line([s*(52.5-5.5),y,9.16],[x,y,9.16]);
      sphere(g,[s*(52.5-11),y+0.02,0],[0.13,0.035,0.13],white,8,4);
      const arcStart=s>0?Math.PI/2:Math.PI*1.5, arcEnd=s>0?Math.PI*1.5:Math.PI*2.5;
      for(let i=0;i<24;i++){
        const a=arcStart+(arcEnd-arcStart)*i/24,b=arcStart+(arcEnd-arcStart)*(i+1)/24;
        line([s*(52.5-11)+Math.cos(a)*9.15,y,Math.sin(a)*9.15],[s*(52.5-11)+Math.cos(b)*9.15,y,Math.sin(b)*9.15],0.06);
      }
      // Goal frame and realistic net grid.
      const postX=s*52.5, backX=s*55.2, halfGoal=3.66, gh=2.44;
      for(const zz of [-halfGoal,halfGoal]) line([postX,0,zz],[postX,gh,zz],0.12,[0.94,0.95,0.9]);
      line([postX,gh,-halfGoal],[postX,gh,halfGoal],0.12,[0.94,0.95,0.9]);
      for(const zz of [-halfGoal,halfGoal]) line([postX,0,zz],[backX,0,zz],0.07,softWhite);
      line([backX,0,-halfGoal],[backX,0,halfGoal],0.065,softWhite);
      // Le filet lui-même est dessiné à chaque image (addNets) pour pouvoir se déformer.
      // Corner flags.
      for(const side of [-1,1]){
        const fx=s*52.1,fz=side*33.7;
        cylinder(g,[fx,0,fz],[fx,1.55,fz],0.035,[0.92,0.92,0.88],6);
        box(g,[fx+s*0.27,1.36,fz+side*0.06],[0.55,0.3,0.06],s===side?home:away);
      }
    }
    // Panneaux LED lumineux autour de la pelouse (couleurs des clubs et bandeaux clairs).
    const led = [[home, homeTrim], [away, awayTrim], [[0.02,0.42,0.75], [0.95,0.95,0.95]], [[0.98,0.62,0.05], [0.08,0.08,0.1]], [[0.05,0.55,0.25], [0.95,0.95,0.9]]];
    const ledBoard = (cx, cz, along, len, ci, facing) => {
      const [c1, c2] = led[ci % led.length];
      const bright = c => c.map(v => Math.min(1.35, v * 1.35 + 0.08));
      if (along === 'x') {
        box(g, [cx, 0.55, cz + facing * 0.12], [len, 0.95, 0.22], [0.04,0.05,0.06]);
        currentAnim = -1; for (let k = 0; k < 4; k++) { const x0 = cx - len / 2 + k * len / 4; rectV(g, x0 + 0.05, x0 + len / 4 - 0.05, 0.12, 0.98, cz + facing * 0.245, k % 2 ? bright(c2) : bright(c1), facing); }
      } else {
        box(g, [cx + facing * 0.12, 0.55, cz], [0.22, 0.95, len], [0.04,0.05,0.06]);
        currentAnim = -1; for (let k = 0; k < 4; k++) { const z0 = cz - len / 2 + k * len / 4; rectVZ(g, cx + facing * 0.245, z0 + 0.05, z0 + len / 4 - 0.05, 0.12, 0.98, k % 2 ? bright(c2) : bright(c1), facing); }
      }
      currentAnim = 0;
    };
    for (let i = 0; i < 10; i++) { const x = -48 + i * 10.65; if (i < 4 || i > 5) ledBoard(x, -35.6, 'x', 10.3, i, 1); ledBoard(x, 35.6, 'x', 10.3, i + 2, -1); }
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) ledBoard(s * 55.4, -25 + i * 16.7, 'z', 16, i + 1, -s);
    // Tribunes en gradins : deux anneaux, sièges et milliers de supporters animés par le GPU.
    const lower = profile.detail >= 2 ? 15 : profile.detail === 1 ? 11 : 7;
    const upper = profile.detail >= 2 ? 11 : profile.detail === 1 ? 7 : 0;
    const spacing = profile.detail >= 2 ? 0.62 : profile.detail === 1 ? 0.82 : 1.25;
    const concreteA = [0.2,0.22,0.26], concreteB = [0.16,0.18,0.22];
    const fanPalette = [home, home, homeTrim, home, [0.92,0.92,0.9], [0.1,0.1,0.12], [0.22,0.26,0.34], home, [0.55,0.5,0.45]];
    const awayPalette = [away, awayTrim, away, [0.1,0.1,0.12]];
    const skin = [[0.78,0.56,0.42], [0.62,0.42,0.3], [0.46,0.3,0.2], [0.85,0.66,0.52]];
    let fans = 0;
    // stand(axis, sign) : gradins le long des tribunes latérales (x) ou des virages (z).
    const stand = (axis, sign) => {
      const len = axis === 'x' ? 110 : 70;
      const base = axis === 'x' ? 37.4 : 57.4;
      const tiers = [{ rows: lower, d0: base, h0: 1.2 }, { rows: upper, d0: base + lower * 0.85 + 2.6, h0: 1.2 + lower * 0.45 + 3.2 }];
      for (const [t, tier] of tiers.entries()) {
        for (let r = 0; r < tier.rows; r++) {
          const d = tier.d0 + r * 0.85, h = tier.h0 + r * 0.45;
          const col = r % 2 ? concreteA : concreteB;
          // contremarche + marche
          if (axis === 'x') { rectV(g, -len / 2, len / 2, h - 0.45, h, sign * d, col, -sign); rect(g, -len / 2, len / 2, sign > 0 ? d : -d - 0.85, sign > 0 ? d + 0.85 : -d, h, col); }
          else { rectVZ(g, sign * d, -len / 2, len / 2, h - 0.45, h, col, -sign); rect(g, sign > 0 ? d : -d - 0.85, sign > 0 ? d + 0.85 : -d, -len / 2, len / 2, h, col); }
          for (let a = -len / 2 + spacing / 2; a < len / 2; a += spacing) {
            const aisle = Math.abs(((a + len / 2) % 14) - 7) < spacing * 0.6;
            if (aisle) continue;
            const empty = rand() < 0.07;
            const awaySection = axis === 'z' && sign > 0 && a > 8;
            const pal = awaySection ? awayPalette : fanPalette;
            const px = axis === 'x' ? a : sign * (d + 0.35), pz = axis === 'x' ? sign * (d + 0.35) : a;
            const facing = axis === 'x' ? [0, 0, -sign] : [-sign, 0, 0];
            if (empty) { seatBlock(g, px, h, pz, facing, awaySection ? away : home); continue; }
            currentAnim = 0.001 + rand();
            spectator(g, px, h, pz, facing, pal[Math.floor(rand() * pal.length)], skin[Math.floor(rand() * skin.length)], rand() < 0.16 ? (awaySection ? awayTrim : homeTrim) : null);
            // Drapeaux agités par quelques supporters (ils suivent le rythme de leur porteur).
            if (profile.detail >= 1 && rand() < 0.011) {
              const fc = awaySection ? (rand() < 0.5 ? away : awayTrim) : (rand() < 0.55 ? home : homeTrim);
              const top = [px, h + 2.5, pz], ax = axis === 'x' ? [1, 0, 0] : [0, 0, 1];
              tube(g, [px, h + 0.7, pz], top, 0.025, [0.8, 0.8, 0.8], 4);
              quad(g, top, [top[0] + ax[0] * 1.3, top[1] - 0.1, top[2] + ax[2] * 1.3], [top[0] + ax[0] * 1.3, top[1] - 0.95, top[2] + ax[2] * 1.3], [top[0], top[1] - 0.85, top[2]], fc, facing);
              quad(g, [top[0] + ax[0] * 1.3, top[1] - 0.1, top[2] + ax[2] * 1.3], top, [top[0], top[1] - 0.85, top[2]], [top[0] + ax[0] * 1.3, top[1] - 0.95, top[2] + ax[2] * 1.3], fc, facing.map(v => -v));
            }
            currentAnim = 0;
            fans++;
          }
        }
        if (t === 0 && tier.rows) {
          // balcon de séparation avec bandeau aux couleurs du club
          const d = tier.d0 + tier.rows * 0.85 + 0.6, h = tier.h0 + tier.rows * 0.45 + 1.1;
          if (axis === 'x') { box(g, [0, h, sign * d], [len, 1.6, 0.5], [0.07,0.08,0.1]); rectV(g, -len / 2, len / 2, h - 0.5, h + 0.45, sign * (d - 0.26), home.map(v => v * 0.9), -sign); }
          else { box(g, [sign * d, h, 0], [0.5, 1.6, len], [0.07,0.08,0.1]); rectVZ(g, sign * (d - 0.26), -len / 2, len / 2, h - 0.5, h + 0.45, home.map(v => v * 0.9), -sign); }
          // Banderoles de supporters suspendues au balcon (rayures aux couleurs du club).
          if (t === 0) for (let k = 0; k < (axis === 'x' ? 5 : 2); k++) {
            const a0 = -len / 2 + (k + 0.5) * len / (axis === 'x' ? 5 : 2) - 3.5, bw = 7, stripes = 6;
            for (let q = 0; q < stripes; q++) {
              const col = (q + k) % 2 ? homeTrim : home, s0 = a0 + q * bw / stripes, s1 = s0 + bw / stripes;
              if (axis === 'x') rectV(g, s0, s1, h - 2.3, h - 0.55, sign * (d - 0.28), col, -sign);
              else rectVZ(g, sign * (d - 0.28), s0, s1, h - 2.3, h - 0.55, col, -sign);
            }
          }
        }
      }
      // toit : auvent sombre avec rampe lumineuse en façade
      const top = 1.2 + lower * 0.45 + 3.2 + upper * 0.45 + 3.6;
      const reach = base + 4;
      const depth = (lower + upper) * 0.85 + 8;
      if (axis === 'x') {
        box(g, [0, top, sign * (reach + depth / 2)], [len + 8, 0.6, depth], [0.06,0.07,0.09]);
        box(g, [0, top - 0.45, sign * reach], [len + 8, 0.35, 0.4], [1.25,1.18,0.95]);
        box(g, [0, top / 2, sign * (reach + depth)], [len + 8, top, 0.8], [0.09,0.1,0.13]);
        // Ruban lumineux continu sous la rive du toit : repère visuel du stade de nuit.
        box(g, [0, top + 0.08, sign * (reach + depth - 0.38)], [len + 7.6, 0.095, 0.12], [1.25, 1.02, 0.76]);
        // Drapeaux sur le bord du toit : la toile ondule avec le rythme de la foule.
        for (let k = 0; k < 9; k++) {
          const fx = -len / 2 + 6 + k * (len - 12) / 8, fz = sign * reach;
          cylinder(g, [fx, top + 0.3, fz], [fx, top + 4.2, fz], 0.06, [0.75,0.77,0.8], 5);
          currentAnim = 0.5 + rand() * 0.49;
          const col = k % 2 ? homeTrim : home;
          quad(g, [fx, top + 2.7, fz], [fx + 2.2, top + 2.8, fz], [fx + 2.2, top + 4.0, fz], [fx, top + 4.15, fz], col, [0, 0, -sign]);
          quad(g, [fx + 2.2, top + 2.8, fz], [fx, top + 2.7, fz], [fx, top + 4.15, fz], [fx + 2.2, top + 4.0, fz], col, [0, 0, sign]);
          currentAnim = 0;
        }
      } else {
        box(g, [sign * (reach + depth / 2), top, 0], [depth, 0.6, len + 8], [0.06,0.07,0.09]);
        box(g, [sign * reach, top - 0.45, 0], [0.4, 0.35, len + 8], [1.25,1.18,0.95]);
        box(g, [sign * (reach + depth), top / 2, 0], [0.8, top, len + 8], [0.09,0.1,0.13]);
        // Même ruban lumineux sur les virages pour une enceinte homogène.
        box(g, [sign * (reach + depth - 0.38), top + 0.08, 0], [0.12, 0.095, len + 7.6], [1.25, 1.02, 0.76]);
      }
    };
    stand('x', -1); stand('x', 1); stand('z', -1); stand('z', 1);
    // Virages en arc de cercle : l'enceinte forme un « bowl » continu comme les stades modernes.
    const cornerStand = (sx, sz) => {
      const cx = sx * 55, cz = sz * 35, dirOf = a => [sx * Math.cos(a), 0, sz * Math.sin(a)];
      const tiers = [{ rows: lower, r0: 2.4, h0: 1.2 }, { rows: upper, r0: 2.4 + lower * 0.85 + 2.6, h0: 1.2 + lower * 0.45 + 3.2 }];
      const P = (a, r, y) => { const d = dirOf(a); return [cx + d[0] * r, y, cz + d[2] * r]; };
      const awayCorner = sx > 0 && sz > 0;
      for (const [t, tier] of tiers.entries()) {
        for (let r = 0; r < tier.rows; r++) {
          const ri = tier.r0 + r * 0.85, h = tier.h0 + r * 0.45, col = r % 2 ? concreteA : concreteB;
          const segs = Math.max(4, Math.ceil(ri * Math.PI / 2 / 1.6));
          for (let k = 0; k < segs; k++) {
            const a0 = k / segs * Math.PI / 2, a1 = (k + 1) / segs * Math.PI / 2, am = (a0 + a1) / 2, dm = dirOf(am);
            quad(g, P(a0, ri, h), P(a1, ri, h), P(a1, ri + 0.85, h), P(a0, ri + 0.85, h), col, [0, 1, 0]);
            quad(g, P(a0, ri, h - 0.45), P(a1, ri, h - 0.45), P(a1, ri, h), P(a0, ri, h), col, [-dm[0], 0, -dm[2]]);
          }
          const n = Math.floor(ri * Math.PI / 2 / spacing);
          for (let k = 0; k < n; k++) {
            const a = (k + 0.5) / n * Math.PI / 2, d = dirOf(a), facing = [-d[0], 0, -d[2]];
            if (Math.abs((k % 22) - 11) < 0.6) continue; // escalier
            const [px, , pz] = P(a, ri + 0.35, h);
            const pal = awayCorner ? awayPalette : fanPalette;
            if (rand() < 0.07) { seatBlock(g, px, h, pz, facing, awayCorner ? away : home); continue; }
            currentAnim = 0.001 + rand();
            spectator(g, px, h, pz, facing, pal[Math.floor(rand() * pal.length)], skin[Math.floor(rand() * skin.length)], rand() < 0.16 ? (awayCorner ? awayTrim : homeTrim) : null);
            currentAnim = 0; fans++;
          }
        }
        if (t === 0 && tier.rows) {
          const rb = tier.r0 + tier.rows * 0.85 + 0.6, hb = tier.h0 + tier.rows * 0.45 + 1.1, segs = 10;
          for (let k = 0; k < segs; k++) {
            const a0 = k / segs * Math.PI / 2, a1 = (k + 1) / segs * Math.PI / 2, dm = dirOf((a0 + a1) / 2), nn = [-dm[0], 0, -dm[2]];
            quad(g, P(a0, rb, hb - 0.8), P(a1, rb, hb - 0.8), P(a1, rb, hb + 0.8), P(a0, rb, hb + 0.8), [0.07,0.08,0.1], nn);
            quad(g, P(a0, rb - 0.27, hb - 0.5), P(a1, rb - 0.27, hb - 0.5), P(a1, rb - 0.27, hb + 0.45), P(a0, rb - 0.27, hb + 0.45), home.map(v => v * 0.9), nn);
          }
        }
      }
      // toit en arc, rampe lumineuse et mur arrière
      const top = 1.2 + lower * 0.45 + 3.2 + upper * 0.45 + 3.6, reach = 6.4, depth = (lower + upper) * 0.85 + 8, segs = 12;
      for (let k = 0; k < segs; k++) {
        const a0 = k / segs * Math.PI / 2, a1 = (k + 1) / segs * Math.PI / 2, dm = dirOf((a0 + a1) / 2);
        quad(g, P(a0, reach, top), P(a1, reach, top), P(a1, reach + depth, top), P(a0, reach + depth, top), [0.06,0.07,0.09], [0, -1, 0]);
        quad(g, P(a0, reach, top - 0.6), P(a1, reach, top - 0.6), P(a1, reach, top - 0.3), P(a0, reach, top - 0.3), [1.25,1.18,0.95], [-dm[0], 0, -dm[2]]);
        quad(g, P(a0, reach + depth, 0), P(a1, reach + depth, 0), P(a1, reach + depth, top), P(a0, reach + depth, top), [0.09,0.1,0.13], [-dm[0], 0, -dm[2]]);
      }
      // Écran géant suspendu sous le toit, face au terrain.
      if (sx === sz) {
        const d = dirOf(Math.PI / 4), c = P(Math.PI / 4, reach + 1.2, top - 3.2), side = [-d[2], 0, d[0]], f = [-d[0], 0, -d[2]];
        const corner = (u, v, w = 0) => [c[0] + side[0] * u + f[0] * w, c[1] + v, c[2] + side[2] * u + f[2] * w];
        quad(g, corner(-5.4, -2.6, -0.05), corner(5.4, -2.6, -0.05), corner(5.4, 2.6, -0.05), corner(-5.4, 2.6, -0.05), [0.03,0.035,0.045], f);
        quad(g, corner(-5, -2.2), corner(5, -2.2), corner(5, 2.2), corner(-5, 2.2), [0.05,0.1,0.18], f);
        quad(g, corner(-5, 1.2, 0.02), corner(5, 1.2, 0.02), corner(5, 2.2, 0.02), corner(-5, 2.2, 0.02), home.map(v => Math.min(1.4, v * 1.25)), f);
        quad(g, corner(-1.6, -1.3, 0.02), corner(1.6, -1.3, 0.02), corner(1.6, 0.6, 0.02), corner(-1.6, 0.6, 0.02), [1.2, 1.2, 1.15], f);
        quad(g, corner(-4.6, -1.3, 0.02), corner(-2.2, -1.3, 0.02), corner(-2.2, 0.6, 0.02), corner(-4.6, 0.6, 0.02), home.map(v => Math.min(1.3, v * 1.2)), f);
        quad(g, corner(2.2, -1.3, 0.02), corner(4.6, -1.3, 0.02), corner(4.6, 0.6, 0.02), corner(2.2, 0.6, 0.02), away.map(v => Math.min(1.3, v * 1.2)), f);
      }
    };
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) cornerStand(sx, sz);
    this.fanCount = fans;
    // Stadium lighting towers, lamp banks and a broadcast gantry.
    // Pylônes d'éclairage derrière l'enceinte (diagonales), têtes orientées vers la pelouse.
    for(const sx of [-1,1]) for(const sz of [-1,1]){
      const x=sx*82, z=sz*62, H=44;
      cylinder(g,[x,0,z],[x,H,z],0.9,[0.24,0.28,0.33],8,0.45);
      const f=[-sx*0.8,0,-sz*0.6], side=[-f[2],0,f[0]];
      const C=(u,v,w=0)=>[x+side[0]*u+f[0]*w, H+v, z+side[2]*u+f[2]*w];
      quad(g,C(-4.5,-2),C(4.5,-2),C(4.5,2.2),C(-4.5,2.2),[0.2,0.23,0.27],f);
      for(let i=0;i<6;i++) for(let j=0;j<3;j++) sphere(g,C(-3.75+i*1.5,-1.2+j*1.3,0.25),[0.5,0.42,0.3],[1.5,1.38,1.05],6,4);
    }
    // Subtle technical area and benches outside the touchline.
    // Bancs de touche face caméra (côté tribune lointaine) : abri, sièges aux couleurs du club, remplaçants assis.
    const benchKits=[[home,homeTrim],[away,awayTrim]];
    [-1,1].forEach((sx,ti)=>{
      const [col,tr]=benchKits[ti], cx=sx*6.6, cz=-36.9;
      box(g,[cx,0.04,cz],[7.2,0.08,1.9],[0.16,0.17,0.2]);
      box(g,[cx,1.05,cz-0.85],[7.2,2.1,0.12],[0.07,0.08,0.1]);
      box(g,[cx-3.55,1.05,cz],[0.1,2.1,1.8],[0.12,0.13,0.16]); box(g,[cx+3.55,1.05,cz],[0.1,2.1,1.8],[0.12,0.13,0.16]);
      box(g,[cx,2.12,cz+0.05],[7.4,0.08,1.95],col.map(v=>v*0.55));
      box(g,[cx,1.98,cz+0.95],[7.4,0.2,0.06],tr);
      for(let k=0;k<7;k++){ const x=cx-3.0+k*1.0; box(g,[x,0.45,cz-0.4],[0.8,0.1,0.55],col); box(g,[x,0.78,cz-0.7],[0.8,0.6,0.08],col.map(v=>v*0.8));
        if(k%3!==1) spectator(g,x,0.45,cz-0.25,[0,0,1],tr.map(v=>v*0.9+0.05),[[0.55,0.36,0.24],[0.35,0.22,0.15],[0.75,0.55,0.4]][k%3],null); }
      // Zone technique tracée au sol.
      box(g,[cx,0.012,-35.15],[8,0.02,0.06],[0.85,0.88,0.84]);
    });
    // Table du quatrième arbitre entre les deux bancs.
    box(g,[0,0.45,-36.7],[1.6,0.9,0.7],[0.1,0.11,0.14]); box(g,[0,0.92,-36.7],[1.7,0.05,0.8],[0.85,0.85,0.88]);
    // Central broadcast camera platform and scoreboard.
    box(g,[0,17.3,-54],[20,1.2,2.2],[0.06,0.08,0.12]);
    box(g,[0,21,-55.4],[18,4.8,0.55],[0.025,0.04,0.075]);
    box(g,[0,21.2,-55.05],[15.5,3.1,0.08],[0.52,0.045,0.08]);
  }
  setQuality(quality) {
    const next = quality || 'high';
    if (next === this.qualityName || this.lost) return;
    this.qualityName = next;
    this.quality = get3DQualityProfile(next);
    this.staticGeometry = makeGeometry();
    this.buildStadium(this.match);
    this.uploadStatic();
    this.resize();
  }
  uploadStatic() {
    const gl=this.gl, data=new Float32Array(this.staticGeometry);
    gl.bindBuffer(gl.ARRAY_BUFFER,this.staticBuffer);
    gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);
    this.staticCount=data.length/VERTEX_FLOATS;
    this.staticGeometry.length=0;
  }
  // Projection d'un point du terrain (x, y, hauteur) vers l'écran de la couche d'interface.
  project(x, y, z, width, height) {
    const m=this.lastVP; if(!m) return null;
    const v=[x,z,-y,1], out=[0,0,0,0];
    for(let r=0;r<4;r++) out[r]=m[r]*v[0]+m[4+r]*v[1]+m[8+r]*v[2]+m[12+r]*v[3];
    if(out[3]<=0.01) return null;
    return [(out[0]/out[3]+1)/2*width, (1-out[1]/out[3])/2*height];
  }
  resize() {
    if(this.lost) return;
    const rect=this.hostCanvas.getBoundingClientRect();
    const dpr=Math.min(window.devicePixelRatio||1,this.quality.pixelRatio);
    const w=Math.max(1,Math.round((rect.width||window.innerWidth)*dpr));
    const h=Math.max(1,Math.round((rect.height||window.innerHeight)*dpr));
    if(this.canvas.width!==w||this.canvas.height!==h){
      this.canvas.width=w;this.canvas.height=h;
      this.gl.viewport(0,0,w,h);
    }
    this.width=w;this.height=h;
  }
  worldPoint(x,y,forward,up,side,yaw) {
    const c=Math.cos(yaw),s=Math.sin(yaw);
    const lx=forward, lz=side;
    return [x+c*lx-s*lz, up, -y+s*lx+c*lz];
  }
  addPlayer(g, match, player, frame, index) {
    const pose=getPlayer3DPose(player,frame);
    const smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
    // Lissage des articulations : chaque angle rejoint sa cible en douceur (plus de poses qui « sautent »).
    const rig=player._rig||(player._rig={}), rdt=this._rigDt||0;
    const sm=(k,v,rate)=>{ const p=rig[k]; if(!Number.isFinite(p)||!Number.isFinite(v)||Math.abs(v-p)>2.5){ rig[k]=v; return v; } const r=p+(v-p)*(1-Math.exp(-rdt*rate)); rig[k]=r; return r; };
    const x=pose.x,z=-pose.y,yaw=-pose.heading;
    const cos=Math.cos(yaw),sin=Math.sin(yaw);
    // Transformation du corps entier (plongeon, tacle glissé, déséquilibre, feinte) autour d'un pivot.
    let BR=null;
    const rotV=(v)=>{ if(!BR) return v; let [f,h,sd]=v;
      const f1=f*BR.cp-h*BR.sp, h1=h*BR.cp+f*BR.sp;
      return [f1, h1*BR.cr-sd*BR.sr, sd*BR.cr+h1*BR.sr]; };
    const point=(f,h,side)=>{
      if(BR){ const r=rotV([f,h-BR.ph,side]); f=r[0]+BR.fo; h=r[1]+BR.ph+BR.ho; side=r[2]+BR.so; }
      return [x+cos*f-sin*side,h,-pose.y+sin*f+cos*side]; };
    const side0=player.team===0?match.teams[0]:match.teams[1];
    const kit=player.kitOverride||(player.isGK?(side0.gkKit||side0.kit):side0.kit);
    const shirt=parseColor(kit?.shirt,[0.8,0.1,0.1]), trim=parseColor(kit?.trim,[0.95,0.88,0.72]);
    const shorts=parseColor(kit?.shorts||kit?.trim,[0.08,0.1,0.13]);
    const kitAlt=parseColor(kit?.alt,trim), shirtPat=player.isOfficial?shirt:kitPatternColor(kit,shirt,kitAlt,parseColor(kit?.alt2,kitAlt)), sleeveCol=kit?.sleeves?parseColor(kit.sleeves,shirt):(kit?.pattern==='hoops'?kitAlt:shirt);
    const skinPalette=[[0.91,0.72,0.57],[0.78,0.55,0.39],[0.62,0.39,0.25],[0.43,0.27,0.19],[0.3,0.19,0.14],[0.84,0.64,0.48]];
    const skinSeed=nameHash((player.id??'')+'|'+(player.name||index));
    const skin=parseColor(player.skin,skinPalette[(skinSeed>>>5)%skinPalette.length]), dark=[0.035,0.045,0.06], sock=player.sockColor||parseColor(kit?.socks,shirt.map(v=>v*0.92));
    const detail=this.quality.detail;
    const physique=clamp(Number(player.a?.phy)||50,0,100)/100;
    const build=0.98+physique*0.18;
    let look=playerLook(player,index);
    // Récompense cosmétique : chaussures de l'équipe du joueur humain.
    const bs=match.settings?.bootColors; if(bs&&player.team===match.userSide&&!player.isOfficial) look={...look,boot:parseColor(bs[0],look.boot),bootAccent:parseColor(bs[1],look.bootAccent)};
    const hair=look.hair;
    const phase=pose.phase, lift=pose.jump+pose.celebrateHop, slide=pose.slide, dive=pose.dive;
    const action=getPlayer3DActionWeights(pose);
    const low=0;
    const keeperVertical=player.isGK?dive*clamp(pose.diveHeight,-1,1)*0.19:0;
    const keeperFlightLow=player.isGK?action.diveFlight*0.085+action.diveLanding*0.035:0;
    const bodyY=1.22-low*0.43-(player.isGK&&!(player.isGK&&dive>0.015)&&pose.speed<4&&!pose.keeperCatch&&!pose.keeperPunch?0.85*0.17:0)+lift-action.stumble*0.065+keeperVertical-keeperFlightLow+action.headerDrive*0.035+pose.bodyBob+
      pose.idle*Math.sin((Number(match.clock)||0)*2.3+index*1.7)*0.009;
    // ---- Intentions de geste : frappe, passe, lob, tête, touche, armement de la frappe ----
    const style=pose.kickStyle;
    const kicking=pose.kick>0.005&&style!=='header'&&style!=='throw'&&style!=='volley'&&style!=='bicycle';
    const acroK=pose.acroKind, acroQ=acroK===2?1-clamp(pose.acroT/0.95,0,1):acroK===1?1-clamp(pose.acroT/0.6,0,1):1, acroOn=acroK>0&&pose.acroT>0.005;
    const throwing=(pose.kick>0.005&&style==='throw');
    const holdingThrow=match.setPiece==='throw'&&match.ball?.owner===player;
    const kp=clamp(pose.kickProgress,0,1);
    const windup=(!kicking&&player===match.selected&&match.input?.shooting&&match.ball?.owner===player)
      ?clamp(Number(match.input.shootHold)||0,0,1):0;
    // Enveloppe du geste : montée rapide après le contact puis retour au calme.
    const strikeShape=kicking?Math.sin(clamp(kp/0.3,0,1)*Math.PI/2)*(1-smooth((kp-0.45)/0.55)):0;
    const hp=clamp(pose.headerProgress,0,1);
    const heading=pose.header>0.005;
    const headSnap=heading?Math.sin(clamp(hp/0.22,0,1)*Math.PI/2)*(1-smooth((hp-0.25)/0.75)):0;
    const airborne=clamp(pose.jump/0.3,0,1);
    const archPre=!heading?-0.2*airborne:0;
    const kickLean=kicking?strikeShape*(style==='lob'?-0.13:style==='shot'?0.11+pose.kickPower*0.05:0.05):-windup*0.07;
    const lean=pose.lean+pose.accelerationLean+kickLean+headSnap*0.4+archPre+
      action.stumble*0.12+action.brace*0.035+(player.isGK?action.diveFlight*0.045:0);
    const gkReadyLean=player.isGK&&!(dive>0.015)&&pose.speed<4?0.2:0;
    const tilt=sm('tilt',clamp(lean*1.15+gkReadyLean,-0.45,0.6),12);
    // Le gardien accompagne le plongeon avec une translation du buste et des bras
    // dans le sens réel du tir ; les joueurs de champ amortissent les contacts.
    const diveSide=Math.sign(-pose.diveDir*Math.cos(yaw))||1;
    const bodySide=(player.isGK?diveSide*action.diveReach*0.42:0)+
      (pose.stumbleDir||1)*action.stumble*0.075+
      (pose.contactDir||1)*pose.contact*0.045+
      (pose.slideDir||1)*action.tackleReach*0.13+pose.turnLean*0.55;
    // ---- Rotations globales ----
    const diveP=1-dive, diving=player.isGK&&dive>0.015;
    const rollAmt=diving?smooth(diveP/0.22)*(1-smooth((diveP-0.86)/0.14)):0;
    const slideAmt=action.slideLunge*(slide>0.015?1:0);
    const skillP=1-pose.skill, skillOn=pose.skill>0.01;
    let roll=0,pitch=0,ph=0.95,fo=0,ho=0,so=0;
    if(rollAmt>0){
      roll+=diveSide*rollAmt*1.32;
      ho+=rollAmt*(-0.62+(clamp(pose.diveHeight,-1,1)+1)*0.42)+action.diveFlight*0.22*(pose.diveHeight>-0.5?1:0.3);
      so+=diveSide*rollAmt*(0.35+pose.diveStretch*0.55);
    }
    if(slideAmt>0){ pitch+=1.05*slideAmt; ph=0.8; ho-=0.4*slideAmt; fo+=0.3*slideAmt; }
    if(action.stumble>0){ pitch-=0.32*action.stumble; roll+=(pose.stumbleDir||1)*0.18*action.stumble; }
    // Célébration finale du buteur : glissade à genoux (1), avion (2), cœur (3), doigt vers le ciel (4).
    const celF=clamp(Number(player.celebFinal)||0,0,1), celK=player.celebKind|0;
    if(celF>0&&celK===1){ pitch-=0.32*celF; ho-=0.4*celF; }
    if(celF>0&&celK===2){ roll+=Math.sin(performance.now()/260)*0.22*celF; }
    if(skillOn){ roll+=pose.skillDir*0.3*Math.sin(skillP*Math.PI*2)*(1-skillP*0.4); }
    const kfs=pose.kickFootSide||((index%2===0)?-1:1);
    if(kicking&&style==='curl'){ roll+=-kfs*0.24*Math.sin(clamp(pose.kickProgress/0.3,0,1)*Math.PI/2)*(1-smooth((pose.kickProgress-0.45)/0.55)); }
    // Reprise de volée : buste couché sur le côté opposé, jambe qui fouette à l'horizontale.
    if(acroOn&&acroK===1){ const v=Math.sin(clamp(acroQ/0.3,0,1)*Math.PI/2)*(1-smooth((acroQ-0.55)/0.45)); roll+=-kfs*0.85*v; ho+=0.12*v; }
    // Retourné : bascule complète vers l'arrière en l'air, ciseau des jambes, réception sur le dos.
    if(acroOn&&acroK===2){
      const up=Math.sin(clamp(acroQ/0.42,0,1)*Math.PI/2);
      pitch+=up*2.45-smooth((acroQ-0.55)/0.45)*0.9; ph=0.95;
      ho+=Math.sin(Math.min(acroQ,0.6)/0.6*Math.PI/2)*0.95-smooth((acroQ-0.5)/0.5)*1.45;
    }
    if(Math.abs(roll)+Math.abs(pitch)+Math.abs(ho)+Math.abs(so)+Math.abs(fo)>0.002)
      BR={cp:Math.cos(pitch),sp:Math.sin(pitch),cr:Math.cos(roll),sr:Math.sin(roll),ph,fo,ho,so};
    const bodyPoint=(f,h,side)=>point(f,h,side+bodySide);
    const legPoint=(f,h,side)=>point(f,h,side+bodySide*0.48);
    // Ellipsoïdes orientés dans le repère du joueur (avant, haut, côté), avec inclinaison du buste.
    const F=[cos,0,sin], S=[-sin,0,cos];
    const toW=v=>[F[0]*v[0]+S[0]*v[2],v[1],F[2]*v[0]+S[2]*v[2]];
    const ell=(c,rf,ru,rs,color,seg,rings,t=0,yawOff=0)=>{
      const cy=Math.cos(yawOff),sy=Math.sin(yawOff),ct=Math.cos(t),st=Math.sin(t);
      const fL=[cy*ct,-st,sy*ct], uL=[cy*st,ct,sy*st], sL=[-sy,0,cy];
      orientedEllipsoid(g,c,toW(rotV(fL)),toW(rotV(uL)),toW(rotV(sL)),rf,ru,rs,color,seg,rings);
    };
    // Ombre douce : noyau sombre sous les pieds, halo plus clair étiré vers l'arrière (projecteurs).
    const up=[[0,1,0],[0,1,0],[0,1,0]];
    // Ombres de match en nocturne : une ombre étirée par pylône d'éclairage (4 coins) + noyau sombre au pied.
    {
      const so2=(BR?BR.so:0)+bodySide, px=x-sin*so2, pz=z+cos*so2;
      const lift0=clamp(1-((BR?BR.ho:0)+pose.jump*1.5)*0.6,0.35,1);
      const ellipse=(cx,cz,ux,uz,ra,rb,col,yy,seg)=>{ for(let i=0;i<seg;i++){ const a=i/seg*Math.PI*2,b=(i+1)/seg*Math.PI*2;
        const P=t=>[cx+ux*Math.cos(t)*ra-uz*Math.sin(t)*rb,yy,cz+uz*Math.cos(t)*ra+ux*Math.sin(t)*rb];
        triangle(g,[cx,yy,cz],P(a),P(b),col,up);} };
      // Teinte prise sur la bande de tonte sous le joueur : ombre douce, jamais de tache noire.
      const band=(Math.floor((px+52.5)/5.25)%2+2)%2?1.06:0.955, grass=[0.125*band,0.375*band,0.15*band];
      const shade=k=>[grass[0]*k,grass[1]*k,grass[2]*k];
      const shMode=(this.wx||{}).shadows||'flood';
      if(shMode==='sun'){ const ux=0.8,uz=-0.6; ellipse(px+ux*0.95,pz+uz*0.95,ux,uz,1.0*lift0,0.2,shade(0.62),0.04,10); }
      if(shMode==='flood'&&(detail>0||player===match.selected)) for(const [tx,tz] of [[-53,-42],[53,-42],[-53,42],[53,42]]){
        let ux=px-tx,uz=pz-tz; const L=Math.hypot(ux,uz)||1; ux/=L; uz/=L;
        ellipse(px+ux*0.55,pz+uz*0.55,ux,uz,0.6*lift0,0.13,shade(0.8),0.04,8);
      }
      ellipse(px,pz,1,0,0.33*lift0,0.23*lift0,shade(shMode==='soft'?0.62:0.52),0.046,12);
    }
    if(player===match.selected&&!match.breakShow&&!match.ceremony){
      ring(g,x,0.085,z,0.58,[0.94,0.78,0.24],22,0.045);
      sphere(g,[x,0.13,z],[0.08,0.025,0.08],[1,0.9,0.3],6,3);
    }
    const shotIn=!!(match.ball?.inFlightShot&&match.ball.inFlightShot.team!==player.team);
    const ready=player.isGK&&!diving&&pose.speed<4&&!pose.keeperCatch&&!pose.keeperPunch?(shotIn?1:0.85):0;
    const gkSet=ready&&shotIn?1:0;
    const hipY=0.83-low*0.28+lift-ready*0.12-gkSet*0.06;
    const shoulderY=bodyY+0.23;
    const torsoF=lean*0.45;
    // ---- Buste : poitrine, épaules, bassin (vraies proportions, orientés avec le joueur) ----
    // LOD par joueur : pleine résolution près de la caméra (action, ralentis, gros plans), allégée au loin.
    const camE=this.lastCamera?.eye, camDist=camE?Math.hypot(x-camE[0],(-pose.y)-camE[2],1.1-camE[1]):0;
    const hi=detail===2&&camDist<36;
    // Rotation des épaules opposée au bassin pendant la course.
    const twist=-Math.sin(phase)*0.22*clamp(pose.speed/8.5,0,1)*action.gait*(1-pose.idle)*(pose.kick>0.005?0:1);
    // Silhouette athlétique en V : taille fine, poitrine et épaules larges.
    ell(bodyPoint(torsoF,bodyY+0.03,0),0.128*build,0.3-low*0.08,0.18*build,shirtPat,hi?20:12,hi?10:7,tilt,twist*0.5);
    ell(bodyPoint(torsoF+tilt*0.1,bodyY+0.19,0),0.135*build,0.14,0.27*build,kit?.sleeves?sleeveCol:shirtPat,hi?20:12,hi?6:5,tilt,twist);
    ell(bodyPoint(lean*0.3,hipY+0.02,0),0.125*build,0.15,0.2*build,shorts,hi?12:8,hi?6:5,tilt*0.5);
    // Bas du maillot qui tombe droit sur le short (plus de taille de guêpe).
    ell(bodyPoint(lean*0.32+torsoF*0.15-0.012,hipY+0.2,0),0.112*build,0.17,0.19*build,shirtPat,hi?20:12,hi?7:5,tilt*0.6,twist*0.25);
    // Col double : liseré contrasté pour donner une finition textile au maillot.
    cylinder(g,bodyPoint(torsoF+tilt*0.14,bodyY+0.295,0),bodyPoint(torsoF+tilt*0.16,bodyY+0.33,0),0.086,trim,hi?14:8,0.08);
    if(detail>0){
      const seam=kit?.seam?parseColor(kit.seam,kitAlt):kitAlt;
      // Coutures d'épaules et passepoils latéraux, visibles en gros plan sans surcharger le modèle.
      for(const side of [-1,1]){
        cylinder(g,bodyPoint(torsoF+0.105,bodyY+0.245,side*0.19),bodyPoint(torsoF+0.035,bodyY+0.29,side*0.105),0.0075,seam,6,0.012);
        cylinder(g,bodyPoint(torsoF+0.105,bodyY-0.12,side*0.155),bodyPoint(torsoF+0.112,hipY+0.17,side*0.155),0.006,seam,6,0.01);
      }
      // Fine bande sous le col : effet de finition cousue.
      cylinder(g,bodyPoint(torsoF+tilt*0.15,bodyY+0.282,0),bodyPoint(torsoF+tilt*0.15,bodyY+0.29,0),0.088,seam,hi?14:8,0.01);
      // Écusson sur le cœur.
      ell(bodyPoint(torsoF+0.128*build+tilt*0.06,bodyY+0.17,-0.09),0.012,0.034,0.028,trim,6,4,tilt);
      // Petits points de couture au bas du maillot, devant et dans le dos.
      for(const facing of [-1,1]){
        const hemF=torsoF+facing*0.145+tilt*0.12;
        for(let stitch=0;stitch<12;stitch++){
          const side=-0.105+stitch*0.019;
          const a=bodyPoint(hemF,hipY+0.045,side);
          const b=bodyPoint(hemF,hipY+0.045,side+0.009);
          tube(g,a,b,0.0025,seam,4);
        }
      }
    }
    // Numéros : petit devant, grand dans le dos (lisible quand le joueur s'éloigne).
    if(!player.isOfficial) addKitNumber(g,bodyPoint,torsoF+0.142*build+tilt*0.02,bodyY+0.05,player.num,trim,detail===0?0.6:0.72,-1);
    if(!player.isOfficial) addKitNumber(g,bodyPoint,torsoF-0.142*build-tilt*0.02,bodyY+0.06,player.num,trim,detail===0?1:1.25,1);
    // ---- Jambes : squelette cuisse/tibia (cinématique directe) ----
    const kickFootSide=pose.kickFootSide||((index%2===0)?-1:1);
    const touchSide=pose.firstTouchDir>=0?kickFootSide:-kickFootSide;
    const L1=0.37, L2=0.36;
    const sp=clamp(pose.speed/8.5,0,1)*action.gait;
    const reach=style==='shot'?1.0+pose.kickPower*0.3:style==='curl'?0.95:style==='lob'?1.05:0.55+pose.kickPower*0.2;
    const legAngles=[];
    for(const side of [-1,1]){
      const ph=(pose.backpedal>0.5?-phase:phase)+(side>0?Math.PI:0);
      // Foulée : la cuisse balance, le genou plie surtout pendant le retour de la jambe.
      // Amplitude de foulée liée à la longueur de pas réelle (évite les pieds qui « patinent »).
      const stride=clamp(0.06+0.095*pose.speed,0.06,0.88)*action.gait*(1-pose.backpedal*0.45);
      let th=Math.sin(ph)*stride*(1-pose.idle*0.85);
      let fl=0.13+pose.idle*0.06+(0.12+1.05*sp)*Math.pow(Math.max(0,Math.cos(ph+0.35)),1.5)*(1-pose.idle);
      const isKickLeg=side===kickFootSide;
      if(kicking){
        const w=1-smooth((kp-0.7)/0.3);
        if(isKickLeg){
          const th1=kp<0.3?0.15+(reach-0.15)*Math.sin(kp/0.3*Math.PI/2):reach*(1-smooth((kp-0.3)/0.7));
          const fl1=kp<0.3?0.06:0.06+0.5*Math.sin(clamp((kp-0.3)/0.7,0,1)*Math.PI);
          th=th+(th1-th)*w; fl=fl+(fl1-fl)*w;
        } else { th=th+(-0.16-th)*w; fl=fl+(0.34-fl)*w; }
      } else if(windup>0){
        // Armement : talon remonté derrière, jambe d'appui fléchie.
        if(isKickLeg){ th+=(-0.5-th)*windup; fl+=(1.5-fl)*windup; }
        else { th+=(-0.05-th)*windup; fl+=(0.32-fl)*windup; }
      }
      if(side===touchSide){ th+=action.firstTouchAbsorb*0.32; fl+=action.firstTouchAbsorb*0.28; }
      if(airborne>0){ const a=airborne*0.85; th+=((isKickLeg?0.4:-0.08)-th)*a; fl+=((isKickLeg?0.75:1.05)-fl)*a; }
      if(pose.celebrateHop>0.02){ fl=Math.max(fl,0.5); }
      if(celF>0&&celK===1){ th+=(0.12-th)*celF; fl+=(1.72-fl)*celF; }
      if(ready>0){ th+=((gkSet?0.42:0.32)-th)*ready; fl+=((gkSet?0.95:0.78)-fl)*ready; }
      if(slideAmt>0){ const lead=side===(pose.slideDir>=0?kickFootSide:-kickFootSide); th+=((lead?0.28:-0.3)-th)*slideAmt; fl+=((lead?0.05:1.55)-fl)*slideAmt; }
      if(rollAmt>0){ th+=((side>0?0.12:-0.12)-th)*rollAmt; fl+=(0.15-fl)*rollAmt; }
      if(skillOn&&isKickLeg){ const a=Math.sin(skillP*Math.PI); th+=(0.45-th)*a; fl+=(0.95-fl)*a; }
      if(acroOn&&acroK===1){ const v=Math.sin(clamp(acroQ/0.3,0,1)*Math.PI/2)*(1-smooth((acroQ-0.6)/0.4)); if(isKickLeg){ th+=(1.45-th)*v; fl+=(0.08-fl)*v; } else { th+=(-0.05-th)*v; fl+=(0.2-fl)*v; } }
      if(acroOn&&acroK===2){ const a=smooth(acroQ/0.38), e=1-smooth((acroQ-0.7)/0.3); if(isKickLeg){ th+=((0.3+a*1.75)-th)*e; fl+=(0.1-fl)*e; } else { th+=((1.25-a*0.6)-th)*e; fl+=(0.25-fl)*e; } }
      const fastL=kicking||rollAmt>0.05||slideAmt>0.05?42:18;
      th=sm('th'+side,th,fastL); fl=sm('fl'+side,fl,fastL);
      legAngles.push([side,th,fl,isKickLeg]);
    }
    const sw=Math.sin(phase)*0.36*action.gait;
    const wOld=0;
    for(const [side,th,fl,isKickLeg] of legAngles){
      const kneeF=Math.sin(th)*L1, kneeU=hipY-Math.cos(th)*L1;
      const shinA=th-fl;
      let ankF=kneeF+Math.sin(shinA)*L2, ankU=kneeU-Math.cos(shinA)*L2;
      let kF=kneeF,kU=kneeU;
      const passIn=kicking&&isKickLeg&&(style==='pass'||style==='curl')?strikeShape:0;
      let sideOff=side*(0.115+pose.idle*0.03)-side*passIn*0.07+(skillOn&&isKickLeg?-side*0.22*Math.sin(skillP*Math.PI*2):0);
      if(wOld>0){
        // Tacles glissés, plongeons, chutes : on conserve les poses spécialisées.
        const legSw=(side<0?sw:-sw)+(isKickLeg?action.tackleReach*0.55:0);
        const oK=[legSw*0.55,0.46-low*0.15+lift*0.55-action.tackleReach*(isKickLeg?0.13:0)];
        const oA=[legSw*0.9,0.13+lift*0.25];
        kF+=(oK[0]-kF)*wOld; kU+=(oK[1]-kU)*wOld; ankF+=(oA[0]-ankF)*wOld; ankU+=(oA[1]-ankU)*wOld;
      }
      ankU=Math.max(ankU,0.075);
      const hip=legPoint(lean*0.25,hipY,side*0.11);
      const knee=legPoint(kF,kU,side*0.125);
      const ankle=legPoint(ankF,ankU,sideOff+side*0.02);
      const mid=[hip[0]+(knee[0]-hip[0])*0.55,hip[1]+(knee[1]-hip[1])*0.55,hip[2]+(knee[2]-hip[2])*0.55];
      cylinder(g,hip,mid,0.122*build,shorts,hi?12:8,0.128*build);
      if(detail>0&&!player.isOfficial) cylinder(g,legPoint(lean*0.25,hipY+0.04,side*0.205*build),[mid[0]+(legPoint(0,0,side*0.1)[0]-legPoint(0,0,0)[0]),mid[1],mid[2]+(legPoint(0,0,side*0.1)[2]-legPoint(0,0,0)[2])],0.016,trim,4,0.014);
      const legSkin=player.longPants?shorts:skin;
      cylinder(g,mid,knee,player.longPants?0.1:0.098*build,legSkin,hi?12:8,player.longPants?0.085:0.07);
      sphere(g,knee,[0.068,0.072,0.068],legSkin,6,4);
      const sockTop=[knee[0]+(ankle[0]-knee[0])*0.14,knee[1]+(ankle[1]-knee[1])*0.14,knee[2]+(ankle[2]-knee[2])*0.14];
      cylinder(g,knee,sockTop,0.07,legSkin,7,0.07);
      cylinder(g,sockTop,ankle,0.072*build,sock,hi?12:7,0.048);
      if(detail>0){ const tp=[sockTop[0]+(ankle[0]-sockTop[0])*0.18,sockTop[1]+(ankle[1]-sockTop[1])*0.18,sockTop[2]+(ankle[2]-sockTop[2])*0.18]; ring(g,sockTop[0],sockTop[1],sockTop[2],0.074,trim,10,0.014); if(!player.isOfficial) ring(g,tp[0],tp[1],tp[2],0.075,[0.92,0.92,0.9],10,0.022);
        // Mollet : léger galbe derrière le tibia.
        const cv=[sockTop[0]+(ankle[0]-sockTop[0])*0.3,sockTop[1]+(ankle[1]-sockTop[1])*0.3,sockTop[2]+(ankle[2]-sockTop[2])*0.3]; const back=legPoint(kF+Math.sin(shinA)*L2*0.3-0.035,kU-Math.cos(shinA)*L2*0.3,sideOff*0.8+side*0.03); sphere(g,[(cv[0]+back[0])/2,(cv[1]+back[1])/2,(cv[2]+back[2])/2],[0.06,0.085,0.06],sock,6,4); }
      // Chaussure : orientée avec le pied, pointe tendue pendant la frappe, ouverte pour la passe intérieure.
      const footA=(shinA+Math.PI/2)-(kicking&&isKickLeg?0.55*strikeShape:0)-(windup>0&&isKickLeg?0.6*windup:0);
      const fd=[Math.sin(footA),-Math.cos(footA)];
      const bootC=legPoint(ankF+fd[0]*0.075,Math.max(0.05,ankU+fd[1]*0.075-0.035),sideOff+side*0.02);
      const bootCol=player.isOfficial?dark:look.boot, bootAcc=player.isOfficial?dark:look.bootAccent;
      ell(bootC,0.13,0.055,0.06,bootCol,hi?10:7,hi?6:4,-(footA-Math.PI/2),passIn*side*0.9);
      if(detail>0){
        // Semelle et crampons contrastés + virgule latérale.
        ell([bootC[0],bootC[1]-0.04,bootC[2]],0.125,0.014,0.055,bootAcc,hi?8:6,3,-(footA-Math.PI/2),passIn*side*0.9);
        ell(legPoint(ankF+fd[0]*0.08,Math.max(0.05,ankU+fd[1]*0.08-0.03),sideOff+side*0.075),0.06,0.016,0.006,bootAcc,6,3,-(footA-Math.PI/2),passIn*side*0.9);
        if(hi){
          // Trois lacets fins sur le dessus : détail discret, limité aux gros plans.
          for(let lace=0;lace<3;lace++){
            const f=ankF+fd[0]*(0.035+lace*0.025), h=Math.max(0.055,ankU+fd[1]*(0.035+lace*0.025));
            const laceA=legPoint(f,h,sideOff-0.022), laceB=legPoint(f,h,sideOff+0.022);
            cylinder(g,laceA,laceB,0.0045,bootAcc,5,0.008);
            // Œillets métalliques minuscules de chaque côté des lacets.
            ell(laceA,0.0055,0.0055,0.004,bootAcc,5,3);
            ell(laceB,0.0055,0.0055,0.004,bootAcc,5,3);
          }
          // Fine couture latérale qui suit la forme de l'empeigne.
          for(const sideSign of [-1,1]){
            const seamA=legPoint(ankF+fd[0]*0.005,Math.max(0.052,ankU+fd[1]*0.005-0.01),sideOff+sideSign*0.052);
            const seamB=legPoint(ankF+fd[0]*0.095,Math.max(0.052,ankU+fd[1]*0.095-0.01),sideOff+sideSign*0.052);
            tube(g,seamA,seamB,0.0022,bootAcc,5);
          }
          // Crampons sous la semelle, répartis sous l'avant et le talon.
          for(const studF of [-0.035,0.025,0.075]){
            const stud=legPoint(ankF+fd[0]*studF,Math.max(0.035,ankU+fd[1]*studF-0.052),sideOff);
            cylinder(g,stud,[stud[0],stud[1]-0.018,stud[2]],0.009,bootAcc,5,0.008);
          }
          // Surpiqûre en arc au bout de la chaussure, visible uniquement en gros plan.
          const toeF=ankF+fd[0]*0.112, toeH=Math.max(0.052,ankU+fd[1]*0.112-0.012);
          for(let stitch=0;stitch<8;stitch++){
            const a=-0.044+stitch*0.011, b=a+0.009;
            const p0=legPoint(toeF,toeH,sideOff+a), p1=legPoint(toeF,toeH,sideOff+b);
            tube(g,p0,p1,0.0024,bootAcc,4);
          }
          // Côtes du tricot sur les chaussettes : trois reliefs fins, visibles en gros plan.
          for(let rib=1;rib<=3;rib++){
            const t=0.24+rib*0.16;
            const p=[sockTop[0]+(ankle[0]-sockTop[0])*t,sockTop[1]+(ankle[1]-sockTop[1])*t,sockTop[2]+(ankle[2]-sockTop[2])*t];
            ring(g,p[0],p[1],p[2],0.073,[0.78,0.8,0.82],10,0.006);
          }
        }
      }
    }
    // ---- Bras : épaule/coude/main (balancier opposé aux jambes, gestes d'équilibre) ----
    const A1=0.27, A2=0.25;
    const legTh={}; for(const [side,th] of legAngles) legTh[side]=th;
    for(const side of [-1,1]){
      let al=-(legTh[side]||0)*0.95*(0.6+sp*0.6), be=0.35+0.95*sp, ab=0.08+sp*0.04;
      const isKickSide=side===kickFootSide;
      // Frappe : bras côté frappe en arrière, bras opposé ouvert vers l'avant pour l'équilibre.
      const kArm=Math.max(strikeShape,windup);
      if(kArm>0){ const tA=isKickSide?-0.55:0.75, tB=isKickSide?0.45:0.55, tAb=isKickSide?0.4:0.55; al+=(tA-al)*kArm; be+=(tB-be)*kArm; ab+=(tAb-ab)*kArm; }
      // Tête et saut : coudes levés à hauteur d'épaule pour se grandir.
      const aer=Math.max(airborne,headSnap);
      if(aer>0){ al+=(1.3-al)*aer; be+=(0.75-be)*aer; ab+=(0.6-ab)*aer; }
      if(pose.celebrate>0){ const c=pose.celebrate; al+=(2.75-al)*c; be+=(0.15-be)*c; ab+=(0.35-ab)*c; }
      if(celF>0){ const c=celF; if(celK===2){ al+=(0.12-al)*c; be+=(0.05-be)*c; ab+=(1.5-ab)*c; } else if(celK===3){ al+=(1.05-al)*c; be+=(2.05-be)*c; ab+=(-0.3-ab)*c; } else if(celK===4){ if(side===1){ al+=(3.05-al)*c; be+=(0.02-be)*c; ab+=(0.1-ab)*c; } else { al+=(0.25-al)*c; be+=(0.35-be)*c; ab+=(0.12-ab)*c; } } else if(celK===1){ al+=(2.3-al)*c; be+=(0.15-be)*c; ab+=(0.95-ab)*c; } }
      if(throwing||holdingThrow){ const t=throwing?kp:0; const c=throwing?1-smooth((kp-0.6)/0.4):1; const ta=2.9-t*1.5; al+=(ta-al)*c; be+=(0.9-t*0.6-be)*c; ab+=(0.12-ab)*c; }
      if(ready>0){ al+=((gkSet?0.7:0.55)-al)*ready; be+=((gkSet?0.4:0.75)-be)*ready; ab+=((gkSet?0.85:0.5)-ab)*ready; }
      if(player.isGK&&pose.keeperCatch>0){ const c=pose.keeperCatch; al+=(1.25-al)*c; be+=(0.6-be)*c; ab+=(-0.05-ab)*c; }
      if(player.isGK&&pose.keeperPunch>0){ const c=pose.keeperPunch; al+=(2.7-al)*c; be+=(0.05-be)*c; ab+=(0.08-ab)*c; }
      if(rollAmt>0){ al+=(3.0-al)*rollAmt; be+=(0.08-be)*rollAmt; ab+=(0.12-ab)*rollAmt; }
      if(slideAmt>0){ const back=side===(pose.slideDir>=0?-kickFootSide:kickFootSide); al+=((back?-0.9:0.35)-al)*slideAmt; be+=(0.2-be)*slideAmt; ab+=((back?0.55:0.65)-ab)*slideAmt; }
      if(skillOn){ const a=Math.sin(skillP*Math.PI); ab+=0.35*a; al+=(side===pose.skillDir?-0.3:0.4)*a; }
      const sig=player.signal, sigArm=side===1;
      if(sig&&sigArm){
        if(sig==='yellow'||sig==='red'||sig==='flag'){ al=2.95; be=0.05; ab=0.12; }
        else if(sig==='foul'||sig==='penalty'||sig==='goal'||sig==='point'){ al=1.55; be=0.02; ab=sig==='goal'||sig==='point'?0.1:0.5; }
      }
      if(sig==='advantage'){ al=1.45; be=0.05; ab=0.32; } // avantage : les deux bras tendus vers l'avant
      if(sig==='head'){ al=2.5; be=2.25; ab=0.55; }
      if(sig==='board'){ al=2.75; be=0.25; ab=0.18; }
      if(sig==='clap'){ const w=Math.sin((Number(match.clock)||0)*14+index)*0.12; al=1.25; be=0.9+w; ab=-0.12; }
      if(acroOn){ const e=acroK===2?1-smooth((acroQ-0.75)/0.25):Math.sin(clamp(acroQ/0.3,0,1)*Math.PI/2)*(1-smooth((acroQ-0.6)/0.4)); const tAl=acroK===2?0.35:(side===kfs?1.1:0.5), tAb=acroK===2?1.25:(side===kfs?0.9:0.6); al+=(tAl-al)*e; be+=(0.3-be)*e; ab+=(tAb-ab)*e; }
      const leadingKeeperArm=player.isGK&&side===diveSide;
      const keeperArmReach=player.isGK?(leadingKeeperArm?action.keeperLeadReach:action.keeperBalanceReach):0;
      const keeperArmOffset=(player.isGK?(leadingKeeperArm?diveSide*keeperArmReach*0.48:-diveSide*keeperArmReach*0.16):0)*(1-rollAmt);
      const gkRaise=player.isGK?action.catchReach*0.24*(1-rollAmt):0;
      const gkU=player.isGK?(leadingKeeperArm?action.diveFlight*0.13:action.diveLanding*0.035):0;
      const spread=action.headerBrace*0.16+action.tackleReach*0.14+action.tackleArmSpread*0.14;
      { const fastA=rollAmt>0.05||kicking||heading?34:13; al=sm('al'+side,al,fastA); be=sm('be'+side,be,fastA); ab=sm('ab'+side,ab,fastA); }
      const sF0=tilt*0.12, sS0=side*0.235*build, sF=torsoF+sF0*Math.cos(twist)-sS0*Math.sin(twist), sU=shoulderY, sS=sF0*Math.sin(twist)+sS0*Math.cos(twist);
      const eF=sF+Math.sin(al)*A1*Math.cos(ab*0.6), eU=sU-Math.cos(al)*A1*Math.cos(ab*0.6), eS=sS+side*Math.sin(ab)*A1*0.55;
      const fa=al+be;
      let hF=eF+Math.sin(fa)*A2, hU=eU-Math.cos(fa)*A2, hS=eS+side*Math.sin(ab)*A2*0.4;
      const shoulder=bodyPoint(sF,sU,sS);
      const elbow=bodyPoint(eF+pose.contactDir*action.brace*0.075,eU+gkRaise*0.4+gkU,eS+side*spread+keeperArmOffset*0.68);
      const hand=bodyPoint(hF,hU+gkRaise+(player.isGK?keeperArmReach*0.12+gkU*1.1:0),hS+side*spread*1.5+keeperArmOffset*1.25);
      sphere(g,shoulder,[0.085,0.08,0.085],sleeveCol,7,5);
      addArmPose(g,shoulder,elbow,hand,sleeveCol,skin,trim,detail,!!player.isGK,!!player.longSleeve);
      // Panneau lumineux du quatrième arbitre (rouge : sortant, vert : entrant).
      if(sig==='board'&&side===1){ const bc=[(hand[0]+(-sin)*-0.3),hand[1]+0.2,(hand[2]+cos*-0.3)];
        box(g,[bc[0],bc[1]+0.13,bc[2]],[0.62,0.24,0.62*0+0.06],[1.25,0.12,0.1]); box(g,[bc[0],bc[1]-0.12,bc[2]],[0.62,0.24,0.06],[0.15,1.2,0.25]); }
      // Carton brandi ou drapeau du juge de ligne.
      if(sigArm&&(sig==='yellow'||sig==='red')) box(g,[hand[0],hand[1]+0.13,hand[2]],[0.09,0.13,0.09],sig==='red'?[1.1,0.08,0.08]:[1.25,1.05,0.1]);
      if(player.isOfficial&&player.role==='ar'&&sigArm){
        const flagUp=sig==='flag';
        const tip=flagUp?[hand[0],hand[1]+0.62,hand[2]]:bodyPoint(hF+0.32,hU-0.3,hS);
        tube(g,hand,tip,0.012,[0.85,0.85,0.85],5);
        const fc=[1.15,0.95,0.1], fc2=[1.0,0.12,0.1];
        const p1=tip, p2=[tip[0],tip[1]-0.28,tip[2]], p3=[tip[0]+0.3*Math.cos(yaw+1.57),tip[1]-0.14,tip[2]+0.3*Math.sin(yaw+1.57)];
        triangle(g,p1,p2,p3,fc); triangle(g,p1,p3,p2,fc2);
      }
    }
    // ---- Cou, tête, coiffure, visage ----
    const neckF=torsoF+tilt*0.2;
    // Cou court et puissant + trapèzes sous le maillot (silhouette d'athlète, tête proportionnée ~1/7,5 de la taille).
    cylinder(g,bodyPoint(neckF,bodyY+0.3,0),bodyPoint(neckF+headSnap*0.06,bodyY+0.45,0),0.071,skin,hi?12:8,0.064);
    if(detail>0) ell(bodyPoint(torsoF+tilt*0.15,bodyY+0.285,0),0.085,0.055,0.165*build,kit?.sleeves?sleeveCol:shirtPat,hi?14:10,5,tilt,twist);
    const HK=0.88;
    const headF=neckF+headSnap*0.13+tilt*0.08, headY=bodyY+0.545-headSnap*0.03;
    const headTilt=tilt*0.4+headSnap*0.5+archPre*0.6;
    // Regard : la tête suit le ballon (rotation limitée du cou, lissée dans le temps).
    let lookYaw=0;
    const lb=this._lookBall;
    if(lb&&!match.ceremony&&!(match.breakShow&&match.breakShow.phases[match.breakShow.idx]?.id!=='clip')&&rollAmt<0.2&&slideAmt<0.2){
      const dxr=lb[0]-x, dzr=-lb[1]-z, lf=dxr*F[0]+dzr*F[2], ls=dxr*S[0]+dzr*S[2];
      if(Math.hypot(lf,ls)>0.6) lookYaw=clamp(Math.atan2(ls,lf),-1.05,1.05);
    }
    const prevYaw=Number.isFinite(player._headYaw)?player._headYaw:lookYaw;
    const headYaw=player._headYaw=prevYaw+(lookYaw-prevYaw)*0.18;
    const cyh=Math.cos(headYaw), syh=Math.sin(headYaw);
    const headPoint=(f,h,sd)=>{ const df=f-headF; return bodyPoint(headF+df*cyh-sd*syh,h,df*syh+sd*cyh); };
    const ellH=(c,rf,ru,rs,color,seg,rings,t=0,yo=0)=>ell(c,rf,ru,rs,color,seg,rings,t,yo+headYaw);
    ellH(headPoint(headF,headY,0),0.125*HK,0.15*HK,0.112*HK,skin,hi?14:10,hi?10:7,headTilt);
    ellH(headPoint(headF-0.005,headY,-0.112*HK),0.027,0.04,0.018,skin,6,4);
    ellH(headPoint(headF-0.005,headY,0.112*HK),0.027,0.04,0.018,skin,6,4);
    addHair(g,headPoint,headF,headY-0.62,look,detail,ellH,headTilt,HK);
    if(detail>0){
      const ff=headF+0.105*HK, fy=headY, faceDetail=hi?1:0;
      // Yeux enfoncés sous des arcades légères : blanc cassé, iris brun/noir et petit reflet.
      for(const side of [-1,1]){
        const eyeSide=side*0.04;
        ellH(headPoint(ff,fy+0.03,eyeSide),0.011,0.014,0.017,[0.94,0.92,0.84],hi?8:6,4,headTilt);
        ellH(headPoint(ff+0.009,fy+0.03,eyeSide),0.007,0.009,0.008,look.eye||[0.035,0.03,0.025],6,4,headTilt);
        if(hi){
          ellH(headPoint(ff+0.015,fy+0.035,eyeSide-0.002),0.0028,0.0035,0.003,[1,0.98,0.88],5,3,headTilt);
          // Paupières supérieure et inférieure : deux lignes fines pour mieux intégrer l'œil au visage.
          const lid=skin.map(v=>v*0.78);
          tube(g,headPoint(ff-0.004,fy+0.046,side*0.06),headPoint(ff+0.012,fy+0.046,side*0.022),0.0038,lid,5);
          tube(g,headPoint(ff-0.002,fy+0.014,side*0.058),headPoint(ff+0.012,fy+0.014,side*0.025),0.0028,lid,5);
          // Pli palpébral supérieur très fin : donne du relief à l'orbite sans épaissir le contour de l'œil.
          const crease=skin.map(v=>v*0.9);
          tube(g,headPoint(ff-0.006,fy+0.061,side*0.059),headPoint(ff+0.006,fy+0.067,side*0.022),0.0022,crease,5);
        }
        tube(g,headPoint(ff-0.006,fy+0.054,side*0.068),headPoint(ff+0.008,fy+0.061,side*0.019),hi?0.012:0.009,hair,6);
        // Oreilles avec un relief interne discret.
        ellH(headPoint(headF-0.005,headY+0.005,side*0.116),0.027,0.043,0.018,skin,hi?9:6,5,headTilt);
        if(hi) ellH(headPoint(headF+0.002,headY+0.005,side*0.13),0.009,0.022,0.006,[0.48,0.27,0.2],6,4,headTilt);
      }
      // Nez sculpté en trois volumes, narines et arête douce.
      ellH(headPoint(ff+0.026,fy+0.005,0),0.024,0.044,0.025,skin,hi?10:6,5,headTilt);
      ellH(headPoint(ff+0.047,fy-0.012,0),0.026,0.021,0.027,skin,hi?10:6,5,headTilt);
      if(hi) for(const side of [-1,1])
        ellH(headPoint(ff+0.057,fy-0.025,side*0.015),0.008,0.006,0.009,[0.25,0.12,0.09],5,3,headTilt);
      // Mâchoire, pommettes et lèvres : volumes fins plutôt qu'une tête parfaitement lisse.
      ellH(headPoint(headF+0.008,headY-0.066,0),0.095,0.058,0.085,skin,hi?14:10,hi?7:5,headTilt);
      ellH(headPoint(headF+0.075,headY-0.102,0),0.028,0.025,0.036,skin,hi?8:6,4,headTilt);
      tube(g,headPoint(ff+0.036,fy-0.052,-0.025),headPoint(ff+0.036,fy-0.052,0.025),hi?0.009:0.007,[0.38,0.16,0.14],6);
      if(hi){
        // Lèvre inférieure et philtrum : détails discrets, calculés uniquement en gros plan.
        const lip=skin.map((v,i)=>Math.min(1,v*0.72+[0.09,0.035,0.03][i]));
        ellH(headPoint(ff+0.038,fy-0.063,0),0.018,0.008,0.024,lip,7,3,headTilt);
        tube(g,headPoint(ff+0.052,fy-0.014,-0.006),headPoint(ff+0.043,fy-0.038,-0.006),0.003,[0.43,0.25,0.2],5);
        tube(g,headPoint(ff+0.052,fy-0.014,0.006),headPoint(ff+0.043,fy-0.038,0.006),0.003,[0.43,0.25,0.2],5);
        // Plis nasogéniens très légers : relient naturellement les ailes du nez aux commissures.
        const fold=skin.map(v=>v*0.84);
        for(const side of [-1,1]){
          tube(g,headPoint(ff+0.048,fy-0.021,side*0.025),headPoint(ff+0.031,fy-0.048,side*0.038),0.0027,fold,5);
          ellH(headPoint(ff+0.034,fy-0.051,side*0.039),0.0045,0.004,0.004,fold,5,3,headTilt);
        }
        // Pommettes et pli sous les yeux avec une teinte chaude très subtile.
        for(const side of [-1,1]){
          ellH(headPoint(ff-0.006,fy-0.012,side*0.073),0.026,0.018,0.018,skin.map(v=>Math.min(1,v*1.035)),8,4,headTilt);
          tube(g,headPoint(ff-0.008,fy+0.008,side*0.023),headPoint(ff-0.004,fy+0.004,side*0.059),0.0035,[0.36,0.19,0.15],5);
        }
      }
    }
    // Gardien : gants renforcés.
    if(player.isGK&&detail>0) for(const side of [-1,1]) {
      // gants déjà dessinés par addArmPose (glove = true) ; brassard de poignet en couleur maillot
    }
    // Brassard de capitaine (numéro 1 de champ le plus capé : on prend le porteur du brassard s'il existe).
    if(detail>0&&player.captain) {
      const s=-1, a=bodyPoint(torsoF+0.02,shoulderY-0.1,s*0.3);
      ring(g,a[0],a[1],a[2],0.08,[0.98,0.78,0.1],10,0.025);
    }
  }
  addCrowdMotion(g, match) {
    if (this.quality.detail <= 0) return;
    const total = this.quality.crowd;
    const animated = this.quality.crowdMotion || 0;
    const kits = [
      parseColor(match.teams[0]?.kit?.shirt, [0.72,0.07,0.1]),
      parseColor(match.teams[1]?.kit?.shirt, [0.08,0.2,0.48]),
      [0.88,0.88,0.82],
      [0.72,0.07,0.1],
    ];
    const intensity = match.goalCrowdT > 0 ? 1.28 : 1;
    for (let n = 0; n < animated; n++) {
      const i = Math.floor((n + 0.5) * total / animated);
      const x = -51 + (i % 92) / 91 * 102;
      const zSide = i % 2 ? 1 : -1;
      const row = Math.floor(i / (total / this.quality.seatRows)) % this.quality.seatRows;
      const z = zSide * (39.1 + row * 1.55);
      const y = 4.55 + row * 3.0;
      const motion = get3DCrowdMotionPose(match.clock, i, intensity);
      const color = kits[(i * 7 + Math.floor(i / 7)) % kits.length];
      for (const side of [-1, 1]) {
        const shoulder = [x + side * 0.13 + motion.sway, y + 0.16, z];
        const elbow = [x + side * (0.19 + motion.armSwing), y + 0.29 + motion.armLift * 0.24, z];
        const hand = [x + side * (0.25 + motion.armSwing * 1.35), y + 0.34 + motion.armLift * 0.62, z + zSide * 0.015];
        tube(g, shoulder, elbow, 0.032, color, 5);
        tube(g, elbow, hand, 0.027, color, 5);
        sphere(g, hand, [0.045,0.05,0.045], [0.62,0.4,0.27], 5, 3);
      }
    }
  }
  updateOfficials(match) {
    const now=(typeof performance!=='undefined'?performance.now():Date.now())/1000;
    const dt=clamp(now-(this._offT||now),0,0.1); this._offT=now;
    const kit={ shirt:'#15171c', trim:'#f2d21b', shorts:'#101114' };
    if(!this.officials) this.officials=[0,1,2].map(k=>({ k, isOfficial:true, role:k?'ar':'ref', x:0, y:k===0?8:(k===1?-35.1:35.1), vx:0, vy:0, anim:0, heading:0,
      team:0, num:0, name:'Arbitre '+k, skin:['#8d5a3b','#c98d64','#5e3a26'][k], kitOverride:kit, sockColor:[0.08,0.08,0.09], a:{phy:55} }));
    const targets=getOfficialTargets(match);
    const call=match.refCall, age=call?(Number(match.clock)||0)-call.t:99;
    const live=call&&age>=0&&age<2.6;
    for(const o of this.officials){
      let t=o.k===0?targets.ref:o.k===1?targets.ar1:targets.ar2;
      if(o.k===0&&live&&call.type!=='offside'&&call.type!=='goal'&&call.type!=='advantage') t={x:clamp(call.x-2.4,-50,50),y:clamp(call.y+(call.y>0?-2:2),-32,32)};
      const dx=t.x-o.x, dy=t.y-o.y, d=Math.hypot(dx,dy);
      const vmax=o.k===0?7.2:6.5, want=d>0.4?Math.min(vmax,d*1.4):0;
      const tvx=d>0.01?dx/d*want:0, tvy=d>0.01?dy/d*want:0;
      o.vx+=(tvx-o.vx)*Math.min(1,dt*3); o.vy+=(tvy-o.vy)*Math.min(1,dt*3);
      if(o.k>0) o.vy*=0.2;
      o.x+=o.vx*dt; o.y+=o.vy*dt;
      const sp=Math.hypot(o.vx,o.vy); o.anim+=sp*1.55*dt;
      // L'arbitre regarde le jeu ; les juges de ligne courent latéralement face au terrain.
      const look=o.k===0?Math.atan2((Number(match.ball?.y)||0)-o.y,(Number(match.ball?.x)||0)-o.x):(o.k===1?Math.PI/2:-Math.PI/2);
      o.heading+=Math.atan2(Math.sin(look-o.heading),Math.cos(look-o.heading))*Math.min(1,dt*5);
      o.signal=null;
      if(live){
        if(o.k===0&&(call.type==='yellow'||call.type==='red')) o.signal=call.type;
        else if(o.k===0&&(call.type==='foul'||call.type==='penalty'||call.type==='goal'||call.type==='advantage')) o.signal=call.type;
        else if(o.k>0&&call.type==='offside'&&Math.sign(call.x||1)===(o.k===1?1:-1)) o.signal='flag';
      }
    }
  }
  // Entraîneurs, quatrième arbitre et joueur remplacé (purement visuel).
  updateStaff(match) {
    const now=(typeof performance!=='undefined'?performance.now():Date.now())/1000;
    const dt=clamp(now-(this._stT||now),0,0.1); this._stT=now;
    const suit=[{ shirt:'#1b2233', trim:'#f2f4f7', shorts:'#151a26' },{ shirt:'#2a2d33', trim:'#e9edf2', shorts:'#1c1f24' }];
    if(!this.staff) this.staff=[0,1].map(k=>({ k, isOfficial:true, role:'coach', team:k, x:(k?6.6:-6.6), y:35.55, vx:0, vy:0, anim:0, heading:-Math.PI/2,
      num:0, name:'Coach '+k, skin:['#7a4a30','#b98361'][k], kitOverride:suit[k], sockColor:[0.06,0.06,0.07], longPants:true, longSleeve:true, a:{phy:40} }))
      .concat([{ k:2, isOfficial:true, role:'fourth', team:0, x:0, y:35.6, vx:0, vy:0, anim:0, heading:-Math.PI/2, num:0, name:'Quatrième arbitre', skin:'#9a6644',
        kitOverride:{ shirt:'#15171c', trim:'#f2d21b', shorts:'#101114' }, sockColor:[0.08,0.08,0.09], longSleeve:true, a:{phy:50} }]);
    const clock=Number(match.clock)||0, bx=Number(match.ball?.x)||0;
    const goalAge=match.refCall?.type==='goal'?clock-match.refCall.t:99;
    const sub=match.subCall, subAge=sub&&sub.half===match.half?clock-sub.t:99;
    for(const o of this.staff){
      let tx=o.x, ty=35.55;
      o.signal=null; o.celebrateT=0;
      if(o.role==='coach'){
        const base=o.team?6.6:-6.6;
        // L'entraîneur arpente sa zone technique en suivant le jeu.
        tx=clamp(base+bx*0.06,base-3.2,base+3.2);
        const scored=goalAge<4.5&&match.lastGoalTeam!=null;
        if(scored&&match.lastGoalTeam===o.team){ o.celebrateT=1.4; }
        else if(scored){ o.signal='head'; }
        else { const ph=(clock*0.13+o.team*0.5)%1; if(ph<0.16) o.signal='point'; else if(ph>0.55&&ph<0.62) o.signal='clap'; }
      } else {
        tx=0;
        if(subAge>=0&&subAge<4.5){ o.signal='board'; tx=sub.team?1.2:-1.2; ty=34.6; }
        const AB=match.addBoard, abAge=AB&&AB.half===match.half?clock-AB.t:-1;
        if(abAge>=0&&abAge<5){ o.signal='board'; tx=0; ty=34.4; }
      }
      const dx=tx-o.x, dy=ty-o.y, dd=Math.hypot(dx,dy), want=dd>0.15?Math.min(o.role==='coach'?1.6:3,dd*1.5):0;
      o.vx+=((dd?dx/dd*want:0)-o.vx)*Math.min(1,dt*4); o.vy+=((dd?dy/dd*want:0)-o.vy)*Math.min(1,dt*4);
      o.x+=o.vx*dt; o.y+=o.vy*dt; o.anim+=Math.hypot(o.vx,o.vy)*1.55*dt;
      const sp=Math.hypot(o.vx,o.vy), look=sp>0.4?Math.atan2(o.vy,o.vx):-Math.PI/2;
      o.heading+=Math.atan2(Math.sin(look-o.heading),Math.cos(look-o.heading))*Math.min(1,dt*5);
    }
    // Le joueur remplacé quitte la pelouse en marchant vers son banc.
    if(sub&&subAge>=0&&subAge<9){
      if(!this.subGhost||this.subGhost._src!==sub){ const g0=sub.out; this.subGhost={ ...g0, _src:sub, kickT:0, headerT:0, jumpT:0, diveT:0, slideT:0, skillT:0, celebrateT:0, firstTouchT:0, stumbleT:0, contactT:0, x:g0.x, y:g0.y, vx:0, vy:0 }; this.subGhost._v=Math.max(1.7,Math.hypot((sub.team?3.2:-3.2)-g0.x,34.4-g0.y)/7.5); }
      const G=this.subGhost, gx=sub.team?3.2:-3.2, gy=34.4, dx=gx-G.x, dy=gy-G.y, dd=Math.hypot(dx,dy);
      if(dd<0.4||subAge>8.5) this.subGhost=null;
      else { const v=G._v||1.7; G.vx=dx/dd*v; G.vy=dy/dd*v; G.x+=G.vx*dt; G.y+=G.vy*dt; G.anim=(G.anim||0)+v*1.55*dt; G.heading=Math.atan2(dy,dx); G.face=Math.sign(dx)||1; }
    } else this.subGhost=null;
  }
  // Filets : maillage subdivisé qui se creuse autour du point d'impact du ballon puis revient en oscillant.
  addNets(g, match, frame) {
    const now=(typeof performance!=='undefined'?performance.now():Date.now())/1000;
    const bx=frame?frame.b[0]:Number(match.ball?.x)||0, by=frame?frame.b[1]:Number(match.ball?.y)||0, bz=frame?frame.b[2]:Number(match.ball?.z)||0;
    const bvx=frame?frame.b[3]:Number(match.ball?.vx)||0, bvy=frame?frame.b[4]:Number(match.ball?.vy)||0;
    const inGoal=Math.abs(bx)>52.55&&Math.abs(by)<3.75&&bz<2.6;
    const N=this.nets||(this.nets={ s:0, iy:0, iz:0, punch:0, t0:0, was:false });
    if(inGoal&&!N.was){ N.s=Math.sign(bx); N.punch=clamp(Math.hypot(bvx,bvy)/24,0.25,1)*0.85; N.t0=now; }
    N.was=inGoal;
    if(inGoal){ N.iy=bz+0.2; N.iz=-by; }
    const dtn=now-N.t0, spring=N.punch*Math.exp(-dtn*2.6)*Math.cos(dtn*9);
    const push=inGoal?clamp(Math.abs(bx)+0.25-55.2,0,1.2):0;
    const softWhite=[0.76,0.82,0.76], halfGoal=3.66, gh=2.44;
    for(const s of [-1,1]){
      const active=N.s===s&&(inGoal||dtn<2.5);
      const D=active?Math.max(push,spring*(dtn<2.5?1:0)):0, sub=active?(this.quality.detail>=1?6:3):1;
      const postX=s*52.5, backX=s*55.2;
      const def=p=>{ if(!D) return p; const back=clamp((Math.abs(p[0])-52.5)/2.7,0,1); const w=Math.exp(-((p[2]-N.iz)**2+(p[1]-N.iy)**2*1.6)/1.3)*back;
        return [p[0]+s*w*D, p[1]+w*D*0.15*(p[1]>gh*0.6?1:0), p[2]+Math.sign(p[2]-N.iz||1)*w*D*0.12]; };
      const L=(a,b,r)=>{ if(sub===1){ tube(g,a,b,r,softWhite,4); return; } let pa=def(a); for(let i=1;i<=sub;i++){ const t=i/sub, pb=def([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t]); tube(g,pa,pb,r,softWhite,4); pa=pb; } };
      for(let j=0;j<=12;j++){
        const zz=-halfGoal+j*(halfGoal*2/12);
        L([postX,gh,zz],[backX,gh*0.75,zz],0.022);
        L([backX,0,zz],[backX,gh*0.75,zz],0.018);
      }
      for(let j=1;j<=7;j++){
        const yy=gh*j/8;
        L([postX,yy,-halfGoal],[backX,yy*0.75+0*yy,-halfGoal],0.019);
        L([postX,yy,halfGoal],[backX,yy*0.75,halfGoal],0.019);
        L([backX,yy*0.75,-halfGoal],[backX,yy*0.75,halfGoal],0.018);
      }
      for(let j=1;j<=4;j++){ const xx=postX+s*2.7*j/5, hh=gh-(gh*0.25)*j/5; L([xx,hh,-halfGoal],[xx,hh,halfGoal],0.018); L([xx,0,-halfGoal],[xx,hh,-halfGoal],0.018); L([xx,0,halfGoal],[xx,hh,halfGoal],0.018); }
    }
  }
  // Traînée lumineuse derrière le ballon sur les frappes puissantes.
  addBallTrail(fx, match, frame) {
    const b=frame?{ x:frame.b[0], y:frame.b[1], z:frame.b[2], vx:frame.b[3], vy:frame.b[4] }:match.ball||{};
    const sp=Math.hypot(Number(b.vx)||0,Number(b.vy)||0);
    const T=this.trail||(this.trail=[]);
    if(sp>19&&!b.owner&&(Number(b.z)||0)<9){ T.push([Number(b.x)||0,(Number(b.z)||0)+0.24,-(Number(b.y)||0)]); if(T.length>14) T.shift(); }
    else if(T.length) T.shift();
    if(T.length<3||!this.lastCamera) return;
    const cam=this.lastCamera;
    for(let i=1;i<T.length;i++){
      const a=T[i-1], c=T[i], k0=(i-1)/(T.length-1), k1=i/(T.length-1);
      let d=[c[0]-a[0],c[1]-a[1],c[2]-a[2]]; const dl=Math.hypot(...d)||1; d=d.map(v=>v/dl);
      let v=[cam.eye[0]-c[0],cam.eye[1]-c[1],cam.eye[2]-c[2]]; const vl=Math.hypot(...v)||1; v=v.map(q=>q/vl);
      let w=[d[1]*v[2]-d[2]*v[1],d[2]*v[0]-d[0]*v[2],d[0]*v[1]-d[1]*v[0]]; const wl=Math.hypot(...w)||1; w=w.map(q=>q/wl);
      const r0=0.03+0.16*k0, r1=0.03+0.16*k1, col=[1.0,0.97,0.82], n=[v,v,v];
      const A0=[a[0]-w[0]*r0,a[1]-w[1]*r0,a[2]-w[2]*r0], A1=[a[0]+w[0]*r0,a[1]+w[1]*r0,a[2]+w[2]*r0], C0=[c[0]-w[0]*r1,c[1]-w[1]*r1,c[2]-w[2]*r1], C1=[c[0]+w[0]*r1,c[1]+w[1]*r1,c[2]+w[2]*r1];
      currentAnim=k0*0.55; pushVertex(fx,A0,v,col); pushVertex(fx,A1,v,col); currentAnim=k1*0.55; pushVertex(fx,C1,v,col);
      currentAnim=k0*0.55; pushVertex(fx,A0,v,col); currentAnim=k1*0.55; pushVertex(fx,C1,v,col); pushVertex(fx,C0,v,col);
    }
    currentAnim=0;
  }
  // Tifo géant déployé sur le virage à domicile pendant l'avant-match (déroulé de bas en haut, ondulant).
  addTifo(g, match) {
    const t=match.ceremony.t; if(t<0.4) return;
    const reveal=clamp((t-0.4)/2.4,0,1);
    const home=parseColor(match.teams?.[0]?.kit?.shirt,[0.8,0.1,0.1]), trim=parseColor(match.teams?.[0]?.kit?.trim,[0.95,0.85,0.2]);
    const rows=this.quality.detail>=2?15:this.quality.detail===1?11:7;
    const d0=57.4, d1=57.4+rows*0.85, h0=2.4, h1=1.2+rows*0.45+1.4, Z=31, nu=this.quality.detail>=1?40:24, nv=this.quality.detail>=1?10:6;
    const clock=(typeof performance!=='undefined'?performance.now():Date.now())/1000;
    const col=(u,v)=>{
      const ex=(u-0.5)*(2*Z)/(h1-h0+ (d1-d0))*1.0, ey=v-0.55;
      const r=Math.hypot(ex*0.9,ey);
      if(r<0.36){ const inA=Math.hypot(ex*0.9+0.04,ey)<0.26, inB=Math.hypot(ex*0.9-0.05,ey)<0.21, star=Math.hypot(ex*0.9-0.11,ey)<0.07; return (inA&&!inB)||star?home:trim; }
      if(r<0.4) return home;
      return Math.floor(u*12)%2?home:trim;
    };
    const P=(u,v)=>{ const d=d0+(d1-d0)*v, h=h0+(h1-h0)*v, w=Math.sin(clock*2.2+u*9+v*4)*0.12; return [-(d)-w*0.6, h+w, -Z+u*2*Z]; };
    const n=[[0.6,0.8,0],[0.6,0.8,0],[0.6,0.8,0]];
    for(let i=0;i<nu;i++) for(let j=0;j<nv;j++){
      const v0=j/nv, v1=(j+1)/nv; if(v1>reveal+0.001) continue;
      const u0=i/nu, u1=(i+1)/nu, c=col((u0+u1)/2,(v0+v1)/2);
      const a=P(u0,v0), b=P(u1,v0), cc=P(u1,v1), dd=P(u0,v1);
      triangle(g,a,b,cc,c,n); triangle(g,a,cc,dd,c,n);
    }
  }
  // Fumigènes après un but : torches rouges vacillantes et fumée aux couleurs du club qui monte et s'élargit.
  addFlares(g, match, fx = g) {
    const now=(typeof performance!=='undefined'?performance.now():Date.now())/1000;
    const call=match.refCall;
    if(call&&call.type==='goal'&&call!==this._flareCall){ this._flareCall=call; this.flareStart=now; this.flareTeam=match.lastGoalTeam??0; }
    if(this.flareStart==null) return;
    const age=now-this.flareStart; if(age>14){ this.flareStart=null; return; }
    const team=this.flareTeam, kit=match.teams?.[team]?.kit||{};
    const smokeCol=parseColor(kit.shirt,[0.8,0.1,0.1]).map(v=>v*0.6+0.38), fog=(this.wx||{}).fog||[0.2,0.25,0.34];
    const n=this.quality.detail>=2?10:this.quality.detail===1?7:4, puffs=this.quality.detail>=1?6:3;
    for(let k=0;k<n;k++){
      const h=Math.sin(k*91.7)*1000, fr=h-Math.floor(h);
      const pos=team===0?[-(57.4+2+fr*7), 1.2+(2+fr*7)/0.85*0.45+1.2, -24+k*(48/(n-1))]:[57.4+2+fr*6, 1.2+(2+fr*6)/0.85*0.45+1.2, 12+k*(18/(n-1))];
      const fade=clamp((14-age)/3,0,1);
      if(age<11){ const fl=0.7+0.3*Math.sin(now*31+k*7)*Math.sin(now*17+k); sphere(g,[pos[0],pos[1]+0.5,pos[2]],[0.32*fl,0.42*fl,0.32*fl],[1.9,0.75*fl,0.3],6,4); softPuff(fx,[pos[0],pos[1]+0.55,pos[2]],1.1*fl,[1.6,0.55,0.2],this.lastCamera,0.8); }
      for(let q=0;q<puffs;q++){
        const a=((age-q*0.55)%3.3+3.3)%3.3; if(age-q*0.55<0) continue;
        const rr=(0.45+a*0.6)*fade, c=smokeCol.map((v,i)=>v+(fog[i]-v)*clamp(a/3.3,0,0.6));
        softPuff(fx,[pos[0]+(team===0?1:-1)*a*0.8,pos[1]+0.8+a*1.6,pos[2]+Math.sin(k*3+a)*0.5],rr*2.1,c,this.lastCamera,clamp(1.15-a/3.3,0,1));
      }
    }
  }
  // Pluie : traits fins qui tombent autour de la zone filmée (géométrie dynamique légère).
  addRain(g, match) {
    const t=(typeof performance!=='undefined'?performance.now():Date.now())/1000;
    const cam=this.lastCamera, cx=cam?cam.target[0]:0, cz=cam?cam.target[2]:0;
    const n=this.quality.detail===2?900:this.quality.detail===1?560:260, col=[0.92,0.95,1.0], nrm=[[0,0,1],[0,0,1],[0,0,1]];
    for(let i=0;i<n;i++){
      const h1=Math.sin(i*12.9898)*43758.5453, h2=Math.sin(i*78.233)*12345.678, h3=Math.sin(i*39.425)*24634.6345;
      const fx=h1-Math.floor(h1), fz=h2-Math.floor(h2), fo=h3-Math.floor(h3);
      const x=cx-30+fx*60, z=cz-22+fz*44, y=((fo*16-t*17)%16+16)%16;
      const a=[x,y,z], b=[x+0.06,y+1.0,z+0.02], w=0.024;
      currentAnim=0.7;
      triangle(g,[a[0]-w,a[1],a[2]],[a[0]+w,a[1],a[2]],[b[0]+w,b[1],b[2]],col,nrm);
      triangle(g,[a[0]-w,a[1],a[2]],[b[0]+w,b[1],b[2]],[b[0]-w,b[1],b[2]],col,nrm);
      currentAnim=0;
    }
  }
  buildDynamic(match, frame) {
    { const nw=(typeof performance!=='undefined'?performance.now():Date.now())/1000; this._rigDt=clamp(nw-(this._rigT||nw),0,0.1); this._rigT=nw; }
    this._lookBall=frame?[frame.b[0],frame.b[1]]:[Number(match.ball?.x)||0,Number(match.ball?.y)||0];
    const g=this.dynamicGeometry;g.length=0; this.fxGeometry.length=0;
    let index=0;
    for(const team of match.teams) for(const player of team.ps){
      const playerFrame=frame?frame.p[index]:null;index++;
      if(player.sentOff&&!frame)continue;
      this.addPlayer(g,match,player,playerFrame,index);
    }
    if(!frame) this.updateOfficials(match);
    if(this.officials) for(const o of this.officials) if(o.y<50) this.addPlayer(g,match,o,null,90+o.k);
    if(!match.ceremony&&!(match.breakShow&&match.breakShow.phases[match.breakShow.idx]?.id!=='clip')){
      if(!frame||!this.staff) this.updateStaff(match);
      for(const o of this.staff) this.addPlayer(g,match,o,null,95+o.k);
      if(this.subGhost) this.addPlayer(g,match,this.subGhost,null,99);
    }
    this.addNets(g,match,frame);
    this.addBallTrail(this.fxGeometry,match,frame);
    if((this.wx||{}).rain) this.addRain(this.fxGeometry,match);
    if(match.ceremony) this.addTifo(g,match);
    this.addFlares(g,match,this.fxGeometry);
    const bx=frame?frame.b[0]:match.ball.x,by=frame?frame.b[1]:match.ball.y,bz=frame?frame.b[2]:match.ball.z;
    // L'ombre s'élargit et s'éclaircit à mesure que le ballon prend de la hauteur.
    const ballX=bx,ballZ=-by,ballY=Math.max(0.24,bz+0.24);
    const shadow=get3DBallShadowProfile(bz);
    const shadowColor=[
      0.08-0.045*shadow.opacity,
      0.34-0.295*shadow.opacity,
      0.14-0.10*shadow.opacity,
    ];
    for(let i=0;i<18;i++){
      const a=i/18*Math.PI*2,b=(i+1)/18*Math.PI*2;
      triangle(g,[ballX,0.06,ballZ],
        [ballX+Math.cos(a)*shadow.radiusX,0.06,ballZ+Math.sin(a)*shadow.radiusZ],
        [ballX+Math.cos(b)*shadow.radiusX,0.06,ballZ+Math.sin(b)*shadow.radiusZ],
        shadowColor,[[0,1,0],[0,1,0],[0,1,0]]);
    }
    // Ballon à panneaux qui roule réellement : rotation intégrée depuis la vitesse (roulement) et l'effet (spin).
    const now=(typeof performance!=='undefined'?performance.now():Date.now())/1000;
    const bdt=clamp(now-(this._ballT||now),0,0.1); this._ballT=now;
    const bvx=frame?frame.b[3]:(Number(match.ball.vx)||0), bvy=frame?frame.b[4]:(Number(match.ball.vy)||0), bspin=frame?frame.b[6]:(Number(match.ball.spin)||0);
    const replaySlow=frame&&match.replay?match.replay.segs?.[match.replay.seg]?.speed||0.4:1;
    const vrx=bvx, vrz=-bvy, R0=0.22;
    let wx=vrz/R0, wy=-bspin*1.5, wz=-vrx/R0;
    if(bz>0.4){ wx*=0.35; wz*=0.35; }
    this.ballRot=rotateMatrix3(this.ballRot||[1,0,0,0,1,0,0,0,1],[wx,wy,wz],bdt*(match.paused&&!frame?0:replaySlow));
    addPanelBall(g,[ballX,ballY,ballZ],R0,this.ballRot,Math.max(12,this.quality.sphereSegments+4),Math.max(8,this.quality.sphereSegments),match.settings?.ballPalette||null);
  }
  bindGeometry(buffer, geometry, usage) {
    const gl=this.gl,data=new Float32Array(geometry);
    gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
    gl.bufferData(gl.ARRAY_BUFFER,data,usage);
    this.pointAttributes();
    return data.length/VERTEX_FLOATS;
  }
  pointAttributes() {
    const gl=this.gl,stride=VERTEX_FLOATS*4;
    gl.enableVertexAttribArray(this.positionLoc);gl.vertexAttribPointer(this.positionLoc,3,gl.FLOAT,false,stride,0);
    gl.enableVertexAttribArray(this.normalLoc);gl.vertexAttribPointer(this.normalLoc,3,gl.FLOAT,false,stride,12);
    gl.enableVertexAttribArray(this.colorLoc);gl.vertexAttribPointer(this.colorLoc,3,gl.FLOAT,false,stride,24);
    if(this.animLoc>=0){gl.enableVertexAttribArray(this.animLoc);gl.vertexAttribPointer(this.animLoc,1,gl.FLOAT,false,stride,36);}
  }
  render(match, frame = null) {
    if(this.lost)return;
    this.resize();
    const gl=this.gl;
    const aspect=this.width/Math.max(1,this.height);
    const camera=get3DCameraPose(match,frame,aspect);
    this.lastCamera=camera;
    const vp=multiply4(perspective(camera.fovy,aspect,0.25,220),lookAt(camera.eye,camera.target,[0,1,0]));
    this.lastVP=vp;
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.matrixLoc,false,vp);
    // Foule : rythme permanent, explosion de joie après un but, tension sur les occasions.
    const excite=Math.max(match.ceremony?0.75:match.breakShow?0.5:match.goalCrowdT>0?1:0,match.ball?.inFlightShot?0.45:0,0.12);
    this.excite=(this.excite??0.12)+(excite-(this.excite??0.12))*0.08;
    gl.uniform1f(this.timeLoc,(match.clock||0)+(performance.now()/1000)%1000);
    gl.uniform1f(this.exciteLoc,this.excite);
    const wx=this.wx||getWeatherProfile();
    gl.uniform3f(this.fogLoc,wx.fog[0],wx.fog[1],wx.fog[2]);
    gl.uniform3f(this.fogRangeLoc,wx.fogRange[0],wx.fogRange[1],wx.fogRange[2]);
    gl.uniform3f(this.lightLoc,wx.light[0],wx.light[1],wx.light[2]);
    gl.uniform1f(this.wetLoc,wx.wet);
    gl.uniform3f(this.eyeLoc,camera.eye[0],camera.eye[1],camera.eye[2]);
    gl.uniform1f(this.rimLoc,0); gl.uniform1f(this.alphaLoc,1); gl.uniform1f(this.fxLoc,0);
    gl.bindBuffer(gl.ARRAY_BUFFER,this.staticBuffer);
    this.pointAttributes();
    gl.drawArrays(gl.TRIANGLES,0,this.staticCount);
    this.buildDynamic(match,frame);
    // Joueurs et ballon : éclairage « retransmission » (ambiance ciel/pelouse, liseré des projecteurs, reflet des tissus).
    gl.uniform1f(this.rimLoc,1);
    gl.uniform1f(this.alphaLoc,1);
    const count=this.bindGeometry(this.dynamicBuffer,this.dynamicGeometry,gl.DYNAMIC_DRAW);
    if(count)gl.drawArrays(gl.TRIANGLES,0,count);
    // Passe translucide : fumée et pluie, sans écrire la profondeur.
    if(this.fxGeometry.length){
      gl.uniform1f(this.rimLoc,0); gl.uniform1f(this.alphaLoc,0.9); gl.uniform1f(this.fxLoc,1);
      gl.enable(gl.BLEND); gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA); gl.depthMask(false);
      const fc=this.bindGeometry(this.fxBuffer,this.fxGeometry,gl.DYNAMIC_DRAW);
      if(fc)gl.drawArrays(gl.TRIANGLES,0,fc);
      gl.depthMask(true); gl.disable(gl.BLEND); gl.uniform1f(this.alphaLoc,1); gl.uniform1f(this.fxLoc,0);
    }
  }
  dispose() {
    if(this.gl){
      this.gl.deleteBuffer(this.staticBuffer);this.gl.deleteBuffer(this.dynamicBuffer);
      this.gl.deleteProgram(this.program);
    }
    if(this.canvas&&this.canvas.parentNode)this.canvas.parentNode.removeChild(this.canvas);
  }
}


// Exécute la vraie construction de la géométrie du stade sans créer de contexte WebGL.
// Utilisé en tests de régression pour contrôler les coordonnées avant le déploiement.
export function get3DStadiumMeshStats(match, quality = 'high') {
  if (!match || !Array.isArray(match.teams) || match.teams.length < 2) throw new Error('Deux équipes sont nécessaires pour construire le stade');
  const builder = Object.create(MatchRenderer3D.prototype);
  builder.quality = get3DQualityProfile(quality);
  builder.staticGeometry = makeGeometry();
  builder.buildStadium(match);
  return {
    vertexCount: builder.staticGeometry.length / VERTEX_FLOATS,
    finite: builder.staticGeometry.every(Number.isFinite),
    fans: builder.fanCount || 0,
    animatedVertices: builder.staticGeometry.filter((v, i) => i % VERTEX_FLOATS === VERTEX_FLOATS - 1 && v > 0).length,
  };
}


// Génère le maillage réel d'un joueur pour les tests de proportions et de détails.
export function getPlayer3DModelStats(match, player, quality = 'high') {
  if (!match || !Array.isArray(match.teams) || match.teams.length < 2 || !player) throw new Error('Match et joueur requis');
  const renderer = Object.create(MatchRenderer3D.prototype);
  renderer.quality = get3DQualityProfile(quality);
  const geometry = makeGeometry();
  renderer.addPlayer(geometry, match, player, null, Number(player.i) || 0);
  return { vertexCount: geometry.length / VERTEX_FLOATS, finite: geometry.every(Number.isFinite) };
}
