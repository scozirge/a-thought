(function(root){
const puzzles=typeof module!=='undefined'?require('./puzzle-levels.js'):root.TogetherPuzzles;
const echo={
  "viewHeight": 360,
  "platforms": [],
  "gates": [
    {
      "x": 520,
      "y": 40,
      "w": 28,
      "h": 360,
      "echoNeeds": [
        0,
        1
      ],
      "openAfterKey": 0
    },
    {
      "x": 1040,
      "y": 40,
      "w": 28,
      "h": 360,
      "echoNeeds": [
        1,
        2
      ],
      "openAfterKey": 1
    },
    {
      "x": 1480,
      "y": 40,
      "w": 28,
      "h": 360,
      "echoNeeds": [
        0,
        2
      ],
      "buttons": [
        {
          "x": 1340,
          "y": 400,
          "w": 54
        }
      ],
      "openAfterKey": 2
    }
  ],
  "boxes": [],
  "lifts": [],
  "switches": [],
  "name": "影子接班",
  "hint": "踩腳印留影子；新影子會換掉舊的。",
  "starts": [
    60,
    110
  ],
  "world": {
    "width": 1770,
    "top": -40,
    "bottom": 520
  },
  "floor": [
    {
      "x": 0,
      "y": 400,
      "w": 1770
    }
  ],
  "echoPads": [
    {
      "x": 160,
      "y": 400,
      "w": 42,
      "echoPad": 0
    },
    {
      "x": 340,
      "y": 400,
      "w": 42,
      "echoPad": 1
    },
    {
      "x": 820,
      "y": 400,
      "w": 42,
      "echoPad": 2
    }
  ],
  "keys": [
    {
      "x": 650,
      "y": 350,
      "r": 12,
      "owner": 0
    },
    {
      "x": 1160,
      "y": 350,
      "r": 12,
      "owner": 1
    },
    {
      "x": 1550,
      "y": 350,
      "r": 12
    }
  ],
  "door": {
    "x": 1660,
    "y": 318,
    "w": 68,
    "h": 82
  },
  "solution": [
    "每人只能留一個影子。踩新的腳印會移走自己的舊影子；跳過腳印就不會換。",
    "先讓貓咪留圓形影子、狗狗留三角形影子。貓咪跳過三角形腳印，穿門拿第一把鑰匙；這扇門就固定打開。",
    "貓咪到方形腳印留下新影子；狗狗保留三角形影子，跳過方形腳印，穿第二道門拿鑰匙。",
    "第二道門固定打開後，重新分配影子：一個留圓形，一個留方形。往返時要避開不想留下的腳印。",
    "其中一人踩住最後的普通按鈕，另一人穿門拿第三把鑰匙。這次普通按鈕不會製造影子。",
    "最後的門固定開了，接回踩按鈕的朋友，兩人一起到小屋。"
  ]
};
const levels=[puzzles.ferry,echo,puzzles.linked].map((l,id)=>({...structuredClone(l),id,lab:true,group:'main',saveKey:`local-puzzle-${id+1}-1`}));
if(typeof module!=='undefined')module.exports=levels;else root.TogetherLabLevels=levels;
})(globalThis);
