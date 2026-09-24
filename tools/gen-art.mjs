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
  <path d="M23 26 Q23 3 48 3 Q73 3 73 26 Z" fill="${base}" stroke="${dark}" stroke-width="4" stroke-linejoin="round"/>
  <rect x="15" y="22" width="66" height="10" rx="5" fill="${base}" stroke="${dark}" stroke-width="4"/>
  <path d="M27 20 Q48 12 69 20" fill="none" stroke="${dark}" stroke-width="3" opacity="0.45" stroke-linecap="round"/>
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
writeFileSync(join(OUT, "bay.svg"), bay);
writeFileSync(join(OUT, "bg.svg"), bg);
writeFileSync(join(OUT, "logo.svg"), logo);
console.log("Wrote SVG art to", OUT);
