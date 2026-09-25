import Phaser from "phaser";
import { addBackground, taxiKey } from "./art.js";
import { audio } from "../audio/audio.js";
import { addMuteButton, textStyle } from "./ui.js";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create() {
    const { width, height } = this.scale;
    addBackground(this);

    const colors = ["yellow", "red", "blue", "green", "purple"];
    colors.forEach((color, i) => {
      const length = 1 + (i % 3);
      const y = 1010 + (i % 2) * 90;
      const taxi = this.add.image(-200, y, taxiKey(color, length)).setScale(0.75);
      this.tweens.add({ targets: taxi, x: width + 300, duration: 7000 + i * 900, delay: i * 1300, repeat: -1, repeatDelay: 600 });
    });

    addMuteButton(this, width - 58, 46);
    const logo = this.add.container(width / 2, height * 0.3, [
      this.add.image(0, 0, "logo"),
      this.add.text(0, -112, "TAXI", textStyle(110, "#f5c518", "#20232b")).setOrigin(0.5),
      this.add.text(0, -22, "PARKING JAM", textStyle(74, "#ffffff", "#20232b")).setOrigin(0.5),
    ]);
    this.tweens.add({ targets: logo, y: logo.y - 12, yoyo: true, repeat: -1, duration: 1400, ease: "Sine.easeInOut" });

    const play = this.add.rectangle(width / 2, height * 0.58, 320, 100, 0x2ecc71).setStrokeStyle(5, 0x1d8f4e).setInteractive({ useHandCursor: true });
    const label = this.add
      .text(width / 2, height * 0.58, "PLAY", textStyle(64, "#ffffff", "#1d8f4e"))
      .setOrigin(0.5);
    this.tweens.add({ targets: [play, label], scaleX: 1.05, scaleY: 1.05, yoyo: true, repeat: -1, duration: 700, ease: "Sine.easeInOut" });
    play.on("pointerdown", () => {
      audio.play("click");
      this.scene.start("LevelSelect");
    });
  }
}
