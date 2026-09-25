import Phaser from "phaser";
import { addBackground } from "./art.js";
import { LEVELS } from "../data/levels/index.js";
import { loadCleared } from "./progress.js";
import { addIconButton, addMuteButton, textStyle } from "./ui.js";
import { audio } from "../audio/audio.js";

const PAGE_SIZE = 20; // 4 columns x 5 rows
const PAGES = Math.ceil(LEVELS.length / PAGE_SIZE);

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super("LevelSelect");
  }

  // Opens on an explicit page (page turns), else on the page of the level just
  // played, else on the page last browsed.
  init(data) {
    if (data && data.page !== undefined) this.registry.set("levelPage", data.page);
    else if (data && data.levelIndex !== undefined) this.registry.set("levelPage", Math.floor(data.levelIndex / PAGE_SIZE));
    this.page = this.registry.get("levelPage") ?? 0;
  }

  create() {
    const { width } = this.scale;
    addMuteButton(this, width - 58, 46);
    const cleared = loadCleared();
    addBackground(this);

    this.add
      .text(width / 2, 100, "Select Level", textStyle(56))
      .setOrigin(0.5);

    const cols = 4;
    const cell = 150;
    const startX = width / 2 - ((cols - 1) * cell) / 2;
    const first = this.page * PAGE_SIZE;

    for (let index = first; index < Math.min(first + PAGE_SIZE, LEVELS.length); index++) {
      const slot = index - first;
      const x = startX + (slot % cols) * cell;
      const y = 250 + Math.floor(slot / cols) * cell;
      const done = cleared.has(index);
      const button = this.add.rectangle(x, y, 120, 120, done ? 0x2e8b57 : 0x3b82f6).setStrokeStyle(4, done ? 0x1d5c39 : 0x1f4fa8).setInteractive({ useHandCursor: true });
      this.add.text(x, y, String(index + 1), textStyle(50)).setOrigin(0.5);
      if (done) this.add.text(x + 44, y - 46, "\u2713", textStyle(30, "#ffffff", "#1d5c39")).setOrigin(0.5);
      button.on("pointerdown", () => {
        audio.play("click");
        this.scene.start("Game", { levelIndex: index });
      });
    }

    if (this.page > 0) addIconButton(this, width / 2 - 200, 1030, "back", () => this.turn(-1));
    if (this.page < PAGES - 1) addIconButton(this, width / 2 + 200, 1030, "next", () => this.turn(1));
    const dots = this.add.graphics();
    for (let p = 0; p < PAGES; p++) {
      dots.fillStyle(p === this.page ? 0xffffff : 0x55607a, 1).fillCircle(width / 2 + (p - (PAGES - 1) / 2) * 30, 1030, p === this.page ? 9 : 7);
    }
  }

  turn(step) {
    this.scene.restart({ page: this.page + step }); // explicit, so stale data from the previous visit can't override it
  }
}
