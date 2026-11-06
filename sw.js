/* Reckon's service worker: made by tools/build_sw.py, don't edit by hand.
   Keeps every file Reckon needs on the phone so it opens with no signal. */
'use strict';
const VERSION = 'a14bb6750227';
const CACHE = 'reckon-' + VERSION;
const FILES = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./app.css",
  "./engine/core.js",
  "./engine/length.js",
  "./engine/keypad.js",
  "./engine/dates.js",
  "./engine/expr.js",
  "./engine/quick.js",
  "./calcs/registry.js",
  "./calcs/job.js",
  "./calcs/job2.js",
  "./calcs/money.js",
  "./calcs/time.js",
  "./calcs/travel.js",
  "./calcs/convert.js",
  "./calcs/health.js",
  "./calcs/math.js",
  "./calcs/science.js",
  "./calcs/life.js",
  "./calcs/maint.js",
  "./app.js"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('reckon-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

// Same-site files only: from the cache first (instant, works offline), the network as a fallback.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).catch(() =>
      req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
  );
});
