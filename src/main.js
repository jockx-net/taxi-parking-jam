import Phaser from "phaser";
import "@fontsource/lilita-one/400.css";
import { BootScene } from "./scenes/BootScene.js";
import { MenuScene } from "./scenes/MenuScene.js";
import { LevelSelectScene } from "./scenes/LevelSelectScene.js";
import { GameScene } from "./scenes/GameScene.js";
import { ResultScene } from "./scenes/ResultScene.js";
import { audio } from "./audio/audio.js";

function start() {
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
}

// Phaser bakes text into textures, so the bundled font must be ready first.
document.fonts
  .load('32px "Lilita One"')
  .catch(() => {})
  .then(start);
