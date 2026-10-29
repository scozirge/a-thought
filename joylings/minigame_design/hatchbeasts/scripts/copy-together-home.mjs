import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function copyTogetherHome(output, basePath = '') {
  const source = fileURLToPath(new URL('../../together-home/', import.meta.url));
  const target = join(output, 'together-home');
  mkdirSync(target, { recursive: true });
  for (const name of ['styles.css', 'core.js','levels.js','physics.js', 'mechanics.js', 'collision.js', 'art.js', 'app.js']) copyFileSync(join(source, name), join(target, name));
  const html = readFileSync(join(source, 'index.html'), 'utf8').replace(/(src|href)="(styles\.css|core\.js|levels\.js|physics\.js|mechanics\.js|collision\.js|art\.js|app\.js)"/g, `$1="${basePath}/together-home/$2"`);
  writeFileSync(join(target, 'index.html'), html);
}
