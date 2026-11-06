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

      // Calc face: the everyday pad plus his maintenance keys (his picks, 2026-11-05: "I actually never use the normal
      // extra calculator scientific tools" → Shop, Electric, Fuel/HVAC, Water, upright too)
      await page.click('.faces .face:has-text("Calc")');
      await page.waitForSelector('.qtab');
      check(!(await page.$('.keys [data-key="sin"], .keys [data-key="2nd"], .keys [data-key="pi"]')), `${s.name}: Calc has no scientific keys (his call)`);
      // his note (2026-11-06): "there's no way for me to backspace or clear" (AC and ⌫ blended into the keys above them)
      // and "make the specialty buttons smaller and different colored. Possible darker with white or cream letters"
      const look = await page.evaluate(() => {
        const lum = (c) => { const m = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number).map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2]; };
        const st = (sel) => { const e = document.querySelector(sel); const s = getComputedStyle(e); const r = e.getBoundingClientRect(); return { bg: s.backgroundColor, fg: s.color, h: r.height, top: r.top, bottom: r.bottom }; };
        const q = st('.qkeys .k'), tool = st('.qkeys .k-flip'), ac = st('.pad [data-key="ac"]'), back = st('.pad [data-key="back"]'), num = st('.pad [data-key="7"]');
        const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
        return { q, tool, ac, back, num, qDarker: lum(q.bg) < lum(num.bg), qContrast: ratio(q.fg, q.bg), acContrast: ratio(ac.fg, ac.bg), screenH: innerHeight };
      });
      check(look.ac.bg === look.back.bg && look.ac.bg !== look.num.bg && look.ac.bg !== look.q.bg && look.ac.bottom <= look.screenH && look.back.bottom <= look.screenH,
        `${s.name}: AC and ⌫ have their own erase color, on screen (${look.ac.bg})`);
      check(look.qDarker && look.q.bg === look.tool.bg && look.qContrast >= 4.5 && look.acContrast >= 4.5,
        `${s.name}: the specialty keys are darker than the number keys with readable cream letters (${look.qContrast.toFixed(1)}:1)`);
      check(look.q.h >= 44 && look.q.h < look.num.h, `${s.name}: the specialty keys are shorter than the number keys and still fingertip-tall (${Math.round(look.q.h)} vs ${Math.round(look.num.h)} px)`);
      check(JSON.stringify(await page.$$eval('.qtab', (t) => t.map((x) => x.querySelector('.qn').textContent))) === '["Shop","Electric","Fuel/HVAC","Water"]', `${s.name}: Calc's four tabs: Shop, Electric, Fuel/HVAC, Water`);
      await taps(page, '1 2 * 3 + 4 =');
      check(await page.textContent('.ro-main') === '40', `${s.name}: Calc 12 × 3 + 4 = 40`);
      await taps(page, 'ac 1 / 0 =');
      check(/divide by zero/.test(await page.textContent('.ro-msg')), `${s.name}: Calc 1 ÷ 0 says so in words`);
      await taps(page, 'ac 5 0 + 1 0 % =');
      check(await page.textContent('.ro-main') === '55', `${s.name}: Calc 50 + 10% = 55`);
      await taps(page, 'ac 2 . . 5 =');
      check(await page.textContent('.ro-main') === '2.5', `${s.name}: Calc 2 . . 5 = 2.5 (the second point does nothing)`);
      const ro = async () => [await page.textContent('.ro-main'), await page.textContent('.ro-msg')];
      let rv;
      await page.click('.qtab[data-group="shop"]');
      await taps(page, 'ac 72 q:f-to-c'); rv = await ro();
      check(rv[0] === '22.2222' && rv[1] === '°C', `${s.name}: Shop: 72, °F→°C = 22.2222 °C (${rv})`);
      await taps(page, 'ac 70 + 2 = q:f-to-c'); rv = await ro();
      check(rv[0] === '22.2222', `${s.name}: Shop: right after =, °F→°C works on the answer (70 + 2)`);
      await taps(page, '* 9 / 5 + 32 =');
      check(await page.textContent('.ro-main') === '72', `${s.name}: Shop: math on a conversion uses its full value (22.2222… × 9 ÷ 5 + 32 = 72 exactly)`);
      await taps(page, 'flip');
      check(await page.textContent('.qkeys [data-key="q:c-to-f"]') === '°C→°F' && await page.getAttribute('.qkeys [data-key="flip"]', 'aria-pressed') === 'true', `${s.name}: Shop: ⇄ turns °F→°C into °C→°F`);
      await taps(page, 'ac 100 q:c-to-f');
      check(await page.textContent('.ro-main') === '212', `${s.name}: Shop: flipped, 100 °C→°F = 212`);
      await taps(page, 'flip');
      await taps(page, 'ac q:in-to-mm');
      check(/Type a number first/.test(await page.textContent('.ro-msg')), `${s.name}: Shop: a conversion with nothing typed says so in words`);
      await taps(page, 'ac 7 . 38 q:to-16th'); rv = await ro();
      check(rv[0] === '7.375' && /7-3\/8"/.test(rv[1]), `${s.name}: Shop: 7.38 →1/16" = 7-3/8" (${rv})`);
      await page.click('.qtab[data-group="elec"]');
      await taps(page, 'ac 1500 q:w-to-a120'); rv = await ro();
      check(rv[0] === '12.5' && /at 120 V/.test(rv[1]), `${s.name}: Electric: 1500 W→A 120 = 12.5 A (${rv})`);
      await taps(page, 'ac 20 q:load80');
      check(await page.textContent('.ro-main') === '16', `${s.name}: Electric: 80% load on a 20 A breaker = 16 A`);
      await taps(page, 'flip ac 13 q:brk125 flip');
      check(/next standard breaker: 20 A/.test(await page.textContent('.ro-msg')), `${s.name}: Electric: flipped, Min brkr for 13 A continuous says a 20 A breaker`);
      await page.click('.qtab[data-group="fuel"]');
      await taps(page, 'ac 2 . 5 q:mix50'); rv = await ro();
      check(rv[0] === '6.4' && /fl oz oil/.test(rv[1]), `${s.name}: Fuel/HVAC: 2.5 gal at 50:1 = 6.4 fl oz oil (${rv})`);
      await page.click('.qtab[data-group="water"]');
      await taps(page, 'ac 10 q:off45'); rv = await ro();
      check(rv[0] === '14.1421' && /14-1\/8"/.test(rv[1]), `${s.name}: Water: a 10" offset at 45° travels 14-1/8" (${rv})`);
      await page.screenshot({ path: path.join(OUT, `app-${s.name}-calc.png`) });
      await page.click('.qkeys [data-key="t:tank-volume"]');
      await page.waitForSelector('.result .big');
      check(await page.textContent('.cv-head h2') === 'Tank & pool gallons' && await page.textContent('.result .big') === '470 gal', `${s.name}: Water: Tank/pool › opens Tank & pool gallons (4' round, 5' deep = 470 gal)`);
      await page.evaluate(() => { location.hash = '#/calc'; }); await page.waitForSelector('.qtab');
      check(await page.getAttribute('.qtab[aria-selected="true"]', 'data-group') === 'water', `${s.name}: Calc reopens on the tab he used last`);
      await page.click('.qtab[data-group="shop"]');

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
      await page.waitForSelector('.qtab');
      g = await onScreen(page, 'main');
      check(g.n === 28 && g.off === 0 && g.minH >= 44, `${name}: Calc shows its 8 maintenance keys and 20-key pad, every one on screen (${JSON.stringify(g)})`);
      const tabsOk = await page.evaluate(() => [...document.querySelectorAll('.qtab')].every((t) => { const r = t.getBoundingClientRect(); return r.bottom <= innerHeight && r.right <= innerWidth && r.height >= 32; }));
      check(tabsOk, `${name}: the four tabs on screen and fingertip-tall`);
      for (const [grp, seq, want] of [['shop', 'ac 72 q:f-to-c', '22.2222'], ['elec', 'ac 4800 q:w-to-a240', '20'], ['fuel', 'ac 36000 q:btu-to-ton', '3'], ['water', 'ac 50 q:psi-to-head', '115.5']]) {
        await page.click(`.qtab[data-group="${grp}"]`);
        await taps(page, seq);
        check(await page.textContent('.ro-main') === want, `${name}: ${grp}: ${seq.slice(3)} → ${want}`);
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
