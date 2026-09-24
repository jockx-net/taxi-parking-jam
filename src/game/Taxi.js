export const DIR_VECTORS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

// Bigger taxis always seat more people: 1 cell -> 2 seats, 2 -> 3, 3 -> 4.
export function seatsForLength(length) {
  return length + 1;
}

// A taxi occupies `length` consecutive cells. (x, y) is its front cell; the
// body extends backwards, opposite to the facing direction `dir`. Its seat
// count follows its length unless a test overrides `capacity`.
export class Taxi {
  constructor({ id, color, x, y, dir, length = 2, capacity = seatsForLength(length) }) {
    if (!DIR_VECTORS[dir]) throw new Error(`Unknown dir "${dir}" for taxi ${id}`);
    this.id = id;
    this.color = color;
    this.capacity = capacity;
    this.x = x;
    this.y = y;
    this.dir = dir;
    this.length = length;
    this.seatsFilled = 0;
    this.state = "parked"; // 'parked' | 'active' | 'departed'
  }

  get isFull() {
    return this.seatsFilled >= this.capacity;
  }

  cells() {
    const { dx, dy } = DIR_VECTORS[this.dir];
    const cells = [];
    for (let k = 0; k < this.length; k++) {
      cells.push({ x: this.x - dx * k, y: this.y - dy * k });
    }
    return cells;
  }
}
