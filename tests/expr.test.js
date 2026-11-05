// The Calc face's math reader. Answers worked by hand; typed text must never run as code.
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('./load');
const ev = (s, o) => R.evalExpr(s, o);
const near = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} is not ${b}`);

test('order of operations and brackets', () => {
  assert.equal(ev('2 + 3 * 4'), 14);
  assert.equal(ev('(2 + 3) * 4'), 20);
  assert.equal(ev('2^3^2'), 512);              // powers stack right to left
  assert.equal(ev('-2^2'), -4);
  assert.equal(ev('10 / 4'), 2.5);
  assert.equal(ev('7 − 10'), -3);
  assert.equal(ev('6 ÷ 3 × 2'), 4);
});

test('implied multiplication: 2π, 3(4), 2sin(30)', () => {
  near(ev('2π'), 2 * Math.PI);
  assert.equal(ev('3(4)'), 12);
  assert.equal(ev('(1+1)(2+2)'), 8);
  near(ev('2sin(30)', { deg: true }), 1);
});

test('percent like a phone calculator: 50 + 10% = 55, 200 × 15% = 30', () => {
  assert.equal(ev('50 + 10%'), 55);
  assert.equal(ev('200 - 25%'), 150);
  assert.equal(ev('200 * 15%'), 30);
  assert.equal(ev('7%'), 0.07);
});

test('functions in degrees and radians', () => {
  near(ev('sin(30)', { deg: true }), 0.5);
  near(ev('cos(60)', { deg: true }), 0.5);
  near(ev('tan(45)', { deg: true }), 1);
  near(ev('asin(1)', { deg: true }), 90);
  near(ev('sin(π/2)'), 1);
  assert.equal(ev('sin(180)', { deg: true }), 0);    // exactly 0, not 1.2e-16
  assert.equal(ev('√16'), 4);
  assert.equal(ev('√(9+16)'), 5);
  assert.equal(ev('cbrt(27)'), 3);
  near(ev('ln(e)'), 1);
  assert.equal(ev('log(1000)'), 3);
  assert.equal(ev('5!'), 120);
  assert.equal(ev('3²'), 9);
  assert.equal(ev('abs(-4)'), 4);
});

test('Ans uses the last answer', () => {
  assert.equal(ev('ans * 2', { ans: 21 }), 42);
  assert.throws(() => ev('ans + 1'), /no earlier answer/);
});

test('mistakes get plain words, never a wrong number', () => {
  const bad = [
    ['', /Nothing to work out/], ['1/0', /divide by zero/], ['(1+2', /never closed/], ['1+2)', /no opening/],
    ['sqrt(-4)', /negative/], ['ln(0)', /above 0/], ['asin(2)', /−1 to 1/], ['2.5!', /whole numbers/],
    ['171!', /too big/], ['10^400', /too big/], ['foo(2)', /don’t know "foo"/], ['2 $ 3', /can’t read "\$"/],
    ['3 +', /ends too soon/], ['(-8)^(1/3)', /fractional power/], ['tan(90)', /undefined/],
  ];
  for (const [s, msg] of bad) {
    assert.throws(() => ev(s, { deg: true }), (e) => e instanceof R.InputError && msg.test(e.message), `"${s}"`);
  }
});

test('typed text is never run as code', () => {
  globalThis.__pwned = false;
  for (const s of ['alert(1)', 'constructor', '__proto__', 'this', 'globalThis.__pwned=true', '1;process.exit()', 'Function("x")()']) {
    assert.throws(() => ev(s), R.InputError, s);
  }
  assert.equal(globalThis.__pwned, false);
});

test('auto-close lets the live preview show an answer while a bracket is open', () => {
  assert.equal(ev('2*(3+4', { autoClose: true }), 14);
  assert.equal(ev('√(16', { autoClose: true }), 4);
});

test('answers read cleanly', () => {
  assert.equal(R.fmtCalc(0.1 + 0.2), '0.3');
  assert.equal(R.fmtCalc(1 / 3), '0.3333333333');
  assert.equal(R.fmtCalc(1234567.5), '1,234,567.5');
  assert.equal(R.fmtCalc(2e20), '2e20');
  assert.equal(R.fmtCalc(-0.5), '−0.5');
});
