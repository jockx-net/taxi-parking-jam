// Lightweight road traffic for the animated scene (pure logic, no Phaser).
//
// Vehicles follow polyline paths. Selection order is priority: a vehicle always
// yields to vehicles selected before it, never joins the road ahead of an older
// one, and never drives through anything that is stopped or directly ahead of
// it. Nothing here decides game rules; it only makes the taxis share the road
// politely, so the player can keep selecting while earlier taxis are moving.

const MAX_SPEED = 1.1; // px per ms
const ACCEL = 0.003;
const BRAKE = 0.006;
const REVERSE_SPEED = 0.5;
const PIVOT_RATE = 0.006; // rad per ms
const YIELD_TIMEOUT = 2500; // ms an older vehicle waits for a stopped newer one
const PUSH_DISTANCE = 260; // px an older vehicle then drives on past stopped newer ones
const STUCK_TIMEOUT = 25000; // ms after which any vehicle just goes (never soft-lock)
const MERGE_GAP = 80; // px an older vehicle must be ahead before a newer one may join the road
const APPROACH_LOOKAHEAD = 200; // px of older crossing/merging traffic a vehicle watches for
const MARGIN = 3;

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

// Polyline path with rounded corners, sampled densely.
export class RoadPath {
  constructor(points, radius = 30) {
    const pts = points.filter((p, i) => i === 0 || dist(p, points[i - 1]) > 0.5);
    const out = [{ x: pts[0].x, y: pts[0].y }];
    for (let i = 1; i < pts.length - 1; i++) {
      const a = pts[i - 1];
      const p = pts[i];
      const b = pts[i + 1];
      const dIn = dist(a, p);
      const dOut = dist(p, b);
      const r = Math.min(radius, dIn / 2, dOut / 2);
      const start = { x: p.x - ((p.x - a.x) / dIn) * r, y: p.y - ((p.y - a.y) / dIn) * r };
      const end = { x: p.x + ((b.x - p.x) / dOut) * r, y: p.y + ((b.y - p.y) / dOut) * r };
      out.push(start);
      for (let k = 1; k <= 8; k++) {
        const t = k / 8;
        const u = 1 - t;
        out.push({ x: u * u * start.x + 2 * u * t * p.x + t * t * end.x, y: u * u * start.y + 2 * u * t * p.y + t * t * end.y });
      }
    }
    out.push({ x: pts[pts.length - 1].x, y: pts[pts.length - 1].y });
    this.points = out;
    this.cumulative = [0];
    for (let i = 1; i < out.length; i++) this.cumulative.push(this.cumulative[i - 1] + dist(out[i - 1], out[i]));
    this.length = this.cumulative[this.cumulative.length - 1];
  }

  poseAt(s) {
    const clamped = Math.max(0, Math.min(s, this.length));
    let lo = 1;
    let hi = this.points.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.cumulative[mid] >= clamped) hi = mid;
      else lo = mid + 1;
    }
    const a = this.points[lo - 1];
    const b = this.points[lo];
    const seg = this.cumulative[lo] - this.cumulative[lo - 1];
    const t = seg === 0 ? 0 : (clamped - this.cumulative[lo - 1]) / seg;
    return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, heading: Math.atan2(b.y - a.y, b.x - a.x) };
  }
}

// A vehicle body approximated by circles along its axis.
export function bodyCircles({ x, y, heading }, length, width) {
  const r = width / 2;
  const usable = Math.max(0, length - 2 * r);
  const n = Math.max(1, Math.ceil(usable / (1.5 * r)) + 1);
  const cos = Math.cos(heading);
  const sin = Math.sin(heading);
  const circles = [];
  for (let i = 0; i < n; i++) {
    const offset = n === 1 ? 0 : -usable / 2 + (usable * i) / (n - 1);
    circles.push({ x: x + cos * offset, y: y + sin * offset, r });
  }
  return circles;
}

