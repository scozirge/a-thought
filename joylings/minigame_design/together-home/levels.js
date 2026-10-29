(function(root){
const levels=[
  {
    "name": "踩我一下",
    "hint": "踩朋友的頭，拿鑰匙！",
    "keys": [
      {
        "x": 500,
        "y": 266,
        "r": 12
      }
    ],
    "id": 0,
    "starts": [
      180,
      290
    ],
    "platforms": [],
    "gates": [],
    "door": {
      "x": 890,
      "y": 318,
      "w": 68,
      "h": 82
    },
    "route": [
      {
        "key": 0
      }
    ],
    "boxes": [],
    "lifts": [],
    "switches": [],
    "cameraTop": 140
  },
  {
    "name": "合作暖身",
    "hint": "拿齊鑰匙，一起進門！",
    "keys": [
      {
        "x": 290,
        "y": 266,
        "r": 12
      },
      {
        "x": 800,
        "y": 170,
        "r": 12
      }
    ],
    "platforms": [
      {
        "x": 600,
        "y": 352,
        "w": 180,
        "h": 16
      },
      {
        "x": 720,
        "y": 304,
        "w": 170,
        "h": 16
      }
    ],
    "gates": [
      {
        "x": 500,
        "y": 180,
        "w": 28,
        "h": 220,
        "button": {
          "x": 400,
          "y": 400,
          "w": 58
        }
      }
    ],
    "route": [
      {
        "key": 0
      },
      {
        "gate": 0,
        "holder": 1
      },
      {
        "key": 1,
        "stairs": [
          [
            660,
            352
          ],
          [
            770,
            304
          ]
        ]
      }
    ],
    "id": 1,
    "starts": [
      180,
      290
    ],
    "door": {
      "x": 910,
      "y": 318,
      "w": 68,
      "h": 82
    },
    "boxes": [],
    "lifts": [],
    "switches": [],
    "cameraTop": 140
  },
  {
    "name": "替朋友站崗",
    "hint": "兩個按鈕都要亮，兩人都要到出口。",
    "starts": [
      80,
      140
    ],
    "keys": [
      {
        "x": 820,
        "y": 266,
        "r": 12
      }
    ],
    "boxes": [
      {
        "x": 220,
        "w": 48,
        "h": 42,
        "heavy": false
      },
      {
        "x": 330,
        "w": 48,
        "h": 42,
        "heavy": false
      }
    ],
    "gates": [
      {
        "x": 650,
        "y": 40,
        "w": 28,
        "h": 360,
        "buttons": [
          {
            "x": 410,
            "y": 400,
            "w": 58
          },
          {
            "x": 510,
            "y": 400,
            "w": 58
          }
        ]
      }
    ],
    "id": 2,
    "platforms": [],
    "lifts": [],
    "switches": [],
    "cameraTop": 40,
    "door": {
      "x": 910,
      "y": 318,
      "w": 68,
      "h": 82
    }
  },
  {
    "name": "大箱子兩種用法",
    "hint": "重箱要一起推；先想好要推去哪裡。",
    "starts": [
      100,
      160
    ],
    "keys": [
      {
        "x": 440,
        "y": 224,
        "r": 12
      }
    ],
    "boxes": [
      {
        "x": 300,
        "w": 64,
        "h": 42,
        "heavy": true
      }
    ],
    "gates": [
      {
        "x": 780,
        "y": 40,
        "w": 28,
        "h": 360,
        "buttons": [
          {
            "x": 640,
            "y": 400,
            "w": 72
          }
        ]
      }
    ],
    "id": 3,
    "platforms": [],
    "lifts": [],
    "switches": [],
    "cameraTop": 40,
    "door": {
      "x": 910,
      "y": 318,
      "w": 68,
      "h": 82
    }
  },
  {
    "name": "你上去，我接你",
    "hint": "輪流踩按鈕，接朋友上來。",
    "starts": [
      100,
      160
    ],
    "keys": [
      {
        "x": 710,
        "y": 190,
        "r": 12,
        "owner": 0
      },
      {
        "x": 820,
        "y": 190,
        "r": 12,
        "owner": 1
      }
    ],
    "lifts": [
      {
        "x": 470,
        "w": 150,
        "bottom": 400,
        "top": 248,
        "speed": 90,
        "buttons": [
          {
            "x": 260,
            "y": 400,
            "w": 58
          },
          {
            "x": 730,
            "y": 248,
            "w": 58
          }
        ]
      }
    ],
    "platforms": [
      {
        "x": 620,
        "y": 248,
        "w": 380,
        "h": 16
      }
    ],
    "door": {
      "x": 910,
      "y": 166,
      "w": 68,
      "h": 82
    },
    "id": 4,
    "gates": [],
    "boxes": [],
    "switches": [],
    "cameraTop": 40
  },
  {
    "name": "太陽和月亮",
    "hint": "踩星星換門；別把朋友留在另一邊。",
    "starts": [
      80,
      130
    ],
    "mode": 1,
    "keys": [
      {
        "x": 450,
        "y": 266,
        "r": 12
      },
      {
        "x": 830,
        "y": 266,
        "r": 12
      }
    ],
    "switches": [
      {
        "x": 240,
        "y": 400,
        "w": 58
      },
      {
        "x": 580,
        "y": 400,
        "w": 58
      }
    ],
    "gates": [
      {
        "x": 350,
        "y": 40,
        "w": 28,
        "h": 360,
        "buttons": null,
        "mode": 0
      },
      {
        "x": 680,
        "y": 40,
        "w": 28,
        "h": 360,
        "buttons": null,
        "mode": 1
      }
    ],
    "id": 5,
    "platforms": [],
    "boxes": [],
    "lifts": [],
    "cameraTop": 40,
    "door": {
      "x": 910,
      "y": 318,
      "w": 68,
      "h": 82
    }
  },
  {
    "name": "不能走散",
    "hint": "繩子牽著你們，搬箱子也要一起。",
    "starts": [
      100,
      160
    ],
    "tether": 180,
    "keys": [
      {
        "x": 440,
        "y": 224,
        "r": 12
      },
      {
        "x": 800,
        "y": 170,
        "r": 12
      }
    ],
    "boxes": [
      {
        "x": 300,
        "w": 48,
        "h": 42,
        "heavy": false
      }
    ],
    "platforms": [
      {
        "x": 600,
        "y": 352,
        "w": 180,
        "h": 16
      },
      {
        "x": 720,
        "y": 304,
        "w": 170,
        "h": 16
      }
    ],
    "id": 6,
    "gates": [],
    "lifts": [],
    "switches": [],
    "cameraTop": 40,
    "door": {
      "x": 910,
      "y": 318,
      "w": 68,
      "h": 82
    }
  },
  {
    "name": "箱子也要搭電梯",
    "hint": "上面的門需要重量，兩人都要到出口。",
    "starts": [
      80,
      140
    ],
    "keys": [
      {
        "x": 900,
        "y": 190,
        "r": 12
      }
    ],
    "boxes": [
      {
        "x": 330,
        "w": 48,
        "h": 42,
        "heavy": false
      }
    ],
    "lifts": [
      {
        "x": 470,
        "w": 150,
        "bottom": 400,
        "top": 240,
        "speed": 90,
        "buttons": [
          {
            "x": 200,
            "y": 400,
            "w": 58
          },
          {
            "x": 650,
            "y": 240,
            "w": 58
          }
        ]
      }
    ],
    "platforms": [
      {
        "x": 620,
        "y": 240,
        "w": 380,
        "h": 16
      }
    ],
    "gates": [
      {
        "x": 820,
        "y": 40,
        "w": 28,
        "h": 360,
        "buttons": [
          {
            "x": 740,
            "y": 240,
            "w": 58
          }
        ]
      }
    ],
    "door": {
      "x": 930,
      "y": 158,
      "w": 68,
      "h": 82
    },
    "id": 7,
    "switches": [],
    "cameraTop": 40
  },
  {
    "name": "先搬哪一個",
    "hint": "三個按鈕都要壓住，想好搬箱子的順序。",
    "starts": [
      60,
      110
    ],
    "keys": [
      {
        "x": 820,
        "y": 266,
        "r": 12
      }
    ],
    "boxes": [
      {
        "x": 160,
        "w": 48,
        "h": 42,
        "heavy": false
      },
      {
        "x": 260,
        "w": 48,
        "h": 42,
        "heavy": false
      },
      {
        "x": 410,
        "w": 64,
        "h": 42,
        "heavy": true
      }
    ],
    "gates": [
      {
        "x": 690,
        "y": 40,
        "w": 28,
        "h": 360,
        "buttons": [
          {
            "x": 310,
            "y": 400,
            "w": 58
          },
          {
            "x": 440,
            "y": 400,
            "w": 58
          },
          {
            "x": 570,
            "y": 400,
            "w": 72
          }
        ]
      }
    ],
    "id": 8,
    "platforms": [],
    "lifts": [],
    "switches": [],
    "cameraTop": 40,
    "door": {
      "x": 910,
      "y": 318,
      "w": 68,
      "h": 82
    }
  },
  {
    "name": "最後一次合作",
    "hint": "拿齊鑰匙，兩人都到出口。",
    "starts": [
      60,
      120
    ],
    "mode": 0,
    "keys": [
      {
        "x": 140,
        "y": 266,
        "r": 12
      },
      {
        "x": 910,
        "y": 190,
        "r": 12
      }
    ],
    "boxes": [
      {
        "x": 200,
        "w": 48,
        "h": 42,
        "heavy": false
      },
      {
        "x": 410,
        "w": 48,
        "h": 42,
        "heavy": false
      }
    ],
    "switches": [
      {
        "x": 710,
        "y": 240,
        "w": 58
      }
    ],
    "lifts": [
      {
        "x": 520,
        "w": 150,
        "bottom": 400,
        "top": 240,
        "speed": 90,
        "buttons": [
          {
            "x": 440,
            "y": 400,
            "w": 58
          },
          {
            "x": 670,
            "y": 240,
            "w": 36
          }
        ]
      }
    ],
    "platforms": [
      {
        "x": 670,
        "y": 240,
        "w": 330,
        "h": 16
      }
    ],
    "gates": [
      {
        "x": 350,
        "y": 40,
        "w": 28,
        "h": 360,
        "buttons": [
          {
            "x": 250,
            "y": 400,
            "w": 48
          }
        ]
      },
      {
        "x": 830,
        "y": 40,
        "w": 28,
        "h": 360,
        "buttons": [
          {
            "x": 760,
            "y": 240,
            "w": 58
          }
        ],
        "mode": 1
      }
    ],
    "door": {
      "x": 940,
      "y": 158,
      "w": 60,
      "h": 82
    },
    "id": 9,
    "cameraTop": 40
  }
];
// 每關皆從起點說明，對照 tests/play-level.cjs 與 play-advanced.cjs 的通關路線。
const answers = [
  [
    '貓咪站在鑰匙正下方，先不要動。',
    '狗狗跳到貓咪頭上，站穩後再跳一次，就能拿到鑰匙。',
    '看到「鑰匙齊了」後，貓咪和狗狗一起往右走進小屋。'
  ],
  [
    '兩人在左邊鑰匙下疊站：貓咪在下，狗狗站上去再跳，拿第一把。',
    '狗狗踩住藍色按鈕，貓咪先穿過門並往右走幾步。這關的門會保持開啟，狗狗再跟上。',
    '兩人依序跳上右邊的低平台、再上高平台。',
    '在第二把鑰匙下再次疊站，讓狗狗跳起拿鑰匙，最後一起往右進小屋。'
  ],
  [
    '先跳過箱子，把右邊的箱子推到右邊按鈕上，看到勾勾就停。',
    '再把左邊的箱子推到左邊按鈕上。兩個按鈕都壓住，藍色門就會開。',
    '兩人穿過門，在鑰匙下疊站：貓咪在下，狗狗再跳一次拿鑰匙。',
    '讓箱子繼續壓住按鈕，兩人一起到右邊小屋。'
  ],
  [
    '兩人站在重箱左邊，一起往右推，把箱子停在鑰匙下方。',
    '貓咪先跳上箱子站好，狗狗也上箱子，再跳到貓咪頭上。',
    '狗狗站穩後再跳一次，拿到高處的鑰匙。',
    '兩人回到箱子左邊，一起把重箱推到右邊藍色按鈕上。跳過箱子、穿過門，一起進小屋。'
  ],
  [
    '狗狗先站上電梯，貓咪踩住地面橘色按鈕，送狗狗上樓。',
    '狗狗走到上層平台，先不要踩上層橘色按鈕。貓咪離開地面按鈕，等電梯降到底，再走上去。',
    '狗狗踩住上層橘色按鈕，等貓咪搭到頂端、走上平台，才離開按鈕。',
    '貓咪拿標有貓臉的左邊鑰匙，狗狗拿標有狗臉的右邊鑰匙。兩人走進上層小屋。'
  ],
  [
    '貓咪踩住第一個星星，打開太陽門。狗狗先過門，貓咪再跟上。',
    '兩人在中間鑰匙下疊站，讓狗狗從貓咪頭上再跳一次拿鑰匙。',
    '確認兩人都過了太陽門，貓咪再踩住第二個星星，打開月亮門。狗狗先過，貓咪再跟上。',
    '在右邊再次疊站拿第二把鑰匙，一起進小屋。走開後再踩星星會換門，別回頭重踩。'
  ],
  [
    '一起跟著箱子往右走，把箱子推到第一把鑰匙下方；別讓繩子拉得太遠。',
    '貓咪站上箱子，狗狗從箱子跳到貓咪頭上，再跳一次拿第一把鑰匙。',
    '兩人互相等一下，先都上低平台，再都上高平台。',
    '在高平台的鑰匙下疊站，狗狗再跳一次拿第二把。一起往右到小屋。'
  ],
  [
    '狗狗先離開地面橘色按鈕。貓咪把箱子推上降到底的電梯，自己也站上去。',
    '狗狗踩地面橘色按鈕。電梯到頂後，貓咪把箱子推到上層藍色按鈕上，讓門保持開啟。',
    '貓咪先離開上層橘色按鈕。狗狗離開地面按鈕，等電梯降到底，再走上電梯。',
    '貓咪踩住上層橘色按鈕，把狗狗接上來；等狗狗走上平台再離開。',
    '兩人穿過藍色門，跳起拿鑰匙，一起走進上層小屋。'
  ],
  [
    '先跳過普通箱子，兩人在重箱左邊一起推，把重箱停在最右邊按鈕上。',
    '一人先讓出路，把中間的普通箱子推到中間按鈕上。',
    '最後把最左邊的普通箱子推到左邊按鈕上；三個按鈕都要有箱子壓住。',
    '兩人跳過箱子、穿過門，在鑰匙下疊站，狗狗再跳一次拿鑰匙。最後一起進小屋。'
  ],
  [
    '先在起點右邊疊站，狗狗從貓咪頭上再跳一次，拿第一把鑰匙。',
    '把左邊箱子推到地面藍色按鈕上，留在原處壓門，兩人穿過第一道門。',
    '狗狗先讓開橘色按鈕。貓咪把第二個箱子推上降到底的電梯，自己也搭上去；狗狗再踩橘色按鈕送上樓。',
    '貓咪把箱子推到上層右邊的紫色按鈕上。箱子留在那裡，再回到電梯旁。',
    '貓咪先不踩上層橘色按鈕，讓狗狗離開地面按鈕、等電梯下降並搭上去。貓咪再踩上層橘色按鈕，把狗狗接上來。',
    '兩人都上來後，確認月亮門已開；若還關著，走開再踩星星切換一次。讓箱子壓住紫色按鈕，兩人過門，跳起拿第二把鑰匙，一起進小屋。'
  ]
];
levels.forEach((level, i) => { level.solution = answers[i]; });

// 11～20 關：沿用原本機關，要求搬運規劃、重複利用與接應。
const pad = (x, y = 400, w = 58) => ({ x, y, w });
const crate = (x, heavy = false, y = 358) => ({ x, y, w: heavy ? 64 : 48, h: 42, heavy });
const key = (x, y = 266, owner) => ({ x, y, r: 12, ...(owner === undefined ? {} : { owner }) });
const ledge = (x, y, w) => ({ x, y, w, h: 16 });
const gate = (x, buttons, mode) => ({ x, y: -120, w: 28, h: 520, buttons, ...(mode === undefined ? {} : { mode }) });
const elevator = (x, w, bottom, top, buttons) => ({ x, w, bottom, top, speed: 90, buttons });
const home = (x = 930, floor = 400) => ({ x, y: floor - 82, w: 68, h: 82 });
const advanced = [
  {
    name: '重箱三個工作', hint: '同一個重箱，先拿鑰匙，再拿鑰匙，最後開門。',
    starts: [80, 130], boxes: [crate(250, true)], keys: [key(370, 224), key(610, 224)],
    gates: [gate(850, [pad(730, 400, 72)])], door: home(),
    solution: [
      '兩人在重箱左邊一起推，把箱子停在左邊鑰匙正下方。',
      '貓咪先上箱子，狗狗再站上貓咪頭頂，跳起拿第一把鑰匙。',
      '兩人回到箱子左邊，把同一個重箱推到右邊鑰匙下，再用箱子加疊站拿第二把。',
      '最後才把重箱推到最右邊藍色按鈕上。兩人跳過箱子，過門回家。'
    ]
  },
  {
    name: '繩索搬運隊', hint: '先搬遠的箱子，回頭時也要等朋友。', tether: 180,
    starts: [80, 140], boxes: [crate(240), crate(350)], keys: [key(830)],
    gates: [gate(690, [pad(450), pad(560)])], door: home(),
    solution: [
      '兩人一起跳過左邊箱子，先把右邊箱子推到右邊按鈕上。後面的人要跟上，別把繩子拉緊。',
      '兩人一起回到左邊箱子旁，把它推到左邊按鈕上；右邊箱子留在原處。',
      '兩個按鈕都亮起後，一起跳過箱子、穿過藍色門。',
      '在鑰匙下疊站：貓咪在下，狗狗站穩後再跳一次。拿到鑰匙再一起回家。'
    ]
  },
  {
    name: '兩趟貨運', hint: '樓上兩個按鈕都要箱子，電梯得跑兩趟。',
    starts: [60, 110], boxes: [crate(220), crate(330)], keys: [key(940, 190)],
    lifts: [elevator(470, 150, 400, 240, [pad(140), pad(640, 240, 36)])],
    platforms: [ledge(620, 240, 380)], gates: [gate(900, [pad(710, 240, 48), pad(820, 240, 48)])], door: home(930, 240),
    solution: [
      '先把右邊箱子推上電梯。貓咪跟著箱子，狗狗在地面踩橘色按鈕送上樓。',
      '貓咪把第一個箱子推到樓上較遠的藍色按鈕，留近處的空間給下一個箱子。',
      '貓咪先別踩上層橘色按鈕。狗狗離開地面按鈕，等電梯下降。',
      '狗狗把剩下的箱子推上電梯，自己也站上去。貓咪踩上層橘色按鈕，送狗狗和箱子上樓。',
      '狗狗先把箱子推到上層橘色按鈕，讓箱子接手壓住電梯；貓咪往右讓路後，狗狗再把箱子推到較近的藍色按鈕。兩人過門拿鑰匙、回家。'
    ]
  },
  {
    name: '雙層接應', hint: '每上一層，都要把留在下面的朋友接上來。', cameraTop: -100,
    starts: [60, 110], keys: [key(490, 182, 0), key(870, 22, 1)],
    lifts: [elevator(260, 140, 400, 240, [pad(160), pad(450, 240)]), elevator(630, 150, 240, 80, [pad(530, 240), pad(840, 80)])],
    platforms: [ledge(400, 240, 230), ledge(780, 80, 220)], door: home(930, 80),
    solution: [
      '貓咪搭左邊電梯，狗狗踩地面按鈕。貓咪上中間平台後，先走開上層橘色按鈕。',
      '狗狗離開地面按鈕，等電梯降到底再搭上。貓咪踩中間平台左邊的橘色按鈕，把狗狗接上來。',
      '貓咪跳起拿中間平台的貓臉鑰匙。兩人都到中間平台後，再操作右邊電梯。',
      '這次換狗狗搭右邊電梯，貓咪踩中間平台右邊的橘色按鈕送上頂樓。',
      '狗狗先離開頂樓按鈕，等貓咪放開下面的按鈕、搭上降回來的電梯，再踩頂樓橘色按鈕接貓咪。',
      '狗狗拿頂樓的狗臉鑰匙，等兩人都上來，再一起進小屋。'
    ]
  },
  {
    name: '星星貨運站', hint: '先把箱子送過太陽門，再想樓上的月亮門。', mode: 1,
    starts: [60, 110], boxes: [crate(240)], keys: [key(440), key(930, 190)],
    switches: [pad(170), pad(710, 240, 40)],
    lifts: [elevator(520, 150, 400, 240, [pad(440), pad(670, 240, 36)])],
    platforms: [ledge(670, 240, 330)], gates: [gate(350, null, 0), gate(850, [pad(770, 240)], 1)], door: home(930, 240),
    solution: [
      '貓咪踩住地面星星打開太陽門，狗狗把箱子推過門，停在電梯前。貓咪再跟過來。',
      '先在地面鑰匙下疊站，讓狗狗從貓咪頭上再跳一次拿鑰匙。',
      '貓咪讓開地面橘色按鈕；狗狗把箱子推上降到底的電梯，自己也搭上去。貓咪踩按鈕送上樓。',
      '狗狗把箱子推過星星，停在上層紫色按鈕上，接著回到電梯旁。',
      '先讓電梯下降接貓咪，再由狗狗踩上層橘色按鈕送上來。',
      '確認月亮門已打開；若還關著，走開再踩上層星星一次。兩人過門拿第二把鑰匙，一起回家。'
    ]
  },
  {
    name: '貓狗交換班', hint: '各推一個箱子，再交換誰站上面。',
    starts: [100, 850], boxes: [crate(260), crate(720)], keys: [key(440, 224, 0), key(640, 224, 1)],
    gates: [gate(510, [pad(400), pad(600)])], door: home(20),
    solution: [
      '貓咪把左邊箱子向右推到左邊藍色按鈕。狗狗走到右邊箱子的右側，把它向左推到右邊藍色按鈕。',
      '兩個箱子壓住按鈕後，中間的門才會開。狗狗先到左邊和貓咪會合。',
      '兩人站上左邊箱子：狗狗在下，貓咪跳到狗狗頭上再跳一次，拿貓臉鑰匙。',
      '一起穿過中間的門，站上右邊箱子。這次貓咪在下，狗狗站上去再跳，拿狗臉鑰匙。',
      '箱子留在按鈕上。拿齊鑰匙後一起往左回去，進左下角的小屋。'
    ]
  },
  {
    name: '閣樓搬家', hint: '先接朋友上樓，重箱才能一起搬。',
    starts: [60, 110], boxes: [crate(600, true, 198)], keys: [key(700, 64), key(960, 190)],
    lifts: [elevator(320, 150, 400, 240, [pad(180), pad(500, 240)])],
    platforms: [ledge(470, 240, 530)], gates: [gate(900, [pad(790, 240, 72)])], door: home(930, 240),
    solution: [
      '狗狗踩地面橘色按鈕，送貓咪上樓；貓咪走到平台，先別去推重箱。',
      '狗狗放開按鈕，搭上降下來的電梯。貓咪踩上層橘色按鈕，把狗狗接上來。',
      '兩人站在重箱左邊一起推，把重箱停在高處鑰匙下方。',
      '兩人上箱子，貓咪在下，狗狗站上貓咪頭頂再跳，拿高處鑰匙。',
      '再一起把重箱推到右邊藍色按鈕上。過門拿第二把鑰匙，兩人進小屋。'
    ]
  },
  {
    name: '送貨到頂樓', hint: '同一個箱子，要轉搭兩部電梯。', cameraTop: -100,
    starts: [40, 90], boxes: [crate(200)], keys: [key(570, 182, 1), key(950, 22, 0)],
    lifts: [elevator(260, 140, 400, 240, [pad(120), pad(410, 240, 36)]), elevator(630, 150, 240, 80, [pad(450, 240, 26), pad(810, 80, 26)])],
    platforms: [ledge(400, 240, 230), ledge(780, 80, 220)], gates: [{...gate(910, [pad(860, 80, 48)]), w: 20}], door: {...home(960, 80), w: 40},
    solution: [
      '貓咪把箱子推上左邊電梯，狗狗踩地面按鈕送上樓。貓咪把箱子暫停在中間平台中央，別壓住橘色按鈕。',
      '先讓左邊電梯下降接狗狗，再由貓咪踩中間平台左邊的橘色按鈕，把狗狗送上來。',
      '狗狗先拿中間平台的狗臉鑰匙，再讓開右邊電梯的按鈕。',
      '貓咪把箱子先推到中間平台右緣，放開 2 號按鈕，等右邊電梯降到底，再繼續推上電梯。狗狗踩 2 號按鈕送貨到頂樓。',
      '貓咪把箱子推到頂樓藍色按鈕上，打開門，但先別回家。',
      '先讓右邊電梯下降接狗狗，再由貓咪踩頂樓橘色按鈕，等狗狗上平台。',
      '貓咪拿頂樓的貓臉鑰匙，兩人一起進小屋。'
    ]
  },
  {
    name: '三道門的來回路', hint: '拿齊鑰匙後，還得一起回到左邊。', mode: 1,
    starts: [60, 100], keys: [key(390), key(650), key(920)],
    switches: [pad(120, 400, 40), pad(420, 400, 40), pad(700, 400, 40)],
    gates: [gate(280, null, 0), gate(560, null, 1), gate(820, null, 0)], door: home(20),
    solution: [
      '貓咪踩住第一個星星，狗狗先過左邊太陽門，貓咪再跟過去。疊站拿第一把鑰匙。',
      '兩人都過第一道門後，貓咪踩住第二個星星，讓狗狗先過中間月亮門，再跟上。疊站拿第二把。',
      '貓咪踩住第三個星星打開右邊太陽門，兩人都過去，疊站拿第三把鑰匙。',
      '先不要踩任何星星，兩人一起退回第三道門的左側。',
      '貓咪踩住第三個星星，重新打開中間月亮門。狗狗先往左通過，貓咪再跟上。',
      '兩人都回到中間門左側後，貓咪踩住第二個星星，打開最左邊太陽門。',
      '狗狗先過最左邊的門，在第一個星星右邊等貓咪。兩人都過門後，才一起往左進小屋。'
    ]
  },
  {
    name: '終極搬家計畫', hint: '地面留重箱，貨物送頂樓，別忘了月亮門。', cameraTop: -100, mode: 0,
    starts: [4, 80], boxes: [crate(120, true), crate(290)], keys: [key(160, 224), key(610, 182, 0), key(960, 22, 1)],
    switches: [pad(450, 240, 36)],
    lifts: [elevator(300, 140, 400, 240, [pad(40, 400, 36), pad(500, 240, 36)]), elevator(640, 140, 240, 80, [pad(540, 240, 26), pad(810, 80, 26)])],
    platforms: [ledge(440, 240, 200), ledge(780, 80, 220)],
    gates: [gate(260, [pad(185, 400, 30)]), {...gate(910, [pad(860, 80, 48)], 1), w: 20}], door: {...home(960, 80), w: 40},
    solution: [
      '先用地面重箱墊高，貓咪在下、狗狗在上疊站，拿起點上方的鑰匙。',
      '兩人回到重箱左邊，一起推到藍色按鈕上。重箱留在地面壓門，後面只搬普通箱子。',
      '貓咪把普通箱子推上左邊電梯，狗狗踩地面橘色按鈕送上樓。貓咪把箱子暫停在中間平台中央。',
      '先放電梯下降接狗狗，再由貓咪踩中間平台橘色按鈕送上來。貓咪拿中間的貓臉鑰匙。',
      '確認頂樓月亮門的月亮已亮起；若沒亮，走開再踩中間平台左端的星星。接下來不要重踩星星。',
      '狗狗在星星附近等候。貓咪把箱子先推到中間平台右緣，放開 2 號按鈕，等右邊電梯下降再繼續推上去。狗狗再踩 2 號按鈕送貨到頂樓。',
      '貓咪把箱子推到頂樓紫色按鈕上，打開月亮門。先放電梯下降，再踩頂樓橘色按鈕接狗狗。',
      '狗狗拿最上面的狗臉鑰匙，等兩人都到頂樓，再一起回家。'
    ]
  }
];
advanced.forEach((level, i) => levels.push({ id: i + 10, cameraTop: 40, boxes: [], gates: [], lifts: [], platforms: [], switches: [], ...level }));
// 用原關卡識別碼保存進度；精選後的顯示順序不等於舊存檔編號。
const selected = [0, 10, 11, 12, 14, 15, 16, 17, 18, 19].map((legacyId, id) => ({
  ...levels[legacyId], id, legacyId, saveKey: `original-${legacyId}`, group: 'main', legacy: legacyId < 2
}));
const accepted = [
  {
    name: '我的跳躍交給你', preview: 'swap', jumpSwap: true, hint: '貓咪 W 幫狗跳，狗狗 ↑ 幫貓跳；左右仍自己走。', cameraTop: -40,
    starts: [80, 150], platforms: [ledge(260, 344, 180), ledge(440, 288, 180), ledge(620, 232, 160), ledge(780, 176, 220)],
    keys: [key(340, 286, 0), key(530, 230, 1), key(900, 42)], door: home(930, 176),
    solution: [
      '這關按跳會讓朋友起跳：狗狗按 ↑ 幫貓咪跳，貓咪按 W 幫狗狗跳。左右移動仍各自控制。',
      '在每個平台邊緣，準備上去的人往右走，另一人替他按一下跳；兩人輪流上同一層。',
      '貓咪在第一層拿貓臉鑰匙，狗狗在第二層拿狗臉鑰匙；需要再跳時，請朋友按跳。',
      '繼續輪流跳上第三、第四層。最後一把比較高，先讓貓咪站在鑰匙正下方。',
      '貓咪按 W，幫狗狗跳到貓咪頭上。狗狗站穩後，貓咪再按一次 W，讓狗狗拿最高的鑰匙。兩人往右回家。'
    ]
  },
  {
    name: '跳一下，路就換', preview: 'phase', phaseOnJump: true, mode: 0, cameraTop: -60,
    hint: '有人起跳，日月踏板就交換；先讓朋友站上木台。', starts: [80, 150],
    platforms: [{...ledge(240, 344, 140), mode: 1}, ledge(380, 288, 140), {...ledge(520, 232, 140), mode: 0}, ledge(660, 176, 140), {...ledge(800, 120, 100), mode: 1}, ledge(900, 120, 100)],
    keys: [key(450, 258, 0), key(740, 146, 1)], door: home(930, 120),
    solution: [
      '貓咪先跳上第一塊月亮踏板，再跳到旁邊木台。木台不會消失，站穩後才換狗狗上來。',
      '狗狗也用兩次跳躍上同一個木台；貓咪順路拿貓臉鑰匙。',
      '下一塊是太陽踏板。先讓一人在木台原地跳一下，把世界切成月亮，再由另一人起跳切回太陽，跳上太陽踏板。',
      '先上去的人繼續跳到下一個木台站穩，後面的人再跟上。狗狗拿這層的狗臉鑰匙。',
      '最後一塊是月亮踏板。在木台原地跳到太陽亮起，再起跳讓月亮踏板出現。一次一人過去，到了小屋旁的木台再換朋友跟上。'
    ]
  }
];
accepted.push(
  {
    name: '重力翻面', preview: 'gravity', gravityFlip: true, ceiling: 100, cameraTop: 20,
    hint: 'S／↓ 翻轉朋友的重力；一個走天花板，一個走地面。', starts: [80, 150],
    keys: [key(280, 122, 0), key(520, 378, 1), key(710, 378, 0), key(850, 122, 1)],
    gates: [{...gate(380), keyIndices:[0]}, {...gate(620), keyIndices:[0,1]}], door: home(930, 400),
    solution: [
      '狗狗按 ↓，把貓咪翻到天花板。貓咪往右拿第一把貓臉鑰匙，打開第一道門。',
      '狗狗留在地面，穿過門拿中間的狗臉鑰匙，打開第二道門。貓咪可以沿天花板跟上。',
      '狗狗再按 ↓，讓貓咪落回地面，拿右側的貓臉鑰匙。',
      '貓咪按 S，送狗狗到天花板，狗狗往右拿最後一把。貓咪再按 S，接狗狗回到地面；兩人進小屋。'
    ]
  }
);
function pressure(x,y,owner,number){return {...pad(x,y,50),owner,number};}
function bridges({ice=false,phase=false,moving=false,jump=false}={}){
 const first=[pressure(140,400,1,1),pressure(450,400,0,1)];
 const second=[pressure(550,400,0,2),pressure(850,400,1,2)];
 const bridge=(x,pads,number,mode)=>({...ledge(x,moving?376:400,100),pads,number,...(phase?{mode}:{}),...(moving?{range:24,phase:number===1?0:Math.PI}:{})});
 const spans=[bridge(280,first,1,1),bridge(660,second,2,0)];
 return {coop:moving?'moving-relay':phase?'phase-relay':'bridge-relay',ice,jumpSwap:jump,phaseOnJump:phase,mode:0,cameraTop:60,starts:[80,20],
  floor:[{x:0,y:400,w:220},{x:440,y:400,w:160},{x:820,y:400,w:180}],
  platforms:moving?[]:spans,movers:moving?spans:[],
  gates:[{...gate(310),y:-120,h:600,pads:first,number:1},{...gate(690),y:-120,h:600,pads:second,number:2}],
  keys:[key(520,378,0),key(920,378,1)],door:home(930,400),fallY:470,
  hint:phase?'踩住同號機關才有橋，起跳還會換日月；到對岸先接朋友。':'一人踩住同號機關接橋，過去的人接手，才能繼續。',
  solution:[
   '狗狗踩住起點的 1 號機關，貓咪先過左橋，落到中間岸後踩住貓臉 1 號機關。',
   phase?'左橋只在月亮亮起時出現：太陽時起跳上橋，再跳回固定冰岸。狗狗過來前，貓咪必須一直踩住 1 號機關。':'對岸有人接手後，狗狗才能離開起點；讓狗狗也走過左橋，到中間岸。',
   '貓咪移到中間岸的 2 號機關，這次換狗狗先過右橋，落到右岸後踩住狗臉 2 號機關。',
   phase?'右橋只在太陽時出現：先在固定岸原地跳成月亮，再起跳切成太陽上橋；朋友在橋上時不能亂跳。':'同號兩個機關任一個壓住，橋和門才會開。朋友還在橋上時不要離開機關。',
   '狗狗接手右岸機關後，貓咪才能跟過去。貓咪拿中間的鑰匙，狗狗拿右岸的鑰匙，再一起進小屋。'
  ]};
}
function liftPuzzle(){
 const first=[pressure(140,400,1,1),pressure(450,240,0,1)],second=[pressure(550,240,0,2),pressure(850,80,1,2)];
 return {coop:'ice-lifts',ice:true,jumpSwap:true,cameraTop:-80,starts:[80,20],floor:[{x:0,y:400,w:230}],
  lifts:[elevator(260,140,400,240,first),elevator(630,150,240,80,second)],platforms:[ledge(400,240,230),ledge(780,80,220)],
  keys:[key(520,210,0),key(920,50,1)],door:home(930,80),
  hint:'朋友幫你跳，自己反向減速；先搭上電梯，再請朋友壓機關。',
  solution:[
   '貓咪先搭上降到底的左電梯，再由狗狗踩地面 1 號機關送上樓。需要起跳時，狗狗按 ↑ 幫貓咪跳。',
   '貓咪上中間岸後，先別壓 1 號機關。狗狗離開下面的機關，等電梯降到底，再搭上去。',
   '貓咪踩中間層的 1 號機關接狗狗，並用 W 幫狗狗跳上岸；狗狗自己用左右鍵減速。',
   '換狗狗搭右電梯，貓咪踩中間層的 2 號機關送上頂樓。狗狗先離開頂樓機關，等貓咪放開下面的機關，讓電梯下降接人。',
   '貓咪搭上右電梯後，狗狗踩頂樓 2 號機關接上來。兩人各拿自己的鑰匙再回家。'
  ]};
}
function gravityPuzzle(ice=false){
 const first=[pressure(140,400,1,1),pressure(450,400,0,1)],second=[pressure(540,400,1,2),pressure(840,400,0,2)];
 return {coop:ice?'gravity-ice-relay':'gravity-phase-relay',ice,gravityFlip:true,phaseOnJump:!ice,mode:0,ceiling:100,cameraTop:20,fallTop:-40,starts:[80,20],
  floor:[{x:0,y:400,w:240},{x:440,y:400,w:160},{x:800,y:400,w:200}],
  ceilingPieces:[{x:180,y:88,w:200,h:12},{x:580,y:88,w:180,h:12}],
  gates:[{...gate(390),y:-120,h:600,pads:first,number:1,...(!ice?{mode:1}:{})},{...gate(770),y:-120,h:600,pads:second,number:2,...(!ice?{mode:0}:{})}],
  keys:[key(520,378,0),key(920,378,1)],
  hint:'天花板也有缺口！一人壓門、一人翻面渡谷，落到對岸再接手。',
  solution:[
   '狗狗壓住起點 1 號機關。貓咪先移到左段天花板下方，狗狗按 ↓ 翻貓咪上去。',
   ice?'貓咪到左天花板右緣，狗狗翻貓咪向下；貓咪同時往右移，落到中間岸。別從天花板缺口往上飄出去。':'先讓貓咪在天花板原地跳成月亮，開第一道門。到天花板右緣後翻回向下，同時往右移，落到中間岸。',
   '貓咪拿鑰匙並壓住中間岸 1 號機關，換狗狗沿相同路線過來。狗狗落地後移到 2 號機關，替貓咪開第二道門。',
   ice?'貓咪經右段天花板到右緣，再翻回向下落到右岸；冰上先反向減速，避免錯過落點。':'兩人都到中間岸後，貓咪先原地跳成太陽。狗狗壓住 2 號機關，將貓咪翻起；貓咪往右走，接上右段天花板，再翻回向下落到右岸。',
   '貓咪踩右岸 2 號機關接狗狗。狗狗落地後，貓咪往小屋讓路，讓狗狗拿鑰匙，再一起回家。'
  ]};
}
const newGames = {
 balance:{name:'重量蹺蹺板',preview:'balance',trial:true,coop:'balance',saveKey:'trial-balance-1',cameraTop:30,starts:[60,120],
  floor:[{x:0,y:400,w:620}],fallY:470,
  platforms:[ledge(70,344,90),ledge(150,288,90),ledge(210,240,50),ledge(640,240,360)],
  balances:[{a:{x:280,w:140},b:{x:460,w:140},top:240,bottom:400,initial:[240,400],speed:130,lockKey:0}],
  keys:[key(700,218,0),key(880,218,1)],door:home(930,240),
  hint:'一人壓高板，朋友在低板跳起，借重量升上樓。',
  solution:['貓咪先走到右邊低板，狗狗從左邊階梯走上高板。兩人分站兩塊板時，重量相同，板子不動。','狗狗留在左板，貓咪在右板原地跳。貓咪離開板子的瞬間，狗狗較重，左板下沉、右板升高。','貓咪落回板上再跳，重複升到頂端；跳到右側高地拿貓臉鑰匙，扣環就會鎖住兩塊板。','狗狗等左板升回頂端，經兩塊板跳到右側，拿狗臉鑰匙；兩人一起進小屋。']},

};
const previews = [
  {...bridges(),name:'隔岸接橋',preview:'bridge'},
  {
    name:'冰面過彎',preview:'ice',ice:true,cameraTop:80,starts:[80,150],
    hint:'冰上放手還會滑，反向按提前減速。',
    platforms:[ledge(700,344,200)],keys:[key(280,378,0),key(520,378,1)],
    gates:[{...gate(380),keyIndices:[0]},{...gate(620),keyIndices:[1]}],door:home(930,400),
    solution:['貓咪往右滑，碰到貓臉鑰匙就會拿到，第一道門會打開。','狗狗碰到中間的狗臉鑰匙，第二道門就會打開。','放開方向仍會滑，接近落點時提前按反方向減速；沒有額外動作鍵。','兩人一起到小屋。後段冰岸會有缺口，先練習落地後穩住位置。']
  }

];
[...accepted,...previews].forEach((l,i)=>selected.push({id:10+i,saveKey:`preview-${l.preview}-${l.ice&&!l.gravityFlip?'2':'1'}`,group:i<accepted.length?'main':'preview',cameraTop:40,boxes:[],gates:[],lifts:[],platforms:[],switches:[],...l}));
const floorPiece=(x,w)=>({x,y:400,w});
const mixed = [
 {coop:'nearby-ice',mix:'ice-gaps',name:'冰岸接力，別走散',ice:true,starts:[80,20],floor:[floorPiece(0,220),floorPiece(300,120),floorPiece(510,120),floorPiece(720,110),floorPiece(900,100)],
  keys:[key(330,378,0),key(818,378,1)],
  gates:[{...gate(470),y:-120,h:600,number:1,pads:[pressure(350,400,1,1),pressure(520,400,0,1)]},{...gate(680),y:-120,h:600,number:2,pads:[pressure(560,400,1,2),pressure(740,400,0,2)]}],
  hint:'窄岸踩住機關開門，過去後接回朋友；落地提前反向減速。',
  solution:['貓咪先往起點岸邊走，狗狗跟到後面。貓咪跳到第一座小冰岸拿鑰匙，提前反向減速，再接狗狗過來會合。','狗狗踩第一座冰岸的 1 號機關開門，貓咪跳過去後踩住貓臉 1 號機關，才能接狗狗。先穩住位置，再讓朋友起跳。','狗狗到中間冰岸後踩住 2 號機關，換貓咪先跳下一岸，踩住貓臉 2 號機關接手。朋友在半空時不要離開機關。','狗狗到倒數第二座冰岸拿自己的鑰匙，兩人再輪流跳最後一段進小屋。落地反向減速，再讓出朋友的落點。']},
 {coop:'nearby-ice',mix:'ice-swap',name:'近身換跳接力',ice:true,jumpSwap:true,helpRange:230,starts:[80,20],floor:[floorPiece(0,220),floorPiece(300,120),floorPiece(510,120),floorPiece(720,110),floorPiece(900,100)],
  keys:[key(350,378,0),key(770,378,1)],
  hint:'靠近才能幫朋友跳；輪流過窄岸，自己提前反向減速。',
  solution:['狗狗先靠近貓咪。貓咪向右助跑時，狗狗按 ↑ 幫跳，貓咪自己提前反向減速。','貓咪往小冰岸右側讓位，換狗狗助跑；貓咪按 W 幫跳，狗狗自己提前減速。','兩人輪流前進，每座冰岸都要會合再走。太遠時，無法幫朋友跳，連線會變紅。','貓咪拿左邊鑰匙，狗狗拿右邊鑰匙。先落地站穩再接人，任何一人掉落就重試。']},
 {...bridges({ice:true,phase:true}),mix:'ice-phase',name:'日月接橋交換班'},
 {...liftPuzzle(),mix:'ice-lifts',name:'冰上雙層接應'},
 {...gravityPuzzle(),mix:'gravity-phase',name:'日月斷頂接力'},
 {...selected[4],legacyId:undefined,coop:'cargo-jump',cargoRoute:14,mix:'cargo-jump',saveKey:'cooperation-cargo-jump-1',jumpSwap:true,name:'換跳貨運難題',floor:[floorPiece(0,670)],
  hint:'朋友幫你跳；先送貨過日門，再把同一箱送上樓壓月門。',
  solution:['先踩地面星星開太陽門，將箱子送過門。跳躍鍵控制朋友，推箱或踩按鈕的人要幫另一人起跳。','在地面鑰匙下疊站取鑰匙，再把箱子放上降到底的電梯。不能把箱子留在下面，頂樓還要用它壓門。','狗狗與箱子先上樓，把箱子放到上層紫色按鈕。先讓電梯降回地面，再由上層接回貓咪。','確認上層星星切成月亮，箱子仍壓住門。兩人過門拿另一把鑰匙，再回家。']},
 {...gravityPuzzle(true),mix:'ice-gravity',name:'斷頂冰谷互相接應'},
 {...bridges({ice:true,phase:true,moving:true,jump:true}),mix:'final',name:'終極日月接橋',
  hint:'壓機關接橋、朋友幫跳、起跳換路；冰橋不停，自己反向減速。',
  solution:['狗狗先踩住起點 1 號機關。等左邊月亮冰橋升到合適高度，幫助跑的貓咪按 ↑ 起跳，貓咪自己反向減速。','貓咪再請狗狗幫跳到中間固定岸，壓住 1 號機關接手。換狗狗過橋，貓咪負責 W 幫跳，狗狗自己控制滑行。','貓咪移到中間岸 2 號機關，這次狗狗先過右橋。先把世界切成月亮，再讓狗狗起跳切成太陽，右橋才會出現。','狗狗到右岸後壓住 2 號機關，換貓咪跟過來。朋友在移動冰橋上時，不能離開機關或讓另一人亂跳。','拿齊貓狗各一把鑰匙，一起回家。冰橋不能暫停，要同時安排站位、幫跳與落點。']}
];
const campaign=[selected[0],selected[10],selected[11],selected[12],selected[13],{boxes:[],gates:[],lifts:[],platforms:[],switches:[],...newGames.balance},selected[14],selected[1],selected[7],selected[9]];
mixed.forEach(l=>campaign.push({cameraTop:60,boxes:[],gates:[],lifts:[],platforms:[],switches:[],door:home(930,400),fallY:470,...l,saveKey:l.saveKey??`cooperation-${l.mix}-${l.ice&&!l.gravityFlip?'2':'1'}`}));
const climbBridge=bridges({ice:true,phase:true,moving:true,jump:true});
campaign.push({
 ...climbBridge,name:'一起登上雲端',preview:'ascent',trial:true,coop:'ascent',saveKey:'challenge-ascent-1',
 world:{width:3300,top:-850,bottom:500},ice:false,iceZones:[{x:0,y:250,w:1000,h:250}],
 boxes:[],switches:[],floor:[...climbBridge.floor.slice(0,2),{x:820,y:400,w:800}],
 platforms:[ledge(1070,344,90),ledge(1150,288,90),ledge(1210,240,50),ledge(1640,240,300),
  ledge(2080,-40,280),ledge(2500,-320,160),
  {...ledge(2700,-376,86),mode:1},{...ledge(2780,-432,86),mode:0},
  {...ledge(2860,-488,86),mode:1},{...ledge(2940,-544,86),mode:0},ledge(3020,-600,280)],
 balances:[{a:{x:1280,w:140},b:{x:1460,w:140},top:240,bottom:400,initial:[240,400],speed:130,lockKey:0}],
 lifts:[elevator(1940,140,240,-40,[pressure(1840,240,1,3),pressure(2120,-40,0,3)]),
  elevator(2360,140,-40,-320,[pressure(2260,-40,0,4),pressure(2550,-320,1,4)])],
 keys:[key(1720,218,0),key(3090,-622,1)],door:home(3200,-600),fallY:490,
 signs:[{x:80,y:285,text:'① 接力冰橋 →'},{x:1070,y:180,text:'② 重量換高度 →'},
  {x:1770,y:110,text:'③ 輪流接朋友 ↑'},{x:2510,y:-440,text:'④ 日月登頂 ↗'}],
 hint:'跳躍鍵幫朋友跳，起跳會換日月；接回朋友，再往右、往上走。',
 solution:[
  '全關 W 幫狗狗跳、↑ 幫貓咪跳，方向鍵控制自己。每次真的起跳都切換日月，沒有特殊動作鍵。',
  '狗狗壓住 1 號機關。等左冰橋接近地面，在太陽時幫貓咪起跳，換成月亮上橋；再次幫跳到中間岸，貓咪反向減速、踩住 1 號機關接狗狗。',
  '兩人會合後，貓咪壓 2 號機關。先原地跳成月亮，再幫狗狗起跳，切成太陽過右冰橋。狗狗到右岸踩 2 號機關，接貓咪跟上。',
  '往右離開冰面。貓咪走到右邊低踏板，狗狗沿左邊階梯上高踏板。狗狗按 ↑ 讓貓咪反覆跳起，靠狗狗的重量把右板送高。貓咪跳到右岸拿鑰匙，兩板固定後接狗狗。',
  '貓咪先搭 3 號電梯，狗狗再踩右岸的狗臉 3 號機關送上去。貓咪上樓後先別踩機關，讓狗狗離開下方機關、等電梯降下來搭上；貓咪再踩樓上的 3 號機關接狗狗。',
  '換狗狗搭 4 號電梯，貓咪踩下層的 4 號機關送上去。狗狗上樓後先離開機關，讓電梯下降接貓咪；再踩頂樓 4 號機關接回朋友。',
  '兩人都到頂樓固定岸後，先把日月調成太陽。貓咪先走：狗狗幫貓咪跳上月亮台，再連續幫跳，依序踩太陽、月亮、太陽台。每次等落地才跳，另一人不要同時起跳。',
  '貓咪先到最上面的固定屋頂等待，再幫狗狗沿同一路線攀登。狗狗拿自己的鑰匙，兩人都進雲端小屋才算完成。掉入深谷要整關重試。'
 ]
});
// Extend the second half with familiar mechanisms and additional handovers.
function longMap(l,width,top=-100){l.world={width,top,bottom:500};l.fallY=490;l.gates.forEach(g=>g.h=Math.max(g.h,520-g.y));return l;}
function extraLift(l,{x,bottom,top,lower,upper,number}){
 l.lifts.push(elevator(x,160,bottom,top,[pressure(lower,bottom,1,number),pressure(upper,top,0,number)]));
 l.platforms.push(ledge(x+160,top,410));l.keys[1]=key(x+440,top-22,1);l.door=home(x+480,top);
 l.extension={type:'lift',x,bottom,top,lower,upper};
 l.solution.push(`最後還有 ${number} 號電梯：貓咪先搭，狗狗踩下層機關送上去。狗狗離開機關往右等電梯降下來，再搭上去；貓咪踩上層機關接回狗狗。兩人拿齊鑰匙到小屋。`);
 return longMap(l,x+580,top-220);
}
for(const index of [10,11]){
 const l=campaign[index];l.floor[4].w=280;
 if(index===11){l.gates=JSON.parse(JSON.stringify(campaign[10].gates));l.helpRange=230;l.solution.splice(2,0,'第二、三座冰岸還要踩住貓狗臉機關開門；先過岸的貓咪接手，才能接狗狗。');}
 extraLift(l,{x:1180,bottom:400,top:200,lower:1080,upper:1400,number:3});
 l.solution[l.solution.length-2]=index===10?'兩人輪流跳到最後一座長冰岸，落地反向減速。貓咪已拿到前段鑰匙，狗狗的鑰匙還在上層，接著往右搭電梯。':'貓咪拿前段鑰匙；每座冰岸先落地站穩，再接朋友，別超過幫跳距離。兩人在最後的長冰岸會合，接著搭電梯。';
 l.name=index===10?'冰岸換班上樓':'近身換跳冰塔';l.hint='輪流過冰岸、踩機關接朋友，最後再合力搭電梯上樓。';
}
function thirdBridge(l,moving=false){
 const pads=[pressure(940,400,1,3),pressure(1260,400,0,3)];
 const bridge={...ledge(1080,moving?376:400,100),mode:1,pads,number:3,...(moving?{range:24,phase:Math.PI/2}:{})};
 (moving?l.movers:l.platforms).push(bridge);l.floor.push({x:1240,y:400,w:360});
 l.gates.push({...gate(1110),y:-120,h:620,pads,number:3});l.keys[1]=key(1470,378,1);l.door=home(1510);
 l.extension={type:'bridge',moving};l.solution.push('還有第三座月亮橋。狗狗踩右岸 3 號機關，貓咪在太陽時起跳換成月亮，過橋後踩 3 號機關接狗狗。朋友在橋上時不要亂跳；最後拿狗狗鑰匙回家。');
 return longMap(l,1600);
}
thirdBridge(campaign[12]);campaign[12].name='三段日月交換班';
campaign[12].solution[4]='狗狗接手右岸 2 號機關後，貓咪才能跟過去；貓咪先拿中間岸的鑰匙。兩人到右岸會合，再挑戰第三座月亮橋。';
const tower=campaign[13];tower.platforms[1].w=340;
extraLift(tower,{x:1120,bottom:80,top:-140,lower:1020,upper:1340,number:3});tower.name='冰上三層接應';
tower.solution[4]='貓咪搭上右電梯後，狗狗踩上層 2 號機關接上來。貓咪先拿中間層的鑰匙；狗狗的鑰匙在第三層，兩人會合後繼續往右。';
for(const index of [14,16]){
 const l=campaign[index],pads=[pressure(940,400,1,3),pressure(1260,400,0,3)];
 l.floor[2].w=240;l.floor.push({x:1220,y:400,w:380});l.ceilingPieces.push({x:980,y:88,w:200,h:12});
 l.gates.push({...gate(1190),y:-120,h:620,pads,number:3,...(l.phaseOnJump?{mode:1}:{})});
 l.keys[1]=key(1470,378,1);l.door=home(1510);l.extension={type:'gravity'};longMap(l,1600);
 l.name=index===14?'日月三段斷頂':'冰谷重力第三棒';
 l.solution[4]='貓咪踩右岸 2 號機關接狗狗。兩人會合後，換狗狗往右踩 3 號機關；貓咪從狗狗左側翻起，一邊向右移到第三片天花板。';
 l.solution.push(`貓咪到第三片天花板右緣，再翻回向下，往右落到終點岸；踩住 3 號機關，接狗狗沿同一路線過來。${l.phaseOnJump?'這一段須保持月亮才能開門。':'冰面記得提前反向減速。'}狗狗拿最右邊鑰匙，兩人進小屋。`);
}
// The approved ascent is retained at level 19; level 16 starts at its balance tower.
const ascent=campaign[18];ascent.ascent=true;
const balanceTower=JSON.parse(JSON.stringify(ascent));
Object.assign(balanceTower,{name:'重量換跳登塔',preview:undefined,trial:undefined,ascent:true,towerOnly:true,starts:[1060,1120],phaseOnJump:false,iceZones:[],gates:[],movers:[],floor:[{x:1000,y:400,w:620}],signs:ascent.signs.slice(1),
 hint:'先借重量上樓，再輪流搭電梯；每次跳躍都交給朋友。',solution:[ascent.solution[0].replace('每次真的起跳都切換日月，',''),...ascent.solution.slice(3,6),'頂樓木階梯一路往上，先讓貓咪到最上層，再幫狗狗登頂拿鑰匙。兩人都到小屋才完成。']});
balanceTower.platforms.forEach(p=>delete p.mode);balanceTower.world.left=1000;campaign[15]=balanceTower;
thirdBridge(campaign[17],true);campaign[17].name='三段移動日月橋';
campaign[17].solution[4]='貓咪先拿中間岸的鑰匙，接回朋友後再往右挑戰第三座月亮橋。先讓橋接近地面，再安排幫跳與落點；橋不會停下來。';
const finale=JSON.parse(JSON.stringify(ascent));
Object.assign(finale,{name:'雲端最後一棒',preview:undefined,trial:undefined,roof:true,saveKey:'campaign-rooftop-1',world:{width:4200,top:-850,bottom:500},hint:'登頂後還有兩座日月橋；最後一棒，也要接回朋友。'});
const roof=bridges({ice:true,phase:true,moving:true,jump:true}),offset=(p)=>({...p,x:p.x+3020,y:p.y-1000});
finale.platforms[finale.platforms.length-1].w=220;
finale.platforms.push(ledge(3460,-600,160),ledge(3840,-600,360));
finale.movers.push(...roof.movers.map(p=>({...offset(p),number:p.number+4,pads:p.pads.map(b=>({...offset(b),number:b.number+4}))})));
finale.gates.push(...roof.gates.map(g=>({...offset(g),y:-1120,h:1620,number:g.number+4,pads:g.pads.map(b=>({...offset(b),number:b.number+4}))})));
finale.iceZones.push({x:3020,y:-750,w:1180,h:250});finale.keys[1]=key(3970,-622,1);finale.door=home(4070,-600);
finale.signs.push({x:3060,y:-730,text:'⑤ 最後接力 →'});
finale.solution[7]='兩人登上固定屋頂後先會合，狗狗暫時還拿不到鑰匙；右邊還有最後兩座移動冰橋。';
finale.solution.push('狗狗踩 5 號機關，貓咪在太陽時起跳換月亮、過左橋，到中間岸接手 5 號機關。換狗狗過橋，貓咪持續壓住機關並幫跳。','貓咪踩 6 號機關，狗狗在月亮時起跳換太陽、過右橋，再踩 6 號機關接貓咪。狗狗到最右拿鑰匙，兩人進門完成最後一棒！');
campaign.push(finale);
campaign.slice(10,18).forEach((l,i)=>{l.saveKey=`campaign-${i+11}-2`;delete l.legacyId;});
campaign.forEach((l,id)=>{l.id=id;l.group='main';delete l.chapter;});

Object.defineProperty(campaign,'catalog',{value:levels});
if(typeof module!=='undefined')module.exports=campaign;else root.TogetherLevels=campaign;
})(globalThis);
