import { GenerativeAudio } from './audio.js';
import { createProceduralAssets } from './geometry.js';
import { clamp, lerp, pulse, smoothstep, smootherstep } from './math.js';
import { ArtworkRenderer } from './renderer.js';

const VERSION = '20260828-chilseok-2';
const DURATION = 60;
const params = new URLSearchParams(location.search);

const canvas = document.getElementById('art-canvas');
const intro = document.getElementById('intro');
const startButton = document.getElementById('start-button');
const replayButton = document.getElementById('replay-button');
const muteButton = document.getElementById('mute-button');
const fullscreenButton = document.getElementById('fullscreen-button');
const progressBar = document.querySelector('#progress span');
const endCard = document.getElementById('end-card');
const debugPanel = document.getElementById('debug-panel');
const debugFps = document.getElementById('debug-fps');
const debugTimeLabel = document.getElementById('debug-time');
const debugStats = document.getElementById('debug-stats');
const timeSlider = document.getElementById('time-slider');
const errorPanel = document.getElementById('error-panel');
const errorCode = document.getElementById('error-code');
const reloadButton = document.getElementById('reload-button');

const copy = Object.freeze({
  ko: {
    eyebrow: '일 년의 거리를 잇는 단 하루', title: '칠석: 은하수 위의 하루', shortTitle: '은하수 위의 하루',
    statement: '서로를 바라보던 두 개의 빛 사이로, 수백 마리 까치가 날아와 단 하루의 길이 된다.',
    meta: '60초 · 실시간 군집 시뮬레이션 · 생성형 음향', preparing: '작품 준비 중', start: '작품 시작',
    soundHint: '헤드폰 또는 스피커 사용을 권장합니다.', replay: '다시', mute: '음소거', unmute: '소리 켜기', fullscreen: '전체화면',
    replayAria: '작품 다시 재생', muteAria: '작품 음소거', unmuteAria: '작품 소리 켜기', fullscreenAria: '전체화면 전환',
    endline: '가장 먼 두 점도, 함께 날면 하나의 길이 된다.',
    errorTitle: '작품을 실행할 수 없습니다.', errorBody: 'WebGL 2를 지원하는 최신 브라우저와 그래픽 가속 환경에서 다시 열어주세요.', reload: '새로고침',
  },
  en: {
    eyebrow: 'ONE DAY THAT BRIDGES A YEAR APART', title: 'Chilseok: One Day Above the Milky Way', shortTitle: 'One Day Above the Milky Way',
    statement: 'Between two lights facing one another, hundreds of magpies arrive and become a path that lasts for one day.',
    meta: '60 sec · Real-time flock simulation · Generative sound', preparing: 'Preparing artwork', start: 'Enter Artwork',
    soundHint: 'Headphones or speakers recommended.', replay: 'Replay', mute: 'Mute', unmute: 'Unmute', fullscreen: 'Fullscreen',
    replayAria: 'Replay artwork', muteAria: 'Mute artwork', unmuteAria: 'Unmute artwork', fullscreenAria: 'Toggle fullscreen',
    endline: 'Even the farthest two points become one path when they fly together.',
    errorTitle: 'The artwork could not start.', errorBody: 'Please reopen it in a modern WebGL 2 browser with hardware acceleration enabled.', reload: 'Reload',
  },
  ja: {
    eyebrow: '一年の距離を結ぶ、たった一日', title: '七夕：天の川の上の一日', shortTitle: '天の川の上の一日',
    statement: '向かい合う二つの光の間へ、数百羽のカササギが飛来し、一日だけの道になる。',
    meta: '60秒 · リアルタイム群集シミュレーション · 生成音響', preparing: '作品を準備中', start: '作品を開始',
    soundHint: 'ヘッドホンまたはスピーカー推奨。', replay: '再生', mute: 'ミュート', unmute: '音声をオン', fullscreen: '全画面',
    replayAria: '作品を再生', muteAria: '作品をミュート', unmuteAria: '作品の音声をオン', fullscreenAria: '全画面を切り替え',
    endline: 'どれほど遠い二点も、共に飛べば一つの道になる。',
    errorTitle: '作品を実行できません。', errorBody: 'WebGL 2とハードウェアアクセラレーションに対応した最新ブラウザで開き直してください。', reload: '再読み込み',
  },
});

function getLanguage() {
  const forced = params.get('lang');
  if (forced && copy[forced]) return forced;
  const browserLanguage = (navigator.language || 'ko').toLowerCase();
  if (browserLanguage.startsWith('ja')) return 'ja';
  if (browserLanguage.startsWith('en')) return 'en';
  return 'ko';
}

