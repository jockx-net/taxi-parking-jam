import Phaser from "phaser";
import { BootScene } from "./scenes/BootScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { LevelSelectScene } from "./scenes/LevelSelectScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { ResultScene } from "./scenes/ResultScene.js";
import { audio } from "./audio/audio.js";

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-container",
  width: 720,
  height: 1280,
  backgroundColor: "#1b1f2a",
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [BootScene, MenuScene, LevelSelectScene, GameScene, ResultScene],
});

if (import.meta.env.DEV) {
  window.__game = game;
  window.__audio = audio;
}
