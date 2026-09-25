// Generates the game's SVG art into public/assets/. Run: node tools/gen-art.mjs
// Taxis are drawn top-down facing right, 128 units per lot cell (Phaser rotates
// them to face other directions). People are 96x96 cartoon figures.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { FRAME_NAMES, FRAME_SIZE, SHEET_COLS, SHEET_ROWS } from "../src/scenes/personFrames.js";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../public/assets");
mkdirSync(OUT, { recursive: true });

const COLORS = {
  red: "#e64c3c",
  blue: "#3b82f6",
  green: "#2ecc71",
  yellow: "#f5c518",
  purple: "#9b59b6",
  orange: "#a5622a",
};
const CELL = 128;

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (shift) => Math.max(0, Math.min(255, Math.round(((n >> shift) & 255) * (1 + amount))));
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, "0")).join("")}`;
}

function taxiSvg(color, length) {
  const base = COLORS[color];
  const dark = shade(base, -0.35);
  const light = shade(base, 0.25);
  const hoodColor = shade(base, 0.12);
  const W = length * CELL;
  const H = CELL;
  const hoodLen = 46 + 10 * (length - 1); // long bonnet: the obvious front
  const trunkLen = 14;
  const cabinStart = 8 + trunkLen;
  const cabinEnd = W - 8 - hoodLen;
  const cabinW = cabinEnd - cabinStart;
  const hoodStart = cabinEnd;
  const checkers = [];
  const squares = Math.floor((cabinW - 20) / 12);
  for (let i = 0; i < squares; i++) {
    const x = cabinStart + 10 + i * 12;
    checkers.push(`<rect x="${x}" y="17" width="12" height="6" fill="${i % 2 ? "#ffffff" : "#20232b"}"/>`);
    checkers.push(`<rect x="${x}" y="105" width="12" height="6" fill="${i % 2 ? "#20232b" : "#ffffff"}"/>`);
  }
  const sideWindows = [];
  const winArea = cabinW - 40;
  for (let i = 0; i < length; i++) {
    const x = cabinStart + 20 + (i * winArea) / length;
    sideWindows.push(`<rect x="${x}" y="42" width="${winArea / length - 6}" height="44" rx="7" fill="#243044" stroke="#0d1420" stroke-width="2"/>`);
  }
  const chevronX = hoodStart + 8 + (hoodLen - 46) * 0.4;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <ellipse cx="${W / 2}" cy="${H / 2 + 8}" rx="${W / 2 - 4}" ry="48" fill="#000" opacity="0.28"/>
  <rect x="${cabinStart - 4}" y="5" width="22" height="14" rx="4" fill="#15171c"/>
  <rect x="${cabinStart - 4}" y="109" width="22" height="14" rx="4" fill="#15171c"/>
  <rect x="${hoodStart + 8}" y="5" width="22" height="14" rx="4" fill="#15171c"/>
  <rect x="${hoodStart + 8}" y="109" width="22" height="14" rx="4" fill="#15171c"/>
  <rect x="8" y="14" width="${W - 16}" height="100" rx="24" fill="${base}" stroke="${dark}" stroke-width="5"/>
  <rect x="${hoodStart - 2}" y="16" width="${hoodLen - 4}" height="96" rx="22" fill="${hoodColor}" stroke="${dark}" stroke-width="3"/>
  <path d="M${hoodStart + 8} 40 Q${hoodStart + hoodLen * 0.5} 34 ${W - 22} 42 M${hoodStart + 8} 88 Q${hoodStart + hoodLen * 0.5} 94 ${W - 22} 86" fill="none" stroke="${dark}" stroke-width="3" opacity="0.55" stroke-linecap="round"/>
  <path d="M${chevronX} 52 L${chevronX + 12} 64 L${chevronX} 76 M${chevronX + 13} 52 L${chevronX + 25} 64 L${chevronX + 13} 76" fill="none" stroke="${dark}" stroke-width="5" opacity="0.6" stroke-linecap="round" stroke-linejoin="round"/>
  <rect x="${W - 18}" y="44" width="9" height="40" rx="4" fill="#15171c"/>
  <circle cx="${W - 20}" cy="30" r="9" fill="#fff6a8" stroke="#c9a400" stroke-width="2.5"/>
  <circle cx="${W - 20}" cy="98" r="9" fill="#fff6a8" stroke="#c9a400" stroke-width="2.5"/>
  ${checkers.join("\n  ")}
  <rect x="${cabinStart}" y="30" width="${cabinW}" height="68" rx="16" fill="${light}" stroke="${dark}" stroke-width="3"/>
  ${sideWindows.join("\n  ")}
  <path d="M${cabinEnd - 26} 34 L${cabinEnd - 6} 44 Q${cabinEnd} 64 ${cabinEnd - 6} 84 L${cabinEnd - 26} 94 Z" fill="#33517a" stroke="#0d1420" stroke-width="3"/>
  <path d="M${cabinEnd - 22} 39 L${cabinEnd - 12} 45 L${cabinEnd - 12} 58 L${cabinEnd - 22} 52 Z" fill="#ffffff" opacity="0.35"/>
  <path d="M${cabinStart + 16} 40 L${cabinStart + 4} 47 Q${cabinStart} 64 ${cabinStart + 4} 81 L${cabinStart + 16} 88 Z" fill="#243044" stroke="#0d1420" stroke-width="3"/>
  <rect x="${cabinStart + cabinW / 2 - 13}" y="52" width="26" height="24" rx="6" fill="#fffbe0" stroke="${dark}" stroke-width="2"/>
  <rect x="${cabinStart + cabinW / 2 - 7}" y="60" width="14" height="8" rx="2" fill="${dark}" opacity="0.8"/>
  <rect x="9" y="28" width="7" height="16" rx="3" fill="#ff4d4d"/>
  <rect x="9" y="84" width="7" height="16" rx="3" fill="#ff4d4d"/>
