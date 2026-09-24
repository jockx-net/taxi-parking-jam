import Phaser from "phaser";

export class MenuScene extends Phaser.Scene {
  constructor() {
    super("Menu");
  }

  create() {
    const { width, height } = this.scale;

    this.add
      .text(width / 2, height * 0.35, "Taxi Parking Jam", {
        fontFamily: "Arial",
        fontSize: "56px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    const playButton = this.add
      .rectangle(width / 2, height * 0.55, 260, 90, 0x2ecc71)
      .setInteractive({ useHandCursor: true });

    this.add
      .text(width / 2, height * 0.55, "PLAY", {
        fontFamily: "Arial",
        fontSize: "40px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    playButton.on("pointerdown", () => this.scene.start("LevelSelect"));
  }
}
