// The job-site keypad, tap by tap. Expected answers worked out by hand.
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('./load');

/** Tap a sequence like "5 ft 7 in 3 frac 8 add ..." (digits may be grouped: "12" is 1 then 2). */
function tap(kp, seq) {
  for (const k of seq.split(/\s+/).filter(Boolean)) {
    if (/^[0-9.]+$/.test(k)) { for (const ch of k) kp.press(ch); }
    else kp.press(k);
  }
  return kp.view();
}
const pad = () => new R.Keypad();

test("5' 7-3/8\" + 2' 9-5/8\" = 8' 5\" (the brief's first check)", () => {
  const v = tap(pad(), '5 ft 7 in 3 frac 8 add 2 ft 9 in 5 frac 8 eq');
  assert.equal(v.main, `8' 5"`);
  assert.equal(v.kind, 'length');
  assert.equal(v.rounded, false);
  assert.equal(v.tape.at(-1).text, `5' 7-3/8" + 2' 9-5/8"`);
});

test('the readout shows the length as it is typed', () => {
  const kp = pad();
  assert.equal(tap(kp, '5').main, '5');
  assert.equal(tap(kp, 'ft').main, `5'`);
  assert.equal(tap(kp, '7').main, `5' 7"`);
  assert.equal(tap(kp, 'in').main, `5' 7"`);
  assert.equal(tap(kp, '3').main, `5' 7-3/▯"`);
  assert.equal(tap(kp, 'frac').main, `5' 7-3/▯"`);
  assert.equal(tap(kp, '8').main, `5' 7-3/8"`);
  assert.equal(tap(kp, 'back').main, `5' 7-3/▯"`);
});

test('feet then a bare number means inches: 5 Feet 7 = 5\' 7"', () => {
  assert.equal(tap(pad(), '5 ft 7 add 1 in eq').main, `5' 8"`);
});

test('a fraction with no unit is a number; Inch after it makes it a length', () => {
  assert.equal(tap(pad(), '3 frac 8 eq').main, '0.375');
  assert.equal(tap(pad(), '3 frac 8 in eq').main, `3/8"`);
});

test('length × length is an area, × a third length is a volume', () => {
  let v = tap(pad(), '12 ft mul 10 ft eq');
  assert.equal(v.main, '120 sq ft');
  assert.equal(v.kind, 'area');
  assert.ok(v.views.some(([k, t]) => k === 'sq yd' && t === '13.3333 sq yd'));
  v = tap(pad(), '12 ft mul 10 ft mul 4 in eq');
  assert.equal(v.main, '40 cu ft');
  assert.equal(v.kind, 'volume');
  assert.ok(v.views.some(([k, t]) => k === 'cu yd' && t === '1.4815 cu yd'));
});

test('dividing: a length by a number, a length by a length', () => {
  assert.equal(tap(pad(), '10 ft div 4 eq').main, `2' 6"`);
  assert.equal(tap(pad(), '10 ft div 2 ft 6 in eq').main, '4');
  assert.equal(tap(pad(), '120 ft mul 1 ft div 10 ft eq').main, `12' 0"`);   // an area ÷ a length is a length
});

