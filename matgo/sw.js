/* 맞고 서비스워커: 앱 파일 오프라인 캐시 + 새 버전 자동 반영 */
var VERSION = '53fc1f7f699f';
var CACHE = 'matgo-' + VERSION, RT = 'matgo-rt';
var SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); })); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) { return Promise.all(ks.filter(function (k) { return k.indexOf('matgo-') === 0 && k !== CACHE && k !== RT; }).map(function (k) { return caches.delete(k); })); }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var req = e.request; if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.protocol.indexOf('http') !== 0) return;
  // 화면(HTML): 네트워크 우선 → 새 버전 바로 반영, 오프라인이면 캐시
  if (req.mode === 'navigate' || (url.origin === location.origin && /\/(index\.html)?$/.test(url.pathname))) {
    e.respondWith(fetch(req).then(function (r) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put('./index.html', cp); }); return r; }).catch(function () { return caches.match('./index.html'); }));
    return;
  }
  if (url.origin === location.origin) { e.respondWith(caches.match(req).then(function (m) { return m || fetch(req).then(function (r) { var cp = r.clone(); caches.open(CACHE).then(function (c) { c.put(req, cp); }); return r; }); })); return; }
  // 외부(PeerJS 라이브러리, 글꼴): 캐시 후 갱신. 시그널링 서버(웹소켓/API)는 건드리지 않음
  if (/unpkg\.com|jsdelivr\.net|fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    e.respondWith(caches.open(RT).then(function (c) { return c.match(req).then(function (m) { var f = fetch(req).then(function (r) { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(function () { return m; }); return m || f; }); }));
  }
});
self.addEventListener('message', function (e) { if (e.data === 'skip') self.skipWaiting(); });
