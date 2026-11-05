/* Reckon engine: shared helpers (numbers, money, plain-words errors).
   A plain script, no build step: it hangs everything on globalThis.Reckon so the
   app, the previews and the Node tests all load the same file. */
(function (R) {
  'use strict';

  /** An error caused by what someone typed. Its message is shown to them as is. */
  class InputError extends Error {
    constructor(msg, field) { super(msg); this.name = 'InputError'; this.field = field || null; }
  }
  R.InputError = InputError;
  R.fail = function (msg, field) { throw new InputError(msg, field); };

  R.gcd = function (a, b) {
    a = Math.abs(a); b = Math.abs(b);
    while (b) { const t = a % b; a = b; b = t; }
    return a;
  };

  /** A number for reading: commas, up to dp decimals, no trailing zeros, never "-0". */
  R.fmt = function (x, dp) {
    if (dp == null) dp = 4;
    if (typeof x !== 'number' || !Number.isFinite(x)) return '—';
    const ax = Math.abs(x);
    if (ax !== 0 && (ax >= 1e15 || ax < Math.pow(10, -Math.max(dp, 6)))) {
      return x.toExponential(Math.min(Math.max(dp, 2), 6)).replace(/\.?0+e/, 'e').replace('-', '−');
    }
    let s = x.toLocaleString('en-US', { maximumFractionDigits: dp, minimumFractionDigits: 0 });
    if (/^-0(\.0+)?$/.test(s)) s = '0';
    return s.replace('-', '−');
  };

  /** Dollars and cents: $1,234.50, −$5.00 */
  R.money = function (x) {
    if (typeof x !== 'number' || !Number.isFinite(x)) return '—';
    const r = Math.round(x * 100) / 100;
    const s = Math.abs(r).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (r < 0 ? '−$' : '$') + s;
  };

  /** Round to dp decimals (for tests and stored answers). */
  R.round = function (x, dp) {
    const f = Math.pow(10, dp == null ? 4 : dp);
    return Math.round((x + Number.EPSILON * Math.sign(x)) * f) / f;
  };

  /**
   * Read a typed number: "1,234.5", "$1,234", "12%", "3/4", "1 1/2", "-2", "1e3".
   * opts: { label, min, max, integer, allowNegative, allowZero }
   * Throws InputError in plain words when it can't.
   */
  R.parseNum = function (input, opts) {
    opts = opts || {};
    const label = opts.label || 'This';
    let s = String(input == null ? '' : input).trim().replace(/[−–]/g, '-');
    if (!s) R.fail(label + ' is empty. Type a number.');
    s = s.replace(/^\$\s*/, '').replace(/^-\s*\$\s*/, '-').replace(/(\d),(?=\d{3}\b)/g, '$1').replace(/\s*%$/, '').trim();
    let neg = false;
    if (s[0] === '-') { neg = true; s = s.slice(1).trim(); }
    if (s[0] === '$') s = s.slice(1).trim();
    let v = null, m;
    if ((m = s.match(/^(\d+(?:\.\d+)?|\.\d+)(?:e([+-]?\d+))?$/i))) v = parseFloat(m[1] + (m[2] ? 'e' + m[2] : ''));
    else if ((m = s.match(/^(\d+)(?:\s+|\s*-\s*)(\d+)\s*\/\s*(\d+)$/))) v = frac(+m[1], +m[2], +m[3], label);
    else if ((m = s.match(/^(\d+)\s*\/\s*(\d+)$/))) v = frac(0, +m[1], +m[2], label);
    if (v == null || !Number.isFinite(v)) R.fail(label + ': "' + String(input).trim() + '" isn\'t a number I can read.');
    if (neg) v = -v;
    if (v < 0 && !opts.allowNegative) R.fail(label + " can't be negative.");
    if (v === 0 && opts.allowZero === false) R.fail(label + ' must be more than 0.');
    if (opts.integer && !Number.isInteger(v)) R.fail(label + ' must be a whole number.');
    if (opts.min != null && v < opts.min) R.fail(label + ' must be at least ' + R.fmt(opts.min, 6) + '.');
    if (opts.max != null && v > opts.max) R.fail(label + ' must be ' + R.fmt(opts.max, 6) + ' or less.');
    return v;
  };

  function frac(w, n, d, label) {
    if (d === 0) R.fail((label || 'A fraction') + ": a fraction can't have 0 on the bottom.");
    return w + n / d;
  }
  R._frac = frac;
})(globalThis.Reckon = globalThis.Reckon || {});
