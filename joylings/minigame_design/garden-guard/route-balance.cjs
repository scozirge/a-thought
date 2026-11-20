const fs = require("node:fs");
const path = require("node:path");
const { Worker, isMainThread, parentPort, workerData } = require("node:worker_threads");
const { availableParallelism } = require("node:os");
const G = require("./core.js");
const { trial, randomSource } = require("./campaign-balance.cjs");
const solutions = require("./solutions.js").layouts;
const towers = Object.keys(G.TOOLS).filter((kind) => kind !== "wall");
const samples = 32;

function cellsFor(level) {
  const cells = [];
  for (let c = 1; c < G.COLS - 1; c++) {
    for (let r = 0; r < G.ROWS; r++) {
      if (!G.isEntrance(level, c, r)) cells.push([c, r]);
    }
  }
  return cells;
}

function shuffled(items, random) {
  const copy = items.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function routeLengths(state) {
  return G.previews(state).map((route) => (route.breaking ? Infinity : route.path.length - 1));
}

function checkedTrial(level, layout) {
  const result = trial(level, layout);
  if (result.timeout) throw Error("戰鬥未在時限內結束");
  return result;
}

function openingOrder({ first, second, start, end }) {
  const cells = cellsFor(0);
  let wins = 0,
    trials = 0;
  const examples = [];
  for (let i = start; i < end; i++) {
    for (let j = 0; j < cells.length; j++) {
      if (i === j) continue;
      const layout = [
        [first, ...cells[i]],
        [second, ...cells[j]],
      ];
      trials++;
      if (checkedTrial(0, layout).won) {
        wins++;
        if (examples.length < 3) examples.push(layout);
      }
    }
  }
  return { first, second, start, end, wins, trials, examples };
}

// A child can cover each entrance with basic towers and leave a second line by the house.
function beginnerLines() {
  const random = randomSource(88231);
  const pick = (values) => values[Math.floor(random() * values.length)];
  const rows = {};
  for (const style of ["peas", "support"]) {
    let wins = 0;
    for (let seed = 0; seed < 120; seed++) {
      const layout = [],
        taken = new Set();
      function add(kind, columns, lanes) {
        let c, r;
        do {
          c = pick(columns);
          r = pick(lanes);
        } while (taken.has(G.key(c, r)));
        taken.add(G.key(c, r));
        layout.push([kind, c, r]);
      }
      for (const lanes of [
        [1, 2],
        [3, 4],
        [5, 6],
      ]) {
        add("pea", [5, 6, 7, 8], lanes);
        add("pea", [2, 3, 4], lanes);
      }
      add(style === "peas" ? "pea" : "cannon", [1, 2, 3], [2, 3, 4, 5]);
      add("pea", [2, 3, 4, 5], [3, 4]);
      if (style === "peas") add("pea", [2, 3, 4, 5], [2, 3, 4, 5]);
      wins += Number(checkedTrial(0, layout).won);
    }
    rows[style] = { wins, trials: 120 };
  }
  return rows;
}

function compareOpening() {
  const random = randomSource(5146379);
  const cells = cellsFor(0);
  const pairs = {};
  for (const [i, first] of towers.entries()) {
    for (const second of towers.slice(i)) {
      let wins = 0;
      for (let n = 0; n < 128; n++) {
        const [a, b] = shuffled(cells, random);
        wins += Number(
          checkedTrial(0, [
            [first, ...a],
            [second, ...b],
          ]).won,
        );
      }
      pairs[first + "+" + second] = { wins, trials: 128 };
    }
  }
  return { level: 1, pairs, beginner: beginnerLines() };
}

// Accept a tower only if every gate still has its original shortest distance.
// Placement favours the central firing lanes while observing the normal budget.
function withoutDetour(level, kinds, random) {
  const state = G.createState(level);
  const initial = routeLengths(state);
  const cells = shuffled(cellsFor(level), random);
  const layout = [];
  while (cells.length) {
    const affordable = kinds.filter((kind) => G.TOOLS[kind].cost <= state.money);
    if (!affordable.length) break;
    const kind = affordable[Math.floor(random() * affordable.length)];
    let index = 0;
    for (let i = 1; i < Math.min(cells.length, 3); i++) {
      const score = ([c, r]) => Math.abs(r - 3.5) + 0.3 * Math.abs(c - 4);
      if (score(cells[i]) < score(cells[index])) index = i;
    }
    const [c, r] = cells.splice(index, 1)[0];
    if (!G.build(state, kind, c, r).ok) throw Error("無法建造測試配置");
    if (routeLengths(state).some((length, i) => length !== initial[i])) {
      G.undo(state);
    } else {
      layout.push([kind, c, r]);
    }
  }
  return layout;
}

// Keep all towers, wall count and spending without increasing any entrance distance.
function unusedWalls(level, random) {
  const answer = solutions[level],
    state = G.createState(level);
  const guns = answer.filter(([kind]) => kind !== "wall");
  for (const placement of guns) G.build(state, ...placement);
  const reserved = new Set(
    G.previews(state).flatMap((route) => route.path.map((p) => G.key(p.c, p.r))),
  );
  const free = cellsFor(level).filter(([c, r]) => !reserved.has(G.key(c, r)) && !G.at(state, c, r));
  const count = answer.length - guns.length;
  if (free.length < count) {
    // Dense answers can use more walls than fit outside the specific paths chosen by BFS.
    // Build a pool that still permits an equally short path from every entrance.
    const lengths = routeLengths(state);
    const cells = cellsFor(level);
    for (const order of [shuffled(cells, random), cells.sort((a, b) => a[1] - b[1])]) {
      free.length = 0;
      for (const [c, r] of order) {
        if (!G.build(state, "wall", c, r).ok) continue;
        if (routeLengths(state).some((length, i) => length !== lengths[i])) G.undo(state);
        else free.push([c, r]);
        if (free.length === count) break;
      }
      if (free.length === count) break;
      for (const [c, r] of free) G.remove(state, c, r);
    }
  }
  if (free.length < count) throw Error("沒有足夠空格在維持路線長度的前提下配置所有牆");
  return [
    ...guns,
    ...shuffled(free, random)
      .slice(0, count)
      .map((cell) => ["wall", ...cell]),
  ];
}

function compareRoutes(level) {
  const random = randomSource(765401 + level * 7919);
  const rows = {};
  const rosters = {
    mixed: towers,
    battery: ["pea", "cannon", "flame", "pierce"],
    heavy: ["molecular", "frost", "pea", "cannon"],
    rapid: ["pea"],
    lasers: ["pierce"],
  };
  function sample(name, build) {
    let wins = 0,
      spent = 0;
    for (let i = 0; i < samples; i++) {
      const result = checkedTrial(level, build());
      wins += Number(result.won);
      spent += result.spent;
    }
    rows[name] = { wins, trials: samples, averageSpent: spent / samples };
  }
  for (const [name, kinds] of Object.entries(rosters))
    sample(name, () => withoutDetour(level, kinds, random));
  sample("relocatedWalls", () => unusedWalls(level, random));
  const state = G.createState(level),
    base = routeLengths(state);
  for (const p of solutions[level]) G.build(state, ...p);
  const extraDistance = routeLengths(state).map((n, i) => n - base[i]);
  return {
    level: level + 1,
    rows,
    extraDistance,
    answer: checkedTrial(level, solutions[level]),
    wallRemoved: checkedTrial(
      level,
      solutions[level].filter(([kind]) => kind !== "wall"),
    ),
  };
}

async function main() {
  const allOpening = process.argv.includes("--all-opening");
  const jobs = [],
    result = [];
  if (allOpening) {
    const count = cellsFor(0).length;
    for (const first of towers)
      for (const second of towers) {
        for (let start = 0; start < count; start += 10) {
          jobs.push({ first, second, start, end: Math.min(start + 10, count) });
        }
      }
  } else jobs.push(0, 4, 5, 6, 7, 8, 9);

  async function next() {
    while (jobs.length) {
      const level = jobs.shift();
      const row = await new Promise((resolve, reject) => {
        const worker = new Worker(__filename, { workerData: level });
        worker.once("message", resolve);
        worker.once("error", reject);
        worker.once("exit", (code) => {
          if (code) reject(Error("worker " + code));
        });
      });
      result.push(row);
      if (allOpening) {
        if (result.length % 40 === 0) console.log("已完成", result.length, "批雙塔配置");
      } else console.log("完成第", level + 1, "關路線比較");
    }
  }
  await Promise.all(Array.from({ length: Math.min(8, availableParallelism(), jobs.length) }, next));
  const dir = path.join(__dirname, "dist");
  fs.mkdirSync(dir, { recursive: true });
  if (allOpening) {
    const totals = result.reduce(
      (sum, row) => ({ wins: sum.wins + row.wins, trials: sum.trials + row.trials }),
      { wins: 0, trials: 0 },
    );
    console.log(totals);
    fs.writeFileSync(
      path.join(dir, "opening-balance.json"),
      JSON.stringify({ totals, result }, null, 2),
    );
  } else
    fs.writeFileSync(
      path.join(dir, "route-balance.json"),
      JSON.stringify(
        result.sort((a, b) => a.level - b.level),
        null,
        2,
      ),
    );
}

if (require.main === module) {
  if (isMainThread)
    main().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  else if (typeof workerData === "object") parentPort.postMessage(openingOrder(workerData));
  else parentPort.postMessage(workerData === 0 ? compareOpening() : compareRoutes(workerData));
}