const language = getLanguage();
let localized = copy[language];

function applyLocalization() {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const key = node.dataset.i18n;
    if (localized[key]) node.textContent = localized[key];
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((node) => {
    const key = node.dataset.i18nAria;
    if (localized[key]) node.setAttribute('aria-label', localized[key]);
  });
}
applyLocalization();

const captureMode = params.has('capture') || params.has('reel') || params.has('exhibition');
const debugMode = params.has('debug');
const frameParam = Number(params.get('frame'));
const fixedFrame = Number.isFinite(frameParam) && params.has('frame') ? clamp(frameParam, 0, DURATION - .001) : null;
const autoplay = captureMode || fixedFrame !== null || params.has('autoplay');

function parseRenderSize(value) {
  if (!value) return null;
  const match = /^(\d{2,5})x(\d{2,5})$/i.exec(value.trim());
  if (!match) return null;
  const width = clamp(Number(match[1]), 320, 4096);
  const height = clamp(Number(match[2]), 180, 4096);
  return { width: Math.floor(width), height: Math.floor(height) };
}
const fixedRenderSize = parseRenderSize(params.get('render'));

const QUALITY = Object.freeze({
  high:   { name:'high',   maxDpr:1.50, particleCount:15000, density:1.00, bloomIterations:2, pointScale:2.55 },
  medium: { name:'medium', maxDpr:1.25, particleCount: 9000, density:.82, bloomIterations:1, pointScale:2.35 },
  low:    { name:'low',    maxDpr:1.00, particleCount: 5500, density:.62, bloomIterations:1, pointScale:2.15 },
});

function chooseAutomaticQuality() {
  const memory = navigator.deviceMemory || 4;
  const cores = navigator.hardwareConcurrency || 4;
  const mobile = matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
  const pixelLoad = innerWidth * innerHeight * Math.min(devicePixelRatio || 1, 2);
  if (memory >= 8 && cores >= 8 && !mobile && pixelLoad < 6_000_000) return QUALITY.high;
  if (memory <= 3 || cores <= 4 || (mobile && pixelLoad > 3_000_000)) return QUALITY.low;
  return QUALITY.medium;
}

const forcedQuality = params.get('quality');
const quality = QUALITY[forcedQuality] || chooseAutomaticQuality();
let resolutionScale = 1;
let renderer = null;
let audio = null;
let started = false;
let muted = captureMode;
let startStamp = performance.now();
let currentTimeline = fixedFrame ?? 0;
let previousTimeline = currentTimeline;
let debugPaused = fixedFrame !== null;
let debugScrubbed = false;
let hiddenAt = 0;
let idleTimer = 0;
let resizeQueued = false;
let lastFrameStamp = performance.now();
let frameSamples = [];
let adaptationWindow = [];
let fastWindows = 0;

function timelineState(t) {
  const release = smootherstep(53.0, 59.4, t);
  const window = 1 - smoothstep(57.0, 60.0, t);
  const threads = pulse(3.0, 11.0, 54.0, 59.5, t);
  const rift = smoothstep(4.0, 15.0, t) * (1 - smoothstep(55.0, 60.0, t));
  const seal = smoothstep(29.0, 44.0, t) * (1 - smoothstep(55.0, 59.0, t));
  const lotus = release;
  const latticeMorph = smoothstep(4.5, 17.0, t);
  const latticeOpacity = 1 - smoothstep(37.0, 47.0, t);
  const magpieMorph = smootherstep(13.0, 28.0, t);
  const magpieOpacity = pulse(8.0, 13.0, 36.0, 42.0, t);
  const magpieFlight = 0;
  const magpieFlap = pulse(15.0, 19.0, 39.0, 45.0, t);
  const bridgeMorph = smootherstep(28.0, 44.0, t);
  const bridgeOpacity = pulse(24.0, 29.0, 55.0, 59.0, t);
  const lotusMorph = smootherstep(43.0, 50.5, t);
  const lotusOpacity = pulse(45.5, 48.0, 56.5, 60.0, t);
  return {
    window, threads, rift, seal, lotus,
    latticeMorph, latticeOpacity,
    magpieMorph, magpieOpacity, magpieFlight, magpieFlap,
    bridgeMorph, bridgeOpacity, lotusMorph, lotusOpacity,
    particleThreads: smoothstep(4.0, 15.0, t),
    particleMagpie: smoothstep(14.0, 29.0, t),
    particleBridge: smoothstep(29.0, 44.5, t),
    particleLotus: release,
  };
}

