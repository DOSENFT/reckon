/* Reckon engine: the job-site keypad. Taps in, answers out.
   Typing works the way a contractor's calculator does: 5 [Feet] 7 [Inch] 3 [/] 8 is 5' 7-3/8".
   Every value carries what it is (a number, a length, an area or a volume), so
   length × length is an area, and a length can never be added to an area by mistake.
   Math runs left to right like a tape calculator; each finished line goes on the tape.
   Rise / Run / Diag / Pitch: type a value then tap the key to store it; tap a key with
   nothing typed to work it out from the last two stored. */
(function (R) {
  'use strict';

  const DIM = ['number', 'length', 'area', 'volume'];
  const DENS = [2, 4, 8, 16, 32, 64];
  const SLOTS = ['rise', 'run', 'diag', 'pitch'];
  const SLOT_NAME = { rise: 'Rise', run: 'Run', diag: 'Diag', pitch: 'Pitch' };
  const OPS = { add: '+', sub: '−', mul: '×', div: '÷' };

  function q(v, dim) { return { v: v, dim: dim }; }

  /** A value as it's shown big on the screen. */
  function show(x, den) {
    if (!x) return '0';
    switch (x.dim) {
      case 1: return R.formatFtIn(x.v, den);
      case 2: return R.fmt(x.v / 144, 4) + ' sq ft';
      case 3: return R.fmt(x.v / 1728, 4) + ' cu ft';
      default: return R.fmt(x.v, 8);
    }
  }

  /** The other ways to read a value, for the strip under the answer. */
  function views(x, den) {
    if (!x) return [];
    switch (x.dim) {
      case 1: return R.lengthViews(x.v, den).slice(1);
      case 2: return [
        ['sq ft', R.fmt(x.v / 144, 4) + ' sq ft'], ['sq in', R.fmt(x.v, 2) + ' sq in'],
        ['sq yd', R.fmt(x.v / 1296, 4) + ' sq yd'], ['m²', R.fmt(x.v * 0.00064516, 4) + ' m²'],
        ['acres', R.fmt(x.v / 6272640, 5) + ' acres'], ['squares', R.fmt(x.v / 14400, 3) + ' roof sq'],
      ];
      case 3: return [
        ['cu yd', R.fmt(x.v / 46656, 4) + ' cu yd'], ['cu ft', R.fmt(x.v / 1728, 4) + ' cu ft'],
        ['cu in', R.fmt(x.v, 1) + ' cu in'], ['m³', R.fmt(x.v * 1.6387064e-5, 4) + ' m³'],
        ['gal', R.fmt(x.v / 231, 2) + ' US gal'], ['L', R.fmt(x.v * 0.016387064, 2) + ' L'],
      ];
      default: return [];
    }
  }

  function noUnit(n) {
    return R.fail(n + ' has no unit. Tap Feet or Inch after it, or use × or ÷ with a plain number.');
  }

  /** Every answer passes here: nothing infinite, nothing not-a-number, ever reaches the screen. */
  function sane(x) {
    if (!Number.isFinite(x.v) || Math.abs(x.v) > 1e15) R.fail("That's too big to work with.");
    return x;
  }

  function apply(a, op, b) {
    return sane(applyRaw(a, op, b));
  }

  function applyRaw(a, op, b) {
    switch (op) {
      case 'add': case 'sub': {
        if (a.dim !== b.dim) {
          if (a.dim === 0 && a.v !== 0) noUnit(R.fmt(a.v, 6));
          if (b.dim === 0) noUnit(R.fmt(b.v, 6));
          R.fail("Can't " + (op === 'add' ? 'add' : 'subtract') + ' a' + (DIM[b.dim] === 'area' ? 'n ' : ' ') + DIM[b.dim] + (op === 'add' ? ' to ' : ' from ') + 'a' + (DIM[a.dim] === 'area' ? 'n ' : ' ') + DIM[a.dim] + '.');
        }
        return q(op === 'add' ? a.v + b.v : a.v - b.v, a.dim);
      }
      case 'mul': {
        const d = a.dim + b.dim;
        if (d > 3) R.fail('That goes past a volume (length × length × length). Check what you multiplied.');
        return q(a.v * b.v, d);
      }
      case 'div': {
        if (b.v === 0) R.fail("Can't divide by zero.");
        const d = a.dim - b.dim;
        if (d < 0) R.fail("Can't divide a" + (a.dim === 2 ? 'n ' : ' ') + DIM[a.dim] + ' by a' + (b.dim === 2 ? 'n ' : ' ') + DIM[b.dim] + '.');
        return q(a.v / b.v, d);
      }
    }
    return R.fail('Unknown operation.');
  }

  /** Read the typed keys into a value. partial=true never throws (for the live readout). */
  function readEntry(tokens) {
    let cur = '', feet = null, inch = null, num = null, den = null, inFrac = false, unitIn = false;
    for (const t of tokens) {
      if (t.length === 1) { cur += t; continue; }
      if (t === 'ft') { feet = cur; cur = ''; }
      else if (t === 'in') {
        if (inFrac) { den = cur; inFrac = false; }
        else inch = cur;
        cur = ''; unitIn = true;
      } else if (t === 'frac') { num = cur; cur = ''; inFrac = true; }
    }
    if (inFrac) den = cur;
    const rest = inFrac ? '' : cur;
    return { feet: feet, inch: inch, num: num, den: den, inFrac: inFrac, rest: rest, unitIn: unitIn };
  }

  /** What's typed so far, as it reads: 5' 7-3/▯" while the fraction's bottom is still to come. */
  function entryText(tokens) {
    const p = readEntry(tokens);
    if (p.feet === null && p.inch === null && p.num === null) return p.rest || '0';
    const isLen = p.feet !== null || p.unitIn;
    let inch = '';
    if (p.inch !== null) inch = p.inch;
    else if (p.feet !== null && p.num === null && p.rest) inch = p.rest;
    if (p.num !== null) inch += (inch ? '-' : '') + p.num + '/' + (p.den || '▯');
    else if (p.inch !== null && p.rest) inch += '-' + p.rest + '/▯';
    let s = p.feet !== null ? p.feet + "'" : '';
    if (inch) s += (s ? ' ' : '') + inch + (isLen ? '"' : '');
    return s;
  }

  function finishEntry(tokens) {
    const p = readEntry(tokens);
    if (p.inFrac && !p.den) R.fail('Finish the fraction: type the bottom number.');
    if (p.inch !== null && p.num === null && p.rest) R.fail('Finish the fraction: tap / then the bottom number.');
    for (const part of [p.feet, p.inch, p.num, p.den, p.rest]) {
      if (part === '.') R.fail('Type a number after the point.');
    }
    if (p.den !== null && p.den !== '' && parseFloat(p.den) === 0) R.fail("A fraction can't have 0 on the bottom.");
    const n = function (s) { return s === '' || s === null ? 0 : parseFloat(s); };
    const fracV = p.num !== null ? n(p.num) / n(p.den) : 0;
    const isLen = p.feet !== null || p.unitIn;
    if (isLen) {
      let inches = n(p.feet) * 12 + n(p.inch) + fracV;
      if (p.feet !== null && p.inch === null && p.num === null && p.rest) inches += n(p.rest);
      return sane(q(inches, 1));
    }
    if (p.num !== null) return sane(q(fracV, 0));
    return sane(q(n(p.rest), 0));
  }

  class Keypad {
    constructor(opts) {
      opts = opts || {};
      this.den = DENS.indexOf(opts.den) >= 0 ? opts.den : 16;
      this.tape = [];
      this.mem = null;
      this.tri = { order: [], rise: null, run: null, diag: null, pitch: null };
      this.solved = null;
      this.clear();
    }

    clear() {
      this.tokens = [];      // what's being typed
      this.value = null;     // a value standing in for typed keys (a result, a recall)
      this.acc = null;       // the running total
      this.op = null;        // the operation waiting for its right-hand side
      this.expr = [];        // the line being built, for the tape
      this.msg = '';
      this.err = false;
    }

    setDen(d) {
      d = Number(d);
      if (DENS.indexOf(d) < 0) R.fail('Rounding must be one of 1/2, 1/4, 1/8, 1/16, 1/32 or 1/64.');
      this.den = d;
    }

    /** The value on the screen right now, if any (typed, recalled or a result). */
    current() {
      if (this.tokens.length) return finishEntry(this.tokens);
      return this.value;
    }

    hint(m) { this.msg = m; this.err = true; return false; }

    /** One tap. Returns true when it did something, false with this.msg when it couldn't. */
    press(key) {
      this.msg = ''; this.err = false;
      try {
        return this._press(String(key));
      } catch (e) {
        if (e instanceof R.InputError) { this.msg = e.message; this.err = true; return false; }
        throw e;
      }
    }

    _startTyping() {
      if (!this.tokens.length && this.value && !this.op) { this.value = null; this.acc = null; this.expr = []; }
      else if (!this.tokens.length && this.value) this.value = null;
    }

    _press(k) {
      const p = readEntry(this.tokens);
      if (/^[0-9]$/.test(k)) {
        this._startTyping();
        const part = p.inFrac ? (p.den || '') : p.rest;
        if (part.replace('.', '').length >= 9) return this.hint("That's enough digits.");
        this.tokens.push(k); return true;
      }
      switch (k) {
        case '.': {
          this._startTyping();
          const q2 = readEntry(this.tokens);
          if (q2.inFrac || q2.num !== null) return this.hint('Fractions use whole numbers, like 3 / 8.');
          if (q2.inch !== null || q2.unitIn) return this.hint('After Inch, type a fraction like 3 / 8.');
          if (q2.rest.indexOf('.') >= 0) return this.hint('There is already a point in this number.');
          this.tokens.push('.'); return true;
        }
        case 'ft': {
          if (!this.tokens.length) return this.hint('Type a number first, then Feet.');
          if (p.feet !== null) return this.hint('Feet is already in. Type the inches next.');
          if (p.inch !== null || p.num !== null || p.unitIn) return this.hint('Feet goes first, then inches and the fraction.');
          if (!p.rest || p.rest === '.') return this.hint('Type a number first, then Feet.');
          this.tokens.push('ft'); return true;
        }
        case 'in': {
          if (!this.tokens.length) return this.hint('Type a number first, then Inch.');
          if (p.unitIn) return this.hint('Inch is already in.');
          if (p.inFrac) {
            if (!p.den) return this.hint('Type the bottom number of the fraction first.');
            this.tokens.push('in'); return true;
          }
          if (!p.rest || p.rest === '.') return this.hint('Type a number first, then Inch.');
          this.tokens.push('in'); return true;
        }
        case 'frac': {
          if (p.inFrac || p.num !== null) return this.hint('There is already a fraction here.');
          if (!p.rest) return this.hint('Type the top number first, then /.');
          if (p.rest.indexOf('.') >= 0) return this.hint('Fractions use whole numbers, like 3 / 8.');
          this.tokens.push('frac'); return true;
        }
        case 'back': {
          if (this.tokens.length) { this.tokens.pop(); return true; }
          if (this.value && this.op) { this.value = null; return true; }
          if (this.op) { this.op = null; this.expr.pop(); this.value = this.acc; this.acc = null; this.expr = []; return true; }
          return this.hint('Nothing to take back.');
        }
        case 'ac': {
          const busy = this.tokens.length || this.value || this.acc || this.op;
          this.clear();
          if (!busy) {
            this.tri = { order: [], rise: null, run: null, diag: null, pitch: null };
            this.solved = null;
            this.msg = 'Cleared Rise, Run, Diag and Pitch too.';
          }
          return true;
        }
        case 'add': case 'sub': case 'mul': case 'div': return this._op(k);
        case 'eq': return this._equals();
        case 'pct': return this._percent();
        case 'sq': return this._unary('sq');
        case 'sqrt': return this._unary('sqrt');
        case 'mplus': {
          const x = this.current();
          if (!x) return this.hint('Nothing to add to memory yet.');
          if (this.mem && this.mem.dim !== x.dim) R.fail('Memory holds a' + (this.mem.dim === 2 ? 'n ' : ' ') + DIM[this.mem.dim] + '; this is a' + (x.dim === 2 ? 'n ' : ' ') + DIM[x.dim] + '. Tap MC to clear memory first.');
          this.mem = this.mem ? q(this.mem.v + x.v, x.dim) : q(x.v, x.dim);
          this.tokens = []; this.value = x;
          this.msg = 'Memory: ' + show(this.mem, this.den);
          return true;
        }
        case 'mminus': {
          const x = this.current();
          if (!x) return this.hint('Nothing to take out of memory yet.');
          if (this.mem && this.mem.dim !== x.dim) R.fail("Memory holds a different kind of value.");
          this.mem = this.mem ? q(this.mem.v - x.v, x.dim) : q(-x.v, x.dim);
          this.tokens = []; this.value = x;
          this.msg = 'Memory: ' + show(this.mem, this.den);
          return true;
        }
        case 'mr': {
          if (!this.mem) return this.hint('Memory is empty. Tap M+ to keep the number on screen.');
          if (!this.op) { this.acc = null; this.expr = []; }
          this.tokens = []; this.value = q(this.mem.v, this.mem.dim);
          this.msg = 'From memory';
          return true;
        }
        case 'mc': { this.mem = null; this.msg = 'Memory cleared.'; return true; }
        case 'rise': case 'run': case 'diag': case 'pitch': return this._tri(k);
      }
      return R.fail('Unknown key: ' + k);
    }

    _op(k) {
      const x = this.current();
      if (!x) {
        if (this.acc && this.op) { this.op = k; this.expr[this.expr.length - 1] = ' ' + OPS[k] + ' '; return true; }
        return this.hint('Type a number first.');
      }
      if (this.acc && this.op) {
        this.acc = apply(this.acc, this.op, x);
        this.expr.push(show(x, this.den));
      } else {
        this.acc = q(x.v, x.dim);
        this.expr = [show(x, this.den)];
      }
      this.op = k;
      this.expr.push(' ' + OPS[k] + ' ');
      this.tokens = []; this.value = null;
      return true;
    }

    _record(text, result) {
      this.tape.push({ text: text, result: q(result.v, result.dim), shown: show(result, this.den) });
      if (this.tape.length > 200) this.tape.shift();
    }

    _equals() {
      const x = this.current();
      if (!this.op) {
        if (!x) return this.hint('Nothing to work out yet.');
        this.tokens = []; this.value = q(x.v, x.dim); this.acc = null; this.expr = [];
        return true;
      }
      if (!x) { // "5 × =": finish with what we have
        const r = this.acc; this.expr.pop();
        this._record(this.expr.join(''), r);
        this.tokens = []; this.value = r; this.acc = null; this.op = null; this.expr = [];
        return true;
      }
      const r = apply(this.acc, this.op, x);
      this.expr.push(show(x, this.den));
      this._record(this.expr.join(''), r);
      this.tokens = []; this.value = r; this.acc = null; this.op = null; this.expr = [];
      return true;
    }

    _percent() {
      const x = this.current();
      if (!x) return this.hint('Type a number first, then %.');
      if (x.dim !== 0) return this.hint('Percent works on a plain number, like 10 %.');
      if (!this.acc || !this.op) {
        this.tokens = []; this.value = q(x.v / 100, 0); return true;
      }
      let r;
      if (this.op === 'add' || this.op === 'sub') r = apply(this.acc, this.op, q(this.acc.v * x.v / 100, this.acc.dim));
      else r = apply(this.acc, this.op, q(x.v / 100, 0));
      this.expr.push(R.fmt(x.v, 6) + '%');
      this._record(this.expr.join(''), r);
      this.tokens = []; this.value = r; this.acc = null; this.op = null; this.expr = [];
      return true;
    }

    _unary(kind) {
      const x = this.current();
      if (!x) return this.hint('Type a number first.');
      let r;
      if (kind === 'sq') {
        if (x.dim > 1) return this.hint("Can't square a" + (x.dim === 2 ? 'n area' : ' volume') + '.');
        r = q(x.v * x.v, x.dim * 2);
      } else {
        if (x.v < 0) return this.hint("Can't take the square root of a negative number.");
        if (x.dim === 1 || x.dim === 3) return this.hint('Square root works on an area (gives its side) or a plain number.');
        r = q(Math.sqrt(x.v), x.dim / 2);
      }
      sane(r);
      const label = kind === 'sq' ? '(' + show(x, this.den) + ')²' : '√(' + show(x, this.den) + ')';
      if (!this.op) this._record(label, r);
      this.tokens = []; this.value = r;
      if (!this.op) { this.acc = null; this.expr = []; }
      return true;
    }

    _tri(slot) {
      const typed = this.tokens.length > 0 || (this.value && !this.value.tri && !this.op);
      if (typed) {
        const x = this.current();
        if (slot === 'pitch') {
          if (x.dim > 1) return this.hint('Pitch is the rise per foot of run, like 6 (for 6/12).');
          if (!(x.v > 0)) return this.hint('Pitch must be more than 0.');
          if (x.v > 240) return this.hint('That pitch is steeper than a wall. Use rise per 12, like 6 or 9.5.');
        } else {
          if (x.dim !== 1) return x.dim === 0 ? this.hint(SLOT_NAME[slot] + ' is a length. Tap Feet or Inch after the number.') : this.hint(SLOT_NAME[slot] + ' must be a length.');
          if (!(x.v > 0)) return this.hint(SLOT_NAME[slot] + ' must be more than 0.');
        }
        this.tri[slot] = x.v;
        this.tri.order = this.tri.order.filter(function (s) { return s !== slot; }).concat(slot);
        this.solved = null;
        const shown = slot === 'pitch' ? pitchText(x.v) : show(x, this.den);
        this.msg = SLOT_NAME[slot] + ' stored: ' + shown;
        this.tokens = []; this.value = { v: x.v, dim: slot === 'pitch' ? 0 : 1, tri: true };
        if (!this.op) { this.acc = null; this.expr = []; }
        return true;
      }
      const t = solveTriangle(this.tri, slot);
      this.solved = t;
      const v = t[slot];
      const r = { v: v, dim: slot === 'pitch' ? 0 : 1, tri: true };
      const from = this.tri.order.filter(function (s) { return s !== slot && this.tri[s] != null; }, this).slice(-2);
      const label = SLOT_NAME[slot] + ' from ' + from.map(function (s) { return SLOT_NAME[s] + ' ' + (s === 'pitch' ? pitchText(this.tri[s]) : R.formatFtIn(this.tri[s], this.den)); }, this).join(', ');
      this.tape.push({ text: label, result: q(v, r.dim), shown: slot === 'pitch' ? pitchText(v) : show(r, this.den) });
      this.msg = slot === 'pitch' ? pitchText(v) + ' · ' + R.fmt(t.angle, 2) + '° · ' + R.fmt(t.rise / t.run * 100, 1) + '% grade' : SLOT_NAME[slot];
      if (!this.op) { this.acc = null; this.expr = []; }
      this.tokens = []; this.value = r;
      return true;
    }

    view() {
      let main, kind;
      const x = this.tokens.length ? null : this.value;
      if (this.tokens.length) {
        main = entryText(this.tokens);
        let live = null;
        try { live = finishEntry(this.tokens); } catch (e) { live = null; }
        kind = live ? DIM[live.dim] : 'typing';
      } else if (x) {
        main = x.tri && x.dim === 0 ? pitchText(x.v) : show(x, this.den); kind = DIM[x.dim];
      } else if (this.acc) {
        main = show(this.acc, this.den); kind = DIM[this.acc.dim];
      } else { main = '0'; kind = 'number'; }
      let shownVal = null;
      try { shownVal = this.current() || this.acc; } catch (e) { shownVal = this.acc; }
      const rounded = !!(shownVal && shownVal.dim === 1 && !this.tokens.length && !R.isExact(shownVal.v, this.den));
      const tri = {};
      for (const s of SLOTS) {
        const stored = this.tri[s];
        const solved = this.solved && this.solved[s];
        const v = stored != null ? stored : (solved != null ? solved : null);
        tri[s] = v == null ? null : { text: s === 'pitch' ? pitchText(v) : R.formatFtIn(v, this.den), stored: stored != null };
      }
      return {
        main: main,
        kind: kind,
        line: this.expr.join(''),
        msg: this.msg, err: this.err,
        views: views(shownVal && !this.tokens.length ? shownVal : null, this.den),
        rounded: rounded,
        den: this.den,
        mem: this.mem ? show(this.mem, this.den) : null,
        tri: tri,
        angle: this.solved ? this.solved.angle : null,
        tape: this.tape.slice(-50),
      };
    }
  }

  function pitchText(p) {
    return R.fmt(p, 3) + '/12';
  }

  /** From any two of rise, run, diag (inches) and pitch (rise per 12), the whole triangle. */
  function solveTriangle(tri, target) {
    const known = tri.order.filter(function (s) { return s !== target && tri[s] != null; }).slice(-2);
    if (known.length < 2) R.fail('Store two of Rise, Run, Diag or Pitch first: type a value, then tap its key.');
    const k = {};
    known.forEach(function (s) { k[s] = tri[s]; });
    let rise = k.rise, run = k.run, diag = k.diag;
    if (k.pitch != null) {
      const ratio = k.pitch / 12;
      if (rise != null) run = rise / ratio;
      else if (run != null) rise = run * ratio;
      else { const th = Math.atan(ratio); rise = diag * Math.sin(th); run = diag * Math.cos(th); }
    } else if (rise != null && run != null) {
      // nothing to do
    } else if (rise != null && diag != null) {
      if (diag <= rise) R.fail('Diag must be longer than Rise.');
      run = Math.sqrt(diag * diag - rise * rise);
    } else if (run != null && diag != null) {
      if (diag <= run) R.fail('Diag must be longer than Run.');
      rise = Math.sqrt(diag * diag - run * run);
    }
    if (diag == null) diag = Math.hypot(rise, run);
    return { rise: rise, run: run, diag: diag, pitch: rise / run * 12, angle: Math.atan2(rise, run) * 180 / Math.PI };
  }

  R.Keypad = Keypad;
  R.solveTriangle = solveTriangle;
  R.pitchText = pitchText;
  R.showValue = show;
  R.valueViews = views;
  R.DIM = DIM;
  R.DENS = DENS;
  R._entryText = entryText;
  R._finishEntry = finishEntry;
})(globalThis.Reckon = globalThis.Reckon || {});
