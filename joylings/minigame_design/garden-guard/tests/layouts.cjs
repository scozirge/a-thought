module.exports = [
  [
    [['pea', 8, 5], ['pea', 4, 5], ['cannon', 6, 5]],
    [['frost', 6, 4]],
    [['cannon', 9, 4]],
    [['cannon', 5, 5]]
  ],
  [
    [['pea', 8, 6], ['pea', 6, 5], ['pea', 3, 5], ...Array.from({ length: 5 }, (_, r) => ['wall', 9, r])],
    [['cannon', 3, 4], ['wall', 8, 3]],
    [['frost', 7, 6]],
    [['cannon', 4, 4], ['pea', 7, 5]]
  ],
  [
    [['pea', 8, 3], ['pea', 8, 7], ['pea', 4, 5], ['frost', 4, 2]],
    [['frost', 6, 4]],
    [['cannon', 9, 4]],
    [['cannon', 5, 5], ['pea', 7, 7]]
  ]
];
