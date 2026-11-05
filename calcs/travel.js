/* Reckon: the Travel face. */
(function (R) {
  'use strict';
  const hm = function (hours) { const m = Math.round(hours * 60); return Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; };

  R.calc({
    id: 'fuel-cost', face: 'travel', name: 'Trip fuel cost', blurb: 'Gallons and cost for a drive',
    keywords: ['gas', 'fuel', 'trip', 'cost', 'road trip', 'diesel'],
    inputs: [
      { id: 'mi', label: 'Distance (miles)', kind: 'number', value: '240', zero: false, max: 1e6 },
      { id: 'mpg', label: 'Miles per gallon', kind: 'number', value: '24', zero: false, max: 1000 },
      { id: 'ppg', label: 'Price per gallon', kind: 'money', value: '3.29' },
      { id: 'rt', label: 'Round trip?', kind: 'choice', value: 'no', options: [['no', 'One way'], ['yes', 'Round trip']] },
    ],
    run: function (v) {
      const mi = v.mi * (v.rt === 'yes' ? 2 : 1), gal = mi / v.mpg;
      return [
        { label: 'Fuel cost', value: R.money(gal * v.ppg), big: true, note: R.fmt(mi, 1) + ' miles' },
        { label: 'Gallons', value: R.fmt(gal, 2) },
        { label: 'Per mile', value: '$' + R.fmt(v.ppg / v.mpg, 3) },
      ];
    },
    examples: [
      { in: {}, out: { 'Fuel cost': '$32.90', 'Gallons': '10' } },
      { in: { rt: 'yes' }, out: { 'Fuel cost': '$65.80', 'Gallons': '20' } },
    ],
  });

  R.calc({
    id: 'mpg', face: 'travel', name: 'Gas mileage', blurb: 'Miles per gallon from a fill-up, and L/100 km',
    keywords: ['mpg', 'fuel economy', 'fill up', 'l/100km'],
    inputs: [
      { id: 'mi', label: 'Miles since last fill-up', kind: 'number', value: '312', zero: false, max: 1e6 },
      { id: 'gal', label: 'Gallons to refill', kind: 'number', value: '12.5', zero: false, max: 1e5 },
      { id: 'ppg', label: 'Price per gallon', kind: 'money', optional: true, value: '' },
    ],
    run: function (v) {
      const mpg = v.mi / v.gal;
      return [
        { label: 'Miles per gallon', value: R.fmt(mpg, 2) + ' mpg', big: true },
        { label: 'Liters per 100 km', value: R.fmt(235.214583 / mpg, 2) },
        v.ppg != null && { label: 'Cost per mile', value: '$' + R.fmt(v.ppg / mpg, 3) },
      ];
    },
    examples: [{ in: {}, out: { 'Miles per gallon': '24.96 mpg', 'Liters per 100 km': '9.42' } }],
  });

  R.calc({
    id: 'speed-distance-time', face: 'travel', name: 'Speed, distance, time', blurb: 'Know two, get the third',
    keywords: ['eta', 'drive time', 'how long', 'average speed', 'mph'],
    inputs: [
      { id: 'mode', label: 'Find', kind: 'choice', value: 't', options: [['t', 'Time'], ['d', 'Distance'], ['s', 'Speed']] },
      { id: 'd', label: 'Distance (miles)', kind: 'number', value: '150', zero: false, max: 1e7, when: function (r) { return r.mode !== 'd'; } },
      { id: 's', label: 'Speed (mph)', kind: 'number', value: '60', zero: false, max: 1e6, when: function (r) { return r.mode !== 's'; } },
      { id: 'h', label: 'Hours', kind: 'int', value: '3', min: 0, max: 1e6, when: function (r) { return r.mode !== 't'; } },
      { id: 'm', label: 'Minutes', kind: 'int', value: '15', min: 0, max: 59, when: function (r) { return r.mode !== 't'; } },
    ],
    run: function (v) {
      const hours = v.mode !== 't' ? v.h + v.m / 60 : null;
      if (hours === 0) R.fail('The time is zero.', 'h');
      if (v.mode === 't') return [{ label: 'Time', value: hm(v.d / v.s), big: true }, { label: 'Decimal hours', value: R.fmt(v.d / v.s, 2) }];
      if (v.mode === 'd') return [{ label: 'Distance', value: R.fmt(v.s * hours, 2) + ' miles', big: true }, { label: 'Kilometers', value: R.fmt(v.s * hours * 1.609344, 2) + ' km' }];
      return [{ label: 'Speed', value: R.fmt(v.d / hours, 2) + ' mph', big: true }, { label: 'Kilometers an hour', value: R.fmt(v.d / hours * 1.609344, 2) + ' km/h' }];
    },
    examples: [
      { in: {}, out: { 'Time': '2 h 30 min', 'Decimal hours': '2.5' } },
      { in: { mode: 'd', s: '65' }, out: { 'Distance': '211.25 miles' } },
      { in: { mode: 's', d: '100', h: '1', m: '40' }, out: { 'Speed': '60 mph' } },
      { in: { mode: 's', h: '0', m: '0' }, error: 'h' },
    ],
  });

  R.calc({
    id: 'pace', face: 'travel', name: 'Pace', blurb: 'Pace per mile and per km from a distance and a time',
    keywords: ['running', 'walking', 'pace', 'race', '5k', 'marathon'],
    inputs: [
      { id: 'd', label: 'Distance', kind: 'number', value: '5', zero: false, max: 1e5 },
      { id: 'u', label: 'Measured in', kind: 'choice', value: 'km', options: [['km', 'Kilometers'], ['mi', 'Miles']] },
      { id: 'h', label: 'Hours', kind: 'int', value: '0', min: 0, max: 1000 },
      { id: 'm', label: 'Minutes', kind: 'int', value: '25', min: 0, max: 59 },
      { id: 's', label: 'Seconds', kind: 'int', value: '0', min: 0, max: 59 },
    ],
    run: function (v) {
      const sec = v.h * 3600 + v.m * 60 + v.s;
      if (!sec) R.fail('The time is zero.', 'm');
      const km = v.u === 'km' ? v.d : v.d * 1.609344, mi = km / 1.609344;
      const ms = function (t) { t = Math.round(t); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); };
      return [
        { label: 'Per mile', value: ms(sec / mi), big: true, note: 'minutes:seconds' },
        { label: 'Per km', value: ms(sec / km) },
        { label: 'Speed', value: R.fmt(mi / (sec / 3600), 2) + ' mph' },
        { label: 'Speed (km/h)', value: R.fmt(km / (sec / 3600), 2) + ' km/h' },
      ];
    },
    examples: [{ in: {}, out: { 'Per mile': '8:03', 'Per km': '5:00', 'Speed': '7.46 mph', 'Speed (km/h)': '12 km/h' } }],
  });

  R.calc({
    id: 'coord-distance', face: 'travel', name: 'Distance between places', blurb: 'Straight-line distance from two latitude/longitude points',
    keywords: ['gps', 'coordinates', 'latitude', 'longitude', 'as the crow flies', 'map'],
    inputs: [
      { id: 'lat1', label: 'From latitude', kind: 'number', value: '0', min: -90, max: 90, negative: true },
      { id: 'lon1', label: 'From longitude', kind: 'number', value: '0', min: -180, max: 180, negative: true },
      { id: 'lat2', label: 'To latitude', kind: 'number', value: '0', min: -90, max: 90, negative: true },
      { id: 'lon2', label: 'To longitude', kind: 'number', value: '1', min: -180, max: 180, negative: true },
    ],
    run: function (v) {
      const r = Math.PI / 180, p1 = v.lat1 * r, p2 = v.lat2 * r, dp = (v.lat2 - v.lat1) * r, dl = (v.lon2 - v.lon1) * r;
      const a = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
      const c = 2 * Math.asin(Math.min(1, Math.sqrt(a)));
      const brg = (Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) / r + 360) % 360;
      const compass = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(brg / 45) % 8];
      return [
        { label: 'Distance', value: R.fmt(c * 3958.7613, 2) + ' mi', big: true, note: 'Straight line over the earth; roads run longer' },
        { label: 'Kilometers', value: R.fmt(c * 6371.0088, 2) + ' km' },
        { label: 'Heading', value: R.fmt(brg, 1) + '° ' + compass },
      ];
    },
    examples: [
      { in: {}, out: { 'Distance': '69.09 mi', 'Kilometers': '111.2 km', 'Heading': '90° E' } },
      { in: { lat1: '91' }, error: 'lat1' },
    ],
  });

  R.calc({
    id: 'mileage-pay', face: 'travel', name: 'Mileage pay', blurb: 'What miles driven for work pay back',
    keywords: ['reimbursement', 'irs', 'mileage', 'work miles', 'expense'],
    inputs: [
      { id: 'mi', label: 'Miles', kind: 'number', value: '120', max: 1e6 },
      { id: 'rate', label: 'Rate per mile', kind: 'money', value: '0.70', help: 'IRS rate was $0.70 for 2025; check this year’s' },
    ],
    run: function (v) { return [{ label: 'Pays back', value: R.money(v.mi * v.rate), big: true }]; },
    examples: [{ in: {}, out: { 'Pays back': '$84.00' } }],
  });
})(globalThis.Reckon = globalThis.Reckon || {});
