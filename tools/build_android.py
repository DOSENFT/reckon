"""Build Reckon as a real Android app (dist/Reckon.apk) for his Pixel (GrapheneOS: Vanadium can't install web apps).

    python tools/build_android.py            # build dist/Reckon.apk
    python tools/build_android.py --install  # build, then install on the phone over ADB (Tailscale bridge)

It packs exactly the files the offline helper caches (tools/build_sw.py's list) into the app, so the app and the
web page always match. The app has no INTERNET permission: this script refuses to finish if one sneaks in.
Needs this PC's Android kit in C:\\Android (Java 17, SDK, Gradle), the same one Rocky's app builds with.
"""
import datetime
import os
import pathlib
import re
import shutil
import subprocess
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
from build_sw import shell_files, version  # noqa: E402

KIT = pathlib.Path(os.environ.get('RECKON_ANDROID_KIT', r'C:\Android'))
APP = ROOT / 'android'
WWW = APP / 'app' / 'src' / 'main' / 'assets' / 'www'
OUT = ROOT / 'dist' / 'Reckon.apk'


def find(pattern: str) -> pathlib.Path:
    hits = sorted(KIT.glob(pattern))
    if not hits:
        sys.exit(f'Missing from {KIT}: {pattern}')
    return hits[-1]


def pack() -> list[str]:
    files = shell_files()
    if WWW.exists():
        shutil.rmtree(WWW)
    for name in files:
        dst = WWW / name
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, dst)
    return files


def build(files: list[str]) -> tuple[str, int]:
    jdk = find('jdk/jdk-17*')
    gradle = find('gradle/gradle-*/bin/gradle.bat')
    sdk = KIT / 'sdk'
    (APP / 'local.properties').write_text('sdk.dir=' + str(sdk).replace('\\', '\\\\') + '\n', encoding='utf-8')
    name = '1.0-' + version(files)
    code = int((datetime.datetime.now(datetime.timezone.utc) - datetime.datetime(2026, 1, 1, tzinfo=datetime.timezone.utc)).total_seconds() // 60)
    env = dict(os.environ, JAVA_HOME=str(jdk), ANDROID_HOME=str(sdk))
    cmd = [str(gradle), '-p', str(APP), '--no-daemon', '--quiet', 'assembleRelease',
           f'-PreckonVersionCode={code}', f'-PreckonVersionName={name}']
    r = subprocess.run(cmd, env=env, cwd=APP, shell=False)
    if r.returncode:
        sys.exit('Gradle build failed (see above).')
    apk = APP / 'app' / 'build' / 'outputs' / 'apk' / 'release' / 'app-release.apk'
    OUT.parent.mkdir(exist_ok=True)
    shutil.copyfile(apk, OUT)
    return name, code


def check(files: list[str]) -> None:
    aapt = find('sdk/build-tools/*/aapt2.exe')
    badging = subprocess.run([str(aapt), 'dump', 'badging', str(OUT)], capture_output=True, text=True).stdout
    perms = re.findall(r"uses-permission: name='([^']+)'", badging)
    if 'android.permission.INTERNET' in perms:
        sys.exit('STOP: the app asks for INTERNET. Reckon must work with no network.')
    with zipfile.ZipFile(OUT) as z:
        inside = {n[len('assets/www/'):] for n in z.namelist() if n.startswith('assets/www/')}
    missing = [f for f in files if f not in inside]
    if missing:
        sys.exit(f'STOP: files missing from the app: {missing}')
    label = re.search(r"application-label:'([^']+)'", badging)
    print(f"checked: label {label.group(1) if label else '?'}, permissions {perms or 'none'}, "
          f"{len(inside)} of {len(files)} files inside")


def install() -> None:
    adb = find('platform-tools/adb.exe')
    devices = [l.split()[0] for l in subprocess.run([str(adb), 'devices'], capture_output=True, text=True).stdout.splitlines()[1:] if l.strip().endswith('device')]
    if not devices:
        sys.exit('No phone on the bridge. On the Pixel: Developer options > Wireless debugging ON, then '
                 'adb connect 100.87.241.8:<port shown there>')
    r = subprocess.run([str(adb), '-s', devices[0], 'install', '-r', str(OUT)], capture_output=True, text=True)
    print((r.stdout + r.stderr).strip())
    if r.returncode:
        sys.exit('Install failed.')


if __name__ == '__main__':
    files = pack()
    name, code = build(files)
    check(files)
    print(f'built {OUT.relative_to(ROOT)} ({OUT.stat().st_size // 1024} KB), version {name} ({code})')
    if '--install' in sys.argv:
        install()
