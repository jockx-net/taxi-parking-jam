import Phaser from "phaser";
import { addBackground } from "./art.js";
import { LEVELS } from "../data/levels/index.js";

export class ResultScene extends Phaser.Scene {
  constructor() {
    super("Result");
  }

  init(data) {
    this.levelIndex = data.levelIndex;
  }

  create() {
    const { width, height } = this.scale;
    addBackground(this);
    this.add
      .text(width / 2, height * 0.3, "Lot cleared!", { fontFamily: "Arial", fontSize: "64px", color: "#2ecc71", fontStyle: "bold" })
      .setOrigin(0.5);

    const buttons = [];
    if (this.levelIndex + 1 < LEVELS.length) {
      buttons.push(["NEXT LEVEL", 0x2ecc71, () => this.scene.start("Game", { levelIndex: this.levelIndex + 1 })]);
    }
    buttons.push(["REPLAY", 0x3b82f6, () => this.scene.start("Game", { levelIndex: this.levelIndex })]);
    buttons.push(["LEVEL SELECT", 0x555b6e, () => this.scene.start("LevelSelect")]);

    buttons.forEach(([label, color, onClick], i) => {
      const y = height * 0.5 + i * 110;
      const rect = this.add.rectangle(width / 2, y, 320, 84, color).setInteractive({ useHandCursor: true });
      this.add.text(width / 2, y, label, { fontFamily: "Arial", fontSize: "30px", color: "#ffffff", fontStyle: "bold" }).setOrigin(0.5);
      rect.on("pointerdown", onClick);
    });
  }
}
