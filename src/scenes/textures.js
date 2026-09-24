import { COLOR_HEX } from "../game/colors.js";

export const CELL_PX = 64; // texture pixels per lot cell
export const PERSON_PX = 48;

export function taxiKey(color, length) {
  return `taxi_${color}_${length}`;
}

export function personKey(color) {
  return `person_${color}`;
}

// Flat-shape stand-ins, generated at runtime. The art pass replaces these with
// SVG files registered under the same keys.
export function createPlaceholderTextures(scene) {
  for (const [color, hex] of Object.entries(COLOR_HEX)) {
    for (let length = 1; length <= 3; length++) {
      const g = scene.make.graphics({ x: 0, y: 0, add: false });
      g.fillStyle(hex, 1).fillRoundedRect(4, 6, length * CELL_PX - 8, CELL_PX - 12, 10);
      g.fillStyle(0xffffff, 0.9).fillRect(length * CELL_PX - 20, 12, 8, CELL_PX - 24);
      g.generateTexture(taxiKey(color, length), length * CELL_PX, CELL_PX);
      g.destroy();
    }
    const p = scene.make.graphics({ x: 0, y: 0, add: false });
    p.fillStyle(hex, 1).fillCircle(PERSON_PX / 2, PERSON_PX / 2, PERSON_PX / 2 - 3);
    p.lineStyle(3, 0xffffff, 0.9).strokeCircle(PERSON_PX / 2, PERSON_PX / 2, PERSON_PX / 2 - 3);
    p.generateTexture(personKey(color), PERSON_PX, PERSON_PX);
    p.destroy();
  }
}
