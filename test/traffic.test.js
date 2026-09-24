import { test } from "node:test";
import assert from "node:assert/strict";
import { RoadPath, Traffic, Vehicle, circlesOverlap } from "../src/game/traffic.js";

const P = (x, y) => ({ x, y });

function vehicle(id, priority, points, extra = {}) {
  const path = new RoadPath(points, 30);
  return new Vehicle({ id, priority, path, lengthCells: 1, cellPx: 128, scaleFrom: 0.5, scaleTo: 0.5, ...extra });
}

function run(traffic, ms, each) {
  for (let t = 0; t < ms; t += 16) {
    traffic.step(16);
    if (each) each(t);
  }
}

test("a road path reports its length and heading", () => {
  const path = new RoadPath([P(0, 0), P(100, 0), P(100, 100)], 20);
  assert.ok(path.length > 190 && path.length < 200);
  assert.ok(Math.abs(path.poseAt(10).heading) < 1e-9); // heading east
  assert.ok(Math.abs(path.poseAt(path.length - 5).heading - Math.PI / 2) < 1e-6); // heading south
  assert.deepEqual([path.poseAt(0).x, path.poseAt(0).y], [0, 0]);
});

test("a lone vehicle drives its path and arrives", () => {
  const traffic = new Traffic();
  const v = vehicle("a", 1, [P(0, 0), P(400, 0)]);
  let arrived = false;
  v.onArrived = () => (arrived = true);
  traffic.add(v);
  run(traffic, 3000);
  assert.equal(v.state, "parked");
  assert.ok(arrived);
  assert.ok(Math.abs(v.x - 400) < 1);
});

test("a later vehicle follows an earlier one without overlapping", () => {
  const traffic = new Traffic();
  const older = vehicle("old", 1, [P(0, 0), P(600, 0)]);
  const newer = vehicle("new", 2, [P(0, 0), P(400, 0)]);
  traffic.add(older);
  traffic.add(newer);
  let overlaps = 0;
  run(traffic, 8000, (t) => {
    if (t > 600 && circlesOverlap(older.circles(), newer.circles(), 0)) overlaps++;
  });
  assert.equal(overlaps, 0);
  assert.equal(older.state, "parked");
  assert.equal(newer.state, "parked");
});

test("a later vehicle yields at a crossing to an earlier one", () => {
  const traffic = new Traffic();
  const older = vehicle("old", 1, [P(0, 200), P(500, 200)]);
  const newer = vehicle("new", 2, [P(250, 0), P(250, 400)]);
  traffic.add(older);
  traffic.add(newer);
  let overlaps = 0;
  let olderPassedFirst = null;
  run(traffic, 8000, () => {
    if (circlesOverlap(older.circles(), newer.circles(), 0)) overlaps++;
    if (olderPassedFirst === null && newer.y > 200) olderPassedFirst = older.x > 260;
  });
  assert.equal(overlaps, 0);
  assert.equal(olderPassedFirst, true);
  assert.equal(newer.state, "parked");
});

test("a newer vehicle waits for an occupied bay until the occupant has left", () => {
  const traffic = new Traffic();
  const bay = [P(0, 0), P(300, 0)];
  const older = vehicle("old", 1, bay);
  traffic.add(older);
  run(traffic, 3000);
  assert.equal(older.state, "parked");

  const newer = vehicle("new", 2, bay);
  traffic.add(newer);
  let overlaps = 0;
  run(traffic, 3000, () => {
    if (circlesOverlap(older.circles(), newer.circles(), 0)) overlaps++;
  });
  assert.equal(newer.state, "driving"); // still held back
  assert.ok(newer.x < older.x - 50);
  assert.equal(overlaps, 0);

  older.beginDeparture({
    reversePath: new RoadPath([P(300, 0), P(300, -80)], 30),
    leavePath: new RoadPath([P(300, -80), P(-200, -80)], 30),
    pivotTarget: Math.PI,
  });
  run(traffic, 8000);
  assert.equal(older.state, "gone");
  assert.equal(newer.state, "parked");
});

