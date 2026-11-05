// Draw icons/icon.svg into the PNG sizes phones want (192, 512, and a maskable 512 with room around it).
//   node tools/icons.js
const path = require('path');
const fs = require('fs');
const pw = require(process.env.HELM_PLAYWRIGHT || path.join(process.env.USERPROFILE || '', 'Documents', 'Command', 'brain', 'graph', 'node_modules', 'playwright-core'));
const dir = path.join(__dirname, '..', 'icons');
const svg = fs.readFileSync(path.join(dir, 'icon.svg'), 'utf8');

(async () => {
  const browser = await pw.chromium.launch({ channel: 'msedge', headless: true });
  try {
    for (const [name, size, pad] of [['icon-192.png', 192, 0], ['icon-512.png', 512, 0], ['icon-maskable-512.png', 512, 0.1]]) {
      const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
      const inner = Math.round(size * (1 - 2 * pad));
      await page.setContent(`<html><body style="margin:0;background:#1b1e22;display:grid;place-items:center;height:${size}px">
        <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div></body></html>`);
      await page.screenshot({ path: path.join(dir, name), omitBackground: false });
      await page.close();
      console.log('wrote', name);
    }
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
