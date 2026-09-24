import { test } from "node:test";
import assert from "node:assert/strict";
import { GridLot } from "../src/game/GridLot.js";
import { Taxi } from "../src/game/Taxi.js";
import { Queue } from "../src/game/Queue.js";
import { Level } from "../src/game/Level.js";

function setup({ taxis, initialColors, previewSize = 3, colors = ["red", "blue"], pickupBays = 2 }) {
  const grid = new GridLot(3, 3, taxis);
  const queue = new Queue({ previewSize, colors, initialColors });
  return new Level({ grid, queue, pickupBays });
}

test("selectTaxi fails for a blocked taxi, succeeds once unblocked", () => {
  const t1 = new Taxi({ id: "t1", color: "red", capacity: 2, x: 0, y: 0, exitDir: "right" });
  const blocker = new Taxi({ id: "b", color: "blue", capacity: 2, x: 1, y: 0, exitDir: "up" });
  const level = setup({ taxis: [t1, blocker], initialColors: ["red", "red", "red"] });

  assert.equal(level.selectTaxi("t1"), false);
  assert.equal(level.selectTaxi("b"), true);
  assert.equal(level.bays[0], blocker); // front is 'red', doesn't match blocker's 'blue', so it just waits in the bay
});

test("selectTaxi fails once every bay is occupied", () => {
  const t1 = new Taxi({ id: "t1", color: "red", capacity: 3, x: 0, y: 0, exitDir: "up" });
  const t2 = new Taxi({ id: "t2", color: "blue", capacity: 3, x: 1, y: 0, exitDir: "up" });
  const t3 = new Taxi({ id: "t3", color: "green", capacity: 3, x: 2, y: 0, exitDir: "up" });
  const level = setup({
    taxis: [t1, t2, t3],
    initialColors: ["green", "green", "green"],
    colors: ["red", "blue", "green"],
    pickupBays: 2,
  });

  assert.equal(level.selectTaxi("t1"), true);
  assert.equal(level.selectTaxi("t2"), true);
  assert.equal(level.selectTaxi("t3"), false); // no free bay left
  assert.equal(level.hasFreeBay(), false);
});

test("front-of-queue person auto-boards a matching bay taxi, cascading through multiple matches", () => {
  const t1 = new Taxi({ id: "t1", color: "red", capacity: 2, x: 0, y: 0, exitDir: "up" });
  const level = setup({ taxis: [t1], initialColors: ["red", "red", "blue"], previewSize: 3 });

  level.selectTaxi("t1");
  // both leading 'red' people should have auto-boarded in one call, filling and departing t1
  assert.equal(t1.seatsFilled, 2);
  assert.equal(t1.state, "departed");
  assert.equal(level.status, "won"); // only taxi in the grid, now cleared
  assert.equal(level.bays[0], null);
});

test("a non-matching front person waits without failing the level", () => {
  const t1 = new Taxi({ id: "t1", color: "red", capacity: 2, x: 0, y: 0, exitDir: "up" });
  const level = setup({ taxis: [t1], initialColors: ["blue", "blue", "blue"], previewSize: 3 });

  level.selectTaxi("t1");
  assert.equal(t1.seatsFilled, 0);
  assert.equal(level.status, "playing");
  assert.equal(level.queue.front().color, "blue");
});

test("recallTaxi frees a bay, returns the taxi to the grid, and preserves seats already filled", () => {
  const t1 = new Taxi({ id: "t1", color: "red", capacity: 3, x: 0, y: 0, exitDir: "up" });
  const t2 = new Taxi({ id: "t2", color: "blue", capacity: 3, x: 1, y: 0, exitDir: "left" });
  const level = setup({
    taxis: [t1, t2],
    initialColors: ["red", "green", "green"],
    colors: ["red", "blue", "green"],
    pickupBays: 1,
  });

  level.selectTaxi("t1"); // boards the leading 'red', leaving t1 at 1/3
  assert.equal(t1.seatsFilled, 1);
  assert.equal(level.hasFreeBay(), false);

  assert.equal(level.recallTaxi("t1"), true);
  assert.equal(level.hasFreeBay(), true);
  assert.equal(t1.state, "parked");
  assert.equal(t1.seatsFilled, 1); // progress preserved

  // t1 is back on the grid and blocks t2's leftward path again
  assert.equal(level.grid.hasClearPath(t2), false);
});

test("recallTaxi returns false for a taxi that isn't currently in a bay", () => {
  const t1 = new Taxi({ id: "t1", color: "red", capacity: 2, x: 0, y: 0, exitDir: "up" });
  const level = setup({ taxis: [t1], initialColors: ["blue", "blue", "blue"] });
  assert.equal(level.recallTaxi("t1"), false);
});

test("two bays let two different colors board independently from the front", () => {
  const t1 = new Taxi({ id: "t1", color: "red", capacity: 1, x: 0, y: 0, exitDir: "up" });
  const t2 = new Taxi({ id: "t2", color: "blue", capacity: 1, x: 1, y: 0, exitDir: "up" });
  const level = setup({
    taxis: [t1, t2],
    initialColors: ["blue", "red"],
    previewSize: 2,
    pickupBays: 2,
  });

  level.selectTaxi("t1"); // t1 (red) can't take the front 'blue' person yet
  assert.equal(t1.seatsFilled, 0);

  level.selectTaxi("t2"); // t2 (blue) boards the front 'blue' immediately,
  // which then exposes 'red' at the front for t1 to auto-board too.
  assert.equal(t2.state, "departed");
  assert.equal(t1.seatsFilled, 1);
  assert.equal(t1.state, "departed");
  assert.equal(level.status, "won");
});
