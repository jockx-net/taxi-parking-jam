import Phaser from "phaser";
import { addPersonFrames, loadArt } from "./art.js";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    const label = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "Loading...", { fontFamily: "Arial", fontSize: "32px", color: "#ffffff" })
      .setOrigin(0.5);
    this.load.on("progress", (p) => label.setText(`Loading ${Math.round(p * 100)}%`));
    loadArt(this);
  }

  create() {
    addPersonFrames(this.textures);
    this.scene.start("Menu");
  }
}
