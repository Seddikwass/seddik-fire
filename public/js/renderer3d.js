// Football Tunisia 2026 — WebGL 3D match renderer (no external runtime dependencies).
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
  const distanceScale = 1 + portrait * 0.16;
  // Caméra de retransmission : assez proche pour lire les joueurs, assez haute
  // pour voir les lignes de passe (≈ 23 m de haut, ≈ 30 m en retrait du ballon).
  const eye = [
    targetX - 3.2 / zoom * distanceScale,
    23 / zoom * distanceScale + focusLift * 0.42,
    targetZ + 29 / zoom * distanceScale,
  ];
  const target = [targetX, focusLift, targetZ];
  return {
    eye,
    target,
    zoom,
    aspect: safeAspect,
    ballHeight,
    focusLift,
    portrait,
    fovy: safeAspect < 1.15 ? 0.9 : 0.7,
    distance: Math.hypot(eye[0] - targetX, eye[1] - target[1], eye[2] - targetZ),
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
    quad(out, aa, ba, bb, ab, color, norm3([r0[0] + r1[0], r0[1] + r1[1], r0[2] + r1[2]]));
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
    pushVertex(out, A.p, A.n, color); pushVertex(out, B.p, B.n, color); pushVertex(out, C.p, C.n, color);
    pushVertex(out, A.p, A.n, color); pushVertex(out, C.p, C.n, color); pushVertex(out, D.p, D.n, color);
  }
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
function addArmPose(out, shoulder, elbow, hand, sleeve, skin, trim, detail, glove = false) {
  cylinder(out, shoulder, elbow, 0.105, sleeve, 8, 0.075);
  cylinder(out, elbow, hand, 0.064, skin, 7, 0.045);
  if (detail > 0) {
    sphere(out, elbow, [0.072,0.072,0.072], sleeve, 6, 4);
    sphere(out, hand, glove ? [0.095,0.075,0.08] : [0.07,0.075,0.07], glove ? trim : skin, 7, 4);
  } else {
    sphere(out, hand, [0.07,0.075,0.07], glove ? trim : skin, 6, 4);
  }
}

