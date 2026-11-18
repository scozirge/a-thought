const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const out = path.join(__dirname, 'dist/h5');
fs.mkdirSync(out, { recursive: true });
const assets = ['styles.css', 'core.js', 'art.js', 'app.js'];
const hash = crypto.createHash('sha256');
for (const file of assets) hash.update(fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/\r\n/g, '\n'));
const version = hash.digest('hex').slice(0, 12);
for (const file of assets) {
  fs.copyFileSync(path.join(__dirname, file), path.join(out, file));
}
let standalone = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
// A new release must not mix current HTML with cached scripts or styles.
let html = standalone;
for (const file of assets) html = html.replace(`="${file}"`, `="${file}?v=${version}"`);
fs.writeFileSync(path.join(out, 'index.html'), html);
standalone = standalone.replace('<link rel="stylesheet" href="styles.css">', () => '<style>' + fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8') + '</style>');
for (const file of ['core.js', 'art.js', 'app.js']) {
  standalone = standalone.replace(`<script src="${file}"></script>`, () => '<script>' + fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>');
}
fs.writeFileSync(path.join(__dirname, 'dist/garden-guard.html'), standalone);
console.log('已輸出到 ' + out);
console.log('單檔遊戲：' + path.join(__dirname, 'dist/garden-guard.html'));
console.log('資源版本：' + version);
