/* Reckon: the rest of the Job site face. Every example was worked by hand before it was written down. */
(function (R) {
  'use strict';
  const L = function (inches) { return R.formatFtIn(inches); };
  const deg = function (rad) { return rad * 180 / Math.PI; };
  const rad = function (d) { return d * Math.PI / 180; };
  const up = function (x) { return Math.ceil(x - 1e-9); };
  const BAG_CUFT = { 80: 0.6, 60: 0.45, 40: 0.3 };
  const BAGS = { id: 'bag', label: 'Bag size', kind: 'choice', value: '80', options: [['80', '80 lb (0.60 cu ft)'], ['60', '60 lb (0.45 cu ft)'], ['40', '40 lb (0.30 cu ft)']] };
  const WASTE = function (v) { return { id: 'waste', label: 'Extra for waste', kind: 'percent', value: String(v), max: 100 }; };

  R.calc({
    id: 'right-triangle', face: 'job', name: 'Right triangle', blurb: 'Any two sides give the third, the angle and the pitch',
    keywords: ['diagonal', 'hypotenuse', 'square', '3-4-5', 'rise', 'run', 'layout'],
    inputs: [
      { id: 'mode', label: 'I know', kind: 'choice', value: 'rr', options: [['rr', 'Rise and run'], ['rd', 'Rise and diagonal'], ['nd', 'Run and diagonal']] },
      { id: 'rise', label: 'Rise', kind: 'length', unit: 'ft', value: `3'`, zero: false, when: function (r) { return r.mode !== 'nd'; } },
      { id: 'run', label: 'Run', kind: 'length', unit: 'ft', value: `4'`, zero: false, when: function (r) { return r.mode !== 'rd'; } },
      { id: 'diag', label: 'Diagonal', kind: 'length', unit: 'ft', value: `5'`, zero: false, when: function (r) { return r.mode !== 'rr'; } },
    ],
    run: function (v) {
      let rise = v.rise, run = v.run, diag = v.diag;
      if (v.mode === 'rr') diag = Math.hypot(rise, run);
      else if (v.mode === 'rd') { if (diag <= rise) R.fail('The diagonal must be longer than the rise.', 'diag'); run = Math.sqrt(diag * diag - rise * rise); }
      else { if (diag <= run) R.fail('The diagonal must be longer than the run.', 'diag'); rise = Math.sqrt(diag * diag - run * run); }
      const big = v.mode === 'rr' ? ['Diagonal', diag] : v.mode === 'rd' ? ['Run', run] : ['Rise', rise];
      return [
        { label: big[0], value: L(big[1]), big: true },
        v.mode !== 'rr' && { label: 'Diagonal', value: L(diag) },
        v.mode === 'rr' && { label: 'Rise', value: L(rise) },
        v.mode === 'rr' && { label: 'Run', value: L(run) },
        { label: 'Angle', value: R.fmt(deg(Math.atan2(rise, run)), 2) + '°', note: 'Between the run and the diagonal' },
        { label: 'Pitch', value: R.pitchText(rise / run * 12) },
        { label: 'Grade', value: R.fmt(rise / run * 100, 2) + '%' },
      ];
    },
    examples: [
      { in: {}, out: { 'Diagonal': `5' 0"`, 'Angle': '36.87°', 'Pitch': '9/12', 'Grade': '75%' } },
      { in: { mode: 'rd', rise: `3'`, diag: `5'` }, out: { 'Run': `4' 0"` } },
      { in: { mode: 'nd', run: `12'`, diag: `13'` }, out: { 'Rise': `5' 0"` } },
      { in: { mode: 'rd', rise: `6'`, diag: `5'` }, error: 'diag' },
    ],
  });

  R.calc({
    id: 'roof-pitch', face: 'job', name: 'Roof pitch', blurb: 'Pitch, angle and percent, each from the others',
    keywords: ['slope', 'angle', 'degrees', 'x/12', 'rafter factor'],
    inputs: [
      { id: 'mode', label: 'I know', kind: 'choice', value: 'p', options: [['p', 'The pitch (rise per 12)'], ['a', 'The angle in degrees'], ['rr', 'A rise and a run']] },
      { id: 'pitch', label: 'Pitch (rise per 12)', kind: 'number', value: '6', min: 0.01, max: 240, when: function (r) { return r.mode === 'p'; } },
      { id: 'angle', label: 'Angle', kind: 'number', value: '45', min: 0.01, max: 89.9, when: function (r) { return r.mode === 'a'; } },
      { id: 'rise', label: 'Rise', kind: 'length', unit: 'in', value: `4'`, zero: false, when: function (r) { return r.mode === 'rr'; } },
      { id: 'run', label: 'Run', kind: 'length', unit: 'in', value: `12'`, zero: false, when: function (r) { return r.mode === 'rr'; } },
    ],
    run: function (v) {
      const p = v.mode === 'p' ? v.pitch : v.mode === 'a' ? Math.tan(rad(v.angle)) * 12 : v.rise / v.run * 12;
      return [
        { label: 'Pitch', value: R.pitchText(p), big: true },
        { label: 'Angle', value: R.fmt(deg(Math.atan(p / 12)), 2) + '°' },
        { label: 'Percent grade', value: R.fmt(p / 12 * 100, 2) + '%' },
        { label: 'Rafter factor', value: R.fmt(Math.sqrt(1 + p * p / 144), 4), note: 'Rafter length per foot of run, in feet' },
        { label: 'Rise per foot', value: L(p) },
      ];
    },
    examples: [
      { in: {}, out: { 'Pitch': '6/12', 'Angle': '26.57°', 'Percent grade': '50%', 'Rafter factor': '1.118' } },
      { in: { mode: 'a', angle: '45' }, out: { 'Pitch': '12/12', 'Percent grade': '100%' } },
      { in: { mode: 'rr' }, out: { 'Pitch': '4/12', 'Angle': '18.43°' } },
      { in: { mode: 'a', angle: '90' }, error: 'angle' },
    ],
  });

  R.calc({
    id: 'hip-valley', face: 'job', name: 'Hip & valley rafter', blurb: 'Length and cuts for a regular hip or valley (same pitch both ways)',
    keywords: ['hip', 'valley', 'roof', '17', 'rafter'],
    inputs: [
      { id: 'span', label: 'Building span', kind: 'length', unit: 'ft', value: `24'`, zero: false, help: 'Outside wall to outside wall' },
      { id: 'pitch', label: 'Common pitch (rise per 12)', kind: 'number', value: '6', min: 0.25, max: 24 },
      { id: 'ridge', label: 'Ridge board thickness', kind: 'length', unit: 'in', value: '1-1/2"' },
      { id: 'over', label: 'Common overhang (level)', kind: 'length', unit: 'in', value: '12"' },
    ],
    run: function (v) {
      const run = v.span / 2 - v.ridge / 2;
      if (run <= 0) R.fail('The ridge board is wider than the span.', 'ridge');
      const k = Math.sqrt(288 + v.pitch * v.pitch) / 12;     // hip length per foot of common run
      const hip = run * k, tail = v.over * k;
      return [
        { label: 'Hip length', value: L(hip + tail), big: true, note: 'Along the hip, ridge to tail' },
        { label: 'Ridge to wall line', value: L(hip) },
        { label: 'Hip overhang', value: L(tail) },
        { label: 'Hip pitch', value: R.fmt(v.pitch, 3) + ' in 17', note: 'Plumb cut: square at ' + R.fmt(v.pitch, 3) + ' and 17' },
        { label: 'Hip angle', value: R.fmt(deg(Math.atan(v.pitch / (12 * Math.SQRT2))), 2) + '°' },
        { label: 'Side cut', value: '45°', note: 'Cheek cuts at the ridge for a regular hip' },
      ];
    },
    examples: [
      { in: {}, out: { 'Hip length': `19' 4-7/8"`, 'Ridge to wall line': `17' 10-7/8"`, 'Hip overhang': `1' 6"`, 'Hip pitch': '6 in 17', 'Hip angle': '19.47°' } },
    ],
  });

  R.calc({
    id: 'jack-rafters', face: 'job', name: 'Jack rafters', blurb: 'Each jack’s length and the common difference',
    keywords: ['jack', 'hip', 'valley', 'common difference', 'roof'],
    inputs: [
      { id: 'span', label: 'Building span', kind: 'length', unit: 'ft', value: `24'`, zero: false },
      { id: 'pitch', label: 'Pitch (rise per 12)', kind: 'number', value: '6', min: 0.25, max: 24 },
      { id: 'oc', label: 'Spacing (on center)', kind: 'length', unit: 'in', value: '16"', zero: false },
    ],
    run: function (v) {
      const run = v.span / 2, k = Math.sqrt(1 + v.pitch * v.pitch / 144);
      if (v.oc >= run) R.fail('The spacing is wider than half the span.', 'oc');
      const n = up(run / v.oc) - 1;
      const out = [
        { label: 'Common difference', value: L(v.oc * k), big: true, note: 'Each jack is this much shorter than the last' },
        { label: 'Jacks per side of a hip', value: n },
      ];
      for (let i = 1; i <= Math.min(n, 6); i++) out.push({ label: 'Jack ' + i, value: L((run - i * v.oc) * k), note: i === 1 ? 'The longest, next to the common rafters' : '' });
      return out;
    },
    examples: [
      { in: {}, out: { 'Common difference': `1' 5-7/8"`, 'Jacks per side of a hip': '8', 'Jack 1': `11' 11-1/8"`, 'Jack 2': `10' 5-1/4"`, 'Jack 3': `8' 11-5/16"` } },
    ],
  });

  R.calc({
    id: 'footing', face: 'job', name: 'Concrete footing', blurb: 'Yards and bags for a continuous footing or wall',
    keywords: ['concrete', 'footer', 'foundation', 'wall', 'yards'],
    inputs: [
      { id: 'len', label: 'Total length', kind: 'length', unit: 'ft', value: `40'`, zero: false },
      { id: 'wid', label: 'Width', kind: 'length', unit: 'in', value: '16"', zero: false },
      { id: 'dep', label: 'Depth', kind: 'length', unit: 'in', value: '8"', zero: false },
      WASTE(10), BAGS,
    ],
    run: function (v) {
      const cuft = v.len * v.wid * v.dep / 1728 * (1 + v.waste / 100);
      return [
        { label: 'Concrete', value: R.fmt(cuft / 27, 2) + ' cu yd', big: true, note: 'Includes ' + R.fmt(v.waste, 2) + '% extra' },
        { label: 'Cubic feet', value: R.fmt(cuft, 1) + ' cu ft' },
        { label: v.bag + ' lb bags', value: up(cuft / BAG_CUFT[v.bag]) },
      ];
    },
    examples: [{ in: {}, out: { 'Concrete': '1.45 cu yd', 'Cubic feet': '39.1 cu ft', '80 lb bags': '66' } }],
  });

  R.calc({
    id: 'column', face: 'job', name: 'Column (tube form)', blurb: 'Concrete for round piers, posts and tube forms',
    keywords: ['sonotube', 'pier', 'post hole', 'round', 'concrete', 'deck footing'],
    inputs: [
      { id: 'dia', label: 'Diameter', kind: 'length', unit: 'in', value: '12"', zero: false },
      { id: 'h', label: 'Depth or height', kind: 'length', unit: 'ft', value: `4'`, zero: false },
      { id: 'n', label: 'How many', kind: 'int', value: '6', min: 1, max: 10000 },
      WASTE(10), BAGS,
    ],
    run: function (v) {
      const each = Math.PI * Math.pow(v.dia / 2, 2) * v.h / 1728;
      const cuft = each * v.n * (1 + v.waste / 100);
      return [
        { label: 'Concrete', value: R.fmt(cuft / 27, 2) + ' cu yd', big: true, note: 'All ' + v.n + ', with ' + R.fmt(v.waste, 2) + '% extra' },
        { label: 'Cubic feet', value: R.fmt(cuft, 1) + ' cu ft' },
        { label: v.bag + ' lb bags', value: up(cuft / BAG_CUFT[v.bag]) },
        { label: 'Each one', value: R.fmt(each, 2) + ' cu ft' },
      ];
    },
    examples: [{ in: {}, out: { 'Concrete': '0.77 cu yd', 'Cubic feet': '20.7 cu ft', '80 lb bags': '35', 'Each one': '3.14 cu ft' } }],
  });

  R.calc({
    id: 'studs', face: 'job', name: 'Wall studs', blurb: 'Studs and plate lumber for a wall',
    keywords: ['framing', 'studs', 'plates', 'on center', '16', '24', 'wall'],
    inputs: [
      { id: 'len', label: 'Wall length', kind: 'length', unit: 'ft', value: `20'`, zero: false },
      { id: 'oc', label: 'Spacing', kind: 'choice', value: '16', options: [['12', '12" on center'], ['16', '16" on center'], ['19.2', '19.2" on center'], ['24', '24" on center']] },
      { id: 'extra', label: 'Extra studs (corners, openings)', kind: 'int', value: '0', min: 0, max: 1000 },
      { id: 'plates', label: 'Plates', kind: 'choice', value: '3', options: [['2', '2 (one top, one bottom)'], ['3', '3 (double top, one bottom)']] },
    ],
    run: function (v) {
      const n = up(v.len / Number(v.oc)) + 1 + v.extra;
      return [
        { label: 'Studs', value: n, big: true, note: 'One at each end, then every ' + v.oc + '"' },
        { label: 'Plate lumber', value: R.fmt(v.len / 12 * Number(v.plates), 2) + ' lin ft', note: v.plates + ' plates the full length' },
      ];
    },
    examples: [
      { in: {}, out: { 'Studs': '16', 'Plate lumber': '60 lin ft' } },
      { in: { oc: '24' }, out: { 'Studs': '11' } },
      { in: { len: `21'`, extra: '4' }, out: { 'Studs': '21' } },
    ],
  });

  R.calc({
    id: 'drywall', face: 'job', name: 'Drywall', blurb: 'Sheets for a room’s walls and ceiling',
    keywords: ['sheetrock', 'gypsum', 'board', 'sheets', 'wallboard'],
    inputs: [
      { id: 'len', label: 'Room length', kind: 'length', unit: 'ft', value: `12'`, zero: false },
      { id: 'wid', label: 'Room width', kind: 'length', unit: 'ft', value: `10'`, zero: false },
      { id: 'h', label: 'Wall height', kind: 'length', unit: 'ft', value: `8'`, zero: false },
      { id: 'ceil', label: 'Ceiling too?', kind: 'choice', value: 'yes', options: [['yes', 'Yes'], ['no', 'No, walls only']] },
      { id: 'open', label: 'Doors and windows to leave out', kind: 'number', value: '0', help: 'square feet' },
      { id: 'sheet', label: 'Sheet size', kind: 'choice', value: '32', options: [['32', '4 × 8'], ['40', '4 × 10'], ['48', '4 × 12']] },
      WASTE(10),
    ],
    run: function (v) {
      const area = (2 * (v.len + v.wid) * v.h + (v.ceil === 'yes' ? v.len * v.wid : 0)) / 144 - v.open;
      if (area <= 0) R.fail('The doors and windows add up to more than the room.', 'open');
      const withWaste = area * (1 + v.waste / 100);
      return [
        { label: 'Sheets', value: up(withWaste / Number(v.sheet)), big: true, note: { 32: '4 × 8', 40: '4 × 10', 48: '4 × 12' }[v.sheet] + ' sheets, with ' + R.fmt(v.waste, 2) + '% extra' },
        { label: 'Area to cover', value: R.fmt(area, 1) + ' sq ft' },
        { label: 'With extra', value: R.fmt(withWaste, 1) + ' sq ft' },
      ];
    },
    examples: [
      { in: {}, out: { 'Sheets': '17', 'Area to cover': '472 sq ft', 'With extra': '519.2 sq ft' } },
      { in: { open: '9999' }, error: 'open' },
    ],
  });

  R.calc({
    id: 'roofing', face: 'job', name: 'Roofing', blurb: 'Roof area, squares, shingle bundles, underlayment, drip edge',
    keywords: ['shingles', 'squares', 'bundles', 'roof', 'underlayment', 'drip edge'],
    inputs: [
      { id: 'len', label: 'Footprint length', kind: 'length', unit: 'ft', value: `40'`, zero: false, help: 'including overhangs' },
      { id: 'wid', label: 'Footprint width', kind: 'length', unit: 'ft', value: `30'`, zero: false },
      { id: 'pitch', label: 'Pitch (rise per 12)', kind: 'number', value: '6', min: 0, max: 24 },
      WASTE(10),
      { id: 'per', label: 'Bundles per square', kind: 'int', value: '3', min: 1, max: 10 },
    ],
    run: function (v) {
      const area = v.len * v.wid / 144 * Math.sqrt(1 + v.pitch * v.pitch / 144);
      const sq = area * (1 + v.waste / 100) / 100;
      return [
        { label: 'Bundles', value: up(sq * v.per), big: true, note: R.fmt(sq, 2) + ' squares with ' + R.fmt(v.waste, 2) + '% extra' },
        { label: 'Roof area', value: R.fmt(area, 1) + ' sq ft' },
        { label: 'Squares', value: R.fmt(sq, 2) },
        { label: 'Underlayment rolls', value: up(sq / 10), note: 'Synthetic, 10 squares a roll' },
        { label: 'Drip edge', value: R.fmt(2 * (v.len + v.wid) / 12, 1) + ' lin ft', note: up(2 * (v.len + v.wid) / 120) + ' pieces at 10 ft' },
      ];
    },
    examples: [{ in: {}, out: { 'Bundles': '45', 'Roof area': '1,341.6 sq ft', 'Squares': '14.76', 'Underlayment rolls': '2', 'Drip edge': '140 lin ft' } }],
  });

  R.calc({
    id: 'board-feet', face: 'job', name: 'Board feet', blurb: 'Board feet and cost for a stack of lumber',
    keywords: ['lumber', 'bf', 'hardwood', 'cost'],
    inputs: [
      { id: 't', label: 'Thickness (inches)', kind: 'number', value: '2', min: 0.01, max: 48, zero: false },
      { id: 'w', label: 'Width (inches)', kind: 'number', value: '6', min: 0.01, max: 96, zero: false },
      { id: 'len', label: 'Length', kind: 'length', unit: 'ft', value: `12'`, zero: false },
      { id: 'n', label: 'How many boards', kind: 'int', value: '10', min: 1, max: 100000 },
      { id: 'price', label: 'Price per board foot', kind: 'money', optional: true, value: '' },
    ],
    run: function (v) {
      const each = v.t * v.w * (v.len / 12) / 12;
      return [
        { label: 'Board feet', value: R.fmt(each * v.n, 2) + ' bf', big: true },
        { label: 'Each board', value: R.fmt(each, 3) + ' bf' },
        v.price != null && { label: 'Cost', value: R.money(each * v.n * v.price) },
      ];
    },
    examples: [
      { in: {}, out: { 'Board feet': '120 bf', 'Each board': '12 bf' } },
      { in: { price: '1.25' }, out: { 'Cost': '$150.00' } },
    ],
  });

  R.calc({
    id: 'equal-spacing', face: 'job', name: 'Equal spacing', blurb: 'Balusters, pickets or posts spaced evenly in a run',
    keywords: ['baluster', 'spindle', 'picket', 'railing', 'gap', '4 inch'],
    inputs: [
      { id: 'len', label: 'Space between posts', kind: 'length', unit: 'in', value: `6'`, zero: false },
      { id: 'w', label: 'Baluster width', kind: 'length', unit: 'in', value: '1-1/2"', zero: false },
      { id: 'gap', label: 'Widest gap allowed', kind: 'length', unit: 'in', value: '4"', zero: false, help: 'Code is usually under 4"' },
    ],
    run: function (v) {
      if (v.w + v.gap > v.len) R.fail('One baluster and one gap don’t fit in that space.', 'len');
      const n = Math.max(0, up((v.len - v.gap) / (v.w + v.gap)));
      const g = (v.len - n * v.w) / (n + 1);
      return [
        { label: 'Balusters', value: n, big: true },
        { label: 'Gap between each', value: L(g) },
        { label: 'On center', value: L(g + v.w), note: 'Center to center' },
        { label: 'First center from the post', value: L(g + v.w / 2) },
      ];
    },
    examples: [{ in: {}, out: { 'Balusters': '13', 'Gap between each': `3-3/4"`, 'On center': `5-1/4"`, 'First center from the post': `4-1/2"` } }],
  });

  R.calc({
    id: 'circle-arc', face: 'job', name: 'Circle & arc', blurb: 'Circumference and area, or an arch from its width and height',
    keywords: ['radius', 'diameter', 'circumference', 'arch', 'chord', 'curve'],
    inputs: [
      { id: 'mode', label: 'I know', kind: 'choice', value: 'c', options: [['c', 'The diameter'], ['a', 'An arch’s width and height']] },
      { id: 'dia', label: 'Diameter', kind: 'length', unit: 'ft', value: `10'`, zero: false, when: function (r) { return r.mode === 'c'; } },
      { id: 'chord', label: 'Arch width (chord)', kind: 'length', unit: 'ft', value: `8'`, zero: false, when: function (r) { return r.mode === 'a'; } },
      { id: 'rise', label: 'Arch height', kind: 'length', unit: 'in', value: `1'`, zero: false, when: function (r) { return r.mode === 'a'; } },
    ],
    run: function (v) {
      if (v.mode === 'c') {
        return [
          { label: 'Circumference', value: L(Math.PI * v.dia), big: true },
          { label: 'Area', value: R.fmt(Math.PI * v.dia * v.dia / 4 / 144, 2) + ' sq ft' },
          { label: 'Radius', value: L(v.dia / 2) },
        ];
      }
      if (v.rise > v.chord / 2 + 1e-9) R.fail('An arch can be at most half as tall as it is wide.', 'rise');
      const r = (v.chord * v.chord / 4 + v.rise * v.rise) / (2 * v.rise);
      const th = 2 * Math.asin(Math.min(1, v.chord / 2 / r));
      return [
        { label: 'Radius', value: L(r), big: true, note: 'Swing the arch from this' },
        { label: 'Arc length', value: L(r * th) },
        { label: 'Arc angle', value: R.fmt(deg(th), 2) + '°' },
      ];
    },
    examples: [
      { in: {}, out: { 'Circumference': `31' 5"`, 'Area': '78.54 sq ft', 'Radius': `5' 0"` } },
      { in: { mode: 'a' }, out: { 'Radius': `8' 6"`, 'Arc length': `8' 3-15/16"`, 'Arc angle': '56.14°' } },
      { in: { mode: 'a', rise: `5'` }, error: 'rise' },
    ],
  });

  R.calc({
    id: 'crown-molding', face: 'job', name: 'Crown molding', blurb: 'Miter and bevel to cut crown flat on a compound saw',
    keywords: ['crown', 'compound miter', 'bevel', 'spring angle', 'trim', 'molding', 'moulding'],
    inputs: [
      { id: 'spring', label: 'Crown style (spring angle)', kind: 'choice', value: '38', options: [['38', '52/38 (most common)'], ['45', '45/45'], ['custom', 'Another angle']] },
      { id: 'custom', label: 'Spring angle', kind: 'number', value: '38', min: 1, max: 89, when: function (r) { return r.spring === 'custom'; } },
      { id: 'wall', label: 'Corner angle', kind: 'number', value: '90', min: 1, max: 179, help: 'A square corner is 90' },
    ],
    run: function (v) {
      const s = rad(v.spring === 'custom' ? v.custom : Number(v.spring));
      const half = rad(v.wall / 2);
      const miter = deg(Math.atan(Math.sin(s) / Math.tan(half)));
      const bevel = deg(Math.asin(Math.cos(s) * Math.cos(half)));
      return [
        { label: 'Miter', value: R.fmt(miter, 2) + '°', big: true, note: 'Bevel ' + R.fmt(bevel, 2) + '°, crown lying flat' },
        { label: 'Bevel', value: R.fmt(bevel, 2) + '°' },
        { label: 'Cutting it nested instead', value: R.fmt((180 - v.wall) / 2, 2) + '° miter, no bevel', note: 'Upside down, sitting at its spring angle against the fence' },
      ];
    },
    examples: [
      { in: {}, out: { 'Miter': '31.62°', 'Bevel': '33.86°', 'Cutting it nested instead': '45° miter, no bevel' } },
      { in: { spring: '45' }, out: { 'Miter': '35.26°', 'Bevel': '30°' } },
    ],
  });

  R.calc({
    id: 'polygon', face: 'job', name: 'Polygon', blurb: 'Hexagons, octagons and more: sizes and miter angle',
    keywords: ['hexagon', 'octagon', 'gazebo', 'miter', 'sides'],
    inputs: [
      { id: 'n', label: 'Sides', kind: 'int', value: '6', min: 3, max: 100 },
      { id: 's', label: 'Side length', kind: 'length', unit: 'in', value: '12"', zero: false },
    ],
    run: function (v) {
      const n = v.n, s = v.s;
      const R0 = s / (2 * Math.sin(Math.PI / n)), r0 = s / (2 * Math.tan(Math.PI / n));
      return [
        { label: 'Miter each end', value: R.fmt(180 / n, 2) + '°', big: true, note: 'Set the saw to this for every joint' },
        { label: 'Across the corners', value: L(2 * R0) },
        { label: 'Across the flats', value: L(2 * r0) },
        { label: 'Perimeter', value: L(n * s) },
        { label: 'Area', value: R.fmt(n * s * s / (4 * Math.tan(Math.PI / n)) / 144, 3) + ' sq ft' },
      ];
    },
    examples: [{ in: {}, out: { 'Miter each end': '30°', 'Across the corners': `2' 0"`, 'Across the flats': `1' 8-13/16"`, 'Perimeter': `6' 0"`, 'Area': '2.598 sq ft' } }],
  });

  R.calc({
    id: 'paint', face: 'job', name: 'Paint', blurb: 'Gallons for a room’s walls, any number of coats',
    keywords: ['gallons', 'coverage', 'walls', 'primer', 'coats'],
    inputs: [
      { id: 'len', label: 'Room length', kind: 'length', unit: 'ft', value: `12'`, zero: false },
      { id: 'wid', label: 'Room width', kind: 'length', unit: 'ft', value: `10'`, zero: false },
      { id: 'h', label: 'Wall height', kind: 'length', unit: 'ft', value: `8'`, zero: false },
      { id: 'open', label: 'Doors and windows to leave out', kind: 'number', value: '0', help: 'square feet' },
      { id: 'coats', label: 'Coats', kind: 'int', value: '2', min: 1, max: 10 },
      { id: 'cover', label: 'Coverage per gallon', kind: 'number', value: '350', min: 50, max: 1000, help: 'sq ft, on the can' },
    ],
    run: function (v) {
      const area = 2 * (v.len + v.wid) * v.h / 144 - v.open;
      if (area <= 0) R.fail('The doors and windows add up to more than the walls.', 'open');
      const gal = area * v.coats / v.cover;
      let whole = Math.floor(gal), qt = up((gal - whole) * 4);
      if (qt === 4) { whole++; qt = 0; }
      return [
        { label: 'Paint', value: R.fmt(gal, 2) + ' gal', big: true, note: v.coats + ' coat' + (v.coats > 1 ? 's' : '') + ' over ' + R.fmt(area, 1) + ' sq ft' },
        { label: 'To buy', value: (whole ? whole + ' gal' : '') + (whole && qt ? ' + ' : '') + (qt ? qt + ' qt' : '') || '0 gal' },
        { label: 'Wall area', value: R.fmt(area, 1) + ' sq ft' },
      ];
    },
    examples: [{ in: {}, out: { 'Paint': '2.01 gal', 'To buy': '2 gal + 1 qt', 'Wall area': '352 sq ft' } }],
  });

  R.calc({
    id: 'flooring', face: 'job', name: 'Flooring & tile', blurb: 'Square feet, boxes and tiles with waste',
    keywords: ['tile', 'laminate', 'vinyl', 'lvp', 'hardwood', 'carpet', 'boxes'],
    inputs: [
      { id: 'len', label: 'Room length', kind: 'length', unit: 'ft', value: `12'`, zero: false },
      { id: 'wid', label: 'Room width', kind: 'length', unit: 'ft', value: `10'`, zero: false },
      WASTE(10),
      { id: 'box', label: 'Square feet per box', kind: 'number', optional: true, value: '20', zero: false },
      { id: 'tl', label: 'Tile length (inches)', kind: 'number', optional: true, value: '12', zero: false },
      { id: 'tw', label: 'Tile width (inches)', kind: 'number', optional: true, value: '12', zero: false },
      { id: 'price', label: 'Price per square foot', kind: 'money', optional: true, value: '' },
    ],
    run: function (v) {
      const area = v.len * v.wid / 144, need = area * (1 + v.waste / 100);
      if ((v.tl == null) !== (v.tw == null)) R.fail('Give both tile sizes, or leave both empty.', v.tl == null ? 'tl' : 'tw');
      return [
        { label: 'Flooring needed', value: R.fmt(need, 1) + ' sq ft', big: true, note: R.fmt(area, 1) + ' sq ft room + ' + R.fmt(v.waste, 2) + '% extra' },
        v.box != null && { label: 'Boxes', value: up(need / v.box) },
        v.tl != null && { label: 'Tiles', value: up(need / (v.tl * v.tw / 144)) },
        v.price != null && { label: 'Cost', value: R.money(need * v.price) },
      ];
    },
    examples: [
      { in: {}, out: { 'Flooring needed': '132 sq ft', 'Boxes': '7', 'Tiles': '132' } },
      { in: { price: '3.49' }, out: { 'Cost': '$460.68' } },
      { in: { tw: '' }, error: 'tw' },
    ],
  });

  const TONS = { gravel: 1.4, sand: 1.35, topsoil: 1.1, mulch: null };
  R.calc({
    id: 'landscape', face: 'job', name: 'Gravel, mulch, sand', blurb: 'Yards, tons and bags of bulk material',
    keywords: ['gravel', 'stone', 'mulch', 'sand', 'topsoil', 'dirt', 'tons', 'yards', 'bags'],
    inputs: [
      { id: 'mat', label: 'Material', kind: 'choice', value: 'gravel', options: [['gravel', 'Gravel / crushed stone'], ['sand', 'Sand'], ['topsoil', 'Topsoil'], ['mulch', 'Mulch']] },
      { id: 'len', label: 'Length', kind: 'length', unit: 'ft', value: `10'`, zero: false },
      { id: 'wid', label: 'Width', kind: 'length', unit: 'ft', value: `10'`, zero: false },
      { id: 'dep', label: 'Depth', kind: 'length', unit: 'in', value: '3"', zero: false },
      { id: 'bag', label: 'Bag size (cubic feet)', kind: 'number', value: '2', min: 0.1, max: 100 },
    ],
    run: function (v) {
      const cuft = v.len * v.wid * v.dep / 1728, yd = cuft / 27, t = TONS[v.mat];
      return [
        { label: 'Bulk', value: R.fmt(yd, 2) + ' cu yd', big: true },
        t && { label: 'Weight', value: R.fmt(yd * t, 2) + ' tons', note: 'Typical dry ' + v.mat + ' is about ' + R.fmt(t * 2000, 0) + ' lb a yard; ask the yard' },
        { label: R.fmt(v.bag, 2) + ' cu ft bags', value: up(cuft / v.bag) },
        { label: 'Cubic feet', value: R.fmt(cuft, 1) + ' cu ft' },
      ];
    },
    examples: [
      { in: {}, out: { 'Bulk': '0.93 cu yd', 'Weight': '1.3 tons', '2 cu ft bags': '13', 'Cubic feet': '25 cu ft' } },
      { in: { mat: 'mulch' }, out: { 'Bulk': '0.93 cu yd', '2 cu ft bags': '13' } },
    ],
  });

  R.calc({
    id: 'square-footage', face: 'job', name: 'Square footage', blurb: 'Add up to three rectangles into one area',
    keywords: ['area', 'sq ft', 'room', 'floor', 'square yards'],
    inputs: [
      { id: 'l1', label: 'Length 1', kind: 'length', unit: 'ft', value: `12'`, zero: false },
      { id: 'w1', label: 'Width 1', kind: 'length', unit: 'ft', value: `10'`, zero: false },
      { id: 'l2', label: 'Length 2', kind: 'length', unit: 'ft', optional: true, value: `8'` },
      { id: 'w2', label: 'Width 2', kind: 'length', unit: 'ft', optional: true, value: `6'` },
      { id: 'l3', label: 'Length 3', kind: 'length', unit: 'ft', optional: true, value: '' },
      { id: 'w3', label: 'Width 3', kind: 'length', unit: 'ft', optional: true, value: '' },
    ],
    run: function (v) {
      let total = v.l1 * v.w1;
      [['l2', 'w2', 2], ['l3', 'w3', 3]].forEach(function (p) {
        if ((v[p[0]] == null) !== (v[p[1]] == null)) R.fail('Rectangle ' + p[2] + ' needs both a length and a width.', v[p[0]] == null ? p[0] : p[1]);
        if (v[p[0]] != null) total += v[p[0]] * v[p[1]];
      });
      const sqft = total / 144;
      return [
        { label: 'Area', value: R.fmt(sqft, 2) + ' sq ft', big: true },
        { label: 'Square yards', value: R.fmt(sqft / 9, 2) + ' sq yd' },
        { label: 'Square meters', value: R.fmt(sqft * 0.09290304, 2) + ' m²' },
      ];
    },
    examples: [
      { in: {}, out: { 'Area': '168 sq ft', 'Square yards': '18.67 sq yd', 'Square meters': '15.61 m²' } },
      { in: { w2: '' }, error: 'w2' },
    ],
  });

  const UNITS = { brick: [7.625, 2.25, 'Standard bricks'], block: [15.625, 7.625, '8 × 8 × 16 blocks'], block12: [15.625, 11.625, '12" tall blocks'] };
  R.calc({
    id: 'brick-block', face: 'job', name: 'Brick & block', blurb: 'Bricks or concrete blocks for a wall',
    keywords: ['cmu', 'cinder block', 'brick', 'masonry', 'wall'],
    inputs: [
      { id: 'unit', label: 'Unit', kind: 'choice', value: 'block', options: [['block', '8 × 8 × 16 block'], ['brick', 'Modular brick'], ['block12', '12" tall block']] },
      { id: 'len', label: 'Wall length', kind: 'length', unit: 'ft', value: `20'`, zero: false },
      { id: 'h', label: 'Wall height', kind: 'length', unit: 'ft', value: `8'`, zero: false },
      { id: 'joint', label: 'Mortar joint', kind: 'length', unit: 'in', value: '3/8"' },
      WASTE(5),
    ],
    run: function (v) {
      const u = UNITS[v.unit];
      const per = 144 / ((u[0] + v.joint) * (u[1] + v.joint));
      const area = v.len * v.h / 144;
      return [
        { label: u[2], value: up(area * per * (1 + v.waste / 100)), big: true, note: 'With ' + R.fmt(v.waste, 2) + '% extra' },
        { label: 'Per square foot', value: R.fmt(per, 3) },
        { label: 'Wall area', value: R.fmt(area, 1) + ' sq ft' },
      ];
    },
    examples: [
      { in: {}, out: { '8 × 8 × 16 blocks': '189', 'Per square foot': '1.125', 'Wall area': '160 sq ft' } },
      { in: { unit: 'brick' }, out: { 'Standard bricks': '1152', 'Per square foot': '6.857' } },
    ],
  });

  R.calc({
    id: 'grade-slope', face: 'job', name: 'Grade & slope', blurb: 'Fall over a run for drains, pipe and grading',
    keywords: ['drain', 'pipe', 'fall', 'drop', 'slope', '1/4 inch per foot', 'grading', 'percent'],
    inputs: [
      { id: 'mode', label: 'I know', kind: 'choice', value: 'drop', options: [['drop', 'The run and the slope'], ['slope', 'The run and the drop']] },
      { id: 'run', label: 'Run (distance)', kind: 'length', unit: 'ft', value: `40'`, zero: false },
      { id: 'per', label: 'Slope (inches per foot)', kind: 'number', value: '1/4', min: 0.0001, max: 120, when: function (r) { return r.mode === 'drop'; } },
      { id: 'drop', label: 'Drop', kind: 'length', unit: 'in', value: '6"', zero: false, when: function (r) { return r.mode === 'slope'; } },
    ],
    run: function (v) {
      const perFt = v.mode === 'drop' ? v.per : v.drop / (v.run / 12);
      const drop = v.mode === 'drop' ? v.per * v.run / 12 : v.drop;
      return [
        v.mode === 'drop' ? { label: 'Drop', value: L(drop), big: true } : { label: 'Slope', value: R.fmt(perFt, 3) + '" per foot', big: true },
        v.mode === 'slope' && { label: 'Drop', value: L(drop) },
        { label: 'Percent', value: R.fmt(perFt / 12 * 100, 2) + '%' },
        { label: 'Angle', value: R.fmt(deg(Math.atan(perFt / 12)), 2) + '°' },
        { label: 'Ratio', value: '1 in ' + R.fmt(12 / perFt, 1) },
      ];
    },
    examples: [
      { in: {}, out: { 'Drop': `10"`, 'Percent': '2.08%', 'Angle': '1.19°', 'Ratio': '1 in 48' } },
      { in: { mode: 'slope', run: `20'`, drop: '6"' }, out: { 'Slope': '0.3" per foot', 'Percent': '2.5%', 'Angle': '1.43°' } },
    ],
  });
})(globalThis.Reckon = globalThis.Reckon || {});
