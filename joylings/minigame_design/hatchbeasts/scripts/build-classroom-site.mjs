import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';

// Export the same classroom at the account-level GitHub Pages root.
const build = spawnSync(process.execPath, ['scripts/build-h5.mjs'], {
  cwd: process.cwd(),
  env: { ...process.env, GITHUB_PAGES_BASE_PATH: '' },
  stdio: 'inherit',
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

const output = resolve('dist/classroom-site');
if (output !== join(resolve('dist'), 'classroom-site'))
  throw new Error('Unexpected classroom site output directory.');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(resolve('dist/h5'), output, { recursive: true });
console.log('Classroom site ready: https://scozirge.github.io/classroom/');
