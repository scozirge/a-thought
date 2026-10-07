import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, 'dist/h5');
mkdirSync(output, { recursive: true });
for (const file of ['app.js', 'game.js', 'style.css', 'favicon.svg']) {
  copyFileSync(resolve(root, 'public', file), resolve(output, file));
}
const html = readFileSync(resolve(root, 'public/index.html'), 'utf8')
  .replace('<html lang="zh-Hant">', '<html lang="zh-Hant" data-mode="solo">')
  .replace('自訂題目與分工', '自訂題目')
  .replace('每題最多 8 步，人多時會減少每人的指令。', '每題最多 8 步。');
if (!html.includes('data-mode="solo"') || /(?:src|href)="\//.test(html)) {
  throw new Error('H5 必須使用單人模式與相對資源路徑。');
}
writeFileSync(resolve(output, 'index.html'), html);
writeFileSync(resolve(output, '.nojekyll'), '');
console.log(`傻瓜勇者單人 H5 已輸出：${output}`);
