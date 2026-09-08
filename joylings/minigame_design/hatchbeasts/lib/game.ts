export interface Choice {
  id: string;
  label: string;
  shortLabel?: string;
  description: string;
  image: string;
  alt: string;
  tint: string;
  edge: string;
}
export const PLACES: readonly Choice[] = [
  {
    id: '1',
    label: '香氣花園',
    description: '花香、微風，還有一點小魔法',
    image: 'garden',
    alt: '蠟筆畫的花園、玫瑰花架與小白兔',
    tint: '#f5d7d4',
    edge: '#9aab7e',
  },
  {
    id: '2',
    label: '神祕洞穴',
    description: '走進微光裡，發現藏起來的祕密',
    image: 'cave',
    alt: '蠟筆畫的黑紫色洞穴、紫色水晶、小燈與灰色小貓',
    tint: '#e1d7ed',
    edge: '#9b88ae',
  },
  {
    id: '3',
    label: '森林瀑布',
    description: '聽聽水聲，跟著森林深呼吸',
    image: 'waterfall',
    alt: '蠟筆畫的森林瀑布與溪邊小鹿',
    tint: '#dde8cf',
    edge: '#8fa58c',
  },
];
export const ACTIVITIES: readonly Choice[] = [
  {
    id: '1',
    label: '玩遊戲、看漫畫或動畫',
    shortLabel: '遊戲與故事',
    description: '躲進喜歡的故事，展開新冒險',
    image: 'leisure',
    alt: '小怪獸玩奇幻遊戲機，旁邊有魔法漫畫書',
    tint: '#e5dcf0',
    edge: '#a291b0',
  },
  {
    id: '2',
    label: '跟朋友玩',
    shortLabel: '跟朋友玩',
    description: '有人一起笑，什麼都變好玩',
    image: 'friends',
    alt: '幾隻呆萌小怪獸一起開心玩球',
    tint: '#f5dbcf',
    edge: '#bf9b85',
  },
  {
    id: '3',
    label: '學習',
    shortLabel: '學習新事物',
    description: '今天，又想弄懂一個新問題',
    image: 'learning',
    alt: '小怪獸研究魔法書、漂浮羽毛筆與水晶',
    tint: '#e3e6c8',
    edge: '#a3a277',
  },
];
export interface Beast {
  id: string;
  name: string;
  egg: string;
  color: string;
  tint: string;
  tag: string;
  story: string;
}
export const BEASTS: Record<string, Beast> = {
  '11': {
    id: '11',
    name: '小花熊',
    egg: '蛋頂有一朵小花，整顆蛋覆滿粉色的毛茸茸。',
    color: '#b35f86',
    tint: '#f8e0ed',
    tag: '花園裡的故事迷',
    story: '喜歡窩在花香裡，陪你一起發現故事中的小驚喜。',
  },
  '12': {
    id: '12',
    name: '香草兔',
    egg: '蛋上鋪滿深淺不同的粉色草皮。',
    color: '#ac6186',
    tint: '#f6e1ed',
    tag: '最愛一起玩的好朋友',
    story: '只要有朋友在身邊，平凡的一天也能蹦出好多快樂。',
  },
  '13': {
    id: '13',
    name: '木妖',
    egg: '蛋殼上有一圈圈細緻的木紋。',
    color: '#6f8163',
    tint: '#e6eddc',
    tag: '花園裡的好奇寶寶',
    story: '總想知道花為什麼開、樹為什麼長高，等你一起找答案。',
  },
  '21': {
    id: '21',
    name: '影蛇',
    egg: '黑色的蛋殼，覆滿層層鱗片。',
    color: '#78609c',
    tint: '#e8dff3',
    tag: '微光裡的冒險家',
    story: '喜歡神祕的故事，也喜歡陪你探索下一個轉角。',
  },
  '22': {
    id: '22',
    name: '回聲菇',
    egg: '蛋殼上長滿各式各樣的菌類。',
    color: '#996995',
    tint: '#eedff0',
    tag: '把笑聲傳給你的朋友',
    story: '最愛聽朋友的聲音，讓開心的回聲在洞穴裡傳得遠遠的。',
  },
  '23': {
    id: '23',
    name: '記憶石獸',
    egg: '石頭材質的蛋殼上，帶著幾道裂痕。',
    color: '#738092',
    tint: '#e3e8f0',
    tag: '收藏知識的小夥伴',
    story: '每學會一件新事，就把它當成亮晶晶的寶物收好。',
  },
  '31': {
    id: '31',
    name: '瀑布精靈',
    egg: '湖水藍的蛋有點透明，隱約看得到裡面透光的水。',
    color: '#478f9f',
    tint: '#d9f0f3',
    tag: '水花裡的夢想家',
    story: '跟著水聲想像遠方，最喜歡和你分享奇妙的冒險故事。',
  },
  '32': {
    id: '32',
    name: '泡泡龜',
    egg: '堅硬的蛋殼上有大小不一的孔洞，正冒出一顆顆泡泡。',
    color: '#528e84',
    tint: '#dcf0e9',
    tag: '帶著泡泡來找你玩',
    story: '慢慢走也沒關係，有朋友和泡泡陪伴，每一步都很好玩。',
  },
  '33': {
    id: '33',
    name: '彩虹梟',
    egg: '蛋殼帶著繽紛的彩虹色彩。',
    color: '#8f71b3',
    tint: '#ebe0f5',
    tag: '閃著七彩光的探索家',
    story: '一個問題就像一道新顏色，讓世界一天比一天更繽紛。',
  },
};
export const HATCH_TAPS = 12;
export type Stage = 'place' | 'activity' | 'egg' | 'hatching' | 'result';
export interface GameState {
  stage: Stage;
  place: string | null;
  activity: string | null;
  taps: number;
}
export type GameAction =
  | { type: 'SELECT'; value: string }
  | { type: 'NEXT' | 'BACK' | 'TAP' | 'REVEAL' | 'RESET' };
export const initialState: GameState = {
  stage: 'place',
  place: null,
  activity: null,
  taps: 0,
};
export function getBeast(state: GameState): Beast | null {
  return state.place && state.activity
    ? (BEASTS[`${state.place}${state.activity}`] ?? null)
    : null;
}
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'SELECT':
      if (!['1', '2', '3'].includes(action.value)) return state;
      if (state.stage === 'place') return { ...state, place: action.value };
      if (state.stage === 'activity')
        return { ...state, activity: action.value };
      return state;
    case 'NEXT':
      if (state.stage === 'place' && state.place)
        return { ...state, stage: 'activity' };
      if (state.stage === 'activity' && getBeast(state))
        return { ...state, stage: 'egg', taps: 0 };
      return state;
    case 'BACK':
      return state.stage === 'activity' ? { ...state, stage: 'place' } : state;
    case 'TAP': {
      if (state.stage !== 'egg') return state;
      const taps = Math.min(HATCH_TAPS, state.taps + 1);
      return {
        ...state,
        taps,
        stage: taps === HATCH_TAPS ? 'hatching' : 'egg',
      };
    }
    case 'REVEAL':
      return state.stage === 'hatching' ? { ...state, stage: 'result' } : state;
    case 'RESET':
      return { ...initialState };
    default:
      return state;
  }
}
