// Orchestrates one playthrough of a level: the grid of parked taxis, the
// people queue, a fixed number of pickup bays taxis load in simultaneously,
// and win detection. Pure logic, no rendering — GameScene drives this and
// reacts to the resulting state.
//
// Boarding is automatic and strictly FIFO: whenever the person at the front
// of the queue matches the color of some taxi currently in a bay, they board
// immediately (cascading through as many matches as are queued up). If the
// front person matches no active bay taxi, the queue simply waits — there is
// no fail state, but with fewer bays than colors it's possible to fill every
// bay with colors the queue doesn't currently need. `recallTaxi` lets the
// player send a bay taxi back to the grid (keeping any seats it already
// filled) to free the bay for a better choice. All difficulty comes from
// choosing which blocked-taxi order to clear and which colors to keep active
// across a limited number of bays.
export class Level {
  constructor({ grid, queue, pickupBays }) {
    this.grid = grid;
    this.queue = queue;
    this.bays = new Array(pickupBays).fill(null);
    this.status = "playing"; // 'playing' | 'won'
  }

  hasFreeBay() {
    return this.bays.includes(null);
  }

  // Sends a parked taxi with a clear path into a free pickup bay.
  selectTaxi(taxiId) {
    if (this.status !== "playing") return false;
    const bayIndex = this.bays.indexOf(null);
    if (bayIndex === -1) return false;

    const taxi = this.grid.getTaxi(taxiId);
    if (!taxi || taxi.state !== "parked" || !this.grid.hasClearPath(taxi)) {
      return false;
    }

    this.grid.removeFromGrid(taxi);
    taxi.state = "active";
    this.bays[bayIndex] = taxi;
    this._autoBoard();
    return true;
  }

  // Sends a bay taxi back to its grid slot, freeing the bay. Any seats it
  // already filled are preserved for next time it's selected.
  recallTaxi(taxiId) {
    const bayIndex = this.bays.findIndex((t) => t && t.id === taxiId);
    if (bayIndex === -1) return false;

    const taxi = this.bays[bayIndex];
    this.bays[bayIndex] = null;
    taxi.state = "parked";
    this.grid.returnToGrid(taxi);
    return true;
  }

  _autoBoard() {
    while (this.status === "playing") {
      const front = this.queue.front();
      const bayIndex = this.bays.findIndex((t) => t && t.color === front.color);
      if (bayIndex === -1) break; // front doesn't match any active taxi -> wait

      this.queue.popFront();
      const taxi = this.bays[bayIndex];
      taxi.seatsFilled += 1;

      if (taxi.isFull) {
        taxi.state = "departed";
        this.bays[bayIndex] = null;
        if (this.grid.isCleared()) {
          this.status = "won";
        }
      }
    }
  }
}
