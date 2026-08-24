const params = new URLSearchParams(location.search);
const canvas = document.getElementById('gl-canvas');
const intro = document.getElementById('intro');
const startButton = document.getElementById('start');
const replayButton = document.getElementById('replay');
const soundButton = document.getElementById('sound');
const fullscreenButton = document.getElementById('fullscreen');
const progressBar = document.querySelector('#progress span');
const endCard = document.getElementById('end-card');
const errorPanel = document.getElementById('error');
const debugPanel = document.getElementById('debug');

const DURATION = 60;
const CAPTURE_MODE = params.has('capture') || params.has('reel') || params.has('exhibition');
const DEBUG_MODE = params.has('debug');
const frameParam = params.get('frame');
const STATIC_FRAME = frameParam !== null && Number.isFinite(Number(frameParam)) ? Number(frameParam) : null;
const REDUCED_MOTION = matchMedia('(prefers-reduced-motion: reduce)').matches;

const I18N = {
  ko: {
    eyebrow: '한국적 빛의 형상을 실시간으로 엮는 프로시저럴 미디어아트',
    title: '빛의 맥',
    statement: '한지의 결에서 태어난 빛이 오방의 실이 되고, 까치의 날갯짓을 따라 갈라진 우주를 하나의 매듭으로 잇는다.',
    meta: '60초 · WebGL 2 · 프로시저럴 모델링 · 생성형 음향',
    start: '작품 시작',
    hint: '전체화면과 헤드폰 사용을 권장합니다.',
    endline: '갈라진 틈은 사라지지 않는다. 빛은 그 사이를 건너며 새로운 결을 만든다.',
    errorTitle: '작품을 시작할 수 없습니다.',
    errorBody: 'WebGL 2를 지원하는 최신 브라우저에서 다시 열어주세요.',
    soundAria: '음소거', fullscreenAria: '전체화면', replayAria: '다시 재생'
  },
  en: {
    eyebrow: 'PROCEDURAL MEDIA ART WEAVING KOREAN FORMS OF LIGHT IN REAL TIME',
    title: 'Veins of Light',
    statement: 'Light born from the grain of hanji becomes five colored threads. Following a magpie’s wingbeat, they bind a fractured cosmos into one luminous knot.',
    meta: '60 sec · WebGL 2 · Procedural modeling · Generative sound',
    start: 'Enter Artwork',
    hint: 'Fullscreen and headphones recommended.',
    endline: 'The rift remains. Light crosses it and forms a new grain.',
    errorTitle: 'The artwork could not start.',
    errorBody: 'Open it in a current browser with WebGL 2 support.',
    soundAria: 'Mute', fullscreenAria: 'Fullscreen', replayAria: 'Replay'
  },
  ja: {
    eyebrow: '韓国的な光のかたちをリアルタイムで編むプロシージャル・メディアアート',
    title: '光の脈',
    statement: '韓紙の肌理から生まれた光は五方の糸となり、カササギの羽ばたきに沿って裂けた宇宙を一つの結びへとつなぐ。',
    meta: '60秒 · WebGL 2 · プロシージャルモデリング · 生成音響',
    start: '作品を開始',
    hint: '全画面とヘッドホンを推奨します。',
    endline: '裂け目は消えない。光はその間を渡り、新しい肌理をつくる。',
    errorTitle: '作品を開始できません。',
    errorBody: 'WebGL 2対応の最新ブラウザで開いてください。',
    soundAria: 'ミュート', fullscreenAria: '全画面', replayAria: 'もう一度再生'
  }
};

function resolveLanguage() {
  const forced = params.get('lang');
  if (forced && I18N[forced]) return forced;
  const value = (navigator.language || 'ko').toLowerCase();
  if (value.startsWith('ja')) return 'ja';
  if (value.startsWith('en')) return 'en';
  return 'ko';
}
const language = resolveLanguage();
function localize() {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const value = I18N[language][el.dataset.i18n];
    if (value) el.textContent = value;
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const value = I18N[language][el.dataset.i18nAria];
    if (value) el.setAttribute('aria-label', value);
  });
}
localize();

function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }
function mix(a, b, t) { return a + (b - a) * t; }
function smooth(a, b, v) {
  const x = clamp((v - a) / Math.max(1e-6, b - a));
  return x * x * (3 - 2 * x);
}
function smoother(a, b, v) {
  const x = clamp((v - a) / Math.max(1e-6, b - a));
  return x * x * x * (x * (x * 6 - 15) + 10);
}
function pulse(a, b, c, d, v) { return smooth(a, b, v) * (1 - smooth(c, d, v)); }
function lerp3(a, b, t) { return [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)]; }

