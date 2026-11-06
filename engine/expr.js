/* Reckon engine: reads a math expression like 2(3 + 4)^2 − √16 + sin(30) safely.
   A small hand-written parser: typed text is never run as code. Precedence, brackets,
   implied multiplication (2π, 3(4)), percent the way phone calculators do it
   (50 + 10% = 55), degrees or radians, and plain-words errors. */
(function (R) {
  'use strict';
  const NAME = { asin: 'sin⁻¹', acos: 'cos⁻¹', atan: 'tan⁻¹', sqrt: '√', cbrt: '∛' };   // the names on the keys
  const FUNCS = {
    sin: 1, cos: 1, tan: 1, asin: 1, acos: 1, atan: 1, sqrt: 1, cbrt: 1, ln: 1, log: 1, abs: 1,
  };

  function tokenize(src) {
    const s = String(src == null ? '' : src)
      .replace(/[×∙⋅]/g, '*').replace(/÷/g, '/').replace(/[−–]/g, '-')
      .replace(/π/g, ' pi ').replace(/√/g, ' sqrt ').replace(/∛/g, ' cbrt ')
      .replace(/sin⁻¹/g, 'asin').replace(/cos⁻¹/g, 'acos').replace(/tan⁻¹/g, 'atan');
    if (s.length > 500) R.fail('That expression is too long.');
    const out = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (c === '²' || c === '³') { out.push({ t: 'pw', v: c === '²' ? 2 : 3 }); i++; continue; }   // x² binds to its own number: 2²3 is 4 × 3
      let m = s.slice(i).match(/^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/i);
      if (m) {
        if (s[i + m[0].length] === '.') R.fail('A number has two decimal points.');
        out.push({ t: 'n', v: parseFloat(m[0]) }); i += m[0].length; continue;
      }
      m = s.slice(i).match(/^[a-z]+/i);
      if (m) {
        const w = m[0].toLowerCase();
        if (FUNCS[w]) out.push({ t: 'f', v: w });
        else if (w === 'pi') out.push({ t: 'n', v: Math.PI, c: true });
        else if (w === 'e') out.push({ t: 'n', v: Math.E, c: true });
        else if (w === 'ans') out.push({ t: 'ans' });
        else R.fail('I don’t know "' + m[0] + '".');
        i += m[0].length; continue;
      }
      if ('+-*/^()%!'.indexOf(c) >= 0) { out.push({ t: c }); i++; continue; }
      R.fail('I can’t read "' + c + '".');
    }
    return out;
  }

  function evaluate(src, opts) {
    opts = opts || {};
    const toks = tokenize(src);
    if (!toks.length) R.fail('Nothing to work out yet.');
    let p = 0;
    const peek = function () { return toks[p]; };
    const take = function (t) { if (peek() && peek().t === t) { p++; return true; } return false; };
    const ang = function (x) { return opts.deg ? x * Math.PI / 180 : x; };
    const back = function (x) { return opts.deg ? x * 180 / Math.PI : x; };
    const clean = function (x) { return Math.abs(x) < 1e-12 ? 0 : x; };
    const shown = function (t) { return t.t === 'pw' ? (t.v === 2 ? '²' : '³') : t.t === 'n' ? R.fmtCalc(t.v) : t.t === 'f' ? (NAME[t.v] || t.v) : t.t === 'ans' ? 'Ans' : t.t; };

    function expr() {
      let left = term();
      for (;;) {
        if (take('+') || (peek() && peek().t === '-' && (p++, true))) {
          const op = toks[p - 1].t;
          const right = term();
          const r = right.pct ? left.v * right.v : right.v;      // 50 + 10% = 55
          left = { v: op === '+' ? left.v + r : left.v - r };
        } else return left;
      }
    }
    function term() {
      let left = unary();
      for (;;) {
        if (take('*')) left = { v: left.v * unary().v };
        else if (take('/')) {
          const d = unary().v;
          if (d === 0) R.fail('Can’t divide by zero.');
          left = { v: left.v / d };
        } else if (peek() && (peek().t === 'n' || peek().t === '(' || peek().t === 'f' || peek().t === 'ans')) {
          left = { v: left.v * unary().v };                       // implied: 2π, 3(4), 2sin(30)
        } else return left;
      }
    }
    function unary() {
      if (take('-')) { const x = unary(); return { v: -x.v, pct: x.pct }; }
      if (take('+')) return unary();
      return power();
    }
    function power() {
      const base = postfix();
      if (take('^')) {
        const ex = unary().v;
        const v = Math.pow(base.v, ex);
        if (Number.isNaN(v)) R.fail('A negative number to a fractional power isn’t a real number.');
        return { v: v };
      }
      return base;
    }
    function postfix() {
      let x = primary();
      for (;;) {
        if (take('%')) x = { v: x.v / 100, pct: true };
        else if (peek() && peek().t === 'pw') x = { v: Math.pow(x.v, toks[p++].v) };
        else if (take('!')) {
          if (x.v < 0 || !Number.isInteger(x.v)) R.fail('Factorial (!) works on whole numbers 0 and up.');
          if (x.v > 170) R.fail('That factorial is too big.');
          let f = 1; for (let k = 2; k <= x.v; k++) f *= k;
          x = { v: f };
        } else return x;
      }
    }
    function primary() {
      const t = peek();
      if (!t) R.fail('The expression ends too soon.');
      if (t.t === 'n') { p++; return { v: t.v }; }
      if (t.t === 'ans') {
        p++;
        if (typeof opts.ans !== 'number' || !Number.isFinite(opts.ans)) R.fail('There’s no earlier answer yet.');
        return { v: opts.ans };
      }
      if (take('(')) {
        const x = expr();
        if (!take(')')) {
          if (p >= toks.length && opts.autoClose) return x;
          R.fail('A bracket is never closed.');
        }
        return { v: x.v };
      }
      if (t.t === 'f') {
        p++;
        let arg;
        if (take('(')) {
          arg = expr().v;
          if (!take(')') && !(p >= toks.length && opts.autoClose)) R.fail('A bracket is never closed.');
        } else arg = power().v;                                // √16, sin 30
        return { v: call(t.v, arg) };
      }
      if (t.t === ')') R.fail('A closing bracket has no opening one.');
      R.fail('Something is missing before "' + shown(t) + '".');
    }
    function call(f, x) {
      switch (f) {
        case 'sin': return clean(Math.sin(ang(x)));
        case 'cos': return clean(Math.cos(ang(x)));
        case 'tan': {
          if (opts.deg && Math.abs(((x % 180) + 180) % 180 - 90) < 1e-9) R.fail('tan of 90° is undefined.');
          return clean(Math.tan(ang(x)));
        }
        case 'asin': case 'acos':
          if (x < -1 || x > 1) R.fail(NAME[f] + ' only takes numbers from −1 to 1.');
          return back(f === 'asin' ? Math.asin(x) : Math.acos(x));
        case 'atan': return back(Math.atan(x));
        case 'sqrt': if (x < 0) R.fail('The square root of a negative number isn’t a real number.'); return Math.sqrt(x);
        case 'cbrt': return Math.cbrt(x);
        case 'ln': case 'log':
          if (x <= 0) R.fail((f === 'ln' ? 'ln' : 'log') + ' only takes numbers above 0.');
          return f === 'ln' ? Math.log(x) : Math.log10(x);
        case 'abs': return Math.abs(x);
      }
      return R.fail('Unknown function.');
    }

    const result = expr();
    if (p < toks.length) {
      const t = toks[p];
      R.fail(t.t === ')' ? 'A closing bracket has no opening one.' : 'I can’t make sense of the part starting at "' + shown(t) + '".');
    }
    if (!Number.isFinite(result.v)) R.fail('That’s too big to work with.');
    return result.v;
  }

  R.evalExpr = evaluate;

  /** Does the number being typed at the end of these keys already have a point? */
  R.hasPoint = function (toks) {
    if (!Array.isArray(toks)) return false;
    for (let i = toks.length - 1; i >= 0; i--) {
      const t = String(toks[i]);
      if (!/^[0-9.]+$/.test(t)) return false;
      if (t.indexOf('.') >= 0) return true;
    }
    return false;
  };

  /** The Calc keypad's keys as one line, read and shown the same way. A key that starts with a letter
      (e, Ans, sin…) touching a digit, a point or another word ("2e5", "Anssin", "AnsAns") would read
      as 2×10⁵ or an unknown word, and so would a digit after e or Ans, so a times dot goes between
      them: 2⋅e⋅5, Ans⋅sin(30). */
  R.calcText = function (toks) {
    let s = '';
    (Array.isArray(toks) ? toks : []).forEach(function (t, i) {
      t = String(t);
      const prev = i ? String(toks[i - 1]) : '';
      const touches = (/^[A-Za-z]/.test(t) && /[A-Za-z0-9.]$/.test(prev)) || (/[A-Za-z]$/.test(prev) && /^[0-9.]/.test(t));
      s += (touches ? '⋅' : '') + t;
    });
    return s;
  };
  /** A result as the screen shows it: up to 10 decimals, exponents for huge and tiny. */
  R.fmtCalc = function (x) {
    if (x === 0) return '0';
    const ax = Math.abs(x);
    if (ax >= 1e15 || ax < 1e-9) return x.toExponential(9).replace(/\.?0+e/, 'e').replace('e+', 'e').replace(/-/g, '−');
    return R.fmt(Number(x.toPrecision(13)), 10);
  };
})(globalThis.Reckon = globalThis.Reckon || {});
