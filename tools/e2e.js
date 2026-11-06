// Reckon end to end, in Edge, the way a phone uses it: serves the folder on its own port,
// then at phone (412x915) and PC (1600x1000) taps the keypads, opens all 108 calculators,
// checks Chrome's own "can this install?" answer, turns the network off and reloads.
//   node tools/e2e.js [port] [shots folder]
const path = require('path');
const fs = require('fs');
const net = require('net');
const { spawn } = require('child_process');
const pw = require(process.env.HELM_PLAYWRIGHT || path.join(process.env.USERPROFILE || '', 'Documents', 'Command', 'brain', 'graph', 'node_modules', 'playwright-core'));

const ROOT = path.join(__dirname, '..');
const PORT = Number(process.argv[2] || 8797);
const OUT = path.resolve(process.argv[3] || path.join(ROOT, 'shots'));
const BASE = `http://127.0.0.1:${PORT}/`;
fs.mkdirSync(OUT, { recursive: true });
let fails = 0, passes = 0;
const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); ok ? passes++ : fails++; };

function portFree(p) {
  return new Promise((res) => { const s = net.createServer().once('error', () => res(false)).once('listening', () => s.close(() => res(true))).listen(p, '127.0.0.1'); });
}
async function waitUp() {
  for (let i = 0; i < 50; i++) { try { const r = await fetch(BASE); if (r.ok) return; } catch (e) { /* not yet */ } await new Promise((r) => setTimeout(r, 200)); }
  throw new Error('server never came up');
}
async function taps(page, seq, scope = '.keys') {
  for (const k of seq.split(' ')) {
    if (/^[0-9]+$/.test(k)) { for (const ch of k) await page.click(`${scope} [data-key="${ch}"]`); }
    else await page.click(`${scope} [data-key="${k}"]`);
  }
}

