import { test } from "node:test";
import assert from "node:assert/strict";
import { GridLot } from "../src/game/GridLot.js";
import { Taxi } from "../src/game/Taxi.js";

function makeTaxi(id, x, y, exitDir) {
  return new Taxi({ id, color: "red", capacity: 3, x, y, exitDir });
}

test("clear path to the edge with no blockers", () => {
  const t1 = makeTaxi("t1", 0, 0, "right");
  const grid = new GridLot(3, 3, [t1]);
  assert.equal(grid.hasClearPath(t1), true);
});

test("path is blocked by another parked taxi in the way", () => {
  const t1 = makeTaxi("t1", 0, 0, "right");
  const blocker = makeTaxi("blocker", 1, 0, "up");
  const grid = new GridLot(3, 3, [t1, blocker]);
  assert.equal(grid.hasClearPath(t1), false);
});

test("removing a taxi from the grid frees the path for others", () => {
  const t1 = makeTaxi("t1", 0, 0, "right");
  const blocker = makeTaxi("blocker", 1, 0, "up");
  const grid = new GridLot(3, 3, [t1, blocker]);
  assert.equal(grid.hasClearPath(t1), false);
  grid.removeFromGrid(blocker);
  assert.equal(grid.hasClearPath(t1), true);
});

test("returnToGrid re-occupies the taxi's cell, re-blocking anything behind it", () => {
  const t1 = makeTaxi("t1", 0, 0, "right");
  const blocker = makeTaxi("blocker", 1, 0, "up");
  const grid = new GridLot(3, 3, [t1, blocker]);

  grid.removeFromGrid(blocker);
  assert.equal(grid.hasClearPath(t1), true);

  grid.returnToGrid(blocker);
  assert.equal(grid.hasClearPath(t1), false);
});

test("getAvailableTaxiIds only returns parked taxis with a clear path", () => {
  const t1 = makeTaxi("t1", 0, 0, "down");
  const t2 = makeTaxi("t2", 2, 0, "down");
  const grid = new GridLot(3, 3, [t1, t2]);
  assert.deepEqual(grid.getAvailableTaxiIds().sort(), ["t1", "t2"]);

  t1.state = "active";
  grid.removeFromGrid(t1);
  assert.deepEqual(grid.getAvailableTaxiIds(), ["t2"]);
});

test("isCleared is true only once every taxi has departed", () => {
  const t1 = makeTaxi("t1", 0, 0, "right");
  const t2 = makeTaxi("t2", 1, 1, "down");
  const grid = new GridLot(3, 3, [t1, t2]);
  assert.equal(grid.isCleared(), false);
  t1.state = "departed";
  assert.equal(grid.isCleared(), false);
  t2.state = "departed";
  assert.equal(grid.isCleared(), true);
});
