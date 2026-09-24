import Phaser from "phaser";
import { createPlaceholderTextures } from "./textures.js";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    createPlaceholderTextures(this);
    this.scene.start("Menu");
  }
}
