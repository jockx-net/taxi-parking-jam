import { test } from "node:test";
import assert from "node:assert/strict";
import { Queue } from "../src/game/Queue.js";

const colorSource = () => ["red", "blue"];

test("preview is full, seeded by initialColors then colorSource", () => {
  const q = new Queue({ previewSize: 4, headSize: 2, colorSource, initialColors: ["blue"], rng: () => 0 });
  assert.deepEqual(q.peek().map((p) => p.color), ["blue", "red", "red", "red"]);
});

test("head is the first headSize people", () => {
  const q = new Queue({ previewSize: 5, headSize: 3, colorSource, initialColors: ["red", "blue", "red", "blue", "blue"] });
  assert.deepEqual(q.head().map((p) => p.color), ["red", "blue", "red"]);
});

test("removeAt takes anyone, shifts the rest forward and spawns at the tail", () => {
  const q = new Queue({
    previewSize: 3,
    headSize: 3,
    colorSource,
    initialColors: ["red", "blue", "red"],
    rng: () => 0.99, // -> 'blue'
  });
  const { removed, spawned } = q.removeAt(1);
  assert.equal(removed.color, "blue");
  assert.equal(spawned.color, "blue");
  assert.deepEqual(q.peek().map((p) => p.color), ["red", "red", "blue"]);
  assert.equal(q.peek()[2].id, spawned.id);
});

test("new people only use colors offered by colorSource", () => {
  const q = new Queue({ previewSize: 3, headSize: 3, colorSource: () => ["green"], initialColors: ["red", "red", "red"] });
  assert.equal(q.removeAt(0).spawned.color, "green");
});

test("headSize is capped at previewSize", () => {
  const q = new Queue({ previewSize: 2, headSize: 5, colorSource });
  assert.equal(q.head().length, 2);
});
