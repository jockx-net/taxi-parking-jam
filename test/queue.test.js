import { test } from "node:test";
import assert from "node:assert/strict";
import { Queue } from "../src/game/Queue.js";

test("preview starts full at previewSize, using initialColors where given", () => {
  const q = new Queue({
    previewSize: 4,
    colors: ["red", "blue"],
    initialColors: ["red", "blue"],
    rng: () => 0, // always picks colors[0]
  });
  assert.deepEqual(
    q.peek().map((p) => p.color),
    ["red", "blue", "red", "red"]
  );
});

test("front returns the person at the head of the preview", () => {
  const q = new Queue({ previewSize: 3, colors: ["red"], initialColors: ["red", "red", "red"] });
  assert.equal(q.front().color, "red");
});

test("popFront removes the head, shifts the rest forward, and refills the tail", () => {
  const q = new Queue({
    previewSize: 3,
    colors: ["red", "blue"],
    initialColors: ["red", "blue", "red"],
    rng: () => 1 - 1e-9, // always picks last color -> 'blue'
  });
  const removed = q.popFront();
  assert.equal(removed.color, "red");
  assert.deepEqual(
    q.peek().map((p) => p.color),
    ["blue", "red", "blue"]
  );
});
