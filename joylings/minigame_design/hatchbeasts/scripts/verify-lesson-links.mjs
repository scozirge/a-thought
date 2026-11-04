import assert from 'node:assert/strict';

export function verifyLessonLinks(html) {
  const weeks = [
    ['sixth-course', '第 6 週課程', 'https://scozirge.github.io/a-thought/wood-exit/'],
    ['seventh-course', '第 7 週課程', 'https://scozirge.github.io/together-online/'],
    ['eighth-course', '第 8 週課程', 'https://scozirge.github.io/a-thought/little-engineer/'],
  ];
  let previous = -1;
  for (const [id, heading, url] of weeks) {
    const section = html.match(new RegExp(`<section[^>]* id="${id}"[^>]*>[\\s\\S]*?</section>`));
    assert.ok(section && section.index > previous && section[0].includes(heading) &&
      section[0].includes(`href="${url}"`), `課程位置或遊戲入口有誤：${heading}`);
    previous = section.index;
  }
  assert.ok(!html.includes('tip=true'), '公開課程目錄含有老師提示說明或連結');
}
