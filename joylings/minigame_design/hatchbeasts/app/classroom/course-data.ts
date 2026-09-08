export const units = [
  { slug: 'experience', title: '遊戲體驗與發想', icon: 'game', color: 'rose' },
  { slug: 'planning', title: '設計與規劃', icon: 'pencil', color: 'green' },
  { slug: 'analysis', title: '功能分析', icon: 'puzzle', color: 'purple' },
  { slug: 'development', title: '遊戲開發', icon: 'code', color: 'blue' },
  { slug: 'testing', title: '試玩驗收', icon: 'flag', color: 'yellow' },
  { slug: 'review', title: '核心邏輯複習', icon: 'brain', color: 'peach' },
] as const;

export const activities = [
  { title: '玩目前遊戲', anchor: 'current-design' },
  { title: '發想更多選項與怪物', anchor: 'think-1' },
  { title: '發想演出與操作互動', anchor: 'think-4' },
  { title: '發想怪物孵出後可以幹嘛', anchor: 'think-5' },
  { title: '設計草圖', anchor: 'sketch' },
] as const;

export const prompts = [
  { tag: '選項', text: '選項 1 可以多哪個選項？' },
  { tag: '組合', text: '多一個選項，會需要多幾隻怪物要畫？' },
  { tag: '角色', text: '怪物長什麼樣、有什麼特徵？破殼後會說什麼？' },
  { tag: '演出', text: '破殼演出可以怎麼互動跟演出？' },
  { tag: '玩法', text: '怪物孵出後可以幹嘛？怎麼樣變成好玩的遊戲？' },
] as const;

export const eggDesigns = [
  { code: '11', name: '小花熊', egg: '蛋頂部有一朵小花，佈滿粉色的毛茸茸。' },
  { code: '12', name: '香草兔', egg: '蛋上佈滿不同深淺的粉色草皮。' },
  { code: '13', name: '木妖', egg: '蛋有木紋。' },
  { code: '21', name: '影蛇', egg: '蛋是黑色的，佈滿鱗片。' },
  { code: '22', name: '回聲菇', egg: '蛋佈滿菌類。' },
  { code: '23', name: '記憶石獸', egg: '蛋是石頭材質，有裂痕。' },
  {
    code: '31',
    name: '瀑布精靈',
    egg: '湖水藍色的蛋有點透明，隱約能看見裡面透光的水。',
  },
  { code: '32', name: '泡泡龜', egg: '堅硬的蛋殼有大小不均的孔洞，冒出泡泡。' },
  { code: '33', name: '彩虹梟', egg: '彩色的蛋。' },
] as const;
