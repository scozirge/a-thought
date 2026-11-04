const fs = require('node:fs');
const path = require('node:path');
const target = path.resolve(__dirname, '../unity-game');
const source = path.resolve(__dirname, '../../puzzle-party/unity-game');
for (const folder of ['Assets/Photon', 'Packages', 'ProjectSettings']) {
  const destination = path.join(target, folder);
  if (!fs.existsSync(destination)) fs.cpSync(path.join(source, folder), destination, { recursive: true });
}
const settings = path.join(target, 'ProjectSettings/ProjectSettings.asset');
fs.writeFileSync(settings, fs.readFileSync(settings, 'utf8').replace(/productGUID: .*/, 'productGUID: e3ea44358e984d8b90dd5fe68be0e58a'));
