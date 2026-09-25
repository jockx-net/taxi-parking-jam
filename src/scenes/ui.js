import { audio } from "../audio/audio.js";

const DARK = 0x163a7a;

// Bulky display font (bundled, see main.js) with a dark outline and drop shadow.
export const FONT = '"Lilita One", Arial, sans-serif';
export function textStyle(size, color = "#ffffff", outline = "#163a7a") {
  return {
    fontFamily: FONT,
    fontSize: `${size}px`,
    color,
    stroke: outline,
    strokeThickness: Math.max(4, Math.round(size / 7)),
    shadow: { offsetX: 0, offsetY: Math.max(3, Math.round(size / 12)), color: outline, blur: 0, fill: true, stroke: true },
  };
}

const ICONS = {
  back(g) {
    const arrow = [[-15, -1], [1, -16], [1, -8], [15, -8], [15, 6], [1, 6], [1, 14]];
    fillOutlined(g, arrow);
  },
  next(g) {
    const arrow = [[15, -1], [-1, -16], [-1, -8], [-15, -8], [-15, 6], [-1, 6], [-1, 14]];
    fillOutlined(g, arrow);
  },
  sound(g) {
    fillOutlined(g, [[-16, -6], [-8, -6], [2, -15], [2, 15], [-8, 6], [-16, 6]]);
    for (const [r, width] of [[8, 4], [15, 4]]) {
      for (const [w, color] of [[width + 4, DARK], [width, 0xffffff]]) {
        g.lineStyle(w, color, 1).beginPath();
        g.arc(2, 0, r, -0.9, 0.9, false);
        g.strokePath();
      }
    }
  },
  muted(g) {
    fillOutlined(g, [[-16, -6], [-8, -6], [2, -15], [2, 15], [-8, 6], [-16, 6]]);
    for (const [w, color] of [[10, DARK], [5, 0xffffff]]) {
      g.lineStyle(w, color, 1).lineBetween(8, -9, 20, 9).lineBetween(20, -9, 8, 9);
    }
  },
  reset(g) {
    const r = 13;
    const start = (-40 * Math.PI) / 180;
    const end = (250 * Math.PI) / 180;
    for (const [width, color] of [[10, DARK], [5, 0xffffff]]) {
      g.lineStyle(width, color, 1).beginPath();
      g.arc(0, 0, r, start, end, false);
      g.strokePath();
    }
    // arrow head at the end of the arc, pointing along the (clockwise) tangent
    const ex = r * Math.cos(end);
    const ey = r * Math.sin(end);
    const tx = -Math.sin(end);
    const ty = Math.cos(end);
    const nx = Math.cos(end);
    const ny = Math.sin(end);
    const head = [
      [ex + tx * 11, ey + ty * 11],
      [ex + nx * 9 - tx * 2, ey + ny * 9 - ty * 2],
      [ex - nx * 9 - tx * 2, ey - ny * 9 - ty * 2],
    ];
    fillOutlined(g, head);
  },
};

function fillOutlined(g, points) {
  const pts = points.map(([x, y]) => ({ x, y }));
  g.fillStyle(0xffffff, 1).lineStyle(4, DARK, 1);
  g.fillPoints(pts, true);
  g.strokePoints(pts, true);
}

// Icon-only button in the usual mobile-game style: chunky rounded blue key with
// a highlight and a bottom lip, a white icon, pressing down when tapped.
export function addIconButton(scene, x, y, icon, onClick) {
  const g = scene.add.graphics();
  g.fillStyle(0x0f2a5e, 1).fillRoundedRect(-31, -25, 62, 62, 17); // bottom lip
  g.fillStyle(0x2f6fdc, 1).fillRoundedRect(-31, -31, 62, 60, 17);
  g.fillStyle(0x6aa4ff, 1).fillRoundedRect(-26, -28, 52, 26, 13); // top highlight
  g.lineStyle(3, DARK, 1).strokeRoundedRect(-31, -31, 62, 60, 17);
  const glyph = scene.add.graphics();
  ICONS[icon](glyph);
  const button = scene.add.container(x, y, [g, glyph]).setSize(66, 66).setDepth(50);
  button.setIcon = (name) => {
    glyph.clear();
    ICONS[name](glyph);
  };
  button.setInteractive({ useHandCursor: true });
  button.on("pointerdown", () => button.setScale(0.92));
  button.on("pointerout", () => button.setScale(1));
  button.on("pointerup", () => {
    button.setScale(1);
    audio.play("click");
    onClick();
  });
  return button;
}

// Speaker button that mutes and unmutes all sound; the choice is remembered.
export function addMuteButton(scene, x, y) {
  const button = addIconButton(scene, x, y, audio.muted ? "muted" : "sound", () => {
    audio.setMuted(!audio.muted);
    button.setIcon(audio.muted ? "muted" : "sound");
  });
  return button;
}
