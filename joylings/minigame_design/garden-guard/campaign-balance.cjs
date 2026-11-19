const fs = require("node:fs");
const path = require("node:path");
const { Worker, isMainThread, workerData, parentPort } = require("node:worker_threads");
const { availableParallelism } = require("node:os");
const G = require("./core.js");

const towers = Object.keys(G.TOOLS).filter((kind) => kind !== "wall");
const mixes = {
  mixed: towers,
  battery: ["pea", "cannon", "pea", "flame", "pierce"],
  control: ["frost", "flame", "cannon", "pea", "pierce", "push"],
  heavy: ["molecular", "frost", "pea", "flame", "pierce", "cannon"],
  relay: ["push", "flame", "pea", "pierce", "cannon"],
};
function randomSource(seed) {
  return () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
}
function trial(level, layout) {
  const s = G.createState(level);
  for (const p of layout)
    if (!G.build(s, ...p).ok) throw Error("Illegal placement " + JSON.stringify([level, p]));
  const spent = G.LEVELS[level].money - s.money;
  G.startWave(s);
  let minHearts = s.hearts;
  // Repeated knockback in a long corridor can keep giants moving past four minutes.
  const tickLimit = 8 * 60 * 60;
  for (let i = 0; i < tickLimit && s.phase === "running"; i++) {
    const before = s.hearts;
    G.step(s, 1 / 60);
    if (s.level !== level) {
      // The last escape can heal the house on the very same step.
      const lastEscapes = s.effects.filter(
        (e) => e.kind === "home" && Math.abs(e.life - e.duration + 1 / 60) < 1e-7,
      ).length;
      minHearts = Math.min(minHearts, before - lastEscapes);
    } else minHearts = Math.min(minHearts, s.hearts);
  }
  const won = s.phase === "planning" || s.phase === "won";
  return { won, timeout: s.phase === "running", hearts: minHearts, spent, kills: s.stats.defeated };
}
function deployment(level, scheme, kinds, seed) {
  const random = randomSource(seed);
  const pick = (a) => a[Math.floor(random() * a.length)];
  const s = G.createState(level),
    layout = [];
  function add(kind, c, r) {
    if (!G.build(s, kind, c, r).ok) return false;
    layout.push([kind, c, r]);
    return true;
  }
  const gate = pick([2, 3, 4, 5]),
    col = pick([6, 7, 8]);
  if (scheme === "funnel" || scheme === "switchback") {
    for (let r = 0; r < G.ROWS; r++) if (r !== gate) add("wall", col, r);
    if (scheme === "switchback")
      for (let r = 0; r < G.ROWS; r++) if (r !== (gate <= 3 ? 6 : 1)) add("wall", col - 3, r);
  }
  const cells = [];
  for (let c = 1; c < G.COLS - 1; c++)
    for (let r = 0; r < G.ROWS; r++)
      if (!G.at(s, c, r) && !G.isEntrance(level, c, r)) {
        if ((scheme === "funnel" || scheme === "switchback") && c === col && r === gate) continue;
        if (scheme === "switchback" && c === col - 3 && r === (gate <= 3 ? 6 : 1)) continue;
        cells.push([c, r]);
      }
  if (scheme === "beginner") {
    const lane = G.LEVELS[level].entries[0];
    const places = cells.filter(([c, r]) => c >= 2 && c <= 9 && Math.abs(r - lane) <= 1);
    for (let i = 0; i < 3 && places.length; i++) {
      const [c, r] = places.splice(Math.floor(random() * places.length), 1)[0];
      add("pea", c, r);
    }
    return layout;
  }
  while (cells.length) {
    const affordable = kinds.filter((k) => G.TOOLS[k].cost <= s.money);
    if (!affordable.length) break;
    const k = pick(affordable);
    let index = Math.floor(random() * cells.length);
    if (scheme !== "scatter") {
      // Draw competing placements the way a player might favour a gate or a central lane.
      const distance = ([c, r]) =>
        scheme === "lane"
          ? Math.abs(r - 3.5) + 0.22 * Math.abs(c - 5)
          : 0.55 * Math.abs(c - col + 2) + 0.85 * Math.abs(r - gate);
      for (let i = 0; i < 3; i++) {
        const j = Math.floor(random() * cells.length);
        if (distance(cells[j]) < distance(cells[index])) index = j;
      }
    }
    const [c, r] = cells.splice(index, 1)[0];
    add(k, c, r);
  }
  return layout;
}
function relocate(level, count, seed) {
  const random = randomSource(seed);
  const original = require("./solutions.js").layouts[level];
  const occupied = new Set(original.map(([, c, r]) => c + "," + r));
  const destinations = [];
  for (let c = 1; c < G.COLS - 1; c++) {
    for (let r = 0; r < G.ROWS; r++) {
      if (!occupied.has(c + "," + r) && !G.isEntrance(level, c, r)) destinations.push([c, r]);
    }
  }
  const indices = original.map((_, i) => i);
  const layout = original.slice();
  for (let move = 0; move < count && indices.length && destinations.length; move++) {
    const [i] = indices.splice(Math.floor(random() * indices.length), 1);
    const [cell] = destinations.splice(Math.floor(random() * destinations.length), 1);
    layout[i] = [original[i][0], ...cell];
  }
  return layout;
}
function surveyLevel(level, seeds, firstSeed, suite) {
  const rows = {};
  const examples = {};
  const groups = [
    ["beginner", "beginner", ["pea"]],
    ["random", "scatter", [...towers, "wall"]],
    ["randomGuns", "scatter", towers],
    ["lane", "lane", mixes.mixed],
  ];
  for (const [name, kinds] of Object.entries(mixes))
    for (const scheme of ["funnel", "switchback"])
      groups.push([name + "-" + scheme, scheme, kinds]);
  for (const k of towers)
    for (const scheme of ["lane", "funnel", "switchback"])
      groups.push([k + "-" + scheme, scheme, [k]]);
  if (suite === "pairs") {
    groups.length = 0;
    for (let i = 0; i < towers.length; i++)
      for (const other of towers.slice(i + 1)) {
        groups.push([towers[i] + "+" + other, "funnel", [towers[i], other]]);
      }
  }
  if (suite === "moves") {
    groups.length = 0;
    for (const n of [2, 4]) groups.push(["move" + n, "relocate", n]);
  }
  for (const [name, scheme, kinds] of groups) {
    let wins = 0,
      hearts = 0,
      best = -1;
    for (let i = 0; i < seeds; i++) {
      const seed = ((firstSeed + i) * 2654435761) >>> 0;
      const layout =
        scheme === "relocate"
          ? relocate(level, kinds, seed)
          : deployment(level, scheme, kinds, seed);
      const v = trial(level, layout);
      if (v.timeout) throw Error("Timed out: " + [level, name, seed]);
      if (v.won) {
        wins++;
        hearts += v.hearts;
        if (v.hearts > best) {
          best = v.hearts;
          examples[name] = { layout, ...v };
        }
      }
    }
    rows[name] = { wins, trials: seeds, hearts };
  }
  return { level: level + 1, rows, examples };
}
async function main() {
  const seeds = Number(process.argv[2] || 32),
    firstSeed = Number(process.argv[3] || 9001),
    filename = process.argv[4] || "campaign-balance.json",
    suite = process.argv[5] || "strategies";
  if (!["pairs", "strategies", "moves"].includes(suite)) throw Error("Unknown suite");
  if (
    !Number.isSafeInteger(seeds) ||
    seeds < 1 ||
    !Number.isSafeInteger(firstSeed) ||
    firstSeed < 1
  )
    throw Error("Invalid sample range");
  const stage = process.argv[6] === undefined ? null : Number(process.argv[6]);
  if (stage !== null && (!Number.isInteger(stage) || stage < 1 || stage > G.LEVELS.length))
    throw Error("Invalid stage");
  const result = [];
  const levels = stage === null ? Array.from({ length: G.BONUS_LEVEL }, (_, i) => i) : [stage - 1];
  async function next() {
    while (levels.length) {
      const level = levels.shift();
      const r = await new Promise((resolve, reject) => {
        const w = new Worker(__filename, { workerData: { level, seeds, firstSeed, suite } });
        w.once("message", resolve);
        w.once("error", reject);
        w.once("exit", (code) => {
          if (code) reject(Error("worker " + code));
        });
      });
      result.push(r);
      const wins = Object.values(r.rows).reduce((total, row) => total + row.wins, 0);
      console.log(
        "Level",
        level + 1,
        suite,
        wins,
        "wins in",
        Object.keys(r.rows).length * seeds,
        "trials",
      );
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(8, availableParallelism(), levels.length) }, next),
  );
  const dir = path.join(__dirname, "dist");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, filename),
    JSON.stringify({ seeds, firstSeed, suite, result: result.sort((a, b) => a.level - b.level) }, null, 2),
  );
}
if (require.main === module) {
  if (isMainThread) {
    main().catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
  } else {
    parentPort.postMessage(
      surveyLevel(workerData.level, workerData.seeds, workerData.firstSeed, workerData.suite),
    );
  }
}
module.exports = { trial, deployment, randomSource };
