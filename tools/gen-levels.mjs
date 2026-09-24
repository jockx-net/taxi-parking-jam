// Generates src/data/levels/*.json: seeded, jammed, clearable lots with a fixed
// visible queue, verified winnable by the solver and banded by how often a
// random player wins (easy levels high, hard levels low).
// Usage: node tools/gen-levels.mjs
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { isLotClearable, randomWinRate, solve, unjamDepth } from "../src/game/solver.js";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../src/data/levels");
const PALETTE = ["red", "blue", "green", "yellow", "purple", "orange"];
const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// [size, taxis, colors, capacity, slots, head, minDepth]
const TABLE = [
  [4, 3, 2, 2, 3, 5, 1],
  [4, 5, 2, 2, 3, 5, 2],
  [5, 6, 3, 2, 3, 5, 2],
  [5, 8, 3, 2, 3, 4, 3],
  [5, 9, 3, 3, 3, 4, 3],
  [6, 10, 3, 2, 3, 4, 3],
  [6, 12, 4, 2, 3, 4, 4],
  [6, 13, 4, 3, 3, 3, 4],
  [6, 14, 4, 2, 2, 4, 4],
  [7, 15, 4, 2, 3, 4, 5],
  [7, 17, 5, 2, 3, 3, 5],
  [7, 18, 5, 3, 3, 3, 5],
  [7, 18, 5, 2, 2, 3, 5],
  [8, 20, 5, 2, 3, 3, 6],
  [8, 22, 5, 3, 3, 3, 6],
  [8, 22, 6, 2, 2, 3, 6],
  [8, 24, 6, 2, 3, 3, 7],
  [8, 26, 6, 3, 3, 3, 7],
  [8, 26, 6, 2, 2, 3, 8],
  [8, 28, 6, 2, 3, 2, 8],
];

function tryLayout(size, count, colorCount, rng) {
  const occupied = new Set();
  const taxis = [];
  const dirNames = Object.keys(DIRS);
  for (let attempt = 0; attempt < 4000 && taxis.length < count; attempt++) {
    const dir = dirNames[Math.floor(rng() * 4)];
    const r = rng();
    const length = r < 0.15 ? 1 : r < 0.8 ? 2 : 3;
    const x = Math.floor(rng() * size);
    const y = Math.floor(rng() * size);
    const [dx, dy] = DIRS[dir];
    const cells = [];
    for (let k = 0; k < length; k++) cells.push([x - dx * k, y - dy * k]);
    const ok = cells.every(([cx, cy]) => cx >= 0 && cy >= 0 && cx < size && cy < size && !occupied.has(`${cx},${cy}`));
    if (!ok) continue;
    cells.forEach(([cx, cy]) => occupied.add(`${cx},${cy}`));
    taxis.push({ x, y, dir, length });
  }
  if (taxis.length < count) return null;
  const colors = PALETTE.slice(0, colorCount);
  const order = taxis.map((_, i) => colors[i % colorCount]).sort(() => rng() - 0.5);
  return taxis.map((t, i) => ({ id: `t${i + 1}`, color: order[i], ...t }));
}

for (const f of readdirSync(OUT)) if (f.startsWith("level")) rmSync(join(OUT, f));
mkdirSync(OUT, { recursive: true });

function shuffle(items, rng) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const levels = TABLE.map(([size, count, colorCount, capacity, slots, head, minDepth], i) => {
  const hi = Math.max(0.12, 0.95 - 0.043 * i);
  const lo = Math.max(0, hi - 0.22);
  let widen = 0;
  for (let seed = 1000 * (i + 1); ; seed++) {
    if ((seed - 1000 * (i + 1)) % 300 === 299) widen += 0.05;
    const rng = mulberry32(seed);
    const taxis = tryLayout(size, count, colorCount, rng);
    if (!taxis) continue;
    const level = {
      id: `level${String(i + 1).padStart(3, "0")}`,
      name: `Level ${i + 1}`,
      seed,
      grid: { width: size, height: size },
      colors: PALETTE.slice(0, colorCount),
      taxiCapacity: capacity,
      slots,
      queueHeadSize: head,
      queuePreviewSize: head + 6,
      taxis,
      queue: [],
    };
    if (!isLotClearable(level) || unjamDepth(level) < minDepth) continue;
    const seats = taxis.flatMap((t) => Array(capacity).fill(t.color));
    level.queue = shuffle(seats, rng);
    const rate = randomWinRate(level, 300, rng);
    if (rate < lo - widen || rate > hi + widen) continue;
    if (!solve(level, 2500)) continue;
    level.randomWinRate = Math.round(rate * 100) / 100;
    console.error(`${level.name}: seed ${seed}, random-win ${level.randomWinRate}`);
    return level;
  }
});

for (const level of levels) writeFileSync(join(OUT, `${level.id}.json`), JSON.stringify(level) + "\n");
const pad = (i) => String(i + 1).padStart(3, "0");
writeFileSync(
  join(OUT, "index.js"),
  [
    ...levels.map((_, i) => `import level${pad(i)} from "./level${pad(i)}.json";`),
    "",
    "export const LEVELS = [",
    ...levels.map((_, i) => `  level${pad(i)},`),
    "];",
    "",
  ].join("\n")
);
console.log(`Wrote ${levels.length} levels`);
for (const l of levels) console.log(l.name.padEnd(9), "depth", unjamDepth(l), "random-win", l.randomWinRate);
