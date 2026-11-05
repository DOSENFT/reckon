/* Reckon: the Time & date face. Day counts checked by hand against a calendar. */
(function (R) {
  'use strict';
  const DAYS = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday']];
  const today = function () { return R.todayIso(); };

  // ---- Time card: in, out and break for each day of a week ----
  const cardInputs = [];
  DAYS.forEach(function (d, i) {
    const work = i < 5;
    cardInputs.push({ id: d[0] + 'In', label: d[1] + ': in', kind: 'time', optional: true, value: work ? '07:00' : '' });
    cardInputs.push({ id: d[0] + 'Out', label: d[1] + ': out', kind: 'time', optional: true, value: work ? '15:30' : '' });
    cardInputs.push({ id: d[0] + 'Brk', label: d[1] + ': unpaid break (minutes)', kind: 'int', optional: true, value: work ? '30' : '', min: 0, max: 1440 });
  });
  cardInputs.push({ id: 'rate', label: 'Hourly rate', kind: 'money', optional: true, value: '' });
  cardInputs.push({ id: 'ot', label: 'Overtime after (hours a week)', kind: 'number', value: '40', min: 0, max: 168 });
  cardInputs.push({ id: 'otx', label: 'Overtime pay', kind: 'choice', value: '1.5', options: [['1.5', 'Time and a half'], ['2', 'Double time'], ['1', 'No overtime pay']] });

  R.calc({
    id: 'time-card', face: 'time', name: 'Time card', blurb: 'A week of in and out times: hours, overtime and pay',
    keywords: ['timesheet', 'hours worked', 'payroll', 'clock in', 'overtime', 'crew'],
    inputs: cardInputs,
    run: function (v) {
      let total = 0;
      const days = [];
      DAYS.forEach(function (d) {
        const a = v[d[0] + 'In'], b = v[d[0] + 'Out'], brk = v[d[0] + 'Brk'] || 0;
        if (a == null && b == null) return;
        if (a == null || b == null) R.fail(d[1] + ' needs both an in and an out time.', a == null ? d[0] + 'In' : d[0] + 'Out');
        let mins = b - a; if (mins <= 0) mins += 1440;          // past midnight
        if (brk >= mins) R.fail(d[1] + ': the break is as long as the shift.', d[0] + 'Brk');
        mins -= brk; total += mins;
        days.push({ label: d[1], value: R.hm(mins), note: R.fmt(mins / 60, 2) + ' h' });
      });
      if (!days.length) R.fail('Enter at least one day’s in and out times.', 'monIn');
      const reg = Math.min(total, v.ot * 60), ot = total - reg;
      const out = [
        { label: 'Total hours', value: R.hm(total), big: true, note: R.fmt(total / 60, 2) + ' hours' },
        { label: 'Regular', value: R.fmt(reg / 60, 2) + ' h' },
        { label: 'Overtime', value: R.fmt(ot / 60, 2) + ' h' },
      ];
      if (v.rate != null) out.push({ label: 'Pay', value: R.money(reg / 60 * v.rate + ot / 60 * v.rate * Number(v.otx)), note: ot ? 'Overtime at ' + R.money(v.rate * Number(v.otx)) + ' an hour' : '' });
      return out.concat(days);
    },
    examples: [
      { in: {}, out: { 'Total hours': '40:00', 'Regular': '40 h', 'Overtime': '0 h', 'Monday': '8:00' } },
      { in: { satIn: '7:00', satOut: '12:00', rate: '25' }, out: { 'Total hours': '45:00', 'Overtime': '5 h', 'Pay': '$1,187.50' } },
      { in: { monIn: '22:00', monOut: '6:00', monBrk: '0' }, out: { 'Monday': '8:00', 'Total hours': '40:00' } },
      { in: { monOut: '' }, error: 'monOut' },
    ],
  });

  R.calc({
    id: 'hours-between', face: 'time', name: 'Hours between times', blurb: 'How long from one time to another, minus a break',
    keywords: ['duration', 'shift', 'how long', 'elapsed'],
    inputs: [
      { id: 'a', label: 'Start', kind: 'time', value: '07:30' },
      { id: 'b', label: 'End', kind: 'time', value: '16:15' },
      { id: 'brk', label: 'Break (minutes)', kind: 'int', value: '0', min: 0, max: 1440 },
    ],
    run: function (v) {
      let m = v.b - v.a; if (m <= 0) m += 1440;
      if (v.brk >= m) R.fail('The break is as long as the whole time.', 'brk');
      m -= v.brk;
      return [
        { label: 'Time', value: R.hm(m), big: true, note: Math.floor(m / 60) + ' h ' + (m % 60) + ' min' + (v.b <= v.a ? ', past midnight' : '') },
        { label: 'Decimal hours', value: R.fmt(m / 60, 2) },
        { label: 'Minutes', value: R.fmt(m, 0) },
      ];
    },
    examples: [
      { in: {}, out: { 'Time': '8:45', 'Decimal hours': '8.75', 'Minutes': '525' } },
      { in: { a: '22:00', b: '6:00' }, out: { 'Time': '8:00' } },
      { in: { a: '25:00' }, error: 'a' },
    ],
  });

  R.calc({
    id: 'add-time', face: 'time', name: 'Add or subtract time', blurb: 'A clock time plus or minus hours and minutes',
    keywords: ['clock', 'add hours', 'later', 'earlier', 'deadline'],
    inputs: [
      { id: 't', label: 'Start time', kind: 'time', value: '09:45' },
      { id: 'dir', label: 'Do', kind: 'choice', value: '1', options: [['1', 'Add'], ['-1', 'Subtract']] },
      { id: 'h', label: 'Hours', kind: 'int', value: '2', min: 0, max: 100000 },
      { id: 'm', label: 'Minutes', kind: 'int', value: '30', min: 0, max: 100000 },
    ],
    run: function (v) {
      const raw = v.t + Number(v.dir) * (v.h * 60 + v.m);
      const dayShift = Math.floor(raw / 1440);
      return [
        { label: 'Time', value: R.clock12(raw), big: true, note: dayShift === 0 ? 'Same day' : (dayShift > 0 ? R.plural(dayShift, 'day') + ' later' : R.plural(-dayShift, 'day') + ' earlier') },
        { label: '24-hour', value: R.clock24(raw) },
      ];
    },
    examples: [
      { in: {}, out: { 'Time': '12:15 PM', '24-hour': '12:15' } },
      { in: { t: '23:00', h: '3', m: '0' }, out: { 'Time': '2:00 AM' } },
      { in: { t: '1:00', dir: '-1', h: '2', m: '0' }, out: { 'Time': '11:00 PM', '24-hour': '23:00' } },
    ],
  });

  R.calc({
    id: 'date-diff', face: 'time', name: 'Days between dates', blurb: 'Days, weeks and months from one date to another',
    keywords: ['countdown', 'how many days', 'until', 'since', 'duration', 'calendar'],
    inputs: [
      { id: 'a', label: 'From', kind: 'date', value: today() },
      { id: 'b', label: 'To', kind: 'date', value: '2026-12-25' },
      { id: 'inc', label: 'Count the last day too?', kind: 'choice', value: 'no', options: [['no', 'No'], ['yes', 'Yes']] },
    ],
    run: function (v) {
      const days = R.daysBetween(v.a, v.b) + (v.inc === 'yes' ? Math.sign(v.b - v.a || 1) : 0);
      const ad = Math.abs(days), r = R.ymd(v.a, v.b);
      return [
        { label: 'Days', value: R.fmt(days, 0), big: true, note: days < 0 ? 'The second date is earlier' : '' },
        { label: 'Weeks', value: R.plural(Math.floor(ad / 7), 'week') + (ad % 7 ? ', ' + R.plural(ad % 7, 'day') : '') },
        { label: 'Months and days', value: R.ymdText(r) },
        { label: 'From', value: R.longDate(v.a) },
        { label: 'To', value: R.longDate(v.b) },
      ];
    },
    examples: [
      { in: { a: '2026-01-01', b: '2026-12-25' }, out: { 'Days': '358', 'Weeks': '51 weeks, 1 day', 'Months and days': '11 months, 24 days' } },
      { in: { a: '2026-11-05', b: '2026-11-05' }, out: { 'Days': '0' } },
      { in: { a: '2026-02-30' }, error: 'a' },
    ],
  });

  R.calc({
    id: 'date-add', face: 'time', name: 'Add days to a date', blurb: 'A date plus or minus days, weeks or months',
    keywords: ['due date', 'deadline', 'from today', 'days later', 'warranty'],
    inputs: [
      { id: 'a', label: 'Start date', kind: 'date', value: today() },
      { id: 'dir', label: 'Do', kind: 'choice', value: '1', options: [['1', 'Add'], ['-1', 'Subtract']] },
      { id: 'n', label: 'How many', kind: 'int', value: '90', min: 0, max: 1000000 },
      { id: 'unit', label: 'Of', kind: 'choice', value: 'd', options: [['d', 'Days'], ['w', 'Weeks'], ['m', 'Months'], ['y', 'Years']] },
    ],
    run: function (v) {
      const n = Number(v.dir) * v.n;
      const t = v.unit === 'd' ? v.a + n * R.DAY : v.unit === 'w' ? v.a + n * 7 * R.DAY : R.addMonths(v.a, v.unit === 'm' ? n : n * 12);
      if (!(t >= Date.UTC(1, 0, 1) && t <= Date.UTC(9999, 11, 31))) R.fail('That lands outside the years 1 to 9999.', 'n');
      return [
        { label: 'Date', value: R.longDate(t), big: true },
        { label: 'As numbers', value: R.iso(t) },
      ];
    },
    examples: [
      { in: { a: '2026-11-05' }, out: { 'Date': 'Wednesday, February 3, 2027', 'As numbers': '2027-02-03' } },
      { in: { a: '2026-01-31', n: '1', unit: 'm' }, out: { 'As numbers': '2026-02-28' } },
      { in: { a: '2026-11-05', dir: '-1', n: '1', unit: 'w' }, out: { 'As numbers': '2026-10-29' } },
    ],
  });

  R.calc({
    id: 'business-days', face: 'time', name: 'Business days', blurb: 'Weekdays between two dates, skipping US holidays if you like',
    keywords: ['working days', 'weekdays', 'lead time', 'holidays'],
    inputs: [
      { id: 'a', label: 'From', kind: 'date', value: '2026-11-02' },
      { id: 'b', label: 'To', kind: 'date', value: '2026-11-13' },
      { id: 'hol', label: 'Skip US federal holidays?', kind: 'choice', value: 'no', options: [['no', 'No'], ['yes', 'Yes']] },
    ],
    run: function (v) {
      if (v.b < v.a) R.fail('The second date is before the first.', 'b');
      if (R.daysBetween(v.a, v.b) > 366 * 50) R.fail('Up to 50 years at a time.', 'b');
      const hol = {}, skipped = [];
      if (v.hol === 'yes') {
        for (let y = new Date(v.a).getUTCFullYear(); y <= new Date(v.b).getUTCFullYear(); y++) R.usHolidays(y).forEach(function (h) { hol[h[1]] = h[0]; });
      }
      let n = 0;
      for (let t = v.a; t <= v.b; t += R.DAY) {
        const w = new Date(t).getUTCDay();
        if (w === 0 || w === 6) continue;
        if (hol[t]) { skipped.push(hol[t]); continue; }
        n++;
      }
      return [
        { label: 'Business days', value: n, big: true, note: 'Counting both dates' },
        { label: 'Calendar days', value: R.daysBetween(v.a, v.b) + 1 },
        v.hol === 'yes' && { label: 'Holidays skipped', value: skipped.length ? skipped.join(', ') : 'None' },
      ];
    },
    examples: [
      { in: {}, out: { 'Business days': '10', 'Calendar days': '12' } },
      { in: { hol: 'yes' }, out: { 'Business days': '9', 'Holidays skipped': 'Veterans Day' } },
      { in: { a: '2026-12-21', b: '2027-01-01', hol: 'yes' }, out: { 'Business days': '8', 'Holidays skipped': 'Christmas Day, New Year’s Day' } },
    ],
  });

  R.calc({
    id: 'age', face: 'time', name: 'Age', blurb: 'Exact age, and days to the next birthday',
    keywords: ['birthday', 'how old', 'born'],
    inputs: [
      { id: 'b', label: 'Born', kind: 'date', value: '1990-06-15' },
      { id: 'on', label: 'On this date', kind: 'date', value: today() },
    ],
    run: function (v) {
      if (v.on < v.b) R.fail('That date is before the birthday.', 'on');
      const r = R.ymd(v.b, v.on);
      const bd = new Date(v.b);
      let next = Date.UTC(new Date(v.on).getUTCFullYear(), bd.getUTCMonth(), bd.getUTCDate());
      if (next <= v.on) next = R.addMonths(next, 12);
      return [
        { label: 'Age', value: R.ymdText(r), big: true },
        { label: 'In days', value: R.fmt(R.daysBetween(v.b, v.on), 0) },
        { label: 'Next birthday', value: 'In ' + R.plural(R.daysBetween(v.on, next), 'day'), note: R.longDate(next) },
        { label: 'Born on a', value: R.weekday(v.b) },
      ];
    },
    examples: [
      { in: { on: '2026-11-05' }, out: { 'Age': '36 years, 4 months, 21 days', 'Next birthday': 'In 222 days', 'Born on a': 'Friday' } },
      { in: { b: '2030-01-01', on: '2026-11-05' }, error: 'on' },
    ],
  });

  R.calc({
    id: 'military-time', face: 'time', name: 'Military time', blurb: '24-hour time and 12-hour time, both ways',
    keywords: ['24 hour', 'military', 'am pm'],
    inputs: [{ id: 't', label: 'Time (either way)', kind: 'time', value: '7:30pm', help: 'like 1930 or 7:30pm' }],
    run: function (v) {
      return [
        { label: 'Military', value: R.clock24(v.t).replace(':', '') + ' hours', big: true },
        { label: '24-hour', value: R.clock24(v.t) },
        { label: '12-hour', value: R.clock12(v.t) },
      ];
    },
    examples: [
      { in: {}, out: { 'Military': '1930 hours', '12-hour': '7:30 PM' } },
      { in: { t: '0:15' }, out: { '12-hour': '12:15 AM' } },
      { in: { t: '1930' }, out: { '12-hour': '7:30 PM' } },
      { in: { t: '0645' }, out: { '12-hour': '6:45 AM' } },
    ],
  });

  R.calc({
    id: 'decimal-hours', face: 'time', name: 'Decimal hours', blurb: 'Hours and minutes to decimal hours for payroll, and back',
    keywords: ['payroll', 'decimal', 'minutes to hours', 'tenths'],
    inputs: [
      { id: 'mode', label: 'I have', kind: 'choice', value: 'hm', options: [['hm', 'Hours and minutes'], ['dec', 'Decimal hours']] },
      { id: 'h', label: 'Hours', kind: 'int', value: '7', min: 0, max: 100000, when: function (r) { return r.mode === 'hm'; } },
      { id: 'm', label: 'Minutes', kind: 'int', value: '45', min: 0, max: 59, when: function (r) { return r.mode === 'hm'; } },
      { id: 'd', label: 'Decimal hours', kind: 'number', value: '7.6', max: 100000, when: function (r) { return r.mode === 'dec'; } },
    ],
    run: function (v) {
      const mins = v.mode === 'hm' ? v.h * 60 + v.m : v.d * 60;
      return v.mode === 'hm'
        ? [{ label: 'Decimal hours', value: R.fmt(mins / 60, 4), big: true }, { label: 'Minutes', value: R.fmt(mins, 0) }]
        : [{ label: 'Hours and minutes', value: R.hm(mins), big: true }, { label: 'Minutes', value: R.fmt(mins, 2) }];
    },
    examples: [
      { in: {}, out: { 'Decimal hours': '7.75', 'Minutes': '465' } },
      { in: { mode: 'dec' }, out: { 'Hours and minutes': '7:36' } },
      { in: { m: '75' }, error: 'm' },
    ],
  });
})(globalThis.Reckon = globalThis.Reckon || {});