function targetRenderSize() {
  if (fixedRenderSize) return fixedRenderSize;
  const dpr = Math.min(devicePixelRatio || 1, quality.maxDpr);
  return {
    width: Math.max(320, Math.floor(innerWidth * dpr * resolutionScale)),
    height: Math.max(180, Math.floor(innerHeight * dpr * resolutionScale)),
  };
}

function resizeRenderer() {
  resizeQueued = false;
  if (!renderer) return;
  const size = targetRenderSize();
  renderer.resize(size.width, size.height);
  renderer.getStats().scale = resolutionScale;
}

function scheduleResize() {
  if (resizeQueued) return;
  resizeQueued = true;
  requestAnimationFrame(resizeRenderer);
}
addEventListener('resize', scheduleResize, { passive:true });

function updateMuteUi() {
  muteButton.classList.toggle('is-muted', muted);
  const label = muteButton.querySelector('span');
  if (label) label.textContent = muted ? localized.unmute : localized.mute;
  muteButton.setAttribute('aria-label', muted ? localized.unmuteAria : localized.muteAria);
  if (audio) audio.setMuted(muted);
}

function wakeUi() {
  document.body.classList.remove('ui-idle');
  clearTimeout(idleTimer);
  if (started && !captureMode) idleTimer = window.setTimeout(() => document.body.classList.add('ui-idle'), 2600);
}
['pointermove','pointerdown','keydown','touchstart'].forEach((type) => addEventListener(type, wakeUi, { passive:true }));

function begin({ withAudio = false } = {}) {
  startStamp = performance.now();
  currentTimeline = 0;
  previousTimeline = 0;
  started = true;
  debugPaused = false;
  debugScrubbed = false;
  intro.classList.add('is-hidden');
  document.body.classList.add('is-playing');
  document.body.classList.remove('ui-idle');
  if (audio) audio.resetTimeline();
  if (withAudio && audio) audio.start().then(() => audio.setMuted(muted)).catch(() => {});
  wakeUi();
}

function showError(error) {
  console.error('[CHILSEOK: ONE DAY ABOVE THE MILKY WAY]', error);
  document.body.classList.remove('is-playing');
  intro.classList.add('is-hidden');
  errorPanel.hidden = false;
  errorCode.textContent = String(error?.stack || error?.message || error || 'UNKNOWN_ERROR');
}
window.addEventListener('artworkerror', (event) => showError(event.detail));

function updateEndCard(t) {
  const visibility = started ? smoothstep(56.25, 57.75, t) * (1 - smoothstep(59.35, 59.95, t)) : 0;
  endCard.style.opacity = String(visibility);
  endCard.style.transform = `translate(-50%, ${-47 + (1 - visibility) * 2}%) scale(${.985 + visibility * .015})`;
  endCard.setAttribute('aria-hidden', visibility > .2 ? 'false' : 'true');
}

function updateDebug(now, delta, t, state) {
  if (!debugMode) return;
  frameSamples.push(delta);
  if (frameSamples.length > 45) frameSamples.shift();
  const average = frameSamples.reduce((sum, value) => sum + value, 0) / Math.max(1, frameSamples.length);
  const fps = average > 0 ? 1000 / average : 0;
  debugFps.textContent = `${fps.toFixed(1)} FPS`;
  debugTimeLabel.textContent = `${t.toFixed(2)}s`;
  if (!debugScrubbed) timeSlider.value = String(t);
  const stats = renderer.getStats();
  debugStats.textContent = [
    `version: ${VERSION}`,
    `quality: ${quality.name} / scale ${resolutionScale.toFixed(2)}`,
    `render: ${stats.width} × ${stats.height}`,
    `draw calls: ${stats.drawCalls}`,
    `opening strokes: ${stats.latticeSegments.toLocaleString()}`,
    `flock birds: ${stats.featherInstances.toLocaleString()}`,
    `bridge lights: ${stats.bridgeSegments.toLocaleString()}`,
    `particles: ${stats.particles.toLocaleString()}`,
    `banks ${state.window.toFixed(2)} · river ${state.rift.toFixed(2)} · bridge ${state.seal.toFixed(2)}`,
    `GPU: ${stats.renderer}`,
  ].join('\n');
}