(async () => {
  if (!(await portFree(PORT))) { console.error(`Port ${PORT} is already in use; pick another.`); process.exit(2); }
  const server = spawn('python', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1', '--directory', ROOT], { stdio: 'ignore', windowsHide: true });
  const browser = await pw.chromium.launch({ channel: 'msedge', headless: true });
  try {
    await waitUp();
    for (const s of [
      { name: 'phone', viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
      { name: 'pc', viewport: { width: 1600, height: 1000 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
    ]) {
      const ctx = await browser.newContext({ viewport: s.viewport, isMobile: s.isMobile, hasTouch: s.hasTouch, deviceScaleFactor: s.deviceScaleFactor });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(BASE + '#/job');
      await page.waitForSelector('.keys .k');
      check(await page.evaluate(() => document.documentElement.dataset.look) === 'field', `${s.name}: opens in the Field look (his pick)`);

      // Job keypad
      await taps(page, '5 ft 7 in 3 frac 8 add 2 ft 9 in 5 frac 8 eq');
      check(await page.textContent('.ro-main') === `8' 5"`, `${s.name}: 5' 7-3/8" + 2' 9-5/8" = 8' 5"`);
      await page.screenshot({ path: path.join(OUT, `app-${s.name}-job.png`) });
      await taps(page, 'ac 6 ft rise 12 ft run diag');
      check(await page.textContent('.ro-main') === `13' 5"`, `${s.name}: Rise 6', Run 12' gives Diag 13' 5"`);

      // Calc face
      await page.click('.faces .face:has-text("Calc")');
      await page.waitForSelector('.keys [data-key="sin"]');
      await taps(page, '2 ( 3 + 4 ) pow 2 =');
      check(await page.textContent('.ro-main') === '98', `${s.name}: Calc 2(3+4)^2 = 98`);
      await taps(page, 'ac sin 30 ) =');
      check(await page.textContent('.ro-main') === '0.5', `${s.name}: Calc sin(30°) = 0.5`);
      await taps(page, 'ac 1 / 0 =');
      check(/divide by zero/.test(await page.textContent('.ro-msg')), `${s.name}: Calc 1 ÷ 0 says so in words`);
      await taps(page, 'ac 5 0 + 1 0 % =');
      check(await page.textContent('.ro-main') === '55', `${s.name}: Calc 50 + 10% = 55`);
      // the e key (2nd π) is Euler's number: 2·e·5 = 27.18…, never read as 2×10⁵ (the independent check's find)
      await taps(page, 'ac 2 2nd pi 5 =');
      check(await page.textContent('.ro-main') === '27.1828182846', `${s.name}: Calc 2 e 5 = 27.1828182846 (not 200,000)`);
      await taps(page, 'ac 2 2nd pi - 3 =');
      check(await page.textContent('.ro-main') === '2.4365636569', `${s.name}: Calc 2 e − 3 = 2.4365636569 (not 0.002)`);
      // the second independent check's finds: x² then a digit, a double point, Ans beside a function
      await taps(page, 'ac 2 2nd pow 3 =');
      check(await page.textContent('.ro-main') === '12', `${s.name}: Calc 2 x² 3 = 12 (not 8,388,608)`);
      await taps(page, 'ac 2 . . 5 =');
      check(await page.textContent('.ro-main') === '2.5', `${s.name}: Calc 2 . . 5 = 2.5 (the second point does nothing)`);
      await taps(page, 'ac 5 = ans sin 3 0 ) =');
      check(await page.textContent('.ro-main') === '2.5', `${s.name}: Calc 5 = Ans sin 30 = 2.5 (not "I don't know Anssin")`);
      await taps(page, 'ac 5 0 + 1 0 % =');
      await page.screenshot({ path: path.join(OUT, `app-${s.name}-calc.png`) });

      // every calculator opens with an answer
      const ids = await page.evaluate(() => Reckon.CALCS.map((c) => c.id));
      const broken = [];
      for (const id of ids) {
        await page.evaluate((h) => { location.hash = h; }, '#/c/' + id);
        await page.waitForFunction((n) => document.querySelector('.cv-head h2') && document.querySelector('.result .big') && document.querySelector('.cv-head h2').textContent === n, await page.evaluate((i) => Reckon.getCalc(i).name, id));
        const bad = await page.evaluate(() => document.querySelector('.result').classList.contains('bad') || /NaN|undefined|Infinity/.test(document.querySelector('.result').textContent));
        if (bad) broken.push(id);
      }
      check(ids.length >= 100 && broken.length === 0, `${s.name}: all ${ids.length} calculators open with an answer${broken.length ? ' (broken: ' + broken.join(', ') + ')' : ''}`);

      // a typed edit, a pop-up length keypad, and a bad input
      await page.evaluate(() => { location.hash = '#/c/concrete-slab'; });
      await page.waitForSelector('[data-field="thick"] .len');
      await page.click('[data-field="thick"] .len');
      await page.click('.sheet .k[aria-label="6"]'); await page.click('.sheet .k[aria-label="Inch"]'); await page.click('.sheet .k[aria-label="Done"]');
      check(await page.textContent('.result .big') === '4.89 cu yd', `${s.name}: concrete at 6" thick = 4.89 cu yd`);
      await page.fill('[data-field="waste"] input', 'lots');
      check(/isn't a number/.test(await page.textContent('.result')) && await page.$('[data-field="waste"].err') !== null, `${s.name}: "lots" for waste is refused in words, the box marked`);
      await page.fill('[data-field="waste"] input', '10');
      await page.reload(); await page.waitForSelector('.result .big');
      check(await page.textContent('.result .big') === '4.89 cu yd', `${s.name}: typed values survive a reload`);
      // a damaged saved choice falls back to the usual one: the box and the answer agree (the independent check's find)
      const keepFields = await page.evaluate(() => localStorage.getItem('reckon.fields'));
      await page.evaluate(() => localStorage.setItem('reckon.fields', JSON.stringify({ 'concrete-slab': { bag: '999' } })));
      await page.reload(); await page.waitForSelector('.result');
      const dmg = await page.evaluate(() => ({ bad: document.querySelector('.result').classList.contains('bad'), bag: document.querySelector('[data-field="bag"] select').value, big: (document.querySelector('.result .big') || {}).textContent }));
      check(!dmg.bad && dmg.bag === '80' && /cu yd/.test(dmg.big || ''), `${s.name}: a damaged saved bag size opens as 80 lb with an answer (${JSON.stringify(dmg)})`);
      await page.evaluate((v) => { if (v) localStorage.setItem('reckon.fields', v); }, keepFields);
      // links that try to break the page: a broken search address and a name every object has
      for (const h of ['#/find/%', '#/find/%E0%A4%A', '#/c/constructor', '#/c/__proto__', '#/c/toString']) {
        const before = errors.length;
        await page.evaluate((x) => { location.hash = x; }, h);
        await page.waitForTimeout(150);
        const shown = await page.evaluate(() => !!document.querySelector('.search, .row, .keys .k'));
        check(errors.length === before && shown, `${s.name}: the link ${h} opens a normal screen, no error`);
      }
      await page.evaluate(() => { location.hash = '#/c/time-card'; });
      await page.waitForSelector('.result .big');
      await page.screenshot({ path: path.join(OUT, `app-${s.name}-timecard.png`) });

      // search and a face list
      await page.evaluate(() => { location.hash = '#/find'; });
      await page.fill('.search', 'stringer');
      check(await page.textContent('.list .row b') === 'Stairs', `${s.name}: search "stringer" finds Stairs`);
      await page.evaluate(() => { location.hash = '#/money'; });
      await page.waitForSelector('.row');
      check((await page.$$('.row')).length === 15, `${s.name}: Money face lists 15 calculators`);
      await page.screenshot({ path: path.join(OUT, `app-${s.name}-money.png`) });

      // fit: no sideways scroll, fingertip keys
      for (const h of ['#/job', '#/calc', '#/c/rafter', '#/convert']) {
        await page.evaluate((x) => { location.hash = x; }, h);
        await page.waitForTimeout(150);
        const g = await page.evaluate(() => ({
          wide: document.documentElement.scrollWidth > innerWidth + 1,
          small: [...document.querySelectorAll('button, input, select')].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 32).length,
          keysOff: [...document.querySelectorAll('main.fixed .k')].filter((k) => k.getBoundingClientRect().bottom > innerHeight).length,
        }));
        check(!g.wide && !g.small && !g.keysOff, `${s.name} ${h}: fits (no sideways scroll, nothing under 32 px, keys on screen)`);
      }

      if (s.name === 'phone') {
        // installable, per the browser itself (a normal profile: private windows can never install)
        const profile = fs.mkdtempSync(path.join(require('os').tmpdir(), 'reckon-install-'));
        const pctx = await pw.chromium.launchPersistentContext(profile, { channel: 'msedge', headless: true, viewport: s.viewport });
        try {
          const ip = pctx.pages()[0] || await pctx.newPage();
          await ip.goto(BASE + '#/job'); await ip.waitForSelector('.keys .k');
          await ip.evaluate(() => navigator.serviceWorker.ready);
          const inst = await (await pctx.newCDPSession(ip)).send('Page.getInstallabilityErrors');
          check(inst.installabilityErrors.length === 0, `phone: Edge says it can install (${JSON.stringify(inst.installabilityErrors.map((e) => e.errorId))})`);
        } finally { await pctx.close(); fs.rmSync(profile, { recursive: true, force: true }); }
        // airplane mode
        await page.goto(BASE + '#/job'); await page.waitForSelector('.keys .k');
        await page.evaluate(() => navigator.serviceWorker.ready);
        await page.reload(); await page.waitForSelector('.keys .k');
        await ctx.setOffline(true);
        await page.reload(); await page.waitForSelector('.keys .k', { timeout: 5000 });
        await taps(page, '1 2 ft mul 1 0 ft eq');
        check(await page.textContent('.ro-main') === '120 sq ft', 'phone: with the network off, it reloads and works (12\' × 10\' = 120 sq ft)');
        await page.evaluate(() => { location.hash = '#/c/mortgage'; }); await page.waitForSelector('.result .big');
        check(await page.textContent('.result .big') === '$1,916.96', 'phone: offline, Mortgage still answers');
        await ctx.setOffline(false);
        await page.evaluate(() => { location.hash = '#/job'; });
        await page.click('[aria-label="Settings"]');
        await page.waitForSelector('.sheet');
        await page.screenshot({ path: path.join(OUT, 'app-phone-settings.png') });
      }
      check(errors.length === 0, `${s.name}: 0 page errors ${errors.length ? JSON.stringify(errors.slice(0, 3)) : ''}`);
      await ctx.close();
    }

    // Held sideways (his note 2026-11-05: "The phone in the sideways position is unusable. I can't reach the pad,
    // etc. It should increase options and whatnot like other calculator apps"). 997x448 is his Pixel 8 Pro.
    const onScreen = (page, scope) => page.evaluate((sc) => {
      const r = [...document.querySelectorAll(sc + ' .k')].filter((k) => k.offsetParent).map((k) => k.getBoundingClientRect());
      return { n: r.length, off: r.filter((x) => x.bottom > innerHeight + 0.5 || x.right > innerWidth + 0.5 || x.top < 0 || x.left < 0).length, minH: Math.round(Math.min(...r.map((x) => x.height))) };
    }, scope);
    for (const [w, h] of [[997, 448], [915, 360], [740, 360]]) {
      const name = `sideways ${w}x${h}`;
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(BASE + '#/job'); await page.waitForSelector('.keys .k');
      let g = await onScreen(page, 'main');
      check(g.n === 32 && g.off === 0 && g.minH >= 44, `${name}: Job shows all 32 keys, every one on screen, at least 44 px tall (${JSON.stringify(g)})`);
      await taps(page, '5 ft 7 in 3 frac 8 add 2 ft 9 in 5 frac 8 eq');
      check(await page.textContent('.ro-main') === `8' 5"`, `${name}: 5' 7-3/8" + 2' 9-5/8" = 8' 5"`);
      await taps(page, 'ac 1 0 mplus ac 4 mminus mr');
      check(await page.textContent('.ro-main') === '6', `${name}: the sideways-only M− key: 10 M+, 4 M−, MR = 6`);
      await taps(page, 'mc ac');
      if (w === 997) await page.screenshot({ path: path.join(OUT, `app-sideways-job.png`) });
      await page.click('.faces .face:has-text("Calc")');
      await page.waitForSelector('.keys [data-key="inv"]');
      g = await onScreen(page, 'main');
      check(g.n === 40 && g.off === 0 && g.minH >= 44, `${name}: Calc shows all 40 keys (2nd functions, 1/x, 10ˣ, eˣ), every one on screen (${JSON.stringify(g)})`);
      check(!(await page.$('.keys [data-key="2nd"]')), `${name}: Calc needs no 2nd key sideways`);
      for (const [seq, want] of [['ac 4 inv =', '0.25'], ['ac 2 p10 3 ) =', '2,000'], ['ac asin 1 ) =', '90'], ['ac 3 fact =', '6'], ['ac 2 sq 3 =', '12']]) {
        await taps(page, seq);
        check(await page.textContent('.ro-main') === want, `${name}: Calc ${seq.replace(/^ac /, '')} → ${want}`);
      }
      if (w === 997) await page.screenshot({ path: path.join(OUT, `app-sideways-calc.png`) });
      await page.evaluate(() => { location.hash = '#/c/stairs'; });
      await page.waitForSelector('[data-field="rise"] .len');
      await page.click('[data-field="rise"] .len'); await page.waitForSelector('.sheet .k');
      g = await onScreen(page, '.sheet');
      check(g.n === 16 && g.off === 0, `${name}: the measuring pad pop-up shows all 16 keys on screen (${JSON.stringify(g)})`);
      if (w === 997) await page.screenshot({ path: path.join(OUT, `app-sideways-sheet.png`) });
      await page.click('.sheet [aria-label="Close"]');
      for (const hsh of ['#/job', '#/calc', '#/c/stairs', '#/money', '#/find']) {
        await page.evaluate((x) => { location.hash = x; }, hsh);
        await page.waitForTimeout(150);
        const f = await page.evaluate(() => ({
          wide: document.documentElement.scrollWidth > innerWidth + 1,
          small: [...document.querySelectorAll('button, input, select')].filter((b) => b.offsetParent && b.getBoundingClientRect().height < 32).length,
        }));
        check(!f.wide && !f.small, `${name} ${hsh}: fits (no sideways scroll, nothing under 32 px)`);
      }
      check(errors.length === 0, `${name}: 0 page errors ${errors.length ? JSON.stringify(errors.slice(0, 3)) : ''}`);
      await ctx.close();
    }
    {
      // turning the phone mid-sum keeps what's typed and swaps the keys
      const ctx = await browser.newContext({ viewport: { width: 448, height: 997 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.goto(BASE + '#/job'); await page.waitForSelector('.keys .k');
      await taps(page, '1 2 ft add 3');
      await page.setViewportSize({ width: 997, height: 448 });
      await page.waitForFunction(() => document.querySelectorAll('main .keys .k').length === 32);
      await taps(page, 'ft eq');
      check(await page.textContent('.ro-main') === `15' 0"`, `turned sideways mid-sum: 12' + 3' still = 15' 0", with the 32 sideways keys`);
      await page.setViewportSize({ width: 448, height: 997 });
      await page.waitForFunction(() => document.querySelectorAll('main .keys .k').length === 30);
      check(await page.textContent('.ro-main') === `15' 0"`, `turned back upright: the answer stays and the upright 30 keys return`);
      check(errors.length === 0, `turning: 0 page errors ${errors.length ? JSON.stringify(errors.slice(0, 3)) : ''}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.kill();
  }
  console.log(`${passes} passed, ${fails} failed`);
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
