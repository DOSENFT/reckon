/* Reckon: the Job site face. Every example below was worked by hand before it was written down. */
(function (R) {
  'use strict';
  const L = function (inches) { return R.formatFtIn(inches); };
  const slope = function (p) { return Math.sqrt(1 + (p / 12) * (p / 12)); };   // rafter length per unit of run

  R.calc({
    id: 'rafter', face: 'job', name: 'Common rafter', blurb: 'Rafter length, overhang and plumb cut from span and pitch',
    keywords: ['roof', 'pitch', 'birdsmouth', 'gable', 'ridge'],
    inputs: [
      { id: 'span', label: 'Building span', kind: 'length', unit: 'ft', value: "24'", zero: false, help: 'Outside wall to outside wall' },
      { id: 'pitch', label: 'Pitch (rise per 12)', kind: 'number', value: '6', min: 0.25, max: 24, help: 'A 6/12 roof is 6' },
      { id: 'ridge', label: 'Ridge board thickness', kind: 'length', unit: 'in', value: '1-1/2"' },
      { id: 'over', label: 'Overhang (level)', kind: 'length', unit: 'in', value: '12"', help: 'Measured level, past the wall' },
    ],
    run: function (v) {
      const run = v.span / 2 - v.ridge / 2;
      if (run <= 0) R.fail('The ridge board is wider than the span.', 'ridge');
      const k = slope(v.pitch);
      const rafter = run * k, tail = v.over * k;
      const angle = Math.atan(v.pitch / 12) * 180 / Math.PI;
      return [
        { label: 'Rafter length', value: L(rafter + tail), big: true, note: 'Ridge plumb cut to tail, along the top edge line' },
        { label: 'Ridge to wall line', value: L(rafter) },
        { label: 'Overhang (on the rafter)', value: L(tail) },
        { label: 'Rise at the wall line', value: L(run * v.pitch / 12) },
        { label: 'Roof angle', value: R.fmt(angle, 2) + '°' },
        { label: 'Plumb cut', value: 'Square at ' + R.fmt(v.pitch, 3) + ' and 12', note: R.fmt(v.pitch, 3) + ' on the tongue, 12 on the blade' },
      ];
    },
    examples: [
      { in: {}, out: { 'Rafter length': `14' 5-9/16"`, 'Ridge to wall line': `13' 4-3/16"`, 'Overhang (on the rafter)': `1' 1-7/16"`, 'Rise at the wall line': `5' 11-5/8"`, 'Roof angle': '26.57°' } },
    ],
  });

  R.calc({
    id: 'stairs', face: 'job', name: 'Stairs', blurb: 'Risers, treads and stringer length from the total rise',
    keywords: ['stringer', 'riser', 'tread', 'steps', 'staircase'],
    inputs: [
      { id: 'rise', label: 'Total rise', kind: 'length', unit: 'in', value: `9'`, zero: false, help: 'Finished floor to finished floor' },
      { id: 'maxR', label: 'Tallest riser allowed', kind: 'length', unit: 'in', value: '7-3/4"', zero: false, help: 'Most US homes: 7-3/4" (IRC)' },
      { id: 'tread', label: 'Tread depth (run per step)', kind: 'length', unit: 'in', value: '10"', zero: false, help: 'Most US homes: at least 10" (IRC)' },
    ],
    run: function (v) {
      if (v.rise > 50 * 12) R.fail('That rise is taller than 50 feet. Check it.', 'rise');
      const n = Math.ceil(v.rise / v.maxR - 1e-9);
      const r = v.rise / n, treads = n - 1;
      const totalRun = treads * v.tread;
      const angle = Math.atan(r / v.tread) * 180 / Math.PI;
      const comfort = 2 * r + v.tread;
      const ok = r <= 7.75 + 1e-9 && v.tread >= 10 - 1e-9;
      return [
        { label: 'Risers', value: n, big: true, note: 'Each ' + L(r) + ' tall' },
        { label: 'Riser height', value: L(r) },
        { label: 'Treads', value: treads },
        { label: 'Total run', value: L(totalRun) },
        { label: 'Stringer length', value: L(Math.hypot(totalRun, v.rise)), note: 'Along the slope; buy the board longer' },
        { label: 'Stair angle', value: R.fmt(angle, 1) + '°' },
        { label: 'Comfort (2 risers + tread)', value: R.fmt(comfort, 2) + '"', note: comfort >= 24 && comfort <= 25.5 ? 'Comfortable (24" to 25-1/2")' : 'Outside the comfortable 24" to 25-1/2"' },
        { label: 'Usual US code (IRC)', value: ok ? 'Meets it' : 'Check local code', note: 'Riser up to 7-3/4", tread at least 10"' },
      ];
    },
    examples: [
      { in: {}, out: { 'Risers': '14', 'Riser height': `7-11/16"`, 'Treads': '13', 'Total run': `10' 10"`, 'Stringer length': `14' 1"`, 'Stair angle': '37.6°', 'Usual US code (IRC)': 'Meets it' } },
      { in: { rise: '0' }, error: 'rise' },
    ],
  });

  const BAG_CUFT = { 80: 0.6, 60: 0.45, 40: 0.3 };
  R.calc({
    id: 'concrete-slab', face: 'job', name: 'Concrete slab', blurb: 'Cubic yards and bags for a slab, patio or pad',
    keywords: ['concrete', 'yards', 'patio', 'pad', 'bags', 'quikrete', 'sakrete'],
    inputs: [
      { id: 'len', label: 'Length', kind: 'length', unit: 'ft', value: `20'`, zero: false },
      { id: 'wid', label: 'Width', kind: 'length', unit: 'ft', value: `12'`, zero: false },
      { id: 'thick', label: 'Thickness', kind: 'length', unit: 'in', value: '4"', zero: false },
      { id: 'waste', label: 'Extra for waste', kind: 'percent', value: '10', max: 100 },
      { id: 'bag', label: 'Bag size', kind: 'choice', value: '80', options: [['80', '80 lb (0.60 cu ft)'], ['60', '60 lb (0.45 cu ft)'], ['40', '40 lb (0.30 cu ft)']] },
      { id: 'price', label: 'Price per cubic yard', kind: 'money', optional: true, value: '' },
    ],
    run: function (v) {
      const cuft = v.len * v.wid * v.thick / 1728 * (1 + v.waste / 100);
      const yd = cuft / 27;
      return [
        { label: 'Concrete', value: R.fmt(yd, 2) + ' cu yd', big: true, note: 'Includes ' + R.fmt(v.waste, 2) + '% extra. Order ' + R.fmt(Math.ceil(yd * 4) / 4, 2) + ' yd (next quarter yard).' },
        { label: 'Cubic feet', value: R.fmt(cuft, 1) + ' cu ft' },
        { label: v.bag + ' lb bags', value: Math.ceil(cuft / BAG_CUFT[v.bag] - 1e-9) },
        v.price != null && { label: 'Cost', value: R.money(yd * v.price) },
      ];
    },
    examples: [
      { in: {}, out: { 'Concrete': '3.26 cu yd', 'Cubic feet': '88 cu ft', '80 lb bags': '147' } },
      { in: { bag: '60', price: '165' }, out: { '60 lb bags': '196', 'Cost': '$537.78' } },
      { in: { thick: '' }, error: 'thick' },
      { in: { len: '-3' }, error: 'len' },
    ],
  });
})(globalThis.Reckon = globalThis.Reckon || {});