function mulberry32(seed) {
  return function random() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const random = mulberry32(0x4b4d4750);
function rand(a = 0, b = 1) { return mix(a, b, random()); }

function mat4Identity() {
  return new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
}
function mat4Perspective(fovy, aspect, near, far) {
  const f = 1 / Math.tan(fovy / 2);
  const nf = 1 / (near - far);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (far + near) * nf, -1,
    0, 0, 2 * far * near * nf, 0
  ]);
}
function mat4LookAt(eye, center, up = [0, 1, 0]) {
  let zx = eye[0] - center[0], zy = eye[1] - center[1], zz = eye[2] - center[2];
  let len = Math.hypot(zx, zy, zz) || 1; zx /= len; zy /= len; zz /= len;
  let xx = up[1] * zz - up[2] * zy;
  let xy = up[2] * zx - up[0] * zz;
  let xz = up[0] * zy - up[1] * zx;
  len = Math.hypot(xx, xy, xz) || 1; xx /= len; xy /= len; xz /= len;
  const yx = zy * xz - zz * xy;
  const yy = zz * xx - zx * xz;
  const yz = zx * xy - zy * xx;
  return new Float32Array([
    xx, yx, zx, 0,
    xy, yy, zy, 0,
    xz, yz, zz, 0,
    -(xx * eye[0] + xy * eye[1] + xz * eye[2]),
    -(yx * eye[0] + yy * eye[1] + yz * eye[2]),
    -(zx * eye[0] + zy * eye[1] + zz * eye[2]),
    1
  ]);
}
function mat4Multiply(a, b) {
  const out = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      out[col * 4 + row] =
        a[0 * 4 + row] * b[col * 4 + 0] +
        a[1 * 4 + row] * b[col * 4 + 1] +
        a[2 * 4 + row] * b[col * 4 + 2] +
        a[3 * 4 + row] * b[col * 4 + 3];
    }
  }
  return out;
}
function mat4TRS(position = [0,0,0], rotation = [0,0,0], scale = [1,1,1]) {
  const [x, y, z] = rotation;
  const sx = Math.sin(x), cx = Math.cos(x);
  const sy = Math.sin(y), cy = Math.cos(y);
  const sz = Math.sin(z), cz = Math.cos(z);
  const m00 = cy * cz;
  const m01 = sx * sy * cz - cx * sz;
  const m02 = cx * sy * cz + sx * sz;
  const m10 = cy * sz;
  const m11 = sx * sy * sz + cx * cz;
  const m12 = cx * sy * sz - sx * cz;
  const m20 = -sy;
  const m21 = sx * cy;
  const m22 = cx * cy;
  return new Float32Array([
    m00 * scale[0], m01 * scale[0], m02 * scale[0], 0,
    m10 * scale[1], m11 * scale[1], m12 * scale[1], 0,
    m20 * scale[2], m21 * scale[2], m22 * scale[2], 0,
    position[0], position[1], position[2], 1
  ]);
}

const coarsePointer = matchMedia('(pointer: coarse)').matches;
const deviceMemory = navigator.deviceMemory || 4;
const cores = navigator.hardwareConcurrency || 4;
const forcedQuality = params.get('quality');
let qualityName = forcedQuality || ((coarsePointer || innerWidth < 760 || deviceMemory <= 4 || cores <= 4) ? 'medium' : 'high');
if (!['low', 'medium', 'high', 'ultra'].includes(qualityName)) qualityName = 'high';
document.body.classList.add(`quality-${qualityName}`);
const QUALITY = {
  low:    { dpr: 1.0, stars: 360, dust: 260, feathers: 500, petals: 36, renderScale: .84, geometry: .56 },
  medium: { dpr: 1.12, stars: 620, dust: 420, feathers: 700, petals: 48, renderScale: .93, geometry: .74 },
  high:   { dpr: 1.38, stars: 980, dust: 620, feathers: 920, petals: 60, renderScale: 1.0, geometry: 1.0 },
  ultra:  { dpr: 1.70, stars: 1480, dust: 860, feathers: 1140, petals: 72, renderScale: 1.0, geometry: 1.12 }
}[qualityName];
if (CAPTURE_MODE) {
  QUALITY.dpr = Math.min(2, devicePixelRatio || 1);
  QUALITY.renderScale = 1;
}

let gl;
try {
  gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: qualityName !== 'low',
    depth: true,
    stencil: false,
    premultipliedAlpha: false,
    preserveDrawingBuffer: CAPTURE_MODE || STATIC_FRAME !== null,
    powerPreference: 'high-performance',
    failIfMajorPerformanceCaveat: false
  });
  if (!gl) throw new Error('WEBGL2_CONTEXT_UNAVAILABLE');
} catch (error) {
  showError(error);
  throw error;
}

function showError(error) {
  errorPanel.hidden = false;
  const code = errorPanel.querySelector('code');
  if (code) code.textContent = String(error?.stack || error?.message || error || 'Unknown error');
}

function shader(type, source) {
  const handle = gl.createShader(type);
  gl.shaderSource(handle, source);
  gl.compileShader(handle);
  if (!gl.getShaderParameter(handle, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(handle);
    gl.deleteShader(handle);
    throw new Error(`Shader compile failed:\n${log}`);
  }
  return handle;
}
function program(vertexSource, fragmentSource) {
  const handle = gl.createProgram();
  gl.attachShader(handle, shader(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(handle, shader(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(handle);
  if (!gl.getProgramParameter(handle, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(handle);
    gl.deleteProgram(handle);
    throw new Error(`Program link failed:\n${log}`);
  }
  return handle;
}
function uniformLocations(handle, names) {
  const result = {};
  names.forEach((name) => { result[name] = gl.getUniformLocation(handle, name); });
  return result;
}
function createBuffer(data, target = gl.ARRAY_BUFFER, usage = gl.STATIC_DRAW) {
  const handle = gl.createBuffer();
  gl.bindBuffer(target, handle);
  gl.bufferData(target, data, usage);
  return handle;
}
function attrib(location, size, type, normalized, stride, offset, divisor = 0) {
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, type, normalized, stride, offset);
  if (divisor) gl.vertexAttribDivisor(location, divisor);
}
