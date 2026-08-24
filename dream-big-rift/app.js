const VERSION = '20260823-4';
const params = new URLSearchParams(location.search);
const stage = document.getElementById('stage');
const intro = document.getElementById('intro');
const startButton = document.getElementById('start-button');
const replayButton = document.getElementById('replay-button');
const fullscreenButton = document.getElementById('fullscreen-button');
const muteButton = document.getElementById('mute-button');
const progressBar = document.querySelector('#progress span');
const endCard = document.getElementById('end-card');
const fallback = document.getElementById('fallback');

let fallbackStarted = false;

function getLanguage() {
  const forced = params.get('lang');
  if (['ko', 'en', 'ja'].includes(forced)) return forced;
  const raw = (navigator.language || 'ko').toLowerCase();
  if (raw.startsWith('ja')) return 'ja';
  if (raw.startsWith('en')) return 'en';
  return 'ko';
}

const language = getLanguage();
const fallbackCopy = {
  ko: {
    eyebrow: '실시간 생성형 우주 미디어아트',
    subtitle: '균열은 파괴의 흔적이 아니라, 빛이 다시 질서를 짜는 틈이 된다.',
    meta: '60초 · 실시간 프로시저럴 비주얼 · 생성형 음향',
    start: '작품 시작', hint: '헤드폰 또는 스피커 사용을 권장합니다.',
    replay: '다시', fullscreen: '전체화면', mute: '음소거', unmute: '소리 켜기',
    endline: '혼돈은 사라지지 않는다. 우리는 그 위에 다시 빛을 잇는다.'
  },
  en: {
    eyebrow: 'REAL-TIME GENERATIVE COSMIC MEDIA ART',
    subtitle: 'A rift is not merely a wound. It is where light begins to weave order again.',
    meta: '60 sec · Real-time procedural visuals · Generative sound',
    start: 'Enter Artwork', hint: 'Headphones or speakers recommended.',
    replay: 'Replay', fullscreen: 'Fullscreen', mute: 'Mute', unmute: 'Unmute',
    endline: 'Chaos does not disappear. We stitch light across it again.'
  },
  ja: {
    eyebrow: 'リアルタイム生成型・宇宙メディアアート',
    subtitle: '亀裂は破壊の跡ではなく、光が再び秩序を編み始める隙間になる。',
    meta: '60秒 · リアルタイム生成ビジュアル · 生成音響',
    start: '作品を開始', hint: 'ヘッドホンまたはスピーカー推奨。',
    replay: '再生', fullscreen: '全画面', mute: 'ミュート', unmute: '音声をオン',
    endline: '混沌は消えない。私たちはその上に再び光をつなぐ。'
  }
};

function applyFallbackCopy() {
  document.documentElement.lang = language;
  document.querySelectorAll('[data-i18n]').forEach((node) => {
    const value = fallbackCopy[language][node.dataset.i18n];
    if (value) node.textContent = value;
  });
}

