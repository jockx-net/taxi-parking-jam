import { test } from "node:test";
import assert from "node:assert/strict";
import { GridLot } from "../src/game/GridLot.js";
import { Taxi } from "../src/game/Taxi.js";

function taxi(id, x, y, dir, length = 1) {
  return new Taxi({ id, color: "red", capacity: 3, x, y, dir, length });
}

test("a multi-cell taxi extends backwards from its front cell", () => {
  assert.deepEqual(taxi("t", 3, 1, "right", 3).cells(), [
    { x: 3, y: 1 },
    { x: 2, y: 1 },
    { x: 1, y: 1 },
  ]);
  assert.deepEqual(taxi("t", 0, 0, "up", 2).cells(), [
    { x: 0, y: 0 },
    { x: 0, y: 1 },
  ]);
});

test("overlapping or out-of-bounds taxis are rejected", () => {
  assert.throws(() => new GridLot(3, 3, [taxi("a", 1, 1, "right", 2), taxi("b", 0, 1, "up")]));
  assert.throws(() => new GridLot(3, 3, [taxi("a", 0, 0, "right", 2)]));
});

test("a taxi is free with nothing ahead and blocked by a taxi in its path", () => {
  const a = taxi("a", 0, 0, "right");
  const b = taxi("b", 2, 0, "up");
  const grid = new GridLot(3, 3, [a, b]);
  assert.equal(grid.blockerOf(a), "b");
  assert.equal(grid.isFree(a), false);
  assert.equal(grid.isFree(b), true);
});

test("only cells ahead of the front block; the body behind does not", () => {
  const a = taxi("a", 1, 0, "right", 2); // occupies (1,0) and (0,0)
  const b = taxi("b", 0, 1, "up"); // wants to go up through (0,0)
  const grid = new GridLot(3, 3, [a, b]);
  assert.equal(grid.blockerOf(b), "a");
  assert.equal(grid.isFree(a), true);
});

test("removing a taxi frees everything it was blocking", () => {
  const a = taxi("a", 0, 0, "right");
  const b = taxi("b", 2, 0, "up");
  const grid = new GridLot(3, 3, [a, b]);
  grid.removeFromGrid(b);
  b.state = "departed";
  assert.deepEqual(grid.freeTaxiIds(), ["a"]);
});

test("isCleared once every taxi has departed", () => {
  const a = taxi("a", 0, 0, "up");
  const grid = new GridLot(2, 2, [a]);
  assert.equal(grid.isCleared(), false);
  a.state = "departed";
  assert.equal(grid.isCleared(), true);
});
