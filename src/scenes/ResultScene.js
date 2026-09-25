import Phaser from "phaser";
import { addBackground } from "./art.js";
import { LEVELS } from "../data/levels/index.js";
import { addIconButton, addMuteButton, textStyle } from "./ui.js";

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
      .text(width / 2, height * 0.3, "Lot cleared!", textStyle(72, "#ffe14d", "#1d5c39"))
      .setOrigin(0.5);

    addMuteButton(this, width - 58, 46);

    // icon buttons: replay, level list, and (biggest) on to the next level
    const y = height * 0.55;
    addIconButton(this, width / 2 - 150, y, "back", () => this.scene.start("LevelSelect", { levelIndex: this.levelIndex }));
    addIconButton(this, width / 2 + 150, y, "reset", () => this.scene.start("Game", { levelIndex: this.levelIndex }));
    if (this.levelIndex + 1 < LEVELS.length) {
      addIconButton(this, width / 2, y, "next", () => this.scene.start("Game", { levelIndex: this.levelIndex + 1 })).setScale(1.5);
    }
  }
}
