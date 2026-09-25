import { audio } from "../audio/audio.js";

const DARK = 0x163a7a;

const ICONS = {
  back(g) {
    const arrow = [[-15, -1], [1, -16], [1, -8], [15, -8], [15, 6], [1, 6], [1, 14]];
    fillOutlined(g, arrow);
  },
  next(g) {
    const arrow = [[15, -1], [-1, -16], [-1, -8], [-15, -8], [-15, 6], [-1, 6], [-1, 14]];
    fillOutlined(g, arrow);
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
  ICONS[icon](g);
  const button = scene.add.container(x, y, [g]).setSize(66, 66).setDepth(50);
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
