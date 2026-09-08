import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

export function verifyH5(output, basePath) {
  const root = resolve(output);
  let references = 0;
  function checkUrl(value) {
    if (/^(data:|https?:|#)/.test(value)) return;
    assert.ok(value.startsWith(`${basePath}/`), `Asset is outside the H5 path: ${value}`);
    const relative = decodeURIComponent(value.slice(basePath.length + 1).split(/[?#]/)[0]);
    const file = resolve(root, relative);
    assert.ok(file.startsWith(`${root}${sep}`), `Asset escapes the H5 folder: ${value}`);
    assert.ok(existsSync(file) && statSync(file).isFile(), `Missing H5 asset: ${value}`);
    references++;
  }
  function inspect(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) inspect(file);
      else if (entry.name.endsWith('.html')) {
        for (const match of readFileSync(file, 'utf8').matchAll(/(?:src|href)="([^"]+)"/g)) checkUrl(match[1]);
      } else if (entry.name.endsWith('.css')) {
        for (const match of readFileSync(file, 'utf8').matchAll(/url\(["']?([^\s)"']+)["']?\)/g)) checkUrl(match[1]);
      }
    }
  }
  assert.ok(readFileSync(join(root, 'index.html'), 'utf8').includes('破殼怪獸'), 'Missing game HTML');
  for (const name of ['garden', 'cave', 'waterfall', 'leisure', 'friends', 'learning', 'storybook-paper']) {
    checkUrl(`${basePath}/images/${name}.png`);
  }
  inspect(root);
  assert.ok(references > 10, 'Expected HTML and CSS asset references');
  console.log(`Verified ${references} H5 asset references, including all six choices, the font and background.`);
}
