const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, 'web', name), 'utf8');
const out = path.join(root, 'Builds', 'Web');
fs.mkdirSync(out, { recursive: true });
const inlineScript = name => `<script>\n${read(name).replace(/<\/script/gi, '<\\/script')}\n</script>`;
const html = read('index.html')
  .replace('<link rel="stylesheet" href="style.css">', `<style>\n${read('style.css')}\n</style>`)
  .replace('<script src="hero-rules.js"></script>', inlineScript('hero-rules.js'))
  .replace('<script src="penguin-rules.js"></script>', inlineScript('penguin-rules.js'))
  .replace('<script src="animal-rules.js"></script>', inlineScript('animal-rules.js'))
  .replace('<script src="sticker-more.js"></script>', inlineScript('sticker-more.js'))
  .replace('<script src="advanced-levels.js"></script>', inlineScript('advanced-levels.js'))
  .replace('<script src="animal-view.js"></script>', inlineScript('animal-view.js'))
  .replace('<script src="rules.js"></script>', inlineScript('rules.js'))
  .replace('<script src="catalog.js"></script>', inlineScript('catalog.js'))
  .replace('<script src="hero-view.js"></script>', inlineScript('hero-view.js'))
  .replace('<script src="penguin-view.js"></script>', inlineScript('penguin-view.js'))
  .replace('<script src="app.js"></script>', inlineScript('app.js'));
fs.writeFileSync(path.join(out, 'index.html'), html);
fs.writeFileSync(path.join(out, '使用說明.txt'), '\uFEFF' + [
  '一起想想｜合作解謎遊樂園（H5 本地教師版 v0.10.1）', '',
  '解壓縮後，雙擊 index.html，以 Chrome 或 Edge 開啟。',
  '不必安裝、不必連網、不必啟動伺服器。H5 只支援同一台裝置操作；多人連線請使用 Unity WebGL 版。', '',
  '貼紙工廠 20 關、帶企鵝回家 20 關，共 40 關。動物與勇者已移除，貼紙全部不旋轉。',
  '每關固定第 1 組、第 2 組、第 3 組、老師組各選一次，總共四次，沒有第二輪。',
  '沒湊滿三組學生也能玩，老師可以在同一台電腦代填全部四組。',
  '前三關是簡單暖身；後面提高重疊與地形推理，作答仍是四次。',
  '貼紙：每組選一種顏色，後貼蓋前貼。作答區清楚標示自己是哪組及第幾張。',
  '第 11～14 關重疊較多；15～18 關會有不同組同色、只露一小部分；19～20 關前三張各留一格線索。',
  '企鵝：每組選一個方向，碰冰塊或邊界才停，四步結束都在家才成功。',
  '前三關只有一隻；後段需一起考慮兩個冰場。第 11 關起 5×5；最後兩關要注意到家後還會再離開。',
  '看目標 → 四組各填一次 → 播放 → 依結果修改。',
  '播放中可停下來修改；失敗與重試保留四組設定。企鵝可暫停、繼續，保留加快播放與 2 倍速。', '',
  '完成記錄與單機設定會盡可能保存在瀏覽器中。',
  '私密模式、不同瀏覽器或移動檔案位置，可能不保留原進度。',
  '手機若不允許直接執行本地 HTML，可使用專案附的本機 HTTP 伺服器。', ''
].join('\r\n'));
console.log(`已輸出單檔 H5：${path.join(out, 'index.html')}（${Buffer.byteLength(html).toLocaleString()} bytes）`);
