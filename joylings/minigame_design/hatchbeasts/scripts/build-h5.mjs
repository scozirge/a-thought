import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { verifyH5 } from './verify-h5.mjs';

// Match the repository and folder used on the gh-pages publishing branch.
const basePath = (process.env.GITHUB_PAGES_BASE_PATH ?? '/a-thought/hatchbeasts')
  .replace(/\/+$/, '');
if (basePath && !/^\/(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+$/.test(basePath)) {
  throw new Error('GITHUB_PAGES_BASE_PATH must be empty or a path such as /a-thought/hatchbeasts.');
}

const result = spawnSync(process.execPath, ['node_modules/vinext/dist/cli.js', 'build'], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    GITHUB_PAGES: 'true',
    GITHUB_PAGES_BASE_PATH: basePath,
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  stdio: 'inherit',
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);

// Vinext emits assetPrefix directories on disk. Pages already supplies the
// repository/folder prefix, so assemble a portable folder without doubling it.
const client = resolve('dist/client');
const output = resolve('dist/h5');
const dist = resolve('dist');
if (output !== join(dist, 'h5')) throw new Error('Unexpected H5 output directory.');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(resolve('public'), output, { recursive: true });
for (const file of ['index.html', 'index.rsc']) {
  cpSync(join(client, file), join(output, file));
}
cpSync(join(client, basePath.replace(/^\//, ''), '_next'), join(output, '_next'), { recursive: true });
writeFileSync(join(output, '.nojekyll'), '');
verifyH5(output, basePath);
console.log(`H5 exported and verified at dist/h5 for ${basePath || '/'}.`);
