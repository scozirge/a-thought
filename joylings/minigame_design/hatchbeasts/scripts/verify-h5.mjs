import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

export function verifyH5(output, basePath) {
  const root = resolve(output);
  let references = 0;
  function checkUrl(value) {
    if (/^(data:|https?:|#)/.test(value)) return;
    assert.ok(
      value.startsWith(`${basePath}/`),
      `Asset is outside the H5 path: ${value}`,
    );
    const relative = decodeURIComponent(
      value.slice(basePath.length + 1).split(/[?#]/)[0],
    );
    const target = resolve(root, relative);
    assert.ok(
      target === root || target.startsWith(`${root}${sep}`),
      `Asset escapes the H5 folder: ${value}`,
    );
    const file =
      existsSync(target) && statSync(target).isDirectory()
        ? join(target, 'index.html')
        : target;
    assert.ok(
      existsSync(file) && statSync(file).isFile(),
      `Missing H5 asset: ${value}`,
    );
    references++;
  }
  function inspect(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) inspect(file);
      else if (entry.name.endsWith('.html')) {
        for (const match of readFileSync(file, 'utf8').matchAll(
          /(?:src|href)="([^"]+)"/g,
        ))
          checkUrl(match[1]);
      } else if (entry.name.endsWith('.css')) {
        for (const match of readFileSync(file, 'utf8').matchAll(
          /url\(["']?([^\s)"']+)["']?\)/g,
        ))
          checkUrl(match[1]);
      }
    }
  }
  assert.ok(
    readFileSync(join(root, 'index.html'), 'utf8').includes('破殼怪獸'),
    'Missing game HTML',
  );
  const classroom = readFileSync(
    join(root, 'classroom', 'index.html'),
    'utf8',
  );
  assert.ok(classroom.includes('遊戲設計'), 'Missing classroom catalog');
  assert.ok(
    !classroom.includes('我們的創作課'),
    'Classroom catalog still contains the removed eyebrow',
  );
  for (const slug of [
    'experience',
    'planning',
    'analysis',
    'development',
    'testing',
    'review',
  ]) {
    assert.ok(
      existsSync(join(root, 'classroom', slug, 'index.html')),
      `Missing classroom route: ${slug}`,
    );
  }
  for (const name of [
    'garden',
    'cave',
    'waterfall',
    'leisure',
    'friends',
    'learning',
    'storybook-paper',
    'nest-background',
  ]) {
    checkUrl(`${basePath}/images/${name}.png`);
  }
  inspect(root);
  assert.ok(references > 10, 'Expected HTML and CSS asset references');
  console.log(
    `Verified ${references} H5 references for the game and unversioned classroom catalog.`,
  );
}