const VS = 'attribute vec3 aPosition; attribute vec3 aNormal; attribute vec3 aColor; attribute float aAnim; uniform mat4 uViewProjection; uniform float uTime; uniform float uExcite; varying vec3 vNormal; varying vec3 vColor; varying float vDepth; void main(){ vec3 p=aPosition; if(aAnim>0.0){ float beat=sin(uTime*(4.2+fract(aAnim*7.31)*2.6)+aAnim*61.0); p.y+=max(beat,0.0)*(0.05+0.2*uExcite)*(0.4+fract(aAnim*3.7)); p.x+=sin(uTime*1.3+aAnim*17.0)*0.04; } vNormal=aNormal; vColor=aColor; if(aAnim<0.0){ float w=0.5+0.5*sin(uTime*2.4-(p.x+p.z)*0.45); vColor=aColor*(0.7+0.45*w)+vec3(0.3*uExcite*max(sin(uTime*15.0),0.0)); } gl_Position=uViewProjection*vec4(p,1.0); vDepth=gl_Position.w; }';
const FS = 'precision mediump float; uniform vec3 uFog; varying vec3 vNormal; varying vec3 vColor; varying float vDepth; void main(){ vec3 n=normalize(vNormal); vec3 sun=normalize(vec3(-0.42,0.86,0.31)); vec3 fillA=normalize(vec3(0.58,0.42,-0.66)); vec3 fillB=normalize(vec3(-0.76,0.28,-0.36)); float key=max(dot(n,sun),0.0); float rim=max(dot(n,fillA),0.0); float fill=max(dot(n,fillB),0.0); float hemi=0.5+0.5*max(n.y,0.0); float spec=pow(max(dot(n,normalize(sun+vec3(0.0,0.8,0.15))),0.0),24.0)*0.14; float lighting=0.42+0.6*key+0.18*rim+0.12*fill+0.13*hemi; vec3 lit=vColor*lighting+vec3(spec); vec3 color=pow(max(lit,vec3(0.0)),vec3(0.94)); float fog=smoothstep(48.0,170.0,vDepth)*0.55; color=mix(color,uFog,fog); gl_FragColor=vec4(color,1.0); }';

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
const HAIR_COLORS=[[0.03,0.025,0.02],[0.06,0.04,0.03],[0.13,0.08,0.045],[0.24,0.15,0.07],[0.5,0.38,0.2],[0.02,0.02,0.025]];
function nameHash(text) { let h = 2166136261; for (const ch of String(text || '')) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0; h ^= h >>> 15; h = Math.imul(h, 2246822507) >>> 0; h ^= h >>> 13; return h >>> 0; }
export function playerLook(player = {}, index = 0) {
  const h = nameHash((player.id ?? '') + '|' + (player.name || index));
  const styles = ['crop', 'crop', 'buzz', 'afro', 'fade', 'long', 'bald', 'quiff'];
  const style = styles[h % styles.length];
  const hair = HAIR_COLORS[(h >>> 4) % (style === 'afro' ? 2 : HAIR_COLORS.length)];
  return { style, hair, beard: ((h >>> 9) % 4) === 0 };
}
// Coiffure posée sur une tête de demi-axes 0.125 (avant) × 0.15 (haut) × 0.112 (côté).
function addHair(out, bodyPoint, f, bodyY, look, detail, ell, tilt = 0) {
  const c = look.hair, y = bodyY + 0.62;
  const E = (df, dy, rf, ru, rs, seg = 9, rings = 5) => ell(bodyPoint(f + df, y + dy, 0), rf, ru, rs, c, seg, rings, tilt);
  switch (look.style) {
    case 'bald': break;
    case 'buzz': E(-0.012, 0.03, 0.128, 0.13, 0.116); break;
    case 'afro': E(-0.035, 0.085, 0.16, 0.13, 0.155, 10, 6); break;
    case 'long': E(-0.025, 0.045, 0.132, 0.12, 0.12); E(-0.085, -0.05, 0.06, 0.12, 0.11, 7, 4); break;
    case 'quiff': E(-0.025, 0.045, 0.128, 0.12, 0.118); E(0.045, 0.13, 0.075, 0.05, 0.08, 7, 4); break;
    case 'fade': E(-0.02, 0.075, 0.12, 0.09, 0.105); break;
    default: E(-0.025, 0.05, 0.13, 0.12, 0.118); if (detail > 0) E(0.07, 0.1, 0.04, 0.03, 0.09, 6, 3);
  }
  if (look.beard && detail > 0) E(0.055, -0.075, 0.07, 0.06, 0.095, 7, 4);
}
function spectator(out, x, y, z, facing, shirt, skin, scarf) {
  const sx = facing[0] === 0 ? 1 : 0, sz = facing[0] === 0 ? 0 : 1;
  const off = (u, v, w) => [x + sx * u + facing[0] * w, y + v, z + sz * u + facing[2] * w];
  const n = facing;
  const panel = (u0, u1, v0, v1, w, c) => { const a = off(u0, v0, w), b = off(u1, v0, w), cc = off(u1, v1, w), d = off(u0, v1, w); pushVertex(out, a, n, c); pushVertex(out, b, n, c); pushVertex(out, cc, n, c); pushVertex(out, a, n, c); pushVertex(out, cc, n, c); pushVertex(out, d, n, c); };
  panel(-0.27, 0.27, 0.0, 0.78, 0, shirt);
  panel(-0.13, 0.13, 0.8, 1.1, 0.02, skin);
  if (scarf) panel(-0.42, 0.42, 1.22, 1.36, 0.05, scarf);
}
function seatBlock(out, x, y, z, facing, color) {
  const c = color.map(v => v * 0.55);
  box(out, [x, y + 0.2, z], facing[0] === 0 ? [0.42, 0.4, 0.38] : [0.38, 0.4, 0.42], c);
}

