/* Reckon: the Money face. Examples worked by hand, and checked against published loan tables. */
(function (R) {
  'use strict';
  const $ = R.money;
  const pct = function (x, dp) { return R.fmt(x, dp == null ? 2 : dp) + '%'; };
  /** Monthly payment for a loan: P at an annual rate over n months. */
  function payment(P, annualPct, n) {
    const i = annualPct / 100 / 12;
    // 1 − (1+i)^−n written as −expm1(−n·ln(1+i)): exact even for a tiny rate, where the plain form loses every digit
    return i === 0 ? P / n : P * i / -Math.expm1(-n * Math.log1p(i));
  }
  R.payment = payment;
  const TERM = function (v) { return { id: 'years', label: 'Term (years)', kind: 'number', value: String(v), min: 0.0833, max: 50, zero: false }; };
  const RATE = function (v, label) { return { id: 'rate', label: label || 'Interest rate (APR %)', kind: 'percent', value: String(v), max: 100 }; };

  R.calc({
    id: 'loan', face: 'money', name: 'Loan payment', blurb: 'Monthly payment, total paid and total interest',
    keywords: ['auto loan', 'car', 'truck', 'payment', 'apr', 'finance', 'amortization'],
    inputs: [
      { id: 'amt', label: 'Loan amount', kind: 'money', value: '25000', zero: false },
      RATE(7), TERM(5),
    ],
    run: function (v) {
      const n = Math.round(v.years * 12), M = payment(v.amt, v.rate, n);
      return [
        { label: 'Monthly payment', value: $(M), big: true, note: n + ' payments' },
        { label: 'Total paid', value: $(M * n) },
        { label: 'Total interest', value: $(M * n - v.amt) },
      ];
    },
    examples: [
      { in: {}, out: { 'Monthly payment': '$495.03' } },
      { in: { amt: '12000', rate: '0', years: '1' }, out: { 'Monthly payment': '$1,000.00', 'Total interest': '$0.00' } },
      { in: { years: '0' }, error: 'years' },
    ],
  });

  R.calc({
    id: 'mortgage', face: 'money', name: 'Mortgage', blurb: 'Monthly house payment with taxes, insurance and HOA',
    keywords: ['house', 'home', 'piti', 'down payment', 'property tax', 'escrow'],
    inputs: [
      { id: 'price', label: 'Home price', kind: 'money', value: '300000', zero: false },
      { id: 'down', label: 'Down payment (%)', kind: 'percent', value: '20', max: 100 },
      RATE(6.5), TERM(30),
      { id: 'tax', label: 'Property tax per year', kind: 'money', value: '3600' },
      { id: 'ins', label: 'Insurance per year', kind: 'money', value: '1200' },
      { id: 'hoa', label: 'HOA per month', kind: 'money', value: '0' },
    ],
    run: function (v) {
      const loan = v.price * (1 - v.down / 100), n = Math.round(v.years * 12);
      const pi = loan > 0 ? payment(loan, v.rate, n) : 0;
      const total = pi + v.tax / 12 + v.ins / 12 + v.hoa;
      return [
        { label: 'Monthly payment', value: $(total), big: true, note: 'Loan, tax, insurance and HOA' },
        { label: 'Principal and interest', value: $(pi) },
        { label: 'Tax and insurance', value: $(v.tax / 12 + v.ins / 12) },
        { label: 'Loan amount', value: $(loan) },
        { label: 'Total interest over the loan', value: $(pi * n - loan) },
        v.down < 20 && { label: 'Heads up', value: 'PMI likely', note: 'Under 20% down usually adds mortgage insurance' },
      ];
    },
    examples: [
      { in: {}, out: { 'Monthly payment': '$1,916.96', 'Principal and interest': '$1,516.96', 'Tax and insurance': '$400.00', 'Loan amount': '$240,000.00' } },
      { in: { down: '100' }, out: { 'Principal and interest': '$0.00' } },
    ],
  });

  /** Future value: P now plus C each month, for n months at an effective monthly rate i. */
  function fv(P, C, i, n) {
    if (i === 0) return P + C * n;
    const g = Math.pow(1 + i, n);
    return P * g + C * Math.expm1(n * Math.log1p(i)) / i;
  }
  const monthlyRate = function (annualPct, perYear) { return Math.expm1(perYear / 12 * Math.log1p(annualPct / 100 / perYear)); };
  const COMPOUND = { id: 'k', label: 'Compounded', kind: 'choice', value: '12', options: [['1', 'Yearly'], ['4', 'Quarterly'], ['12', 'Monthly'], ['365', 'Daily']] };

  R.calc({
    id: 'compound-interest', face: 'money', name: 'Compound interest', blurb: 'What savings grow to, with monthly deposits',
    keywords: ['savings', 'invest', 'growth', 'retirement', 'future value', 'interest'],
    inputs: [
      { id: 'p', label: 'Starting amount', kind: 'money', value: '10000' },
      { id: 'c', label: 'Added each month', kind: 'money', value: '0' },
      RATE(5, 'Yearly rate (%)'), TERM(10), Object.assign({}, COMPOUND, { value: '1' }),
    ],
    run: function (v) {
      const n = Math.round(v.years * 12), i = monthlyRate(v.rate, Number(v.k));
      const end = fv(v.p, v.c, i, n), put = v.p + v.c * n;
      return [
        { label: 'Ends at', value: $(end), big: true, note: 'After ' + R.fmt(v.years, 2) + ' years' },
        { label: 'You put in', value: $(put) },
        { label: 'Interest earned', value: $(end - put) },
      ];
    },
    examples: [
      { in: {}, out: { 'Ends at': '$16,288.95', 'You put in': '$10,000.00', 'Interest earned': '$6,288.95' } },
      { in: { p: '1000', c: '100', rate: '0', years: '1' }, out: { 'Ends at': '$2,200.00' } },
    ],
  });

  R.calc({
    id: 'savings-goal', face: 'money', name: 'Savings goal', blurb: 'How much to save each month to reach a number',
    keywords: ['goal', 'save', 'monthly', 'target', 'emergency fund'],
    inputs: [
      { id: 'goal', label: 'Goal', kind: 'money', value: '10000', zero: false },
      { id: 'p', label: 'Saved already', kind: 'money', value: '0' },
      TERM(1), RATE(5, 'Yearly rate (%)'), COMPOUND,
    ],
    run: function (v) {
      const n = Math.round(v.years * 12), i = monthlyRate(v.rate, Number(v.k));
      if (n < 1) R.fail('The time must be at least a month.', 'years');
      const grown = fv(v.p, 0, i, n);
      if (grown >= v.goal) return [{ label: 'Each month', value: $(0), big: true, note: 'What you have already grows past the goal' }];
      const C = i === 0 ? (v.goal - grown) / n : (v.goal - grown) * i / Math.expm1(n * Math.log1p(i));
      return [
        { label: 'Each month', value: $(C), big: true, note: n + ' months' },
        { label: 'You put in', value: $(v.p + C * n) },
        { label: 'Interest earned', value: $(v.goal - v.p - C * n) },
      ];
    },
    examples: [
      { in: {}, out: { 'Each month': '$814.41' } },
      { in: { goal: '12000', rate: '0' }, out: { 'Each month': '$1,000.00' } },
    ],
  });

  R.calc({
    id: 'tip', face: 'money', name: 'Tip & split', blurb: 'Tip, total and each person’s share',
    keywords: ['gratuity', 'restaurant', 'split', 'bill', 'check'],
    inputs: [
      { id: 'bill', label: 'Bill', kind: 'money', value: '84.50' },
      { id: 'tip', label: 'Tip (%)', kind: 'percent', value: '18', max: 100 },
      { id: 'n', label: 'People', kind: 'int', value: '3', min: 1, max: 1000 },
    ],
    run: function (v) {
      const tip = v.bill * v.tip / 100, total = v.bill + tip;
      return [
        { label: 'Each person', value: $(Math.ceil(total / v.n * 100 - 1e-9) / 100), big: true, note: v.n > 1 ? 'Rounded up to the cent' : '' },
        { label: 'Tip', value: $(tip) },
        { label: 'Total', value: $(total) },
      ];
    },
    examples: [{ in: {}, out: { 'Each person': '$33.24', 'Tip': '$15.21', 'Total': '$99.71' } }],
  });

  R.calc({
    id: 'discount', face: 'money', name: 'Discount', blurb: 'Sale price, with an extra percent off if there is one',
    keywords: ['sale', 'percent off', 'coupon', 'price'],
    inputs: [
      { id: 'price', label: 'Price', kind: 'money', value: '80' },
      { id: 'off', label: 'Percent off', kind: 'percent', value: '25', max: 100 },
      { id: 'more', label: 'Extra percent off', kind: 'percent', optional: true, value: '', max: 100 },
    ],
    run: function (v) {
      const after = v.price * (1 - v.off / 100) * (1 - (v.more || 0) / 100);
      return [
        { label: 'Sale price', value: $(after), big: true },
        { label: 'You save', value: $(v.price - after) },
        v.more != null && { label: 'Total off', value: pct(v.price ? (1 - after / v.price) * 100 : 0) },
      ];
    },
    examples: [
      { in: {}, out: { 'Sale price': '$60.00', 'You save': '$20.00' } },
      { in: { more: '10' }, out: { 'Sale price': '$54.00', 'You save': '$26.00', 'Total off': '32.5%' } },
    ],
  });

  R.calc({
    id: 'sales-tax', face: 'money', name: 'Sales tax', blurb: 'Add tax to a price, or take it back out of a total',
    keywords: ['tax', 'vat', 'gst', 'receipt', 'before tax'],
    inputs: [
      { id: 'mode', label: 'I have', kind: 'choice', value: 'add', options: [['add', 'The price before tax'], ['out', 'The total with tax']] },
      { id: 'amt', label: 'Amount', kind: 'money', value: '100' },
      { id: 'rate', label: 'Tax rate (%)', kind: 'percent', value: '7.25', max: 100 },
    ],
    run: function (v) {
      const before = v.mode === 'add' ? v.amt : v.amt / (1 + v.rate / 100);
      const tax = before * v.rate / 100;
      return [
        v.mode === 'add' ? { label: 'Total', value: $(before + tax), big: true } : { label: 'Price before tax', value: $(before), big: true },
        { label: 'Tax', value: $(tax) },
      ];
    },
    examples: [
      { in: {}, out: { 'Total': '$107.25', 'Tax': '$7.25' } },
      { in: { mode: 'out', amt: '107.25' }, out: { 'Price before tax': '$100.00', 'Tax': '$7.25' } },
    ],
  });

  R.calc({
    id: 'margin', face: 'money', name: 'Margin & markup', blurb: 'Profit, margin and markup, or a price from either',
    keywords: ['profit', 'markup', 'margin', 'pricing', 'resale', 'bid'],
    inputs: [
      { id: 'mode', label: 'I know', kind: 'choice', value: 'cp', options: [['cp', 'Cost and price'], ['cm', 'Cost and the margin I want'], ['cu', 'Cost and the markup I want']] },
      { id: 'cost', label: 'Cost', kind: 'money', value: '60' },
      { id: 'price', label: 'Price', kind: 'money', value: '100', when: function (r) { return r.mode === 'cp'; } },
      { id: 'margin', label: 'Margin (%)', kind: 'percent', value: '40', max: 99.99, when: function (r) { return r.mode === 'cm'; } },
      { id: 'markup', label: 'Markup (%)', kind: 'percent', value: '50', max: 100000, when: function (r) { return r.mode === 'cu'; } },
    ],
    run: function (v) {
      const price = v.mode === 'cp' ? v.price : v.mode === 'cm' ? v.cost / (1 - v.margin / 100) : v.cost * (1 + v.markup / 100);
      if (price === 0) R.fail('The price is zero.', 'price');
      const profit = price - v.cost;
      return [
        v.mode === 'cp' ? { label: 'Profit', value: $(profit), big: true } : { label: 'Price', value: $(price), big: true },
        v.mode !== 'cp' && { label: 'Profit', value: $(profit) },
        { label: 'Margin', value: pct(profit / price * 100), note: 'Profit as a share of the price' },
        v.cost > 0 && { label: 'Markup', value: pct(profit / v.cost * 100), note: 'Profit as a share of the cost' },
      ];
    },
    examples: [
      { in: {}, out: { 'Profit': '$40.00', 'Margin': '40%', 'Markup': '66.67%' } },
      { in: { mode: 'cm' }, out: { 'Price': '$100.00' } },
      { in: { mode: 'cu' }, out: { 'Price': '$90.00', 'Margin': '33.33%' } },
    ],
  });

  R.calc({
    id: 'pay', face: 'money', name: 'Hourly ↔ salary', blurb: 'An hourly rate as yearly, monthly and weekly pay, or back',
    keywords: ['wage', 'salary', 'hourly', 'income', 'annual', 'paycheck'],
    inputs: [
      { id: 'mode', label: 'I know', kind: 'choice', value: 'h', options: [['h', 'The hourly rate'], ['y', 'The yearly salary']] },
      { id: 'rate', label: 'Hourly rate', kind: 'money', value: '25', when: function (r) { return r.mode === 'h'; } },
      { id: 'sal', label: 'Yearly salary', kind: 'money', value: '60000', when: function (r) { return r.mode === 'y'; } },
      { id: 'hrs', label: 'Hours a week', kind: 'number', value: '40', min: 0.5, max: 168 },
      { id: 'wks', label: 'Weeks a year', kind: 'number', value: '52', min: 1, max: 53 },
    ],
    run: function (v) {
      const year = v.mode === 'h' ? v.rate * v.hrs * v.wks : v.sal;
      const hour = year / (v.hrs * v.wks);
      return [
        v.mode === 'h' ? { label: 'Yearly', value: $(year), big: true } : { label: 'Hourly', value: $(hour), big: true },
        v.mode === 'y' && { label: 'Yearly', value: $(year) },
        { label: 'Monthly', value: $(year / 12) },
        { label: 'Every two weeks', value: $(year / v.wks * 2) },
        { label: 'Weekly', value: $(year / v.wks) },
        { label: 'Daily (5-day week)', value: $(year / v.wks / 5) },
      ];
    },
    examples: [
      { in: {}, out: { 'Yearly': '$52,000.00', 'Monthly': '$4,333.33', 'Weekly': '$1,000.00', 'Every two weeks': '$2,000.00' } },
      { in: { mode: 'y' }, out: { 'Hourly': '$28.85' } },
    ],
  });

  R.calc({
    id: 'inflation', face: 'money', name: 'Inflation', blurb: 'What a price becomes, and what money is worth later',
    keywords: ['inflation', 'future cost', 'buying power', 'cpi'],
    inputs: [
      { id: 'amt', label: 'Amount today', kind: 'money', value: '100' },
      RATE(3, 'Inflation per year (%)'), TERM(10),
    ],
    run: function (v) {
      const g = Math.pow(1 + v.rate / 100, v.years);
      return [
        { label: 'Will cost', value: $(v.amt * g), big: true, note: 'In ' + R.fmt(v.years, 2) + ' years' },
        { label: 'Today’s money will buy', value: $(v.amt / g), note: 'Worth of ' + $(v.amt) + ' then, in today’s dollars' },
      ];
    },
    examples: [{ in: {}, out: { 'Will cost': '$134.39', 'Today’s money will buy': '$74.41' } }],
  });

  R.calc({
    id: 'unit-price', face: 'money', name: 'Unit price compare', blurb: 'Which size is the better deal',
    keywords: ['compare', 'per ounce', 'best deal', 'grocery', 'bulk'],
    inputs: [
      { id: 'pa', label: 'A: price', kind: 'money', value: '4.99' },
      { id: 'qa', label: 'A: amount (oz, count, ft…)', kind: 'number', value: '12', zero: false },
      { id: 'pb', label: 'B: price', kind: 'money', value: '7.49' },
      { id: 'qb', label: 'B: amount (same unit)', kind: 'number', value: '20', zero: false },
    ],
    run: function (v) {
      const a = v.pa / v.qa, b = v.pb / v.qb;
      const unit = function (x) { return '$' + R.fmt(x, 4) + ' each'; };
      if (Math.abs(a - b) < 1e-12) return [{ label: 'Same price', value: 'A and B cost the same', big: true }, { label: 'Per unit', value: unit(a) }];
      const cheap = a < b ? 'A' : 'B';
      return [
        { label: 'Better deal', value: cheap + ' is cheaper', big: true, note: 'by ' + pct(Math.abs(a - b) / Math.max(a, b) * 100) + ' per unit' },
        { label: 'A per unit', value: unit(a) },
        { label: 'B per unit', value: unit(b) },
      ];
    },
    examples: [{ in: {}, out: { 'Better deal': 'B is cheaper', 'A per unit': '$0.4158 each', 'B per unit': '$0.3745 each' } }],
  });

  R.calc({
    id: 'card-payoff', face: 'money', name: 'Credit card payoff', blurb: 'How long a balance takes to pay off, and its interest',
    keywords: ['credit card', 'debt', 'payoff', 'balance', 'apr'],
    inputs: [
      { id: 'bal', label: 'Balance', kind: 'money', value: '5000', zero: false },
      RATE(18),
      { id: 'pay', label: 'Monthly payment', kind: 'money', value: '200', zero: false },
    ],
    run: function (v) {
      const i = v.rate / 100 / 12;
      if (v.pay <= v.bal * i + 0.005) R.fail('That payment doesn’t cover the interest (' + $(v.bal * i) + ' a month), so the balance never goes down.', 'pay');
      let b = v.bal, months = 0, interest = 0;
      while (b > 0.005 && months < 1200) {
        const int = Math.round(b * i * 100) / 100;
        interest += int; b += int;
        b -= Math.min(v.pay, b); months++;
      }
      return [
        { label: 'Paid off in', value: R.plural(months, 'month'), big: true, note: (months >= 12 ? R.plural(Math.floor(months / 12), 'year') + (months % 12 ? ', ' + R.plural(months % 12, 'month') : '') : '') },
        { label: 'Total interest', value: $(interest) },
        { label: 'Total paid', value: $(v.bal + interest) },
      ];
    },
    examples: [
      { in: {}, out: { 'Paid off in': '32 months' } },
      { in: { pay: '50' }, error: 'pay' },
    ],
  });

  R.calc({
    id: 'simple-interest', face: 'money', name: 'Simple interest', blurb: 'Interest that doesn’t compound',
    keywords: ['interest', 'principal', 'simple'],
    inputs: [{ id: 'p', label: 'Principal', kind: 'money', value: '5000' }, RATE(4, 'Yearly rate (%)'), TERM(3)],
    run: function (v) {
      const int = v.p * v.rate / 100 * v.years;
      return [{ label: 'Interest', value: $(int), big: true }, { label: 'Total', value: $(v.p + int) }];
    },
    examples: [{ in: {}, out: { 'Interest': '$600.00', 'Total': '$5,600.00' } }],
  });

  R.calc({
    id: 'break-even', face: 'money', name: 'Break-even', blurb: 'How many you must sell to cover your costs',
    keywords: ['break even', 'units', 'fixed cost', 'profit', 'business'],
    inputs: [
      { id: 'fixed', label: 'Fixed costs', kind: 'money', value: '10000' },
      { id: 'price', label: 'Price each', kind: 'money', value: '50', zero: false },
      { id: 'var', label: 'Cost to make each', kind: 'money', value: '30' },
    ],
    run: function (v) {
      if (v.price <= v.var) R.fail('Each sale loses money (price is at or below cost), so it never breaks even.', 'price');
      const units = v.fixed / (v.price - v.var);
      return [
        { label: 'Units to break even', value: R.fmt(Math.ceil(units - 1e-9), 0), big: true },
        { label: 'Sales at break-even', value: $(Math.ceil(units - 1e-9) * v.price) },
        { label: 'Profit on each', value: $(v.price - v.var) },
      ];
    },
    examples: [
      { in: {}, out: { 'Units to break even': '500', 'Sales at break-even': '$25,000.00', 'Profit on each': '$20.00' } },
      { in: { price: '20' }, error: 'price' },
    ],
  });

  R.calc({
    id: 'roi', face: 'money', name: 'Return on investment', blurb: 'Gain, ROI and the yearly rate it works out to',
    keywords: ['roi', 'return', 'investment', 'cagr', 'annualized'],
    inputs: [
      { id: 'cost', label: 'Put in', kind: 'money', value: '10000', zero: false },
      { id: 'back', label: 'Got back', kind: 'money', value: '15000' },
      TERM(3),
    ],
    run: function (v) {
      const gain = v.back - v.cost;
      return [
        { label: 'Return', value: pct(gain / v.cost * 100), big: true },
        { label: 'Gain', value: $(gain) },
        { label: 'Per year (compounded)', value: pct((Math.pow(v.back / v.cost, 1 / v.years) - 1) * 100) },
      ];
    },
    examples: [{ in: {}, out: { 'Return': '50%', 'Gain': '$5,000.00', 'Per year (compounded)': '14.47%' } }],
  });
})(globalThis.Reckon = globalThis.Reckon || {});