export function circlesOverlap(a, b, margin = MARGIN) {
  return a.some((ca) => b.some((cb) => Math.hypot(ca.x - cb.x, ca.y - cb.y) < ca.r + cb.r + margin));
}

export class Vehicle {
  // entryS/mergeDist: where along the shared road (track coordinate) and how far
  // along its path the vehicle joins it. gateS/waitFor: it may not pass gateS
  // until `waitFor` (the previous occupant of its bay) has left. bayLegS is where
  // it turns off the road into the bay.
  constructor({ id, priority, path, lengthCells, cellPx = 128, scaleFrom, scaleTo, entryS = null, mergeDist = 0, bayLegS = Infinity, gateS = Infinity, waitFor = null }) {
    this.id = id;
    this.priority = priority; // lower = selected earlier = right of way
    this.path = path;
    this.lengthCells = lengthCells;
    this.cellPx = cellPx;
    this.scaleFrom = scaleFrom;
    this.scaleTo = scaleTo;
    this.entryS = entryS;
    this.mergeDist = mergeDist;
    this.bayLegS = bayLegS;
    this.gateS = gateS;
    this.waitFor = waitFor;
    this.state = "driving"; // driving | parked | reversing | pivoting | leaving | gone
    this.s = 0;
    this.speed = 0;
    this.waitMs = 0;
    this.pushUntilS = -1; // after a long wait, drive on past stopped newer vehicles until this distance
    this.onArrived = null;
    const pose = path.poseAt(0);
    this.x = pose.x;
    this.y = pose.y;
    this.heading = pose.heading;
    this.scale = scaleFrom;
  }

  get moving() {
    return this.state !== "parked" && this.state !== "gone";
  }

  isStationary() {
    return this.speed < 0.02;
  }

  hasLeftBay() {
    return this.state === "leaving" || this.state === "gone";
  }

  dims(scale) {
    return { length: this.lengthCells * this.cellPx * scale * 0.94, width: this.cellPx * scale * 0.7 };
  }

  circlesAt(pose, scale) {
    const { length, width } = this.dims(scale);
    return bodyCircles(pose, length, width);
  }

  circles() {
    return this.circlesAt(this, this.scale);
  }

  // Taxis are drawn lot-sized while in the lot and shrink to road size as they
  // join the ring road, so a long taxi in a big-celled lot doesn't swing its nose
  // through the bays when turning onto the main road.
  scaleAt(path, s) {
    if (this.state !== "driving") return this.scaleTo;
    if (this.entryS === null) return this.scaleFrom + (this.scaleTo - this.scaleFrom) * (s / path.length);
    const start = Math.max(0, this.mergeDist - 30);
    const t = Math.max(0, Math.min(1, (s - start) / 100));
    return this.scaleFrom + (this.scaleTo - this.scaleFrom) * t;
  }

  // Starts leaving the bay: reverse out, pivot to face the exit, drive off.
  beginDeparture({ reversePath, leavePath, pivotTarget }) {
    this.reversePath = reversePath;
    this.leavePath = leavePath;
    this.pivotTarget = pivotTarget;
    this.path = reversePath;
    this.s = 0;
    this.speed = 0;
    this.waitMs = 0;
    this.state = "reversing";
  }

  update(dt, traffic) {
    if (this.state === "driving") {
      this._move(dt, traffic, { maxSpeed: MAX_SPEED, stopAtEnd: true, reverse: false }, () => {
        this.state = "parked";
        this.speed = 0;
        if (this.onArrived) this.onArrived();
      });
    } else if (this.state === "reversing") {
      if (this.s === 0 && !traffic.exitClear(this)) {
        this.waitMs += dt;
        return;
      }
      this._move(dt, traffic, { maxSpeed: REVERSE_SPEED, stopAtEnd: true, reverse: true }, () => {
        this.state = "pivoting";
        this.speed = 0;
      });
    } else if (this.state === "pivoting") {
      this.heading = Math.min(this.heading + PIVOT_RATE * dt, this.pivotTarget);
      if (this.heading >= this.pivotTarget) {
        this.state = "leaving";
        this.path = this.leavePath;
        this.s = 0;
        this.speed = 0;
      }
    } else if (this.state === "leaving") {
      this._move(dt, traffic, { maxSpeed: MAX_SPEED, stopAtEnd: false, reverse: false }, () => {
        this.state = "gone";
      });
    }
  }

