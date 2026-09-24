const DIR_VECTORS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

function cellKey(x, y) {
  return `${x},${y}`;
}

// Grid model: tracks parked taxis on a width x height grid and computes,
// for a given taxi, whether the straight-line path from its cell to the
// grid edge (in its exitDir) is clear of other parked taxis.
export class GridLot {
  constructor(width, height, taxis) {
    this.width = width;
    this.height = height;
    this.taxis = new Map(taxis.map((t) => [t.id, t]));
    this.cellOccupancy = new Map();
    for (const taxi of taxis) {
      this.cellOccupancy.set(cellKey(taxi.x, taxi.y), taxi.id);
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

  hasClearPath(taxi) {
    if (!DIR_VECTORS[taxi.exitDir]) {
      throw new Error(`Unknown exitDir "${taxi.exitDir}" for taxi ${taxi.id}`);
    }
    const { dx, dy } = DIR_VECTORS[taxi.exitDir];
    let x = taxi.x + dx;
    let y = taxi.y + dy;
    while (this._inBounds(x, y)) {
      if (this.cellOccupancy.has(cellKey(x, y))) {
        return false;
      }
      x += dx;
      y += dy;
    }
    return true;
  }

  removeFromGrid(taxi) {
    this.cellOccupancy.delete(cellKey(taxi.x, taxi.y));
  }

  returnToGrid(taxi) {
    this.cellOccupancy.set(cellKey(taxi.x, taxi.y), taxi.id);
  }

  isCleared() {
    return this.allTaxis().every((t) => t.state === "departed");
  }

  getAvailableTaxiIds() {
    return this.allTaxis()
      .filter((t) => t.state === "parked" && this.hasClearPath(t))
      .map((t) => t.id);
  }
}
