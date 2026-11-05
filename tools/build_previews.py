"""Pack Reckon into one self-contained page per look, for Helm's /preview/ door.

    python tools/build_previews.py [out_dir]

out_dir defaults to Helm's previews folder. Each page carries the real engine, the real
calculators and the real app code, inlined; only the look differs. Nothing is fetched.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / "Documents" / "helm" / "previews"

LOOKS = [
    ("a", "night", "Night shift", "#0b0b0d"),
    ("b", "day", "Daylight", "#ece7dd"),
    ("c", "field", "Field instrument", "#1b1e22"),
]


def read(rel: str) -> str:
    text = (ROOT / rel).read_text(encoding="utf-8")
    if "</script" in text.lower():
        raise SystemExit(f"{rel} contains a closing script tag; it can't be inlined safely")
    return text


def main() -> None:
    files = json.loads((ROOT / "files.json").read_text(encoding="utf-8"))
    scripts = files["engine"] + files["calcs"] + files["app"]
    css = "\n".join(read(f) for f in files["styles"])
    js = "\n;\n".join(read(f) for f in scripts)
    if not OUT.is_dir():
        raise SystemExit(f"No such folder: {OUT}")
    for letter, look, name, theme in LOOKS:
        links = " ".join(
            f'<a href="reckon-look-{l}.html"{" aria-current=page" if l == letter else ""}>{l.upper()}</a>'
            for l, _, _, _ in LOOKS
        )
        page = f"""<!doctype html>
<html lang="en" data-look="{look}" data-lock-look="1">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="{theme}">
<title>Reckon look {letter.upper()}: {name}</title>
<link rel="icon" href="data:,">
<style>
{css}
.pv-bar {{ height: 40px; display: flex; align-items: center; gap: 8px; padding: 0 14px; font: 700 13px/1 var(--font-ui);
  background: var(--surface-2); color: var(--dim); border-bottom: 1px solid var(--line); }}
.pv-bar b {{ color: var(--text); }}
.pv-bar nav {{ margin-left: auto; display: flex; gap: 6px; }}
.pv-bar a {{ min-width: 36px; height: 30px; display: grid; place-items: center; border: 1px solid var(--line-2); border-radius: var(--radius);
  color: var(--text); text-decoration: none; }}
.pv-bar a[aria-current] {{ background: var(--accent); border-color: var(--accent); color: var(--accent-ink); }}
.app {{ height: calc(100dvh - 40px); }}
</style>
</head>
<body>
<div class="pv-bar">Look {letter.upper()}: <b>{name}</b><nav aria-label="Other looks">{links}</nav></div>
<div id="app" class="app"></div>
<script>
{js}
</script>
</body>
</html>
"""
        dest = OUT / f"reckon-look-{letter}.html"
        dest.write_text(page, encoding="utf-8", newline="\n")
        print(f"wrote {dest} ({len(page) // 1024} KB)")


if __name__ == "__main__":
    main()
