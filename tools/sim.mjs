// Estimates each level's difficulty by letting a greedy bot play many games.
// Usage: node tools/sim.mjs [gamesPerLevel]
import { readdirSync, readFileSync } from "node:fs";
import { loadLevel } from "../src/game/LevelLoader.js";

function pick(level) {
  const ids = level.selectableTaxiIds();
  if (!ids.length) return null;
  const people = level.queue.peek();
  const headSize = level.queue.headSize;
  const score = (id) => {
    const taxi = level.grid.getTaxi(id);
    const open = level.slots.some((t) => t && t.color === taxi.color) ? 0.3 : 1;
    let s = 0;
    people.forEach((p, i) => {
      if (p.color === taxi.color) s += i < headSize ? 10 : 3;
    });
    return s * open + Math.random();
  };
  return ids.sort((a, b) => score(b) - score(a))[0];
}

const dir = new URL("../src/data/levels/", import.meta.url);
const LEVELS = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")));

const games = Number(process.argv[2] ?? 200);
for (const config of LEVELS) {
  let wins = 0;
  for (let g = 0; g < games; g++) {
    const level = loadLevel(config);
    for (let guard = 0; level.status === "playing" && guard < 500; guard++) level.selectTaxi(pick(level));
    if (level.status === "won") wins++;
  }
  console.log(`${config.name.padEnd(9)} taxis=${String(config.taxis.length).padStart(2)} slots=${config.slots} head=${config.queueHeadSize} cap=${config.taxiCapacity}  bot win rate ${Math.round((100 * wins) / games)}%`);
}
