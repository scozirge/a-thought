import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export function copyTogetherHome(output, basePath = '') {
  const source = fileURLToPath(new URL('../../together-home/', import.meta.url));
  const target = join(output, 'together-home');
  mkdirSync(target, { recursive: true });
  const versions = {};
  for (const name of ['styles.css', 'core.js','levels.js','warmup.js','story.js','campaign.js','puzzle-levels.js','puzzle-rules.js','physics.js', 'mechanics.js', 'collision.js', 'input.js', 'solutions.js', 'art.js', 'app.js']) {
    copyFileSync(join(source, name), join(target, name));
    versions[name] = createHash('sha256').update(readFileSync(join(source, name))).digest('hex').slice(0, 12);
  }
  // A newly deployed page must not mix its scripts with a cached older game.
  const html = readFileSync(join(source, 'index.html'), 'utf8').replace(/(src|href)="(styles\.css|core\.js|levels\.js|warmup\.js|story\.js|campaign\.js|puzzle-levels\.js|puzzle-rules\.js|physics\.js|mechanics\.js|collision\.js|input\.js|solutions\.js|art\.js|app\.js)"/g, (_, attribute, name) => `${attribute}="${basePath}/together-home/${name}?v=${versions[name]}"`);
  writeFileSync(join(target, 'index.html'), html);
}
