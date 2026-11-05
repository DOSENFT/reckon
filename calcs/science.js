/* Reckon: the Science face (electrical, physics, chemistry). Constants are CODATA / NEC values, named on screen. */
(function (R) {
  'use strict';
  const POS = function (id, label, value, extra) { return Object.assign({ id: id, label: label, kind: 'number', value: value, zero: false, max: 1e12 }, extra || {}); };
  const KG = 0.45359237;

  R.calc({
    id: 'ohms-law', face: 'science', name: 'Ohm’s law', blurb: 'Volts, amps, ohms and watts from any two',
    keywords: ['ohm', 'volts', 'amps', 'watts', 'resistance', 'power', 'current', 'electrical'],
    inputs: [
      { id: 'mode', label: 'I know', kind: 'choice', value: 'VI', options: [['VI', 'Volts and amps'], ['VR', 'Volts and ohms'], ['IR', 'Amps and ohms'], ['PV', 'Watts and volts'], ['PI', 'Watts and amps'], ['PR', 'Watts and ohms']] },
      POS('V', 'Volts', '120', { when: function (r) { return r.mode.indexOf('V') >= 0; } }),
      POS('I', 'Amps', '10', { when: function (r) { return r.mode.indexOf('I') >= 0; } }),
      POS('R', 'Ohms', '12', { when: function (r) { return r.mode.indexOf('R') >= 0; } }),
      POS('P', 'Watts', '1500', { when: function (r) { return r.mode.indexOf('P') >= 0; } }),
    ],
    run: function (v) {
      let V = v.V, I = v.I, Rr = v.R, P = v.P;
      switch (v.mode) {
        case 'VI': Rr = V / I; P = V * I; break;
        case 'VR': I = V / Rr; P = V * I; break;
        case 'IR': V = I * Rr; P = V * I; break;
        case 'PV': I = P / V; Rr = V / I; break;
        case 'PI': V = P / I; Rr = V / I; break;
        case 'PR': I = Math.sqrt(P / Rr); V = I * Rr; break;
      }
      const all = [['Volts', R.fmt(V, 4) + ' V'], ['Amps', R.fmt(I, 4) + ' A'], ['Ohms', R.fmt(Rr, 4) + ' Ω'], ['Watts', R.fmt(P, 4) + ' W']];
      const unknown = all.filter(function (a) { return v.mode.indexOf(a[0][0] === 'O' ? 'R' : a[0][0] === 'W' ? 'P' : a[0][0] === 'A' ? 'I' : 'V') < 0; });
      return unknown.map(function (a, i) { return { label: a[0], value: a[1], big: i === 0 }; });
    },
    examples: [
      { in: {}, out: { 'Ohms': '12 Ω', 'Watts': '1,200 W' } },
      { in: { mode: 'PV' }, out: { 'Amps': '12.5 A', 'Ohms': '9.6 Ω' } },
      { in: { mode: 'VI', I: '0' }, error: 'I' },
    ],
  });

  const CMIL = { '14': 4110, '12': 6530, '10': 10380, '8': 16510, '6': 26240, '4': 41740, '3': 52620, '2': 66360, '1': 83690, '1/0': 105600, '2/0': 133100, '3/0': 167800, '4/0': 211600 };
  R.calc({
    id: 'voltage-drop', face: 'science', name: 'Voltage drop', blurb: 'Volts lost over a wire run, and what’s left at the end',
    keywords: ['voltage drop', 'wire size', 'awg', 'circuit', 'run length', 'nec', 'electrical'],
    inputs: [
      { id: 'mat', label: 'Wire', kind: 'choice', value: 'cu', options: [['cu', 'Copper'], ['al', 'Aluminum']] },
      { id: 'awg', label: 'Size (AWG)', kind: 'choice', value: '12', options: Object.keys(CMIL).map(function (k) { return [k, k + ' AWG']; }) },
      { id: 'len', label: 'One-way length', kind: 'length', unit: 'ft', value: `100'`, zero: false },
      POS('amps', 'Load (amps)', '16', { max: 10000 }),
      POS('volts', 'Circuit volts', '120', { max: 100000 }),
      { id: 'ph', label: 'Phase', kind: 'choice', value: '1', options: [['1', 'Single phase'], ['3', 'Three phase']] },
    ],
    run: function (v) {
      const K = v.mat === 'cu' ? 12.9 : 21.2, ft = v.len / 12;
      const vd = (v.ph === '1' ? 2 : Math.sqrt(3)) * K * v.amps * ft / CMIL[v.awg];
      const p = vd / v.volts * 100;
      if (vd >= v.volts) R.fail('That run would lose all the voltage. Use bigger wire or a shorter run.', 'len');
      return [
        { label: 'Voltage drop', value: R.fmt(p, 2) + '%', big: true, note: p <= 3 ? 'Within the 3% the NEC suggests for a branch circuit' : 'Over the 3% the NEC suggests for a branch circuit: consider bigger wire' },
        { label: 'Volts lost', value: R.fmt(vd, 2) + ' V' },
        { label: 'Volts at the end', value: R.fmt(v.volts - vd, 2) + ' V' },
      ];
    },
    examples: [
      { in: {}, out: { 'Voltage drop': '5.27%', 'Volts lost': '6.32 V', 'Volts at the end': '113.68 V' } },
      { in: { awg: '10' }, out: { 'Volts lost': '3.98 V' } },
    ],
  });

  R.calc({
    id: 'electricity-cost', face: 'science', name: 'Electricity cost', blurb: 'What an appliance costs to run',
    keywords: ['kwh', 'power bill', 'heater', 'appliance', 'electric', 'cost'],
    inputs: [
      POS('w', 'Watts', '1500'),
      { id: 'h', label: 'Hours a day', kind: 'number', value: '8', min: 0, max: 24 },
      { id: 'rate', label: 'Price per kWh', kind: 'money', value: '0.15', help: 'on your power bill' },
      { id: 'days', label: 'Days', kind: 'int', value: '30', min: 1, max: 36500 },
    ],
    run: function (v) {
      const kwh = v.w * v.h * v.days / 1000;
      return [
        { label: 'Cost', value: R.money(kwh * v.rate), big: true, note: 'Over ' + R.plural(v.days, 'day') },
        { label: 'Energy', value: R.fmt(kwh, 2) + ' kWh' },
        { label: 'Per day', value: R.money(kwh / v.days * v.rate) },
      ];
    },
    examples: [{ in: {}, out: { 'Cost': '$54.00', 'Energy': '360 kWh', 'Per day': '$1.80' } }],
  });

  R.calc({
    id: 'motor-amps', face: 'science', name: 'Motor amps', blurb: 'Estimated running amps from horsepower',
    keywords: ['motor', 'horsepower', 'amps', 'fla', 'pump', 'electrical'],
    inputs: [
      POS('hp', 'Horsepower', '5', { max: 10000 }),
      POS('v', 'Volts', '230', { max: 100000 }),
      { id: 'ph', label: 'Phase', kind: 'choice', value: '1', options: [['1', 'Single phase'], ['3', 'Three phase']] },
      { id: 'eff', label: 'Efficiency (%)', kind: 'percent', value: '85', min: 10, max: 100 },
      { id: 'pf', label: 'Power factor', kind: 'number', value: '0.85', min: 0.1, max: 1 },
    ],
    run: function (v) {
      const watts = v.hp * 745.6998715822702;
      const amps = watts / ((v.ph === '1' ? 1 : Math.sqrt(3)) * v.v * (v.eff / 100) * v.pf);
      return [
        { label: 'Estimated amps', value: R.fmt(amps, 1) + ' A', big: true, note: 'For wire and breaker sizing use the NEC motor tables (430.248 / 430.250) or the nameplate' },
        { label: 'Output power', value: R.fmt(watts / 1000, 2) + ' kW' },
      ];
    },
    examples: [
      { in: {}, out: { 'Estimated amps': '22.4 A', 'Output power': '3.73 kW' } },
      { in: { hp: '10', v: '460', ph: '3', eff: '90' }, out: { 'Estimated amps': '12.2 A' } },
    ],
  });

  const MASS = { id: 'mu', label: 'Mass in', kind: 'choice', value: 'kg', options: [['kg', 'Kilograms'], ['lb', 'Pounds']] };
  const mkg = function (v) { return v.mu === 'kg' ? v.m : v.m * KG; };
  R.calc({
    id: 'kinetic-energy', face: 'science', name: 'Kinetic energy', blurb: 'Energy of something moving',
    keywords: ['energy', 'motion', 'impact', 'joules', 'velocity'],
    inputs: [POS('m', 'Mass', '1000'), MASS, POS('s', 'Speed', '20'),
      { id: 'su', label: 'Speed in', kind: 'choice', value: 'ms', options: [['ms', 'Meters a second'], ['mph', 'Miles an hour'], ['kmh', 'Km an hour']] }],
    run: function (v) {
      const ms = v.su === 'ms' ? v.s : v.su === 'mph' ? v.s * 0.44704 : v.s / 3.6;
      const j = 0.5 * mkg(v) * ms * ms;
      return [
        { label: 'Kinetic energy', value: R.fmt(j / 1000, 3) + ' kJ', big: true },
        { label: 'Joules', value: R.fmt(j, 0) + ' J' },
        { label: 'Foot-pounds', value: R.fmt(j / 1.3558179483314004, 0) + ' ft·lbf' },
      ];
    },
    examples: [{ in: {}, out: { 'Kinetic energy': '200 kJ', 'Joules': '200,000 J', 'Foot-pounds': '147,512 ft·lbf' } }],
  });

  R.calc({
    id: 'acceleration', face: 'science', name: 'Speed & acceleration', blurb: 'Acceleration from a change in speed over time',
    keywords: ['acceleration', '0-60', 'g force', 'velocity'],
    inputs: [
      { id: 'a', label: 'Starting speed (mph)', kind: 'number', value: '0', max: 1e6 },
      { id: 'b', label: 'Ending speed (mph)', kind: 'number', value: '60', max: 1e6 },
      POS('t', 'Seconds', '6', { max: 1e6 }),
    ],
    run: function (v) {
      const a = (v.b - v.a) * 0.44704 / v.t;
      return [
        { label: 'Acceleration', value: R.fmt(a, 2) + ' m/s²', big: true },
        { label: 'In g', value: R.fmt(a / 9.80665, 3) + ' g' },
        { label: 'Feet per second²', value: R.fmt(a / 0.3048, 2) + ' ft/s²' },
        { label: 'Distance covered', value: R.fmt((v.a + v.b) / 2 * 0.44704 * v.t / 0.3048, 1) + ' ft' },
      ];
    },
    examples: [{ in: {}, out: { 'Acceleration': '4.47 m/s²', 'In g': '0.456 g', 'Feet per second²': '14.67 ft/s²', 'Distance covered': '264 ft' } }],
  });

  const HP_K = 33000 / (2 * Math.PI);   // 5252.11: torque (lb-ft) × rpm / this = horsepower
  R.calc({
    id: 'torque-hp', face: 'science', name: 'Torque & horsepower', blurb: 'Horsepower from torque and rpm, or torque from horsepower',
    keywords: ['torque', 'horsepower', 'rpm', 'lb-ft', 'engine', 'motor'],
    inputs: [
      { id: 'mode', label: 'I know', kind: 'choice', value: 'th', options: [['th', 'Torque and rpm'], ['ht', 'Horsepower and rpm']] },
      POS('tq', 'Torque (lb-ft)', '400', { when: function (r) { return r.mode === 'th'; } }),
      POS('hp', 'Horsepower', '300', { when: function (r) { return r.mode === 'ht'; } }),
      POS('rpm', 'RPM', '3000', { max: 1e6 }),
    ],
    run: function (v) {
      if (v.mode === 'th') { const hp = v.tq * v.rpm / HP_K; return [{ label: 'Horsepower', value: R.fmt(hp, 2) + ' hp', big: true }, { label: 'Kilowatts', value: R.fmt(hp * 0.7456998715822702, 2) + ' kW' }]; }
      const tq = v.hp * HP_K / v.rpm;
      return [{ label: 'Torque', value: R.fmt(tq, 2) + ' lb-ft', big: true }, { label: 'Newton-meters', value: R.fmt(tq * 1.3558179483314004, 2) + ' N·m' }];
    },
    examples: [
      { in: {}, out: { 'Horsepower': '228.48 hp' } },
      { in: { mode: 'ht', rpm: '5252.113' }, out: { 'Torque': '300 lb-ft' } },
    ],
  });

  R.calc({
    id: 'force', face: 'science', name: 'Force', blurb: 'Force from mass and acceleration (F = m × a)',
    keywords: ['newton', 'force', 'mass', 'weight', 'lbf'],
    inputs: [POS('m', 'Mass', '10'), MASS, { id: 'a', label: 'Acceleration (m/s²)', kind: 'number', value: '2', negative: true, min: -1e9, max: 1e9 }],
    run: function (v) {
      const f = mkg(v) * v.a;
      return [
        { label: 'Force', value: R.fmt(f, 3) + ' N', big: true },
        { label: 'Pound-force', value: R.fmt(f / 4.4482216152605, 3) + ' lbf' },
        { label: 'Its weight on Earth', value: R.fmt(mkg(v) * 9.80665, 2) + ' N' },
      ];
    },
    examples: [{ in: {}, out: { 'Force': '20 N', 'Pound-force': '4.496 lbf', 'Its weight on Earth': '98.07 N' } }],
  });

  const RGAS = 8.314462618;   // L·kPa / (mol·K)
  R.calc({
    id: 'ideal-gas', face: 'science', name: 'Ideal gas law', blurb: 'PV = nRT: solve for pressure, volume, moles or temperature',
    keywords: ['gas law', 'pv=nrt', 'pressure', 'volume', 'moles', 'temperature', 'chemistry'],
    inputs: [
      { id: 'find', label: 'Find', kind: 'choice', value: 'V', options: [['V', 'Volume'], ['P', 'Pressure'], ['n', 'Moles'], ['T', 'Temperature']] },
      POS('P', 'Pressure (kPa)', '101.325', { when: function (r) { return r.find !== 'P'; } }),
      POS('V', 'Volume (liters)', '10', { when: function (r) { return r.find !== 'V'; } }),
      POS('n', 'Amount (moles)', '1', { when: function (r) { return r.find !== 'n'; } }),
      { id: 'T', label: 'Temperature (°C)', kind: 'number', value: '0', negative: true, min: -273.15, max: 1e6, when: function (r) { return r.find !== 'T'; } },
    ],
    run: function (v) {
      const K = v.T != null ? v.T + 273.15 : null;
      if (K === 0) R.fail('Absolute zero has no gas to measure.', 'T');
      switch (v.find) {
        case 'V': return [{ label: 'Volume', value: R.fmt(v.n * RGAS * K / v.P, 3) + ' L', big: true }];
        case 'P': return [{ label: 'Pressure', value: R.fmt(v.n * RGAS * K / v.V, 2) + ' kPa', big: true }, { label: 'In atmospheres', value: R.fmt(v.n * RGAS * K / v.V / 101.325, 4) + ' atm' }];
        case 'n': return [{ label: 'Moles', value: R.fmt(v.P * v.V / (RGAS * K), 4) + ' mol', big: true }];
        default: { const t = v.P * v.V / (v.n * RGAS); return [{ label: 'Temperature', value: R.fmt(t - 273.15, 2) + ' °C', big: true }, { label: 'Kelvin', value: R.fmt(t, 2) + ' K' }]; }
      }
    },
    examples: [
      { in: {}, out: { 'Volume': '22.414 L' } },
      { in: { find: 'P', n: '2', V: '10', T: '25' }, out: { 'Pressure': '495.79 kPa' } },
    ],
  });

  R.calc({
    id: 'dilution', face: 'science', name: 'Dilution', blurb: 'How much concentrate and water to mix (C₁V₁ = C₂V₂)',
    keywords: ['mix', 'bleach', 'concentrate', 'solution', 'water', 'ratio', 'chemical'],
    inputs: [
      POS('c1', 'Concentrate strength', '8.25', { help: '% or any unit' }),
      POS('c2', 'Strength you want', '0.5', { help: 'same unit' }),
      POS('v2', 'Amount you want', '128'),
      { id: 'u', label: 'Amount unit', kind: 'choice', value: 'fl oz', options: [['fl oz', 'Fluid ounces'], ['gal', 'Gallons'], ['cups', 'Cups'], ['mL', 'Milliliters'], ['L', 'Liters']] },
    ],
    run: function (v) {
      if (v.c2 >= v.c1) R.fail('The strength you want must be weaker than the concentrate.', 'c2');
      const v1 = v.c2 * v.v2 / v.c1;
      return [
        { label: 'Concentrate', value: R.fmt(v1, 2) + ' ' + v.u, big: true },
        { label: 'Water', value: R.fmt(v.v2 - v1, 2) + ' ' + v.u },
        { label: 'Ratio', value: '1 part to ' + R.fmt((v.v2 - v1) / v1, 1) + ' parts water' },
      ];
    },
    examples: [
      { in: {}, out: { 'Concentrate': '7.76 fl oz', 'Water': '120.24 fl oz', 'Ratio': '1 part to 15.5 parts water' } },
      { in: { c2: '10' }, error: 'c2' },
    ],
  });

  const ATOMIC = { H: 1.008, He: 4.0026, Li: 6.94, Be: 9.0122, B: 10.81, C: 12.011, N: 14.007, O: 15.999, F: 18.998, Ne: 20.18, Na: 22.99, Mg: 24.305, Al: 26.982, Si: 28.085,
    P: 30.974, S: 32.06, Cl: 35.45, Ar: 39.948, K: 39.098, Ca: 40.078, Sc: 44.956, Ti: 47.867, V: 50.942, Cr: 51.996, Mn: 54.938, Fe: 55.845, Co: 58.933, Ni: 58.693,
    Cu: 63.546, Zn: 65.38, Ga: 69.723, Ge: 72.63, As: 74.922, Se: 78.971, Br: 79.904, Kr: 83.798, Rb: 85.468, Sr: 87.62, Ag: 107.87, Sn: 118.71, I: 126.9, Ba: 137.33,
    W: 183.84, Pt: 195.08, Au: 196.97, Hg: 200.59, Pb: 207.2, U: 238.03 };
  function formula(s) {
    const src = String(s).replace(/\s+/g, ''), stack = [{}];
    let i = 0;
    if (!src) R.fail('Formula is empty.', 'f');
    if (!/^[A-Za-z0-9()[\]]+$/.test(src)) R.fail('A formula uses element symbols, numbers and brackets, like Ca(OH)2.', 'f');
    const add = function (into, el, n) { into[el] = (into[el] || 0) + n; };
    const num = function () { const m = src.slice(i).match(/^\d+/); if (!m) return 1; i += m[0].length; if (+m[0] === 0) R.fail('A count of 0 isn’t allowed.', 'f'); return +m[0]; };
    while (i < src.length) {
      const c = src[i];
      if (c === '(' || c === '[') { stack.push({}); i++; continue; }
      if (c === ')' || c === ']') {
        if (stack.length < 2) R.fail('A closing bracket has no opening one.', 'f');
        i++; const n = num(), top = stack.pop();
        Object.keys(top).forEach(function (el) { add(stack[stack.length - 1], el, top[el] * n); });
        continue;
      }
      const m = src.slice(i).match(/^[A-Z][a-z]?/);
      if (!m) R.fail('Element symbols start with a capital letter: "' + src.slice(i, i + 3) + '"…', 'f');
      if (!ATOMIC[m[0]]) R.fail('Reckon doesn’t know the element "' + m[0] + '" (it knows the 48 most common).', 'f');
      i += m[0].length;
      add(stack[stack.length - 1], m[0], num());
    }
    if (stack.length !== 1) R.fail('A bracket is never closed.', 'f');
    return stack[0];
  }
  R.calc({
    id: 'molar-mass', face: 'science', name: 'Molar mass', blurb: 'Grams per mole of a chemical formula',
    keywords: ['molecular weight', 'molar mass', 'formula', 'chemistry', 'g/mol'],
    inputs: [{ id: 'f', label: 'Formula', kind: 'text', value: 'Ca(OH)2', help: 'like H2O or C6H12O6' }],
    run: function (v) {
      const atoms = formula(v.f);
      const total = Object.keys(atoms).reduce(function (s, el) { return s + ATOMIC[el] * atoms[el]; }, 0);
      return [{ label: 'Molar mass', value: R.fmt(total, 3) + ' g/mol', big: true }].concat(Object.keys(atoms).map(function (el) {
        return { label: el + ' × ' + atoms[el], value: R.fmt(ATOMIC[el] * atoms[el] / total * 100, 2) + '%', note: R.fmt(ATOMIC[el] * atoms[el], 3) + ' g/mol' };
      }));
    },
    examples: [
      { in: {}, out: { 'Molar mass': '74.092 g/mol' } },
      { in: { f: 'H2O' }, out: { 'Molar mass': '18.015 g/mol', 'H × 2': '11.19%' } },
      { in: { f: 'C6H12O6' }, out: { 'Molar mass': '180.156 g/mol' } },
      { in: { f: 'Xx2' }, error: 'f' },
      { in: { f: 'Ca(OH2' }, error: 'f' },
    ],
  });

  R.calc({
    id: 'battery-runtime', face: 'science', name: 'Battery runtime', blurb: 'How long a battery runs a load',
    keywords: ['battery', 'amp hours', 'ah', 'solar', 'inverter', 'off grid', 'backup', 'generator'],
    inputs: [
      POS('ah', 'Battery capacity (amp-hours)', '100', { max: 1e6 }),
      POS('v', 'Battery volts', '12', { max: 1000 }),
      POS('w', 'Load (watts)', '100', { max: 1e7 }),
      { id: 'use', label: 'Usable share', kind: 'choice', value: '50', options: [['50', 'Lead-acid / AGM (50%)'], ['80', 'Lithium LiFePO4 (80%)'], ['100', 'All of it (100%)']] },
      { id: 'inv', label: 'Through an inverter?', kind: 'choice', value: '90', options: [['90', 'Yes, AC load (90% efficient)'], ['100', 'No, DC load']] },
    ],
    run: function (v) {
      const wh = v.ah * v.v * Number(v.use) / 100 * Number(v.inv) / 100, h = wh / v.w;
      const m = Math.round(h * 60);
      return [
        { label: 'Runs for', value: Math.floor(m / 60) + ' h ' + (m % 60) + ' min', big: true, note: R.fmt(h, 2) + ' hours' },
        { label: 'Usable energy', value: R.fmt(wh, 0) + ' Wh' },
        { label: 'Draw from the battery', value: R.fmt(v.w / v.v / (Number(v.inv) / 100), 2) + ' A' },
      ];
    },
    examples: [
      { in: {}, out: { 'Runs for': '5 h 24 min', 'Usable energy': '540 Wh', 'Draw from the battery': '9.26 A' } },
      { in: { use: '80' }, out: { 'Runs for': '8 h 38 min' } },
    ],
  });
})(globalThis.Reckon = globalThis.Reckon || {});
