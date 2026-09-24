// Generates the game's SVG art into public/assets/. Run: node tools/gen-art.mjs
// Taxis are drawn top-down facing right, 128 units per lot cell (Phaser rotates
// them to face other directions). People are 96x96 cartoon figures.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const OUT = join(dirname(fileURLToPath(import.meta.url)), "../public/assets");
mkdirSync(OUT, { recursive: true });

const COLORS = {
  red: "#e64c3c",
  blue: "#3b82f6",
  green: "#2ecc71",
  yellow: "#f5c518",
  purple: "#9b59b6",
  orange: "#f39c12",
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
  const W = length * CELL;
  const H = CELL;
  const cabinX = 34;
  const cabinW = W - 34 - 40;
  const checkers = [];
  const squares = Math.floor((W - 44) / 14);
  for (let i = 0; i < squares; i++) {
    const fill = i % 2 ? "#ffffff" : "#20232b";
    checkers.push(`<rect x="${22 + i * 14}" y="20" width="14" height="7" fill="${fill}"/>`);
    checkers.push(`<rect x="${22 + i * 14}" y="101" width="14" height="7" fill="${i % 2 ? "#20232b" : "#ffffff"}"/>`);
  }
  const sideWindows = [];
  for (let i = 0; i < length; i++) {
    const x = cabinX + 6 + (i * cabinW) / length;
    sideWindows.push(`<rect x="${x}" y="40" width="${cabinW / length - 12}" height="48" rx="8" fill="#243044" stroke="#0d1420" stroke-width="2"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <ellipse cx="${W / 2}" cy="${H / 2 + 8}" rx="${W / 2 - 6}" ry="46" fill="#000" opacity="0.28"/>
  <rect x="${W - 46}" y="6" width="20" height="14" rx="4" fill="#15171c"/>
  <rect x="${W - 46}" y="108" width="20" height="14" rx="4" fill="#15171c"/>
  <rect x="26" y="6" width="20" height="14" rx="4" fill="#15171c"/>
  <rect x="26" y="108" width="20" height="14" rx="4" fill="#15171c"/>
  <rect x="8" y="14" width="${W - 16}" height="100" rx="26" fill="${base}" stroke="${dark}" stroke-width="5"/>
  <rect x="14" y="20" width="${W - 28}" height="88" rx="22" fill="none" stroke="${light}" stroke-width="3" opacity="0.7"/>
  ${checkers.join("\n  ")}
  <rect x="${cabinX}" y="34" width="${cabinW}" height="60" rx="16" fill="${light}" stroke="${dark}" stroke-width="3"/>
  ${sideWindows.join("\n  ")}
  <path d="M${W - 42} 34 L${W - 22} 42 Q${W - 16} 64 ${W - 22} 86 L${W - 42} 94 Z" fill="#33517a" stroke="#0d1420" stroke-width="3"/>
  <path d="M${W - 42} 38 L${W - 30} 44 L${W - 30} 58 L${W - 42} 52 Z" fill="#ffffff" opacity="0.35"/>
  <path d="M30 40 L18 46 Q13 64 18 82 L30 88 Z" fill="#243044" stroke="#0d1420" stroke-width="3"/>
  <rect x="${cabinX + cabinW / 2 - 14}" y="52" width="28" height="24" rx="6" fill="#fffbe0" stroke="${dark}" stroke-width="2"/>
  <rect x="${cabinX + cabinW / 2 - 8}" y="60" width="16" height="8" rx="2" fill="${dark}" opacity="0.8"/>
  <circle cx="${W - 10}" cy="36" r="8" fill="#fff6a8" stroke="#c9a400" stroke-width="2"/>
  <circle cx="${W - 10}" cy="92" r="8" fill="#fff6a8" stroke="#c9a400" stroke-width="2"/>
  <rect x="6" y="30" width="7" height="14" rx="3" fill="#ff5d5d"/>
  <rect x="6" y="84" width="7" height="14" rx="3" fill="#ff5d5d"/>
</svg>
`;
}

function personSvg(color) {
  const base = COLORS[color];
  const dark = shade(base, -0.35);
  const skin = "#ffd6ad";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">
  <ellipse cx="48" cy="90" rx="26" ry="5" fill="#000" opacity="0.25"/>
  <rect x="20" y="52" width="56" height="38" rx="18" fill="${base}" stroke="${dark}" stroke-width="4"/>
  <circle cx="18" cy="70" r="9" fill="${skin}" stroke="${dark}" stroke-width="3"/>
  <circle cx="78" cy="70" r="9" fill="${skin}" stroke="${dark}" stroke-width="3"/>
  <circle cx="48" cy="34" r="27" fill="${skin}" stroke="${dark}" stroke-width="4"/>
  <path d="M21 30 Q24 6 48 8 Q72 6 75 30 Q62 16 48 18 Q34 16 21 30 Z" fill="${dark}"/>
  <circle cx="38" cy="38" r="4" fill="#1d2230"/>
  <circle cx="58" cy="38" r="4" fill="#1d2230"/>
  <circle cx="39.5" cy="36.5" r="1.4" fill="#fff"/>
  <circle cx="59.5" cy="36.5" r="1.4" fill="#fff"/>
  <path d="M39 49 Q48 57 57 49" fill="none" stroke="#1d2230" stroke-width="3" stroke-linecap="round"/>
  <circle cx="30" cy="46" r="4.5" fill="#ff8f8f" opacity="0.45"/>
  <circle cx="66" cy="46" r="4.5" fill="#ff8f8f" opacity="0.45"/>
</svg>
`;
}

const tile = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
  <rect width="128" height="128" fill="#3a4050"/>
  <g fill="#454c5e" opacity="0.8">
    <circle cx="14" cy="22" r="2"/><circle cx="52" cy="10" r="1.5"/><circle cx="96" cy="30" r="2"/>
    <circle cx="30" cy="70" r="1.5"/><circle cx="76" cy="84" r="2"/><circle cx="112" cy="108" r="1.5"/>
    <circle cx="20" cy="112" r="2"/><circle cx="64" cy="54" r="1.5"/><circle cx="104" cy="66" r="1.5"/>
  </g>
  <g fill="#30354a" opacity="0.8">
    <circle cx="38" cy="30" r="1.5"/><circle cx="84" cy="8" r="1.5"/><circle cx="8" cy="86" r="1.5"/>
    <circle cx="56" cy="104" r="2"/><circle cx="118" cy="52" r="1.5"/><circle cx="92" cy="120" r="1.5"/>
  </g>
  <path d="M0 0 H128 V128 H0 Z" fill="none" stroke="#f5f5f5" stroke-width="2" stroke-dasharray="14 18" opacity="0.16"/>
</svg>
`;

const bay = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="140" viewBox="0 0 220 140">
  <rect x="4" y="4" width="212" height="132" rx="16" fill="#343a49" stroke="#f5c518" stroke-width="5" stroke-dasharray="22 12"/>
  <text x="110" y="82" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="bold" font-size="60" fill="#f5c518" opacity="0.18">P</text>
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
  <text x="280" y="92" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="84" fill="#f5c518" stroke="#20232b" stroke-width="8" paint-order="stroke">TAXI</text>
  <text x="280" y="170" text-anchor="middle" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="64" fill="#ffffff" stroke="#20232b" stroke-width="7" paint-order="stroke">PARKING JAM</text>
  <g transform="translate(152 190) scale(0.9)">
    ${taxiSvg("yellow", 2).replace(/<svg[^>]*>|<\/svg>/g, "")}
  </g>
</svg>
`;

for (const color of Object.keys(COLORS)) {
  for (let length = 1; length <= 3; length++) writeFileSync(join(OUT, `taxi_${color}_${length}.svg`), taxiSvg(color, length));
  writeFileSync(join(OUT, `person_${color}.svg`), personSvg(color));
}
writeFileSync(join(OUT, "tile.svg"), tile);
writeFileSync(join(OUT, "bay.svg"), bay);
writeFileSync(join(OUT, "bg.svg"), bg);
writeFileSync(join(OUT, "logo.svg"), logo);
console.log("Wrote SVG art to", OUT);
