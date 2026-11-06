/* Reckon: the app. Draws the faces, the Job keypad, every calculator page, the pop-up
   length keypad and the tape. Everything typed stays on this phone (localStorage). */
(function (R) {
  'use strict';

  // ---------- small helpers ----------
  const ICONS = {
    ruler: '<path d="M3 17 17 3l4 4L7 21z"/><path d="m7 13 2 2M10 10l2 2M13 7l2 2"/>',
    calc: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 19h8"/>',
    money: '<path d="M12 2v20M17 6.5c0-1.9-2.2-3-5-3s-5 1.1-5 3 2 2.7 5 3.5 5 1.6 5 3.5-2.2 3-5 3-5-1.1-5-3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    car: '<path d="M3 13l2-6h14l2 6v4H3z"/><circle cx="7.5" cy="17" r="1.6"/><circle cx="16.5" cy="17" r="1.6"/>',
    swap: '<path d="M7 4 3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>',
    heart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
    sigma: '<path d="M18 5H6l6 7-6 7h12"/>',
    bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
    home: '<path d="M3 11 12 4l9 7M5 10v10h14V10"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    tape: '<path d="M5 4h14M5 9h14M5 14h9M5 19h6"/>',
    back: '<path d="M15 5 8 12l7 7"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
    chev: '<path d="m9 5 7 7-7 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
  };
  function icon(name) {
    const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor');
    s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true');
    s.innerHTML = ICONS[name] || '';   // constant strings only, never anything typed
    return s;
  }
  /** Build an element. Text always goes in as text, so nothing typed can ever run as code. */
  function el(tag, props, kids) {
    const e = document.createElement(tag);
    if (props) for (const k in props) {
      const v = props[k];
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'text') e.textContent = v;
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? '' : v);
    }
    (kids || []).forEach(function (c) { if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c))); });
    return e;
  }
  const $ = function (s) { return document.querySelector(s); };

  const store = {
    get: function (k, fallback, ok) {
      try {
        const raw = localStorage.getItem('reckon.' + k);
        if (raw == null) return fallback;
        const v = JSON.parse(raw);
        return ok && !ok(v) ? fallback : v;
      } catch (e) { return fallback; }
    },
    set: function (k, v) { try { localStorage.setItem('reckon.' + k, JSON.stringify(v)); } catch (e) { /* full or private mode: keep working */ } },
  };
  const isObj = function (v) { return v && typeof v === 'object' && !Array.isArray(v); };
  const isQ = function (v) { return isObj(v) && Number.isFinite(v.v) && [0, 1, 2, 3].indexOf(v.dim) >= 0; };

  let toastTimer = null;
  function toast(msg) {
    let t = $('.toast');
    if (!t) { t = el('div', { class: 'toast', role: 'status' }); document.body.append(t); }
    t.textContent = msg;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.remove(); }, 2200);
  }
  function buzz() { if (settings.buzz && navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { /* not allowed */ } } }

  // ---------- settings ----------
  const LOOKS = ['night', 'day', 'field'];
  const settings = store.get('settings', {}, isObj);
  if (LOOKS.indexOf(settings.look) < 0) settings.look = document.documentElement.dataset.look || 'field';   // Field instrument: his pick, 2026-11-05
  if (R.DENS.indexOf(settings.den) < 0) settings.den = 16;
  if (typeof settings.buzz !== 'boolean') settings.buzz = true;
  function saveSettings() { store.set('settings', settings); }
  if (!document.documentElement.dataset.lockLook) document.documentElement.dataset.look = settings.look;

  // ---------- the keypad, kept between visits ----------
  const kp = new R.Keypad({ den: settings.den });
  (function restore() {
    const s = store.get('keypad', null, isObj);
    if (!s) return;
    if (Array.isArray(s.tape)) kp.tape = s.tape.filter(function (t) { return isObj(t) && typeof t.text === 'string' && typeof t.shown === 'string' && isQ(t.result); }).slice(-200);
    if (isQ(s.mem)) kp.mem = s.mem;
    if (isObj(s.tri) && Array.isArray(s.tri.order)) {
      const order = s.tri.order.filter(function (k) { return ['rise', 'run', 'diag', 'pitch'].indexOf(k) >= 0 && Number.isFinite(s.tri[k]) && s.tri[k] > 0; });
      order.forEach(function (k) { kp.tri[k] = s.tri[k]; });
      kp.tri.order = order;
    }
  })();
  function saveKeypad() { store.set('keypad', { tape: kp.tape.slice(-200), mem: kp.mem, tri: kp.tri }); }

  const favs = store.get('favs', [], Array.isArray).filter(function (id) { return typeof id === 'string'; });
  const fields = store.get('fields', {}, isObj);

  // ---------- routing ----------
  function route() {
    const h = (location.hash || '').replace(/^#\/?/, '');
    const parts = h.split('/');
    if (parts[0] === 'c' && R.getCalc(parts[1])) return { view: 'calc', calc: R.getCalc(parts[1]), face: R.getCalc(parts[1]).face };
    if (parts[0] === 'find') {
      let q = parts.slice(1).join('/') || '';
      try { q = decodeURIComponent(q); } catch (e) { /* a broken link like #/find/% is searched as typed */ }
      return { view: 'find', face: null, q: q.slice(0, 100) };
    }
    const face = R.FACES.find(function (f) { return f.id === parts[0]; });
    const last = store.get('face', 'job', function (v) { return R.FACES.some(function (f) { return f.id === v; }); });
    return { view: 'face', face: face ? face.id : last };
  }
  function go(hash) { if (location.hash !== hash) location.hash = hash; else render(); }

  // ---------- the frame ----------
  const app = $('#app');
  function frame(r) {
    app.textContent = '';
    const face = R.FACES.find(function (f) { return f.id === r.face; });
    const where = r.view === 'calc' ? r.calc.name : r.view === 'find' ? 'Find a calculator' : (face ? face.name : '');
    const top = el('header', { class: 'top' }, [
      el('div', { class: 'brand' }, [
        el('div', { class: 'mark', 'aria-hidden': 'true', text: 'R' }),
        el('h1', { text: 'Reckon' }),
        el('span', { class: 'where', text: where }),
      ]),
      el('button', { class: 'icon-btn', 'aria-label': 'Find a calculator', onclick: function () { go('#/find'); } }, [icon('search')]),
      el('button', { class: 'icon-btn tape-btn', 'aria-label': 'Tape: past answers', onclick: openTape }, [icon('tape')]),
      el('button', { class: 'icon-btn', 'aria-label': 'Settings', onclick: openSettings }, [icon('gear')]),
    ]);
    const nav = el('nav', { class: 'faces', 'aria-label': 'Faces' }, R.FACES.map(function (f) {
      return el('button', { class: 'face', 'aria-current': f.id === r.face ? 'page' : null, onclick: function () { go('#/' + f.id); } }, [icon(f.icon), f.short]);
    }));
    const main = el('main', { id: 'main' });
    const side = el('aside', { class: 'side', 'aria-label': 'Tape' });
    app.append(top, nav, main, side);
    const cur = nav.querySelector('[aria-current]');
    if (cur && cur.scrollIntoView && nav.scrollWidth > nav.clientWidth) cur.scrollIntoView({ block: 'nearest', inline: 'center' });
    return { main: main, side: side };
  }

  function render() {
    const r = route();
    if (r.view === 'face') store.set('face', r.face);
    const f = frame(r);
    if (r.view === 'calc') drawCalc(f.main, r.calc);
    else if (r.view === 'find') drawFind(f.main, r.q);
    else if (r.face === 'job') drawJob(f.main);
    else if (r.face === 'calc') drawSci(f.main);
    else drawList(f.main, r.face);
    drawSide(f.side);
    f.main.scrollTop = 0;
  }

  // ---------- the Job keypad ----------
  const KEYS = [
    [['rise', 'Rise', 'k-tri'], ['run', 'Run', 'k-tri'], ['diag', 'Diag', 'k-tri'], ['pitch', 'Pitch', 'k-tri'], ['ac', 'AC', 'k-clear']],
    [['ft', 'Feet', 'k-unit'], ['in', 'Inch', 'k-unit'], ['frac', 'a⁄b', 'k-unit', 'Fraction'], ['back', '⌫', 'k-fn', 'Back'], ['div', '÷', 'k-op', 'Divide']],
    [['7', '7'], ['8', '8'], ['9', '9'], ['sq', 'x²', 'k-fn', 'Square'], ['mul', '×', 'k-op', 'Times']],
    [['4', '4'], ['5', '5'], ['6', '6'], ['sqrt', '√', 'k-fn', 'Square root'], ['sub', '−', 'k-op', 'Minus']],
    [['1', '1'], ['2', '2'], ['3', '3'], ['pct', '%', 'k-fn', 'Percent'], ['add', '+', 'k-op', 'Plus']],
    [['0', '0'], ['.', '.', '', 'Point'], ['mplus', 'M+', 'k-fn', 'Add to memory'], ['mr', 'MR', 'k-fn', 'Recall memory'], ['eq', '=', 'k-eq', 'Equals']],
  ];
  const JOB_TOOLS = ['rafter', 'stairs', 'concrete-slab'];
  let jobDom = null;

  function drawJob(main) {
    main.classList.add('fixed');
    const line = el('div', { class: 'ro-line', 'aria-label': 'Working' });
    const den = el('button', { class: 'chip', 'aria-label': 'Rounding', onclick: cycleDen });
    const mem = el('button', { class: 'chip on', 'aria-label': 'Memory: tap to clear', hidden: true, onclick: function () { kp.press('mc'); saveKeypad(); updateJob(); toast('Memory cleared'); } });
    const big = el('div', { class: 'ro-main', 'aria-live': 'polite', 'aria-label': 'Answer' });
    const kind = el('span', { class: 'tag' });
    const round = el('span', { class: 'tag round' });
    const msg = el('span', { class: 'ro-msg' });
    const views = el('div', { class: 'ro-views', 'aria-label': 'Same answer in other units' });
    const cells = {};
    const tri = el('div', { class: 'ro-tri' }, ['rise', 'run', 'diag', 'pitch'].map(function (s) {
      cells[s] = el('span');
      return el('div', { class: 'ro-cell' }, [el('b', { text: s.toUpperCase() }), cells[s]]);
    }));
    const readout = el('section', { class: 'readout', 'aria-label': 'Readout' }, [
      el('div', { class: 'ro-top' }, [line, mem, den]), big, el('div', { class: 'ro-meta' }, [kind, round, msg]), views, tri,
    ]);
    const keyEls = {};
    const keys = el('div', { class: 'keys', role: 'group', 'aria-label': 'Keypad' });
    KEYS.forEach(function (row) {
      row.forEach(function (k) {
        const b = el('button', { class: 'k ' + (k[2] || 'k-num'), 'aria-label': k[3] || k[1], 'data-key': k[0] }, [k[1]]);
        b.addEventListener('pointerdown', function () { b.classList.add('down'); });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, function () { b.classList.remove('down'); }); });
        b.addEventListener('click', function () { tapKey(k[0]); });
        keyEls[k[0]] = b;
        keys.append(b);
      });
    });
    const tools = el('div', { class: 'tools', 'aria-label': 'Job tools' }, JOB_TOOLS.map(function (id) {
      const c = R.getCalc(id);
      return c && el('button', { class: 'tool', onclick: function () { go('#/c/' + id); } }, [c.name]);
    }).concat([el('button', { class: 'tool more', onclick: function () { go('#/find/job'); } }, ['All job tools ›'])]));
    main.append(readout, keys, tools);
    jobDom = { line: line, den: den, mem: mem, big: big, kind: kind, round: round, msg: msg, views: views, cells: cells, keyEls: keyEls };
    updateJob();
  }

  function tapKey(k) {
    buzz();
    const okTap = kp.press(k);
    if (!okTap && jobDom && jobDom.keyEls[k]) {
      const b = jobDom.keyEls[k]; b.classList.remove('flash'); void b.offsetWidth; b.classList.add('flash');
    }
    saveKeypad();
    updateJob();
    drawSide($('.side'));
  }

  function cycleDen() {
    const i = R.DENS.indexOf(kp.den);
    const next = R.DENS[(i + 1) % R.DENS.length];
    kp.setDen(next); settings.den = next; saveSettings();
    updateJob(); toast('Rounding to the nearest 1/' + next + '"');
  }

  function fit(node, max, min) {
    node.style.fontSize = max + 'px';
    let size = max;
    while (node.scrollWidth > node.clientWidth + 1 && size > min) { size -= 2; node.style.fontSize = size + 'px'; }
  }

  function updateJob() {
    if (!jobDom || !document.body.contains(jobDom.big)) return;
    const v = kp.view();
    const d = jobDom;
    const lineText = v.line;
    d.line.textContent = lineText.length > 44 ? '…' + lineText.slice(-44) : lineText;
    d.den.textContent = '1/' + v.den + '"';
    d.mem.hidden = !v.mem;
    d.mem.textContent = v.mem ? 'M ' + v.mem : '';
    d.big.textContent = v.main;
    const short = window.innerHeight < 700 && window.innerWidth < 980;
    fit(d.big, short ? 38 : 46, 20);
    const KIND = { number: 'Number', length: 'Length', area: 'Area', volume: 'Volume', typing: 'Typing' };
    d.kind.textContent = KIND[v.kind] || '';
    d.round.textContent = v.rounded ? '≈ nearest 1/' + v.den : '';
    d.msg.textContent = v.msg;
    d.msg.classList.toggle('err', !!v.err);
    d.views.textContent = '';
    v.views.forEach(function (p) { d.views.append(el('span', { text: p[1] })); });
    ['rise', 'run', 'diag', 'pitch'].forEach(function (s) {
      const c = d.cells[s], t = v.tri[s];
      c.textContent = t ? t.text : '—';
      c.parentNode.className = 'ro-cell' + (t ? (t.stored ? ' stored' : ' solved') : '');
    });
  }

  // keyboard on a PC: digits, + - * /, Enter, Backspace, Esc, ' for feet, " for inch, f for a fraction
  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!jobDom || !document.body.contains(jobDom.big) || document.querySelector('.sheet')) return;
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    const map = { '+': 'add', '-': 'sub', '*': 'mul', 'x': 'mul', '/': 'div', 'Enter': 'eq', '=': 'eq', 'Backspace': 'back', 'Escape': 'ac', "'": 'ft', '"': 'in', 'f': 'frac', '%': 'pct', '.': '.' };
    const k = /^[0-9]$/.test(e.key) ? e.key : map[e.key];
    if (!k) return;
    e.preventDefault();
    if (jobDom.keyEls[k]) { jobDom.keyEls[k].classList.add('down'); setTimeout(function () { jobDom && jobDom.keyEls[k] && jobDom.keyEls[k].classList.remove('down'); }, 90); }
    tapKey(k);
  });

  // ---------- the Calc face: everyday + scientific ----------
  const sci = {
    toks: [], fresh: false, second: false,
    deg: settings.deg !== false,
    tape: store.get('calcTape', [], Array.isArray).filter(function (t) { return isObj(t) && typeof t.expr === 'string' && Number.isFinite(t.v); }).slice(-100),
    ans: null, msg: '', err: false,
  };
  if (sci.tape.length) sci.ans = sci.tape[sci.tape.length - 1].v;
  const SCI_KEYS = [
    [['2nd', '2nd', 'k-tri', 'Second functions'], ['sin', 'sin', 'k-tri', 'Sine'], ['cos', 'cos', 'k-tri', 'Cosine'], ['tan', 'tan', 'k-tri', 'Tangent'], ['ac', 'AC', 'k-clear', 'All clear']],
    [['(', '(', 'k-fn', 'Open bracket'], [')', ')', 'k-fn', 'Close bracket'], ['pow', 'xʸ', 'k-fn', 'Power'], ['root', '√', 'k-fn', 'Square root'], ['/', '÷', 'k-op', 'Divide']],
    [['7', '7'], ['8', '8'], ['9', '9'], ['pi', 'π', 'k-fn', 'Pi'], ['*', '×', 'k-op', 'Times']],
    [['4', '4'], ['5', '5'], ['6', '6'], ['ln', 'ln', 'k-fn', 'Natural log'], ['-', '−', 'k-op', 'Minus']],
    [['1', '1'], ['2', '2'], ['3', '3'], ['%', '%', 'k-fn', 'Percent'], ['+', '+', 'k-op', 'Plus']],
    [['0', '0'], ['.', '.', '', 'Point'], ['back', '⌫', 'k-fn', 'Back'], ['ans', 'Ans', 'k-fn', 'Last answer'], ['=', '=', 'k-eq', 'Equals']],
  ];
  const SECOND = { sin: ['sin⁻¹(', 'sin⁻¹'], cos: ['cos⁻¹(', 'cos⁻¹'], tan: ['tan⁻¹(', 'tan⁻¹'], pow: ['²', 'x²'], root: ['∛(', '∛'], pi: ['e', 'e'], ln: ['log(', 'log'], '%': ['!', 'n!'] };
  const FIRST = { sin: 'sin(', cos: 'cos(', tan: 'tan(', pow: '^', root: '√(', pi: 'π', ln: 'ln(', '%': '%', '(': '(', ')': ')', '/': '÷', '*': '×', '-': '−', '+': '+', ans: 'Ans' };
  let sciDom = null;

  function drawSci(main) {
    main.classList.add('fixed');
    const hist = el('div', { class: 'ro-line', style: 'direction:ltr' });
    const mode = el('button', { class: 'chip', 'aria-label': 'Degrees or radians', onclick: function () { sci.deg = !sci.deg; settings.deg = sci.deg; saveSettings(); updateSci(); toast(sci.deg ? 'Angles in degrees' : 'Angles in radians'); } });
    const second = el('span', { class: 'chip on', hidden: true, text: '2nd' });
    const exprEl = el('div', { class: 'ro-line', style: 'direction:ltr;font-size:20px;color:var(--readout-text);white-space:normal;overflow-wrap:anywhere;min-height:26px' });
    const big = el('div', { class: 'ro-main', 'aria-live': 'polite', 'aria-label': 'Answer' });
    const msg = el('span', { class: 'ro-msg' });
    const readout = el('section', { class: 'readout', 'aria-label': 'Readout' }, [
      el('div', { class: 'ro-top' }, [hist, second, mode]), exprEl, big, el('div', { class: 'ro-meta' }, [msg]),
    ]);
    const keyEls = {};
    const keys = el('div', { class: 'keys', role: 'group', 'aria-label': 'Keypad' });
    SCI_KEYS.forEach(function (row) {
      row.forEach(function (k) {
        const b = el('button', { class: 'k ' + (k[2] || 'k-num'), 'aria-label': k[3] || k[1], 'data-key': k[0] }, [k[1]]);
        b.addEventListener('pointerdown', function () { b.classList.add('down'); });
        ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, function () { b.classList.remove('down'); }); });
        b.addEventListener('click', function () { buzz(); sciKey(k[0]); });
        keyEls[k[0]] = b;
        keys.append(b);
      });
    });
    main.append(readout, keys);
    sciDom = { hist: hist, mode: mode, second: second, expr: exprEl, big: big, msg: msg, keyEls: keyEls };
    updateSci();
  }

  function sciKey(k) {
    sci.msg = ''; sci.err = false;
    const isDigit = /^[0-9.]$/.test(k);
    if (k === '2nd') { sci.second = !sci.second; return updateSci(); }
    if (k === 'ac') { sci.toks = []; sci.fresh = false; sci.second = false; return updateSci(); }
    if (k === 'back') { if (sci.fresh) { sci.toks = []; sci.fresh = false; } else sci.toks.pop(); return updateSci(); }
    if (k === '=') {
      if (!sci.toks.length) return updateSci();
      const text = R.calcText(sci.toks);
      try {
        const v = R.evalExpr(text, { deg: sci.deg, ans: sci.ans, autoClose: true });
        sci.tape.push({ expr: text, v: v });
        if (sci.tape.length > 100) sci.tape.shift();
        store.set('calcTape', sci.tape);
        sci.ans = v; sci.toks = [R.fmtCalc(v).replace(/,/g, '')]; sci.fresh = true;
        drawSide($('.side'));
      } catch (e) {
        if (!(e instanceof R.InputError)) throw e;
        sci.msg = e.message; sci.err = true;
      }
      return updateSci();
    }
    if (sci.fresh) {   // after =: a digit starts over, an operation carries the answer on
      sci.fresh = false;
      if (isDigit || ['sin', 'cos', 'tan', 'root', 'pi', 'ln', '(', 'ans'].indexOf(k) >= 0) sci.toks = [];
      else sci.toks = ['Ans'];
    }
    let tok = isDigit ? k : FIRST[k];
    if (sci.second && SECOND[k]) tok = SECOND[k][0];
    if (sci.second) sci.second = false;
    if (sci.toks.length >= 120) { sci.msg = 'That’s long enough.'; sci.err = true; return updateSci(); }
    if (tok === '.' && R.hasPoint(sci.toks)) return updateSci();   // one point per number: a second tap does nothing, like a phone calculator
    if (tok) sci.toks.push(tok);
    updateSci();
  }

  function updateSci() {
    if (!sciDom || !document.body.contains(sciDom.big)) return;
    const d = sciDom;
    const last = sci.tape.slice(-1)[0];
    d.hist.textContent = last ? last.expr + ' = ' + R.fmtCalc(last.v) : '';
    d.mode.textContent = sci.deg ? 'DEG' : 'RAD';
    d.second.hidden = !sci.second;
    Object.keys(SECOND).forEach(function (k) {
      const b = d.keyEls[k];
      if (b) b.textContent = sci.second ? SECOND[k][1] : SCI_KEYS.reduce(function (a, r) { return a.concat(r); }, []).find(function (x) { return x[0] === k; })[1];
    });
    d.keyEls['2nd'].classList.toggle('on', sci.second);
    d.keyEls['2nd'].setAttribute('aria-pressed', sci.second ? 'true' : 'false');
    const text = R.calcText(sci.toks);
    d.expr.textContent = sci.fresh ? '' : text;
    let live = '';
    if (sci.fresh) live = typeof sci.ans === 'number' ? R.fmtCalc(sci.ans) : '0';
    else if (text) { try { live = R.fmtCalc(R.evalExpr(text, { deg: sci.deg, ans: sci.ans, autoClose: true })); } catch (e) { live = ''; } }
    d.big.textContent = live || (text ? '' : '0');
    d.big.style.opacity = sci.fresh || !text ? '1' : '.55';
    fit(d.big, window.innerHeight < 700 && window.innerWidth < 980 ? 38 : 46, 20);
    d.msg.textContent = sci.msg;
    d.msg.classList.toggle('err', sci.err);
  }

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!sciDom || !document.body.contains(sciDom.big) || document.querySelector('.sheet')) return;
    if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    const map = { 'Enter': '=', '=': '=', 'Backspace': 'back', 'Escape': 'ac', '^': 'pow', 'x': '*', 'p': 'pi', 's': 'sin', 'c': 'cos', 't': 'tan', 'l': 'ln', 'r': 'root' };
    const k = /^[0-9.()+\-*/%]$/.test(e.key) ? e.key : map[e.key];
    if (!k) return;
    e.preventDefault();
    sciKey(k);
  });

  // ---------- tape ----------
  function onCalcFace() { const r = route(); return r.view === 'face' && r.face === 'calc'; }
  function tapeRows(onPick) {
    if (onCalcFace()) {
      if (!sci.tape.length) return [el('div', { class: 'empty', text: 'Answers from the calculator land here. Tap one to use it again.' })];
      return sci.tape.slice().reverse().map(function (t) {
        return el('button', { class: 'tape-row', onclick: function () { sci.toks = [R.fmtCalc(t.v).replace(/,/g, '')]; sci.fresh = true; sci.ans = t.v; updateSci(); } }, [
          el('span', { class: 't', text: t.expr }), el('span', { class: 'r', text: R.fmtCalc(t.v) }),
        ]);
      });
    }
    if (!kp.tape.length) return [el('div', { class: 'empty', text: 'Answers from the Job keypad land here. Tap one to use it again.' })];
    return kp.tape.slice().reverse().map(function (t) {
      return el('button', { class: 'tape-row', onclick: function () { onPick(t); } }, [
        el('span', { class: 't', text: t.text }), el('span', { class: 'r', text: t.shown }),
      ]);
    });
  }
  function useTape(t) {
    kp.tokens = []; kp.value = { v: t.result.v, dim: t.result.dim };
    if (!kp.op) { kp.acc = null; kp.expr = []; }
    kp.msg = 'From the tape';
    if (route().face !== 'job' || route().view !== 'face') go('#/job'); else updateJob();
  }
  function openTape() {
    sheet('Tape', function (body, close) {
      const list = el('div', { class: 'tape-list' }, tapeRows(function (t) { close(); useTape(t); }));
      list.addEventListener('click', function (e) { if (e.target.closest('.tape-row') && onCalcFace()) close(); });
      const clear = el('button', { class: 'chip', onclick: function () {
        if (onCalcFace()) { sci.tape = []; store.set('calcTape', []); updateSci(); } else { kp.tape = []; saveKeypad(); }
        drawSide($('.side')); close(); toast('Tape cleared');
      } }, ['Clear tape']);
      body.append(list);
      return [clear];
    });
  }
  function drawSide(side) {
    if (!side) return;
    side.textContent = '';
    side.append(el('h3', { text: 'Tape' }), el('div', { class: 'tape-list' }, tapeRows(useTape)));
  }

  // ---------- sheets ----------
  function sheet(title, build) {
    closeSheets();
    const back = el('div', { class: 'backdrop', onclick: function () { close(); } });
    const box = el('div', { class: 'sheet', role: 'dialog', 'aria-modal': 'true', 'aria-label': title });
    const body = el('div', { style: 'display:contents' });
    function close() { back.remove(); box.remove(); document.removeEventListener('keydown', esc); }
    function esc(e) { if (e.key === 'Escape') close(); }
    const extra = build(body, close) || [];
    box.append(el('div', { class: 'sheet-head' }, [el('h3', { text: title })].concat(extra).concat([
      el('button', { class: 'icon-btn', 'aria-label': 'Close', onclick: close }, [icon('x')]),
    ])), body);
    document.body.append(back, box);
    document.addEventListener('keydown', esc);
    return close;
  }
  function closeSheets() { document.querySelectorAll('.sheet, .backdrop').forEach(function (n) { n.remove(); }); }

  /** The pop-up length keypad for any measurement box. Done hands back a reading like 5' 7-3/8". */
  function lengthSheet(inp, current, done, typeInstead) {
    const pad = new R.Keypad({ den: kp.den });
    const unitName = { ft: 'feet', in: 'inches' }[inp.unit || 'in'] || inp.unit;
    sheet(inp.label, function (body, close) {
      const val = el('div', { class: 'sheet-value', 'aria-live': 'polite' });
      const msg = el('div', { class: 'sheet-msg' });
      function show() {
        const v = pad.view();
        val.textContent = pad.tokens.length ? v.main : (current || '0');
        val.style.opacity = pad.tokens.length ? '1' : '.45';
        msg.textContent = v.msg || (pad.tokens.length ? '' : 'A number alone means ' + unitName + '.');
        msg.style.color = v.err ? '' : 'var(--dim)';
      }
      function finish() {
        if (!pad.tokens.length) { close(); return; }
        let x;
        try { x = pad.current(); } catch (e) { msg.textContent = e.message; msg.style.color = ''; return; }
        if (x.dim > 1) { msg.textContent = 'That is not a length.'; return; }
        const inches = x.dim === 1 ? x.v : x.v * R.IN_PER[inp.unit || 'in'];
        close();
        done(R.formatFtIn(inches, 64));
      }
      const layout = [['7', '7'], ['8', '8'], ['9', '9'], ['ft', 'Feet', 'k-unit'], ['4', '4'], ['5', '5'], ['6', '6'], ['in', 'Inch', 'k-unit'],
        ['1', '1'], ['2', '2'], ['3', '3'], ['frac', 'a⁄b', 'k-unit', 'Fraction'], ['.', '.'], ['0', '0'], ['back', '⌫', 'k-fn', 'Back'], ['done', 'Done', 'k-eq']];
      const keys = el('div', { class: 'keys' }, layout.map(function (k) {
        return el('button', { class: 'k ' + (k[2] || 'k-num'), 'aria-label': k[3] || k[1], onclick: function () {
          buzz();
          if (k[0] === 'done') return finish();
          pad.press(k[0]); show();
        } }, [k[1]]);
      }));
      body.append(val, msg, keys);
      show();
      return [
        el('button', { class: 'chip', onclick: function () { pad.clear(); show(); } }, ['Clear']),
        el('button', { class: 'chip', onclick: function () { close(); typeInstead(); } }, ['Type it']),
      ];
    });
  }

  // ---------- a calculator page ----------
  function drawCalc(main, c) {
    main.classList.remove('fixed');
    const saved = isObj(fields[c.id]) ? fields[c.id] : null;
    const raws = {};
    c.inputs.forEach(function (i) {
      let s = saved && typeof saved[i.id] === 'string' ? saved[i.id] : null;
      // a damaged saved choice (one that's no longer on the list) falls back to the usual one, so the box and the answer agree
      if (s != null && i.kind === 'choice' && !i.options.some(function (o) { return String(o[0]) === s; })) s = null;
      raws[i.id] = s != null ? s : (i.value != null ? String(i.value) : '');
    });
    let edited = !!saved;
    const star = el('button', { class: 'icon-btn', 'aria-label': 'Pin to the top of its face', 'aria-pressed': favs.indexOf(c.id) >= 0 ? 'true' : 'false', onclick: function () {
      const i = favs.indexOf(c.id);
      if (i >= 0) favs.splice(i, 1); else favs.unshift(c.id);
      store.set('favs', favs);
      star.setAttribute('aria-pressed', i >= 0 ? 'false' : 'true');
      star.style.color = i >= 0 ? '' : 'var(--accent)';
      toast(i >= 0 ? 'Unpinned' : 'Pinned to ' + R.FACES.find(function (f) { return f.id === c.face; }).name);
    } }, [icon('star')]);
    if (favs.indexOf(c.id) >= 0) star.style.color = 'var(--accent)';
    const head = el('div', { class: 'cv-head' }, [
      el('button', { class: 'icon-btn', 'aria-label': 'Back', onclick: function () { history.length > 1 ? history.back() : go('#/' + c.face); } }, [icon('back')]),
      el('div', { style: 'flex:1;min-width:0' }, [el('h2', { text: c.name }), el('p', { text: c.blurb })]),
      star,
    ]);
    const result = el('section', { class: 'result', 'aria-live': 'polite', 'aria-label': 'Answer' });
    const form = el('div', { class: 'fields' });
    main.append(head, result, form);

    function save() {
      fields[c.id] = Object.assign({}, raws);
      store.set('fields', fields);
    }
    function compute() {
      const r = R.runCalc(c, raws);
      result.textContent = '';
      result.classList.toggle('bad', !r.ok);
      form.querySelectorAll('.field').forEach(function (f) { f.classList.remove('err'); const m = f.querySelector('.msg'); if (m) m.remove(); });
      if (!r.ok) {
        result.append(el('div', { class: 'big-label', text: 'Check this' }), el('div', { class: 'big', text: r.errors[0].msg }));
        r.errors.forEach(function (er) {
          const f = form.querySelector('[data-field="' + er.field + '"]');
          if (f) { f.classList.add('err'); f.append(el('div', { class: 'msg', text: er.msg })); }
        });
        return;
      }
      result.classList.toggle('tall', r.out.length > 5);   // a long answer scrolls away instead of covering the form
      const top = r.out.find(function (o) { return o.big; }) || r.out[0];
      const label = el('div', { class: 'big-label' }, [top.label]);
      if (!edited) label.append(el('span', { class: 'example-badge', text: 'Example: change the numbers' }));
      result.append(label, el('div', { class: 'big', text: top.value }));
      if (top.note) result.append(el('div', { class: 'note', text: top.note }));
      const rest = r.out.filter(function (o) { return o !== top; });
      if (rest.length) {
        result.append(el('dl', null, [].concat.apply([], rest.map(function (o) {
          return [el('dt', { text: o.label }), el('dd', null, [o.value].concat(o.note ? [el('small', { text: o.note })] : []))];
        }))));
      }
    }
    function drawFields() {
      form.textContent = '';
      c.inputs.forEach(function (inp) {
        if (!R.inputShown(inp, raws)) return;
        const id = 'f-' + c.id + '-' + inp.id;
        const wrap = el('div', { class: 'field', 'data-field': inp.id });
        wrap.append(el('label', { for: id }, [inp.label, inp.help ? el('span', { class: 'help', text: inp.help }) : null]));
        let ctl;
        const changed = function (val) { raws[inp.id] = val; edited = true; save(); compute(); };
        if (inp.kind === 'length') {
          const unitWord = inp.unit === 'ft' ? 'feet' : 'inches';
          const asText = function () {
            const t = el('input', { id: id, type: 'text', value: raws[inp.id], autocomplete: 'off', spellcheck: 'false', 'aria-label': inp.label });
            t.addEventListener('input', function () { changed(t.value); });
            ctl.replaceWith(t); ctl = t; t.focus();
          };
          ctl = el('button', { id: id, class: 'len', type: 'button', onclick: function () {
            lengthSheet(inp, raws[inp.id], function (val) { changed(val); drawFields(); compute(); }, asText);
          } }, [el('span', { text: raws[inp.id] || 'Tap to enter' }), el('span', { class: 'unit', text: 'a number alone = ' + unitWord })]);
        } else if (inp.kind === 'choice') {
          ctl = el('select', { id: id }, inp.options.map(function (o) { return el('option', { value: o[0], selected: String(o[0]) === raws[inp.id] ? true : null, text: o[1] }); }));
          ctl.addEventListener('change', function () { changed(ctl.value); if (c.inputs.some(function (x) { return x.when; })) { drawFields(); compute(); } });
        } else {
          const type = inp.kind === 'date' ? 'date' : inp.kind === 'time' ? 'time' : 'text';
          const mode = { number: 'decimal', int: 'numeric', percent: 'decimal', money: 'decimal' }[inp.kind];
          ctl = el('input', { id: id, type: type, inputmode: mode || null, value: raws[inp.id], autocomplete: 'off', spellcheck: 'false', placeholder: inp.optional ? 'Optional' : null });
          ctl.addEventListener('input', function () { changed(ctl.value); });
        }
        wrap.append(ctl);
        form.append(wrap);
      });
    }
    drawFields();
    compute();
  }

  // ---------- face lists and search ----------
  function calcRow(c) {
    const face = R.FACES.find(function (f) { return f.id === c.face; });
    return el('button', { class: 'row', onclick: function () { go('#/c/' + c.id); } }, [
      el('span', { class: 'ic' }, [icon(face ? face.icon : 'calc')]),
      el('span', null, [el('b', { text: c.name }), el('span', { class: 'sub', text: c.blurb })]),
      el('span', { class: 'go' }, [icon('chev')]),
    ]);
  }
  function soonRow(name, faceIcon) {
    return el('div', { class: 'row soon', 'aria-disabled': 'true' }, [
      el('span', { class: 'ic' }, [icon(faceIcon)]), el('span', null, [el('b', { text: name })]), el('span', { class: 'soon-tag', text: 'SOON' }),
    ]);
  }
  function drawList(main, faceId) {
    main.classList.remove('fixed');
    const face = R.FACES.find(function (f) { return f.id === faceId; });
    const calcs = R.calcsFor(faceId);
    const pinned = calcs.filter(function (c) { return favs.indexOf(c.id) >= 0; });
    main.append(el('input', { class: 'search', type: 'search', placeholder: 'Find in ' + face.name + '…', 'aria-label': 'Find in ' + face.name, oninput: function (e) { filter(e.target.value); } }));
    const holder = el('div');
    main.append(holder);
    function filter(text) {
      holder.textContent = '';
      const t = String(text || '').toLowerCase().trim();
      const match = function (c) { return !t || (c.name + ' ' + c.blurb + ' ' + (c.keywords || []).join(' ')).toLowerCase().indexOf(t) >= 0; };
      if (!t && pinned.length) holder.append(el('div', { class: 'group-title', text: 'Pinned' }), el('div', { class: 'list' }, pinned.map(calcRow)));
      const shown = calcs.filter(match);
      const soon = (R.PLANNED && R.PLANNED[faceId] || []).filter(function (n) { return !t || n.toLowerCase().indexOf(t) >= 0; });
      holder.append(el('div', { class: 'group-title', text: face.blurb }));
      if (!shown.length && !soon.length) holder.append(el('div', { class: 'empty', text: 'Nothing here matches "' + text + '".' }));
      holder.append(el('div', { class: 'list' }, shown.map(calcRow).concat(soon.map(function (n) { return soonRow(n, face.icon); }))));
    }
    filter('');
  }
  function drawFind(main, q) {
    main.classList.remove('fixed');
    const face = R.FACES.find(function (f) { return f.id === q; });
    const box = el('input', { class: 'search', type: 'search', placeholder: 'Rafter, mortgage, BMI, time card…', 'aria-label': 'Find a calculator', value: face ? '' : q });
    const holder = el('div');
    main.append(box, holder);
    function show(text) {
      holder.textContent = '';
      const list = face && !text ? R.calcsFor(face.id) : R.searchCalcs(text);
      if (!text && !face) { holder.append(el('div', { class: 'empty', text: R.CALCS.length + ' calculators across ' + R.FACES.length + ' faces. Type what you need.' })); return; }
      const soon = face && !text ? (R.PLANNED && R.PLANNED[face.id]) || [] : [];
      if (!list.length && !soon.length) { holder.append(el('div', { class: 'empty', text: 'No calculator matches "' + text + '" yet.' })); return; }
      if (face && !text) holder.append(el('div', { class: 'group-title', text: face.name + ': ' + face.blurb }));
      holder.append(el('div', { class: 'list' }, list.map(calcRow).concat(soon.map(function (n) { return soonRow(n, face.icon); }))));
    }
    box.addEventListener('input', function () { show(box.value.trim()); });
    show(face ? '' : q);
    setTimeout(function () { if (!face) box.focus(); }, 50);
  }

  // ---------- settings ----------
  function openSettings() {
    sheet('Settings', function (body) {
      const looks = [['field', 'Field instrument'], ['night', 'Night shift'], ['day', 'Daylight (bright sun)']];
      const lookRow = el('div', { class: 'tools' }, looks.map(function (l) {
        return el('button', { class: 'tool' + (settings.look === l[0] ? ' more' : ''), 'aria-pressed': settings.look === l[0] ? 'true' : 'false', onclick: function () {
          settings.look = l[0]; saveSettings(); document.documentElement.dataset.look = l[0];
          const meta = document.querySelector('meta[name="theme-color"]');
          if (meta) meta.setAttribute('content', { field: '#1b1e22', night: '#0b0b0d', day: '#ece7dd' }[l[0]]);
          closeSheets(); render();
        } }, [l[1]]);
      }));
      const denRow = el('div', { class: 'tools' }, R.DENS.map(function (d) {
        return el('button', { class: 'tool' + (kp.den === d ? ' more' : ''), onclick: function () { kp.setDen(d); settings.den = d; saveSettings(); closeSheets(); render(); } }, ['1/' + d]);
      }));
      const buzzBtn = el('button', { class: 'tool' + (settings.buzz ? ' more' : ''), onclick: function () { settings.buzz = !settings.buzz; saveSettings(); closeSheets(); openSettings(); } }, [settings.buzz ? 'Buzz on each key: on' : 'Buzz on each key: off']);
      body.append(el('div', { class: 'group-title', text: 'Look' }), lookRow, el('div', { class: 'group-title', text: 'Round lengths to the nearest' }), denRow, el('div', { class: 'group-title', text: 'Keys' }), buzzBtn,
        el('p', { class: 'note', style: 'color:var(--dim);font-size:13px', text: 'Everything you type stays on this phone. Reckon works with no signal.' }));
    });
  }

  // Keep every file on the phone so Reckon opens with no signal (not in the look previews).
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !document.documentElement.dataset.lockLook) {
    let had = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (had) toast('Reckon was updated'); had = true; });
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).catch(function () { /* still works online */ });
  }

  window.addEventListener('hashchange', render);
  window.addEventListener('resize', function () { if (jobDom) updateJob(); if (sciDom) updateSci(); });
  render();
  R.app = { render: render, keypad: kp, go: go };
})(globalThis.Reckon = globalThis.Reckon || {});
