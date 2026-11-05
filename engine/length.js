/* Reckon engine: lengths. Reads what a person types on a job site (5' 7-3/8", 5ft 7in,
   67.375", 2.5 m, 30 cm) into inches, and writes inches back as feet-inch-fractions.
   Inches are the one unit everything is kept in. */
(function (R) {
  'use strict';

  const IN = { in: 1, ft: 12, yd: 36, mi: 63360, mm: 1 / 25.4, cm: 1 / 2.54, m: 1 / 0.0254 };
  const UNIT = {
    '"': 'in', in: 'in', inch: 'in', inches: 'in',
    yd: 'yd', yds: 'yd', yard: 'yd', yards: 'yd',
    mm: 'mm', millimeter: 'mm', millimeters: 'mm', millimetre: 'mm', millimetres: 'mm',
    cm: 'cm', centimeter: 'cm', centimeters: 'cm', centimetre: 'cm', centimetres: 'cm',
    m: 'm', meter: 'm', meters: 'm', metre: 'm', metres: 'm',
  };
  const MAX_IN = 1e8;   // about 1,578 miles: past this it isn't a measurement
  R.IN_PER = IN;

  function clean(s) {
    return String(s == null ? '' : s).trim().toLowerCase()
      .replace(/[′’‘`´]/g, "'")
      .replace(/[″“”]/g, '"')
      .replace(/''/g, '"')
      .replace(/⁄/g, '/')
      .replace(/[−–]/g, '-')
      .replace(/\s+/g, ' ');
  }

  /** "7", "7.5", ".5", "7 3/8", "7-3/8", "3/8" → number, or null when it isn't one. */
  function mixed(s) {
    s = s.trim();
    let m;
    if ((m = s.match(/^(\d+(?:\.\d+)?|\.\d+)$/))) return +m[1];
    if ((m = s.match(/^(\d+)(?: |\s*-\s*)(\d+)\s*\/\s*(\d+)$/))) return R._frac(+m[1], +m[2], +m[3]);
    if ((m = s.match(/^(\d+)\s*\/\s*(\d+)$/))) return R._frac(0, +m[1], +m[2]);
    if (/^\d*\.\d+(?: |\s*-\s*)\d+\s*\/\s*\d+$/.test(s)) R.fail('Use a decimal or a fraction, not both.');
    return null;
  }
  R.mixed = mixed;

  /**
   * A typed length → inches. defUnit is used when nothing says which unit
   * ("12" in a field measured in feet is 12 feet). Throws InputError in plain words.
   */
  function parseLength(input, defUnit, label) {
    defUnit = defUnit || 'in';
    const what = label || 'Length';
    let s = clean(input);
    if (!s) R.fail(what + ' is empty. Type a length, like 5\' 7-3/8".');
    let sign = 1;
    if (s[0] === '-') { sign = -1; s = s.slice(1).trim(); }
    if (!s) R.fail(what + ' is empty. Type a length, like 5\' 7-3/8".');
    let inches;
    const fm = s.match(/^(.*?)\s*(?:'|feet|foot|ft)(?![a-z])\s*(.*)$/);
    if (fm) {
      const fv = mixed(fm[1]);
      if (fv == null) R.fail(what + ': I can\'t read "' + (fm[1] || 'nothing') + '" as feet.');
      const rest = fm[2].replace(/^-\s*/, '').trim();
      let iv = 0;
      if (rest) {
        const im = rest.match(/^(.*?)\s*(?:"|inches|inch|in)?$/);
        iv = im ? mixed(im[1]) : null;
        if (iv == null) R.fail(what + ': I can\'t read "' + rest + '" as inches.');
      }
      inches = fv * 12 + iv;
    } else {
      const um = s.match(/^(.*?)\s*("|inches|inch|in|yards|yard|yds|yd|millimeters|millimetres|millimeter|millimetre|mm|centimeters|centimetres|centimeter|centimetre|cm|meters|metres|meter|metre|m)?$/);
      const v = um ? mixed(um[1]) : null;
      if (v == null) R.fail(what + ': "' + String(input).trim() + '" isn\'t a length I can read. Try 5\' 7-3/8" or 2.5 m.');
      const unit = um[2] ? UNIT[um[2]] : defUnit;
      if (!IN[unit]) R.fail(what + ': unknown unit.');
      inches = v * IN[unit];
    }
    inches *= sign;
    if (!Number.isFinite(inches)) R.fail(what + " isn't a length I can read.");
    if (Math.abs(inches) > MAX_IN) R.fail(what + ' is too big to be a real measurement.');
    return inches;
  }

  /** Inches → whole feet, whole inches and a reduced fraction, rounded to 1/den. */
  function splitFtIn(inches, den) {
    den = den || 16;
    const neg = inches < 0;
    const n = Math.round(Math.abs(inches) * den + 1e-9);
    const exact = Math.abs(n / den - Math.abs(inches)) < 1e-7;
    const ft = Math.floor(n / (12 * den));
    const rem = n - ft * 12 * den;
    const whole = Math.floor(rem / den);
    let num = rem - whole * den, d = den;
    if (num) { const g = R.gcd(num, d); num /= g; d /= g; }
    return { neg: neg && n > 0, ft: ft, whole: whole, num: num, den: d, exact: exact };
  }

  function inchText(whole, num, den) {
    const fr = num ? num + '/' + den : '';
    if (!fr) return whole + '"';
    return (whole ? whole + '-' : '') + fr + '"';
  }

  /** 67.375 → 5' 7-3/8"   (opts.inchOnly → 67-3/8") */
  function formatFtIn(inches, den, opts) {
    opts = opts || {};
    const p = splitFtIn(inches, den);
    const sign = p.neg ? '−' : '';
    if (opts.inchOnly) return sign + inchText(p.ft * 12 + p.whole, p.num, p.den);
    if (!p.ft) return sign + inchText(p.whole, p.num, p.den);
    return sign + p.ft + "' " + inchText(p.whole, p.num, p.den);
  }

  /** Every way a length is read on site, for the conversion strip. */
  function lengthViews(inches, den) {
    return [
      ['ft-in', formatFtIn(inches, den)],
      ['inches', formatFtIn(inches, den, { inchOnly: true })],
      ['in', R.fmt(inches, 4) + ' in'],
      ['ft', R.fmt(inches / 12, 4) + ' ft'],
      ['yd', R.fmt(inches / 36, 4) + ' yd'],
      ['m', R.fmt(inches * 0.0254, 4) + ' m'],
      ['cm', R.fmt(inches * 2.54, 2) + ' cm'],
      ['mm', R.fmt(inches * 25.4, 1) + ' mm'],
    ];
  }

  R.parseLength = parseLength;
  R.splitFtIn = splitFtIn;
  R.formatFtIn = formatFtIn;
  R.lengthViews = lengthViews;
  R.isExact = function (inches, den) { return splitFtIn(inches, den).exact; };
})(globalThis.Reckon = globalThis.Reckon || {});
