import Phaser from "phaser";
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

    this.add
      .text(width / 2, height * 0.35, "You cleared the lot!", {
        fontFamily: "Arial",
        fontSize: "48px",
        color: "#2ecc71",
        fontStyle: "bold",
        align: "center",
        wordWrap: { width: width - 80 },
      })
      .setOrigin(0.5);

    const hasNext = this.levelIndex + 1 < LEVELS.length;
    if (hasNext) {
      const nextButton = this.add
        .rectangle(width / 2, height * 0.55, 260, 90, 0x2ecc71)
        .setInteractive({ useHandCursor: true });
      this.add
        .text(width / 2, height * 0.55, "NEXT LEVEL", {
          fontFamily: "Arial",
          fontSize: "28px",
          color: "#ffffff",
          fontStyle: "bold",
        })
        .setOrigin(0.5);
      nextButton.on("pointerdown", () =>
        this.scene.start("Game", { levelIndex: this.levelIndex + 1 })
      );
    }

    const retryButton = this.add
      .rectangle(width / 2, height * 0.68, 260, 90, 0x3b82f6)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2, height * 0.68, "RETRY", {
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    retryButton.on("pointerdown", () =>
      this.scene.start("Game", { levelIndex: this.levelIndex })
    );

    const backButton = this.add
      .rectangle(width / 2, height * 0.81, 260, 90, 0x555b6e)
      .setInteractive({ useHandCursor: true });
    this.add
      .text(width / 2, height * 0.81, "LEVEL SELECT", {
        fontFamily: "Arial",
        fontSize: "26px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    backButton.on("pointerdown", () => this.scene.start("LevelSelect"));
  }
}