  // Furthest distance along the path this vehicle may currently drive to.
  _limit(traffic) {
    let limit = Infinity;
    if (this.state !== "driving") return limit;
    if (this.waitFor && !this.waitFor.hasLeftBay() && this.s <= this.gateS) limit = Math.min(limit, this.gateS);
    if (this.entryS !== null && this.s < this.mergeDist && !traffic.mayMerge(this)) {
      // wait with the whole body clear of the road it is about to join
      const { length, width } = this.dims(this.scaleAt(this.path, this.s));
      limit = Math.min(limit, Math.max(this.s, this.mergeDist - (length / 2 + width / 2 + 4)));
    }
    return limit;
  }

  _move(dt, traffic, { maxSpeed, stopAtEnd, reverse }, onEnd) {
    const remaining = this.path.length - this.s;
    let target = maxSpeed;
    if (stopAtEnd) target = Math.min(target, Math.sqrt(2 * BRAKE * Math.max(remaining, 0)) + 0.03);

    const limit = this._limit(traffic);
    if (limit < Infinity) target = Math.min(target, Math.sqrt(2 * BRAKE * Math.max(0, limit - this.s)));

    if (this.waitMs >= YIELD_TIMEOUT && this.pushUntilS < this.s) this.pushUntilS = this.s + PUSH_DISTANCE;
    const look = 20 + (this.speed * this.speed) / (2 * BRAKE);
    const blocked = this.waitMs < STUCK_TIMEOUT && traffic.isBlocked(this, this.path, this.s, look, reverse);
    if (blocked) target = 0;
    if (blocked || target < 0.02) this.waitMs += dt;
    else if (this.speed > 0.05) this.waitMs = 0;

    if (this.speed < target) this.speed = Math.min(target, this.speed + ACCEL * dt);
    else this.speed = Math.max(target, this.speed - BRAKE * dt);

    this.s = Math.min(this.path.length, limit, this.s + this.speed * dt);
    const pose = this.path.poseAt(this.s);
    this.x = pose.x;
    this.y = pose.y;
    if (!reverse) this.heading = pose.heading;
    this.scale = this.scaleAt(this.path, this.s);

    if (this.path.length - this.s < 0.5 && (stopAtEnd || this.s >= this.path.length)) onEnd();
  }
}

export class Traffic {
  constructor() {
    this.vehicles = [];
  }

  add(vehicle) {
    this.vehicles.push(vehicle);
    this.vehicles.sort((a, b) => a.priority - b.priority);
  }

  remove(vehicle) {
    this.vehicles = this.vehicles.filter((v) => v !== vehicle);
  }

  // Advances everything; older vehicles move first so newer ones react to them.
  step(dt) {
    for (const vehicle of [...this.vehicles]) vehicle.update(dt, this);
  }

  // May `v` join the road? Not while an older vehicle that is still behind (or
  // level with) v's entry point would then be overtaken by it.
  mayMerge(v) {
    for (const o of this.vehicles) {
      if (o === v || o.priority > v.priority || o.state !== "driving" || o.entryS === null || o.s > o.bayLegS) continue;
      if (o.entryS + (o.s - o.mergeDist) < v.entryS + MERGE_GAP) return false;
    }
    return true;
  }

