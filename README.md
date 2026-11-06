# Reckon

One calculator app for the job site and the rest of life, so you stop juggling separate calculator apps on site.
**10 faces, 111 calculators and a calculator pad with 32 maintenance keys.** It works with no signal, and nothing you type ever leaves your phone.

## Put it on your phone (about 2 minutes)

**As a real Android app** (any Android 11+, including GrapheneOS, whose Vanadium browser can't install web apps):
`python tools/build_android.py` makes `dist/Reckon.apk` (about 120 KB, with every file inside). Install it with
`python tools/build_android.py --install` over ADB, or open the file on the phone and tap **Install**. The app has no
internet permission at all, so it works in airplane mode from the first open, and Android lists it as a calculator app.

**As a web app** (Chrome on Android): open https://dosenft.github.io/reckon/, tap **⋮** (top right), then
**Install app**, then **Install**. After the first open it works in airplane mode, and it updates itself the next time
you open it with signal ("Reckon was updated").

## The faces

| Face | What's in it |
|---|---|
| **Job** | The feet-inch keypad, plus 26 job tools: common, hip/valley and jack rafters, roof pitch, right triangle, stairs, concrete slab, footing and tube forms, studs, drywall, roofing, board feet, equal spacing, circle & arc, crown molding, polygon, paint, flooring & tile, gravel/mulch/sand, square footage, brick & block, grade & slope, 2-stroke fuel mix, tank & pool gallons, fill time |
| **Calc** | The everyday pad (+ − × ÷, %, Ans, a tape) with four tabs of maintenance keys: **Shop**, **Electric**, **Fuel/HVAC**, **Water** (below) |
| **Money** | Loan, mortgage (with tax/insurance/HOA), compound interest, savings goal, tip & split, discount, sales tax, margin & markup, hourly ↔ salary, inflation, unit price, credit card payoff, simple interest, break-even, ROI |
| **Time** | Time card (a week, overtime and pay), hours between times, add time, days between dates, add days, business days (US holidays), age, military time, decimal hours |
| **Travel** | Trip fuel cost, gas mileage, speed/distance/time, pace, distance between GPS points, mileage pay |
| **Convert** | Length, area, volume, weight, temperature, speed, pressure, energy, power, data, angle, fuel economy, flow, time, cooking |
| **Health** | BMI, daily calories (BMR/TDEE), body fat (Navy tape), ideal weight, water, due date, heart rate zones, calories burned, macros |
| **Math** | Percentage, percent change, exact fractions, ratio, mean/median/mode, standard deviation, GCF & LCM, prime factors, quadratic, rounding, percent error, scientific notation |
| **Science** | Ohm's law, voltage drop, electricity cost, motor amps, kinetic energy, acceleration, torque & horsepower, force, ideal gas law, dilution, molar mass, battery runtime |
| **Life** | Dog age, cat age, GPA, grade, recipe scaler, shipping (dimensional) weight, age difference |

The 🔍 at the top finds any calculator by name or word ("stringer", "quikrete", "overtime"). The ☆ on a calculator pins it to the top of its face.

## The Job keypad in 30 seconds

- **5 Feet 7 Inch 3 a/b 8** types 5' 7-3/8". A number with no Feet or Inch is a plain number.
- **+ − × ÷** keep track of what things are: length × length is an area, × another length is a volume. Mixing them up gets a plain warning, never a wrong number.
- **Rise, Run, Diag, Pitch**: type a value and tap the key to store it. Tap a key with nothing typed to work it out from the last two you stored. Pitch is rise per 12 ("6" for 6/12).
- **1/16"** (top right of the screen) sets the rounding: 1/2 down to 1/64. "≈ nearest 1/16" means an answer was rounded.
- Under every answer: the same length in inches, feet, yards, meters, cm and mm. **M+ / MR** keep a running total. **≡** shows the tape of past answers; tap one to use it again.
- Any measurement box in a job tool opens the same Feet / Inch keypad. **Type it** lets you type "2.5 m" instead.

## The Calc pad's maintenance keys

Type a number, tap a key: 72 then **°F→°C** reads 22.2222 with °C beside it, and the tape keeps "72 °F → 22.2222 °C". Right after =, a key works on the answer. **⇄** flips every conversion on the tab the other way round. A key with **›** opens its tool.

| Tab | Keys |
|---|---|
| **Shop** | °F→°C, in→mm, ft→m, gal→L, psi→bar, lb→kg (each flips with ⇄), →1/16" (nearest sixteenth, as a fraction) |
| **Electric** | W→A at 120 V and 240 V, 80% load (most continuous amps on a breaker; ⇄ gives the smallest breaker for a load, with the next standard size), HP→kW, Ohm's law ›, V drop ›, Motor A › |
| **Fuel/HVAC** | 2-stroke oil for 50:1, 40:1 and 32:1 (gallons of gas → fl oz and mL of oil), propane gallons→lb (4.24 lb/gal), BTU→tons, BTU→kW, Any mix › |
| **Water** | Pipe offset travel at 45°, 22½° and 60° (with the nearest 1/16"), ft³→gal, psi→feet of head (2.31 ft/psi), Tank/pool ›, Fill time › |

Reckon opens on the tab you used last. A PC keyboard can still type brackets, ^ and √.

## Turn the phone sideways

- **Job:** the readout on the left with your stored Rise, Run, Diag and Pitch always showing; 32 keys on the right, adding **MC** and **M−**.
- **Calc:** the readout, then your maintenance keys, then the number pad, all on one screen.
- **A calculator** shows its answer on the left and its boxes on the right. What you've typed carries over when you turn the phone.

## How sure are the answers?

Every calculator carries worked examples, calculated by hand before the code ran, and the tests check them. Every input box is also fed junk (empty, letters, negatives, 0, 1/0, numbers too big or too small for a phone like 1e308, code) and must answer in plain words or refuse. Never NaN, never a blank "—".
Formulas are the standard published ones and are named on screen: IRC stair limits, the US Navy body-fat method, Mifflin–St Jeor, AVMA pet ages, NEC K-values for voltage drop, exact NIST unit factors.
Estimates say so on screen: motor amps (use the NEC table or the nameplate to size wire), material weights, MET calories.

## Safe by design

- No accounts, no ads, no tracking. The code never contacts the internet, and a test fails if it ever tries.
- Typed text is never run as code: the math reader is hand-written, with no `eval`, and the page forbids outside and inline scripts (Content Security Policy).
- Saved values (your last inputs, tape, settings) live only in the phone's own storage and are checked when read back.
- No third-party packages. Secret scan (gitleaks): clean.

## For whoever works on it

```
node --test "tests/*.test.js"      # 365 tests: engine, every calculator, the math reader, install/offline files, the Android app's promises
node tools/e2e.js 8840             # 140 checks: the real app in Edge upright, sideways (3 sizes, turning mid-sum) and PC: keypads, the maintenance keys, all 111 calculators, broken links, install check, offline
python tools/build_sw.py           # after ANY file change: rebuilds the offline file list (a test fails if you forget)
python tools/build_android.py      # then rebuild the Android app (dist/Reckon.apk) so it carries the same files
```

The Android app (`android/`) is one WebView showing the packed files at a private https address only the app answers.
It needs this PC's Android kit in `C:\Android` (Java 17, SDK, Gradle), the same one Rocky's app builds with.

To add a calculator: copy any `R.calc({...})` in `calcs/*.js`, give it inputs, a `run()`, and at least one example you worked out by hand. A new file also needs `python tools/sync_files.py calcs/<file>.js`.
To add a maintenance key: copy any `R.quickKey({...})` in `calcs/maint.js` with a worked example, then put its id on a tab in `R.QGROUPS` (8 keys a tab; the tests check every key is on exactly one).
Plain HTML, CSS and JavaScript with no build step: `index.html` loads `engine/` (numbers, feet-inch, dates, the keypad, the math reader), then `calcs/` (one file per face), then `app.js` (the screens).
The look is set by `data-look` on `<html>`: `field` (the default, his pick), `night` or `day`, switchable in ⚙ Settings.
