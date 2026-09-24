import Phaser from "phaser";
import { loadLevel } from "../game/LevelLoader.js";
import { LEVELS } from "../data/levels/index.js";
import { COLOR_HEX } from "../game/colors.js";

const GRID_AREA = { x: 60, y: 210, width: 600, height: 480 };
const BAY_ROW_Y = 810;
const QUEUE_Y = 990;

function colorHex(name) {
  return COLOR_HEX[name] ?? 0xaaaaaa;
}

export class GameScene extends Phaser.Scene {
  constructor() {
    super("Game");
  }

  init(data) {
    this.levelIndex = data.levelIndex ?? 0;
  }

  create() {
    const config = LEVELS[this.levelIndex];
    this.config = config;
    this.level = loadLevel(config);

    this.cellSize = Math.min(
      GRID_AREA.width / config.grid.width,
      GRID_AREA.height / config.grid.height
    );

    this.hudText = this.add.text(this.scale.width / 2, 60, "", {
      fontFamily: "Arial",
      fontSize: "36px",
      color: "#ffffff",
      fontStyle: "bold",
    }).setOrigin(0.5);

    this.gridLayer = this.add.container();
    this.bayLayer = this.add.container();
    this.queueLayer = this.add.container();

    this.redraw();
  }

  gridToPixel(x, y) {
    const gridPixelWidth = this.cellSize * this.config.grid.width;
    const gridPixelHeight = this.cellSize * this.config.grid.height;
    const originX = this.scale.width / 2 - gridPixelWidth / 2;
    const originY = GRID_AREA.y;
    return {
      x: originX + x * this.cellSize + this.cellSize / 2,
      y: originY + y * this.cellSize + this.cellSize / 2,
    };
  }

  redraw() {
    this.hudText.setText(
      `${this.config.name}   Taxis left: ${
        this.level.grid.allTaxis().filter((t) => t.state !== "departed").length
      }`
    );
    this.drawGrid();
    this.drawBays();
    this.drawQueue();
  }

  drawGrid() {
    this.gridLayer.removeAll(true);
    const available = new Set(this.level.grid.getAvailableTaxiIds());
    const hasFreeBay = this.level.hasFreeBay();

    for (const taxi of this.level.grid.allTaxis()) {
      if (taxi.state !== "parked") continue;
      const { x, y } = this.gridToPixel(taxi.x, taxi.y);
      const pad = 6;
      const size = this.cellSize - pad * 2;
      const canSelect = available.has(taxi.id) && hasFreeBay;

      const rect = this.add
        .rectangle(x, y, size, size, colorHex(taxi.color))
        .setStrokeStyle(
          canSelect ? 5 : 2,
          canSelect ? 0xffffff : 0x000000,
          canSelect ? 1 : 0.3
        );

      if (canSelect) {
        rect.setInteractive({ useHandCursor: true });
        rect.on("pointerdown", () => this.onSelectTaxi(taxi.id));
      } else {
        rect.setAlpha(available.has(taxi.id) ? 0.85 : 0.55);
      }

      const label = this.add
        .text(x, y, `${taxi.seatsFilled}/${taxi.capacity}`, {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      this.gridLayer.add([rect, label]);
    }
  }

  drawBays() {
    this.bayLayer.removeAll(true);
    const bayCount = this.level.bays.length;
    const spacing = 200;
    const startX = this.scale.width / 2 - ((bayCount - 1) * spacing) / 2;

    this.level.bays.forEach((taxi, index) => {
      const x = startX + index * spacing;
      const y = BAY_ROW_Y;

      const frame = this.add
        .rectangle(x, y, 170, 130, 0x2a2f3d)
        .setStrokeStyle(3, 0xffffff, 0.4);
      this.bayLayer.add(frame);

      if (taxi) {
        const body = this.add
          .rectangle(x, y, 140, 100, colorHex(taxi.color))
          .setInteractive({ useHandCursor: true });
        body.on("pointerdown", () => this.onRecallTaxi(taxi.id));
        const label = this.add
          .text(x, y, `${taxi.seatsFilled}/${taxi.capacity}`, {
            fontFamily: "Arial",
            fontSize: "26px",
            color: "#ffffff",
            fontStyle: "bold",
          })
          .setOrigin(0.5);
        this.bayLayer.add([body, label]);
      } else {
        const label = this.add
          .text(x, y, "Empty bay", {
            fontFamily: "Arial",
            fontSize: "20px",
            color: "#888888",
          })
          .setOrigin(0.5);
        this.bayLayer.add(label);
      }
    });
  }

  drawQueue() {
    this.queueLayer.removeAll(true);
    const preview = this.level.queue.peek();
    const spacing = Math.min(70, (this.scale.width - 80) / preview.length);
    const startX = this.scale.width / 2 - ((preview.length - 1) * spacing) / 2;
    const radius = Math.min(32, spacing / 2 - 4);

    preview.forEach((person, index) => {
      const x = startX + index * spacing;
      const y = QUEUE_Y;
      const isFront = index === 0;
      const circle = this.add
        .circle(x, y, radius, colorHex(person.color))
        .setStrokeStyle(isFront ? 4 : 2, 0xffffff, isFront ? 1 : 0.5);
      this.queueLayer.add(circle);
    });

    this.queueLayer.add(
      this.add
        .text(this.scale.width / 2, QUEUE_Y + radius + 24, "queue →", {
          fontFamily: "Arial",
          fontSize: "18px",
          color: "#888888",
        })
        .setOrigin(0.5)
    );
  }

  onSelectTaxi(taxiId) {
    if (!this.level.selectTaxi(taxiId)) return;
    this.redraw();
    this.checkEndState();
  }

  onRecallTaxi(taxiId) {
    if (!this.level.recallTaxi(taxiId)) return;
    this.redraw();
  }

  checkEndState() {
    if (this.level.status === "won") {
      this.time.delayedCall(400, () => {
        this.scene.start("Result", {
          status: this.level.status,
          levelIndex: this.levelIndex,
        });
      });
    }
  }
}
