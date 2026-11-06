/* Reckon: the Math face. Fractions are kept exact (whole-number tops and bottoms), never rounded. */
(function (R) {
  'use strict';
  const SUP = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '-': '⁻' };
  const sup = function (n) { return String(n).split('').map(function (c) { return SUP[c] || c; }).join(''); };
  R.sup = sup;
  const LIST = function (v) { return { id: 'xs', label: 'Numbers', kind: 'list', value: v, help: 'separated by commas or spaces' }; };
  const NUM = function (id, label, value, extra) { return Object.assign({ id: id, label: label, kind: 'number', value: value, negative: true, min: -1e15, max: 1e15 }, extra || {}); };

  R.calc({
    id: 'percentage', face: 'math', name: 'Percentage', blurb: 'X% of Y, what percent X is of Y, and X is Y% of what',
    keywords: ['percent', '%', 'of', 'what percent'],
    inputs: [
      { id: 'mode', label: 'Question', kind: 'choice', value: 'of', options: [['of', 'What is X% of Y?'], ['is', 'X is what percent of Y?'], ['whole', 'X is Y% of what?']] },
      NUM('x', 'X', '15'), NUM('y', 'Y', '80'),
    ],
    run: function (v) {
      if (v.mode === 'of') return [{ label: 'Answer', value: R.fmt(v.x / 100 * v.y, 6), big: true, note: R.fmt(v.x, 6) + '% of ' + R.fmt(v.y, 6) }];
      if (v.mode === 'is') {
        if (v.y === 0) R.fail('Y can’t be zero here.', 'y');
        return [{ label: 'Answer', value: R.fmt(v.x / v.y * 100, 4) + '%', big: true, note: R.fmt(v.x, 6) + ' out of ' + R.fmt(v.y, 6) }];
      }
      if (v.y === 0) R.fail('The percent can’t be zero here.', 'y');
      return [{ label: 'Answer', value: R.fmt(v.x / (v.y / 100), 6), big: true, note: R.fmt(v.x, 6) + ' is ' + R.fmt(v.y, 6) + '% of it' }];
    },
    examples: [
      { in: {}, out: { 'Answer': '12' } },
      { in: { mode: 'is', x: '12', y: '80' }, out: { 'Answer': '15%' } },
      { in: { mode: 'whole', x: '12', y: '15' }, out: { 'Answer': '80' } },
      { in: { mode: 'is', y: '0' }, error: 'y' },
    ],
  });

  R.calc({
    id: 'percent-change', face: 'math', name: 'Percent change', blurb: 'How much something went up or down, in percent',
    keywords: ['increase', 'decrease', 'growth', 'difference', 'change'],
    inputs: [NUM('a', 'Old value', '80'), NUM('b', 'New value', '100')],
    run: function (v) {
      if (v.a === 0) R.fail('The old value can’t be zero (any change from zero is endless).', 'a');
      const p = (v.b - v.a) / Math.abs(v.a) * 100;
      return [
        { label: 'Change', value: (p > 0 ? '+' : '') + R.fmt(p, 2) + '%', big: true, note: p > 0 ? 'An increase' : p < 0 ? 'A decrease' : 'No change' },
        { label: 'Difference', value: (v.b - v.a > 0 ? '+' : '') + R.fmt(v.b - v.a, 6) },
      ];
    },
    examples: [
      { in: {}, out: { 'Change': '+25%', 'Difference': '+20' } },
      { in: { a: '100', b: '80' }, out: { 'Change': '−20%' } },
      { in: { a: '0' }, error: 'a' },
    ],
  });

  // ---- exact fractions ----
  function gcd(a, b) { return R.gcd(a, b) || 1; }
  function frac(n, d) {
    if (d === 0) R.fail('Can’t divide by zero.');
    if (d < 0) { n = -n; d = -d; }
    const g = gcd(n, d);
    n /= g; d /= g;
    if (Math.abs(n) > 9e15 || d > 9e15) R.fail('Those numbers get too big to keep exact.');
    return [n, d];
  }
  /** "3/4", "1 1/2", "-2 3/8", "5", "0.25" → [top, bottom] */
  function readFrac(s, field, label) {
    const t = String(s || '').trim().replace(/[−–]/g, '-').replace(/⁄/g, '/');
    let m, neg = 1, body = t;
    if (body[0] === '-') { neg = -1; body = body.slice(1).trim(); }
    try {
      if ((m = body.match(/^(\d+)(?:\s+|\s*-\s*)(\d+)\s*\/\s*(\d+)$/))) { if (+m[3] === 0) R.fail(''); return frac(neg * (+m[1] * +m[3] + +m[2]), +m[3]); }
      if ((m = body.match(/^(\d+)\s*\/\s*(\d+)$/))) { if (+m[2] === 0) R.fail(''); return frac(neg * +m[1], +m[2]); }
      if ((m = body.match(/^(\d+)(?:\.(\d{1,9}))?$/))) { const dec = m[2] || ''; return frac(neg * Number(m[1] + dec), Math.pow(10, dec.length)); }
    } catch (e) { if (e instanceof R.InputError) R.fail(label + ': a fraction can’t have 0 on the bottom.', field); throw e; }
    R.fail(label + ': type a fraction like 3/4, 1 1/2 or 0.25.', field);
  }
  R.readFrac = readFrac;
  function fracText(f) {
    const n = f[0], d = f[1];
    if (d === 1) return String(n).replace('-', '−');
    const w = Math.trunc(n / d), r = Math.abs(n % d);
    if (!w) return (n < 0 ? '−' : '') + r + '/' + d;
    return (n < 0 ? '−' : '') + Math.abs(w) + ' ' + r + '/' + d;
  }
  R.fracText = fracText;

  R.calc({
    id: 'fractions', face: 'math', name: 'Fractions', blurb: 'Add, subtract, multiply and divide fractions exactly',
    keywords: ['fraction', 'mixed number', 'simplify', 'numerator', 'denominator'],
    inputs: [
      { id: 'a', label: 'First fraction', kind: 'text', value: '3/4', help: 'like 3/4 or 1 1/2' },
      { id: 'op', label: 'Do', kind: 'choice', value: '+', options: [['+', '+ add'], ['-', '− subtract'], ['*', '× multiply'], ['/', '÷ divide']] },
      { id: 'b', label: 'Second fraction', kind: 'text', value: '5/6' },
    ],
    run: function (v) {
      const a = readFrac(v.a, 'a', 'First fraction'), b = readFrac(v.b, 'b', 'Second fraction');
      let r;
      if (v.op === '+') r = frac(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
      else if (v.op === '-') r = frac(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
      else if (v.op === '*') r = frac(a[0] * b[0], a[1] * b[1]);
      else { if (b[0] === 0) R.fail('Can’t divide by zero.', 'b'); r = frac(a[0] * b[1], a[1] * b[0]); }
      return [
        { label: 'Answer', value: fracText(r), big: true },
        { label: 'As one fraction', value: String(r[0]).replace('-', '−') + (r[1] === 1 ? '' : '/' + r[1]) },
        { label: 'Decimal', value: R.fmt(r[0] / r[1], 8) },
      ];
    },
    examples: [
      { in: {}, out: { 'Answer': '1 7/12', 'As one fraction': '19/12', 'Decimal': '1.58333333' } },
      { in: { a: '1 1/2', op: '*', b: '2/3' }, out: { 'Answer': '1' } },
      { in: { a: '1/2', op: '-', b: '3/4' }, out: { 'Answer': '−1/4' } },
      { in: { a: '0.25', op: '/', b: '1/8' }, out: { 'Answer': '2' } },
      { in: { op: '/', b: '0' }, error: 'b' },
      { in: { a: '3/0' }, error: 'a' },
    ],
  });

  R.calc({
    id: 'ratio', face: 'math', name: 'Ratio', blurb: 'Solve A : B = C : ?, and simplify a ratio',
    keywords: ['proportion', 'scale', 'ratio', 'mix ratio'],
    inputs: [NUM('a', 'A', '3'), NUM('b', 'B', '4'), NUM('c', 'C', '9')],
    run: function (v) {
      if (v.a === 0) R.fail('A can’t be zero.', 'a');
      const out = [{ label: 'Missing number (?)', value: R.fmt(v.b * v.c / v.a, 6), big: true, note: R.fmt(v.a, 6) + ' : ' + R.fmt(v.b, 6) + ' = ' + R.fmt(v.c, 6) + ' : ?' }];
      if (Number.isInteger(v.a) && Number.isInteger(v.b) && v.b !== 0) { const g = gcd(v.a, v.b); out.push({ label: 'A : B simplified', value: (v.a / g) + ' : ' + (v.b / g) }); }
      return out;
    },
    examples: [
      { in: {}, out: { 'Missing number (?)': '12', 'A : B simplified': '3 : 4' } },
      { in: { a: '1920', b: '1080', c: '1280' }, out: { 'Missing number (?)': '720', 'A : B simplified': '16 : 9' } },
    ],
  });

  R.calc({
    id: 'stats', face: 'math', name: 'Mean, median, mode', blurb: 'Average, middle, most common and range of a list',
    keywords: ['average', 'mean', 'median', 'mode', 'range', 'statistics', 'sum'],
    inputs: [LIST('3, 7, 7, 2, 9')],
    run: function (v) {
      const xs = v.xs.slice().sort(function (a, b) { return a - b; }), n = xs.length;
      const sum = xs.reduce(function (s, x) { return s + x; }, 0);
      const med = n % 2 ? xs[(n - 1) / 2] : xs[n / 2 - 1] / 2 + xs[n / 2] / 2;   // halves first: no overflow
      const range = xs[n - 1] - xs[0];
      const counts = new Map(); xs.forEach(function (x) { counts.set(x, (counts.get(x) || 0) + 1); });
      const top = Math.max.apply(null, Array.from(counts.values()));
      const modes = top > 1 ? Array.from(counts.keys()).filter(function (k) { return counts.get(k) === top; }) : [];
      // a running average never overflows, even when the sum of huge numbers does
      const mean = Number.isFinite(sum) ? sum / n : xs.reduce(function (m, x, k) { return m + (x - m) / (k + 1); }, 0);
      return [
        { label: 'Mean (average)', value: R.fmt(mean, 6), big: true },
        { label: 'Median', value: R.fmt(med, 6) },
        { label: 'Mode', value: modes.length ? modes.map(function (m) { return R.fmt(m, 6); }).join(', ') : 'None', note: modes.length ? 'appears ' + top + ' times' : 'every value appears once' },
        { label: 'Range', value: Number.isFinite(range) ? R.fmt(range, 6) : 'Too big to show' },
        { label: 'Count', value: n },
        { label: 'Sum', value: Number.isFinite(sum) ? R.fmt(sum, 6) : 'Too big to show', note: Number.isFinite(sum) ? '' : 'over 1.8 × 10³⁰⁸' },
        { label: 'Smallest', value: R.fmt(xs[0], 6) },
        { label: 'Largest', value: R.fmt(xs[n - 1], 6) },
      ];
    },
    examples: [
      { in: {}, out: { 'Mean (average)': '5.6', 'Median': '7', 'Mode': '7', 'Range': '7', 'Count': '5', 'Sum': '28' } },
      { in: { xs: '1 2 3 4' }, out: { 'Median': '2.5', 'Mode': 'None' } },
      { in: { xs: '1, two, 3' }, error: 'xs' },
    ],
  });

  R.calc({
    id: 'std-dev', face: 'math', name: 'Standard deviation', blurb: 'Spread of a list: standard deviation and variance',
    keywords: ['standard deviation', 'variance', 'sigma', 'spread', 'statistics'],
    inputs: [LIST('2, 4, 4, 4, 5, 5, 7, 9')],
    run: function (v) {
      const n = v.xs.length;
      if (n < 2) R.fail('Give at least two numbers.', 'xs');
      // Worked on the numbers divided by the largest one, then scaled back, so squares of huge numbers never overflow.
      const big = v.xs.reduce(function (m, x) { return Math.max(m, Math.abs(x)); }, 0) || 1;
      const ys = v.xs.map(function (x) { return x / big; });
      const my = ys.reduce(function (s, y) { return s + y; }, 0) / n;
      const ssy = ys.reduce(function (s, y) { return s + (y - my) * (y - my); }, 0);
      const mean = my * big;
      const varOut = function (x) { return Number.isFinite(x) ? R.fmt(x, 6) : 'Too big to show'; };
      return [
        { label: 'Sample standard deviation', value: R.fmt(Math.sqrt(ssy / (n - 1)) * big, 6), big: true, note: 'Divides by n − 1: use for a sample' },
        { label: 'Population standard deviation', value: R.fmt(Math.sqrt(ssy / n) * big, 6) },
        { label: 'Mean', value: R.fmt(mean, 6) },
        { label: 'Sample variance', value: varOut(ssy / (n - 1) * big * big) },
        { label: 'Population variance', value: varOut(ssy / n * big * big) },
      ];
    },
    examples: [
      { in: {}, out: { 'Population standard deviation': '2', 'Sample standard deviation': '2.13809', 'Mean': '5' } },
      { in: { xs: '5' }, error: 'xs' },
    ],
  });

  const INTS = function (v) {
    return { id: 'xs', label: 'Whole numbers', kind: 'list', value: v, negative: false, help: 'separated by commas' };
  };
  const wholeList = function (xs) {
    xs.forEach(function (x) { if (!Number.isInteger(x) || x < 1 || x > 1e12) R.fail('Use whole numbers from 1 to 1,000,000,000,000.', 'xs'); });
    if (xs.length < 2) R.fail('Give at least two numbers.', 'xs');
  };
  R.calc({
    id: 'gcf-lcm', face: 'math', name: 'GCF & LCM', blurb: 'Greatest common factor and least common multiple',
    keywords: ['gcd', 'gcf', 'lcm', 'common factor', 'common denominator'],
    inputs: [INTS('12, 18, 30')],
    run: function (v) {
      wholeList(v.xs);
      const g = v.xs.reduce(function (a, b) { return R.gcd(a, b); });
      const l = v.xs.reduce(function (a, b) { const r = a / R.gcd(a, b) * b; if (r > 9e15) R.fail('The LCM is too big to show exactly.', 'xs'); return r; });
      return [{ label: 'GCF', value: R.fmt(g, 0), big: true, note: 'Greatest common factor' }, { label: 'LCM', value: R.fmt(l, 0), note: 'Least common multiple' }];
    },
    examples: [{ in: {}, out: { 'GCF': '6', 'LCM': '180' } }, { in: { xs: '1.5, 3' }, error: 'xs' }],
  });

  R.calc({
    id: 'prime-factors', face: 'math', name: 'Prime factors', blurb: 'Break a whole number into primes; is it prime?',
    keywords: ['prime', 'factorization', 'factors', 'divisors'],
    inputs: [{ id: 'n', label: 'Whole number', kind: 'int', value: '360', min: 2, max: 1e12 }],
    run: function (v) {
      let n = v.n; const f = [];
      for (let p = 2; p * p <= n; p += (p === 2 ? 1 : 2)) { let k = 0; while (n % p === 0) { n /= p; k++; } if (k) f.push([p, k]); }
      if (n > 1) f.push([n, 1]);
      const divisors = f.reduce(function (s, x) { return s * (x[1] + 1); }, 1);
      return [
        { label: 'Prime factors', value: f.map(function (x) { return x[0] + (x[1] > 1 ? sup(x[1]) : ''); }).join(' × '), big: true },
        { label: 'Prime?', value: f.length === 1 && f[0][1] === 1 ? 'Yes' : 'No' },
        { label: 'Number of divisors', value: divisors },
      ];
    },
    examples: [
      { in: {}, out: { 'Prime factors': '2³ × 3² × 5', 'Prime?': 'No', 'Number of divisors': '24' } },
      { in: { n: '97' }, out: { 'Prime?': 'Yes' } },
      { in: { n: '1' }, error: 'n' },
    ],
  });

  R.calc({
    id: 'quadratic', face: 'math', name: 'Quadratic', blurb: 'Solve ax² + bx + c = 0, real or complex',
    keywords: ['quadratic formula', 'roots', 'parabola', 'discriminant', 'solve'],
    inputs: [NUM('a', 'a', '1'), NUM('b', 'b', '-3'), NUM('c', 'c', '2')],
    run: function (v) {
      if (v.a === 0) R.fail('a can’t be 0 (then it isn’t quadratic).', 'a');
      const D = v.b * v.b - 4 * v.a * v.c, h = -v.b / (2 * v.a), k = v.c - v.b * v.b / (4 * v.a);
      let roots;
      if (Math.abs(D) < 1e-12) roots = [{ label: 'x', value: R.fmt(h, 6), big: true, note: 'One repeated root' }];
      else if (D > 0) {
        const s = Math.sqrt(D), x1 = (-v.b + s) / (2 * v.a), x2 = (-v.b - s) / (2 * v.a);
        roots = [{ label: 'x', value: R.fmt(Math.max(x1, x2), 6) + ' and ' + R.fmt(Math.min(x1, x2), 6), big: true, note: 'Two real roots' }];
      } else {
        const im = Math.sqrt(-D) / (2 * Math.abs(v.a));
        roots = [{ label: 'x', value: R.fmt(h, 6) + ' ± ' + R.fmt(im, 6) + 'i', big: true, note: 'Two complex roots' }];
      }
      return roots.concat([{ label: 'Discriminant', value: R.fmt(D, 6) }, { label: 'Vertex', value: '(' + R.fmt(h, 6) + ', ' + R.fmt(k, 6) + ')' }]);
    },
    examples: [
      { in: {}, out: { 'x': '2 and 1', 'Discriminant': '1', 'Vertex': '(1.5, −0.25)' } },
      { in: { a: '1', b: '2', c: '5' }, out: { 'x': '−1 ± 2i' } },
      { in: { a: '1', b: '-2', c: '1' }, out: { 'x': '1' } },
      { in: { a: '0' }, error: 'a' },
    ],
  });

  R.calc({
    id: 'rounding', face: 'math', name: 'Rounding', blurb: 'Round to decimal places or significant figures, up or down',
    keywords: ['round', 'significant figures', 'sig figs', 'decimal places', 'ceiling', 'floor'],
    inputs: [
      NUM('x', 'Number', '3.14159'),
      { id: 'mode', label: 'Round to', kind: 'choice', value: 'dp', options: [['dp', 'Decimal places'], ['sf', 'Significant figures']] },
      { id: 'n', label: 'How many', kind: 'int', value: '2', min: 0, max: 12 },
      { id: 'dir', label: 'Direction', kind: 'choice', value: 'near', options: [['near', 'Nearest'], ['up', 'Always up'], ['down', 'Always down']] },
    ],
    run: function (v) {
      let places = v.n;
      if (v.mode === 'sf') {
        if (v.n < 1) R.fail('Significant figures start at 1.', 'n');
        places = v.x === 0 ? 0 : v.n - 1 - Math.floor(Math.log10(Math.abs(v.x)));
      }
      const f = Math.pow(10, places), y = v.x * f;
      const fn = v.dir === 'up' ? Math.ceil : v.dir === 'down' ? Math.floor : function (z) { return Math.sign(z) * Math.round(Math.abs(z)); };
      const r = fn(Number(y.toPrecision(15))) / f;
      const shown = places > 0 ? r.toFixed(Math.min(places, 20)) : String(r);
      return [{ label: 'Rounded', value: shown.replace('-', '−'), big: true }];
    },
    examples: [
      { in: {}, out: { 'Rounded': '3.14' } },
      { in: { dir: 'up' }, out: { 'Rounded': '3.15' } },
      { in: { x: '0.004567', mode: 'sf', n: '3' }, out: { 'Rounded': '0.00457' } },
      { in: { x: '1234.5', mode: 'sf', n: '2' }, out: { 'Rounded': '1200' } },
      { in: { x: '2.5', n: '0' }, out: { 'Rounded': '3' } },
      { in: { x: '1.005', n: '2' }, out: { 'Rounded': '1.01' } },
    ],
  });

  R.calc({
    id: 'percent-error', face: 'math', name: 'Percent error', blurb: 'How far a measurement is from the true value',
    keywords: ['error', 'accuracy', 'measured', 'actual', 'experimental'],
    inputs: [NUM('m', 'Measured', '9.8'), NUM('a', 'True value', '10')],
    run: function (v) {
      if (v.a === 0) R.fail('The true value can’t be zero.', 'a');
      return [{ label: 'Percent error', value: R.fmt(Math.abs(v.m - v.a) / Math.abs(v.a) * 100, 4) + '%', big: true }, { label: 'Off by', value: R.fmt(v.m - v.a, 6) }];
    },
    examples: [{ in: {}, out: { 'Percent error': '2%', 'Off by': '−0.2' } }],
  });

  R.calc({
    id: 'sci-notation', face: 'math', name: 'Scientific notation', blurb: 'Write a number as a × 10ⁿ, and back',
    keywords: ['scientific notation', 'exponent', 'e notation', 'engineering'],
    inputs: [NUM('x', 'Number', '0.00034', { max: 1e300, min: -1e300 })],
    run: function (v) {
      if (v.x === 0) return [{ label: 'Scientific', value: '0', big: true }];
      const e = Math.floor(Math.log10(Math.abs(v.x)));
      let m = Number((v.x / Math.pow(10, e)).toPrecision(12));
      let ee = e;
      if (Math.abs(m) >= 10) { m /= 10; ee += 1; }
      const eng = Math.floor(ee / 3) * 3;
      return [
        { label: 'Scientific', value: R.fmt(m, 10) + ' × 10' + sup(ee), big: true },
        { label: 'E notation', value: R.fmt(m, 10).replace(/,/g, '').replace('−', '-') + 'e' + ee },
        { label: 'Engineering', value: R.fmt(Number((v.x / Math.pow(10, eng)).toPrecision(12)), 10) + ' × 10' + sup(eng) },
      ];
    },
    examples: [
      { in: {}, out: { 'Scientific': '3.4 × 10⁻⁴', 'E notation': '3.4e-4', 'Engineering': '340 × 10⁻⁶' } },
      { in: { x: '123000' }, out: { 'Scientific': '1.23 × 10⁵' } },
    ],
  });
})(globalThis.Reckon = globalThis.Reckon || {});
