# Reckon: catch-up (read this first in a fresh chat)

Updated 2026-11-06, 00:30. The build chat was session 6fb995c2 (it got long enough to lag his typing, so it handed over here).
Before it: session 8af91645 built the app. Both ran from the Helm folder, but **Reckon's own folder is this one**
(`Documents\reckon` in his user folder, its own git history). This repo is meant to go **public**: keep machine names,
private links and network details out of it (they live in Helm's notes). Don't read Helm's catch-up for this build.

## His goal and where it stands

"Construction Master Pro and every other calculator, in one phone app", built as a plain-HTML installable web app (PWA)
in his **Field instrument** look. Finish line: **7 of 8 met**.

| # | Check | State |
|---|---|---|
| 1 | Job keypad does feet-inch fractions | met |
| 2 | Rafter, stair, concrete answers verified | met (an independent check hand-worked 23 cases) |
| 3 | 10+ faces, 80+ calculators | met (10 faces, 111 calculators) |
| 4 | Every calculator has passing tests | met (361 tests) |
| 5 | Bad inputs get plain messages | met (second independent check: 9,141 junk runs, 0 failures) |
| 6 | **Installs on Pixel, works offline** | **open: blocked, see below** |
| 7 | Security pass done, no secrets | met (gitleaks clean, CSP, no eval, no network calls) |
| 8 | README explains install and use | met |

## The one open step: get Reckon onto his Pixel 8 Pro

His pick (2026-11-05): **"Free GitHub page"**: a public repo `DOSENFT/reckon` with GitHub Pages on, giving
`https://dosenft.github.io/reckon/`. The code goes public; his numbers never leave the phone.

Blocked by two things on the home PC:
1. **The router stopped handing out IPv4** (`ipconfig /renew Wi-Fi` → "unable to contact your DHCP server"; Wi-Fi has only
   169.254.x). Google works over IPv6; **GitHub has no IPv6**, so it's unreachable. An ask card is open: "Restart the router"
   (recommended), "Wait, you keep checking", or "Publish from the camp PC". He hadn't answered it at hand-over.
   Check: `curl -sS -m 8 -o /dev/null -w "%{http_code}" https://api.github.com` (200 = reachable).
2. **The GitHub sign-in on this PC expired** (`gh auth status`: token invalid). Once online he signs in once:
   run `gh auth login --hostname github.com --git-protocol https --web` in the background, give him the one-time code
   and https://github.com/login/device in an ask card (secrets never in chat).

Then: `gh repo create DOSENFT/reckon --public --source . --push`, turn on Pages
(`gh api -X POST repos/DOSENFT/reckon/pages -f "source[branch]=main" -f "source[path]=/"`), wait for the build, and check
the live address in Edge: Edge's installability answer empty, offline reload works (copy `tools/e2e.js`'s install and offline
checks against the live URL). Publishing is outward-facing: he already chose it, but say plainly when it goes live.
His hands last: Chrome on the Pixel → ⋮ → **Install app** → Install; then airplane mode, open Reckon, it still answers.
That proves check 6. Finish with `/direction`, a verifier pass, and a **final** hand-in.

## What he decided (his words where he gave them)

- Look: **C, Field instrument** (graphite body, LCD readout, raised keys). Night shift and Daylight stay in ⚙ Settings.
- Sideways: "The phone in the sideways position is unusable… It should increase options and whatnot like other calculator
  apps" → readout beside the keys; Job 8×4 with MC and M−. Fixed and "It works".
- Calc: "I actually never use the normal extra calculator scientific tools… replace those with… tools… as my job as a
  maintenance technician" → he picked all four tabs **Shop, Electric, Fuel/HVAC, Water**, and **"Upright too"**.
  8 keys a tab (`calcs/maint.js`, `R.QGROUPS`), ⇄ flips, › opens a tool. An independent check confirmed every factor.
- "no way for me to backspace or clear… make the specialty buttons smaller and different colored. Possible darker with
  white or cream letters" → dark specialty keys with cream letters (46 px rows), AC and ⌫ in their own coral. **"It works."**

## How to see it and check it

- **His link** (the only one that reliably reaches his phone; put it in every hand-in): Helm's preview of
  `reckon-look-c.html#/calc` on port 8446 of the home PC's private Tailscale address (the full link is in Helm's
  `docs/CATCH-UP.md`; not written here because this repo goes public). (Helm serves `previews/reckon-look-*.html`; rebuild them with `python tools/build_previews.py`, then commit those three
  files in the **Helm** repo separately.)
- `node --test "tests/*.test.js"`: 361 pass. `node tools/e2e.js 8840`: 140 pass (Edge, upright, sideways 3 sizes, PC,
  install, offline). Use ports 8840-8844: 8790-8799 belong to Helm and its practice copies.
- After ANY file change: `python tools/build_sw.py` (the offline file list; a test fails if you forget).
- A new script file: `python tools/sync_files.py <path>`.
- Long patches: write a Python patch file with the Write tool; Bash heredocs mangle backslashes and quotes here.

## Came up (not built; ask before adding)

- A torque key (ft·lb ↔ N·m) for bolt specs.
- A Reckon row on Helm's Home once it has a web address.
- Sideways Calc could show the last few answers in the empty part of the readout.
- NEC 2023 may list a 10 A breaker size; Reckon's "next standard breaker" starts at 15 A (the smallest common household
  breaker). Unconfirmed offline.
