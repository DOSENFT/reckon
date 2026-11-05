// Lengths: what a person types on site, read right; inches written back as feet-inch-fractions.
// Every expected value here was worked out by hand.
const test = require('node:test');
const assert = require('node:assert/strict');
const R = require('./load');

const near = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} is not ${b}`);

test('reads feet-inch-fractions the ways people write them', () => {
  near(R.parseLength(`5' 7-3/8"`), 67.375);
  near(R.parseLength(`5'7-3/8"`), 67.375);
  near(R.parseLength(`5' 7 3/8"`), 67.375);
  near(R.parseLength(`5'-7-3/8"`), 67.375);
  near(R.parseLength('5ft 7 3/8in'), 67.375);
  near(R.parseLength('5 feet 7 inches'), 67);
  near(R.parseLength(`5'7"`), 67);
  near(R.parseLength(`5' 7`), 67);
  near(R.parseLength(`5′ 7″`), 67);          // proper prime marks
  near(R.parseLength(`5’ 7”`), 67);          // a phone's curly quotes
  near(R.parseLength(`5.5'`), 66);
  near(R.parseLength(`1/2'`), 6);
  near(R.parseLength(`7 1/2 ft`), 90);
  near(R.parseLength(`3/8"`), 0.375);
  near(R.parseLength(`67.375"`), 67.375);
  near(R.parseLength(`-2'`), -24);
});

test('a bare number takes the field\'s own unit', () => {
  near(R.parseLength('12', 'ft'), 144);
  near(R.parseLength('12 3/4', 'ft'), 153);
  near(R.parseLength('67.375'), 67.375);
  near(R.parseLength('3/8'), 0.375);
  near(R.parseLength('73/8'), 9.125);                  // 73 over 8, not 7-3/8
});

test('metric and yards', () => {
  near(R.parseLength('2.5m'), 2.5 / 0.0254);
  near(R.parseLength('30 cm'), 30 / 2.54);
  near(R.parseLength('450mm'), 450 / 25.4);
  near(R.parseLength('3 yd'), 108);
  near(R.parseLength('1 meter'), 39.37007874);
});

test('bad lengths get plain-words errors, never a wrong number', () => {
  const bad = ['', '   ', 'abc', '5 fathoms', `3/0"`, `5' x"`, 'ft', '1e999', `7.5 3/8"`, '-'];
  for (const b of bad) {
    assert.throws(() => R.parseLength(b), R.InputError, `"${b}" should be refused`);
  }
  assert.throws(() => R.parseLength('3/0'), /0 on the bottom/);
  assert.throws(() => R.parseLength(''), /empty/);
  assert.throws(() => R.parseLength('99999999999'), /too big/);
});

test('writes inches as feet-inch-fractions, reduced and rounded to the nearest 1/16', () => {
  assert.equal(R.formatFtIn(67.375), `5' 7-3/8"`);
  assert.equal(R.formatFtIn(101), `8' 5"`);
  assert.equal(R.formatFtIn(12), `1' 0"`);
  assert.equal(R.formatFtIn(7), `7"`);
  assert.equal(R.formatFtIn(0.375), `3/8"`);
  assert.equal(R.formatFtIn(0.5), `1/2"`);
  assert.equal(R.formatFtIn(0), `0"`);
  assert.equal(R.formatFtIn(-24), `−2' 0"`);
  assert.equal(R.formatFtIn(11.99), `1' 0"`);          // rounds up into the next foot
  assert.equal(R.formatFtIn(160.99689), `13' 5"`);     // the diagonal of 6' by 12'
  assert.equal(R.formatFtIn(67.375, 16, { inchOnly: true }), `67-3/8"`);
});

test('rounding follows the chosen resolution', () => {
  assert.equal(R.formatFtIn(7.1875, 16), `7-3/16"`);
  assert.equal(R.formatFtIn(7.1875, 8), `7-1/4"`);      // 57.5 eighths rounds up
  assert.equal(R.formatFtIn(7.1875, 32), `7-3/16"`);
  assert.equal(R.formatFtIn(1 / 32, 16), `1/16"`);
  assert.equal(R.formatFtIn(1 / 64, 64), `1/64"`);
  assert.equal(R.isExact(67.375, 16), true);
  assert.equal(R.isExact(160.99689, 16), false);
});

test('number reader: money, commas, fractions, limits', () => {
  assert.equal(R.parseNum('1,234.5'), 1234.5);
  assert.equal(R.parseNum('$1,234'), 1234);
  assert.equal(R.parseNum('12%'), 12);
  assert.equal(R.parseNum('3/4'), 0.75);
  assert.equal(R.parseNum('1 1/2'), 1.5);
  assert.equal(R.parseNum('1-1/2'), 1.5);
  assert.equal(R.parseNum('-2', { allowNegative: true }), -2);
  assert.equal(R.parseNum('−2', { allowNegative: true }), -2);
  assert.throws(() => R.parseNum('-2', { label: 'Price' }), /Price can't be negative/);
  assert.throws(() => R.parseNum('', { label: 'Price' }), /Price is empty/);
  assert.throws(() => R.parseNum('12abc'), /isn't a number/);
  assert.throws(() => R.parseNum('1,23'), /isn't a number/);
  assert.throws(() => R.parseNum('2.5', { integer: true, label: 'Count' }), /whole number/);
  assert.throws(() => R.parseNum('5', { max: 4 }), /4 or less/);
  assert.throws(() => R.parseNum('0', { allowZero: false, label: 'Rate' }), /more than 0/);
  assert.throws(() => R.parseNum('1/0'), /0 on the bottom/);
});

test('number and money formatting', () => {
  assert.equal(R.fmt(1234.56789), '1,234.5679');
  assert.equal(R.fmt(2.5000), '2.5');
  assert.equal(R.fmt(-0.00001, 2), '0');
  assert.equal(R.fmt(-3), '−3');
  assert.equal(R.money(1234.5), '$1,234.50');
  assert.equal(R.money(-5), '−$5.00');
  assert.equal(R.fmt(NaN), '—');
});
