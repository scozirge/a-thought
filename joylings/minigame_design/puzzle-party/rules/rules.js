(function (root, factory) {
  const common = typeof module === 'object' && module.exports;
  const api = factory(common ? require('./hero-rules.js') : root.HeroRules, common ? require('./penguin-rules.js') : root.PenguinRules, common ? require('./animal-rules.js') : root.AnimalRules);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PuzzleRules = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (H, P, A) {
  'use strict';

  const colors = {
    red: { name: '紅', hex: '#ed7064' },
    yellow: { name: '黃', hex: '#f2c85b' },
    blue: { name: '藍', hex: '#6b9fdd' },
    green: { name: '綠', hex: '#67b49b' }
  };
  const sticker = [
    {
      "id": "sticker-v5-1",
      "title": "四組各貼一格",
      "note": "暖身：每組只貼一格，直接比對目標顏色。",
      "cols": 2,
      "rows": 2,
      "masks": [
        [
          0
        ],
        [
          1
        ],
        [
          2
        ],
        [
          3
        ]
      ],
      "palette": [
        "red",
        "blue"
      ],
      "target": [
        "red",
        "blue",
        "blue",
        "red"
      ],
      "stage": "暖身"
    },
    {
      "id": "sticker-v5-2",
      "title": "後貼的蓋一格",
      "note": "暖身：第二組蓋住一格，其他組的位置很好找。",
      "cols": 2,
      "rows": 2,
      "masks": [
        [
          0,
          1
        ],
        [
          1
        ],
        [
          2
        ],
        [
          3
        ]
      ],
      "palette": [
        "red",
        "blue"
      ],
      "target": [
        "red",
        "blue",
        "red",
        "blue"
      ],
      "stage": "暖身"
    },
    {
      "id": "sticker-v5-3",
      "title": "四組依序接力",
      "note": "暖身：前面三張只在相鄰格子重疊，老師組完成最後一格。",
      "cols": 2,
      "rows": 2,
      "masks": [
        [
          0,
          1
        ],
        [
          1,
          2
        ],
        [
          2
        ],
        [
          3
        ]
      ],
      "palette": [
        "red",
        "blue"
      ],
      "target": [
        "blue",
        "red",
        "blue",
        "red"
      ],
      "stage": "暖身"
    },
    {
      "id": "sticker-v5-4",
      "title": "九宮格拼布",
      "note": "三組各貼一排，老師組再蓋中間一格。",
      "cols": 3,
      "rows": 3,
      "masks": [
        [
          0,
          1,
          2
        ],
        [
          3,
          4,
          5
        ],
        [
          6,
          7,
          8
        ],
        [
          4
        ]
      ],
      "palette": [
        "red",
        "yellow",
        "blue"
      ],
      "target": [
        "blue",
        "blue",
        "blue",
        "red",
        "blue",
        "red",
        "yellow",
        "yellow",
        "yellow"
      ],
      "stage": "進階"
    },
    {
      "id": "sticker-v5-5",
      "title": "貼三張，系統轉",
      "note": "第三張貼完，整張作品自動右轉一次；老師組再貼最後一張。",
      "cols": 2,
      "rows": 2,
      "masks": [
        [
          0
        ],
        [
          1
        ],
        [
          2
        ],
        [
          2
        ]
      ],
      "palette": [
        "red",
        "blue"
      ],
      "rotateAfter": 3,
      "target": [
        "blue",
        "red",
        "red",
        "blue"
      ],
      "stage": "進階"
    },
    {
      "id": "sticker-v5-6",
      "title": "轉過來再蓋",
      "note": "前三組先貼，系統轉盤後，老師組才蓋上自己的顏色。",
      "cols": 3,
      "rows": 3,
      "masks": [
        [
          0,
          1,
          2
        ],
        [
          3,
          4,
          5
        ],
        [
          6,
          7,
          8
        ],
        [
          0,
          4,
          8
        ]
      ],
      "palette": [
        "red",
        "yellow",
        "blue"
      ],
      "rotateAfter": 3,
      "target": [
        "red",
        "red",
        "blue",
        "yellow",
        "red",
        "blue",
        "yellow",
        "red",
        "red"
      ],
      "stage": "進階"
    },
    {
      "id": "sticker-v5-7",
      "title": "這次提早轉",
      "note": "第二張貼完就自動轉。第三組和老師組的位置是在轉盤之後。",
      "cols": 3,
      "rows": 3,
      "masks": [
        [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8
        ],
        [
          0,
          1,
          2
        ],
        [
          0,
          3,
          6
        ],
        [
          4,
          5
        ]
      ],
      "palette": [
        "red",
        "yellow",
        "blue"
      ],
      "rotateAfter": 2,
      "target": [
        "red",
        "blue",
        "yellow",
        "red",
        "yellow",
        "yellow",
        "red",
        "blue",
        "yellow"
      ],
      "stage": "進階"
    },
    {
      "id": "sticker-v5-8",
      "title": "追蹤轉前的角落",
      "note": "轉盤會帶著前三張一起轉，第四張的位置不會跟著轉。",
      "cols": 3,
      "rows": 3,
      "masks": [
        [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8
        ],
        [
          0,
          1,
          3,
          4
        ],
        [
          1,
          4,
          7
        ],
        [
          0,
          4,
          8
        ]
      ],
      "palette": [
        "red",
        "yellow",
        "blue",
        "green"
      ],
      "rotateAfter": 3,
      "target": [
        "green",
        "yellow",
        "yellow",
        "red",
        "green",
        "red",
        "blue",
        "blue",
        "green"
      ],
      "stage": "挑戰"
    },
    {
      "id": "sticker-v5-9",
      "title": "前兩張去哪了",
      "note": "先找到轉盤之後，前兩張還露在哪些格子。",
      "cols": 3,
      "rows": 3,
      "masks": [
        [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8
        ],
        [
          0,
          1,
          2,
          4
        ],
        [
          1,
          4,
          7
        ],
        [
          0,
          4,
          8
        ]
      ],
      "palette": [
        "red",
        "yellow",
        "blue",
        "green"
      ],
      "rotateAfter": 2,
      "target": [
        "yellow",
        "blue",
        "red",
        "green",
        "yellow",
        "red",
        "green",
        "blue",
        "yellow"
      ],
      "stage": "挑戰"
    },
    {
      "id": "sticker-v5-10",
      "title": "轉盤後的最後一層",
      "note": "前面三層旋轉一次，再加上最後一層；每組只選顏色。",
      "cols": 3,
      "rows": 3,
      "masks": [
        [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7,
          8
        ],
        [
          0,
          1,
          2,
          3,
          4,
          5
        ],
        [
          1,
          4,
          7
        ],
        [
          0,
          4,
          8
        ]
      ],
      "palette": [
        "red",
        "yellow",
        "blue",
        "green"
      ],
      "rotateAfter": 3,
      "target": [
        "green",
        "blue",
        "blue",
        "red",
        "green",
        "red",
        "yellow",
        "blue",
        "green"
      ],
      "stage": "挑戰"
    }
  ];

  const hero = [
    {
      "id": "hero-v5-1",
      "title": "一直走，拿好劍",
      "name": "一直走，拿好劍",
      "note": "暖身：先走到劍上，再拿劍、攻擊。這關只用三種指令。",
      "size": 4,
      "start": [
        0,
        3
      ],
      "sword": [
        1,
        3
      ],
      "monster": [
        2,
        3
      ],
      "goal": [
        3,
        2
      ],
      "walls": [
        [
          0,
          2
        ],
        [
          1,
          2
        ],
        [
          2,
          2
        ]
      ],
      "steps": 6,
      "program": [
        null,
        null,
        null,
        "right",
        null,
        "up"
      ],
      "editable": [
        0,
        1,
        2,
        4
      ],
      "commands": [
        "right",
        "take",
        "attack"
      ],
      "stage": "暖身"
    },
    {
      "id": "hero-v5-2",
      "title": "上去，再轉彎",
      "name": "上去，再轉彎",
      "note": "暖身：上、右都是畫面上的方向。看看固定指令會幫你走到哪裡。",
      "size": 4,
      "start": [
        0,
        3
      ],
      "sword": [
        0,
        2
      ],
      "monster": [
        1,
        1
      ],
      "goal": [
        2,
        1
      ],
      "walls": [
        [
          1,
          3
        ],
        [
          1,
          2
        ],
        [
          0,
          0
        ],
        [
          1,
          0
        ]
      ],
      "steps": 6,
      "program": [
        null,
        null,
        "up",
        null,
        "right",
        null
      ],
      "editable": [
        0,
        1,
        3,
        5
      ],
      "commands": [
        "up",
        "right",
        "take",
        "attack"
      ],
      "stage": "暖身"
    },
    {
      "id": "hero-v5-3",
      "title": "接好最後兩步",
      "name": "接好最後兩步",
      "note": "暖身：拿劍與攻擊的順序不變，把出口前的方向接好。",
      "size": 4,
      "start": [
        0,
        3
      ],
      "sword": [
        1,
        3
      ],
      "monster": [
        2,
        2
      ],
      "goal": [
        2,
        1
      ],
      "walls": [
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          3,
          1
        ],
        [
          3,
          3
        ]
      ],
      "steps": 6,
      "editable": [
        0,
        1,
        2,
        5
      ],
      "program": [
        null,
        null,
        null,
        "attack",
        "right",
        null
      ],
      "commands": [
        "up",
        "right",
        "take",
        "attack"
      ],
      "stage": "暖身"
    },
    {
      "id": "hero-v5-4",
      "title": "怪物會往左走",
      "name": "怪物會往左走",
      "note": "第 2 步做完，怪物會往左走。攻擊要看牠移動後的位置。",
      "size": 4,
      "start": [
        0,
        3
      ],
      "sword": [
        1,
        3
      ],
      "monster": [
        3,
        2
      ],
      "goal": [
        2,
        1
      ],
      "walls": [
        [
          0,
          1
        ],
        [
          1,
          1
        ],
        [
          3,
          1
        ],
        [
          3,
          3
        ]
      ],
      "steps": 6,
      "program": [
        null,
        null,
        null,
        null,
        "right",
        "up"
      ],
      "editable": [
        0,
        1,
        2,
        3
      ],
      "events": [
        {
          "after": 2,
          "move": "left"
        }
      ],
      "stage": "進階"
    },
    {
      "id": "hero-v5-5",
      "title": "從噴火旁邊繞過",
      "name": "從噴火旁邊繞過",
      "note": "第 4 步做完，怪物向下噴火兩格。攻擊前先選安全的站位。",
      "size": 4,
      "start": [
        0,
        3
      ],
      "sword": [
        1,
        3
      ],
      "monster": [
        2,
        1
      ],
      "goal": [
        3,
        1
      ],
      "walls": [
        [
          0,
          1
        ],
        [
          3,
          0
        ],
        [
          3,
          3
        ]
      ],
      "steps": 7,
      "program": [
        null,
        "take",
        null,
        null,
        "attack",
        null,
        "right"
      ],
      "editable": [
        0,
        2,
        3,
        5
      ],
      "events": [
        {
          "after": 4,
          "fire": {
            "direction": "down",
            "range": 2
          }
        }
      ],
      "stage": "進階"
    },
    {
      "id": "hero-v5-6",
      "title": "等火熄了再過",
      "name": "等火熄了再過",
      "note": "火只在標示的那一步噴出。先在安全的地方等，再走進通道。",
      "size": 4,
      "start": [
        0,
        3
      ],
      "sword": [
        1,
        2
      ],
      "monster": [
        1,
        0
      ],
      "goal": [
        2,
        0
      ],
      "walls": [
        [
          2,
          2
        ],
        [
          2,
          3
        ],
        [
          3,
          1
        ]
      ],
      "steps": 8,
      "program": [
        "up",
        null,
        null,
        null,
        "up",
        null,
        "up",
        "right"
      ],
      "editable": [
        1,
        2,
        3,
        5
      ],
      "events": [
        {
          "after": 2,
          "fire": {
            "direction": "down",
            "range": 3
          }
        }
      ],
      "stage": "進階"
    },
    {
      "id": "hero-v5-7",
      "title": "先避開，再攔截",
      "name": "先避開，再攔截",
      "note": "怪物先擋路，再向上、向右。勇者先動，不能走進當下有怪物的格子。",
      "size": 4,
      "start": [
        0,
        3
      ],
      "sword": [
        1,
        3
      ],
      "monster": [
        1,
        1
      ],
      "goal": [
        3,
        2
      ],
      "walls": [
        [
          0,
          2
        ],
        [
          3,
          3
        ],
        [
          2,
          0
        ]
      ],
      "steps": 6,
      "program": [
        null,
        null,
        null,
        null,
        "attack",
        "right"
      ],
      "editable": [
        0,
        1,
        2,
        3
      ],
      "events": [
        {
          "after": 2,
          "move": "down"
        },
        {
          "after": 3,
          "move": "up"
        },
        {
          "after": 4,
          "move": "right"
        }
      ],
      "stage": "進階"
    },
    {
      "id": "hero-v5-8",
      "title": "移動後才噴火",
      "name": "移動後才噴火",
      "note": "怪物移動後，噴火也從新位置開始。先推位置，再推火的範圍。",
      "size": 4,
      "start": [
        0,
        3
      ],
      "sword": [
        1,
        3
      ],
      "monster": [
        3,
        1
      ],
      "goal": [
        2,
        0
      ],
      "walls": [
        [
          0,
          1
        ],
        [
          3,
          0
        ],
        [
          3,
          3
        ]
      ],
      "steps": 7,
      "program": [
        null,
        "take",
        null,
        null,
        "attack",
        null,
        "up"
      ],
      "editable": [
        0,
        2,
        3,
        5
      ],
      "events": [
        {
          "after": 2,
          "move": "left"
        },
        {
          "after": 4,
          "fire": {
            "direction": "down",
            "range": 2
          }
        }
      ],
      "stage": "挑戰"
    },
    {
      "id": "hero-v5-9",
      "title": "等火熄了再傳回",
      "name": "等火熄了再傳回",
      "note": "遠處拿劍後，先看回程紫色圈會不會被火燒到。",
      "size": 4,
      "start": [
        0,
        3
      ],
      "sword": [
        3,
        0
      ],
      "monster": [
        1,
        2
      ],
      "goal": [
        2,
        2
      ],
      "walls": [
        [
          0,
          2
        ],
        [
          2,
          3
        ],
        [
          3,
          1
        ]
      ],
      "portals": [
        [
          1,
          3
        ],
        [
          2,
          0
        ]
      ],
      "steps": 8,
      "program": [
        null,
        "right",
        "take",
        null,
        null,
        null,
        "up",
        "right"
      ],
      "editable": [
        0,
        3,
        4,
        5
      ],
      "events": [
        {
          "after": 4,
          "fire": {
            "direction": "down",
            "range": 1
          }
        }
      ],
      "stage": "挑戰"
    },
    {
      "id": "hero-v5-10",
      "title": "先攻擊，阻止噴火",
      "name": "先攻擊，阻止噴火",
      "note": "第 6 步先攻擊就能阻止接著的噴火；還要接上兩次固定移動。",
      "size": 4,
      "start": [
        0,
        3
      ],
      "sword": [
        3,
        1
      ],
      "monster": [
        0,
        1
      ],
      "goal": [
        2,
        0
      ],
      "walls": [
        [
          0,
          0
        ],
        [
          1,
          0
        ],
        [
          3,
          0
        ],
        [
          3,
          2
        ]
      ],
      "portals": [
        [
          1,
          3
        ],
        [
          2,
          1
        ]
      ],
      "steps": 8,
      "program": [
        null,
        "right",
        "take",
        null,
        null,
        null,
        "down",
        "up"
      ],
      "editable": [
        0,
        3,
        4,
        5
      ],
      "events": [
        {
          "after": 2,
          "move": "down"
        },
        {
          "after": 6,
          "fire": {
            "direction": "right",
            "range": 3
          }
        }
      ],
      "stage": "挑戰"
    }
  ];

  const penguin = [
    {
      "id": "penguin-v5-1",
      "title": "四組沿著冰道走",
      "note": "暖身：四組各選一次，只有向右與向上。先看下一個停靠點。",
      "steps": 4,
      "boards": [
        {
          "size": 3,
          "start": [
            0,
            2
          ],
          "goal": [
            2,
            0
          ],
          "walls": [
            [
              2,
              2
            ],
            [
              1,
              0
            ]
          ]
        }
      ],
      "stage": "暖身",
      "directions": [
        "right",
        "up"
      ]
    },
    {
      "id": "penguin-v5-2",
      "title": "同方向，滑得更遠",
      "note": "暖身：仍只有向右與向上，這次每次可能滑不只一格。",
      "steps": 4,
      "boards": [
        {
          "size": 4,
          "start": [
            0,
            3
          ],
          "goal": [
            3,
            0
          ],
          "walls": [
            [
              3,
              3
            ],
            [
              2,
              0
            ]
          ]
        }
      ],
      "stage": "暖身",
      "directions": [
        "right",
        "up"
      ]
    },
    {
      "id": "penguin-v5-3",
      "title": "轉彎再接回家",
      "note": "暖身：多認識向下。四組仍各負責一次方向。",
      "steps": 4,
      "boards": [
        {
          "size": 4,
          "start": [
            0,
            3
          ],
          "goal": [
            3,
            2
          ],
          "walls": [
            [
              0,
              0
            ],
            [
              3,
              1
            ],
            [
              2,
              3
            ]
          ]
        }
      ],
      "stage": "暖身",
      "directions": [
        "up",
        "right",
        "down"
      ]
    },
    {
      "id": "penguin-v5-4",
      "title": "四組接力滑",
      "note": "現在四組各排一次方向。先帶小紅走完四次。",
      "steps": 4,
      "boards": [
        {
          "size": 4,
          "start": [
            1,
            0
          ],
          "walls": [
            [
              2,
              0
            ],
            [
              3,
              0
            ],
            [
              3,
              3
            ]
          ],
          "goal": [
            3,
            1
          ]
        }
      ],
      "stage": "進階"
    },
    {
      "id": "penguin-v5-5",
      "title": "兩隻一起出發",
      "note": "兩隻同時讀相同方向，滑行的距離可以不一樣。",
      "steps": 4,
      "boards": [
        {
          "size": 4,
          "start": [
            2,
            1
          ],
          "walls": [
            [
              3,
              0
            ],
            [
              1,
              1
            ],
            [
              0,
              3
            ]
          ],
          "goal": [
            3,
            2
          ]
        },
        {
          "size": 4,
          "start": [
            3,
            0
          ],
          "walls": [
            [
              0,
              1
            ],
            [
              1,
              1
            ]
          ],
          "goal": [
            3,
            2
          ]
        }
      ],
      "stage": "進階"
    },
    {
      "id": "penguin-v5-6",
      "title": "兩邊都要看",
      "note": "一邊能回家的方法，另一邊不一定能用。一起比對四個方向。",
      "steps": 4,
      "boards": [
        {
          "size": 4,
          "start": [
            1,
            1
          ],
          "walls": [
            [
              2,
              1
            ],
            [
              0,
              2
            ],
            [
              0,
              0
            ],
            [
              1,
              3
            ]
          ],
          "goal": [
            2,
            3
          ]
        },
        {
          "size": 4,
          "start": [
            1,
            2
          ],
          "walls": [
            [
              3,
              2
            ],
            [
              0,
              2
            ]
          ],
          "goal": [
            0,
            1
          ]
        }
      ],
      "stage": "進階"
    },
    {
      "id": "penguin-v5-7",
      "title": "你停下，我繼續",
      "note": "一隻被冰塊擋住時，另一隻仍然會繼續滑。",
      "steps": 4,
      "boards": [
        {
          "size": 4,
          "start": [
            1,
            3
          ],
          "walls": [
            [
              2,
              2
            ],
            [
              0,
              0
            ],
            [
              1,
              0
            ]
          ],
          "goal": [
            2,
            0
          ]
        },
        {
          "size": 4,
          "start": [
            1,
            3
          ],
          "walls": [
            [
              1,
              1
            ],
            [
              2,
              0
            ],
            [
              3,
              2
            ],
            [
              0,
              1
            ]
          ],
          "goal": [
            2,
            1
          ]
        }
      ],
      "stage": "進階"
    },
    {
      "id": "penguin-v5-8",
      "title": "第一步先等等",
      "note": "第一步有一隻留在原地，可能正好幫另一隻準備下一次轉彎。",
      "steps": 4,
      "boards": [
        {
          "size": 4,
          "start": [
            2,
            1
          ],
          "walls": [
            [
              1,
              0
            ],
            [
              3,
              0
            ],
            [
              0,
              3
            ]
          ],
          "goal": [
            3,
            1
          ]
        },
        {
          "size": 4,
          "start": [
            1,
            3
          ],
          "walls": [
            [
              1,
              1
            ],
            [
              1,
              0
            ],
            [
              0,
              1
            ]
          ],
          "goal": [
            3,
            2
          ]
        }
      ],
      "stage": "挑戰"
    },
    {
      "id": "penguin-v5-9",
      "title": "回家還會再出門",
      "note": "到家仍會照下一個方向滑。最後一次結束時，兩隻都要在家。",
      "steps": 4,
      "boards": [
        {
          "size": 4,
          "start": [
            0,
            2
          ],
          "walls": [
            [
              0,
              0
            ],
            [
              3,
              3
            ],
            [
              2,
              0
            ],
            [
              1,
              1
            ],
            [
              1,
              0
            ]
          ],
          "goal": [
            3,
            2
          ]
        },
        {
          "size": 4,
          "start": [
            2,
            1
          ],
          "walls": [
            [
              0,
              0
            ],
            [
              0,
              3
            ],
            [
              1,
              2
            ]
          ],
          "goal": [
            1,
            1
          ]
        }
      ],
      "stage": "挑戰"
    },
    {
      "id": "penguin-v5-10",
      "title": "兩邊的最後約定",
      "note": "同時考慮停住、回頭與到家的時機。試著先預測每一步的兩個位置。",
      "steps": 4,
      "boards": [
        {
          "size": 4,
          "start": [
            3,
            2
          ],
          "walls": [
            [
              2,
              1
            ],
            [
              0,
              1
            ],
            [
              1,
              3
            ]
          ],
          "goal": [
            0,
            3
          ]
        },
        {
          "size": 4,
          "start": [
            1,
            2
          ],
          "walls": [
            [
              1,
              3
            ],
            [
              0,
              2
            ],
            [
              2,
              3
            ],
            [
              2,
              0
            ],
            [
              2,
              2
            ]
          ],
          "goal": [
            0,
            1
          ]
        }
      ],
      "stage": "挑戰"
    }
  ];

  const groups = ['第 1 組', '第 2 組', '第 3 組', '老師組'];
  const groupFor = index => groups[index % 4];
  const attemptFor = index => Math.floor(index / 4) + 1;

  const games = {
    sticker: { name: '貼紙工廠', subtitle: '一層一層，想出最後的模樣', skill: '順序・倒推', rule: '替每台選顏色。按播放後，機器從 1 開始貼，後貼的會蓋住前面的。', levels: sticker },
    hero: { name: '傻瓜勇者', subtitle: '排好指令，帶勇者走出森林', skill: '順序・路線・除錯', rule: '四組各填一格，其他指令已排好。先拿劍，在怪物上下左右一格攻擊，最後走到出口。', levels: hero },
    penguin: { name: '帶企鵝回家', subtitle: '一起滑，找到回家的路', skill: '預測・比較・因果', rule: '排好方向再播放，碰到冰塊或邊界才停。兩隻一起讀相同方向，最後都要停在自己的家。', levels: penguin }
  };

  function optionsFor(game, level) {
    if (game === 'animal') return Array.from({length:4},()=>Object.keys(A.actions));
    if (game === 'sticker') return level.masks.map(() => level.twoColor ? level.palette.flatMap(a=>level.palette.map(b=>a+"|"+b)) : level.palette);
    if (game === 'hero') return level.editable.map(() => level.commands || Object.keys(H.COMMANDS));
    return Array.from({length: level.steps}, () => level.directions || Object.keys(P.directions));
  }
  function rotateMask(mask, cols, rows, turns) {
    if (cols !== rows) throw new Error('旋轉貼紙必須使用正方形。');
    return mask.map(cell => {
      let x = cell % cols, y = Math.floor(cell / cols);
      for (let i = 0; i < turns; i++) [x, y] = [cols - 1 - y, x];
      return y * cols + x;
    }).sort((a, b) => a - b);
  }
  function expandHero(level, settings) {
    const program = level.program.slice();
    level.editable.forEach((slot, i) => { program[slot] = settings[i]; });
    return program;
  }
  function rotateBoard(board, cols, rows) {
    const result=Array(board.length).fill(null);
    board.forEach((value,i)=>{result[rotateMask([i],cols,rows,1)[0]]=value;});
    return result;
  }
  function defaults(game, level) {
    // 留空的設定不會被當成答案；學生先主動為每個部件做選擇。
    return optionsFor(game, level).map(() => null);
  }
  function validate(game, level, settings) {
    const opts = optionsFor(game, level);
    if (!Array.isArray(settings) || settings.length !== opts.length || settings.some((v, i) => !opts[i].includes(v))) throw new Error('請先完成每個設定。');
  }
  function runSticker(level, settings) {
    let board = Array(level.cols * level.rows).fill(null);
    let owners=board.slice();
    const frames = [];
    level.masks.forEach((mask, i) => {
      board = board.slice();
      owners=owners.slice();
      const color=settings[i];
      mask.forEach(cell => { board[cell] = level.twoColor ? color.split("|")[level.masksB[i].includes(cell)?1:0] : color; owners[cell]=i; });
      frames.push({type:'stamp',machine:i,color,mask,board});
      if(level.rotateAfter===i+1) {
        const before=board;
        board=rotateBoard(board,level.cols,level.rows);
        owners=rotateBoard(owners,level.cols,level.rows);
        frames.push({type:'rotate',after:i+1,before,board});
      }
    });
    const wrong = board.map((v, i) => v === level.target[i] ? -1 : i).filter(i => i >= 0);
    return { success: wrong.length === 0, frames, board, wrong, owners };
  }
  function run(game, level, settings) {
    validate(game, level, settings);
    if (game === 'sticker') return runSticker(level, settings);
    if (game === 'hero') return H.simulate(level, expandHero(level, settings));
    if (game === 'animal') return A.run(level, settings);
    return P.run(level, settings);
  }
  function solutions(game, level) {
    const opts = optionsFor(game, level), found = [];
    function visit(values) {
      if (values.length === opts.length) { if (run(game, level, values).success) found.push(values); return; }
      opts[values.length].forEach(v => visit([...values, v]));
    }
    visit([]);
    return found;
  }
  return { colors, games, groups, groupFor, attemptFor, defaults, optionsFor, run, solutions, rotateMask, rotateBoard, expandHero, hero: H, penguin: P, animal: A };
});
