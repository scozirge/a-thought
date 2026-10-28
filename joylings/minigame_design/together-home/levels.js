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
if(typeof module!=='undefined')module.exports=levels;else root.TogetherLevels=levels;
})(globalThis);