function startCanvasFallback(reason) {
  if (fallbackStarted) return;
  fallbackStarted = true;
  console.warn('[RIFT] WebGL edition could not start; using resilient canvas edition.', reason);
  applyFallbackCopy();
  fallback.hidden = true;
  intro.classList.remove('is-hidden');
  stage.replaceChildren();

  const captureMode = params.has('capture') || params.has('exhibition') || params.has('reel');
  if (captureMode) document.body.classList.add('capture-mode');

  const canvas = document.createElement('canvas');
  canvas.setAttribute('aria-hidden', 'true');
  stage.appendChild(canvas);
  const ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!ctx) {
    fallback.hidden = false;
    fallback.querySelector('strong').textContent = '작품을 초기화할 수 없습니다.';
    fallback.querySelector('span').textContent = String(reason?.message || reason || 'Canvas unavailable');
    return;
  }

  const DURATION = 60;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stars = [];
  const dust = [];
  let width = 1;
  let height = 1;
  let dpr = 1;
  let running = captureMode;
  let startStamp = performance.now();
  let previousT = 0;
  let muted = captureMode;
  let audio = null;
  let pointerX = .5;
  let pointerY = .5;

  const rand = (() => {
    let seed = 0x6d2b79f5;
    return () => {
      seed |= 0;
      seed = seed + 0x6D2B79F5 | 0;
      let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  })();

  function clamp(v, a = 0, b = 1) { return Math.max(a, Math.min(b, v)); }
  function smooth(a, b, x) {
    const t = clamp((x - a) / Math.max(.0001, b - a));
    return t * t * (3 - 2 * t);
  }
  function pulse(a, b, c, d, x) { return smooth(a, b, x) * (1 - smooth(c, d, x)); }

  function seedField() {
    stars.length = 0;
    dust.length = 0;
    const starCount = Math.min(1100, Math.max(420, Math.round(width * height / 2200)));
    const dustCount = Math.min(360, Math.max(130, Math.round(width * height / 7200)));
    for (let i = 0; i < starCount; i++) {
      stars.push({ x: rand(), y: rand(), r: .25 + rand() * 1.45, a: .22 + rand() * .76, p: rand() * Math.PI * 2, warm: rand() > .93 });
    }
    for (let i = 0; i < dustCount; i++) {
      dust.push({ x: rand(), y: rand(), z: .2 + rand() * .8, p: rand() * Math.PI * 2, s: .35 + rand() * 1.8 });
    }
  }

  function resize() {
    const nextDpr = Math.min(window.devicePixelRatio || 1, innerWidth < 720 ? 1.25 : 1.7);
    const w = Math.max(1, innerWidth);
    const h = Math.max(1, innerHeight);
    if (w === width && h === height && nextDpr === dpr) return;
    width = w; height = h; dpr = nextDpr;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seedField();
  }

  function drawBackground(time, storm, after) {
    const bg = ctx.createLinearGradient(0, 0, width, height);
    bg.addColorStop(0, '#02050d');
    bg.addColorStop(.48, storm > .1 ? '#08091d' : '#030714');
    bg.addColorStop(1, after > .2 ? '#071320' : '#010309');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    const nebulaX = width * (.58 + Math.sin(time * .04) * .05);
    const nebulaY = height * .37;
    const nebula = ctx.createRadialGradient(nebulaX, nebulaY, 0, nebulaX, nebulaY, Math.max(width, height) * .68);
    nebula.addColorStop(0, `rgba(55,104,170,${.12 + storm * .08})`);
    nebula.addColorStop(.35, `rgba(78,38,126,${.065 + storm * .11})`);
    nebula.addColorStop(.7, 'rgba(14,67,88,.035)');
    nebula.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = nebula;
    ctx.fillRect(0, 0, width, height);

    const gold = ctx.createRadialGradient(width * .62, height * .47, 0, width * .62, height * .47, Math.max(width, height) * .48);
    gold.addColorStop(0, `rgba(214,156,41,${after * .055})`);
    gold.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gold;
    ctx.fillRect(0, 0, width, height);
  }

  function drawStars(time, storm) {
    ctx.save();
    for (const star of stars) {
      const twinkle = .55 + .45 * Math.sin(time * (.45 + star.r * .25) + star.p);
      const drift = reducedMotion ? 0 : Math.sin(time * .05 + star.p) * storm * 3;
      const x = star.x * width + drift;
      const y = star.y * height;
      const alpha = star.a * (.46 + .54 * twinkle) * (1 - storm * .16);
      ctx.fillStyle = star.warm ? `rgba(255,220,151,${alpha})` : `rgba(181,220,255,${alpha})`;
      ctx.beginPath(); ctx.arc(x, y, star.r * (1 + storm * .18), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawPlanet(seal, after) {
    const radius = Math.min(width, height) * .23;
    const px = width * (.13 + (pointerX - .5) * .012);
    const py = height * .82;
    const planet = ctx.createRadialGradient(px - radius * .35, py - radius * .45, radius * .05, px, py, radius);
    planet.addColorStop(0, '#1b5574');
    planet.addColorStop(.38, '#0b2e4b');
    planet.addColorStop(.78, '#061424');
    planet.addColorStop(1, '#01050a');
    ctx.fillStyle = planet;
    ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.fill();

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = `rgba(113,216,255,${.16 + after * .2})`;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = '#6fd8ff'; ctx.shadowBlur = 16;
    ctx.beginPath(); ctx.arc(px, py, radius + 1, -2.7, .35); ctx.stroke();
    if (seal > .05) {
      ctx.strokeStyle = `rgba(240,201,109,${seal * .28})`;
      ctx.shadowColor = '#d69c29';
      ctx.beginPath(); ctx.arc(px, py, radius * 1.06, -2.8, .28); ctx.stroke();
    }
    ctx.restore();
  }

  function buildRiftPath(time, open, storm) {
    const points = [];
    const centerX = width * (.61 + (pointerX - .5) * .018);
    const top = height * .12;
    const bottom = height * .85;
    const segments = 64;
    for (let i = 0; i <= segments; i++) {
      const n = i / segments;
      const y = top + (bottom - top) * n;
      const taper = Math.sin(Math.PI * n);
      const jag = Math.sin(n * 19 + time * .85) * 7 + Math.sin(n * 47 - time * .48) * 3.5;
      const sway = Math.sin(n * 6.2 + time * .18) * 19;
      const x = centerX + (sway + jag * (1 + storm * 1.3)) * taper * (.2 + open * .8);
      points.push({ x, y, taper });
    }
    return points;
  }

  function strokeRift(points, color, widthValue, blur, alpha) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.strokeStyle = color;
    ctx.globalAlpha = alpha;
    ctx.lineWidth = widthValue;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.beginPath();
    points.forEach((point, index) => index ? ctx.lineTo(point.x, point.y) : ctx.moveTo(point.x, point.y));
    ctx.stroke();
    ctx.restore();
  }

  function drawRift(time, open, storm, seal) {
    if (open + seal < .01) return;
    const points = buildRiftPath(time, Math.max(open, seal * .28), storm);
    const coreWidth = 1.2 + open * 3.4 + storm * 1.5;
    strokeRift(points, seal > .35 ? '#fff2c3' : '#d6edff', coreWidth, 12, .9);
    strokeRift(points, seal > .25 ? '#d69c29' : '#6fd8ff', 7 + open * 12 + storm * 7, 26, .26 + open * .18);
    strokeRift(points, '#8f72ff', 23 + open * 28 + storm * 14, 45, .08 + storm * .1);

    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < dust.length; i++) {
      const p = dust[i];
      const phase = (time * (.02 + p.z * .03) + p.p / 6.28) % 1;
      const y = height * (.1 + phase * .8);
      const center = points[Math.min(points.length - 1, Math.floor(phase * points.length))];
      const spread = (1 - storm * .34) * (45 + p.z * 130) * Math.sin(Math.PI * phase);
      const orbit = Math.sin(time * (1.1 + p.z) + p.p) * spread;
      const x = center.x + orbit * (seal > .2 ? (1 - seal * .75) : 1);
      const alpha = (.12 + p.z * .5) * (open * .8 + storm * .7 + seal * .65);
      ctx.fillStyle = seal > .25 ? `rgba(255,196,75,${alpha})` : `rgba(108,210,255,${alpha})`;
      ctx.beginPath(); ctx.arc(x, y, p.s * (1 + storm), 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function drawSeal(time, seal) {
    if (seal < .01) return;
    const cx = width * (.61 + (pointerX - .5) * .018);
    const cy = height * .47;
    const base = Math.min(width, height) * .19;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = 'screen';
    ctx.shadowColor = '#d69c29';
    ctx.shadowBlur = 22;
    for (let i = 0; i < 5; i++) {
      const r = base * (.62 + i * .18) * (1.42 - seal * .42);
      ctx.save();
      ctx.rotate(time * (.015 + i * .004) * (i % 2 ? -1 : 1));
      ctx.strokeStyle = `rgba(240,201,109,${seal * (.15 + i * .018)})`;
      ctx.lineWidth = 1 + i * .18;
      ctx.setLineDash([r * .24, r * .08]);
      ctx.beginPath(); ctx.ellipse(0, 0, r, r * (.72 + i * .015), 0, 0, Math.PI * 2); ctx.stroke();
      ctx.restore();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = `rgba(255,224,145,${seal * .58})`;
    ctx.lineWidth = 1.2;
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + time * .012;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * base * .22, Math.sin(a) * base * .16); ctx.lineTo(Math.cos(a) * base * 1.26, Math.sin(a) * base * .91); ctx.stroke();
    }
    ctx.restore();
  }

  function drawMagpieSignature(time, seal, after) {
    const alpha = Math.max(seal * .58, after * .42);
    if (alpha < .02) return;
    const x = width * .61;
    const y = height * .47;
    const size = Math.min(width, height) * .045;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.sin(time * .18) * .025);
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `rgba(248,220,143,${alpha})`;
    ctx.shadowColor = '#d69c29'; ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.moveTo(-size * .9, size * .14);
    ctx.quadraticCurveTo(-size * .22, -size * .82, size * .02, -size * .05);
    ctx.quadraticCurveTo(size * .48, -size * .56, size * .92, -size * .18);
    ctx.quadraticCurveTo(size * .46, -size * .06, size * .16, size * .12);
    ctx.quadraticCurveTo(size * .35, size * .55, size * .74, size * .76);
    ctx.quadraticCurveTo(size * .18, size * .58, -size * .06, size * .23);
    ctx.quadraticCurveTo(-size * .4, size * .5, -size * .9, size * .14);
    ctx.fill();
    ctx.restore();
  }

  function createAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    const ac = new AudioContextClass();
    const master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
    const low = ac.createOscillator(); low.type = 'sine'; low.frequency.value = 47;
    const high = ac.createOscillator(); high.type = 'sine'; high.frequency.value = 71;
    const g1 = ac.createGain(); const g2 = ac.createGain(); g1.gain.value = .18; g2.gain.value = .055;
    const filter = ac.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 460;
    low.connect(g1).connect(filter); high.connect(g2).connect(filter); filter.connect(master);
    low.start(); high.start();
    return { ac, master, low, high, filter };
  }

  function updateAudio(open, storm, seal) {
    if (!audio) return;
    const now = audio.ac.currentTime;
    audio.master.gain.setTargetAtTime(muted ? 0 : .23, now, .18);
    audio.low.frequency.setTargetAtTime(47 + open * 13 + storm * 16, now, .16);
    audio.high.frequency.setTargetAtTime(71 + seal * 94, now, .18);
    audio.filter.frequency.setTargetAtTime(390 + open * 260 + storm * 850 + seal * 340, now, .18);
  }

  function begin(withAudio = true) {
    running = true;
    startStamp = performance.now();
    previousT = 0;
    intro.classList.add('is-hidden');
    document.body.classList.add('is-playing');
    if (withAudio && !captureMode) {
      if (!audio) audio = createAudio();
      audio?.ac.resume?.();
      muted = false;
      muteButton.classList.remove('is-muted');
    }
  }

  function updateMuteLabel() {
    const span = muteButton.querySelector('span');
    if (span) span.textContent = muted ? fallbackCopy[language].unmute : fallbackCopy[language].mute;
    muteButton.classList.toggle('is-muted', muted);
  }

  startButton.onclick = () => begin(true);
  replayButton.onclick = () => begin(false);
  fullscreenButton.onclick = async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch {}
  };
  muteButton.onclick = () => { muted = !muted; updateMuteLabel(); };
  addEventListener('pointermove', (event) => {
    pointerX += (event.clientX / Math.max(1, width) - pointerX) * .35;
    pointerY += (event.clientY / Math.max(1, height) - pointerY) * .35;
  }, { passive: true });

  function frame(now) {
    resize();
    const elapsed = running ? ((now - startStamp) / 1000) % DURATION : 0;
    if (elapsed + .2 < previousT) endCard.style.opacity = '0';
    previousT = elapsed;

    const open = smooth(6.5, 17.5, elapsed) * (1 - smooth(43, 53, elapsed));
    const storm = pulse(16, 24, 37, 46, elapsed);
    const seal = pulse(34, 41, 52, 57.5, elapsed);
    const after = smooth(50, 56, elapsed);

    drawBackground(now / 1000, storm, after);
    drawStars(now / 1000, storm);
    drawPlanet(seal, after);
    drawRift(now / 1000, Math.max(open, seal * .28), storm, seal);
    drawSeal(now / 1000, seal);
    drawMagpieSignature(now / 1000, seal, after);

    progressBar.style.transform = `scaleX(${running ? elapsed / DURATION : 0})`;
    const ending = running ? smooth(55.2, 57.8, elapsed) * (1 - smooth(59.4, 60, elapsed)) : 0;
    endCard.style.opacity = String(ending);
    endCard.style.transform = `translate(-50%, ${-46 + (1 - ending) * 2}%) scale(${.985 + ending * .015})`;
    endCard.setAttribute('aria-hidden', ending > .2 ? 'false' : 'true');
    updateAudio(open, storm, seal);
    requestAnimationFrame(frame);
  }

  updateMuteLabel();
  requestAnimationFrame(frame);
  if (captureMode) begin(false);
}

