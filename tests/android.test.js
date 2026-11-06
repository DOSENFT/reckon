// Reckon's Android app (android/): his Pixel runs GrapheneOS, whose browser can't install web apps,
// so the app wraps the same files. These checks keep its promises: no network, a calculator, same start.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const MAN = 'android/app/src/main/AndroidManifest.xml';
const MAIN = 'android/app/src/main/java/com/dosenft/reckon/MainActivity.java';

test('the app cannot reach the network (no INTERNET permission)', () => {
  const m = read(MAN);
  assert.doesNotMatch(m, /android\.permission\.INTERNET/);
  const perms = [...m.matchAll(/uses-permission android:name="([^"]+)"/g)].map((x) => x[1]);
  assert.deepEqual(perms, ['android.permission.VIBRATE'], 'only the key buzz');
  assert.match(m, /android:allowBackup="false"/, 'his numbers are not copied off the phone');
});

test('it shows up as Reckon and as the phone\'s calculator', () => {
  const m = read(MAN);
  assert.match(m, /android:label="Reckon"/);
  assert.match(m, /android\.intent\.category\.LAUNCHER/);
  assert.match(m, /android\.intent\.category\.APP_CALCULATOR/);
});

test('it serves only its own packed files, and opens where the web app opens', () => {
  const src = read(MAIN);
  const host = src.match(/HOST = "([^"]+)"/)[1];
  assert.equal(host, 'appassets.androidplatform.net', 'the address Android reserves for app files');
  assert.match(src, /return empty\(403/, 'anything not its own address gets nothing');
  assert.match(src, /contains\("\.\."\)/, 'no climbing out of the packed folder');
  assert.match(src, /setAllowFileAccess\(false\)/);
  const start = JSON.parse(read('manifest.webmanifest')).start_url.replace('./', '/index.html');
  assert.ok(src.includes(`"https://" + HOST + "${start}"`), `starts at ${start}, same as the web app`);
});

test('the build packs exactly the offline file list', () => {
  const b = read('tools/build_android.py');
  assert.match(b, /from build_sw import shell_files/);
  assert.match(b, /'android\.permission\.INTERNET' in perms/, 'the build refuses an INTERNET permission');
  for (const ignored of ['android/app/src/main/assets/', 'android/app/build/', 'dist/']) assert.ok(read('.gitignore').includes(ignored), ignored + ' stays out of git');
});
