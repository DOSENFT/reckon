/* Reckon: the maintenance keys on the Calc pad, in four tabs (his picks 2026-11-05: Shop, Electric,
   Fuel/HVAC, Water; "I actually never use the normal extra calculator scientific tools"), plus the three
   job tools those tabs open that Reckon didn't have yet. Every example was worked by hand first. */
(function (R) {
  'use strict';
  const LEN = function (inches) { return R.formatFtIn(inches, 16); };
  const IN16 = function (inches) { return '≈ ' + R.formatFtIn(inches, 16, { inchOnly: true }); };
  const notNeg = { min: 0, minMsg: 'it can’t be less than 0.' };
  const pair = function (a, b, factor, extra, rextra) {   // a → b is × factor, b → a is ÷ factor
    R.quickKey(Object.assign({ run: function (x) { return x * factor; } }, notNeg, a, extra || {}));
    R.quickKey(Object.assign({ run: function (x) { return x / factor; } }, notNeg, b, rextra || {}));
  };

  // ---- Shop ----
  R.quickKey({ id: 'f-to-c', key: '°F→°C', name: '°F to °C', from: '°F', to: '°C', min: -459.67, minMsg: 'that’s colder than absolute zero (−459.67 °F).',
    run: function (x) { return (x - 32) * 5 / 9; }, examples: [{ x: 72, v: '22.2222' }, { x: 212, v: '100' }, { x: -40, v: '−40' }, { x: -500, error: /absolute zero/ }] });
  R.quickKey({ id: 'c-to-f', key: '°C→°F', name: '°C to °F', from: '°C', to: '°F', min: -273.15, minMsg: 'that’s colder than absolute zero (−273.15 °C).',
    run: function (x) { return x * 9 / 5 + 32; }, examples: [{ x: 100, v: '212' }, { x: 37, v: '98.6' }, { x: -300, error: /absolute zero/ }] });
  pair({ id: 'in-to-mm', key: 'in→mm', name: 'Inches to mm', from: 'in', to: 'mm', examples: [{ x: 1, v: '25.4' }, { x: 0.5, v: '12.7' }, { x: -1, error: /less than 0/ }] },
    { id: 'mm-to-in', key: 'mm→in', name: 'mm to inches', from: 'mm', to: 'in', note: function (v) { return IN16(v); }, examples: [{ x: 19, v: '0.748031', note: /≈ 3\/4"/ }, { x: 254, v: '10' }] }, 25.4);
  pair({ id: 'ft-to-m', key: 'ft→m', name: 'Feet to meters', from: 'ft', to: 'm', examples: [{ x: 10, v: '3.048' }] },
    { id: 'm-to-ft', key: 'm→ft', name: 'Meters to feet', from: 'm', to: 'ft', note: function (v) { return '≈ ' + LEN(v * 12); }, examples: [{ x: 3, v: '9.84252', note: /9' 10-1\/8"/ }] }, 0.3048);
  pair({ id: 'gal-to-l', key: 'gal→L', name: 'Gallons to liters', from: 'gal', to: 'L', examples: [{ x: 5, v: '18.9271' }] },
    { id: 'l-to-gal', key: 'L→gal', name: 'Liters to gallons', from: 'L', to: 'gal', examples: [{ x: 20, v: '5.28344' }] }, 3.785411784);
  pair({ id: 'psi-to-bar', key: 'psi→bar', name: 'psi to bar', from: 'psi', to: 'bar', min: -1.01325 / 0.0689475729, minMsg: 'that’s below a perfect vacuum (−14.7 psi).', examples: [{ x: 30, v: '2.06843' }, { x: -20, error: /vacuum/ }] },
    { id: 'bar-to-psi', key: 'bar→psi', name: 'bar to psi', from: 'bar', to: 'psi', min: -1.01325, minMsg: 'that’s below a perfect vacuum (−1.01 bar).', examples: [{ x: 2, v: '29.0075' }] }, 0.0689475729);
  pair({ id: 'lb-to-kg', key: 'lb→kg', name: 'Pounds to kg', from: 'lb', to: 'kg', examples: [{ x: 50, v: '22.6796' }] },
    { id: 'kg-to-lb', key: 'kg→lb', name: 'kg to pounds', from: 'kg', to: 'lb', examples: [{ x: 10, v: '22.0462' }] }, 0.45359237);
  R.quickKey({ id: 'to-16th', key: '→1/16"', name: 'Nearest 1/16 inch', from: 'in', to: 'in', min: 0, minMsg: 'a length can’t be less than 0.', max: 1e6,
    run: function (x) { return Math.round(x * 16) / 16; }, note: function (v) { return R.formatFtIn(v, 16, { inchOnly: true }); },
    examples: [{ x: 7.38, v: '7.375', note: /^7-3\/8"$/ }, { x: 0.3, v: '0.3125', note: /^5\/16"$/ }, { x: 2.97, v: '3' }] });

  // ---- Electric ----
  pair({ id: 'w-to-a120', key: 'W→A 120', name: 'Watts to amps at 120 V', from: 'W', to: 'A', note: function () { return 'at 120 V, for heaters and lights'; }, examples: [{ x: 1500, v: '12.5' }] },
    { id: 'a-to-w120', key: 'A→W 120', name: 'Amps to watts at 120 V', from: 'A', to: 'W', note: function () { return 'at 120 V, for heaters and lights'; }, examples: [{ x: 15, v: '1,800' }] }, 1 / 120);
  pair({ id: 'w-to-a240', key: 'W→A 240', name: 'Watts to amps at 240 V', from: 'W', to: 'A', note: function () { return 'at 240 V, for heaters and lights'; }, examples: [{ x: 4800, v: '20' }] },
    { id: 'a-to-w240', key: 'A→W 240', name: 'Amps to watts at 240 V', from: 'A', to: 'W', note: function () { return 'at 240 V, for heaters and lights'; }, examples: [{ x: 30, v: '7,200' }] }, 1 / 240);
  const BREAKERS = [15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200, 225, 250, 300, 350, 400];   // NEC 240.6(A)
  R.quickKey({ id: 'load80', key: '80% load', name: 'Most continuous amps on a breaker (80%)', from: 'A breaker', to: 'A', min: 0, minMsg: 'a breaker can’t be less than 0 A.',
    run: function (x) { return x * 0.8; }, note: function (v, x) { return 'most continuous load on a ' + R.fmt(x, 2) + ' A breaker'; },
    examples: [{ x: 20, v: '16' }, { x: 15, v: '12' }] });
  R.quickKey({ id: 'brk125', key: 'Min brkr', name: 'Smallest breaker for a continuous load (125%)', from: 'A load', to: 'A', min: 0, minMsg: 'a load can’t be less than 0 A.',
    run: function (x) { return x * 1.25; },
    note: function (v) { const b = BREAKERS.find(function (s) { return s >= v - 1e-9; }); return b ? 'next standard breaker: ' + b + ' A' : 'past 400 A: size it with an electrician'; },
    examples: [{ x: 12, v: '15', note: /15 A/ }, { x: 13, v: '16.25', note: /20 A/ }, { x: 400, v: '500', note: /electrician/ }] });
  pair({ id: 'hp-to-kw', key: 'HP→kW', name: 'Horsepower to kW', from: 'HP', to: 'kW', examples: [{ x: 1, v: '0.7457' }] },
    { id: 'kw-to-hp', key: 'kW→HP', name: 'kW to horsepower', from: 'kW', to: 'HP', examples: [{ x: 5, v: '6.70511' }] }, 0.745699872);

  // ---- Fuel / HVAC ----
  [[50, '2.56', '6.4', '75.7'], [40, '3.2', '8', '94.6'], [32, '4', '10', '118.3']].forEach(function (m) {
    R.quickKey({ id: 'mix' + m[0], key: m[0] + ':1 oil', name: '2-stroke oil for ' + m[0] + ':1', from: 'gal gas', to: 'fl oz oil', min: 0, minMsg: 'gallons can’t be less than 0.', max: 1000,
      run: function (x) { return x * 128 / m[0]; }, note: function (v) { return R.fmt(v * 29.5735, 1) + ' mL'; },
      examples: [{ x: 1, v: m[1], note: new RegExp('^' + m[3].replace('.', '\\.') + ' mL$') }, { x: 2.5, v: m[2] }] });
  });
  pair({ id: 'lp-gal-to-lb', key: 'LP→lb', name: 'Propane gallons to pounds (4.24 lb/gal)', from: 'gal LP', to: 'lb', note: function () { return '4.24 lb a gallon at 60 °F'; }, examples: [{ x: 5, v: '21.2', note: /4\.24 lb a gallon/ }] },
    { id: 'lp-lb-to-gal', key: 'lb→LP', name: 'Propane pounds to gallons (4.24 lb/gal)', from: 'lb LP', to: 'gal', note: function () { return '4.24 lb a gallon at 60 °F'; }, examples: [{ x: 20, v: '4.71698' }] }, 4.24);
  pair({ id: 'btu-to-ton', key: 'BTU→ton', name: 'BTU/h to tons of cooling', from: 'BTU/h', to: 'tons', examples: [{ x: 36000, v: '3' }] },
    { id: 'ton-to-btu', key: 'ton→BTU', name: 'Tons of cooling to BTU/h', from: 'tons', to: 'BTU/h', examples: [{ x: 2.5, v: '30,000' }] }, 1 / 12000);
  pair({ id: 'btu-to-kw', key: 'BTU→kW', name: 'BTU/h to kW', from: 'BTU/h', to: 'kW', examples: [{ x: 5000, v: '1.46536' }] },
    { id: 'kw-to-btu', key: 'kW→BTU', name: 'kW to BTU/h', from: 'kW', to: 'BTU/h', examples: [{ x: 1.5, v: '5,118.21' }] }, 1 / 3412.14163);

  // ---- Water ----
  [['off45', '45° off', 45, '14.1421', /^≈ 14-1\/8"$/], ['off22', '22½° off', 22.5, '26.1313', /^≈ 26-1\/8"$/], ['off60', '60° off', 60, '11.547', /^≈ 11-9\/16"$/]].forEach(function (o) {
    R.quickKey({ id: o[0], key: o[1], name: 'Pipe offset travel at ' + o[1].replace(' off', ''), from: 'in offset', to: 'in travel', min: 0, minMsg: 'an offset can’t be less than 0.', max: 1e6,
      run: function (x) { return x / Math.sin(o[2] * Math.PI / 180); }, note: function (v) { return IN16(v); },
      examples: [{ x: 10, v: o[3], note: o[4] }] });
  });
  pair({ id: 'ft3-to-gal', key: 'ft³→gal', name: 'Cubic feet to gallons', from: 'ft³', to: 'gal', examples: [{ x: 10, v: '74.8052' }] },
    { id: 'gal-to-ft3', key: 'gal→ft³', name: 'Gallons to cubic feet', from: 'gal', to: 'ft³', examples: [{ x: 100, v: '13.3681' }] }, 7.48051948);
  pair({ id: 'psi-to-head', key: 'psi→head', name: 'Water pressure to feet of head (2.31 ft per psi)', from: 'psi', to: 'ft of head', note: function () { return '2.31 ft per psi'; }, examples: [{ x: 50, v: '115.5', note: /2\.31 ft per psi/ }] },
    { id: 'head-to-psi', key: 'head→psi', name: 'Feet of head to water pressure (2.31 ft per psi)', from: 'ft of head', to: 'psi', note: function () { return '2.31 ft per psi'; }, examples: [{ x: 100, v: '43.29' }] }, 2.31);

  // ---- the tools those tabs open ----
  R.calc({
    id: 'fuel-mix', face: 'job', name: '2-stroke fuel mix', blurb: 'How much oil for a can of gas, at any ratio',
    keywords: ['two stroke', '2 cycle', 'chainsaw', 'trimmer', 'weed eater', 'blower', 'oil', 'premix', 'ratio', 'small engine'],
    inputs: [
      { id: 'gas', label: 'Gas', kind: 'number', value: '1', min: 0.01, max: 1000, help: 'gallons' },
      { id: 'ratio', label: 'Mix ratio', kind: 'number', value: '50', min: 10, max: 200, help: '50 for 50:1 (check the engine)' },
    ],
    run: function (v) {
      const oz = v.gas * 128 / v.ratio;
      return [
        { label: 'Oil', value: R.fmt(oz, oz < 1 ? 3 : 2) + ' fl oz', big: true, note: 'for ' + R.fmt(v.gas, 2) + ' gal of gas at ' + R.fmt(v.ratio, 1) + ':1' },
        { label: 'Oil in mL', value: R.fmt(oz * 29.5735, oz * 29.5735 < 10 ? 1 : 0) + ' mL' },
        { label: 'Gas in liters', value: R.fmt(v.gas * 3.785411784, 2) + ' L' },
      ];
    },
    examples: [
      { in: {}, out: { 'Oil': '2.56 fl oz', 'Oil in mL': '76 mL', 'Gas in liters': '3.79 L' } },
      { in: { gas: '2.5', ratio: '40' }, out: { 'Oil': '8 fl oz' } },
      { in: { gas: '0.01', ratio: '200' }, out: { 'Oil': '0.006 fl oz', 'Oil in mL': '0.2 mL' } },   // 0.01 × 128 ÷ 200 = 0.0064 oz = 0.19 mL
      { in: { ratio: '5' }, error: 'ratio' },
    ],
  });

  R.calc({
    id: 'tank-volume', face: 'job', name: 'Tank & pool gallons', blurb: 'Gallons in a round or square tank, pool or trough',
    keywords: ['tank', 'pool', 'cistern', 'trough', 'water heater', 'cylinder', 'gallons', 'capacity', 'chlorine'],
    inputs: [
      { id: 'shape', label: 'Shape', kind: 'choice', value: 'round', options: [['round', 'Round (tank, pool, barrel)'], ['rect', 'Square or rectangular']] },
      { id: 'dia', label: 'Diameter', kind: 'length', unit: 'ft', value: `4'`, zero: false, when: function (r) { return r.shape !== 'rect'; } },
      { id: 'len', label: 'Length', kind: 'length', unit: 'ft', value: `20'`, zero: false, when: function (r) { return r.shape === 'rect'; } },
      { id: 'wid', label: 'Width', kind: 'length', unit: 'ft', value: `10'`, zero: false, when: function (r) { return r.shape === 'rect'; } },
      { id: 'dep', label: 'Water depth', kind: 'length', unit: 'ft', value: `5'`, zero: false, help: 'a pool: its average depth' },
    ],
    run: function (v) {
      const in3 = v.shape === 'rect' ? v.len * v.wid * v.dep : Math.PI * (v.dia / 2) * (v.dia / 2) * v.dep;
      const ft3 = in3 / 1728, gal = ft3 * 7.48051948;
      if (gal > 1e9) R.fail('That’s more than a billion gallons. Check the sizes.', 'dep');
      return [
        { label: 'Gallons', value: R.fmt(gal, 0) + ' gal', big: true, note: v.shape === 'rect' ? 'length × width × depth' : 'π × radius² × depth' },
        { label: 'Liters', value: R.fmt(gal * 3.785411784, 0) + ' L' },
        { label: 'Cubic feet', value: R.fmt(ft3, 2) + ' ft³' },
        { label: 'Water weight', value: R.fmt(gal * 8.34, 0) + ' lb', note: '8.34 lb a gallon' },
      ];
    },
    examples: [
      { in: {}, out: { 'Gallons': '470 gal', 'Cubic feet': '62.83 ft³', 'Water weight': '3,920 lb' } },           // π·2²·5 = 62.83 ft³
      { in: { shape: 'rect', dep: '4\' 6"' }, out: { 'Gallons': '6,732 gal', 'Cubic feet': '900 ft³' } },          // 20 × 10 × 4.5
      { in: { dia: '0' }, error: 'dia' },
    ],
  });

  R.calc({
    id: 'fill-time', face: 'job', name: 'Fill time', blurb: 'How long a tank or pool takes to fill (or drain) at a flow rate',
    keywords: ['gpm', 'flow', 'fill', 'drain', 'pump', 'hose', 'pool', 'tank', 'how long'],
    inputs: [
      { id: 'gal', label: 'Gallons', kind: 'number', value: '500', min: 0.01, max: 1e9, help: 'Tank & pool gallons works it out' },
      { id: 'gpm', label: 'Flow', kind: 'number', value: '5', min: 0.01, max: 1e6, help: 'gallons a minute (a garden hose: about 5)' },
    ],
    run: function (v) {
      const mins = v.gal / v.gpm;
      if (mins > 60 * 24 * 365 * 10) R.fail('That’s more than 10 years. Check the flow.', 'gpm');
      return [
        mins < 1 ? { label: 'Time', value: R.fmt(mins * 60, 0) + ' sec', big: true, note: 'under a minute' } : { label: 'Time', value: R.hm(mins), big: true, note: 'hours:minutes' },
        { label: 'Minutes', value: R.fmt(mins, 1) },
        { label: 'Hours', value: R.fmt(mins / 60, 2) },
        { label: 'Days', value: R.fmt(mins / 1440, 2) },
      ];
    },
    examples: [
      { in: {}, out: { 'Time': '1:40', 'Minutes': '100', 'Hours': '1.67' } },
      { in: { gal: '20000', gpm: '10' }, out: { 'Time': '33:20', 'Days': '1.39' } },
      { in: { gal: '2', gpm: '5' }, out: { 'Time': '24 sec', 'Minutes': '0.4' } },   // 2 ÷ 5 = 0.4 min = 24 s
      { in: { gpm: '0' }, error: 'gpm' },
    ],
  });

  // The four tabs, 8 keys each, the order he'd reach for them. A pair flips with ⇄; "t:" opens a tool.
  R.QGROUPS = [
    { id: 'shop', name: 'Shop', short: 'Shop', slots: [['f-to-c', 'c-to-f'], ['in-to-mm', 'mm-to-in'], ['ft-to-m', 'm-to-ft'], ['gal-to-l', 'l-to-gal'], ['psi-to-bar', 'bar-to-psi'], ['lb-to-kg', 'kg-to-lb'], 'to-16th', 'flip'] },
    { id: 'elec', name: 'Electric', short: 'Elec', slots: [['w-to-a120', 'a-to-w120'], ['w-to-a240', 'a-to-w240'], ['load80', 'brk125'], ['hp-to-kw', 'kw-to-hp'], 't:ohms-law', 't:voltage-drop', 't:motor-amps', 'flip'] },
    { id: 'fuel', name: 'Fuel/HVAC', short: 'Fuel', slots: ['mix50', 'mix40', 'mix32', ['lp-gal-to-lb', 'lp-lb-to-gal'], ['btu-to-ton', 'ton-to-btu'], ['btu-to-kw', 'kw-to-btu'], 't:fuel-mix', 'flip'] },
    { id: 'water', name: 'Water', short: 'Water', slots: ['off45', 'off22', 'off60', ['ft3-to-gal', 'gal-to-ft3'], ['psi-to-head', 'head-to-psi'], 't:tank-volume', 't:fill-time', 'flip'] },
  ];
  R.QTOOL = { 'ohms-law': 'Ohm’s law', 'voltage-drop': 'V drop', 'motor-amps': 'Motor A', 'fuel-mix': 'Any mix', 'tank-volume': 'Tank/pool', 'fill-time': 'Fill time' };
})(globalThis.Reckon = globalThis.Reckon || {});
