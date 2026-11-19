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
  const contact = Number.isFinite(p[23]) ? p[23] : (Number.isFinite(player.contactT) ? player.contactT : 0);
  const contactDir = Number.isFinite(p[24]) ? p[24] : player.contactDir;
  const slideDuration = Number.isFinite(p[25]) && p[25] > 0 ? p[25] : (player.slideDuration || 0.38);
  const celebrate = Number.isFinite(player.celebrateT) ? player.celebrateT : 0;
  return {
    x, y, vx, vy, speed, heading, phase: anim * 1.12,
    lean: clamp(speed * 0.022, 0, 0.19),
    turnLean: clamp(-(Number.isFinite(player.turn) ? player.turn : 0) * speed * 0.022, -0.16, 0.16),
    bodyBob: speed > 0.18 ? Math.abs(Math.sin(anim * 2.24)) * clamp(speed / 9, 0, 1) * 0.045 : 0,
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
  const stumble = clamp(pose.stumble || 0, 0, 1);
  const contact = clamp(pose.contact || 0, 0, 1);
  const keeperCatch = clamp(pose.keeperCatch || 0, 0, 1);
  const keeperPunch = clamp(pose.keeperPunch || 0, 0, 1);
  const diveStretch = clamp(pose.diveStretch || 0, 0, 1);
  return {
    gait: clamp(1 - Math.max(slide, dive * 0.92, stumble * 0.28), 0, 1),
    diveReach: clamp(dive * (0.34 + diveStretch * 0.66), 0, 1),
    catchReach: clamp(Math.max(keeperCatch, dive * 0.78), 0, 1),
    punchReach: clamp(Math.max(keeperPunch, dive * 0.54), 0, 1),
    kickPulse: clamp(Math.sin(kick * Math.PI), 0, 1),
    firstTouchPulse: clamp(Math.sin(firstTouch * Math.PI), 0, 1),
    brace: clamp(Math.max(contact, stumble * 0.82), 0, 1),
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
  const zoom = replay ? 1.02 : clamp(cam.actionZoom || 1, 1, 1.16);
  const targetX = clamp(Number.isFinite(cam.x) ? cam.x : 0, -48, 48);
  const targetZ = clamp(Number.isFinite(cam.y) ? -cam.y : 0, -28, 28);
  const safeAspect = Number.isFinite(aspect) && aspect > 0 ? aspect : 16 / 9;
  const eye = [targetX - 5.2 / zoom, 49 / zoom, targetZ + 57 / zoom];
  const target = [targetX, 0, targetZ];
  return {
    eye,
    target,
    zoom,
    aspect: safeAspect,
    fovy: safeAspect < 1.15 ? 0.86 : 0.78,
    distance: Math.hypot(eye[0] - targetX, eye[1], eye[2] - targetZ),
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
function pushVertex(out, p, n, c) {
  out.push(p[0], p[1], p[2], n[0], n[1], n[2], c[0], c[1], c[2]);
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
function addKitNumber(out, point, forward, centerY, number, color, scale = 1) {
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
    const centerSide = -total/2 + width/2 + digitIndex*(width+gap);
    for (const key of chars) {
      const [y0,s0,y1,s1] = segments[key];
      tube(out, point(forward, centerY+y0, centerSide+s0),
        point(forward, centerY+y1, centerSide+s1), 0.012*scale, color, 5);
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

const VS = 'attribute vec3 aPosition; attribute vec3 aNormal; attribute vec3 aColor; uniform mat4 uViewProjection; varying vec3 vNormal; varying vec3 vColor; void main(){ vNormal=aNormal; vColor=aColor; gl_Position=uViewProjection*vec4(aPosition,1.0); }';
const FS = 'precision mediump float; varying vec3 vNormal; varying vec3 vColor; void main(){ vec3 n=normalize(vNormal); vec3 sun=normalize(vec3(-0.42,0.86,0.31)); vec3 fillA=normalize(vec3(0.58,0.42,-0.66)); vec3 fillB=normalize(vec3(-0.76,0.28,-0.36)); float key=max(dot(n,sun),0.0); float rim=max(dot(n,fillA),0.0); float fill=max(dot(n,fillB),0.0); float hemi=0.5+0.5*max(n.y,0.0); float spec=pow(max(dot(n,normalize(sun+vec3(0.0,0.8,0.15))),0.0),24.0)*0.16; float lighting=0.39+0.66*key+0.20*rim+0.12*fill+0.14*hemi; vec3 lit=vColor*lighting+vec3(spec); vec3 color=pow(max(lit,vec3(0.0)),vec3(0.94)); gl_FragColor=vec4(color,1.0); }';

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
    this.matrixLoc = gl.getUniformLocation(this.program, 'uViewProjection');
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
    gl.clearColor(0.035, 0.065, 0.105, 1);
    this.resize();
  }
  buildStadium(match) {
    const g = this.staticGeometry, profile = this.quality;
    const grass = [0.08,0.34,0.14], stripeA = [0.105,0.40,0.16], stripeB = [0.075,0.31,0.125];
    box(g, [0,-1.2,0], [172,1.8,128], [0.045,0.075,0.075]);
    box(g, [0,-0.18,0], [108,0.35,71], grass);
    for (let i = 0; i < 16; i++) {
      const x0 = -52.5 + i * 6.56, x1 = Math.min(52.5, x0 + 6.56);
      rect(g, x0, x1, -34, 34, 0.005, i % 2 ? stripeA : stripeB);
    }
    // Fine pelouse : micro-traits déterministes et zones d'usure subtiles près des buts.
    for (let i = 0; i < profile.turfDetail; i++) {
      const seed = i * 37.719 + 11.3;
      const x = -51.2 + ((seed * 1.731) % 102.4);
      const z = -32.6 + ((seed * 2.417) % 65.2);
      const length = 0.08 + (i % 4) * 0.035;
      const tone = i % 3 === 0 ? [0.12,0.38,0.17] : i % 3 === 1 ? [0.065,0.285,0.12] : [0.095,0.345,0.145];
      rect(g, x, x + length, z, z + 0.018, 0.012, tone);
    }
    for (const side of [-1, 1]) {
      const gx = side * 50.2;
      rect(g, gx - 1.2, gx + 0.4, -5.6, 5.6, 0.014, [0.075,0.285,0.12]);
      rect(g, gx - 1.2, gx + 0.4, -3.2, 3.2, 0.016, [0.085,0.305,0.13]);
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
    // LED advertising boards.
    const boardColors=[[0.04,0.13,0.32],[0.7,0.035,0.05],[0.04,0.32,0.18],[0.78,0.48,0.08],[0.15,0.12,0.27]];
    for(let i=0;i<10;i++){
      const c=boardColors[i%boardColors.length], x=-48+i*10.65;
      box(g,[x,0.62,-35.25],[10.2,1.05,0.35],c);
      box(g,[x,0.62,35.25],[10.2,1.05,0.35],c);
    }
    for(const s of [-1,1]) for(let i=0;i<4;i++){
      box(g,[s*53.9,0.62,-25+i*16.7],[0.35,1.05,15.9],boardColors[(i+1)%boardColors.length]);
    }
    // Grandstands with concrete tiers, roof canopies and tunnel structures.
    const concrete=[0.16,0.19,0.23], seat=[0.26,0.29,0.34], roof=[0.075,0.095,0.13];
    const steel=[0.105,0.13,0.17], fascia=[0.55,0.035,0.065];
    for(const s of [-1,1]){
      for(let tier=0;tier<3;tier++){
        box(g,[0,2.2+tier*3.05,s*(42.2+tier*1.5)],[111,4.2,13.2],concrete);
        box(g,[0,4.0+tier*3.05,s*(37.1+tier*1.5)],[110,0.25,1.0],seat);
      }
      box(g,[0,3.55,s*35.8],[112,0.38,0.45],fascia);
      box(g,[0,7.55,s*43.9],[112,0.28,0.48],steel);
      box(g,[0,13.1,s*48],[116,0.8,18],roof);
      box(g,[0,13.55,s*40.7],[116,0.24,0.35],steel);
      for(let x=-53;x<=53;x+=13.25) {
        cylinder(g,[x,0,s*49],[x,13.3,s*49],0.22,concrete,7);
        cylinder(g,[x,12.8,s*42.5],[x,13.5,s*47.2],0.11,steel,6);
        cylinder(g,[x,13.5,s*47.2],[x+6.6,13.5,s*47.2],0.09,steel,6);
      }
      for(let x=-50;x<=50;x+=12.5) {
        const board=boardColors[Math.abs(Math.floor(x/10))%boardColors.length];
        box(g,[x,6.25,s*35.55],[10.8,0.62,0.17],board);
      }
    }
    for(const s of [-1,1]){
      for(let tier=0;tier<3;tier++) {
        box(g,[s*(58.2+tier*1.1),2.3+tier*3.05,0],[13.2,4.3,77],concrete);
        box(g,[s*(53.2+tier*1.1),3.55+tier*3.05,0],[0.42,0.28,76],fascia);
      }
      box(g,[s*62,13.1,0],[18,0.8,86],roof);
      box(g,[s*54.5,13.55,0],[0.35,0.24,86],steel);
      for(let z=-34;z<=34;z+=13.6) {
        cylinder(g,[s*61,0,z],[s*61,13.2,z],0.22,concrete,7);
        cylinder(g,[s*56,12.8,z],[s*61,13.5,z],0.11,steel,6);
      }
    }
    // Sièges numérotés visuellement par rangées, avec allées de circulation.
    const seatPalette=[[0.53,0.055,0.09],[0.78,0.78,0.73],[0.08,0.19,0.34],[0.19,0.22,0.27]];
    for(const side of [-1,1]) {
      for(let row=0;row<profile.seatRows;row++) {
        const seatY=4.02+row*3.05, seatZ=side*(38.55+row*1.5);
        for(let index=0;index<38;index++) {
          const x=-51+index*2.75;
          const aisle=index===9||index===19||index===29;
          if(!aisle) box(g,[x,seatY,seatZ],[0.72,0.42,0.62],seatPalette[(index+row*3+(side>0?1:0))%seatPalette.length]);
        }
      }
    }
    // Public en 3D : silhouettes, têtes, bras levés et écharpes aux couleurs des équipes.
    const count=profile.crowd;
    const fanColors=[parseColor(match.teams[0].kit.shirt),parseColor(match.teams[0].kit.trim),parseColor(match.teams[1].kit.shirt),[0.9,0.9,0.86],[0.72,0.07,0.1],[0.08,0.32,0.62]];
    for(let i=0;i<count;i++){
      const x=-51+(i%92)/91*102, zSide=i%2?1:-1, row=Math.floor(i/(count/profile.seatRows))%profile.seatRows;
      const z=zSide*(39.1+row*1.55), yy=4.55+row*3.0, color=fanColors[(i*7+Math.floor(i/7))%fanColors.length];
      box(g,[x,yy,z],[0.32,0.5,0.25],color);
      sphere(g,[x,yy+0.38,z],[0.16,0.17,0.15],i%5===0?[0.32,0.2,0.14]:[0.66,0.43,0.28],5,4);
      if(i%4===0) {
        const armColor=i%8===0?[0.78,0.08,0.1]:[0.7,0.58,0.36];
        tube(g,[x-0.13,yy+0.15,z],[x-0.28,yy+0.52,z],0.035,armColor,5);
        tube(g,[x+0.13,yy+0.15,z],[x+0.28,yy+0.5,z],0.035,armColor,5);
      }
      if(i%7===0) box(g,[x,yy+0.1,z+zSide*0.15],[0.48,0.07,0.035],i%2?fanColors[1]:fanColors[4]);
    }
    // Supporters supplémentaires derrière les deux buts pour fermer l'enceinte.
    const endCount=Math.round(count*0.38);
    for(let i=0;i<endCount;i++){
      const endSide=i%2?1:-1, row=Math.floor(i/72)%profile.seatRows;
      const z=-33+(i%72)/71*66, x=endSide*(59+row*1.1), ySeat=4.45+row*3.0;
      const color=fanColors[(i*5+3)%fanColors.length];
      box(g,[x,ySeat,z],[0.26,0.48,0.32],color);
      sphere(g,[x,ySeat+0.36,z],[0.14,0.16,0.14],i%6===0?[0.34,0.22,0.16]:[0.68,0.46,0.31],5,4);
      if(i%5===0) {
        tube(g,[x,ySeat+0.12,z-0.1],[x,ySeat+0.42,z-0.31],0.03,color,5);
        tube(g,[x,ySeat+0.12,z+0.1],[x,ySeat+0.42,z+0.31],0.03,color,5);
      }
    }
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
    this.staticCount=data.length/9;
    this.staticGeometry.length=0;
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
    const x=pose.x,z=-pose.y,yaw=-pose.heading;
    const cos=Math.cos(yaw),sin=Math.sin(yaw);
    const point=(f,h,side)=>[x+cos*f-sin*side,h,-pose.y+sin*f+cos*side];
    const side0=player.team===0?match.teams[0]:match.teams[1];
    const kit=player.isGK?(side0.gkKit||side0.kit):side0.kit;
    const shirt=parseColor(kit?.shirt,[0.8,0.1,0.1]), trim=parseColor(kit?.trim,[0.95,0.88,0.72]);
    const shorts=parseColor(kit?.shorts||kit?.trim,[0.08,0.1,0.13]);
    const skin=parseColor(player.skin,[0.59,0.36,0.23]), dark=[0.035,0.045,0.06], sock=[0.86,0.88,0.83];
    const detail=this.quality.detail;
    const physique=clamp(Number(player.a?.phy)||50,0,100)/100;
    const build=0.9+physique*0.2;
    const hair=index%3===0?[0.045,0.035,0.03]:index%3===1?[0.12,0.075,0.045]:[0.025,0.03,0.04];
    const phase=pose.phase, lift=pose.jump, slide=pose.slide, dive=pose.dive;
    const action=getPlayer3DActionWeights(pose);
    const low=clamp(slide*0.78+dive*0.52,0,0.88);
    const keeperVertical=player.isGK?dive*clamp(pose.diveHeight,-1,1)*0.19:0;
    const bodyY=1.22-low*0.43+lift-action.stumble*0.065+keeperVertical+pose.header*0.025+pose.bodyBob;
    const lean=pose.lean+pose.kick*0.06+pose.header*0.12+action.stumble*0.12+action.brace*0.035;
    // Le gardien accompagne le plongeon avec une translation du buste et des bras
    // dans le sens réel du tir ; les joueurs de champ amortissent les contacts.
    const diveSide=Math.sign(-pose.diveDir*Math.cos(yaw))||1;
    const bodySide=(player.isGK?diveSide*action.diveReach*0.42:0)+
      (pose.stumbleDir||1)*action.stumble*0.075+
      (pose.contactDir||1)*pose.contact*0.045+pose.turnLean*0.55;
    const bodyPoint=(f,h,side)=>point(f,h,side+bodySide);
    const legPoint=(f,h,side)=>point(f,h,side+bodySide*0.48);
    // Ground shadow and captain/user selection halo.
    const sh=[0.035,0.055,0.045];
    const shadowY=0.045;
    for(let i=0;i<14;i++){
      const a=i/14*Math.PI*2,b=(i+1)/14*Math.PI*2;
      triangle(g,[x,shadowY,z],[x+Math.cos(a)*0.42,shadowY,z+Math.sin(a)*0.25],[x+Math.cos(b)*0.42,shadowY,z+Math.sin(b)*0.25],sh,[[0,1,0],[0,1,0],[0,1,0]]);
    }
    if(player===match.selected){
      ring(g,x,0.085,z,0.58,[0.94,0.78,0.24],22,0.045);
      sphere(g,[x,0.13,z],[0.08,0.025,0.08],[1,0.9,0.3],6,3);
    }
    const hipY=0.83-low*0.28+lift;
    const shoulderY=bodyY+0.22;
    const torsoCenter=bodyPoint(lean*0.45,bodyY,0);
    sphere(g,torsoCenter,[0.29*build,0.38-low*0.1,0.205*build],shirt,detail===2?12:9,detail===2?9:7);
    sphere(g,bodyPoint(lean*0.35,hipY,0),[0.235*build,0.17,0.205*build],shorts,8,5);
    // Col, bandes d'épaules, finitions de manches et coutures de short.
    cylinder(g,bodyPoint(lean*0.4,bodyY+0.34,0),bodyPoint(lean*0.4,bodyY+0.39,0),0.105,trim,10,0.11);
    tube(g,bodyPoint(lean*0.5,bodyY+0.22,-0.2),bodyPoint(lean*0.5,bodyY+0.22,0.2),0.018,trim,6);
    for(const side of [-1,1]) {
      tube(g,bodyPoint(lean*0.45,bodyY+0.27,side*0.22),bodyPoint(lean*0.15,bodyY+0.30,side*0.16),0.022,trim,5);
      if(detail>0) tube(g,bodyPoint(lean*0.25,hipY-0.04,side*0.18),bodyPoint(lean*0.25,hipY-0.13,side*0.18),0.012,trim,5);
    }
    // Insigne de poitrine et numéros lisibles sur le maillot.
    sphere(g,bodyPoint(0.287,bodyY+0.19,-0.13),[0.026,0.04,0.026],trim,7,5);
    addKitNumber(g,bodyPoint,0.292,bodyY+0.015,player.num,trim,detail===0?0.78:1);
    addKitNumber(g,bodyPoint,-0.292,bodyY+0.015,player.num,trim,detail===0?0.78:1);
    const kickFootSide=(index%2===0)?-1:1;
    const stride=0.36+pose.sprint*0.13;
    const legSwing=Math.sin(phase)*stride*action.gait;
    const legSwingB=Math.sin(phase+Math.PI)*stride*action.gait;
    for(const [side,baseSwing] of [[-1,legSwing],[1,legSwingB]]){
      const sw=baseSwing+(side===kickFootSide?action.kickPulse*0.78:-action.kickPulse*0.12);
      const hip=legPoint(0,hipY,side*0.13);
      const kneeLift=Math.max(0,Math.sin(phase+(side>0?Math.PI:0)))*pose.sprint*0.13;
      const knee=legPoint(sw*0.55,0.46-low*0.15+lift*0.55+kneeLift,side*0.145);
      const toeLift=Math.max(0,Math.cos(phase+(side>0?Math.PI:0)))*(0.08+pose.sprint*0.04)+ (side===kickFootSide?action.firstTouchPulse*0.075:0);
      const ankle=legPoint(sw*0.9,0.13+toeLift+lift*0.25,side*0.16);
      cylinder(g,hip,knee,0.105,shorts,8,0.085);
      sphere(g,knee,[0.09,0.09,0.09],shorts,6,4);
      cylinder(g,knee,ankle,0.066*build,sock,detail===2?10:7,0.052);
      if(detail>0) {
        ring(g,ankle[0],ankle[1]+0.09,ankle[2],0.071,[0.78,0.08,0.1],12,0.012);
        ring(g,ankle[0],ankle[1]+0.15,ankle[2],0.072,trim,12,0.01);
      }
      const boot=legPoint(sw*0.95,ankle[1],side*0.16+0.06);
      sphere(g,boot,[0.16,0.075,0.095],dark,detail===2?10:7,detail===2?6:4);
      if(detail>0) {
        sphere(g,[boot[0]+0.045,boot[1]-0.052,boot[2]-0.035],[0.025,0.018,0.022],trim,5,3);
        sphere(g,[boot[0]+0.045,boot[1]-0.052,boot[2]+0.035],[0.025,0.018,0.022],trim,5,3);
      }
      // Semelle et petits crampons visibles dans les gros plans.
    }
    const armSwing=Math.sin(phase+Math.PI)*(0.29+pose.sprint*0.12)*action.gait;
    const keeperReach=player.isGK?(action.diveReach*0.48+action.catchReach*0.31+action.punchReach*0.24):0;
    for(const side of [-1,1]){
      const raise=pose.celebrate*0.82+pose.header*0.38+(player.isGK?action.catchReach*0.24:0);
      const shoulder=bodyPoint(lean*0.35,shoulderY,side*0.25);
      const elbow=bodyPoint(armSwing*side*0.75+pose.contactDir*action.brace*0.075,bodyY-0.12+raise*0.4+(player.isGK?action.diveReach*0.12:0),side*0.42+diveSide*keeperReach*0.52);
      const hand=bodyPoint(armSwing*side+pose.kick*0.06+pose.firstTouchDir*action.firstTouchPulse*0.045,bodyY-0.48+raise+(player.isGK?action.punchReach*0.2:0),side*0.48+diveSide*keeperReach);
      addArmPose(g,shoulder,elbow,hand,shirt,skin,trim,detail,!!player.isGK);
    }
    // Neck, head, hair and subtle ear details.
    cylinder(g,bodyPoint(lean*0.4,bodyY+0.34,0),bodyPoint(lean*0.4,bodyY+0.48,0),0.075,skin,8);
    const head=bodyPoint(lean*0.43+pose.header*0.11,bodyY+0.62-pose.header*0.045,0);
    sphere(g,head,[0.145,0.175,0.14],skin,detail===2?12:10,detail===2?9:7);
    sphere(g,bodyPoint(lean*0.43,bodyY+0.735,0),[0.147,0.07,0.142],hair,9,4);
    sphere(g,bodyPoint(lean*0.43,bodyY+0.62,-0.142),[0.035,0.055,0.035],skin,6,4);
    sphere(g,bodyPoint(lean*0.43,bodyY+0.62,0.142),[0.035,0.055,0.035],skin,6,4);
    if(detail>0) {
      // Yeux, pupilles, sourcils et nez orientés vers l'avant du joueur.
      for(const side of [-1,1]) {
         sphere(g,bodyPoint(0.128+pose.header*0.11,bodyY+0.665-pose.header*0.045,side*0.052),[0.022,0.018,0.017],[0.94,0.92,0.84],6,4);
        sphere(g,bodyPoint(0.143+pose.header*0.11,bodyY+0.665-pose.header*0.045,side*0.052),[0.009,0.012,0.009],[0.035,0.03,0.025],5,3);
        tube(g,bodyPoint(0.125+pose.header*0.11,bodyY+0.70-pose.header*0.045,side*0.08),bodyPoint(0.125+pose.header*0.11,bodyY+0.70-pose.header*0.045,side*0.026),0.012,hair,5);
      }
      sphere(g,bodyPoint(0.16+pose.header*0.11,bodyY+0.61-pose.header*0.045,0),[0.03,0.035,0.035],skin,6,4);
      tube(g,bodyPoint(0.13+pose.header*0.11,bodyY+0.555-pose.header*0.045,-0.035),bodyPoint(0.13+pose.header*0.11,bodyY+0.555-pose.header*0.045,0.035),0.009,[0.22,0.08,0.065],5);
    }
    // Gardien : gants renforcés et bandes de poignets.
    if(player.isGK) for(const side of [-1,1]) {
      sphere(g,bodyPoint(0,bodyY-0.47,side*0.49),[0.09,0.07,0.07],trim,detail===2?9:6,4);
      if(detail>0) tube(g,bodyPoint(0,bodyY-0.41,side*0.47),bodyPoint(0,bodyY-0.48,side*0.49),0.025,shirt,5);
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
    this.addCrowdMotion(g,match);
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
    const stride=9*4;
    gl.enableVertexAttribArray(this.positionLoc);
    gl.vertexAttribPointer(this.positionLoc,3,gl.FLOAT,false,stride,0);
    gl.enableVertexAttribArray(this.normalLoc);
    gl.vertexAttribPointer(this.normalLoc,3,gl.FLOAT,false,stride,3*4);
    gl.enableVertexAttribArray(this.colorLoc);
    gl.vertexAttribPointer(this.colorLoc,3,gl.FLOAT,false,stride,6*4);
    return data.length/9;
  }
  render(match, frame = null) {
    if(this.lost)return;
    this.resize();
    const gl=this.gl;
    const aspect=this.width/Math.max(1,this.height);
    const camera=get3DCameraPose(match,frame,aspect);
    const vp=multiply4(perspective(camera.fovy,aspect,0.25,220),lookAt(camera.eye,camera.target,[0,1,0]));
    gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.matrixLoc,false,vp);
    gl.bindBuffer(gl.ARRAY_BUFFER,this.staticBuffer);
    const stride=36;
    gl.enableVertexAttribArray(this.positionLoc);gl.vertexAttribPointer(this.positionLoc,3,gl.FLOAT,false,stride,0);
    gl.enableVertexAttribArray(this.normalLoc);gl.vertexAttribPointer(this.normalLoc,3,gl.FLOAT,false,stride,12);
    gl.enableVertexAttribArray(this.colorLoc);gl.vertexAttribPointer(this.colorLoc,3,gl.FLOAT,false,stride,24);
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
    vertexCount: builder.staticGeometry.length / 9,
    finite: builder.staticGeometry.every(Number.isFinite),
  };
}


// Génère le maillage réel d'un joueur pour les tests de proportions et de détails.
export function getPlayer3DModelStats(match, player, quality = 'high') {
  if (!match || !Array.isArray(match.teams) || match.teams.length < 2 || !player) throw new Error('Match et joueur requis');
  const renderer = Object.create(MatchRenderer3D.prototype);
  renderer.quality = get3DQualityProfile(quality);
  const geometry = makeGeometry();
  renderer.addPlayer(geometry, match, player, null, Number(player.i) || 0);
  return { vertexCount: geometry.length / 9, finite: geometry.every(Number.isFinite) };
}
