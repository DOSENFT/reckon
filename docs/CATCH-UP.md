# Reckon: catch-up (read this first in a fresh chat)

Updated 2026-11-06, 11:30, by session c7642bb6 (the install chat). Before it: 6fb995c2 (build) and 8af91645 (first build),
both run from the Helm folder. **Reckon's own folder is this one** (`Documents\reckon`, its own git history, public on
GitHub as `DOSENFT/reckon`). This repo is **public**: keep machine names, private links and network details out of it
(they live in Helm's and Threshold's notes). Don't read Helm's catch-up for this build.

## His goal and where it stands

"Construction Master Pro and every other calculator, in one phone app", in his **Field instrument** look.
Finish line: **8 of 8 met.** It's on his Pixel as a real app, and Threshold's calculator button opens it.

| # | Check | State |
|---|---|---|
| 1 | Job keypad does feet-inch fractions | met |
| 2 | Rafter, stair, concrete answers verified | met (an independent check hand-worked 23 cases) |
| 3 | 10+ faces, 80+ calculators | met (10 faces, 111 calculators) |
| 4 | Every calculator has passing tests | met (365 tests) |
| 5 | Bad inputs get plain messages | met (second independent check: 9,141 junk runs, 0 failures) |
| 6 | Installs on Pixel, works offline | met 2026-11-06: the Android app is installed on his Pixel, and it has **no INTERNET permission**, so it can't use the network at all. The web version also passed 10/10 live install and offline checks in Edge. |
| 7 | Security pass done, no secrets | met (gitleaks clean on all history before publishing, CSP, no eval, no network calls) |
| 8 | README explains install and use | met (both routes: Android app and web app) |

## How Reckon reaches his phone (read before any install)

- **His Pixel runs GrapheneOS. Vanadium (its browser) can't install web apps, so never suggest "⋮ → Install app".**
  That's why Reckon is a real Android app: `android/` is a WebView with the same 26 files packed inside, served at
  a private https address only the app answers. Package `com.dosenft.reckon`, signed with this PC's debug key (like
  Rocky and Threshold), listed as a calculator app (`APP_CALCULATOR`).
- Build: `python tools/build_android.py` → `dist/Reckon.apk` (~120 KB, ~45 s). It refuses to finish if INTERNET appears.
  Rebuild after any change to the web files (after `python tools/build_sw.py`).
- **Installing:** `python tools/build_android.py --install` works only while the ADB wireless pairing is alive. It lapsed
  by 2026-11-06 ("certificate unknown"), and re-pairing needs the phone on the **home** Wi-Fi (Threshold's
  `BRIDGE-RUNBOOK.md`). The route that worked from his job: a private tailnet download link (`tailscale serve` on a
  free port → a local file server for `dist/`), opened on the phone, then Install. Taildrop did not arrive.
- **Threshold's calc button opens Reckon** (Threshold S046 / Decision 88, v1.25). The old Calculator stays as the fallback.
- The web version is live at https://dosenft.github.io/reckon/ (GitHub Pages, from `main`). Chrome phones can install it.

## What he decided (his words where he gave them)

- Look: **C, Field instrument** (graphite body, LCD readout, raised keys). Night shift and Daylight stay in ⚙ Settings.
- Sideways: "The phone in the sideways position is unusable… It should increase options and whatnot like other calculator
  apps" → readout beside the keys; Job 8×4 with MC and M−. Fixed and "It works".
- Calc: "I actually never use the normal extra calculator scientific tools… replace those with… tools… as my job as a
  maintenance technician" → he picked all four tabs **Shop, Electric, Fuel/HVAC, Water**, and **"Upright too"**.
  8 keys a tab (`calcs/maint.js`, `R.QGROUPS`), ⇄ flips, › opens a tool. An independent check confirmed every factor.
- "no way for me to backspace or clear… make the specialty buttons smaller and different colored. Possible darker with
  white or cream letters" → dark specialty keys with cream letters (46 px rows), AC and ⌫ in their own coral. **"It works."**
- Publishing: **"Free GitHub page"** (2026-11-05), live 2026-11-06. The code is public; his numbers never leave the phone.
- Native: "I want to natively put it in my Pixel on my menu instead of the old calculator app… it should just replace my
  old calculator with this new tool" → the Android app, plus Threshold's calc door. **"That worked!!!"**

## How to see it and check it

- On his phone: the Reckon app (or Threshold → Handy things → calculator). For look previews, Helm still serves
  `previews/reckon-look-*.html` on its tailnet port (full link in Helm's `docs/CATCH-UP.md`). Rebuild them with
  `python tools/build_previews.py`, then commit those three files in the **Helm** repo separately.
- `node --test "tests/*.test.js"`: 365 pass. `node tools/e2e.js 8840`: 140 pass (Edge, upright, sideways 3 sizes, PC,
  install, offline). Use ports 8840-8844: 8790-8799 belong to Helm and its practice copies.
- After ANY file change: `python tools/build_sw.py` (the offline file list; a test fails if you forget), then
  `python tools/build_android.py` so the app carries the same files.
- A new script file: `python tools/sync_files.py <path>`.
- Long patches: write a Python patch file with the Write tool; Bash heredocs mangle backslashes and quotes here.

## Came up (not built; ask before adding)

- A torque key (ft·lb ↔ N·m) for bolt specs.
- A Reckon row on Helm's Home (it now has a web address).
- Sideways Calc could show the last few answers in the empty part of the readout.
- NEC 2023 may list a 10 A breaker size; Reckon's "next standard breaker" starts at 15 A (the smallest common household
  breaker). Unconfirmed offline.
- The old Calculator could be turned off (Settings → Apps → Calculator → Disable) so it leaves All apps. He OK'd that
  earlier, but it wasn't done: the calc button solved his real need, and the old app is now Threshold's fallback. Ask him.
