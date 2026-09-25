// Generates src/data/levels/*.json (levels are staged one file at a time in
// tools/.staging so runs can be split and resumed): seeded, jammed, clearable lots with a fixed
// visible queue, verified winnable by the solver and banded by how often a
// random player wins (easy levels high, hard levels low).
// Usage: node tools/gen-levels.mjs [--range 1-10] [--offset N] [--assemble]
// (--offset shifts the seed search so extra workers can race on a hard level)
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { seatsForLength } from "../src/game/Taxi.js";
import { isLotClearable, randomWinRate, solve, unjamDepth } from "../src/game/solver.js";

const SEED_OFFSET = process.argv.includes("--offset") ? Number(process.argv[process.argv.indexOf("--offset") + 1]) : 0;
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, "../src/data/levels");
const STAGING = join(HERE, ".staging");
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

// [size, taxis, colors, slots, head, minDepth]
const TABLE = [
  [4, 3, 2, 3, 5, 1],
  [4, 5, 2, 3, 5, 2],
  [5, 6, 3, 3, 5, 2],
  [5, 8, 3, 3, 4, 3],
  [5, 9, 3, 3, 4, 3],
  [6, 10, 3, 3, 4, 3],
  [6, 12, 4, 3, 4, 4],
  [6, 13, 4, 3, 3, 4],
  [6, 14, 4, 2, 4, 4],
  [7, 15, 4, 3, 4, 5],
  [7, 17, 5, 3, 3, 5],
  [7, 18, 5, 3, 3, 5],
  [7, 18, 5, 2, 3, 5],
  [8, 20, 5, 3, 3, 6],
  [8, 22, 5, 3, 3, 6],
  [8, 22, 6, 3, 3, 6],
  [8, 24, 6, 3, 3, 7],
  [8, 26, 6, 3, 3, 7],
  [8, 26, 6, 3, 2, 8],
  [8, 28, 6, 3, 3, 8],
];

// Levels 21-100: ten-level waves. Within a wave the lot gets denser and the
// queue less forgiving; each later wave adds colours, tightens the head and
// eventually drops to two bays, so every difficulty band has several levels.
function waveRow(n) {
  const block = Math.floor((n - 21) / 10);
  const pos = (n - 21) % 10;
  const size = [6, 7, 8][(pos + block) % 3];
  const density = Math.min(0.47, 0.3 + 0.013 * pos + 0.012 * block);
  const taxis = Math.min(30, Math.max(8, Math.round(size * size * density)));
  const colors = Math.min(6, 3 + Math.floor(block / 2) + (pos >= 5 ? 1 : 0));
  const slots = block >= 3 && pos >= 7 ? 2 : 3;
  const head = Math.max(slots === 2 ? 3 : 2, 4 - Math.floor(block / 3) - (pos >= 6 ? 1 : 0)); // two bays with a tiny head is unwinnable
  const minDepth = Math.min(11, 3 + block + Math.floor(pos / 3));
  return [size, taxis, colors, slots, head, minDepth];
}
for (let n = 21; n <= 100; n++) TABLE.push(waveRow(n));

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


function shuffle(items, rng) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generate([size, count, colorCount, slots, head, minDepth], i) {
  // how often a random player should win: easy levels high, hard low; later waves restart the ramp
  const wavePos = (i + 1 - 21) % 10;
  const waveBlock = Math.floor((i + 1 - 21) / 10);
  const hi = i < 20 ? Math.max(0.12, 0.95 - 0.043 * i) : Math.max(0.1, 0.85 - 0.08 * wavePos - 0.03 * waveBlock);
  const lo = Math.max(0, hi - (i < 20 ? 0.22 : 0.3));
  let widen = 0;
  for (let seed = 1000 * (i + 1) + SEED_OFFSET; ; seed++) {
    if ((seed - 1000 * (i + 1) - SEED_OFFSET) % 300 === 299) widen += 0.05;
    const rng = mulberry32(seed);
    const taxis = tryLayout(size, count, colorCount, rng);
    if (!taxis) continue;
    const level = {
      id: `level${String(i + 1).padStart(3, "0")}`,
      name: `Level ${i + 1}`,
      seed,
      grid: { width: size, height: size },
      colors: PALETTE.slice(0, colorCount),
      slots,
      queueHeadSize: head,
      queuePreviewSize: head + 6,
      taxis,
      queue: [],
    };
    if (!isLotClearable(level) || unjamDepth(level) < minDepth) continue;
    const seats = taxis.flatMap((t) => Array(seatsForLength(t.length)).fill(t.color));
    level.queue = shuffle(seats, rng);
    const rate = randomWinRate(level, 300, rng);
    if (rate < lo - widen || rate > hi + widen) continue;
    if (!solve(level, 2500)) continue;
    level.randomWinRate = Math.round(rate * 100) / 100;
    console.error(`${level.name}: seed ${seed}, random-win ${level.randomWinRate}`);
    return level;
  }
}

const args = process.argv.slice(2);
const rangeArg = args[args.indexOf("--range") + 1];
const [from, to] = args.includes("--range") ? rangeArg.split("-").map(Number) : [1, TABLE.length];

mkdirSync(STAGING, { recursive: true });
if (!args.includes("--assemble") || args.includes("--range")) {
  for (let n = from; n <= to; n++) {
    const file = join(STAGING, `level${String(n).padStart(3, "0")}.json`);
    if (existsSync(file)) continue;
    writeFileSync(file, JSON.stringify(generate(TABLE[n - 1], n - 1)) + "\n");
  }
}

if (!args.includes("--range") || args.includes("--assemble")) {
  const levels = TABLE.map((_, i) => JSON.parse(readFileSync(join(STAGING, `level${String(i + 1).padStart(3, "0")}.json`), "utf8")));
  mkdirSync(OUT, { recursive: true });
  for (const f of readdirSync(OUT)) if (f.startsWith("level")) rmSync(join(OUT, f));
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
}
