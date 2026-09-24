import Phaser from "phaser";
import { LEVELS } from "../data/levels/index.js";

export class LevelSelectScene extends Phaser.Scene {
  constructor() {
    super("LevelSelect");
  }

  create() {
    const { width } = this.scale;

    this.add
      .text(width / 2, 100, "Select Level", {
        fontFamily: "Arial",
        fontSize: "44px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const cols = 4;
    const cellSize = 130;
    const gridWidth = cols * cellSize;
    const startX = width / 2 - gridWidth / 2 + cellSize / 2;
    const startY = 240;

    LEVELS.forEach((level, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = startX + col * cellSize;
      const y = startY + row * cellSize;

      const button = this.add
        .rectangle(x, y, 100, 100, 0x3b82f6)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(x, y, String(index + 1), {
          fontFamily: "Arial",
          fontSize: "36px",
          color: "#ffffff",
        })
        .setOrigin(0.5);

      button.on("pointerdown", () => {
        this.scene.start("Game", { levelIndex: index });
      });
    });
  }
}