</svg>
`;
}

function outlined(d, base, dark, width) {
  return `<path d="${d}" fill="none" stroke="${dark}" stroke-width="${width + 3}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${d}" fill="none" stroke="${base}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// One 96x96 person frame. view: front | back | side (facing left). pose: walk
// phase in radians (or null) and an optional idle pose name.
function personFrame(color, view, phase, idle) {
  const base = COLORS[color];
  const dark = shade(base, -0.35);
  const skin = "#ffd6ad";
  const skinDark = "#b98b64";
  const pants = "#3a4560";
  const pantsFar = "#2b3348";
  const shoe = "#1f232b";
  const hair = "#5a3a22";
  const s = phase === null ? 0 : Math.sin(phase);
  const bob = phase === null ? 0 : -Math.abs(s) * 2;
  const out = [`<ellipse cx="48" cy="92" rx="20" ry="4.5" fill="#000" opacity="0.25"/>`];

  const hand = (x, y) => `<circle cx="${x}" cy="${y}" r="4.6" fill="${skin}" stroke="${skinDark}" stroke-width="1.5"/>`;
  const hat = (cx, brimL, brimR) =>
    `<path d="M${cx - 15} ${24 + bob} Q${cx - 15} ${4 + bob} ${cx} ${4 + bob} Q${cx + 15} ${4 + bob} ${cx + 15} ${24 + bob} Z" fill="${base}" stroke="${dark}" stroke-width="3" stroke-linejoin="round"/>` +
    `<rect x="${brimL}" y="${21 + bob}" width="${brimR - brimL}" height="8" rx="4" fill="${base}" stroke="${dark}" stroke-width="3"/>`;

  if (view === "side") {
    const A = phase === null ? 0 : 30 * s;
    const leg = (angle, colour, dx) =>
      `<g transform="rotate(${angle} 49 ${68 + bob})"><rect x="${44.5 + dx}" y="${68 + bob}" width="9" height="19" rx="4" fill="${colour}" stroke="${dark}" stroke-width="1.5"/>` +
      `<ellipse cx="${43 + dx}" cy="${88 + bob}" rx="7.5" ry="3.8" fill="${shoe}"/></g>`;
    const arm = (angle, dxs) =>
      `<g transform="rotate(${angle} 49 ${53 + bob})">${outlined(`M49 ${53 + bob} L49 ${71 + bob}`, base, dark, 8)}${hand(49, 73 + bob)}</g>`;
    out.push(leg(A, pantsFar, 0)); // far leg first (behind)
    out.push(arm(A * 0.9, 0));
    out.push(leg(-A, pants, 0));
    out.push(`<rect x="40" y="${48 + bob}" width="18" height="23" rx="8" fill="${base}" stroke="${dark}" stroke-width="3"/>`);
    out.push(arm(-A * 0.9, 0));
    out.push(`<circle cx="47" cy="${32 + bob}" r="16" fill="${skin}" stroke="${skinDark}" stroke-width="2"/>`);
    out.push(`<path d="M55 ${27 + bob} Q64 ${34 + bob} 55 ${44 + bob} Q60 ${34 + bob} 55 ${27 + bob}Z" fill="${hair}"/>`);
    out.push(`<circle cx="31.5" cy="${37 + bob}" r="3.2" fill="${skin}" stroke="${skinDark}" stroke-width="1.5"/>`); // nose
    out.push(`<circle cx="39" cy="${34 + bob}" r="2.4" fill="#1d2230"/><circle cx="39.6" cy="${33.3 + bob}" r="0.8" fill="#fff"/>`);
    out.push(`<path d="M36 ${44 + bob} Q40 ${46 + bob} 43 ${44 + bob}" fill="none" stroke="#1d2230" stroke-width="2" stroke-linecap="round"/>`);
    out.push(hat(48, 22, 62));
    return out.join("\n");
  }

  const back = view === "back";
  const liftL = phase === null ? 0 : Math.max(0, s) * 5;
  const liftR = phase === null ? 0 : Math.max(0, -s) * 5;
  const legL = `<rect x="38" y="${68 + bob}" width="9.5" height="${19 - liftL}" rx="4" fill="${pants}" stroke="${dark}" stroke-width="1.5"/><ellipse cx="42.7" cy="${88 + bob - liftL}" rx="6.5" ry="3.6" fill="${shoe}"/>`;
  const legR = `<rect x="48.5" y="${68 + bob}" width="9.5" height="${19 - liftR}" rx="4" fill="${pants}" stroke="${dark}" stroke-width="1.5"/><ellipse cx="53.3" cy="${88 + bob - liftR}" rx="6.5" ry="3.6" fill="${shoe}"/>`;
  const swing = phase === null ? 0 : 6 * s;
  let armL = outlined(`M33 ${53 + bob} L${30} ${71 + bob + swing}`, base, dark, 8) + hand(30, 73 + bob + swing);
  let armR = outlined(`M63 ${53 + bob} L${66} ${71 + bob - swing}`, base, dark, 8) + hand(66, 73 + bob - swing);
  let eyeShift = 0;
  let eyeDrop = 0;
  let extra = "";
  if (idle === "lookL") eyeShift = -6;
  if (idle === "lookR") eyeShift = 6;
  if (idle === "head0" || idle === "head1") {
    const w = idle === "head0" ? 0 : 4;
    armR = outlined(`M63 ${53 + bob} L72 40 L${63 + w} 21`, base, dark, 8) + hand(63 + w, 20);
  }
  if (idle === "belly0" || idle === "belly1") {
    const w = idle === "belly0" ? 0 : 3;
    armR = outlined(`M63 ${53 + bob} L69 63 L${55 - w} ${60 + w}`, base, dark, 8) + hand(54 - w, 60 + w);
  }
  if (idle === "watch0" || idle === "watch1") {
    const up = idle === "watch0" ? 0 : -3;
    armL = outlined(`M33 ${53 + bob} L24 62 L40 ${50 + up}`, base, dark, 8) + hand(41, 49 + up) +
      `<circle cx="36" cy="${53 + up}" r="3.6" fill="#fff" stroke="#20232b" stroke-width="1.6"/><path d="M36 ${53 + up} L36 ${51 + up} M36 ${53 + up} L37.5 ${53 + up}" stroke="#20232b" stroke-width="1"/>`;
    eyeDrop = 3;
  }

  const face = back
    ? `<path d="M32 ${28 + bob} Q48 ${52 + bob} 64 ${28 + bob} L64 ${26 + bob} L32 ${26 + bob}Z" fill="${hair}"/>`
    : `<circle cx="${41 + eyeShift}" cy="${37 + eyeDrop + bob}" r="2.6" fill="#1d2230"/><circle cx="${55 + eyeShift}" cy="${37 + eyeDrop + bob}" r="2.6" fill="#1d2230"/>` +
      `<circle cx="${41.8 + eyeShift}" cy="${36.2 + eyeDrop + bob}" r="0.9" fill="#fff"/><circle cx="${55.8 + eyeShift}" cy="${36.2 + eyeDrop + bob}" r="0.9" fill="#fff"/>` +
      `<path d="M${42 + eyeShift * 0.6} ${44 + bob} Q${48 + eyeShift * 0.6} ${49 + bob} ${54 + eyeShift * 0.6} ${44 + bob}" fill="none" stroke="#1d2230" stroke-width="2.2" stroke-linecap="round"/>`;

  out.push(legL, legR);
  if (back) out.push(armL, armR);
  out.push(`<rect x="34" y="${48 + bob}" width="28" height="23" rx="9" fill="${base}" stroke="${dark}" stroke-width="3"/>`);
  if (!back) out.push(armL);
  out.push(`<circle cx="48" cy="${32 + bob}" r="16" fill="${skin}" stroke="${skinDark}" stroke-width="2"/>`);
  out.push(face);
  out.push(hat(48, 27, 69));
  if (!back) out.push(armR);
  return out.join("\n");
}

