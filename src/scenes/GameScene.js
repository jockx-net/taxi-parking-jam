import Phaser from "phaser";
import { loadLevel } from "../game/LevelLoader.js";
import { DIR_VECTORS } from "../game/Taxi.js";
import { RoadPath, Traffic, Vehicle, circlesOverlap } from "../game/traffic.js";
import { LEVELS } from "../data/levels/index.js";
import { COLOR_HEX } from "../game/colors.js";
import { CELL_PX, addBackground, personKey, taxiKey } from "./art.js";
import { PersonView } from "./People.js";
import { markCleared } from "./progress.js";

const W = 720;
const CELL_SIZE = 58; // on-screen size of one lot cell = the reference size of a taxi cell on the road, in the lot and in the bays
const RING_CY = 422; // vertical centre of the ring road
const MIN_RING_HALF_W = 300; // the ring is never narrower than the bays need
const MIN_RING_HALF_H = 200;
const ROAD_W = 76; // two lanes; a taxi takes roughly 55% of it
const LANE_OFF = ROAD_W / 4; // centre of the right-hand lane, measured from the road's centre line
const LANE_GAP = 52; // lot edge to the centre line of the ring road
const MAIN_Y = 860; // centre line of the main road (flows west to the exit)
const BAY_W = 140;
const BAY_H = 196;
const BAY_Y = 1004;
const SLOT_SPACING = 160;
const BAYS_CENTRE_X = 320; // bays sit left of centre so taxis waiting at the stop line don't crowd the nearest bay's turning circle
const QUEUE_Y = 1170;
const QUEUE_SPACING = 56;
const PERSON_SCALE = 0.5;
const PERSON_SPEED = 0.3; // px per ms when walking to a taxi
const BOARD_STAGGER = 230; // ms between people setting off for the same taxi
const DIR_ANGLE = { right: 0, down: 90, left: 180, up: -90 };

const TEXT = { fontFamily: "Arial", color: "#ffffff" };

