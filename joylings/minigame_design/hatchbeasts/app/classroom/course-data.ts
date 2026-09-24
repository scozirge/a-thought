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
  { title: '怎麼讓遊戲更好玩、更好', anchor: 'think-5' },
  { title: '拿起紙筆動手設計', anchor: 'sketch' },
] as const;

export const prompts = [
  { tag: '選項', text: '還可以增加哪個新地點？' },
  { tag: '角色', text: '怪物長什麼樣、有什麼特徵？' },
  { tag: '組合', text: '多一個選項，會需要多幾隻怪物要畫？' },
  { tag: '演出', text: '破殼演出可以怎麼互動跟演出？' },
  { tag: '玩法', text: '怎麼追加設計可以讓遊戲更好？' },
] as const;

export const redBlueQuestions = [
  {
    anchor: 'weapons',
    text: '目前遊戲中有哪些武器？',
    answers: ['手槍', '步槍', '狙擊槍', '散彈槍'],
  },
  {
    anchor: 'features',
    text: '這些武器有什麼特點？',
    answers: [
      '手槍：一開始拿到的武器。',
      '步槍：可以連發，一直射擊。',
      '狙擊槍：可以打很遠。',
      '散彈槍：距離很近時，傷害很高。',
    ],
  },
  {
    anchor: 'new-weapons',
    text: '還可以加什麼武器？',
    answers: [
      '手榴彈：丟出去後會爆炸。',
      '刀子：靠近對手時使用。',
      '煙霧彈：放出煙霧，讓對手看不清楚。',
      '火箭炮：射出會爆炸的火箭。',
    ],
  },
  {
    anchor: 'skills',
    text: '角色可以有什麼技能？',
    answers: [
      '隱形：讓對手暫時看不見你。',
      '分身假人：放出一個假的自己，讓對手認錯人。',
      '彈跳背包：幫助角色跳得更高、更遠。',
    ],
  },
] as const;

export const redBlueRetrospective = [
  { tag: '課堂互動', text: '這次上課很成功。學生非常專注地在連線玩遊戲，能立刻理解遊戲，並彼此互動。' },
  { tag: '提問狀況', text: '有出題目讓他們解答，但太過度專注在遊戲，沒辦法每個人都認真思考問題。' },
  { tag: '紙上設計', text: '這次也有強迫每個人把想要的新武器寫在紙上，並思考強不強，每個人都有寫。' },
  { tag: '新武器', text: '下次會把這些新武器的想法更新到遊戲中。' },
  { tag: '遊戲內提問', text: '下次也要把題目加在遊戲中，強迫他們思考，試試看。' },
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
