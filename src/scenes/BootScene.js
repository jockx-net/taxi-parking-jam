import Phaser from "phaser";

// No external assets yet (MVP renders shapes procedurally — see README
// "Art pass" for the planned sprite swap), so this just hands off to the menu.
export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    this.scene.start("Menu");
  }
}
