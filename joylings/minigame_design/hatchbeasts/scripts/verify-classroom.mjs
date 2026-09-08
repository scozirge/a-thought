import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

export function verifyClassroom(output) {
  const root = resolve(output);
  const slugs = [
    '',
    'experience',
    'planning',
    'analysis',
    'development',
    'testing',
    'review',
  ];
  let references = 0;
  const checkedStyles = new Set();
  function checkReference(value, pageUrl) {
    if (/^(data:|https?:|mailto:)/.test(value)) return;
    const url = new URL(value.replaceAll('&amp;', '&'), pageUrl);
    const path = resolve(root, `.${decodeURIComponent(url.pathname)}`);
    assert.ok(
      path === root || path.startsWith(`${root}${sep}`),
      `Path escapes export: ${value}`,
    );
    const file =
      existsSync(path) && statSync(path).isDirectory()
        ? join(path, 'index.html')
        : path;
    assert.ok(existsSync(file), `Missing link or asset: ${url.pathname}`);
    references++;
    if (url.hash && file.endsWith('.html')) {
      const id = decodeURIComponent(url.hash.slice(1));
      assert.ok(
        readFileSync(file, 'utf8').includes(`id="${id}"`),
        `Missing anchor: ${value}`,
      );
    }
    if (file.endsWith('.css') && !checkedStyles.has(file)) {
      checkedStyles.add(file);
      for (const match of readFileSync(file, 'utf8').matchAll(
        /url\(["']?([^\s)"']+)["']?\)/g,
      )) {
        checkReference(match[1], url.href);
      }
    }
  }
  for (const slug of slugs) {
    const route = `/classroom/${slug ? `${slug}/` : ''}`;
    const file = join(root, route, 'index.html');
    assert.ok(existsSync(file), `Missing classroom page: ${route}`);
    const html = readFileSync(file, 'utf8');
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g))
      checkReference(match[1], `http://localhost${route}`);
    assert.ok(
      html.includes('遊戲設計') || html.includes('課堂筆記'),
      `Missing lesson content: ${route}`,
    );
  }
  const lesson = readFileSync(
    join(root, 'classroom/experience/index.html'),
    'utf8',
  );
  const catalog = readFileSync(join(root, 'classroom/index.html'), 'utf8');
  const publicGame = 'https://scozirge.github.io/a-thought/hatchbeasts/v1/';
  for (const html of [catalog, lesson]) {
    assert.ok(
      html.includes(`href="${publicGame}"`),
      'Missing fixed v1 game link',
    );
  }
  assert.ok(
    catalog.includes('<details') && catalog.includes('<summary'),
    'Missing native activity disclosure',
  );
  for (const activity of [
    '玩目前遊戲',
    '發想更多選項與怪物',
    '發想演出與操作互動',
    '發想怪物孵出後可以幹嘛',
    '設計草圖',
  ]) {
    assert.ok(catalog.includes(activity), `Missing activity: ${activity}`);
  }
  for (const name of [
    '小花熊',
    '香草兔',
    '木妖',
    '影蛇',
    '回聲菇',
    '記憶石獸',
    '瀑布精靈',
    '泡泡龜',
    '彩虹梟',
  ])
    assert.ok(lesson.includes(name), `Missing monster: ${name}`);
  for (const anchor of [
    'current-design',
    'combinations',
    'ideas',
    'sketch',
    'think-1',
    'think-2',
    'think-3',
    'think-4',
    'think-5',
  ])
    assert.ok(
      lesson.includes(`id="${anchor}"`),
      `Missing activity target: ${anchor}`,
    );
  assert.ok(
    readFileSync(join(root, 'index.html'), 'utf8').includes('破殼怪獸'),
    'Missing playable local game',
  );
  assert.ok(
    readdirSync(join(root, '_next/static')).length > 0,
    'Missing application assets',
  );
  console.log(
    `Verified 7 classroom pages, 9 monsters, activity anchors and ${references} local references.`,
  );
}
