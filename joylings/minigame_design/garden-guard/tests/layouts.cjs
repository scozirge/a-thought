module.exports = [
  [
    [['pea', 8, 5], ['pea', 4, 5], ['rapid', 6, 5]],
    [['frost', 6, 4]],
    [['rapid', 9, 4]],
    [['rapid', 5, 5]]
  ],
  [
    [['pea', 8, 6], ['pea', 6, 5], ['pea', 3, 5], ...Array.from({ length: 5 }, (_, r) => ['wall', 9, r])],
    [['rapid', 3, 4], ['wall', 8, 3]],
    [['frost', 7, 6]],
    [['rapid', 4, 4], ['pea', 7, 5]]
  ],
  [
    [['pea', 8, 3], ['pea', 8, 7], ['pea', 4, 5], ['frost', 4, 2]],
    [['frost', 6, 4]],
    [['rapid', 9, 4]],
    [['rapid', 5, 5], ['pea', 7, 7]]
  ]
];
