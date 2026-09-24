import { DIR_VECTORS } from "./Taxi.js";

function cellKey(x, y) {
  return `${x},${y}`;
}

// The parking lot: a width x height grid of multi-cell taxis. A taxi is free
// when every cell ahead of its front, up to the grid edge, is empty.
export class GridLot {
  constructor(width, height, taxis) {
    this.width = width;
    this.height = height;
    this.taxis = new Map(taxis.map((t) => [t.id, t]));
    this.cellOccupancy = new Map();
    for (const taxi of taxis) {
      for (const { x, y } of taxi.cells()) {
        if (!this._inBounds(x, y)) {
          throw new Error(`Taxi ${taxi.id} is out of bounds at ${x},${y}`);
        }
        const key = cellKey(x, y);
        if (this.cellOccupancy.has(key)) {
          throw new Error(`Taxi ${taxi.id} overlaps ${this.cellOccupancy.get(key)} at ${key}`);
        }
        this.cellOccupancy.set(key, taxi.id);
      }
    }
  }

  getTaxi(id) {
    return this.taxis.get(id);
  }

  allTaxis() {
    return [...this.taxis.values()];
  }

  _inBounds(x, y) {
    return x >= 0 && x < this.width && y >= 0 && y < this.height;
  }

  // The id of the first taxi ahead of `taxi`, or null if its way out is clear.
  blockerOf(taxi) {
    const { dx, dy } = DIR_VECTORS[taxi.dir];
    let x = taxi.x + dx;
    let y = taxi.y + dy;
    while (this._inBounds(x, y)) {
      const occupant = this.cellOccupancy.get(cellKey(x, y));
      if (occupant) return occupant;
      x += dx;
      y += dy;
    }
    return null;
  }

  isFree(taxi) {
    return this.blockerOf(taxi) === null;
  }

  removeFromGrid(taxi) {
    for (const { x, y } of taxi.cells()) {
      this.cellOccupancy.delete(cellKey(x, y));
    }
  }

  isCleared() {
    return this.allTaxis().every((t) => t.state === "departed");
  }

  freeTaxiIds() {
    return this.allTaxis()
      .filter((t) => t.state === "parked" && this.isFree(t))
      .map((t) => t.id);
  }
}
