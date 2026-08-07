/* 까치툴 서비스워커 — 도구 페이지만 캐시한다.
   범위 밖(게임·갤러리·광고·애널리틱스)은 건드리지 않고 그대로 통과시킨다. */
const VER = 'kmagpie-v1';
const SHELL = 'shell-' + VER;   /* 오프라인 안내 + 아이콘 */
const PAGES = 'pages-' + VER;   /* 도구 HTML */
const ASSET = 'asset-' + VER;   /* /tools/lib/, /images/ */

const OFFLINE_KO = '/tools/offline.html';
const OFFLINE_EN = '/en/tools/offline.html';

const PRECACHE = [
  OFFLINE_KO,
  OFFLINE_EN,
  '/images/icon-192.png',
  '/images/favicon-32.png',
];

/* 이 경로들만 서비스워커가 관여한다 */
function inScope(p) {
  return p.startsWith('/tools/') || p.startsWith('/en/tools/');
}
function isAsset(p) {
  return p.startsWith('/tools/lib/') || p.startsWith('/images/');
}

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(SHELL)
      .then(c => c.addAll(PRECACHE))
      .catch(() => {})            /* 파일 하나가 없어도 설치는 계속 */
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => !k.endsWith(VER)).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* 페이지에서 새 버전 즉시 적용을 요청할 때 */
self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (err) { return; }

  /* 다른 도메인(애드센스·폰트 등)은 그대로 통과 */
  if (url.origin !== self.location.origin) return;
  /* 범위 밖 경로(게임·갤러리·루트 등)도 그대로 통과 */
  if (!inScope(url.pathname) && !isAsset(url.pathname)) return;

  /* 라이브러리·이미지: 캐시 우선 + 뒤에서 갱신 */
  if (isAsset(url.pathname)) {
    e.respondWith(
      caches.open(ASSET).then(async cache => {
        const hit = await cache.match(req);
        const net = fetch(req).then(res => {
          if (res && res.ok) cache.put(req, res.clone());
          return res;
        }).catch(() => null);
        return hit || net || fetch(req);
      })
    );
    return;
  }

  /* 도구 페이지: 네트워크 우선(내용 갱신 보장) → 실패 시 캐시 → 오프라인 안내 */
  if (req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(PAGES).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(async () => {
          const hit = await caches.match(req, { ignoreSearch: true });
          if (hit) return hit;
          const off = url.pathname.startsWith('/en/') ? OFFLINE_EN : OFFLINE_KO;
          return (await caches.match(off)) ||
            new Response('offline', { status: 503, headers: { 'content-type': 'text/plain' } });
        })
    );
    return;
  }

  /* 그 밖의 같은 범위 요청(manifest 등) */
  e.respondWith(
    fetch(req).catch(() => caches.match(req))
  );
});
