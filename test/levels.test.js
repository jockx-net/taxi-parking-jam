import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { loadLevel } from "../src/game/LevelLoader.js";
import { seatsForLength } from "../src/game/Taxi.js";
import { isLotClearable, solve } from "../src/game/solver.js";

const dir = new URL("../src/data/levels/", import.meta.url);
const configs = readdirSync(dir)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")));

test("there are at least 20 levels", () => {
  assert.ok(configs.length >= 20);
});

for (const config of configs) {
  test(`${config.name}: valid lot, exact queue, clearable and winnable`, () => {
    const level = loadLevel(config); // throws on overlap / out of bounds
    const seats = config.taxis.reduce((sum, t) => sum + seatsForLength(t.length), 0);
    assert.equal(config.queue.length, seats);
    assert.ok(config.taxis.every((t) => config.colors.includes(t.color)));
    assert.ok(isLotClearable(config));
    assert.equal(level.status, "playing");

    const moves = solve(config, 2500);
    assert.ok(moves, "solver should find a winning move list");
    const replay = loadLevel(config);
    for (const id of moves) assert.ok(replay.selectTaxi(id));
    assert.equal(replay.status, "won");
  });
}
