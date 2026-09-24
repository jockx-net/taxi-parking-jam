import Phaser from "phaser";
import { LEVELS } from "../data/levels/index.js";
import { loadCleared } from "./progress.js";

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super("LevelSelect");
  }

  create() {
    const { width } = this.scale;
    const cleared = loadCleared();

    this.add
      .text(width / 2, 100, "Select Level", { fontFamily: "Arial", fontSize: "48px", color: "#ffffff", fontStyle: "bold" })
      .setOrigin(0.5);

    const cols = 4;
    const cell = 150;
    const startX = width / 2 - ((cols - 1) * cell) / 2;

    LEVELS.forEach((level, index) => {
      const x = startX + (index % cols) * cell;
      const y = 250 + Math.floor(index / cols) * cell;
      const done = cleared.has(index);
      const button = this.add.rectangle(x, y, 120, 120, done ? 0x2e8b57 : 0x3b82f6).setInteractive({ useHandCursor: true });
      this.add.text(x, y - 8, String(index + 1), { fontFamily: "Arial", fontSize: "44px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
      this.add
        .text(x, y + 36, `${level.slots} slots  h${level.queueHeadSize}`, { fontFamily: "Arial", fontSize: "16px", color: "#dfe6f5" })
        .setOrigin(0.5);
      if (done) this.add.text(x + 44, y - 46, "✓", { fontFamily: "Arial", fontSize: "28px", color: "#ffffff" }).setOrigin(0.5);
      button.on("pointerdown", () => this.scene.start("Game", { levelIndex: index }));
    });
  }
}
