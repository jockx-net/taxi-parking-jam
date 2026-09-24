// Layout of the person sprite sheet (tools/gen-art.mjs draws it in this order).
// Walking frames exist for facing down (towards the viewer), up and left; facing
// right reuses the left frames flipped. The rest are standing idle poses.
export const FRAME_SIZE = 96;
export const SHEET_COLS = 7;
export const FRAME_NAMES = [
  "down0", "down1", "down2", "down3", "up0", "up1", "up2",
  "up3", "left0", "left1", "left2", "left3", "stand", "lookL",
  "lookR", "head0", "head1", "belly0", "belly1", "watch0", "watch1",
];
export const SHEET_ROWS = Math.ceil(FRAME_NAMES.length / SHEET_COLS);