export class MatchRenderer3D {
  constructor(hostCanvas, match) {
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
    this.staticBuffer = gl.createBuffer();
    this.dynamicBuffer = gl.createBuffer();
    this.staticCount = 0;
    this.width = 0; this.height = 0;
    this.lost = false;
    this.canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); this.lost = true; this.canvas.style.display = 'none'; });
    this.staticGeometry = makeGeometry();
    this.dynamicGeometry = makeGeometry();
    this.buildStadium(match);
    this.uploadStatic();
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    gl.clearColor(SKY_HORIZON[0], SKY_HORIZON[1], SKY_HORIZON[2], 1);
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
      gradientQuad(g, p0, p1, q1, q0, SKY_HORIZON, SKY_MID);
      gradientQuad(g, q0, q1, r1, r0, SKY_MID, SKY_TOP);
    }
    // Sol extérieur et pelouse : bandes de tonte dans les deux sens, légères variations naturelles.
    box(g, [0,-1.2,0], [190,1.8,150], [0.05,0.07,0.08]);
    box(g, [0,-0.2,0], [116,0.35,80], [0.1,0.3,0.13]);
    const cols = profile.detail >= 2 ? 48 : profile.detail === 1 ? 30 : 18, rows = profile.detail >= 2 ? 30 : profile.detail === 1 ? 18 : 10;
    const W = 112, H = 76;
    // Couleur de la pelouse en un point : bandes de tonte franches, ondulations douces et usure.
    const turf = (x, z) => {
      const inside = Math.abs(x) <= 52.6 && Math.abs(z) <= 34.1;
      const band = Math.floor((x + 52.5) / 5.25) % 2 ? 1.06 : 0.955;
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
      for(let j=0;j<=12;j++){
        const zz=-halfGoal+j*(halfGoal*2/12);
        line([postX,0,zz],[backX,gh*0.75,zz],0.022,softWhite);
        line([postX,gh,zz],[backX,gh*0.75,zz],0.022,softWhite);
        line([backX,0,zz],[backX,gh*0.75,zz],0.018,softWhite);
      }
      for(let j=1;j<=7;j++){
        const yy=gh*j/8;
        line([postX,yy,-halfGoal],[backX,yy,-halfGoal],0.019,softWhite);
        line([postX,yy,halfGoal],[backX,yy,halfGoal],0.019,softWhite);
        line([backX,yy,-halfGoal],[backX,yy,halfGoal],0.018,softWhite);
      }
      for(const zz of [-halfGoal,halfGoal]) for(let j=1;j<6;j++){
        const yy=gh*j/6;
        line([postX,yy,zz],[backX,yy*0.75,zz],0.018,softWhite);
      }
      // Corner flags.
      for(const side of [-1,1]){
        const fx=s*52.1,fz=side*33.7;
        cylinder(g,[fx,0,fz],[fx,1.55,fz],0.035,[0.92,0.92,0.88],6);
        box(g,[fx+s*0.27,1.36,fz+side*0.06],[0.55,0.3,0.06],s===side?[0.86,0.08,0.12]:[0.95,0.82,0.24]);
      }
    }
    // Panneaux LED lumineux autour de la pelouse (couleurs des clubs et bandeaux clairs).
    const led = [[home, homeTrim], [away, awayTrim], [[0.02,0.42,0.75], [0.95,0.95,0.95]], [[0.98,0.62,0.05], [0.08,0.08,0.1]], [[0.05,0.55,0.25], [0.95,0.95,0.9]]];
    const ledBoard = (cx, cz, along, len, ci, facing) => {
      const [c1, c2] = led[ci % led.length];
      const bright = c => c.map(v => Math.min(1.35, v * 1.35 + 0.08));
      if (along === 'x') {
        box(g, [cx, 0.55, cz + facing * 0.12], [len, 0.95, 0.22], [0.04,0.05,0.06]);
        currentAnim = -1; for (let k = 0; k < 4; k++) { const x0 = cx - len / 2 + k * len / 4; rectV(g, x0 + 0.05, x0 + len / 4 - 0.05, 0.12, 0.98, cz - facing * 0.01, k % 2 ? bright(c2) : bright(c1), facing); }
      } else {
        box(g, [cx + facing * 0.12, 0.55, cz], [0.22, 0.95, len], [0.04,0.05,0.06]);
        currentAnim = -1; for (let k = 0; k < 4; k++) { const z0 = cz - len / 2 + k * len / 4; rectVZ(g, cx - facing * 0.01, z0 + 0.05, z0 + len / 4 - 0.05, 0.12, 0.98, k % 2 ? bright(c2) : bright(c1), facing); }
      }
      currentAnim = 0;
    };
    for (let i = 0; i < 10; i++) { const x = -48 + i * 10.65; ledBoard(x, -35.6, 'x', 10.3, i, 1); ledBoard(x, 35.6, 'x', 10.3, i + 2, -1); }
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
      }
    };
    stand('x', -1); stand('x', 1); stand('z', -1); stand('z', 1);
    // angles : blocs pleins qui ferment l'enceinte
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(g, [sx * 63, 6, sz * 46], [16, 12, 14], [0.12,0.13,0.16]);
    this.fanCount = fans;
    // Stadium lighting towers, lamp banks and a broadcast gantry.
    for(const x of [-53,53]) for(const z of [-42,42]){
      cylinder(g,[x,0,z],[x,27,z],0.36,[0.24,0.28,0.33],8,0.22);
      box(g,[x,26.7,z],[3.5,0.75,1.2],[0.3,0.34,0.39]);
      for(let k=0;k<7;k++) sphere(g,[x-1.65+k*0.55,26.9,z-0.08],[0.19,0.12,0.1],[1.35,1.18,0.86],7,4);
      box(g,[x,25.9,z-0.12],[4.7,0.12,0.1],[0.95,0.88,0.64]);
    }
    // Subtle technical area and benches outside the touchline.
    for(const s of [-1,1]){
      box(g,[0,0.48,s*38.7],[22,0.3,2.0],[0.12,0.15,0.18]);
      for(let i=0;i<7;i++) box(g,[-8.6+i*2.85,0.92,s*38.7],[1.1,0.55,0.9],[0.24,0.27,0.31]);
    }
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
    const kit=player.isGK?(side0.gkKit||side0.kit):side0.kit;
    const shirt=parseColor(kit?.shirt,[0.8,0.1,0.1]), trim=parseColor(kit?.trim,[0.95,0.88,0.72]);
    const shorts=parseColor(kit?.shorts||kit?.trim,[0.08,0.1,0.13]);
    const skin=parseColor(player.skin,[0.59,0.36,0.23]), dark=[0.035,0.045,0.06], sock=[0.86,0.88,0.83];
    const detail=this.quality.detail;
    const physique=clamp(Number(player.a?.phy)||50,0,100)/100;
    const build=0.98+physique*0.18;
    const look=playerLook(player,index);
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
    const kicking=pose.kick>0.005&&style!=='header'&&style!=='throw';
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
    const tilt=clamp(lean*1.15+gkReadyLean,-0.45,0.6);
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
    if(skillOn){ roll+=pose.skillDir*0.3*Math.sin(skillP*Math.PI*2)*(1-skillP*0.4); }
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
    const shadowLayers=[[0.5,0.32,[0.09,0.2,0.1],0.042,0.1],[0.32,0.2,[0.05,0.11,0.06],0.046,0.04]];
    for(const [rx,rz,col,sy,off] of shadowLayers) for(let i=0;i<14;i++){
      const so2=(BR?BR.so:0)+bodySide, a=i/14*Math.PI*2,b=(i+1)/14*Math.PI*2, cx=x+off-sin*so2, cz=z-off*0.6+cos*so2;
      triangle(g,[cx,sy,cz],[cx+Math.cos(a)*rx,sy,cz+Math.sin(a)*rz],[cx+Math.cos(b)*rx,sy,cz+Math.sin(b)*rz],col,up);
    }
    if(player===match.selected){
      ring(g,x,0.085,z,0.58,[0.94,0.78,0.24],22,0.045);
      sphere(g,[x,0.13,z],[0.08,0.025,0.08],[1,0.9,0.3],6,3);
    }
    const ready=player.isGK&&!diving&&pose.speed<4&&!pose.keeperCatch&&!pose.keeperPunch?0.85:0;
    const hipY=0.83-low*0.28+lift-ready*0.12;
    const shoulderY=bodyY+0.23;
    const torsoF=lean*0.45;
    // ---- Buste : poitrine, épaules, bassin (vraies proportions, orientés avec le joueur) ----
    const hi=detail===2;
    ell(bodyPoint(torsoF,bodyY+0.03,0),0.135*build,0.3-low*0.08,0.2*build,shirt,hi?12:9,hi?8:6,tilt);
    ell(bodyPoint(torsoF+tilt*0.1,bodyY+0.2,0),0.13*build,0.12,0.25*build,shirt,hi?12:9,hi?6:5,tilt);
    ell(bodyPoint(lean*0.3,hipY+0.02,0),0.125*build,0.15,0.2*build,shorts,hi?10:8,5,tilt*0.5);
    // Col et bande de taille.
    cylinder(g,bodyPoint(torsoF+tilt*0.14,bodyY+0.31,0),bodyPoint(torsoF+tilt*0.16,bodyY+0.36,0),0.082,trim,hi?10:8,0.088);
    if(detail>0){
      ell(bodyPoint(lean*0.32,hipY+0.14,0),0.13*build,0.025,0.205*build,trim,10,3,tilt*0.5);
      // Écusson sur le cœur.
      ell(bodyPoint(torsoF+0.128*build+tilt*0.06,bodyY+0.17,-0.09),0.012,0.034,0.028,trim,6,4,tilt);
    }
    // Numéros : petit devant, grand dans le dos (lisible quand le joueur s'éloigne).
    addKitNumber(g,bodyPoint,torsoF+0.142*build+tilt*0.02,bodyY+0.05,player.num,trim,detail===0?0.6:0.72,-1);
    addKitNumber(g,bodyPoint,torsoF-0.142*build-tilt*0.02,bodyY+0.06,player.num,trim,detail===0?1:1.25,1);
    // ---- Jambes : squelette cuisse/tibia (cinématique directe) ----
    const kickFootSide=pose.kickFootSide||((index%2===0)?-1:1);
    const touchSide=pose.firstTouchDir>=0?kickFootSide:-kickFootSide;
    const L1=0.37, L2=0.36;
    const sp=clamp(pose.speed/8.5,0,1)*action.gait;
    const reach=style==='shot'?1.0+pose.kickPower*0.3:style==='lob'?1.05:0.55+pose.kickPower*0.2;
    const legAngles=[];
    for(const side of [-1,1]){
      const ph=phase+(side>0?Math.PI:0);
      // Foulée : la cuisse balance, le genou plie surtout pendant le retour de la jambe.
      let th=Math.sin(ph)*(0.08+0.5*sp)*(1-pose.idle*0.85);
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
      if(ready>0){ th+=(0.32-th)*ready; fl+=(0.78-fl)*ready; }
      if(slideAmt>0){ const lead=side===(pose.slideDir>=0?kickFootSide:-kickFootSide); th+=((lead?0.28:-0.3)-th)*slideAmt; fl+=((lead?0.05:1.55)-fl)*slideAmt; }
      if(rollAmt>0){ th+=((side>0?0.12:-0.12)-th)*rollAmt; fl+=(0.15-fl)*rollAmt; }
      if(skillOn&&isKickLeg){ const a=Math.sin(skillP*Math.PI); th+=(0.45-th)*a; fl+=(0.95-fl)*a; }
      legAngles.push([side,th,fl,isKickLeg]);
    }
    const sw=Math.sin(phase)*0.36*action.gait;
    const wOld=0;
    for(const [side,th,fl,isKickLeg] of legAngles){
      const kneeF=Math.sin(th)*L1, kneeU=hipY-Math.cos(th)*L1;
      const shinA=th-fl;
      let ankF=kneeF+Math.sin(shinA)*L2, ankU=kneeU-Math.cos(shinA)*L2;
      let kF=kneeF,kU=kneeU;
      const passIn=kicking&&isKickLeg&&style==='pass'?strikeShape:0;
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
      cylinder(g,hip,mid,0.112*build,shorts,8,0.104*build);
      cylinder(g,mid,knee,0.088*build,skin,8,0.07);
      sphere(g,knee,[0.068,0.072,0.068],skin,6,4);
      const sockTop=[knee[0]+(ankle[0]-knee[0])*0.14,knee[1]+(ankle[1]-knee[1])*0.14,knee[2]+(ankle[2]-knee[2])*0.14];
      cylinder(g,knee,sockTop,0.07,skin,7,0.07);
      cylinder(g,sockTop,ankle,0.072*build,sock,hi?10:7,0.05);
      if(detail>0) ring(g,sockTop[0],sockTop[1],sockTop[2],0.073,trim,10,0.012);
      // Chaussure : orientée avec le pied, pointe tendue pendant la frappe, ouverte pour la passe intérieure.
      const footA=(shinA+Math.PI/2)-(kicking&&isKickLeg?0.55*strikeShape:0)-(windup>0&&isKickLeg?0.6*windup:0);
      const fd=[Math.sin(footA),-Math.cos(footA)];
      const bootC=legPoint(ankF+fd[0]*0.075,Math.max(0.05,ankU+fd[1]*0.075-0.035),sideOff+side*0.02);
      ell(bootC,0.13,0.055,0.06,dark,hi?10:7,hi?6:4,-(footA-Math.PI/2),passIn*side*0.9);
      if(detail>0) ell([bootC[0],bootC[1]+0.02,bootC[2]],0.07,0.012,0.062,trim,6,3,-(footA-Math.PI/2),passIn*side*0.9);
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
      if(throwing||holdingThrow){ const t=throwing?kp:0; const c=throwing?1-smooth((kp-0.6)/0.4):1; const ta=2.9-t*1.5; al+=(ta-al)*c; be+=(0.9-t*0.6-be)*c; ab+=(0.12-ab)*c; }
      if(ready>0){ al+=(0.55-al)*ready; be+=(0.75-be)*ready; ab+=(0.5-ab)*ready; }
      if(player.isGK&&pose.keeperCatch>0){ const c=pose.keeperCatch; al+=(1.25-al)*c; be+=(0.6-be)*c; ab+=(-0.05-ab)*c; }
      if(player.isGK&&pose.keeperPunch>0){ const c=pose.keeperPunch; al+=(2.7-al)*c; be+=(0.05-be)*c; ab+=(0.08-ab)*c; }
      if(rollAmt>0){ al+=(3.0-al)*rollAmt; be+=(0.08-be)*rollAmt; ab+=(0.12-ab)*rollAmt; }
      if(slideAmt>0){ const back=side===(pose.slideDir>=0?-kickFootSide:kickFootSide); al+=((back?-0.9:0.35)-al)*slideAmt; be+=(0.2-be)*slideAmt; ab+=((back?0.55:0.65)-ab)*slideAmt; }
      if(skillOn){ const a=Math.sin(skillP*Math.PI); ab+=0.35*a; al+=(side===pose.skillDir?-0.3:0.4)*a; }
      const leadingKeeperArm=player.isGK&&side===diveSide;
      const keeperArmReach=player.isGK?(leadingKeeperArm?action.keeperLeadReach:action.keeperBalanceReach):0;
      const keeperArmOffset=(player.isGK?(leadingKeeperArm?diveSide*keeperArmReach*0.48:-diveSide*keeperArmReach*0.16):0)*(1-rollAmt);
      const gkRaise=player.isGK?action.catchReach*0.24*(1-rollAmt):0;
      const gkU=player.isGK?(leadingKeeperArm?action.diveFlight*0.13:action.diveLanding*0.035):0;
      const spread=action.headerBrace*0.16+action.tackleReach*0.14+action.tackleArmSpread*0.14;
      const sF=torsoF+tilt*0.12, sU=shoulderY, sS=side*0.235*build;
      const eF=sF+Math.sin(al)*A1*Math.cos(ab*0.6), eU=sU-Math.cos(al)*A1*Math.cos(ab*0.6), eS=sS+side*Math.sin(ab)*A1*0.55;
      const fa=al+be;
      let hF=eF+Math.sin(fa)*A2, hU=eU-Math.cos(fa)*A2, hS=eS+side*Math.sin(ab)*A2*0.4;
      const shoulder=bodyPoint(sF,sU,sS);
      const elbow=bodyPoint(eF+pose.contactDir*action.brace*0.075,eU+gkRaise*0.4+gkU,eS+side*spread+keeperArmOffset*0.68);
      const hand=bodyPoint(hF,hU+gkRaise+(player.isGK?keeperArmReach*0.12+gkU*1.1:0),hS+side*spread*1.5+keeperArmOffset*1.25);
      sphere(g,shoulder,[0.085,0.08,0.085],shirt,7,5);
      addArmPose(g,shoulder,elbow,hand,shirt,skin,trim,detail,!!player.isGK);
    }
    // ---- Cou, tête, coiffure, visage ----
    const neckF=torsoF+tilt*0.2;
    cylinder(g,bodyPoint(neckF,bodyY+0.32,0),bodyPoint(neckF+headSnap*0.06,bodyY+0.46,0),0.062,skin,8);
    const headF=neckF+headSnap*0.13+tilt*0.08, headY=bodyY+0.6-headSnap*0.03;
    const headTilt=tilt*0.4+headSnap*0.5+archPre*0.6;
    ell(bodyPoint(headF,headY,0),0.125,0.15,0.112,skin,hi?12:10,hi?9:7,headTilt);
    ell(bodyPoint(headF-0.005,headY,-0.112),0.03,0.045,0.02,skin,6,4);
    ell(bodyPoint(headF-0.005,headY,0.112),0.03,0.045,0.02,skin,6,4);
    addHair(g,(f,h,s)=>bodyPoint(f,h,s),headF,headY-0.62,look,detail,ell,headTilt);
    if(detail>0){
      const ff=headF+0.105, fy=headY;
      for(const side of [-1,1]){
        ell(bodyPoint(ff,fy+0.035,side*0.045),0.012,0.016,0.019,[0.94,0.92,0.84],6,4,headTilt);
        ell(bodyPoint(ff+0.01,fy+0.035,side*0.045),0.008,0.01,0.009,[0.035,0.03,0.025],5,3,headTilt);
        tube(g,bodyPoint(ff,fy+0.07,side*0.075),bodyPoint(ff+0.004,fy+0.074,side*0.022),0.01,hair,5);
      }
      ell(bodyPoint(ff+0.025,fy-0.005,0),0.03,0.035,0.022,skin,6,4,headTilt);
      tube(g,bodyPoint(ff+0.004,fy-0.06,-0.03),bodyPoint(ff+0.004,fy-0.06,0.03),0.008,[0.22,0.08,0.065],5);
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
  buildDynamic(match, frame) {
    const g=this.dynamicGeometry;g.length=0;
    let index=0;
    for(const team of match.teams) for(const player of team.ps){
      const playerFrame=frame?frame.p[index]:null;index++;
      if(player.sentOff&&!frame)continue;
      this.addPlayer(g,match,player,playerFrame,index);
    }
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
    sphere(g,[ballX,ballY,ballZ],[0.22,0.22,0.22],[0.94,0.95,0.91],this.quality.sphereSegments,Math.max(4,this.quality.sphereSegments-2));
    // Panneaux sombres répartis sur deux couronnes : motif de ballon moins ponctuel.
    for(let ringIndex=0;ringIndex<2;ringIndex++) for(let i=0;i<6;i++){
      const a=i*Math.PI/3+(ringIndex?Math.PI/6:0)+match.clock*0.7;
      const elevation=ringIndex?0.18:-0.18;
      const radius=Math.sqrt(1-elevation*elevation);
      const px=ballX+Math.cos(a)*0.164*radius;
      const pz=ballZ+Math.sin(a)*0.164*radius;
      const py=ballY+elevation*0.164;
      sphere(g,[px,py,pz],[0.038,0.024,0.038],[0.045,0.055,0.065],5,3);
    }
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
    const vp=multiply4(perspective(camera.fovy,aspect,0.25,220),lookAt(camera.eye,camera.target,[0,1,0]));
    this.lastVP=vp;
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.matrixLoc,false,vp);
    // Foule : rythme permanent, explosion de joie après un but, tension sur les occasions.
    const excite=Math.max(match.goalCrowdT>0?1:0,match.ball?.inFlightShot?0.45:0,0.12);
    this.excite=(this.excite??0.12)+(excite-(this.excite??0.12))*0.08;
    gl.uniform1f(this.timeLoc,(match.clock||0)+(performance.now()/1000)%1000);
    gl.uniform1f(this.exciteLoc,this.excite);
    gl.uniform3f(this.fogLoc,SKY_HORIZON[0],SKY_HORIZON[1],SKY_HORIZON[2]);
    gl.bindBuffer(gl.ARRAY_BUFFER,this.staticBuffer);
    this.pointAttributes();
    gl.drawArrays(gl.TRIANGLES,0,this.staticCount);
    this.buildDynamic(match,frame);
    const count=this.bindGeometry(this.dynamicBuffer,this.dynamicGeometry,gl.DYNAMIC_DRAW);
    if(count)gl.drawArrays(gl.TRIANGLES,0,count);
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