test('mixing kinds is refused in plain words, never a wrong answer', () => {
  let kp = pad(); let v = tap(kp, '5 add 2 ft eq');
  assert.match(v.msg, /5 has no unit/); assert.equal(v.err, true);
  kp = pad(); v = tap(kp, '2 ft mul 2 ft add 3 ft eq');
  assert.match(v.msg, /Can't add a length to an area/);
  kp = pad(); v = tap(kp, '5 div 0 eq');
  assert.match(v.msg, /divide by zero/);
  kp = pad(); v = tap(kp, '2 div 3 ft eq');
  assert.match(v.msg, /Can't divide a number by a length/);
  kp = pad(); v = tap(kp, '2 ft mul 2 ft mul 2 ft mul 2 ft eq');
  assert.match(v.msg, /past a volume/);
});

test('keys pressed in the wrong order get a hint, not a crash', () => {
  const kp = pad();
  assert.equal(kp.press('ft'), false); assert.match(kp.msg, /number first/);
  tap(kp, '5 ft');
  assert.equal(kp.press('ft'), false); assert.match(kp.msg, /already in/);
  tap(kp, '7 in');
  assert.equal(kp.press('.'), false); assert.match(kp.msg, /fraction like 3 \/ 8/);
  tap(kp, '3 frac');
  assert.equal(kp.press('frac'), false);
  assert.equal(kp.press('eq'), false); assert.match(kp.msg, /bottom number/);
  tap(kp, '0');
  assert.equal(kp.press('eq'), false); assert.match(kp.msg, /0 on the bottom/);
  assert.equal(kp.press('bogus'), false); assert.match(kp.msg, /Unknown key/);
});

test('percent works like a tape calculator', () => {
  assert.equal(tap(pad(), '100 add 10 pct').main, '110');
  assert.equal(tap(pad(), '200 sub 15 pct').main, '170');
  assert.equal(tap(pad(), '50 mul 10 pct').main, '5');
  assert.equal(tap(pad(), '20 ft add 10 pct').main, `22' 0"`);     // 10% extra for waste
  assert.equal(tap(pad(), '7 pct').main, '0.07');
});

test('square and square root carry the kind: side² is an area, √area is its side', () => {
  assert.equal(tap(pad(), '3 ft sq').main, '9 sq ft');
  assert.equal(tap(pad(), '12 ft mul 12 ft eq sqrt').main, `12' 0"`);
  const kp = pad(); tap(kp, '3 ft sqrt'); assert.match(kp.msg, /Square root works on an area/);
});

test('results chain: an operation right after = keeps going from the answer', () => {
  assert.equal(tap(pad(), '5 ft add 1 ft eq add 6 in eq').main, `6' 6"`);
  assert.equal(tap(pad(), '5 ft add 1 ft eq 3 ft eq').main, `3' 0"`);       // typing starts fresh
});

test('memory adds up lengths and refuses to mix kinds', () => {
  const kp = pad();
  tap(kp, '5 ft mplus 3 ft mplus ac mr');
  assert.equal(kp.view().main, `8' 0"`);
  assert.equal(kp.view().mem, `8' 0"`);
  tap(kp, '2 ft mul 2 ft eq mplus');
  assert.match(kp.msg, /Tap MC/);
  tap(kp, 'mc'); assert.equal(kp.view().mem, null);
});

test('Rise, Run, Diag: store two, work out the rest', () => {
  const kp = pad();
  tap(kp, '6 ft rise 12 ft run');
  let v = tap(kp, 'diag');
  assert.equal(v.main, `13' 5"`);                 // √(6² + 12²) = 13.416 ft = 160.997"
  assert.equal(v.rounded, true);
  v = tap(kp, 'pitch');
  assert.equal(v.main, '6/12');
  assert.match(v.msg, /26\.57°/);
  assert.match(v.msg, /50% grade/);
});

test('Pitch and one length give the triangle', () => {
  let kp = pad();
  tap(kp, '6 pitch 12 ft run');
  assert.equal(tap(kp, 'rise').main, `6' 0"`);
  kp = pad();
  tap(kp, '3 ft rise 5 ft diag');
  assert.equal(tap(kp, 'run').main, `4' 0"`);     // the 3-4-5 triangle
  kp = pad();
  tap(kp, '9 pitch 4 ft rise');
  assert.equal(tap(kp, 'run').main, `5' 4"`);     // 48 × 12/9 = 64"
});

test('the triangle refuses impossible or missing sides', () => {
  let kp = pad();
  tap(kp, '6 ft rise diag');
  assert.match(kp.msg, /Store two of Rise, Run, Diag or Pitch/);
  kp = pad();
  tap(kp, '6 ft rise 5 ft diag run');
  assert.match(kp.msg, /Diag must be longer than Rise/);
  kp = pad();
  tap(kp, '6 rise');
  assert.match(kp.msg, /Rise is a length/);
});

test('AC clears the sum first, then the stored triangle on a second tap', () => {
  const kp = pad();
  tap(kp, '6 ft rise 12 ft run 5 add');
  tap(kp, 'ac');
  assert.equal(kp.view().main, '0');
  assert.ok(kp.view().tri.rise);
  tap(kp, 'ac');
  assert.equal(kp.view().tri.rise, null);
  assert.match(kp.msg, /Cleared Rise/);
});

test('the rounding setting changes how answers read', () => {
  const kp = pad();
  tap(kp, '7 in 3 frac 16 eq');
  assert.equal(kp.view().main, `7-3/16"`);
  kp.setDen(8);
  assert.equal(kp.view().main, `7-1/4"`);
  assert.equal(kp.view().rounded, true);
  assert.throws(() => kp.setDen(10), /1\/2, 1\/4/);
});

test('a lone point is refused, not read as NaN (found by the random taps below)', () => {
  const kp = pad();
  tap(kp, '6 ft . run');
  assert.match(kp.msg, /number after the point/);
  assert.equal(tap(pad(), '3 frac 00 eq').msg, "A fraction can't have 0 on the bottom.");
  assert.match(tap(pad(), '999999999 ft mul 999999999 ft mul 999999999 ft eq').msg, /too big/);
});

test('hundreds of random taps never throw, never show NaN', () => {
  const keys = '0 1 2 3 4 5 6 7 8 9 . ft in frac back ac add sub mul div eq pct sq sqrt mplus mminus mr mc rise run diag pitch'.split(' ');
  let seed = 42;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const kp = pad();
  for (let i = 0; i < 5000; i++) {
    kp.press(keys[Math.floor(rnd() * keys.length)]);
    const v = kp.view();
    assert.ok(!/NaN|undefined|Infinity/.test(v.main + v.msg + v.line), `tap ${i}: ${v.main} | ${v.msg}`);
  }
});
