// One playthrough of a level: the lot, the people queue, and N boarding slots.
// Pure logic, no rendering. Player actions return an ordered list of events
// that the scene animates:
//   { type: "enter",  taxiId, slot }
//   { type: "board",  taxiId, slot, personId, color, seats, spawned }
//   { type: "depart", taxiId, slot }
// where `spawned` is the new person appended to the queue tail by the board.
//
// Boarding is automatic: any person in the queue head whose color matches a
// slot taxi with a free seat boards it (cascading). A full taxi departs and
// frees its slot. Win: lot cleared. Lose: nobody in the head can board and the
// player cannot make progress (no empty slot, or no free taxi to send).
export class Level {
  constructor({ grid, queue, slots }) {
    this.grid = grid;
    this.queue = queue;
    this.slots = new Array(slots).fill(null);
    this.status = "playing"; // 'playing' | 'won' | 'lost'
  }

  hasFreeSlot() {
    return this.slots.includes(null);
  }

  // Ids of taxis the player may currently send into a slot.
  selectableTaxiIds() {
    if (this.status !== "playing" || !this.hasFreeSlot()) return [];
    return this.grid.freeTaxiIds();
  }

  // Sends a free taxi into an empty slot. Returns events, or null if illegal.
  selectTaxi(taxiId) {
    if (!this.selectableTaxiIds().includes(taxiId)) return null;

    const taxi = this.grid.getTaxi(taxiId);
    const slot = this.slots.indexOf(null);
    this.grid.removeFromGrid(taxi);
    taxi.state = "active";
    this.slots[slot] = taxi;

    const events = [{ type: "enter", taxiId, slot }];
    this._autoBoard(events);
    this._checkEnd();
    return events;
  }

  _findBoarding() {
    const head = this.queue.head();
    for (let i = 0; i < head.length; i++) {
      const slot = this.slots.findIndex((t) => t && t.color === head[i].color);
      if (slot !== -1) return { index: i, slot };
    }
    return null;
  }

  _autoBoard(events) {
    let match;
    while ((match = this._findBoarding())) {
      const taxi = this.slots[match.slot];
      const { removed, spawned } = this.queue.removeAt(match.index);
      taxi.seatsFilled += 1;
      events.push({
        type: "board",
        taxiId: taxi.id,
        slot: match.slot,
        personId: removed.id,
        color: removed.color,
        seats: taxi.seatsFilled,
        spawned,
      });
      if (taxi.isFull) {
        taxi.state = "departed";
        this.slots[match.slot] = null;
        events.push({ type: "depart", taxiId: taxi.id, slot: match.slot });
      }
    }
  }

  _checkEnd() {
    if (this.grid.isCleared()) {
      this.status = "won";
    } else if (!this.hasFreeSlot() || this.grid.freeTaxiIds().length === 0) {
      this.status = "lost";
    }
  }
}
