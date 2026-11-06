/* Reckon engine: quick keys for the Calc pad. A quick key works on the number showing: type 72,
   tap °F→°C, and the pad reads 22.22 with "°C" beside it and "72 °F → 22.22 °C" on the tape.
   A key that needs more than one number opens its calculator instead (tool keys, in app.js).
   Each key is data: from and to units, run(x), the limits it accepts, and worked examples the tests check. */
(function (R) {
  'use strict';
  R.QUICK = [];
  const BY_ID = Object.create(null);

  /** Register a quick key. Refuses a malformed one loudly, so a typo never ships quietly. */
  R.quickKey = function (def) {
    const bad = function (m) { throw new Error('Quick key "' + (def && def.id) + '": ' + m); };
    if (!def || !/^[a-z0-9-]+$/.test(def.id || '')) bad('needs an id of lowercase letters, digits and dashes');
    if (BY_ID[def.id]) bad('id is used twice');
    if (!def.key || !def.name) bad('needs a key label and a name');
    if (typeof def.run !== 'function') bad('needs run()');
    if (!Array.isArray(def.examples) || !def.examples.length) bad('needs at least one worked example (the tests check it)');
    R.QUICK.push(def);
    BY_ID[def.id] = def;
    return def;
  };
  R.getQuick = function (id) { return typeof id === 'string' && BY_ID[id] ? BY_ID[id] : null; };

  /**
   * Apply a quick key to x. → { v, line, unit, note } or throws InputError in plain words.
   * line is what goes on the tape: "72 °F → 22.22 °C".
   */
  R.applyQuick = function (id, x) {
    const def = R.getQuick(id);
    if (!def) R.fail('That key isn’t known.');
    if (typeof x !== 'number' || !Number.isFinite(x)) R.fail(def.name + ': type a number first.');
    const slack = function (lim) { return 1e-12 * Math.max(1, Math.abs(lim)); };   // a limit reached by flipping back lands within rounding of it
    if (def.min != null && x < def.min - slack(def.min)) R.fail(def.name + ': ' + (def.minMsg || 'the number must be at least ' + R.fmtCalc(def.min) + '.'));
    if (def.max != null && x > def.max + slack(def.max)) R.fail(def.name + ': ' + (def.maxMsg || 'the number must be at most ' + R.fmtCalc(def.max) + '.'));
    if (def.positive && !(x > 0)) R.fail(def.name + ': the number must be more than 0.');
    const v = def.run(x);
    if (typeof v !== 'number' || !Number.isFinite(v)) R.fail(def.name + ': that number is too big or too small to work out.');
    const unit = def.to || '';
    let note = typeof def.note === 'function' ? String(def.note(v, x)) : '';
    if (/NaN|Infinity|undefined|\de[+−-]?\d/.test(note)) note = '';   // a hint is for everyday sizes: past them it's left off, never shown broken
    const shown = R.fmtCalc(Number(v.toPrecision(6)));   // 6 significant digits on screen; the full value stays for Ans
    const line = R.fmtCalc(x) + (def.from ? ' ' + def.from : '') + ' → ' + shown + (unit ? ' ' + unit : '');
    return { v: v, shown: shown, line: line, unit: unit, note: note || '' };
  };
})(globalThis.Reckon = globalThis.Reckon || {});
