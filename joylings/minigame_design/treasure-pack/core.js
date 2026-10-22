(function(root,f){const api=f();if(typeof module==='object'&&module.exports)module.exports=api;else root.Treasure=api;})(globalThis,()=>{
'use strict';
const levels=[
  {
    "capacity": 5,
    "items": [
      [
        2,
        4
      ],
      [
        3,
        6
      ],
      [
        4,
        7
      ]
    ],
    "target": 10
  },
  {
    "capacity": 10,
    "items": [
      [
        6,
        13
      ],
      [
        5,
        10
      ],
      [
        5,
        10
      ]
    ],
    "target": 20
  },
  {
    "capacity": 12,
    "items": [
      [
        13,
        22
      ],
      [
        8,
        21
      ],
      [
        12,
        23
      ],
      [
        7,
        11
      ],
      [
        5,
        13
      ]
    ],
    "target": 24
  },
  {
    "capacity": 16,
    "items": [
      [
        5,
        12
      ],
      [
        3,
        7
      ],
      [
        6,
        10
      ],
      [
        6,
        11
      ],
      [
        7,
        12
      ],
      [
        13,
        23
      ]
    ],
    "target": 31
  },
  {
    "capacity": 20,
    "items": [
      [
        14,
        37
      ],
      [
        11,
        30
      ],
      [
        15,
        31
      ],
      [
        3,
        7
      ],
      [
        8,
        13
      ],
      [
        3,
        8
      ],
      [
        15,
        38
      ]
    ],
    "target": 52
  },
  {
    "capacity": 24,
    "items": [
      [
        13,
        34
      ],
      [
        11,
        22
      ],
      [
        14,
        38
      ],
      [
        11,
        29
      ],
      [
        10,
        23
      ],
      [
        7,
        16
      ],
      [
        14,
        34
      ],
      [
        13,
        33
      ]
    ],
    "target": 63
  },
  {
    "capacity": 28,
    "items": [
      [
        8,
        14
      ],
      [
        5,
        14
      ],
      [
        5,
        8
      ],
      [
        11,
        26
      ],
      [
        5,
        14
      ],
      [
        10,
        26
      ],
      [
        11,
        27
      ],
      [
        7,
        13
      ],
      [
        10,
        28
      ]
    ],
    "target": 70
  },
  {
    "capacity": 32,
    "items": [
      [
        5,
        11
      ],
      [
        4,
        10
      ],
      [
        4,
        10
      ],
      [
        13,
        23
      ],
      [
        12,
        24
      ],
      [
        10,
        26
      ],
      [
        3,
        7
      ],
      [
        14,
        33
      ],
      [
        15,
        41
      ],
      [
        6,
        17
      ]
    ],
    "target": 85
  },
  {
    "capacity": 36,
    "items": [
      [
        11,
        27
      ],
      [
        6,
        12
      ],
      [
        9,
        18
      ],
      [
        15,
        31
      ],
      [
        14,
        23
      ],
      [
        3,
        8
      ],
      [
        8,
        21
      ],
      [
        4,
        7
      ],
      [
        14,
        28
      ],
      [
        8,
        19
      ],
      [
        3,
        7
      ],
      [
        11,
        22
      ]
    ],
    "target": 87
  },
  {
    "capacity": 42,
    "items": [
      [
        10,
        20
      ],
      [
        5,
        12
      ],
      [
        7,
        13
      ],
      [
        5,
        10
      ],
      [
        10,
        19
      ],
      [
        4,
        9
      ],
      [
        15,
        35
      ],
      [
        14,
        29
      ],
      [
        15,
        24
      ],
      [
        8,
        14
      ],
      [
        10,
        24
      ],
      [
        8,
        16
      ],
      [
        14,
        32
      ],
      [
        9,
        20
      ]
    ],
    "target": 97
  }
];
function total(level,selected){const l=levels[level];if(!l||!Array.isArray(selected)||new Set(selected).size!==selected.length||!selected.every(i=>Number.isInteger(i)&&i>=0&&i<l.items.length))throw Error('Invalid selection');return selected.reduce((s,i)=>({weight:s.weight+l.items[i][0],value:s.value+l.items[i][1]}),{weight:0,value:0});}
function toggle(level,selected,id){total(level,selected);if(!Number.isInteger(id)||id<0||id>=levels[level].items.length)throw Error('Invalid item');return selected.includes(id)?selected.filter(i=>i!==id):[...selected,id];}
function check(level,selected){const t=total(level,selected),l=levels[level];return {...t,over:Math.max(0,t.weight-l.capacity),short:Math.max(0,l.target-t.value),won:t.weight<=l.capacity&&t.value>=l.target};}
function restore(raw){const fresh=()=>({level:0,selected:[],done:[]});try{const s=JSON.parse(raw);if(s.version!==1||!Number.isInteger(s.level)||!levels[s.level])return fresh();total(s.level,s.selected);return {level:s.level,selected:s.selected,done:Array.isArray(s.done)?[...new Set(s.done.filter(i=>Number.isInteger(i)&&levels[i]))]:[]};}catch(_){return fresh();}}
return {levels,total,toggle,check,restore};
});