test("a merging vehicle waits for older traffic approaching the merge", () => {
  const traffic = new Traffic();
  const road = vehicle("old", 1, [P(0, 200), P(600, 200)]);
  road.s = 0;
  const merger = vehicle("new", 2, [P(300, 60), P(300, 200), P(480, 200)]);
  traffic.add(road);
  traffic.add(merger);
  let overlaps = 0;
  let mergerAheadOfOlder = false;
  run(traffic, 8000, () => {
    if (circlesOverlap(road.circles(), merger.circles(), 0)) overlaps++;
    if (merger.y >= 195 && merger.x > road.x + 5 && road.state === "driving") mergerAheadOfOlder = true;
  });
  assert.equal(overlaps, 0);
  assert.equal(mergerAheadOfOlder, false);
  assert.equal(merger.state, "parked");
});

test("a newer vehicle never joins the road ahead of an older one behind it", () => {
  const traffic = new Traffic();
  const lane = [P(0, 0), P(1000, 0)];
  const older = vehicle("old", 1, lane, { entryS: 0, mergeDist: 0 });
  const newer = vehicle("new", 2, [P(500, -200), P(500, 0), P(900, 0)], { entryS: 500, mergeDist: 190 });
  traffic.add(older);
  traffic.add(newer);
  let overtook = false;
  let overlaps = 0;
  run(traffic, 9000, () => {
    if (newer.state === "driving" && newer.s > 200 && newer.x > older.x + 5 && older.state === "driving") overtook = true;
    if (circlesOverlap(older.circles(), newer.circles(), 0)) overlaps++;
  });
  assert.equal(overtook, false);
  assert.equal(overlaps, 0);
  assert.equal(newer.state, "parked");
});

test("a vehicle stops at its bay gate until the previous occupant has left", () => {
  const traffic = new Traffic();
  const route = [P(0, 0), P(400, 0)];
  const first = vehicle("first", 1, route);
  traffic.add(first);
  run(traffic, 3000);
  assert.equal(first.state, "parked");

  const second = vehicle("second", 2, route, { waitFor: first, gateS: 250 });
  traffic.add(second);
  run(traffic, 4000);
  assert.ok(second.s <= 250 + 0.5, "held at the gate");
  assert.equal(second.state, "driving");

  first.beginDeparture({
    reversePath: new RoadPath([P(400, 0), P(400, -90)], 30),
    leavePath: new RoadPath([P(400, -90), P(-200, -90)], 30),
    pivotTarget: Math.PI,
  });
  run(traffic, 9000);
  assert.equal(first.state, "gone");
  assert.equal(second.state, "parked");
});

test("a taxi waiting to reverse out lets passing traffic through instead of deadlocking", () => {
  const traffic = new Traffic();
  // main road along y=0 heading east; the bay hangs below it at x=300
  const parked = vehicle("parked", 1, [P(300, 200), P(300, 200.6)]);
  traffic.add(parked);
  run(traffic, 200);
  assert.equal(parked.state, "parked");
  parked.beginDeparture({
    reversePath: new RoadPath([P(300, 200), P(300, 0)], 30),
    leavePath: new RoadPath([P(300, 0), P(-300, 0)], 30),
    pivotTarget: Math.PI,
  });
  const passer = vehicle("passer", 2, [P(700, 0), P(-100, 0)]);
  traffic.add(passer);
  run(traffic, 12000);
  assert.equal(parked.state, "gone");
  assert.equal(passer.state, "parked");
});

test("an older vehicle that waited out a stopped newer one drives on instead of creeping", () => {
  const traffic = new Traffic();
  const blocker = vehicle("newer", 2, [P(500, 0), P(500.6, 0)]);
  traffic.add(blocker);
  run(traffic, 100);
  const older = vehicle("older", 1, [P(0, 0), P(1000, 0)]);
  traffic.add(older);
  run(traffic, 15000);
  assert.equal(older.state, "parked");
});
