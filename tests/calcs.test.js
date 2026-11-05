// Every calculator, checked against its own worked examples (written by hand, before the code ran),
// then hit with bad input in every field: it must answer in plain words or refuse, never show NaN.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const R = require('./load');

test('every calculator is registered once, on a real face, with examples', () => {
  assert.ok(R.CALCS.length > 0);
  const ids = new Set();
  for (const c of R.CALCS) {
    assert.ok(!ids.has(c.id), 'twice: ' + c.id); ids.add(c.id);
    assert.ok(R.FACES.some((f) => f.id === c.face), c.id + ' face');
    assert.ok(c.examples.length > 0, c.id + ' has no example');
  }
});

for (const c of R.CALCS) {
  test(`${c.face} / ${c.name}: worked examples`, () => {
    c.examples.forEach((ex, n) => {
      const r = R.runCalc(c, ex.in);
      if (ex.error) {
        assert.equal(r.ok, false, `${c.id} example ${n + 1} should be refused`);
        assert.ok(r.errors.some((e) => e.field === ex.error), `${c.id} example ${n + 1}: the error should name ${ex.error}, got ${JSON.stringify(r.errors)}`);
        for (const e of r.errors) assert.ok(e.msg && e.msg.length < 200 && !/undefined|NaN/.test(e.msg), 'plain message: ' + e.msg);
        return;
      }
      assert.equal(r.ok, true, `${c.id} example ${n + 1} failed: ${JSON.stringify(r.errors)}`);
      const got = Object.fromEntries(r.out.map((o) => [o.label, o.value]));
      for (const [label, want] of Object.entries(ex.out)) {
        assert.equal(got[label], want, `${c.id} example ${n + 1}: "${label}"`);
      }
    });
  });

  test(`${c.face} / ${c.name}: bad input in every field is refused in plain words`, () => {
    // "—" is what the number formatters show for a result they can't show: it must never reach the screen as an answer.
    const junk = ['', 'abc', '-5', '0', '1/0', '9'.repeat(30), '1e308', '-1e308', '1e-308', '0.00000000000001',
      '1e308 1e308', '<script>alert(1)</script>', '  ', '—'];
    for (const inp of c.inputs) {
      for (const j of junk) {
        const r = R.runCalc(c, { [inp.id]: j });
        if (r.ok) {
          for (const o of r.out) assert.ok(!/—|NaN|Infinity|undefined/.test(o.value), `${c.id}.${inp.id}="${j}" gave ${o.label} = ${o.value}`);
        } else {
          for (const e of r.errors) assert.ok(typeof e.msg === 'string' && e.msg.length > 3 && !/undefined|NaN|\[object/.test(e.msg), `${c.id}.${inp.id}: ${e.msg}`);
        }
      }
    }
  });
}

// The independent check's finds (2026-11-05), each one failing on the code before its fix.
const run = (id, raws) => R.runCalc(R.getCalc(id), raws);
const val = (r, label) => (r.out.find((o) => o.label === label) || {}).value;

test('huge numbers in a list still give the real average and spread, never a blank', () => {
  const s = run('stats', { xs: '1e308 1e308' });
  assert.equal(s.ok, true, JSON.stringify(s.errors));
  assert.equal(val(s, 'Mean (average)'), '1e+308');
  assert.equal(val(s, 'Sum'), 'Too big to show');
  const d = run('std-dev', { xs: '1e160 2e160' });
  assert.equal(d.ok, true, JSON.stringify(d.errors));
  assert.equal(val(d, 'Sample standard deviation'), '7.071068e+159');   // (2e160 − 1e160) / √2
  assert.equal(val(d, 'Sample variance'), 'Too big to show');            // 5e319 is past the largest number a phone holds
  assert.equal(val(run('std-dev', {}), 'Sample standard deviation'), '2.13809');   // ordinary lists unchanged
});

test('a loan at a tiny rate pays like a 0% loan, not a blank', () => {
  const r = run('loan', { amt: '25000', rate: '0.00000000000001', years: '5' });
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(val(r, 'Monthly payment'), '$416.67');                      // 25,000 ÷ 60
  assert.equal(val(run('loan', {}), 'Monthly payment'), '$495.03');       // the published 7% / 5 yr figure is unchanged
});

test('stairs refuse a riser or tread too small to be a step', () => {
  const r = run('stairs', { maxR: '1/64"' });
  assert.equal(r.ok, false);
  assert.equal(r.errors[0].field, 'maxR');
  assert.match(r.errors[0].msg, /at least 4"/);
  assert.equal(run('stairs', { tread: '1/8"' }).errors[0].field, 'tread');
});

test('a time card day with the same in and out time is refused, not counted as 23.5 hours', () => {
  const r = run('time-card', { monIn: '7:00', monOut: '7:00' });
  assert.equal(r.ok, false);
  assert.equal(r.errors[0].field, 'monOut');
  assert.match(r.errors[0].msg, /Monday: in and out are the same time/);
  assert.equal(val(run('time-card', { monIn: '22:00', monOut: '6:00', monBrk: '0' }), 'Monday'), '8:00');   // overnight still works
});

test('a fraction with 0 on the bottom names the box it was typed in', () => {
  const r = run('stairs', { rise: '1/0' });
  assert.equal(r.ok, false);
  assert.match(r.errors[0].msg, /^Total rise: /);
});

test('a link to a name every object has (constructor, toString) finds no calculator', () => {
  for (const id of ['constructor', 'toString', '__proto__', 'hasOwnProperty', '', null, undefined, 42]) assert.equal(R.getCalc(id), null, String(id));
  assert.equal(R.getCalc('rafter').id, 'rafter');
});

test('search finds calculators by name, face and keywords', () => {
  assert.equal(R.searchCalcs('rafter')[0].id, 'rafter');
  assert.equal(R.searchCalcs('stringer')[0].id, 'stairs');
  assert.ok(R.searchCalcs('quikrete').some((c) => c.id === 'concrete-slab'));
  assert.deepEqual(R.searchCalcs(''), []);
  assert.deepEqual(R.searchCalcs('zzzz-nothing'), []);
});

test('a malformed calculator is refused at load, not shipped quietly', () => {
  assert.throws(() => R.calc({ id: 'Bad Id', face: 'job' }), /id/);
  assert.throws(() => R.calc({ id: 'rafter', face: 'job', name: 'x', blurb: 'y', inputs: [], run() {}, examples: [{}] }), /twice/);
  assert.throws(() => R.calc({ id: 'nope-1', face: 'moon', name: 'x', blurb: 'y', inputs: [], run() {}, examples: [{}] }), /unknown face/);
  assert.throws(() => R.calc({ id: 'nope-2', face: 'job', name: 'x', blurb: 'y', inputs: [{ id: 'a', label: 'A', kind: 'weird' }], run() {}, examples: [{}] }), /unknown kind/);
  assert.throws(() => R.calc({ id: 'nope-3', face: 'job', name: 'x', blurb: 'y', inputs: [], run() {}, examples: [] }), /worked example/);
});

test('index.html loads exactly the files the tests load, in the same order', () => {
  const root = path.join(__dirname, '..');
  const files = require(path.join(root, 'files.json'));
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const srcs = [...html.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(srcs, files.engine.concat(files.calcs, files.app));
});
