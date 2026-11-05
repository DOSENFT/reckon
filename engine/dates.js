/* Reckon engine: dates as whole days (UTC midnight), so time zones and daylight saving
   can never shift a count by one. */
(function (R) {
  'use strict';
  const DAY = 86400000;
  const DOW = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const MON = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  R.DAY = DAY;

  const parts = function (t) { const d = new Date(t); return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }; };
  const dim = function (y, m) { return new Date(Date.UTC(y, m + 1, 0)).getUTCDate(); };   // days in month m (0-11)
  const pad = function (n) { return (n < 10 ? '0' : '') + n; };
  R.daysInMonth = dim;

  R.iso = function (t) { const p = parts(t); return p.y + '-' + pad(p.m + 1) + '-' + pad(p.d); };
  R.longDate = function (t) { const p = parts(t); return DOW[new Date(t).getUTCDay()] + ', ' + MON[p.m] + ' ' + p.d + ', ' + p.y; };
  R.weekday = function (t) { return DOW[new Date(t).getUTCDay()]; };
  R.today = function () { const n = new Date(); return Date.UTC(n.getFullYear(), n.getMonth(), n.getDate()); };
  R.todayIso = function () { return R.iso(R.today()); };
  R.daysBetween = function (a, b) { return Math.round((b - a) / DAY); };

  /** Add months, clamping to the month's last day (Jan 31 + 1 month = Feb 28). */
  R.addMonths = function (t, n) {
    const p = parts(t);
    const m = p.m + n, y = p.y + Math.floor(m / 12), mm = ((m % 12) + 12) % 12;
    return Date.UTC(y, mm, Math.min(p.d, dim(y, mm)));
  };

  /** Whole years, months and days from a to b (a ≤ b), the way people count birthdays. */
  R.ymd = function (a, b) {
    if (b < a) { const r = R.ymd(b, a); r.neg = true; return r; }
    const A = parts(a), B = parts(b);
    let y = B.y - A.y, m = B.m - A.m, d = B.d - A.d;
    if (d < 0) { m -= 1; const pm = B.m - 1 < 0 ? 11 : B.m - 1, py = B.m - 1 < 0 ? B.y - 1 : B.y; d += dim(py, pm); }
    if (m < 0) { y -= 1; m += 12; }
    return { y: y, m: m, d: d, neg: false };
  };
  const plural = function (n, w) { return n + ' ' + w + (n === 1 ? '' : 's'); };
  R.plural = plural;
  R.ymdText = function (r) {
    const bits = [];
    if (r.y) bits.push(plural(r.y, 'year'));
    if (r.m) bits.push(plural(r.m, 'month'));
    if (r.d || !bits.length) bits.push(plural(r.d, 'day'));
    return bits.join(', ');
  };

  /** US federal holidays for a year, moved to the weekday they're observed on. */
  R.usHolidays = function (y) {
    const nth = function (m, dow, n) { // nth weekday of month (n = -1 for last)
      if (n > 0) { const first = new Date(Date.UTC(y, m, 1)).getUTCDay(); return Date.UTC(y, m, 1 + ((dow - first + 7) % 7) + (n - 1) * 7); }
      const lastD = dim(y, m), last = new Date(Date.UTC(y, m, lastD)).getUTCDay();
      return Date.UTC(y, m, lastD - ((last - dow + 7) % 7));
    };
    const fixed = function (m, d) {
      const t = Date.UTC(y, m, d), w = new Date(t).getUTCDay();
      return w === 6 ? t - DAY : w === 0 ? t + DAY : t;
    };
    return [
      ['New Year’s Day', fixed(0, 1)], ['Martin Luther King Jr. Day', nth(0, 1, 3)], ['Presidents’ Day', nth(1, 1, 3)],
      ['Memorial Day', nth(4, 1, -1)], ['Juneteenth', fixed(5, 19)], ['Independence Day', fixed(6, 4)], ['Labor Day', nth(8, 1, 1)],
      ['Columbus Day', nth(9, 1, 2)], ['Veterans Day', fixed(10, 11)], ['Thanksgiving', nth(10, 4, 4)], ['Christmas Day', fixed(11, 25)],
    ];
  };

  /** Minutes → "8:45" (hours can pass 24). */
  R.hm = function (mins) {
    const neg = mins < 0; mins = Math.round(Math.abs(mins));
    return (neg ? '−' : '') + Math.floor(mins / 60) + ':' + pad(mins % 60);
  };
  /** Minutes after midnight → "4:15 PM". */
  R.clock12 = function (mins) {
    mins = ((Math.round(mins) % 1440) + 1440) % 1440;
    const h = Math.floor(mins / 60), m = mins % 60;
    return ((h + 11) % 12 + 1) + ':' + pad(m) + ' ' + (h < 12 ? 'AM' : 'PM');
  };
  R.clock24 = function (mins) {
    mins = ((Math.round(mins) % 1440) + 1440) % 1440;
    return pad(Math.floor(mins / 60)) + ':' + pad(mins % 60);
  };
})(globalThis.Reckon = globalThis.Reckon || {});
