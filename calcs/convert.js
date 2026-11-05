/* Reckon: the Convert face. Every factor is an exact definition (NIST / international agreements)
   or a stated convention, converting through one base unit per kind. */
(function (R) {
  'use strict';

  /** A number to 6 significant figures, with commas. */
  R.sig = function (x, n) {
    n = n || 6;
    if (typeof x !== 'number' || !Number.isFinite(x)) return '—';
    if (x === 0) return '0';
    const p = Number(x.toPrecision(n)), ax = Math.abs(p);
    if (ax >= 1e15 || ax < 1e-9) return p.toExponential(n - 1).replace(/\.?0+e/, 'e').replace('-', '−');
    return R.fmt(p, 12);
  };

  const KINDS = [
    { id: 'length', name: 'Length', base: 'm', from: 'ft', to: 'm', value: '1', units: [
      ['in', 'inches', 0.0254], ['ft', 'feet', 0.3048], ['yd', 'yards', 0.9144], ['mi', 'miles', 1609.344], ['mm', 'millimeters', 0.001],
      ['cm', 'centimeters', 0.01], ['m', 'meters', 1], ['km', 'kilometers', 1000], ['nmi', 'nautical miles', 1852]],
      ex: [['1', 'ft', 'm', '0.3048 meters'], ['1', 'mi', 'km', '1.60934 kilometers']] },
    { id: 'area', name: 'Area', from: 'acre', to: 'ft2', value: '1', units: [
      ['in2', 'square inches', 0.00064516], ['ft2', 'square feet', 0.09290304], ['yd2', 'square yards', 0.83612736], ['acre', 'acres', 4046.8564224],
      ['mi2', 'square miles', 2589988.110336], ['cm2', 'square cm', 0.0001], ['m2', 'square meters', 1], ['ha', 'hectares', 10000], ['km2', 'square km', 1e6]],
      ex: [['1', 'acre', 'ft2', '43,560 square feet']] },
    { id: 'volume', name: 'Volume', from: 'gal', to: 'l', value: '1', units: [
      ['in3', 'cubic inches', 0.016387064], ['ft3', 'cubic feet', 28.316846592], ['yd3', 'cubic yards', 764.554857984], ['floz', 'US fluid ounces', 0.0295735295625],
      ['qt', 'US quarts', 0.946352946], ['gal', 'US gallons', 3.785411784], ['igal', 'imperial gallons', 4.54609], ['bbl', 'barrels (oil, 42 gal)', 158.987294928],
      ['ml', 'milliliters', 0.001], ['l', 'liters', 1], ['m3', 'cubic meters', 1000]],
      ex: [['1', 'gal', 'l', '3.78541 liters'], ['1', 'yd3', 'ft3', '27 cubic feet']] },
    { id: 'weight', name: 'Weight', from: 'lb', to: 'g', value: '1', units: [
      ['oz', 'ounces', 0.028349523125], ['lb', 'pounds', 0.45359237], ['st', 'stone', 6.35029318], ['ton', 'US tons', 907.18474], ['lton', 'long tons', 1016.0469088],
      ['mg', 'milligrams', 1e-6], ['g', 'grams', 0.001], ['kg', 'kilograms', 1], ['t', 'metric tonnes', 1000]],
      ex: [['1', 'lb', 'g', '453.592 grams'], ['1', 'ton', 'lb', '2,000 pounds']] },
    { id: 'temperature', name: 'Temperature', from: 'f', to: 'c', value: '100', negative: true, units: [['f', '°F'], ['c', '°C'], ['k', 'kelvin']],
      ex: [['100', 'f', 'c', '37.7778 °C'], ['-40', 'c', 'f', '−40 °F'], ['0', 'c', 'k', '273.15 kelvin']] },
    { id: 'speed', name: 'Speed', from: 'mph', to: 'kmh', value: '60', units: [
      ['mph', 'miles an hour', 0.44704], ['kmh', 'km an hour', 1 / 3.6], ['ms', 'meters a second', 1], ['fts', 'feet a second', 0.3048], ['kn', 'knots', 1852 / 3600]],
      ex: [['60', 'mph', 'kmh', '96.5606 km an hour'], ['60', 'mph', 'fts', '88 feet a second']] },
    { id: 'pressure', name: 'Pressure', from: 'psi', to: 'bar', value: '30', units: [
      ['psi', 'psi', 6894.757293168361], ['bar', 'bar', 1e5], ['kpa', 'kPa', 1000], ['pa', 'pascals', 1], ['atm', 'atmospheres', 101325],
      ['inhg', 'inches of mercury', 3386.389], ['mmhg', 'mm of mercury', 133.322387415], ['inh2o', 'inches of water', 249.08891]],
      ex: [['30', 'psi', 'bar', '2.06843 bar'], ['1', 'atm', 'psi', '14.6959 psi']] },
    { id: 'energy', name: 'Energy', from: 'kwh', to: 'btu', value: '1', units: [
      ['btu', 'BTU', 1055.05585262], ['therm', 'therms', 105505585.262], ['kwh', 'kWh', 3.6e6], ['wh', 'Wh', 3600], ['j', 'joules', 1], ['kj', 'kilojoules', 1000],
      ['cal', 'calories', 4.184], ['kcal', 'food Calories (kcal)', 4184], ['ftlb', 'foot-pounds', 1.3558179483314004]],
      ex: [['1', 'kwh', 'btu', '3,412.14 BTU']] },
    { id: 'power', name: 'Power', from: 'hp', to: 'w', value: '1', units: [
      ['w', 'watts', 1], ['kw', 'kilowatts', 1000], ['hp', 'horsepower', 745.6998715822702], ['btuh', 'BTU an hour', 0.2930710701722222], ['tonr', 'tons of cooling', 3516.852842066666]],
      ex: [['1', 'hp', 'w', '745.7 watts'], ['1', 'tonr', 'btuh', '12,000 BTU an hour']] },
    { id: 'data', name: 'Data', from: 'gib', to: 'gb', value: '1', units: [
      ['bit', 'bits', 0.125], ['b', 'bytes', 1], ['kb', 'KB', 1e3], ['mb', 'MB', 1e6], ['gb', 'GB', 1e9], ['tb', 'TB', 1e12],
      ['kib', 'KiB', 1024], ['mib', 'MiB', 1048576], ['gib', 'GiB', 1073741824], ['tib', 'TiB', 1099511627776]],
      ex: [['1', 'gib', 'gb', '1.07374 GB']] },
    { id: 'angle', name: 'Angle', from: 'turn', to: 'deg', value: '1', negative: true, units: [
      ['deg', 'degrees', 1], ['rad', 'radians', 180 / Math.PI], ['grad', 'gradians', 0.9], ['arcmin', 'minutes of arc', 1 / 60], ['arcsec', 'seconds of arc', 1 / 3600], ['turn', 'turns', 360]],
      ex: [['1', 'turn', 'deg', '360 degrees'], ['1', 'rad', 'deg', '57.2958 degrees']] },
    { id: 'fuel', name: 'Fuel economy', from: 'mpg', to: 'l100', value: '30', units: [['mpg', 'mpg (US)'], ['mpgi', 'mpg (imperial)'], ['kml', 'km per liter'], ['l100', 'liters per 100 km']],
      ex: [['30', 'mpg', 'l100', '7.84049 liters per 100 km'], ['10', 'l100', 'mpg', '23.5215 mpg (US)']] },
    { id: 'flow', name: 'Flow', from: 'cfm', to: 'ls', value: '1', units: [
      ['gpm', 'gallons a minute', 3.785411784 / 60], ['gph', 'gallons an hour', 3.785411784 / 3600], ['cfm', 'cubic feet a minute', 28.316846592 / 60],
      ['ls', 'liters a second', 1], ['lmin', 'liters a minute', 1 / 60], ['m3h', 'cubic meters an hour', 1000 / 3600]],
      ex: [['1', 'cfm', 'ls', '0.471947 liters a second'], ['1', 'cfm', 'gpm', '7.48052 gallons a minute']] },
    { id: 'time-units', name: 'Time units', from: 'day', to: 'min', value: '1', units: [
      ['s', 'seconds', 1], ['min', 'minutes', 60], ['h', 'hours', 3600], ['day', 'days', 86400], ['wk', 'weeks', 604800], ['mo', 'months (average)', 2629746], ['yr', 'years (average)', 31556952]],
      ex: [['1', 'day', 'min', '1,440 minutes'], ['1', 'wk', 'h', '168 hours']] },
    { id: 'cooking', name: 'Cooking', from: 'cup', to: 'tbsp', value: '1', units: [
      ['tsp', 'teaspoons', 0.00492892159375], ['tbsp', 'tablespoons', 0.01478676478125], ['floz', 'fluid ounces', 0.0295735295625], ['cup', 'cups', 0.2365882365],
      ['pt', 'pints', 0.473176473], ['qt', 'quarts', 0.946352946], ['gal', 'gallons', 3.785411784], ['ml', 'milliliters', 0.001], ['l', 'liters', 1]],
      ex: [['1', 'cup', 'tbsp', '16 tablespoons'], ['1', 'tbsp', 'tsp', '3 teaspoons']] },
  ];

  function toBase(kind, x, u) {
    if (kind.id === 'temperature') {
      const k = u === 'f' ? (x - 32) * 5 / 9 + 273.15 : u === 'c' ? x + 273.15 : x;
      if (k < -1e-9) R.fail("That's colder than absolute zero.", 'x');
      return k;
    }
    if (kind.id === 'fuel') {
      if (x === 0) R.fail('Fuel economy can’t be zero.', 'x');
      return u === 'mpg' ? x * 0.425143707 : u === 'mpgi' ? x * 0.354006189 : u === 'kml' ? x : 100 / x;
    }
    return x * kind.units.find(function (z) { return z[0] === u; })[2];
  }
  function fromBase(kind, b, u) {
    if (kind.id === 'temperature') return u === 'f' ? (b - 273.15) * 9 / 5 + 32 : u === 'c' ? b - 273.15 : b;
    if (kind.id === 'fuel') return u === 'mpg' ? b / 0.425143707 : u === 'mpgi' ? b / 0.354006189 : u === 'kml' ? b : 100 / b;
    return b / kind.units.find(function (z) { return z[0] === u; })[2];
  }
  R.convertUnits = function (kindId, x, from, to) {
    const kind = KINDS.find(function (k) { return k.id === kindId; });
    return fromBase(kind, toBase(kind, x, from), to);
  };

  KINDS.forEach(function (kind) {
    const opts = kind.units.map(function (u) { return [u[0], u[1]]; });
    const name = function (u) { return kind.units.find(function (z) { return z[0] === u; })[1]; };
    R.calc({
      id: 'convert-' + kind.id, face: 'convert', name: kind.name, blurb: kind.units.map(function (u) { return u[1]; }).slice(0, 5).join(', ') + '…',
      keywords: kind.units.map(function (u) { return u[0] + ' ' + u[1]; }).concat(['convert', 'conversion']),
      inputs: [
        { id: 'x', label: 'Amount', kind: 'number', value: kind.value, negative: !!kind.negative, max: 1e15, min: kind.negative ? -1e15 : 0 },
        { id: 'from', label: 'From', kind: 'choice', value: kind.from, options: opts },
        { id: 'to', label: 'To', kind: 'choice', value: kind.to, options: opts },
      ],
      run: function (v) {
        const b = toBase(kind, v.x, v.from);
        const out = [{ label: 'Answer', value: R.sig(fromBase(kind, b, v.to)) + ' ' + name(v.to), big: true, note: R.sig(v.x) + ' ' + name(v.from) + ' is this much' }];
        kind.units.forEach(function (u) {
          if (u[0] !== v.to && u[0] !== v.from) out.push({ label: u[1], value: R.sig(fromBase(kind, b, u[0])) });
        });
        return out;
      },
      examples: kind.ex.map(function (e) {
        return { in: { x: e[0], from: e[1], to: e[2] }, out: { Answer: e[3] } };
      }).concat(kind.negative ? [] : [{ in: { x: '-1' }, error: 'x' }]),
    });
  });
  R.CONVERT_KINDS = KINDS;
})(globalThis.Reckon = globalThis.Reckon || {});
