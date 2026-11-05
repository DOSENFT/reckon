// Loads Reckon's plain-script files into globalThis.Reckon for the Node tests,
// in the same order index.html loads them.
const path = require('path');
const ROOT = path.join(__dirname, '..');
const FILES = require(path.join(ROOT, 'files.json')).engine;
for (const f of FILES) require(path.join(ROOT, f));
module.exports = globalThis.Reckon;