function personSheet(color) {
  const frames = FRAME_NAMES.map((name) => {
    const m = /^(down|up|left)(\d)$/.exec(name);
    if (m) return personFrame(color, m[1] === "down" ? "front" : m[1] === "up" ? "back" : "side", (Number(m[2]) * Math.PI) / 2, null);
    return personFrame(color, "front", null, name === "stand" ? null : name);
  });
  const W = SHEET_COLS * FRAME_SIZE;
  const H = SHEET_ROWS * FRAME_SIZE;
  const cells = frames.map((f, i) => `<g transform="translate(${(i % SHEET_COLS) * FRAME_SIZE} ${Math.floor(i / SHEET_COLS) * FRAME_SIZE})">${f}</g>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">\n${cells.join("\n")}\n</svg>\n`;
}

const bay = `<svg xmlns="http://www.w3.org/2000/svg" width="150" height="220" viewBox="0 0 150 220">
  <rect x="4" y="4" width="142" height="212" rx="16" fill="#343a49"/>
  <path d="M4 20 V4 H146 V20 M4 200 V216 H146 V200" fill="none"/>
  <rect x="4" y="4" width="142" height="212" rx="16" fill="none" stroke="#f5c518" stroke-width="5" stroke-dasharray="22 12"/>
  <text x="75" y="128" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="72" fill="#f5c518" opacity="0.16">P</text>
</svg>
`;

const bg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1f2a44"/>
      <stop offset="0.55" stop-color="#232a3d"/>
      <stop offset="1" stop-color="#171b26"/>
    </linearGradient>
  </defs>
  <rect width="720" height="1280" fill="url(#g)"/>
  <g fill="#ffffff" opacity="0.05">
    <rect x="0" y="770" width="720" height="6"/>
    <rect x="0" y="960" width="720" height="6"/>
  </g>
  <g fill="#f5c518" opacity="0.12">
    ${Array.from({ length: 12 }, (_, i) => `<rect x="${i * 64 + 14}" y="1170" width="36" height="8" rx="3"/>`).join("")}
  </g>
</svg>
`;

const logo = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="340" viewBox="0 0 560 340">
  <g transform="translate(152 190) scale(0.9)">
    ${taxiSvg("yellow", 2).replace(/<svg[^>]*>|<\/svg>/g, "")}
  </g>
</svg>
`;

for (const color of Object.keys(COLORS)) {
  for (let length = 1; length <= 3; length++) writeFileSync(join(OUT, `taxi_${color}_${length}.svg`), taxiSvg(color, length));
  writeFileSync(join(OUT, `person_${color}.svg`), personSheet(color));
}
writeFileSync(join(OUT, "bay.svg"), bay);
writeFileSync(join(OUT, "bg.svg"), bg);
writeFileSync(join(OUT, "logo.svg"), logo);
console.log("Wrote SVG art to", OUT);
