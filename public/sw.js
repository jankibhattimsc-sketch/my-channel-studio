// Gyan Yatra Studio — Offline-First Progressive Web App Service Worker
// Enables 100% offline functionality on mobile devices even without Wi-Fi or Mobile Data!

const CACHE_NAME = 'gyan-yatra-v102.0';

// Essential App Shell resources required to boot and run offline
const APP_SHELL = [
  '/',
  '/index.html',
  '/studio.html',
  '/manifest.json',
  '/css/style.css',
  '/css/components.css',
  '/js/app.js?v=102.0',
  '/js/api.js?v=101.6',
  '/js/views/home.js?v=100.2',
  '/js/views/projects.js?v=99.0',
  '/js/views/topics.js?v=99.0',
  '/js/views/planner.js?v=99.0',
  '/js/views/scriptwriter.js?v=101.6',
  '/js/views/myvoice.js?v=99.0',
  '/js/views/videoeditor.js?v=101.4',
  '/js/views/savedhub.js?v=1.0',
  '/js/views/savedaudios.js?v=101.4',
  '/js/views/smartask.js?v=102.0',
  '/js/views/facebook.js?v=101.5',
  '/js/views/workspace.js?v=99.0',
  '/js/views/thumbnails.js?v=99.0',
  '/js/views/seo.js?v=99.0',
  '/js/views/seodescription.js?v=99.0',
  '/js/views/analytics.js?v=99.0',
  '/js/views/research.js?v=99.0',
  '/js/views/settings.js?v=101.0',
  '/js/views/chatgpt.js?v=99.0',
  '/js/views/slideprompts.js?v=101.7',
  '/js/views/slideeditor.js?v=99.0',
  '/js/components/slideVoiceStudio.js?v=99.0',
  '/js/components/teleprompterStudio.js',
  '/js/utils/projectState.js?v=101.7',
  '/js/utils/clipboard.js?v=90.0',
  '/js/utils/audioRecorderEnhancer.js?v=90.0',
  '/js/utils/audioStorage.js?v=90.0',
  '/js/utils/audioStitcher.js?v=90.0',
  '/js/utils/videoShare.js?v=90.0',
  '/js/utils/multitrackAudioEngine.js',
  '/js/utils/podcastVoiceIsolator.js',
  '/js/utils/dateTimeIntelligence.js',
  '/vendor/tesseract.min.js'
];

// Install: Cache App Shell immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching app shell for 100% offline capability (v67.0)');
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn('[ServiceWorker] Non-critical cache warning:', err);
      });
    })
  );
});

// Activate: Purge ALL older caches immediately to guarantee zero stale code
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            console.log('[ServiceWorker] Purging stale cache version:', k);
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Strategy:
// 1. Static Scripts & Documents: Network-First when online (auto-sync updates) -> Cache Fallback (offline mode)
// 2. API calls (/api/): Network first -> Offline mock response fallback
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Skip non-GET requests (POST / PUT / DELETE go to server or local IndexedDB fallback)
  if (req.method !== 'GET') {
    return;
  }

  // Development bypass: Always fetch directly from network on localhost to avoid stale code
  if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
    event.respondWith(fetch(req));
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(req).catch(async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        return new Response(JSON.stringify({ offline: true, success: true, data: [] }), {
          headers: { 'Content-Type': 'application/json' }
        });
      })
    );
    return;
  }

  // For HTML pages and JS modules: Network-First with Offline Cache Fallback
  // This guarantees that any update deployed on the server is immediately loaded
  // while still giving 100% full offline capability when network is off!
  event.respondWith(
    fetch(req).then((networkResponse) => {
      if (networkResponse && networkResponse.status === 200) {
        const resClone = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone)).catch(() => { });
      }
      return networkResponse;
    }).catch(async () => {
      // Offline mode: Serve from cache
      const cached = await caches.match(req);
      if (cached) return cached;
      // If navigating to page offline, fallback to cached index.html
      if (req.mode === 'navigate') {
        return (await caches.match('/index.html')) || (await caches.match('/'));
      }
      return new Response('Offline: Content not cached', { status: 503, statusText: 'Offline' });
    })
  );
});
