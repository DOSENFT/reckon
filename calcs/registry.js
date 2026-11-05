/* Reckon: the faces and the calculator registry.
   A calculator is data: its inputs (each with a kind that knows how to read it),
   a run() that turns read values into answers, and worked examples the tests check. */
(function (R) {
  'use strict';

  R.FACES = [
    { id: 'job', name: 'Job site', short: 'Job', icon: 'ruler', blurb: 'Feet-inch math, rafters, stairs, concrete, framing' },
    { id: 'calc', name: 'Calculator', short: 'Calc', icon: 'calc', blurb: 'Everyday and scientific math with a tape' },
    { id: 'money', name: 'Money', short: 'Money', icon: 'money', blurb: 'Loans, interest, tax, tips, pay' },
    { id: 'time', name: 'Time & date', short: 'Time', icon: 'clock', blurb: 'Time cards, dates, durations, age' },
    { id: 'travel', name: 'Travel', short: 'Travel', icon: 'car', blurb: 'Fuel, mileage, speed, distance' },
    { id: 'convert', name: 'Convert', short: 'Convert', icon: 'swap', blurb: 'Every unit, both ways' },
    { id: 'health', name: 'Health', short: 'Health', icon: 'heart', blurb: 'BMI, calories, heart rate, due date' },
    { id: 'math', name: 'Math', short: 'Math', icon: 'sigma', blurb: 'Percent, fractions, statistics, algebra' },
    { id: 'science', name: 'Science', short: 'Science', icon: 'bolt', blurb: 'Electrical, physics, chemistry' },
    { id: 'life', name: 'Everyday', short: 'Life', icon: 'home', blurb: 'Pets, school, kitchen, shipping' },
  ];
  const FACE_IDS = R.FACES.map(function (f) { return f.id; });

  const KINDS = ['length', 'number', 'int', 'percent', 'money', 'choice', 'date', 'time', 'list', 'text'];
  R.CALCS = [];
  const BY_ID = Object.create(null);   // no inherited names: a link to #/c/constructor finds nothing

  /** Register a calculator. Refuses a malformed one loudly, so a typo never ships quietly. */
  R.calc = function (def) {
    const bad = function (m) { throw new Error('Calculator "' + (def && def.id) + '": ' + m); };
    if (!def || !/^[a-z0-9-]+$/.test(def.id || '')) bad('needs an id of lowercase letters, digits and dashes');
    if (BY_ID[def.id]) bad('id is used twice');
    if (FACE_IDS.indexOf(def.face) < 0) bad('unknown face ' + def.face);
    if (!def.name || !def.blurb) bad('needs a name and a blurb');
    if (!Array.isArray(def.inputs) || typeof def.run !== 'function') bad('needs inputs and run()');
    const seen = {};
    def.inputs.forEach(function (i) {
      if (!i.id || seen[i.id]) bad('input ids must be present and different');
      seen[i.id] = true;
      if (KINDS.indexOf(i.kind) < 0) bad('input ' + i.id + ' has unknown kind ' + i.kind);
      if (i.kind === 'choice' && !(Array.isArray(i.options) && i.options.length)) bad('choice ' + i.id + ' needs options');
      if (!i.label) bad('input ' + i.id + ' needs a label');
    });
    if (!Array.isArray(def.examples) || !def.examples.length) bad('needs at least one worked example (the tests check it)');
    R.CALCS.push(def);
    BY_ID[def.id] = def;
    return def;
  };
  R.getCalc = function (id) { return typeof id === 'string' && BY_ID[id] ? BY_ID[id] : null; };
  R.calcsFor = function (face) { return R.CALCS.filter(function (c) { return c.face === face; }); };

  function dateOf(s, label) {
    const m = String(s).match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!m) R.fail(label + ': use a date like 2026-11-05.');
    const y = +m[1], mo = +m[2], d = +m[3];
    const t = Date.UTC(y, mo - 1, d);
    const back = new Date(t);
    if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) R.fail(label + ": that date doesn't exist.");
    if (y < 1 || y > 9999) R.fail(label + ': the year must be between 1 and 9999.');
    return t;
  }
  R.dateOf = dateOf;

  function timeOf(s, label) {
    let t = String(s).trim().toLowerCase().replace(/\s+/g, '').replace(/\.(?=\d{2})/, ':').replace(/^(\d{3,4})(hours|hrs|h)?$/, function (_, d) { return d.slice(0, -2) + ':' + d.slice(-2); });
    let m = t.match(/^(\d{1,2})(?::(\d{2}))?(am|pm|a|p)?$/);
    if (!m) R.fail(label + ': use a time like 7:30 or 7:30pm.');
    let h = +m[1]; const mi = m[2] ? +m[2] : 0; const ap = m[3];
    if (mi > 59) R.fail(label + ': minutes go up to 59.');
    if (ap) {
      if (h < 1 || h > 12) R.fail(label + ': with am/pm, hours are 1 to 12.');
      if (ap[0] === 'a') h = h === 12 ? 0 : h; else h = h === 12 ? 12 : h + 12;
    } else if (h > 24 || (h === 24 && mi > 0)) R.fail(label + ': hours go up to 24.');
    return h * 60 + mi;
  }
  R.timeOf = timeOf;

  /** Read one input's typed text into its value. Throws InputError naming the field. */
  R.readInput = function (inp, raw) {
    const s = raw == null ? '' : String(raw).trim();
    const label = inp.label;
    try {
      if (s === '') {
        if (inp.optional) return null;
        R.fail(label + ' is empty.');
      }
      const o = { label: label, min: inp.min, max: inp.max, allowNegative: !!inp.negative, allowZero: inp.zero !== false };
      switch (inp.kind) {
        case 'length': {
          const v = R.parseLength(s, inp.unit || 'in', label);
          if (v < 0 && !inp.negative) R.fail(label + " can't be negative.");
          if (v === 0 && inp.zero === false) R.fail(label + ' must be more than 0.');
          return v;
        }
        case 'number': return R.parseNum(s, o);
        case 'int': o.integer = true; return R.parseNum(s, o);
        case 'percent': if (o.max == null) o.max = 1000; return R.parseNum(s, o);
        case 'money': if (o.max == null) o.max = 1e12; return R.parseNum(s, o);
        case 'choice': {
          const ok = inp.options.some(function (p) { return String(p[0]) === s; });
          if (!ok) R.fail(label + ': pick one of the choices.');
          return s;
        }
        case 'date': return dateOf(s, label);
        case 'time': return timeOf(s, label);
        case 'list': {
          const parts = s.split(/[\s,;]+/).filter(Boolean);
          if (!parts.length) R.fail(label + ' is empty.');
          if (parts.length > 5000) R.fail(label + ': up to 5,000 numbers.');
          return parts.map(function (p, i) { return R.parseNum(p, { label: label + ' (number ' + (i + 1) + ')', allowNegative: inp.negative !== false }); });
        }
        case 'text': {
          if (s.length > (inp.maxLength || 200)) R.fail(label + ' is too long.');
          return s;
        }
      }
      return R.fail('Unknown input kind.');
    } catch (e) {
      if (e instanceof R.InputError) e.field = inp.id;
      throw e;
    }
  };

  /** Is this input shown, given the other raw values? (inputs can depend on a choice) */
  R.inputShown = function (inp, raws) {
    return !inp.when || !!inp.when(raws || {});
  };

  /**
   * Run a calculator on raw typed values (missing ones fall back to the input's example value).
   * → { ok: true, out: [{label, value, big, note}] } or { ok: false, errors: [{field, msg}] }
   */
  R.runCalc = function (def, raws) {
    raws = raws || {};
    const full = {};
    def.inputs.forEach(function (i) { full[i.id] = raws[i.id] != null ? raws[i.id] : (i.value != null ? i.value : ''); });
    const v = {}, errors = [];
    def.inputs.forEach(function (inp) {
      if (!R.inputShown(inp, full)) { v[inp.id] = null; return; }
      try { v[inp.id] = R.readInput(inp, full[inp.id]); }
      catch (e) { if (e instanceof R.InputError) errors.push({ field: inp.id, msg: e.message }); else throw e; }
    });
    if (errors.length) return { ok: false, errors: errors };
    try {
      const out = (def.run(v) || []).filter(Boolean).map(function (o) {
        return { label: o.label, value: String(o.value), big: !!o.big, note: o.note || '' };
      });
      // The number formatters turn a result too big, too small or impossible into "—", so that's caught here too:
      // he gets a reason, never a blank answer.
      for (const o of out) {
        if (/—|NaN|Infinity|undefined|null/.test(o.value)) {
          R.fail(o.label + " can't be worked out from those numbers: they're too big, too small or impossible. Check them.");
        }
      }
      if (!out.length) R.fail('No answer for those numbers.');
      return { ok: true, out: out };
    } catch (e) {
      if (e instanceof R.InputError) return { ok: false, errors: [{ field: e.field, msg: e.message }] };
      throw e;
    }
  };

  /** Search every calculator by name, blurb, face and keywords. */
  R.searchCalcs = function (text) {
    const words = String(text || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    const scored = [];
    R.CALCS.forEach(function (c) {
      const face = R.FACES.find(function (f) { return f.id === c.face; });
      const name = c.name.toLowerCase();
      const hay = [name, c.blurb, face ? face.name : '', (c.keywords || []).join(' ')].join(' ').toLowerCase();
      let score = 0;
      for (const w of words) {
        if (hay.indexOf(w) < 0) return;
        score += name.indexOf(w) === 0 ? 3 : name.indexOf(w) >= 0 ? 2 : 1;
      }
      scored.push([score, c]);
    });
    scored.sort(function (a, b) { return b[0] - a[0] || a[1].name.localeCompare(b[1].name); });
    return scored.map(function (s) { return s[1]; });
  };
})(globalThis.Reckon = globalThis.Reckon || {});
