import Phaser from "phaser";
import { addPersonFrames, loadArt } from "./art.js";
import { FONT } from "./ui.js";
import { audio } from "../audio/audio.js";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  preload() {
    const label = this.add
      .text(this.scale.width / 2, this.scale.height / 2, "Loading...", { fontFamily: FONT, fontSize: "36px", color: "#ffffff" })
      .setOrigin(0.5);
    this.load.on("progress", (p) => label.setText(`Loading ${Math.round(p * 100)}%`));
    loadArt(this);
  }

  create() {
    addPersonFrames(this.textures);
    audio.attach(this.sound); // music starts as soon as the browser lets audio play
    this.scene.start("Menu");
  }
}