async function bootWebGL() {
  if (params.has('canvas') || params.has('fallback')) throw new Error('Canvas edition requested');
  const probe = document.createElement('canvas');
  const gl2 = probe.getContext('webgl2', { failIfMajorPerformanceCaveat: false });
  if (!gl2) throw new Error('WEBGL2_CONTEXT_UNAVAILABLE');
  gl2.getExtension('WEBGL_lose_context')?.loseContext();

  const [THREE, composerModule, renderModule, bloomModule, outputModule] = await Promise.all([
    import('three'),
    import('three/addons/postprocessing/EffectComposer.js'),
    import('three/addons/postprocessing/RenderPass.js'),
    import('three/addons/postprocessing/UnrealBloomPass.js'),
    import('three/addons/postprocessing/OutputPass.js')
  ]);

  const parts = await Promise.all([1, 2, 3, 4].map(async (index) => {
    const response = await fetch(`./app.${index}.txt?v=${VERSION}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Runtime part ${index} failed: ${response.status}`);
    return response.text();
  }));

  const encoded = parts.join('').replace(/\s+/g, '');
  const binary = atob(encoded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  const source = new TextDecoder('utf-8').decode(bytes);
  const entry = source.indexOf('const DURATION');
  if (entry < 0) throw new Error('Artwork runtime entry point was not found.');

  const execute = new Function(
    'THREE', 'EffectComposer', 'RenderPass', 'UnrealBloomPass', 'OutputPass',
    source.slice(entry)
  );
  execute(
    THREE,
    composerModule.EffectComposer,
    renderModule.RenderPass,
    bloomModule.UnrealBloomPass,
    outputModule.OutputPass
  );

  if (!stage.querySelector('canvas')) throw new Error('Renderer canvas was not attached.');
}

try {
  await bootWebGL();
} catch (error) {
  startCanvasFallback(error);
}
