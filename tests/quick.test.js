// The Calc pad's quick keys (his ask, 2026-11-05: "replace those with different tools that I would specifically
// make use of as my job as a maintenance technician"). Each key's examples were worked by hand before the code ran.
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('./load');

test('every quick key is registered once, with a label, a name and worked examples', () => {
  const ids = new Set();
  for (const q of R.QUICK) {
    assert.ok(!ids.has(q.id), 'twice: ' + q.id); ids.add(q.id);
    assert.ok(q.key && q.key.length <= 8, q.id + ': a key label short enough to fit a key');
    assert.ok(q.examples.length > 0, q.id + ' has no example');
  }
});

for (const q of R.QUICK) {
  test(`quick key ${q.key}: worked examples`, () => {
    for (const ex of q.examples) {
      if (ex.error) { assert.throws(() => R.applyQuick(q.id, ex.x), (e) => e instanceof R.InputError && ex.error.test(e.message), `${q.id}(${ex.x})`); continue; }
      const r = R.applyQuick(q.id, ex.x);
      assert.equal(R.fmtCalc(Number(r.v.toPrecision(ex.sig || 6))), ex.v, `${q.id}(${ex.x})`);
      if (ex.note) assert.match(r.note, ex.note, `${q.id}(${ex.x}) note`);
    }
  });

  test(`quick key ${q.key}: bad numbers get plain words, never NaN`, () => {
    for (const x of [NaN, Infinity, -Infinity, 1e308, -1e308, 1e306, 3e305, 1e300, 1e20, 1e-308, -5, 0, undefined, '12']) {
      try {
        const r = R.applyQuick(q.id, x);
        assert.ok(Number.isFinite(r.v), `${q.id}(${x}) gave ${r.v}`);
        assert.ok(!/NaN|Infinity|undefined/.test(r.line + r.note), `${q.id}(${x}): ${r.line} ${r.note}`);
        assert.ok(!/\de[+−-]?\d/.test(r.note), `${q.id}(${x}): a hint in e-notation: ${r.note}`);
      } catch (e) {
        assert.ok(e instanceof R.InputError, `${q.id}(${x}) crashed: ${e && e.message}`);
        assert.ok(e.message.length < 160 && !/undefined|NaN|\[object/.test(e.message), `${q.id}(${x}): ${e.message}`);
      }
    }
  });
}

test('his four tabs (Shop, Electric, Fuel/HVAC, Water): 8 keys each, one ⇄, every key real and used once', () => {
  assert.deepEqual(R.QGROUPS.map((g) => g.name), ['Shop', 'Electric', 'Fuel/HVAC', 'Water']);
  const used = [];
  for (const g of R.QGROUPS) {
    assert.equal(g.slots.length, 8, g.id);
    assert.equal(g.slots.filter((s) => s === 'flip').length, 1, g.id + ' has one ⇄');
    for (const s of g.slots) {
      if (s === 'flip') continue;
      if (typeof s === 'string' && s.startsWith('t:')) {
        assert.ok(R.getCalc(s.slice(2)), g.id + ': no calculator ' + s);
        assert.ok(R.QTOOL[s.slice(2)], g.id + ': no key label for ' + s);
        continue;
      }
      for (const id of [].concat(s)) { assert.ok(R.getQuick(id), g.id + ': no quick key ' + id); used.push(id); }
    }
  }
  assert.equal(new Set(used).size, used.length, 'a key is in two places');
  assert.deepEqual(R.QUICK.map((q) => q.id).filter((id) => !used.includes(id)), [], 'every quick key sits on a tab');
});

test('the keys he picked from the card are all there', () => {
  // Shop: "°F↔°C, inches↔mm, gallons↔liters, psi↔bar, lb↔kg, feet↔meters, decimal inch → nearest 1/16""
  // Electric: "Watts → amps at 120 V and 240 V, 80% breaker load, Ohm's law, voltage drop"
  // Fuel/HVAC: "2-stroke oil for 50:1, 40:1, 32:1 mix, propane gallons↔lb, BTU↔tons"
  // Water: "Pipe offset at 45° and 22½°, tank and pool gallons, fill time from GPM"
  for (const id of ['f-to-c', 'c-to-f', 'in-to-mm', 'mm-to-in', 'gal-to-l', 'l-to-gal', 'psi-to-bar', 'bar-to-psi', 'lb-to-kg', 'kg-to-lb', 'ft-to-m', 'm-to-ft', 'to-16th',
    'w-to-a120', 'w-to-a240', 'load80', 'mix50', 'mix40', 'mix32', 'lp-gal-to-lb', 'lp-lb-to-gal', 'btu-to-ton', 'ton-to-btu', 'off45', 'off22']) assert.ok(R.getQuick(id), id);
  for (const id of ['ohms-law', 'voltage-drop', 'tank-volume', 'fill-time']) assert.ok(R.getCalc(id), id);
});

test('a quick key writes its tape line as "from → to"', () => {
  if (!R.QUICK.length) return;
  const q = R.QUICK[0];
  const ok = q.examples.find((e) => !e.error);
  const r = R.applyQuick(q.id, ok.x);
  assert.match(r.line, / → /);
});

test('an unknown key and a malformed key are refused', () => {
  assert.throws(() => R.applyQuick('no-such-key', 5), /isn’t known/);
  assert.throws(() => R.quickKey({ id: 'Bad Id' }), /id/);
  assert.throws(() => R.quickKey({ id: 'q-test-1', key: 'x', name: 'X', run() { return 1; }, examples: [] }), /worked example/);
  assert.throws(() => R.quickKey({ id: 'q-test-2', key: 'x', name: 'X', examples: [{}] }), /run\(\)/);
});

test('every flip goes back where it started, even at the limits (the independent check’s vacuum find)', () => {
  for (const g of R.QGROUPS) for (const s of g.slots) {
    if (!Array.isArray(s)) continue;
    const fwd = R.getQuick(s[0]);
    for (const x of [fwd.min != null ? fwd.min : 0, 1, 72, 1234.5].filter((n) => n >= (fwd.min != null ? fwd.min : -Infinity))) {
      const there = R.applyQuick(s[0], x).v;
      const back = R.applyQuick(s[1], there).v;
      assert.ok(Math.abs(back - x) <= 1e-9 * Math.max(1, Math.abs(x)), `${s[0]} → ${s[1]} at ${x}: ${back}`);
    }
  }
  assert.equal(R.applyQuick('psi-to-bar', R.applyQuick('bar-to-psi', -1.01325).v).shown, '−1.01325');
});

test('the rules a number rests on are on screen (2.31 ft per psi, 4.24 lb a gallon, heaters and lights)', () => {
  assert.match(R.applyQuick('psi-to-head', 50).note, /2\.31 ft per psi/);
  assert.match(R.applyQuick('head-to-psi', 100).note, /2\.31 ft per psi/);
  assert.match(R.applyQuick('lp-lb-to-gal', 20).note, /4\.24 lb a gallon/);
  for (const id of ['w-to-a120', 'a-to-w120', 'w-to-a240', 'a-to-w240']) assert.match(R.applyQuick(id, 1000).note, /heaters and lights/);
});

test('a conversion shows 6 significant digits; its full value stays for more math', () => {
  const r = R.applyQuick('f-to-c', 72);
  assert.equal(r.shown, '22.2222');
  assert.equal(r.line, '72 °F → 22.2222 °C');
  assert.ok(Math.abs(r.v - 200 / 9) < 1e-12);
});