export class GameScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  init(data) {
    this.levelIndex = data.levelIndex ?? 0;
  }

  create() {
    this.config = LEVELS[this.levelIndex];
    this.level = loadLevel(this.config);
    this.traffic = new Traffic();
    this.vehicles = new Map();
    this.ceremony = []; // board/depart events waiting for their taxi to be in its bay
    this.pumping = false;
    this.busy = 0; // people still walking to a taxi, doors and departures in progress
    this.ended = false;
    this.selectionCount = 0;
    this.lastInSlot = []; // most recent vehicle sent to each slot, for bay ordering
    this.simSpeed = 1; // test hook: >1 fast-forwards the traffic simulation
    this.taxiSprites = new Map();
    this.personSprites = new Map();
    this.personViews = new Map();
    this.pulses = [];
    this.slotViews = [];

    const { grid } = this.config;
    this.cell = CELL_SIZE; // every level uses the same cell size, so small lots are simply smaller
    const lotW = grid.width * this.cell;
    const lotH = grid.height * this.cell;
    this.origin = { x: W / 2 - lotW / 2, y: RING_CY - lotH / 2 };
    const halfW = Math.max(lotW / 2 + LANE_GAP, MIN_RING_HALF_W);
    const halfH = Math.max(lotH / 2 + LANE_GAP, MIN_RING_HALF_H);
    this.lane = { left: W / 2 - halfW, right: W / 2 + halfW, top: RING_CY - halfH, bottom: RING_CY + halfH };
    // Traffic drives on the right (clockwise round the ring, westbound on the main
    // road), i.e. the inner lane of the ring and the northern lane of the main road.
    const o = LANE_OFF;
    this.laneC = { left: this.lane.left + o, right: this.lane.right - o, top: this.lane.top + o, bottom: this.lane.bottom - o };
    this.mainLaneY = MAIN_Y - o;

    this.drawBackdrop();
    this.buildHud();
    this.buildSlots();
    this.buildQueue();
    this.buildTaxis();
    if (this.levelIndex === 0) this.buildHint();
    this.refresh();
  }

  // ---- layout helpers -----------------------------------------------------

  slotCenter(i) {
    const n = this.level.slots.length;
    return { x: BAYS_CENTRE_X + (i - (n - 1) / 2) * SLOT_SPACING, y: BAY_Y };
  }

  queuePos(i) {
    const n = Math.min(this.config.queuePreviewSize, this.config.queue.length);
    return { x: W / 2 + (i - (n - 1) / 2) * QUEUE_SPACING, y: QUEUE_Y };
  }

  taxiCenter(taxi) {
    const { dx, dy } = DIR_VECTORS[taxi.dir];
    const cx = taxi.x - (dx * (taxi.length - 1)) / 2;
    const cy = taxi.y - (dy * (taxi.length - 1)) / 2;
    return { x: this.origin.x + (cx + 0.5) * this.cell, y: this.origin.y + (cy + 0.5) * this.cell };
  }

  gridScale() {
    return this.cell / CELL_PX;
  }

  // ---- static scenery -----------------------------------------------------

  drawBackdrop() {
    addBackground(this);
    const { left, right, top, bottom } = this.lane;

    const roads = this.add.graphics().setDepth(-6);
    const curb = 0x5a6178;
    const asphalt = 0x2b2f3b;
    const ringW = right - left;
    const ringH = bottom - top;
    const extension = (color, pad) => roads.fillStyle(color, 1).fillRect(right - ROAD_W / 2 - pad, bottom - 60, ROAD_W + 2 * pad, MAIN_Y - bottom + 60);
    const mainRoad = (color, pad) => roads.fillStyle(color, 1).fillRect(0, MAIN_Y - ROAD_W / 2 - pad, W, ROAD_W + 2 * pad);
    roads.lineStyle(ROAD_W + 8, curb, 1).strokeRoundedRect(left, top, ringW, ringH, 60);
    extension(curb, 4);
    mainRoad(curb, 4);
    roads.lineStyle(ROAD_W, asphalt, 1).strokeRoundedRect(left, top, ringW, ringH, 60);
    extension(asphalt, 0);
    mainRoad(asphalt, 0);

    const pavement = this.add.graphics().setDepth(-7);
    pavement.fillStyle(0x858a94, 1).fillRoundedRect(left + ROAD_W / 2 + 4, top + ROAD_W / 2 + 4, ringW - ROAD_W - 8, ringH - ROAD_W - 8, 22);

    // Two-way road paint: one dashed centre line that also follows the curves,
    // and a stop line across the traffic lane where the ring meets the main road.
    const marks = this.add.graphics().setDepth(-5);
    marks.lineStyle(3, 0xffffff, 0.45);
    const dashAlong = (path) => {
      for (let d = 0; d < path.length - 1; d += 34) {
        const a = path.poseAt(d);
        const b = path.poseAt(Math.min(d + 18, path.length));
        marks.lineBetween(a.x, a.y, b.x, b.y);
      }
    };
    dashAlong(new RoadPath([{ x: W / 2, y: bottom }, { x: left, y: bottom }, { x: left, y: top }, { x: right, y: top }, { x: right, y: bottom }, { x: W / 2, y: bottom }], 60));
    const mainEdge = MAIN_Y - ROAD_W / 2; // northern edge of the main road
    dashAlong(new RoadPath([{ x: right, y: bottom - 60 }, { x: right, y: mainEdge - 70 }], 1));
    marks.lineBetween(right, mainEdge - 70, right, mainEdge); // solid approach line up to the main road's edge
    dashAlong(new RoadPath([{ x: W, y: MAIN_Y }, { x: 0, y: MAIN_Y }], 1));

    marks.lineBetween(right - ROAD_W / 2 + 3, mainEdge - 1.5, right, mainEdge - 1.5); // stop line: same paint as the centre line, flush with the main road's edge and meeting the centre line
  }

  buildHud() {
    const back = this.add.text(30, 40, "< Levels", { ...TEXT, fontSize: "26px" }).setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => this.scene.start("LevelSelect"));
    this.add.text(W / 2, 40, this.config.name, { ...TEXT, fontSize: "40px", fontStyle: "bold" }).setOrigin(0.5);
    this.taxisLeftText = this.add.text(W - 30, 40, "", { ...TEXT, fontSize: "26px" }).setOrigin(1, 0.5);
    this.add
      .text(W / 2, 80, `longer taxi = more seats   |   ${this.config.slots} slots   |   head ${this.config.queueHeadSize}`, {
        ...TEXT,
        fontSize: "22px",
        color: "#9aa4b8",
      })
      .setOrigin(0.5);
  }

  buildSlots() {
    this.level.slots.forEach((_, i) => {
      const { x, y } = this.slotCenter(i);
      this.add.image(x, y, "bay").setDisplaySize(BAY_W, BAY_H).setDepth(0);
      this.slotViews.push({ dots: [], taxiId: null });
    });
  }

  buildQueue() {
    this.add.text(W / 2, QUEUE_Y + 48, "queue", { ...TEXT, fontSize: "18px", color: "#7f8aa0" }).setOrigin(0.5);
    this.fenceBack = this.add.graphics().setDepth(4);
    this.fenceFront = this.add.graphics().setDepth(6);

    this.displayQueue = this.level.queue.peek().map((p) => p.id);
    this.level.queue.peek().forEach((p, i) => this.spawnPerson(p, i, false));
    this.drawFence();
  }

  // A picket-fence pen around the people who cannot board yet (everyone behind
  // the head). Drawn in two layers so the people stand inside it.
  drawFence() {
    const back = this.fenceBack.clear();
    const front = this.fenceFront.clear();
    const first = this.config.queueHeadSize;
    const last = Math.min(this.config.queuePreviewSize, this.config.queue.length) - 1; // the pen is fixed; it does not shrink as people leave
    if (last < first) return;
    const left = this.queuePos(first).x - QUEUE_SPACING / 2 - 4;
    const right = this.queuePos(last).x + QUEUE_SPACING / 2 + 4;
    const wood = 0xc39a63;
    const shade = 0x8a6438;

    back.fillStyle(shade, 1).fillRect(left, QUEUE_Y - 30, right - left, 2); // rear rail
    for (let x = left; x <= right; x += 24) back.fillStyle(shade, 1).fillRect(x - 1, QUEUE_Y - 36, 2, 10);

    front.fillStyle(wood, 1).fillRect(left, QUEUE_Y + 18, right - left, 2); // front rail
    front.fillStyle(wood, 1).fillRect(left, QUEUE_Y + 30, right - left, 2);
    for (let x = left; x <= right; x += 24) front.fillStyle(wood, 1).fillRect(x - 1.5, QUEUE_Y + 12, 3, 26); // slim pickets
    front.fillStyle(shade, 1).fillRoundedRect(right - 3, QUEUE_Y - 4, 6, 44, 2); // closed end; the left end is open, where people leave the pen for the head
  }

  spawnPerson(person, index, fadeIn) {
    const pos = this.queuePos(index);
    const sprite = this.add.sprite(pos.x, pos.y, personKey(person.color), "stand").setDepth(5);
    this.personSprites.set(person.id, sprite);
    this.personViews.set(person.id, new PersonView(sprite, this.time.now));
    this.styleQueueSprite(sprite, index);
    if (fadeIn) {
      sprite.setAlpha(0);
      this.tweens.add({ targets: sprite, alpha: this.queueAlpha(index), duration: 250 });
    }
    return sprite;
  }

  queueScale(index) {
    return index < this.config.queueHeadSize ? PERSON_SCALE : PERSON_SCALE * 0.9;
  }

  queueAlpha(index) {
    return 1;
  }

  styleQueueSprite(sprite, index) {
    sprite.setScale(this.queueScale(index)).setAlpha(this.queueAlpha(index));
  }

  buildTaxis() {
    for (const taxi of this.level.grid.allTaxis()) {
      const pos = this.taxiCenter(taxi);
      const sprite = this.add.sprite(pos.x, pos.y, taxiKey(taxi.color, taxi.length)).setDepth(10);
      sprite.setAngle(DIR_ANGLE[taxi.dir]).setScale(this.gridScale());
      sprite.setInteractive({ useHandCursor: true });
      sprite.on("pointerdown", () => this.onTaxiTapped(taxi));
      this.taxiSprites.set(taxi.id, sprite);
    }
  }

  buildHint() {
    this.add
      .text(W / 2, 1259, "Tap a bright taxi: it drives round the one-way street to a slot. Longer taxis\nhave more seats. People not behind the fence board taxis of their color.", {
        ...TEXT,
        fontSize: "19px",
        align: "center",
        color: "#c9d3e6",
        lineSpacing: 4,
      })
      .setOrigin(0.5);
  }

  // ---- state presentation -------------------------------------------------

  refresh() {
    for (const p of this.pulses) p.remove();
    this.pulses = [];
    const selectable = new Set(this.level.selectableTaxiIds());
    for (const taxi of this.level.grid.allTaxis()) {
      if (taxi.state !== "parked") continue;
      const sprite = this.taxiSprites.get(taxi.id);
      sprite.setScale(this.gridScale());
      if (selectable.has(taxi.id)) {
        sprite.clearTint().setAlpha(1);
        const s = this.gridScale();
        this.pulses.push(
          this.tweens.add({ targets: sprite, scaleX: s * 1.06, scaleY: s * 1.06, yoyo: true, repeat: -1, duration: 550, ease: "Sine.easeInOut" })
        );
      } else {
        sprite.setTint(0x9aa0ae).setAlpha(0.92);
      }
    }
    const left = this.level.grid.allTaxis().filter((t) => t.state !== "departed").length;
    this.taxisLeftText.setText(`Taxis left: ${left}`);
  }

  // ---- input --------------------------------------------------------------

  onTaxiTapped(taxi) {
    if (this.level.status !== "playing" || taxi.state !== "parked") return;
    const events = this.level.selectTaxi(taxi.id);
    if (events) {
      this.refresh();
      this.handleEvents(events);
    } else if (!this.level.hasFreeSlot()) {
      this.shakeSlotTaxis();
    } else {
      this.flashBlocked(taxi);
    }
  }

  flashBlocked(taxi) {
    const blocker = this.taxiSprites.get(this.level.grid.blockerOf(taxi));
    const me = this.taxiSprites.get(taxi.id);
    this.tweens.add({ targets: me, x: me.x + 6, yoyo: true, repeat: 3, duration: 45 });
    if (blocker) this.tweens.add({ targets: blocker, alpha: 0.35, yoyo: true, repeat: 2, duration: 110, onComplete: () => blocker.setAlpha(0.92) });
  }

  shakeSlotTaxis() {
    for (const view of this.slotViews) {
      const sprite = view.taxiId && this.taxiSprites.get(view.taxiId);
      if (sprite) this.tweens.add({ targets: sprite, x: sprite.x + 6, yoyo: true, repeat: 3, duration: 45 });
    }
  }

  // ---- animation ----------------------------------------------------------

  tween(config) {
    return new Promise((resolve) => this.tweens.add({ ...config, onComplete: resolve }));
  }

  // Waypoints from a taxi's parking cell around the one-way ring road (west
  // along the bottom, north up the left, east along the top, south down the
  // right), onto the main road and into its slot bay.
  routeFor(taxi, slot) {
    const { left, right, top, bottom } = this.laneC;
    const from = this.taxiCenter(taxi);
    const slotX = this.slotCenter(slot).x;
    const pts = [from];
    if (taxi.dir === "down") pts.push({ x: from.x, y: bottom }, { x: left, y: bottom }, { x: left, y: top }, { x: right, y: top });
    else if (taxi.dir === "left") pts.push({ x: left, y: from.y }, { x: left, y: top }, { x: right, y: top });
    else if (taxi.dir === "up") pts.push({ x: from.x, y: top }, { x: right, y: top });
    else pts.push({ x: right, y: from.y });
    pts.push({ x: right, y: this.mainLaneY }, { x: slotX, y: this.mainLaneY }, { x: slotX, y: BAY_Y });
    return pts;
  }

  // The rules resolve a selection instantly; the scene plays it out. Taxis start
  // driving the moment they are selected, so the player can keep selecting while
  // earlier taxis are still on the road (later taxis yield to earlier ones, see
  // game/traffic.js). Boarding and departure happen in rules order, each once its
  // taxi has really reached its bay.
  handleEvents(events) {
    for (const e of events) {
      if (e.type === "enter") this.startVehicle(e);
      else {
        if (e.type === "depart") this.vehicles.get(e.taxiId).logicalDone = true; // its bay may now be reused
        this.ceremony.push(e);
      }
    }
    this.pumpCeremony();
  }

  // Where a taxi joins the ring road, as a distance along the ring measured from
  // the bottom-right corner in the direction of traffic (west, north, east, south).
  trackEntry(taxi, from) {
    const { left, right, top, bottom } = this.laneC;
    const w = right - left;
    const h = bottom - top;
    if (taxi.dir === "down") return { point: { x: from.x, y: bottom }, s: right - from.x };
    if (taxi.dir === "left") return { point: { x: left, y: from.y }, s: w + (bottom - from.y) };
    if (taxi.dir === "up") return { point: { x: from.x, y: top }, s: w + h + (from.x - left) };
    return { point: { x: right, y: from.y }, s: 2 * w + h + (from.y - top) };
  }

  // Where a taxi must hold while its bay is still occupied: the last point on
  // its route before its body would reach the turning circle of a taxi
  // reversing out of *any* bay (a taxi waiting for a far bay must not sit in
  // front of a nearer one). Only the final approach is checked: the ring road's
  // far side passes close to the bays, but nobody should queue there.
  gateFor(vehicle, slot) {
    const zones = this.level.slots.map((_, i) => [{ x: this.slotCenter(i).x, y: this.mainLaneY, r: 125 }]);
    const approach = vehicle.path.length - (BAY_Y - this.mainLaneY) - (this.laneC.right - this.slotCenter(slot).x) - 300;
    let gate = vehicle.path.length;
    for (let s = Math.max(0, approach); s < vehicle.path.length; s += 4) {
      const body = vehicle.circlesAt(vehicle.path.poseAt(s), vehicle.scaleAt(vehicle.path, s));
      if (zones.some((zone) => circlesOverlap(body, zone, 12))) {
        gate = Math.max(0, s - 4);
        break;
      }
    }
    // A taxi that has to wait for its bay stops with its nose at the stop line.
    const edge = MAIN_Y - ROAD_W / 2;
    for (let s = 0; s < Math.min(gate, vehicle.path.length); s += 4) {
      const pose = vehicle.path.poseAt(s);
      const { length } = vehicle.dims(vehicle.scaleAt(vehicle.path, s));
      if (Math.abs(pose.heading - Math.PI / 2) < 0.3 && pose.y + length / 2 >= edge - 2) return s;
    }
    return gate;
  }

  // The rules hand out the lowest free slot the instant a taxi fills, but that
  // taxi may still be pulling out of its bay. Pick the bay to actually use: never
  // one whose taxi has not yet been sequenced out (still waiting for passengers,
  // or finishing later in the same batch of events), and the one that is or will
  // be free soonest.
  chooseBay() {
    let best = null;
    this.level.slots.forEach((_, i) => {
      const last = this.lastInSlot[i];
      if (last && !last.hasLeftBay() && !last.logicalDone) return;
      const rank = !last || last.hasLeftBay() ? 0 : last.state === "reversing" || last.state === "pivoting" ? 1 : last.state === "parked" ? 2 : 3;
      if (!best || rank < best.rank) best = { bay: i, rank };
    });
    return best.bay;
  }

  startVehicle({ taxiId }) {
    const taxi = this.level.grid.getTaxi(taxiId);
    const sprite = this.taxiSprites.get(taxiId).setDepth(30).clearTint().setAlpha(1);
    sprite.disableInteractive();
    const slot = this.chooseBay();
    const from = this.taxiCenter(taxi);
    const entry = this.trackEntry(taxi, from);
    const path = new RoadPath(this.routeFor(taxi, slot), 30);
    const bayLeg = BAY_Y - this.mainLaneY;
    const vehicle = new Vehicle({
      id: taxiId,
      priority: ++this.selectionCount,
      path,
      lengthCells: taxi.length,
      cellPx: CELL_PX,
      scaleFrom: this.gridScale(),
      scaleTo: this.gridScale(),
      entryS: entry.s,
      mergeDist: Math.hypot(entry.point.x - from.x, entry.point.y - from.y),
      bayLegS: path.length - bayLeg - 30,
      waitFor: this.lastInSlot[slot] ?? null,
    });
    vehicle.gateS = this.gateFor(vehicle, slot);
    this.lastInSlot[slot] = vehicle;
    vehicle.bay = slot;
    vehicle.arrived = new Promise((resolve) => {
      vehicle.onArrived = () => {
        this.showSeatDots(taxi, vehicle.bay);
        resolve();
      };
    });
    this.traffic.add(vehicle);
    this.vehicles.set(taxiId, vehicle);
  }

  showSeatDots(taxi, slot) {
    const target = this.slotCenter(slot);
    const view = this.slotViews[slot];
    view.dots.forEach((d) => d.destroy());
    view.taxiId = taxi.id;
    view.dots = Array.from({ length: taxi.capacity }, (_, k) => {
      const x = target.x + (k - (taxi.capacity - 1) / 2) * 20;
      return this.add.circle(x, target.y + BAY_H / 2 + 14, 7, 0x1f232d).setStrokeStyle(2, 0xffffff, 0.9).setDepth(13);
    });
  }

  async pumpCeremony() {
    if (this.pumping) return;
    this.pumping = true;
    while (this.ceremony.length) {
      const e = this.ceremony.shift();
      try {
        if (e.type === "board") await this.animBoard(e);
        else this.startDeparture(e).catch((error) => console.error("departure failed", error));
      } catch (error) {
        console.error("animation event failed", e, error);
      }
    }
    this.pumping = false;
  }

  wait(ms) {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }

  // Walks a person to (x, y) at walking speed, animating their stride.
  walkTo(id, x, y, extra = {}) {
    const sprite = this.personSprites.get(id);
    const view = this.personViews.get(id);
    let px = sprite.x;
    let py = sprite.y;
    const distance = Math.hypot(x - sprite.x, y - sprite.y);
    return this.tween({
      targets: sprite,
      x,
      y,
      duration: Math.max(60, distance / PERSON_SPEED),
      ease: "Linear",
      ...extra,
      onUpdate: () => {
        view.walkStep(sprite.x - px, sprite.y - py);
        px = sprite.x;
        py = sprite.y;
      },
    });
  }

  // Sliding-door geometry in the taxi's own coordinates (facing +x, right side +y).
  doorGeometry(taxi) {
    const W = taxi.length * CELL_PX;
    const cabinStart = 22;
    const cabinEnd = W - 8 - (46 + 10 * (taxi.length - 1));
    return { xc: (cabinStart + cabinEnd) / 2 - W / 2, length: Math.max(30, Math.min(72, cabinEnd - cabinStart - 16)) };
  }

  // A point in the world at local offset (lx, ly) from a taxi's centre.
  taxiPoint(sprite, lx, ly) {
    const s = sprite.scaleX;
    const cos = Math.cos(sprite.rotation);
    const sin = Math.sin(sprite.rotation);
    return { x: sprite.x + (lx * cos - ly * sin) * s, y: sprite.y + (lx * sin + ly * cos) * s };
  }

  drawDoor(vehicle) {
    const { door } = vehicle;
    const taxi = this.level.grid.getTaxi(vehicle.id);
    const { xc, length } = this.doorGeometry(taxi);
    const p = door.progress;
    const g = door.gfx.clear();
    if (p <= 0.01) return;
    const swing = Math.min(1, p / 0.4);
    const slide = Math.max(0, (p - 0.4) / 0.6);
    const x = xc - length / 2 - slide * length * 0.85;
    const y = 41 + swing * 13;
    const body = COLOR_HEX[taxi.color];
    g.fillStyle(0x12151c, 1).fillRoundedRect(xc - length / 2, 38, length, 15, 3); // the doorway
    g.fillStyle(body, 1).fillRoundedRect(x, y, length, 12, 4);
    g.lineStyle(2, 0x1a1d24, 1).strokeRoundedRect(x, y, length, 12, 4);
    g.fillStyle(0x243044, 1).fillRoundedRect(x + 6, y + 3, length - 12, 6, 2);
  }

  animateDoor(vehicle, to) {
    if (!vehicle.door) {
      const container = this.add.container(0, 0).setDepth(13);
      vehicle.door = { container, gfx: this.add.graphics(), progress: 0 };
      container.add(vehicle.door.gfx);
    }
    return this.tween({
      targets: vehicle.door,
      progress: to,
      duration: to > 0 ? 520 : 420,
      ease: "Sine.easeInOut",
      onUpdate: () => this.drawDoor(vehicle),
    });
  }

  async animBoard({ taxiId, personId, seats, spawned }) {
    const vehicle = this.vehicles.get(taxiId);
    await vehicle.arrived;
    const sprite = this.personSprites.get(personId);
    this.displayQueue.splice(this.displayQueue.indexOf(personId), 1);
    if (spawned) {
      this.displayQueue.push(spawned.id);
      this.spawnPerson(spawned, this.displayQueue.length - 1, true);
    }
    this.relayoutQueue();

    if (!vehicle.pendingBoards) vehicle.pendingBoards = [];
    this.busy += 1;
    const walk = this.boardTaxi(vehicle, personId, sprite, seats).catch((error) => console.error("boarding failed", error)).finally(() => (this.busy -= 1));
    vehicle.pendingBoards.push(walk);
    await this.wait(BOARD_STAGGER); // the next person may set off before this one has arrived
  }

  // The person walks to the taxi's right-hand side and steps in through the
  // sliding door, which opens for the first passenger.
  async boardTaxi(vehicle, personId, sprite, seats) {
    const taxiSprite = this.taxiSprites.get(vehicle.id);
    const taxi = this.level.grid.getTaxi(vehicle.id);
    const slot = vehicle.bay;
    sprite.setDepth(40);
    const { xc } = this.doorGeometry(taxi);
    const doorway = this.taxiPoint(taxiSprite, xc, 52 + 20);
    const inside = this.taxiPoint(taxiSprite, xc, 8);
    if (!vehicle.doorOpening) vehicle.doorOpening = this.animateDoor(vehicle, 1);

    this.tweens.add({ targets: sprite, scaleX: PERSON_SCALE, scaleY: PERSON_SCALE, duration: 300 });
    const laneY = QUEUE_Y - 74; // walk above the fence, never over it
    await this.walkTo(personId, sprite.x, laneY);
    await this.walkTo(personId, doorway.x, laneY);
    await this.walkTo(personId, doorway.x, doorway.y);
    await vehicle.doorOpening;
    await this.walkTo(personId, inside.x, inside.y, { alpha: 0, scaleX: PERSON_SCALE * 0.6, scaleY: PERSON_SCALE * 0.6 });
    sprite.destroy();
    this.personSprites.delete(personId);
    this.personViews.delete(personId);

    const dot = this.slotViews[slot].dots[seats - 1];
    if (dot) dot.setFillStyle(COLOR_HEX[taxi.color], 1);
    const s = taxiSprite.scaleX;
    await this.tween({ targets: taxiSprite, scaleX: s * 1.05, scaleY: s * 1.05, yoyo: true, duration: 70 });
  }

  relayoutQueue() {
    this.displayQueue.forEach((id, i) => {
      const sprite = this.personSprites.get(id);
      const view = this.personViews.get(id);
      const pos = this.queuePos(i);
      let px = sprite.x;
      let py = sprite.y;
      const moves = Math.hypot(pos.x - sprite.x, pos.y - sprite.y) > 1;
      this.tweens.add({
        targets: sprite,
        x: pos.x,
        y: pos.y,
        scaleX: this.queueScale(i),
        scaleY: this.queueScale(i),
        alpha: this.queueAlpha(i),
        duration: 260,
        ease: "Sine.easeOut",
        onUpdate: () => {
          if (!moves || !view) return;
          view.walkStep(sprite.x - px, sprite.y - py);
          px = sprite.x;
          py = sprite.y;
        },
        onComplete: () => view && view.stand(this.time.now),
      });
    });
  }

  // A full taxi waits for its passengers to be aboard, closes its door, then
  // reverses out of its bay, turns to face the exit and drives west.
  async startDeparture({ taxiId }) {
    this.busy += 1;
    try {
      await this.departTaxi(taxiId);
    } finally {
      this.busy -= 1;
    }
  }

  async departTaxi(taxiId) {
    const vehicle = this.vehicles.get(taxiId);
    await Promise.all(vehicle.pendingBoards ?? []);
    if (vehicle.door) await this.animateDoor(vehicle, 0);
    if (vehicle.door) {
      vehicle.door.container.destroy();
      vehicle.door = null;
      vehicle.doorOpening = null;
    }
    const slot = vehicle.bay;
    const view = this.slotViews[slot];
    view.dots.forEach((d) => d.destroy());
    view.dots = [];
    view.taxiId = null;
    const x = this.slotCenter(slot).x;
    const roadY = this.mainLaneY;
    vehicle.beginDeparture({
      reversePath: new RoadPath([{ x, y: BAY_Y }, { x, y: roadY }]),
      leavePath: new RoadPath([{ x, y: roadY }, { x: -320, y: roadY }]),
      pivotTarget: Math.PI,
    });
  }

  // A taxi picks its bay when tapped, but another bay may free up while it is
  // queued on the final approach. Let it switch to a bay that is free right now,
  // so it (and everyone queued behind it) isn't held up for nothing.
  tryReassign(v) {
    if (v.state !== "driving" || !v.waitFor || v.waitFor.hasLeftBay() || v.entryS === null) return;
    const { left, right, top, bottom } = this.laneC;
    const onRightLane = v.x >= right - 6 && v.y > top && v.y < this.mainLaneY - 40 && Math.abs(v.heading - Math.PI / 2) < 0.3;
    const onMainRoad = Math.abs(v.y - this.mainLaneY) < 30 && Math.abs(v.heading - Math.PI) < 0.3;
    if (!onRightLane && !onMainRoad) return;

    let target = null;
    this.level.slots.forEach((_, i) => {
      const last = this.lastInSlot[i];
      if (i === v.bay || (last && !last.hasLeftBay())) return;
      const x = this.slotCenter(i).x;
      if (onMainRoad && x > v.x - 60) return; // already driven past it
      if (target === null || x > this.slotCenter(target).x) target = i;
    });
    if (target === null) return;

    const oldBay = v.bay;
    const previous = v.waitFor;
    for (const w of this.vehicles.values()) if (w.waitFor === v && w.bay === oldBay) w.waitFor = previous;
    if (this.lastInSlot[oldBay] === v) this.lastInSlot[oldBay] = previous;

    const slotX = this.slotCenter(target).x;
    const pts = [{ x: v.x, y: v.y }];
    if (onRightLane) pts.push({ x: right, y: this.mainLaneY });
    pts.push({ x: slotX, y: this.mainLaneY }, { x: slotX, y: BAY_Y });
    v.path = new RoadPath(pts, 30);
    v.s = 0;
    v.mergeDist = 0;
    const w = right - left;
    const h = bottom - top;
    v.entryS = onRightLane ? 2 * w + h + (v.y - top) : 2 * w + h + (this.mainLaneY - top) + (right - v.x);
    v.bayLegS = v.path.length - (BAY_Y - this.mainLaneY) - 30;
    v.bay = target;
    v.waitFor = this.lastInSlot[target] ?? null;
    v.gateS = this.gateFor(v, target);
    v.pushUntilS = -1;
    this.lastInSlot[target] = v;
  }

  update(_, delta) {
    let remaining = Math.min(delta, 50) * this.simSpeed;
    while (remaining > 0) {
      const step = Math.min(16, remaining);
      this.traffic.step(step);
      remaining -= step;
    }
    for (const view of this.personViews.values()) view.update(this.time.now);
    for (const vehicle of [...this.vehicles.values()]) {
      const sprite = this.taxiSprites.get(vehicle.id);
      if (vehicle.door) vehicle.door.container.setPosition(sprite.x, sprite.y).setRotation(sprite.rotation).setScale(sprite.scaleX);
      if (vehicle.state === "gone") {
        sprite.destroy();
        this.taxiSprites.delete(vehicle.id);
        this.vehicles.delete(vehicle.id);
        this.traffic.remove(vehicle);
      } else {
        sprite.setPosition(vehicle.x, vehicle.y).setRotation(vehicle.heading).setScale(vehicle.scale);
        sprite.setDepth(vehicle.state === "parked" ? 12 : 30);
      }
    }
    this.reassignTimer = (this.reassignTimer ?? 0) + Math.min(delta, 50) * this.simSpeed;
    if (this.reassignTimer > 200) {
      this.reassignTimer = 0;
      for (const vehicle of this.traffic.vehicles) this.tryReassign(vehicle);
    }
    this.maybeFinish();
  }

  // ---- end of game --------------------------------------------------------

  // Once the rules say the game is over and every taxi has stopped moving.
  maybeFinish() {
    if (this.ended || this.level.status === "playing" || this.pumping || this.ceremony.length || this.busy > 0) return;
    if (this.traffic.vehicles.some((v) => v.moving)) return;
    this.ended = true;
    if (this.level.status === "won") {
      markCleared(this.levelIndex);
      this.time.delayedCall(500, () => this.scene.start("Result", { status: "won", levelIndex: this.levelIndex }));
    } else {
      this.time.delayedCall(700, () => this.showLostOverlay());
    }
  }

  showLostOverlay() {
    this.add.rectangle(W / 2, 640, W, 1280, 0x000000, 0.6).setDepth(100).setInteractive();
    this.add.text(W / 2, 470, "Lot jammed!", { ...TEXT, fontSize: "56px", fontStyle: "bold", color: "#e64c3c" }).setOrigin(0.5).setDepth(101);
    this.add
      .text(W / 2, 545, "No slot free and nobody at the head can board.", { ...TEXT, fontSize: "24px", align: "center", wordWrap: { width: 560 } })
      .setOrigin(0.5)
      .setDepth(101);
    this.button(W / 2, 660, "RETRY", 0x3b82f6, () => this.scene.start("Game", { levelIndex: this.levelIndex }));
    this.button(W / 2, 770, "LEVEL SELECT", 0x555b6e, () => this.scene.start("LevelSelect"));
  }

  button(x, y, label, color, onClick) {
    const rect = this.add.rectangle(x, y, 300, 80, color).setDepth(101).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, { ...TEXT, fontSize: "30px", fontStyle: "bold" }).setOrigin(0.5).setDepth(102);
    rect.on("pointerdown", onClick);
  }
}
