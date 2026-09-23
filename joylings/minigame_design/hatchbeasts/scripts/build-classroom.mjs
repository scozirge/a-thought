import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { verifyClassroom } from './verify-classroom.mjs';

const build = spawnSync(
  process.execPath,
  ['node_modules/vinext/dist/cli.js', 'build'],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      GITHUB_PAGES: 'true',
      LOCAL_CLASSROOM: 'true',
      GITHUB_PAGES_BASE_PATH: '',
      NEXT_PUBLIC_BASE_PATH: '',
    },
    stdio: 'inherit',
  },
);
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

const output = resolve('dist/classroom-h5');
if (output !== join(resolve('dist'), 'classroom-h5'))
  throw new Error('Unexpected classroom output directory.');
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });
cpSync(resolve('dist/client'), output, {
  recursive: true,
  filter: (source) =>
    !['.vite', 'vinext-client-entry-manifest.json'].includes(basename(source)),
});
// Keep familiar /classroom/.../ links on any simple static HTTP server.
for (const slug of [
  '',
  'experience',
  'red-blue-battle',
  'planning',
  'analysis',
  'development',
  'testing',
  'review',
]) {
  const route = slug ? `classroom/${slug}` : 'classroom';
  mkdirSync(join(output, route), { recursive: true });
  renameSync(join(output, `${route}.html`), join(output, route, 'index.html'));
}
mkdirSync(join(output, 'rhythm'), { recursive: true });
renameSync(join(output, 'rhythm.html'), join(output, 'rhythm', 'index.html'));
mkdirSync(join(output, 'rhythm', 'editor'), { recursive: true });
renameSync(
  join(output, 'rhythm', 'editor.html'),
  join(output, 'rhythm', 'editor', 'index.html'),
);
writeFileSync(
  join(output, 'START.txt'),
  [
    '遊戲設計｜本地課堂 H5',
    '',
    '在這個資料夾開啟終端機，執行：',
    'python -m http.server 4317 --bind 127.0.0.1',
    '',
    '課堂目錄：http://localhost:4317/classroom/',
    '第二次課程：http://localhost:4317/classroom/red-blue-battle/',
    '破殼怪獸：http://localhost:4317/',
    '瀑布精靈音遊 Demo：http://localhost:4317/rhythm/',
    '瀑布精靈製譜器：http://localhost:4317/rhythm/editor/',
    '',
    '請透過本機 HTTP 伺服器開啟，避免直接雙擊 HTML 時瀏覽器限制 JavaScript 模組載入。',
    '教材、圖片、字型與破殼怪獸在此資料夾內；紅藍槍戰連結需要網路。',
  ].join('\n'),
  'utf8',
);
verifyClassroom(output);
console.log(`Local classroom H5 ready: ${output}`);
