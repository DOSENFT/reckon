// Loads Reckon's plain-script files into globalThis.Reckon for the Node tests,
// in the same order index.html loads them (everything but the screen code, app.js).
const path = require('path');
const ROOT = path.join(__dirname, '..');
const files = require(path.join(ROOT, 'files.json'));
for (const f of files.engine.concat(files.calcs)) require(path.join(ROOT, f));
module.exports = globalThis.Reckon;
