"""Keep files.json and index.html's script list in step.

    python tools/sync_files.py [engine/x.js | calcs/x.js ...] [--done face ...]

Adds each named file (calcs before planned.js, engine at the end of the engine list),
rewrites index.html's script tags from files.json, and with --done drops those faces'
"coming soon" names from calcs/planned.js once their real calculators exist.
"""
import json
import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parent.parent
args = sys.argv[1:]
done = args[args.index('--done') + 1:] if '--done' in args else []
names = args[:args.index('--done')] if '--done' in args else args

f = json.loads((root / 'files.json').read_text(encoding='utf-8'))
for name in names:
    group = 'engine' if name.startswith('engine/') else 'calcs'
    if not (root / name).is_file():
        raise SystemExit(f'No such file: {name}')
    if name in f[group]:
        continue
    if group == 'calcs' and 'calcs/planned.js' in f['calcs']:
        f['calcs'].insert(f['calcs'].index('calcs/planned.js'), name)
    else:
        f[group].append(name)
(root / 'files.json').write_text(json.dumps(f, indent=2) + '\n', encoding='utf-8')

html = (root / 'index.html').read_text(encoding='utf-8')
tags = '\n'.join(f'<script src="{s}"></script>' for s in f['engine'] + f['calcs'] + f['app'])
html, n = re.subn(r'(<!-- RECKON:SCRIPTS -->\n).*?(\n<!-- /RECKON:SCRIPTS -->)', lambda m: m.group(1) + tags + m.group(2), html, flags=re.S)
if n != 1:
    raise SystemExit('index.html lost its RECKON:SCRIPTS markers')
(root / 'index.html').write_text(html, encoding='utf-8')

planned = root / 'calcs' / 'planned.js'
if planned.is_file() and done:
    p = planned.read_text(encoding='utf-8')
    for face in done:
        p = re.sub(r'    ' + re.escape(face) + r': \[.*?\],\n', '', p, flags=re.S)
    planned.write_text(p, encoding='utf-8')
print('engine:', f['engine'])
print('calcs:', f['calcs'])
