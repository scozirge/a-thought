const fs = require('node:fs');
const path = require('node:path');
const out = path.join(__dirname, 'dist/h5');
fs.mkdirSync(out, { recursive: true });
for (const file of ['index.html', 'styles.css', 'core.js', 'art.js', 'app.js']) {
  fs.copyFileSync(path.join(__dirname, file), path.join(out, file));
}
let standalone = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
standalone = standalone.replace('<link rel="stylesheet" href="styles.css">', () => '<style>' + fs.readFileSync(path.join(__dirname, 'styles.css'), 'utf8') + '</style>');
for (const file of ['core.js', 'art.js', 'app.js']) {
  standalone = standalone.replace(`<script src="${file}"></script>`, () => '<script>' + fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/<\/script/gi, '<\\/script') + '</script>');
}
fs.writeFileSync(path.join(__dirname, 'dist/garden-guard.html'), standalone);
console.log('已輸出到 ' + out);
console.log('單檔遊戲：' + path.join(__dirname, 'dist/garden-guard.html'));
