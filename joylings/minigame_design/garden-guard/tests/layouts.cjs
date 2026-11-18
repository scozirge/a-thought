module.exports = [
  [
    [['pea', 8, 5], ['pea', 4, 5], ['cannon', 6, 5]],
    [['frost', 6, 4]],
    [['pea', 8, 1], ['pea', 4, 1]],
    [['cannon', 6, 1]]
  ],
  [
    [['pea', 8, 6], ['pea', 6, 5], ['pea', 3, 5], ...Array.from({ length: 5 }, (_, r) => ['wall', 9, r])],
    [['cannon', 3, 4], ['wall', 8, 3]],
    [['flame', 4, 5]],
    [['molecular', 8, 4], ['frost', 7, 6]]
  ],
  [
    [['cannon', 8, 3], ['pea', 8, 7], ['pea', 4, 5], ['pea', 4, 0]],
    [['molecular', 7, 3], ['frost', 4, 2]],
    [['frost', 8, 5]],
    [['flame', 5, 4], ['pea', 8, 0]]
  ]
];