  // Is the stretch of road in front of `v`'s bay free of traffic, now and over
  // the next moments, so it can safely reverse out and turn?
  exitClear(v) {
    const end = v.reversePath.poseAt(v.reversePath.length);
    const { length } = v.dims(v.scaleTo);
    const zone = [{ x: end.x, y: end.y, r: length / 2 + 20 }];
    for (const o of this.vehicles) {
      if (o === v || o.state === "gone") continue;
      if (circlesOverlap(zone, o.circles(), 0)) return false;
      // Where will `o` drive next? A taxi still reversing or pivoting is about to
      // drive off along its leave path, right through this taxi's swing area.
      const departing = o.state === "reversing" || o.state === "pivoting";
      if (o.state === "reversing" && o.s === 0) {
        // also waiting to pull out: if our swing areas overlap, the older one goes first
        const theirs = o.reversePath.poseAt(o.reversePath.length);
        const theirR = o.dims(o.scaleTo).length / 2 + 20;
        if (o.priority < v.priority && Math.hypot(theirs.x - end.x, theirs.y - end.y) < theirR + zone[0].r) return false;
        continue;
      }
      const path = departing ? o.leavePath : o.path;
      if (!o.moving || !path || (o.state === "driving" && o.isStationary())) continue; // a queued taxi is not approaching; a departing one always is
      const from = departing ? 0 : o.s;
      for (let d = 10; d <= 200; d += 10) {
        const pose = path.poseAt(from + d);
        if (circlesOverlap(zone, o.circlesAt({ x: pose.x, y: pose.y, heading: pose.heading }, o.scale), 0)) return false;
      }
    }
    return true;
  }

  // Would `v`, driving on `path` from distance `s` for `look` px, run into
  // something it has to give way to?
  isBlocked(v, path, s, look, reverse) {
    const samples = [];
    for (let d = 8, n = 0; n < 120; d += 8, n++) {
      const ss = Math.min(s + d, path.length);
      const pose = path.poseAt(ss);
      samples.push({ pose: { x: pose.x, y: pose.y, heading: reverse ? v.heading : pose.heading }, scale: v.scaleAt(path, ss) });
      if (d >= look || ss >= path.length) break;
    }
    const others = this.vehicles.filter((o) => o !== v && o.state !== "gone");

    for (const { pose, scale } of samples) {
      const mine = v.circlesAt(pose, scale);
      for (const o of others) {
        if (circlesOverlap(mine, o.circles()) && this._mustYield(v, o, pose, reverse)) return true;
      }
    }

    if (v.state === "driving") {
      for (const o of others) {
        if (o.priority < v.priority && this._approaches(o, samples, v)) return true;
      }
    }
    return false;
  }

  _mustYield(v, o, pose, reverse) {
    const pushing = v.waitMs >= YIELD_TIMEOUT || v.s < v.pushUntilS;
    if (o.priority < v.priority) return !(o.state === "parked" && pushing); // never held up for ever by a taxi merely parked in a bay
    if (reverse) return true;
    if (o.state === "reversing" || o.state === "pivoting") return true; // it is turning across the road
    const dx = o.x - pose.x;
    const dy = o.y - pose.y;
    const d = Math.hypot(dx, dy) || 1;
    const along = (dx * Math.cos(pose.heading) + dy * Math.sin(pose.heading)) / d; // 1 = dead ahead
    if (o.isStationary()) {
      return along > 0.2 && !pushing; // give up on a stopped newer vehicle after a while
    }
    return along > 0.6 && Math.cos(o.heading - pose.heading) > 0.7; // following a moving one
  }

  // Will older vehicle `o` cross or merge into the spots `v` is about to
  // occupy? (Same-direction traffic is handled by the following rule.)
  _approaches(o, samples, v) {
    if (!o.moving || !o.path || o.state === "pivoting") return false;
    if (o.state === "reversing" && o.s === 0) return false; // still waiting for the road to clear
    for (let d = 0; d <= APPROACH_LOOKAHEAD; d += 10) {
      const pose = o.path.poseAt(o.s + d);
      const theirs = o.circlesAt({ x: pose.x, y: pose.y, heading: pose.heading }, o.scale);
      for (const sample of samples) {
        if (Math.cos(sample.pose.heading - pose.heading) < 0.7 && circlesOverlap(v.circlesAt(sample.pose, sample.scale), theirs)) return true;
      }
    }
    return false;
  }
}
