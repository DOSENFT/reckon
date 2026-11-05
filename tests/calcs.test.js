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
    const junk = ['', 'abc', '-5', '1/0', '9'.repeat(30), '<script>alert(1)</script>', '  ', '—'];
    for (const inp of c.inputs) {
      for (const j of junk) {
        const r = R.runCalc(c, { [inp.id]: j });
        if (r.ok) {
          for (const o of r.out) assert.ok(!/NaN|Infinity|undefined/.test(o.value), `${c.id}.${inp.id}="${j}" gave ${o.value}`);
        } else {
          for (const e of r.errors) assert.ok(typeof e.msg === 'string' && e.msg.length > 3 && !/undefined|NaN|\[object/.test(e.msg), `${c.id}.${inp.id}: ${e.msg}`);
        }
      }
    }
  });
}

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
