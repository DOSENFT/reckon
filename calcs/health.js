/* Reckon: the Health face. Standard published formulas, named on screen. A guide, not medical advice. */
(function (R) {
  'use strict';
  const KG = 0.45359237;
  const WEIGHT = { id: 'w', label: 'Weight', kind: 'number', value: '180', zero: false, max: 2000 };
  const WUNIT = { id: 'wu', label: 'Weight in', kind: 'choice', value: 'lb', options: [['lb', 'Pounds'], ['kg', 'Kilograms']] };
  const HEIGHT = { id: 'h', label: 'Height', kind: 'length', unit: 'in', value: `5' 10"`, zero: false, help: 'or 178 cm' };
  const SEX = { id: 'sex', label: 'Sex', kind: 'choice', value: 'm', options: [['m', 'Male'], ['f', 'Female']] };
  const kg = function (v) { return v.wu === 'kg' ? v.w : v.w * KG; };
  const lb = function (k) { return R.fmt(k / KG, 0) + ' lb'; };
  const checkHeight = function (v) { if (v.h < 20 || v.h > 108) R.fail('Height should be between 20" and 9 feet.', 'h'); };

  R.calc({
    id: 'bmi', face: 'health', name: 'BMI', blurb: 'Body mass index and the healthy weight range for your height',
    keywords: ['body mass index', 'weight', 'overweight'],
    inputs: [WEIGHT, WUNIT, HEIGHT],
    run: function (v) {
      checkHeight(v);
      const m2 = Math.pow(v.h * 0.0254, 2), b = kg(v) / m2;
      const cat = b < 18.5 ? 'Underweight (under 18.5)' : b < 25 ? 'Healthy (18.5 to 24.9)' : b < 30 ? 'Overweight (25 to 29.9)' : 'Obese (30 and up)';
      return [
        { label: 'BMI', value: R.fmt(b, 1), big: true, note: cat },
        { label: 'Healthy range for your height', value: R.fmt(18.5 * m2 / KG, 0) + ' to ' + lb(24.9 * m2), note: 'BMI 18.5 to 24.9' },
      ];
    },
    examples: [
      { in: {}, out: { 'BMI': '25.8', 'Healthy range for your height': '129 to 174 lb' } },
      { in: { w: '70', wu: 'kg', h: '175 cm' }, out: { 'BMI': '22.9' } },
      { in: { h: '2' }, error: 'h' },
    ],
  });

  const ACT = { id: 'act', label: 'Activity', kind: 'choice', value: '1.55', options: [['1.2', 'Little or none'], ['1.375', 'Light (1–3 days a week)'], ['1.55', 'Moderate (3–5 days)'], ['1.725', 'Hard (6–7 days)'], ['1.9', 'Very hard or physical job']] };
  R.calc({
    id: 'calories', face: 'health', name: 'Daily calories', blurb: 'Calories burned at rest (BMR) and in a day (TDEE)',
    keywords: ['bmr', 'tdee', 'calories', 'diet', 'weight loss', 'metabolism', 'mifflin'],
    inputs: [SEX, { id: 'age', label: 'Age', kind: 'int', value: '40', min: 15, max: 110 }, WEIGHT, WUNIT, HEIGHT, ACT],
    run: function (v) {
      checkHeight(v);
      const bmr = 10 * kg(v) + 6.25 * v.h * 2.54 - 5 * v.age + (v.sex === 'm' ? 5 : -161);
      const tdee = bmr * Number(v.act);
      const k = function (x) { return R.fmt(x, 0) + ' kcal'; };
      return [
        { label: 'A day (TDEE)', value: k(tdee), big: true, note: 'Mifflin–St Jeor, times your activity' },
        { label: 'At rest (BMR)', value: k(bmr) },
        { label: 'To lose about 1 lb a week', value: k(tdee - 500) },
        { label: 'To gain about 1 lb a week', value: k(tdee + 500) },
      ];
    },
    examples: [
      { in: {}, out: { 'At rest (BMR)': '1,733 kcal', 'A day (TDEE)': '2,686 kcal', 'To lose about 1 lb a week': '2,186 kcal' } },
      { in: { sex: 'f' }, out: { 'At rest (BMR)': '1,567 kcal' } },
    ],
  });

  R.calc({
    id: 'body-fat', face: 'health', name: 'Body fat', blurb: 'Body fat percent from a tape measure (US Navy method)',
    keywords: ['body fat', 'navy', 'tape', 'waist', 'neck'],
    inputs: [SEX, HEIGHT,
      { id: 'neck', label: 'Neck', kind: 'length', unit: 'in', value: '15"', zero: false },
      { id: 'waist', label: 'Waist (at the navel)', kind: 'length', unit: 'in', value: '34"', zero: false },
      { id: 'hip', label: 'Hips (widest point)', kind: 'length', unit: 'in', value: '38"', zero: false, when: function (r) { return r.sex === 'f'; } }],
    run: function (v) {
      checkHeight(v);
      let bf;
      if (v.sex === 'm') {
        if (v.waist <= v.neck) R.fail('The waist must measure more than the neck.', 'waist');
        bf = 86.010 * Math.log10(v.waist - v.neck) - 70.041 * Math.log10(v.h) + 36.76;
      } else {
        if (v.waist + v.hip <= v.neck) R.fail('Waist and hips must measure more than the neck.', 'waist');
        bf = 163.205 * Math.log10(v.waist + v.hip - v.neck) - 97.684 * Math.log10(v.h) - 78.387;
      }
      if (!(bf > 0 && bf < 75)) R.fail('Those measurements don’t give a believable answer. Check them.', 'waist');
      return [{ label: 'Body fat', value: R.fmt(bf, 1) + '%', big: true, note: 'US Navy tape method; good to about 3 points' }];
    },
    examples: [
      { in: {}, out: { 'Body fat': '17.5%' } },
      { in: { sex: 'f', h: '64"', neck: '13"', waist: '30"', hip: '38"' }, out: { 'Body fat': '29.2%' } },
      { in: { waist: '14"' }, error: 'waist' },
    ],
  });

  R.calc({
    id: 'ideal-weight', face: 'health', name: 'Ideal weight', blurb: 'Ideal body weight by the common formulas',
    keywords: ['ideal body weight', 'devine', 'robinson', 'target weight'],
    inputs: [SEX, HEIGHT],
    run: function (v) {
      checkHeight(v);
      const over = v.h - 60, m = v.sex === 'm';
      const devine = (m ? 50 : 45.5) + 2.3 * over, robinson = (m ? 52 : 49) + (m ? 1.9 : 1.7) * over;
      if (devine <= 20) R.fail('These formulas are made for adults 5 feet and taller.', 'h');
      const m2 = Math.pow(v.h * 0.0254, 2);
      return [
        { label: 'Devine', value: lb(devine), big: true, note: R.fmt(devine, 1) + ' kg' },
        { label: 'Robinson', value: lb(robinson) },
        { label: 'Healthy BMI range', value: R.fmt(18.5 * m2 / KG, 0) + ' to ' + lb(24.9 * m2) },
      ];
    },
    examples: [{ in: {}, out: { 'Devine': '161 lb', 'Robinson': '157 lb' } }],
  });

  R.calc({
    id: 'water', face: 'health', name: 'Water intake', blurb: 'A day’s water, a common rule of thumb',
    keywords: ['hydration', 'water', 'drink', 'heat'],
    inputs: [{ id: 'w', label: 'Weight (pounds)', kind: 'number', value: '180', zero: false, max: 2000 },
      { id: 'ex', label: 'Minutes of hard work or exercise', kind: 'int', value: '30', min: 0, max: 1440 }],
    run: function (v) {
      const oz = v.w / 2 + 12 * v.ex / 30;
      return [
        { label: 'Water a day', value: R.fmt(oz * 0.0295735295625, 2) + ' L', big: true, note: 'Half your weight in ounces, plus 12 oz per half hour of work. More in heat.' },
        { label: 'Ounces', value: R.fmt(oz, 0) + ' oz' },
        { label: 'Cups', value: R.fmt(oz / 8, 2) },
      ];
    },
    examples: [{ in: {}, out: { 'Water a day': '3.02 L', 'Ounces': '102 oz', 'Cups': '12.75' } }],
  });

  R.calc({
    id: 'due-date', face: 'health', name: 'Due date', blurb: 'Due date and weeks along from the last period',
    keywords: ['pregnancy', 'due date', 'weeks pregnant', 'lmp', 'baby'],
    inputs: [
      { id: 'lmp', label: 'First day of the last period', kind: 'date', value: '2026-02-01' },
      { id: 'cyc', label: 'Cycle length (days)', kind: 'int', value: '28', min: 20, max: 45 },
      { id: 'on', label: 'Weeks along on', kind: 'date', value: R.todayIso() },
    ],
    run: function (v) {
      const due = v.lmp + (280 + v.cyc - 28) * R.DAY;
      const days = R.daysBetween(v.lmp, v.on) - (v.cyc - 28);
      const out = [{ label: 'Due date', value: R.longDate(due), big: true, note: 'Naegele’s rule: about 40 weeks' }];
      if (days >= 0 && days <= 300) {
        out.push({ label: 'Weeks along', value: R.plural(Math.floor(days / 7), 'week') + ', ' + R.plural(days % 7, 'day') });
        out.push({ label: 'Trimester', value: days < 98 ? 'First' : days < 196 ? 'Second' : 'Third' });
      }
      return out;
    },
    examples: [{ in: { on: '2026-05-01' }, out: { 'Due date': 'Sunday, November 8, 2026', 'Weeks along': '12 weeks, 5 days', 'Trimester': 'First' } }],
  });

  R.calc({
    id: 'heart-rate', face: 'health', name: 'Heart rate zones', blurb: 'Training zones from your age (and resting rate)',
    keywords: ['heart rate', 'zones', 'cardio', 'max heart rate', 'karvonen'],
    inputs: [{ id: 'age', label: 'Age', kind: 'int', value: '40', min: 5, max: 110 },
      { id: 'rest', label: 'Resting heart rate', kind: 'int', optional: true, value: '', min: 30, max: 120, help: 'optional, for the Karvonen method' }],
    run: function (v) {
      const max = 220 - v.age;
      const at = function (p) { return Math.round(v.rest != null ? v.rest + p * (max - v.rest) : p * max); };
      const z = [['Zone 1 (easy)', 0.5, 0.6], ['Zone 2 (steady)', 0.6, 0.7], ['Zone 3 (moderate)', 0.7, 0.8], ['Zone 4 (hard)', 0.8, 0.9], ['Zone 5 (max)', 0.9, 1]];
      return [{ label: 'Max heart rate', value: max + ' bpm', big: true, note: v.rest != null ? 'Karvonen zones use your resting rate' : '220 minus age' }]
        .concat(z.map(function (r) { return { label: r[0], value: at(r[1]) + '–' + at(r[2]) + ' bpm' }; }));
    },
    examples: [
      { in: {}, out: { 'Max heart rate': '180 bpm', 'Zone 2 (steady)': '108–126 bpm' } },
      { in: { rest: '60' }, out: { 'Zone 2 (steady)': '132–144 bpm' } },
    ],
  });

  R.calc({
    id: 'calories-burned', face: 'health', name: 'Calories burned', blurb: 'Calories for an activity, from its MET value',
    keywords: ['exercise', 'met', 'walking', 'running', 'burn', 'shoveling'],
    inputs: [
      { id: 'met', label: 'Activity', kind: 'choice', value: 'walk35', options: [['walk3', 'Walking, 3 mph'], ['walk35', 'Walking briskly, 3.5 mph'], ['run6', 'Running, 6 mph'], ['bike12', 'Cycling, 12–14 mph'], ['lift', 'Weight lifting, moderate'], ['custom', 'Another (I know its MET)']] },
      { id: 'mc', label: 'MET value', kind: 'number', value: '6', min: 1, max: 25, when: function (r) { return r.met === 'custom'; } },
      WEIGHT, WUNIT,
      { id: 'min', label: 'Minutes', kind: 'int', value: '60', min: 1, max: 1440 },
    ],
    run: function (v) {
      const met = v.met === 'custom' ? v.mc : { walk3: 3.5, walk35: 4.3, run6: 9.8, bike12: 8, lift: 3.5 }[v.met];
      return [{ label: 'Calories', value: R.fmt(met * kg(v) * v.min / 60, 0) + ' kcal', big: true, note: 'MET ' + R.fmt(met, 1) + ' × body weight × hours; an estimate' }];
    },
    examples: [{ in: {}, out: { 'Calories': '351 kcal' } }],
  });

  R.calc({
    id: 'macros', face: 'health', name: 'Macros', blurb: 'Grams of protein, carbs and fat for a calorie target',
    keywords: ['protein', 'carbs', 'fat', 'macronutrients', 'diet'],
    inputs: [
      { id: 'cal', label: 'Calories a day', kind: 'int', value: '2000', min: 500, max: 10000 },
      { id: 'split', label: 'Split (protein / carbs / fat)', kind: 'choice', value: '30/40/30', options: [['30/40/30', 'Balanced 30 / 40 / 30'], ['40/30/30', 'High protein 40 / 30 / 30'], ['30/20/50', 'Lower carb 30 / 20 / 50'], ['custom', 'My own']] },
      { id: 'p', label: 'Protein %', kind: 'percent', value: '30', max: 100, when: function (r) { return r.split === 'custom'; } },
      { id: 'c', label: 'Carbs %', kind: 'percent', value: '40', max: 100, when: function (r) { return r.split === 'custom'; } },
      { id: 'f', label: 'Fat %', kind: 'percent', value: '30', max: 100, when: function (r) { return r.split === 'custom'; } },
    ],
    run: function (v) {
      const s = v.split === 'custom' ? [v.p, v.c, v.f] : v.split.split('/').map(Number);
      if (Math.abs(s[0] + s[1] + s[2] - 100) > 0.01) R.fail('The three percents add up to ' + R.fmt(s[0] + s[1] + s[2], 2) + ', not 100.', 'f');
      const g = function (p, per) { return R.fmt(v.cal * p / 100 / per, 0) + ' g'; };
      return [
        { label: 'Protein', value: g(s[0], 4), big: true, note: s[0] + '% of ' + R.fmt(v.cal, 0) + ' kcal' },
        { label: 'Carbs', value: g(s[1], 4) },
        { label: 'Fat', value: g(s[2], 9) },
      ];
    },
    examples: [
      { in: {}, out: { 'Protein': '150 g', 'Carbs': '200 g', 'Fat': '67 g' } },
      { in: { split: 'custom', p: '50' }, error: 'f' },
    ],
  });
})(globalThis.Reckon = globalThis.Reckon || {});
