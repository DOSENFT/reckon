// Installing on a phone and working with no signal: the manifest, the icons and the service worker.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f));

test('the manifest has what Android needs to install it', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  assert.equal(m.name, 'Reckon');
  assert.equal(m.display, 'standalone');
  assert.ok(m.start_url.startsWith('./'), 'relative start_url, so it works in any folder');
  assert.ok(m.icons.some((i) => i.sizes === '192x192' && i.purpose === 'any'));
  assert.ok(m.icons.some((i) => i.sizes === '512x512' && i.purpose === 'any'));
  assert.ok(m.icons.some((i) => i.purpose === 'maskable'));
  for (const i of m.icons) assert.ok(fs.existsSync(path.join(ROOT, i.src)), 'icon file ' + i.src);
});

test('each PNG icon is the size it claims', () => {
  const m = JSON.parse(read('manifest.webmanifest'));
  for (const i of m.icons.filter((x) => x.type === 'image/png')) {
    const b = read(i.src);
    assert.equal(b.toString('ascii', 1, 4), 'PNG', i.src + ' is a PNG');
    const w = b.readUInt32BE(16), h = b.readUInt32BE(20);
    assert.equal(`${w}x${h}`, i.sizes, i.src);
  }
});

test('sw.js caches every file the page loads, and is rebuilt after any change', () => {
  const files = require(path.join(ROOT, 'files.json'));
  const sw = read('sw.js').toString();
  const list = JSON.parse('[' + sw.match(/const FILES = \[([\s\S]*?)\];/)[1].replace(/,\s*$/, '') + ']');
  const need = ['./index.html', './manifest.webmanifest'].concat(files.styles, files.engine, files.calcs, files.app).map((f) => f.startsWith('./') ? f : './' + f);
  for (const n of need) assert.ok(list.includes(n), 'sw.js caches ' + n);
  for (const n of list.filter((x) => x !== './')) assert.ok(fs.existsSync(path.join(ROOT, n)), 'cached file exists: ' + n);
  const h = crypto.createHash('sha256');
  for (const n of list.filter((x) => x !== './').map((x) => x.slice(2))) { h.update(n); h.update(Buffer.from(read(n).toString('latin1').replace(/\r\n/g, '\n'), 'latin1')); }
  const want = h.digest('hex').slice(0, 12);
  assert.equal(sw.match(/const VERSION = '([0-9a-f]+)'/)[1], want, 'sw.js is stale: run python tools/build_sw.py');
});

test('the page locks itself down: no outside scripts, no inline script', () => {
  const html = read('index.html').toString();
  const csp = html.match(/Content-Security-Policy" content="([^"]+)"/)[1];
  assert.match(csp, /default-src 'self'/);
  assert.match(csp, /script-src 'self'(;|$)/);
  assert.doesNotMatch(csp, /unsafe-eval/);
  assert.match(csp, /object-src 'none'/);
  assert.doesNotMatch(html, /<script>(?!\s*<\/script>)/, 'no inline script');
  assert.doesNotMatch(html, /src="https?:/, 'nothing loaded from another site');
});

test('nothing in the code runs typed text or reaches the internet', () => {
  const files = require(path.join(ROOT, 'files.json'));
  for (const f of [].concat(files.engine, files.calcs, files.app)) {
    const src = read(f).toString();
    const hit = (re) => (src.match(re) || [''])[0];
    assert.equal(hit(/\beval\s*\(|new Function\s*\(|document\.write|\.innerHTML\s*=(?!\s*ICONS\[)|insertAdjacentHTML|outerHTML\s*=/), '', f + ' has a code-running call');
    assert.equal(hit(/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/), '', f + ' talks to the network');
    assert.equal(hit(/(api[_-]?key|secret|password|token)\s*[:=]\s*['"][^'"]{8,}/i), '', f + ' holds a secret');
  }
});
