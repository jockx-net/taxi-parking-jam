import { test } from "node:test";
import assert from "node:assert/strict";
import { Taxi, seatsForLength } from "../src/game/Taxi.js";

test("larger taxis always have more seats", () => {
  assert.ok(seatsForLength(1) < seatsForLength(2));
  assert.ok(seatsForLength(2) < seatsForLength(3));
});

test("a taxi's capacity follows its length", () => {
  for (const length of [1, 2, 3]) {
    const taxi = new Taxi({ id: "t", color: "red", x: 3, y: 3, dir: "right", length });
    assert.equal(taxi.capacity, seatsForLength(length));
  }
});
