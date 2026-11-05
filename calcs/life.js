/* Reckon: the Everyday face (pets, school, kitchen, shipping, family). */
(function (R) {
  'use strict';
  const YEARS = function (v) { return { id: 'y', label: 'Age in years', kind: 'number', value: v, zero: false, max: 40 }; };

  /** AVMA's guide: year one is about 15 human years, year two about 9 more, then 4 to 6 a year by size. */
  function dogYears(y, size) {
    const per = { small: 4, medium: 5, large: 6 }[size];
    if (y <= 1) return 15 * y;
    if (y <= 2) return 15 + 9 * (y - 1);
    return 24 + per * (y - 2);
  }
  R.calc({
    id: 'dog-age', face: 'life', name: 'Dog age', blurb: 'A dog’s age in human years, by size',
    keywords: ['dog years', 'puppy', 'pet age'],
    inputs: [YEARS('5'), { id: 'size', label: 'Size', kind: 'choice', value: 'medium', options: [['small', 'Small (under 20 lb)'], ['medium', 'Medium (21–50 lb)'], ['large', 'Large (over 50 lb)']] }],
    run: function (v) { return [{ label: 'Human years', value: R.fmt(dogYears(v.y, v.size), 1), big: true, note: 'AVMA guide: 15 for year one, 9 for year two, then 4 to 6 a year by size' }]; },
    examples: [
      { in: {}, out: { 'Human years': '39' } },
      { in: { size: 'large' }, out: { 'Human years': '42' } },
      { in: { y: '1.5' }, out: { 'Human years': '19.5' } },
    ],
  });

  R.calc({
    id: 'cat-age', face: 'life', name: 'Cat age', blurb: 'A cat’s age in human years',
    keywords: ['cat years', 'kitten', 'pet age'],
    inputs: [YEARS('10')],
    run: function (v) {
      const h = v.y <= 1 ? 15 * v.y : v.y <= 2 ? 15 + 9 * (v.y - 1) : 24 + 4 * (v.y - 2);
      return [{ label: 'Human years', value: R.fmt(h, 1), big: true, note: '15 for year one, 9 for year two, then 4 a year' }];
    },
    examples: [{ in: {}, out: { 'Human years': '56' } }, { in: { y: '2' }, out: { 'Human years': '24' } }],
  });

  const POINTS = { 'A+': 4, A: 4, 'A-': 3.7, 'B+': 3.3, B: 3, 'B-': 2.7, 'C+': 2.3, C: 2, 'C-': 1.7, 'D+': 1.3, D: 1, 'D-': 0.7, F: 0 };
  R.calc({
    id: 'gpa', face: 'life', name: 'GPA', blurb: 'Grade point average from letter grades and credits',
    keywords: ['gpa', 'grades', 'school', 'college', 'credits', 'report card'],
    inputs: [{ id: 'g', label: 'Grades and credits', kind: 'text', value: 'A 3, B+ 4, C 3', help: 'grade then credits, commas between', maxLength: 2000 }],
    run: function (v) {
      let pts = 0, cr = 0;
      v.g.split(/[,;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (item, i) {
        const m = item.match(/^([A-Fa-f][+\-−]?)\s+(\d+(?:\.\d+)?)$/);
        if (!m) R.fail('Class ' + (i + 1) + ' ("' + item + '"): write it like B+ 3.', 'g');
        const letter = m[1].toUpperCase().replace('−', '-');
        if (!(letter in POINTS)) R.fail('Class ' + (i + 1) + ': "' + m[1] + '" isn’t a letter grade.', 'g');
        if (+m[2] <= 0 || +m[2] > 30) R.fail('Class ' + (i + 1) + ': credits should be between 0 and 30.', 'g');
        pts += POINTS[letter] * +m[2]; cr += +m[2];
      });
      if (!cr) R.fail('Enter at least one class.', 'g');
      return [{ label: 'GPA', value: R.fmt(pts / cr, 2), big: true, note: 'On a 4.0 scale' }, { label: 'Credits', value: R.fmt(cr, 2) }];
    },
    examples: [
      { in: {}, out: { 'GPA': '3.12', 'Credits': '10' } },
      { in: { g: 'A 3, Q 4' }, error: 'g' },
    ],
  });

  R.calc({
    id: 'grade', face: 'life', name: 'Grade', blurb: 'A score as a percent and a letter grade',
    keywords: ['test score', 'grade', 'percent', 'quiz'],
    inputs: [{ id: 'e', label: 'Points earned', kind: 'number', value: '43', max: 1e6 }, { id: 'p', label: 'Points possible', kind: 'number', value: '50', zero: false, max: 1e6 }],
    run: function (v) {
      const pc = v.e / v.p * 100;
      const base = pc >= 90 ? 'A' : pc >= 80 ? 'B' : pc >= 70 ? 'C' : pc >= 60 ? 'D' : 'F';
      const r = pc % 10, mod = base === 'F' ? '' : (r >= 7 && base !== 'A') || pc > 100 ? '+' : r < 3 ? '−' : '';
      return [{ label: 'Score', value: R.fmt(pc, 2) + '%', big: true }, { label: 'Letter', value: base, note: 'With plus and minus: ' + base + mod }];
    },
    examples: [{ in: {}, out: { 'Score': '86%', 'Letter': 'B' } }, { in: { e: '29' }, out: { 'Score': '58%', 'Letter': 'F' } }],
  });

  const KITCHEN = [[0, ''], [1 / 8, '1/8'], [1 / 4, '1/4'], [1 / 3, '1/3'], [3 / 8, '3/8'], [1 / 2, '1/2'], [5 / 8, '5/8'], [2 / 3, '2/3'], [3 / 4, '3/4'], [7 / 8, '7/8'], [1, '']];
  function kitchen(x) {
    let w = Math.floor(x), f = x - w, best = KITCHEN[0];
    KITCHEN.forEach(function (k) { if (Math.abs(k[0] - f) < Math.abs(best[0] - f)) best = k; });
    if (best[0] === 1) { w += 1; best = KITCHEN[0]; }
    if (!w && !best[1]) return x > 0 ? 'a pinch' : '0';
    return (w ? String(w) : '') + (w && best[1] ? ' ' : '') + best[1];
  }
  R.calc({
    id: 'recipe', face: 'life', name: 'Recipe scaler', blurb: 'Scale a recipe up or down, in kitchen fractions',
    keywords: ['recipe', 'servings', 'cooking', 'scale', 'double', 'half', 'camp kitchen'],
    inputs: [
      { id: 'from', label: 'Recipe makes (servings)', kind: 'number', value: '4', zero: false, max: 10000 },
      { id: 'to', label: 'I need (servings)', kind: 'number', value: '6', zero: false, max: 100000 },
      { id: 'items', label: 'Ingredients', kind: 'text', value: '2 cups flour; 1/2 tsp salt; 1 1/3 cups milk', help: 'separate with ; or new lines', maxLength: 4000 },
    ],
    run: function (v) {
      const k = v.to / v.from;
      const out = [{ label: 'Multiply by', value: '×' + R.fmt(k, 3), big: true }];
      v.items.split(/[;\n]+/).map(function (s) { return s.trim(); }).filter(Boolean).slice(0, 60).forEach(function (line) {
        const m = line.match(/^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*(.*)$/);
        if (!m) { out.push({ label: line, value: line, note: 'No amount to scale' }); return; }
        let q;
        try { q = R.parseNum(m[1], { label: '"' + line + '"' }); } catch (e) { if (e instanceof R.InputError) R.fail(e.message, 'items'); throw e; }
        out.push({ label: line, value: (kitchen(q * k) + ' ' + m[2]).trim() });
      });
      return out;
    },
    examples: [
      { in: {}, out: { 'Multiply by': '×1.5', '2 cups flour': '3 cups flour', '1/2 tsp salt': '3/4 tsp salt', '1 1/3 cups milk': '2 cups milk' } },
      { in: { to: '2', items: '3 eggs; 1/3 cup sugar' }, out: { '3 eggs': '1 1/2 eggs', '1/3 cup sugar': '1/8 cup sugar' } },
      { in: { items: '1/0 cup oil' }, error: 'items' },
    ],
  });

  R.calc({
    id: 'shipping', face: 'life', name: 'Shipping weight', blurb: 'Dimensional weight and what a box will bill at',
    keywords: ['dim weight', 'dimensional', 'ups', 'fedex', 'usps', 'box', 'freight', 'density'],
    inputs: [
      { id: 'l', label: 'Length (inches)', kind: 'number', value: '24', zero: false, max: 1000 },
      { id: 'w', label: 'Width (inches)', kind: 'number', value: '18', zero: false, max: 1000 },
      { id: 'h', label: 'Height (inches)', kind: 'number', value: '12', zero: false, max: 1000 },
      { id: 'lb', label: 'Actual weight (pounds)', kind: 'number', value: '30', zero: false, max: 100000 },
    ],
    run: function (v) {
      const cu = v.l * v.w * v.h, ups = Math.ceil(cu / 139 - 1e-9), usps = Math.ceil(cu / 166 - 1e-9), act = Math.ceil(v.lb - 1e-9);
      return [
        { label: 'UPS / FedEx bills at', value: Math.max(ups, act) + ' lb', big: true, note: 'Dimensional weight ' + ups + ' lb (L × W × H ÷ 139)' },
        { label: 'USPS bills at', value: Math.max(usps, act) + ' lb', note: 'Dimensional weight ' + usps + ' lb (÷ 166)' },
        { label: 'Density', value: R.fmt(v.lb / (cu / 1728), 2) + ' lb/cu ft', note: 'Freight classes start from this' },
      ];
    },
    examples: [{ in: {}, out: { 'UPS / FedEx bills at': '38 lb', 'USPS bills at': '32 lb', 'Density': '10 lb/cu ft' } }],
  });

  R.calc({
    id: 'age-difference', face: 'life', name: 'Age difference', blurb: 'Exactly how far apart two birthdays are',
    keywords: ['age gap', 'older', 'younger', 'siblings', 'birthday'],
    inputs: [{ id: 'a', label: 'First birthday', kind: 'date', value: '1990-06-15' }, { id: 'b', label: 'Second birthday', kind: 'date', value: '1993-03-02' }],
    run: function (v) {
      const r = R.ymd(v.a, v.b);
      return [
        { label: 'Difference', value: R.ymdText(r), big: true, note: v.a === v.b ? 'Same day' : (v.a < v.b ? 'The first is older' : 'The second is older') },
        { label: 'In days', value: R.fmt(Math.abs(R.daysBetween(v.a, v.b)), 0) },
      ];
    },
    examples: [{ in: {}, out: { 'Difference': '2 years, 8 months, 15 days' } }],
  });
})(globalThis.Reckon = globalThis.Reckon || {});
