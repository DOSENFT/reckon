"""Write sw.js, the service worker that lets Reckon open with no signal.

    python tools/build_sw.py

It caches exactly the files index.html loads (files.json) plus the page, manifest and icons,
under a version made from their contents, so any change ships as a fresh cache.
tests/pwa.test.js fails if sw.js is out of date.
"""
import hashlib
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
EXTRA = ['index.html', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png']


def shell_files() -> list[str]:
    f = json.loads((ROOT / 'files.json').read_text(encoding='utf-8'))
    return EXTRA + f['styles'] + f['engine'] + f['calcs'] + f['app']


def version(files: list[str]) -> str:
    h = hashlib.sha256()
    for name in files:
        h.update(name.encode())
        h.update((ROOT / name).read_bytes().replace(b'\r\n', b'\n'))
    return h.hexdigest()[:12]


def render(files: list[str]) -> str:
    listing = ',\n  '.join(json.dumps('./' + n) for n in files)
    return f"""/* Reckon's service worker: made by tools/build_sw.py, don't edit by hand.
   Keeps every file Reckon needs on the phone so it opens with no signal. */
'use strict';
const VERSION = '{version(files)}';
const CACHE = 'reckon-' + VERSION;
const FILES = [
  "./",
  {listing}
];

self.addEventListener('install', (e) => {{
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
}});

self.addEventListener('activate', (e) => {{
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith('reckon-') && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
}});

// Same-site files only: from the cache first (instant, works offline), the network as a fallback.
self.addEventListener('fetch', (e) => {{
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, {{ ignoreSearch: true }}).then((hit) => hit || fetch(req).catch(() =>
      req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
  );
}});
"""


if __name__ == '__main__':
    files = shell_files()
    missing = [n for n in files if not (ROOT / n).is_file()]
    if missing:
        raise SystemExit('Missing: ' + ', '.join(missing))
    (ROOT / 'sw.js').write_text(render(files), encoding='utf-8', newline='\n')
    print('sw.js version', version(files), 'caching', len(files) + 1, 'files')