function updateAdaptiveResolution(delta) {
  if (captureMode || fixedFrame !== null || fixedRenderSize || debugScrubbed) return;
  adaptationWindow.push(delta);
  if (adaptationWindow.length < 120) return;
  const average = adaptationWindow.reduce((sum, value) => sum + value, 0) / adaptationWindow.length;
  adaptationWindow.length = 0;
  let changed = false;
  if (average > 22.5 && resolutionScale > .68) {
    resolutionScale = Math.max(.68, resolutionScale - .08);
    fastWindows = 0;
    changed = true;
  } else if (average < 14.2 && resolutionScale < 1) {
    fastWindows++;
    if (fastWindows >= 3) {
      resolutionScale = Math.min(1, resolutionScale + .04);
      fastWindows = 0;
      changed = true;
    }
  } else {
    fastWindows = 0;
  }
  if (changed) scheduleResize();
}

function renderFrame(now) {
  const delta = Math.min(100, now - lastFrameStamp);
  lastFrameStamp = now;
  if (started && fixedFrame === null && !debugPaused) currentTimeline = ((now - startStamp) / 1000) % DURATION;
  else if (fixedFrame !== null) currentTimeline = fixedFrame;

  if (currentTimeline + .25 < previousTimeline && audio) audio.resetTimeline();
  const state = timelineState(currentTimeline);
  const pointScale = quality.pointScale * Math.sqrt(Math.max(.55, renderer.getStats().width / 1280));
  renderer.render(currentTimeline, state, pointScale);
  progressBar.style.transform = `scaleX(${started ? currentTimeline / DURATION : 0})`;
  updateEndCard(currentTimeline);
  if (audio) audio.update(currentTimeline, state);
  updateDebug(now, delta, currentTimeline, state);
  updateAdaptiveResolution(delta);
  previousTimeline = currentTimeline;
  requestAnimationFrame(renderFrame);
}

async function toggleFullscreen() {
  try {
    if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
    else await document.exitFullscreen();
  } catch {}
  wakeUi();
}

startButton.addEventListener('click', async () => {
  if (!audio) audio = new GenerativeAudio();
  try { await audio.start(); } catch {}
  muted = false;
  updateMuteUi();
  begin({ withAudio:false });
});
replayButton.addEventListener('click', () => begin({ withAudio:false }));
muteButton.addEventListener('click', async () => {
  if (!audio) audio = new GenerativeAudio();
  if (!audio.started) { try { await audio.start(); } catch {} }
  muted = !muted;
  updateMuteUi();
  wakeUi();
});
fullscreenButton.addEventListener('click', toggleFullscreen);
reloadButton.addEventListener('click', () => location.reload());

timeSlider.addEventListener('input', () => {
  debugScrubbed = true;
  debugPaused = true;
  started = true;
  currentTimeline = clamp(Number(timeSlider.value), 0, DURATION - .001);
  intro.classList.add('is-hidden');
  document.body.classList.add('is-playing');
});

addEventListener('keydown', (event) => {
  if (event.repeat || captureMode) return;
  const key = event.key.toLowerCase();
  if (key === 'r') begin({ withAudio:false });
  else if (key === 'm') muteButton.click();
  else if (key === 'f') toggleFullscreen();
  else if (key === ' ' && debugMode) {
    event.preventDefault();
    debugPaused = !debugPaused;
    if (!debugPaused) {
      startStamp = performance.now() - currentTimeline * 1000;
      debugScrubbed = false;
    }
  }
});

document.addEventListener('visibilitychange', () => {
  if (captureMode || fixedFrame !== null) return;
  if (document.hidden) hiddenAt = performance.now();
  else if (hiddenAt && started) {
    startStamp += performance.now() - hiddenAt;
    hiddenAt = 0;
  }
});

async function boot() {
  try {
    if (captureMode || fixedFrame !== null) document.body.classList.add('capture-mode');
    if (debugMode) debugPanel.hidden = false;
    const assets = createProceduralAssets({ density:quality.density, particleCount:quality.particleCount, seed:7070707 });
    renderer = new ArtworkRenderer(canvas, assets, { bloomIterations:quality.bloomIterations });
    resizeRenderer();
    renderer.render(currentTimeline, timelineState(currentTimeline), quality.pointScale);
    startButton.disabled = false;
    startButton.querySelector('span').textContent = localized.start;
    startButton.querySelector('span').dataset.i18n = 'start';
    updateMuteUi();
    requestAnimationFrame(renderFrame);
    if (autoplay) begin({ withAudio:false });
  } catch (error) {
    showError(error);
  }
}

boot();
