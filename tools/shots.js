// Photograph Reckon in a real browser (Edge) at phone and PC size, tap through it, and check
// what a person would hit: keys on screen, nothing wider than the screen, fingertip-sized
// buttons, zero page errors.
//   node tools/shots.js <base url or folder> <shots folder> [page ...]
// Pages default to the three look previews. Prints one PASS/FAIL line per check.
const path = require('path');
const fs = require('fs');
const pw = require(process.env.HELM_PLAYWRIGHT || path.join(process.env.USERPROFILE || '', 'Documents', 'Command', 'brain', 'graph', 'node_modules', 'playwright-core'));

const base = process.argv[2] || 'http://127.0.0.1:8790/preview/';
const out = path.resolve(process.argv[3] || path.join(__dirname, '..', 'shots'));
const pages = process.argv.slice(4).length ? process.argv.slice(4) : ['reckon-look-a.html', 'reckon-look-b.html', 'reckon-look-c.html'];
fs.mkdirSync(out, { recursive: true });

const SIZES = [
  { name: 'phone', viewport: { width: 412, height: 915 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
  { name: 'pc', viewport: { width: 1600, height: 1000 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1 },
];
let fails = 0;
const check = (ok, what) => { console.log((ok ? 'PASS ' : 'FAIL ') + what); if (!ok) fails++; };
const url = (p) => (/^https?:/.test(base) ? base.replace(/\/?$/, '/') + p : 'file:///' + path.resolve(base, p).replace(/\\/g, '/'));

async function taps(page, seq) {
  for (const k of seq.split(' ')) {
    if (/^[0-9]+$/.test(k)) { for (const ch of k) await page.click(`.keys [data-key="${ch}"]`); }
    else await page.click(`.keys [data-key="${k}"]`);
  }
}

(async () => {
  const browser = await pw.chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const p of pages) {
      const tag = p.replace(/\.html$/, '');
      for (const s of SIZES) {
        const ctx = await browser.newContext({ viewport: s.viewport, isMobile: s.isMobile, hasTouch: s.hasTouch, deviceScaleFactor: s.deviceScaleFactor });
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(e.message));
        page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
        await page.goto(url(p) + '#/job', { waitUntil: 'load' });
        await page.evaluate(() => localStorage.clear());
        await page.reload({ waitUntil: 'load' });
        await page.waitForSelector('.keys .k');
        await taps(page, '5 ft 7 in 3 frac 8 add 2 ft 9 in 5 frac 8 eq');
        const main = await page.textContent('.ro-main');
        check(main === `8' 5"`, `${tag} ${s.name}: 5' 7-3/8" + 2' 9-5/8" reads ${main}`);
        const geo = await page.evaluate(() => {
          const keys = [...document.querySelectorAll('.keys .k')].map((k) => k.getBoundingClientRect());
          const tools = document.querySelector('.tools').getBoundingClientRect();
          const small = [...document.querySelectorAll('button')].filter((b) => b.offsetParent && (b.getBoundingClientRect().height < 32 || b.getBoundingClientRect().width < 32)).map((b) => b.textContent.trim() || b.getAttribute('aria-label'));
          return { lastKey: Math.max(...keys.map((r) => r.bottom)), minKeyH: Math.min(...keys.map((r) => r.height)), minKeyW: Math.min(...keys.map((r) => r.width)), toolsBottom: tools.bottom, vh: innerHeight, wide: document.documentElement.scrollWidth > innerWidth + 1, small };
        });
        check(geo.lastKey <= geo.vh && geo.toolsBottom <= geo.vh, `${tag} ${s.name}: every key and the tools row on screen without scrolling (bottom ${Math.round(geo.toolsBottom)} of ${geo.vh})`);
        check(geo.minKeyH >= 44 && geo.minKeyW >= 44, `${tag} ${s.name}: keys fingertip-sized (smallest ${Math.round(geo.minKeyW)}x${Math.round(geo.minKeyH)} px)`);
        check(!geo.wide, `${tag} ${s.name}: nothing wider than the screen`);
        check(geo.small.length === 0, `${tag} ${s.name}: no button under 32 px ${geo.small.length ? '(' + geo.small.join(', ') + ')' : ''}`);
        await page.screenshot({ path: path.join(out, `${tag}-${s.name}-job.png`) });
        // the triangle keys
        await taps(page, 'ac 6 ft rise 12 ft run diag');
        const diag = await page.textContent('.ro-main');
        check(diag === `13' 5"`, `${tag} ${s.name}: Rise 6', Run 12' gives Diag ${diag}`);
        await page.screenshot({ path: path.join(out, `${tag}-${s.name}-triangle.png`) });
        // a calculator page with the pop-up length keypad
        await page.click('.tools .tool:has-text("Concrete slab")');
        await page.waitForSelector('.result .big');
        const yd = await page.textContent('.result .big');
        check(yd === '3.26 cu yd', `${tag} ${s.name}: concrete example reads ${yd}`);
        await page.screenshot({ path: path.join(out, `${tag}-${s.name}-concrete.png`) });
        await page.click('[data-field="thick"] .len');
        await page.waitForSelector('.sheet .k');
        for (const k of ['6', 'Inch']) await page.click(`.sheet .k[aria-label="${k}"]`);
        await page.screenshot({ path: path.join(out, `${tag}-${s.name}-sheet.png`) });
        await page.click('.sheet .k[aria-label="Done"]');
        const yd6 = await page.textContent('.result .big');
        check(yd6 === '4.89 cu yd', `${tag} ${s.name}: 6" thick slab reads ${yd6}`);
        await page.goto(url(p) + '#/money', { waitUntil: 'load' });
        await page.waitForSelector('.row');
        await page.screenshot({ path: path.join(out, `${tag}-${s.name}-money.png`) });
        check(errors.length === 0, `${tag} ${s.name}: 0 page errors ${errors.length ? JSON.stringify(errors.slice(0, 3)) : ''}`);
        await ctx.close();
      }
    }
  } finally {
    await browser.close();
  }
  console.log(fails ? `${fails} check(s) failed` : 'all checks passed');
  process.exit(fails ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
