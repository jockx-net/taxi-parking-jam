import Phaser from "phaser";
import { loadLevel } from "../game/LevelLoader.js";
import { DIR_VECTORS } from "../game/Taxi.js";
import { RoadPath, Traffic, Vehicle } from "../game/traffic.js";
import { LEVELS } from "../data/levels/index.js";
import { COLOR_HEX } from "../game/colors.js";
import { CELL_PX, addBackground, personKey, taxiKey } from "./art.js";
import { markCleared } from "./progress.js";

const W = 720;
const GRID_SIZE = 520;
const GRID_TOP = 180;
const ROAD_W = 56;
const LANE_GAP = 44; // lot edge to the centre line of the ring road
const MAIN_Y = 815; // centre line of the main road (flows west to the exit)
const BAY_W = 140;
const BAY_H = 200;
const BAY_Y = 952;
const SLOT_SPACING = 210;
const QUEUE_Y = 1130;
const QUEUE_SPACING = 56;
const PERSON_SCALE = 0.5;
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
    this.ended = false;
    this.selectionCount = 0;
    this.lastInSlot = []; // most recent vehicle sent to each slot, for bay ordering
    this.simSpeed = 1; // test hook: >1 fast-forwards the traffic simulation
    this.taxiSprites = new Map();
    this.personSprites = new Map();
    this.pulses = [];
    this.slotViews = [];

    const { grid } = this.config;
    this.cell = Math.min(GRID_SIZE / grid.width, GRID_SIZE / grid.height);
    this.origin = {
      x: W / 2 - (grid.width * this.cell) / 2,
      y: GRID_TOP + (GRID_SIZE - grid.height * this.cell) / 2,
    };
    const lotW = grid.width * this.cell;
    const lotH = grid.height * this.cell;
    this.lane = {
      left: this.origin.x - LANE_GAP,
      right: this.origin.x + lotW + LANE_GAP,
      top: this.origin.y - LANE_GAP,
      bottom: this.origin.y + lotH + LANE_GAP,
    };

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
    return { x: W / 2 + (i - (n - 1) / 2) * SLOT_SPACING, y: BAY_Y };
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

  slotScale(taxi) {
    return Math.min(0.6, (BAY_H - 30) / (taxi.length * CELL_PX));
  }

  // ---- static scenery -----------------------------------------------------

  drawBackdrop() {
    addBackground(this);
    const { grid } = this.config;
    const { left, right, top, bottom } = this.lane;
    const w = grid.width * this.cell;
    const h = grid.height * this.cell;

    const roads = this.add.graphics().setDepth(-6);
    const curb = 0x5a6178;
    const asphalt = 0x2b2f3b;
    const ringW = right - left;
    const ringH = bottom - top;
    const extension = (color, pad) => roads.fillStyle(color, 1).fillRect(right - ROAD_W / 2 - pad, bottom - 40, ROAD_W + 2 * pad, MAIN_Y - bottom + 40);
    const mainRoad = (color, pad) => roads.fillStyle(color, 1).fillRect(0, MAIN_Y - ROAD_W / 2 - pad, W, ROAD_W + 2 * pad);
    roads.lineStyle(ROAD_W + 8, curb, 1).strokeRoundedRect(left, top, ringW, ringH, 40);
    extension(curb, 4);
    mainRoad(curb, 4);
    roads.lineStyle(ROAD_W, asphalt, 1).strokeRoundedRect(left, top, ringW, ringH, 40);
    extension(asphalt, 0);
    mainRoad(asphalt, 0);

    const marks = this.add.graphics().setDepth(-5);
    marks.lineStyle(3, 0xffffff, 0.35);
    const dashed = (x1, y1, x2, y2) => {
      const len = Math.hypot(x2 - x1, y2 - y1);
      const ux = (x2 - x1) / len;
      const uy = (y2 - y1) / len;
      for (let d = 0; d < len; d += 34) {
        const e = Math.min(d + 18, len);
        marks.lineBetween(x1 + ux * d, y1 + uy * d, x1 + ux * e, y1 + uy * e);
      }
    };
    dashed(right - 40, bottom, left + 40, bottom);
    dashed(left, bottom - 40, left, top + 40);
    dashed(left + 40, top, right - 40, top);
    dashed(right, top + 40, right, MAIN_Y - 30);
    dashed(W, MAIN_Y, 90, MAIN_Y);

    marks.fillStyle(0xf5c518, 0.85);
    const arrow = (x, y, dir) => {
      const v = { west: [-1, 0], east: [1, 0], north: [0, -1], south: [0, 1] }[dir];
      const [dx, dy] = v;
      marks.fillTriangle(x + dx * 11, y + dy * 11, x - dx * 7 - dy * 9, y - dy * 7 + dx * 9, x - dx * 7 + dy * 9, y - dy * 7 - dx * 9);
    };
    for (let x = right - 90; x > left + 60; x -= 130) arrow(x, bottom, "west");
    for (let y = bottom - 90; y > top + 60; y -= 130) arrow(left, y, "north");
    for (let x = left + 90; x < right - 60; x += 130) arrow(x, top, "east");
    for (let y = top + 90; y < MAIN_Y - 40; y += 130) arrow(right, y, "south");
    for (let x = W - 40; x > 90; x -= 130) arrow(x, MAIN_Y, "west");

    this.add.text(46, MAIN_Y, "EXIT", { ...TEXT, fontSize: "20px", fontStyle: "bold", color: "#f5c518" }).setOrigin(0.5).setDepth(-4);
    marks.fillTriangle(12, MAIN_Y, 26, MAIN_Y - 9, 26, MAIN_Y + 9);

    const lot = this.add.graphics().setDepth(-5);
    lot.fillStyle(0x20242f, 1).fillRoundedRect(this.origin.x - 10, this.origin.y - 10, w + 20, h + 20, 14);
    lot.lineStyle(3, 0x4b5366, 1).strokeRoundedRect(this.origin.x - 10, this.origin.y - 10, w + 20, h + 20, 14);
    const floor = this.add.tileSprite(this.origin.x, this.origin.y, w, h, "tile").setOrigin(0).setDepth(-4);
    floor.setTileScale(this.gridScale(), this.gridScale());
    const lines = this.add.graphics().setDepth(-3);
    lines.lineStyle(1, 0xffffff, 0.08);
    for (let x = 0; x <= grid.width; x++) lines.lineBetween(this.origin.x + x * this.cell, this.origin.y, this.origin.x + x * this.cell, this.origin.y + h);
    for (let y = 0; y <= grid.height; y++) lines.lineBetween(this.origin.x, this.origin.y + y * this.cell, this.origin.x + w, this.origin.y + y * this.cell);
  }

  buildHud() {
    const back = this.add.text(30, 40, "< Levels", { ...TEXT, fontSize: "26px" }).setInteractive({ useHandCursor: true });
    back.on("pointerdown", () => this.scene.start("LevelSelect"));
    this.add.text(W / 2, 40, this.config.name, { ...TEXT, fontSize: "40px", fontStyle: "bold" }).setOrigin(0.5);
    this.taxisLeftText = this.add.text(W - 30, 40, "", { ...TEXT, fontSize: "26px" }).setOrigin(1, 0.5);
    this.add
      .text(W / 2, 92, `longer taxi = more seats   |   ${this.config.slots} slots   |   head ${this.config.queueHeadSize}`, {
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
    const head = this.config.queueHeadSize;
    const a = this.queuePos(0);
    const b = this.queuePos(head - 1);
    this.headPanel = this.add
      .rectangle((a.x + b.x) / 2, QUEUE_Y, b.x - a.x + QUEUE_SPACING + 8, 76, 0x3d8b5a, 0.35)
      .setStrokeStyle(3, 0x5ad187);
    this.add.text((a.x + b.x) / 2, QUEUE_Y - 58, "HEAD  -  can board", { ...TEXT, fontSize: "20px", color: "#5ad187" }).setOrigin(0.5);
    this.add.text(W / 2, QUEUE_Y + 62, "queue", { ...TEXT, fontSize: "18px", color: "#7f8aa0" }).setOrigin(0.5);

    this.displayQueue = this.level.queue.peek().map((p) => p.id);
    this.level.queue.peek().forEach((p, i) => this.spawnPerson(p, i, false));
  }

  spawnPerson(person, index, fadeIn) {
    const pos = this.queuePos(index);
    const sprite = this.add.sprite(pos.x, pos.y, personKey(person.color)).setDepth(5);
    this.personSprites.set(person.id, sprite);
    this.styleQueueSprite(sprite, index);
    if (fadeIn) {
      sprite.setAlpha(0);
      this.tweens.add({ targets: sprite, alpha: this.queueAlpha(index), duration: 250 });
    }
    return sprite;
  }

  queueScale(index) {
    return index < this.config.queueHeadSize ? PERSON_SCALE : PERSON_SCALE * 0.8;
  }

  queueAlpha(index) {
    return index < this.config.queueHeadSize ? 1 : 0.75;
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
      .text(W / 2, 1236, "Tap a bright taxi: it drives round the one-way street to a slot.\nLonger taxis have more seats. People in the HEAD board\ntaxis of their color; a full taxi leaves by the exit.", {
        ...TEXT,
        fontSize: "21px",
        align: "center",
        color: "#c9d3e6",
        lineSpacing: 8,
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
    const { left, right, top, bottom } = this.lane;
    const from = this.taxiCenter(taxi);
    const slotX = this.slotCenter(slot).x;
    const pts = [from];
    if (taxi.dir === "down") pts.push({ x: from.x, y: bottom }, { x: left, y: bottom }, { x: left, y: top }, { x: right, y: top });
    else if (taxi.dir === "left") pts.push({ x: left, y: from.y }, { x: left, y: top }, { x: right, y: top });
    else if (taxi.dir === "up") pts.push({ x: from.x, y: top }, { x: right, y: top });
    else pts.push({ x: right, y: from.y });
    pts.push({ x: right, y: MAIN_Y }, { x: slotX, y: MAIN_Y }, { x: slotX, y: BAY_Y });
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
      else this.ceremony.push(e);
    }
    this.pumpCeremony();
  }

  // Where a taxi joins the ring road, as a distance along the ring measured from
  // the bottom-right corner in the direction of traffic (west, north, east, south).
  trackEntry(taxi, from) {
    const { left, right, top, bottom } = this.lane;
    const w = right - left;
    const h = bottom - top;
    if (taxi.dir === "down") return { point: { x: from.x, y: bottom }, s: right - from.x };
    if (taxi.dir === "left") return { point: { x: left, y: from.y }, s: w + (bottom - from.y) };
    if (taxi.dir === "up") return { point: { x: from.x, y: top }, s: w + h + (from.x - left) };
    return { point: { x: right, y: from.y }, s: 2 * w + h + (from.y - top) };
  }

  startVehicle({ taxiId, slot }) {
    const taxi = this.level.grid.getTaxi(taxiId);
    const sprite = this.taxiSprites.get(taxiId).setDepth(30).clearTint().setAlpha(1);
    sprite.disableInteractive();
    const from = this.taxiCenter(taxi);
    const entry = this.trackEntry(taxi, from);
    const path = new RoadPath(this.routeFor(taxi, slot), 30);
    const bayLeg = BAY_Y - MAIN_Y;
    const vehicle = new Vehicle({
      id: taxiId,
      priority: ++this.selectionCount,
      path,
      lengthCells: taxi.length,
      cellPx: CELL_PX,
      scaleFrom: this.gridScale(),
      scaleTo: this.slotScale(taxi),
      entryS: entry.s,
      mergeDist: Math.hypot(entry.point.x - from.x, entry.point.y - from.y),
      bayLegS: path.length - bayLeg - 30,
      gateS: path.length - bayLeg - 200, // queue up well clear of a departing taxi's turning circle
      waitFor: this.lastInSlot[slot] ?? null,
    });
    this.lastInSlot[slot] = vehicle;
    vehicle.arrived = new Promise((resolve) => {
      vehicle.onArrived = () => {
        this.showSeatDots(taxi, slot);
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
      return this.add.circle(x, target.y + BAY_H / 2 - 16, 7, 0x1f232d).setStrokeStyle(2, 0xffffff, 0.9).setDepth(13);
    });
  }

  async pumpCeremony() {
    if (this.pumping) return;
    this.pumping = true;
    while (this.ceremony.length) {
      const e = this.ceremony.shift();
      try {
        if (e.type === "board") await this.animBoard(e);
        else this.startDeparture(e);
      } catch (error) {
        console.error("animation event failed", e, error);
      }
    }
    this.pumping = false;
  }

  async animBoard({ taxiId, slot, personId, seats, spawned }) {
    await this.vehicles.get(taxiId).arrived;
    const sprite = this.personSprites.get(personId);
    this.personSprites.delete(personId);
    this.displayQueue.splice(this.displayQueue.indexOf(personId), 1);
    if (spawned) {
      this.displayQueue.push(spawned.id);
      this.spawnPerson(spawned, this.displayQueue.length - 1, true);
    }
    this.relayoutQueue();

    const dot = this.slotViews[slot].dots[seats - 1];
    const taxiSprite = this.taxiSprites.get(taxiId);
    sprite.setDepth(40);
    await this.tween({
      targets: sprite,
      x: taxiSprite.x,
      y: taxiSprite.y,
      scaleX: PERSON_SCALE * 0.5,
      scaleY: PERSON_SCALE * 0.5,
      duration: 300,
      ease: "Cubic.easeIn",
    });
    sprite.destroy();
    dot.setFillStyle(COLOR_HEX[this.level.grid.getTaxi(taxiId).color], 1);
    const s = taxiSprite.scaleX;
    await this.tween({ targets: taxiSprite, scaleX: s * 1.08, scaleY: s * 1.08, yoyo: true, duration: 70 });
  }

  relayoutQueue() {
    this.displayQueue.forEach((id, i) => {
      const sprite = this.personSprites.get(id);
      const pos = this.queuePos(i);
      this.tweens.add({ targets: sprite, x: pos.x, y: pos.y, scaleX: this.queueScale(i), scaleY: this.queueScale(i), alpha: this.queueAlpha(i), duration: 260, ease: "Sine.easeOut" });
    });
  }

  // A full taxi reverses out of its bay, turns to face the exit and drives west.
  startDeparture({ taxiId, slot }) {
    const view = this.slotViews[slot];
    view.dots.forEach((d) => d.destroy());
    view.dots = [];
    view.taxiId = null;
    const x = this.slotCenter(slot).x;
    const roadY = MAIN_Y + 6;
    this.vehicles.get(taxiId).beginDeparture({
      reversePath: new RoadPath([{ x, y: BAY_Y }, { x, y: roadY }]),
      leavePath: new RoadPath([{ x, y: roadY }, { x: -320, y: roadY }]),
      pivotTarget: Math.PI,
    });
  }

  update(_, delta) {
    let remaining = Math.min(delta, 50) * this.simSpeed;
    while (remaining > 0) {
      const step = Math.min(16, remaining);
      this.traffic.step(step);
      remaining -= step;
    }
    for (const vehicle of [...this.vehicles.values()]) {
      const sprite = this.taxiSprites.get(vehicle.id);
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
    this.maybeFinish();
  }

  // ---- end of game --------------------------------------------------------

  // Once the rules say the game is over and every taxi has stopped moving.
  maybeFinish() {
    if (this.ended || this.level.status === "playing" || this.pumping || this.ceremony.length) return;
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
