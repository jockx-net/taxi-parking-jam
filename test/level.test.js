import { test } from "node:test";
import assert from "node:assert/strict";
import { GridLot } from "../src/game/GridLot.js";
import { Taxi } from "../src/game/Taxi.js";
import { Queue } from "../src/game/Queue.js";
import { Level } from "../src/game/Level.js";

function taxi(id, color, x, y, dir, capacity = 2) {
  return new Taxi({ id, color, capacity, x, y, dir, length: 1 });
}

function setup({ taxis, queueColors, slots = 2, headSize = 3, previewSize = queueColors.length }) {
  const grid = new GridLot(4, 4, taxis);
  const queue = new Queue({ people: queueColors, previewSize, headSize });
  return new Level({ grid, queue, slots });
}

test("a blocked taxi cannot be selected, a free one can", () => {
  const a = taxi("a", "red", 0, 0, "right");
  const b = taxi("b", "blue", 2, 0, "up");
  const level = setup({ taxis: [a, b], queueColors: ["green", "green", "green"] });
  assert.equal(level.selectTaxi("a"), null);
  assert.ok(level.selectTaxi("b"));
  assert.equal(level.slots[0], b);
});

test("selecting a taxi emits an enter event and fills the first empty slot", () => {
  const a = taxi("a", "red", 0, 0, "up");
  const level = setup({ taxis: [a], queueColors: ["blue", "blue", "blue"] });
  assert.deepEqual(level.selectTaxi("a")[0], { type: "enter", taxiId: "a", slot: 0 });
});

test("anyone in the head boards, not just the first person", () => {
  const a = taxi("a", "red", 0, 0, "up", 1);
  const b = taxi("b", "blue", 1, 0, "up", 3);
  const level = setup({ taxis: [a, b], queueColors: ["blue", "red", "blue"], headSize: 3 });
  level.selectTaxi("b");
  const events = level.selectTaxi("a");
  // red (index 1) boards a even though blue is first; a departs after 1 seat
  const boards = events.filter((e) => e.type === "board");
  assert.equal(boards[0].color, "red");
  assert.equal(boards[0].taxiId, "a");
  assert.ok(events.some((e) => e.type === "depart" && e.taxiId === "a"));
});

test("people outside the head cannot board", () => {
  const a = taxi("a", "red", 0, 0, "up");
  const b = taxi("b", "blue", 1, 0, "up");
  const level = setup({ taxis: [a, b], queueColors: ["blue", "blue", "red"], headSize: 2 });
  level.selectTaxi("a");
  assert.equal(a.seatsFilled, 0); // the only red is at index 2, outside the head
});

test("boarding cascades and reports seats, spawned people and departure", () => {
  const a = taxi("a", "red", 0, 0, "up", 2);
  const level = setup({ taxis: [a], queueColors: ["red", "red", "blue"], headSize: 3 });
  const events = level.selectTaxi("a");
  assert.deepEqual(events.map((e) => e.type), ["enter", "board", "board", "depart"]);
  assert.equal(events[2].seats, 2);
  assert.equal(level.status, "won");
  assert.equal(level.slots[0], null);
});

test("win requires every taxi to depart", () => {
  const a = taxi("a", "red", 0, 0, "up", 1);
  const b = taxi("b", "red", 1, 0, "up", 1);
  const level = setup({ taxis: [a, b], queueColors: ["red", "red"], headSize: 2 });
  level.selectTaxi("a");
  assert.equal(level.status, "playing");
  level.selectTaxi("b");
  assert.equal(level.status, "won");
});

test("lose: all slots full and nobody in the head matches", () => {
  const a = taxi("a", "red", 0, 0, "up");
  const b = taxi("b", "blue", 1, 0, "up");
  const c = taxi("c", "green", 2, 0, "up");
  const level = setup({ taxis: [a, b, c], queueColors: ["green", "green", "green"], slots: 2, headSize: 3 });
  level.selectTaxi("a");
  assert.equal(level.status, "playing");
  level.selectTaxi("b");
  assert.equal(level.status, "lost");
  assert.equal(level.selectTaxi("c"), null);
});

test("no loss while a slot is free and a taxi can still be sent", () => {
  const a = taxi("a", "red", 0, 0, "up");
  const b = taxi("b", "blue", 1, 0, "up");
  const level = setup({ taxis: [a, b], queueColors: ["blue", "blue", "blue"], slots: 2, headSize: 3 });
  level.selectTaxi("a");
  assert.equal(level.status, "playing");
});
