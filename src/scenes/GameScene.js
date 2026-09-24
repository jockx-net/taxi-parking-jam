import Phaser from "phaser";
import { loadLevel } from "../game/LevelLoader.js";
import { DIR_VECTORS } from "../game/Taxi.js";
import { LEVELS } from "../data/levels/index.js";
import { COLOR_HEX } from "../game/colors.js";
import { CELL_PX, addBackground, personKey, taxiKey } from "./art.js";
import { markCleared } from "./progress.js";

const W = 720;
const GRID_BOX = { top: 130, size: 600 };
const SLOT_Y = 850;
const SLOT_W = 200;
const QUEUE_Y = 1050;
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
    this.busy = false;
    this.taxiSprites = new Map();
    this.personSprites = new Map();
    this.pulses = [];
    this.slotViews = [];

    const { grid } = this.config;
    this.cell = Math.min(GRID_BOX.size / grid.width, GRID_BOX.size / grid.height);
    this.origin = {
      x: W / 2 - (grid.width * this.cell) / 2,
      y: GRID_BOX.top + (GRID_BOX.size - grid.height * this.cell) / 2,
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
    return { x: W / 2 + (i - (n - 1) / 2) * (SLOT_W + 20), y: SLOT_Y };
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
    return Math.min(0.9, (SLOT_W - 20) / (taxi.length * CELL_PX));
  }

  // ---- static scenery -----------------------------------------------------

  drawBackdrop() {
    addBackground(this);
    const { grid } = this.config;
    const w = grid.width * this.cell;
    const h = grid.height * this.cell;
    const frame = this.add.graphics().setDepth(-5);
    frame.fillStyle(0x20242f, 1).fillRoundedRect(this.origin.x - 14, this.origin.y - 14, w + 28, h + 28, 18);
    frame.lineStyle(4, 0x4b5366, 1).strokeRoundedRect(this.origin.x - 14, this.origin.y - 14, w + 28, h + 28, 18);
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
      .text(W / 2, 92, `${this.config.taxiCapacity} seats per taxi   |   ${this.config.slots} slots   |   head ${this.config.queueHeadSize}`, {
        ...TEXT,
        fontSize: "22px",
        color: "#9aa4b8",
      })
      .setOrigin(0.5);
  }

  buildSlots() {
    this.level.slots.forEach((_, i) => {
      const { x, y } = this.slotCenter(i);
      this.add.image(x, y, "bay").setDisplaySize(SLOT_W + 10, 128).setDepth(0);
      this.add.text(x, y - 76, `SLOT ${i + 1}`, { ...TEXT, fontSize: "18px", color: "#f5c518" }).setOrigin(0.5);
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
      .text(W / 2, 1205, "Tap a bright taxi to send it to a slot.\nPeople in the HEAD board taxis of their color.\nFill every taxi to clear the lot!", {
        ...TEXT,
        fontSize: "24px",
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
    if (this.busy || this.level.status !== "playing" || taxi.state !== "parked") return;
    const events = this.level.selectTaxi(taxi.id);
    if (events) {
      this.play(events);
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

  async play(events) {
    this.busy = true;
    for (const e of events) {
      if (e.type === "enter") await this.animEnter(e);
      else if (e.type === "board") await this.animBoard(e);
      else await this.animDepart(e);
    }
    this.refresh();
    this.busy = false;
    this.checkEnd();
  }

  async animEnter({ taxiId, slot }) {
    for (const p of this.pulses) p.remove();
    this.pulses = [];
    const taxi = this.level.grid.getTaxi(taxiId);
    const sprite = this.taxiSprites.get(taxiId).setDepth(30).clearTint().setAlpha(1);
    const { dx, dy } = DIR_VECTORS[taxi.dir];
    const { grid } = this.config;
    const ahead = dx > 0 ? grid.width - 1 - taxi.x : dx < 0 ? taxi.x : dy > 0 ? grid.height - 1 - taxi.y : taxi.y;
    const cells = ahead + taxi.length;
    await this.tween({
      targets: sprite,
      x: sprite.x + dx * cells * this.cell,
      y: sprite.y + dy * cells * this.cell,
      scaleX: this.gridScale(),
      scaleY: this.gridScale(),
      duration: 100 + 55 * cells,
      ease: "Quad.easeIn",
    });
    const target = this.slotCenter(slot);
    const turn = Phaser.Math.Angle.ShortestBetween(sprite.angle, 0);
    await this.tween({
      targets: sprite,
      x: target.x,
      y: target.y,
      angle: sprite.angle + turn,
      scaleX: this.slotScale(taxi),
      scaleY: this.slotScale(taxi),
      duration: 340,
      ease: "Cubic.easeOut",
    });
    sprite.setAngle(0).setDepth(12);
    sprite.disableInteractive();
    const view = this.slotViews[slot];
    view.taxiId = taxiId;
    view.dots = Array.from({ length: taxi.capacity }, (_, k) => {
      const spacing = 22;
      const x = target.x + (k - (taxi.capacity - 1) / 2) * spacing;
      return this.add.circle(x, target.y + 46, 7, 0x1f232d).setStrokeStyle(2, 0xffffff, 0.9).setDepth(13);
    });
  }

  async animBoard({ taxiId, slot, personId, seats, spawned }) {
    const sprite = this.personSprites.get(personId);
    this.personSprites.delete(personId);
    this.displayQueue.splice(this.displayQueue.indexOf(personId), 1);
    if (spawned) {
      this.displayQueue.push(spawned.id);
      this.spawnPerson(spawned, this.displayQueue.length - 1, true);
    }
    this.relayoutQueue();

    const view = this.slotViews[slot];
    const dot = view.dots[seats - 1];
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

  async animDepart({ taxiId, slot }) {
    const view = this.slotViews[slot];
    const sprite = this.taxiSprites.get(taxiId);
    await this.tween({ targets: sprite, y: sprite.y - 150, alpha: 0, duration: 300, ease: "Quad.easeIn" });
    sprite.destroy();
    this.taxiSprites.delete(taxiId);
    view.dots.forEach((d) => d.destroy());
    view.dots = [];
    view.taxiId = null;
  }

  // ---- end of game --------------------------------------------------------

  checkEnd() {
    if (this.level.status === "won") {
      markCleared(this.levelIndex);
      this.time.delayedCall(500, () => this.scene.start("Result", { status: "won", levelIndex: this.levelIndex }));
    } else if (this.level.status === "lost") {
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
