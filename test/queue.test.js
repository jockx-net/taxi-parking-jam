import { test } from "node:test";
import assert from "node:assert/strict";
import { Queue } from "../src/game/Queue.js";

const make = (people, previewSize = 4, headSize = 2) => new Queue({ people, previewSize, headSize });

test("preview and head are prefixes of the queue", () => {
  const q = make(["red", "blue", "red", "blue", "green", "green"]);
  assert.deepEqual(q.peek().map((p) => p.color), ["red", "blue", "red", "blue"]);
  assert.deepEqual(q.head().map((p) => p.color), ["red", "blue"]);
  assert.equal(q.remaining(), 6);
});

test("removeAt takes anyone and reveals the next person at the preview tail", () => {
  const q = make(["red", "blue", "red", "blue", "green", "green"]);
  const { removed, spawned } = q.removeAt(1);
  assert.equal(removed.color, "blue");
  assert.equal(spawned.color, "green");
  assert.deepEqual(q.peek().map((p) => p.color), ["red", "red", "blue", "green"]);
});

test("nobody is revealed once the queue runs short", () => {
  const q = make(["red", "blue", "red", "blue"]);
  assert.equal(q.removeAt(0).spawned, null);
  assert.equal(q.peek().length, 3);
});

test("headSize is capped at previewSize", () => {
  assert.equal(make(["red", "red"], 2, 5).head().length, 2);
});
