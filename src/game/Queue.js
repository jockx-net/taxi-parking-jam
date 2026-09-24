// The people queue: a fixed, fully known sequence (one person per taxi seat in
// the level). Only the first `previewSize` people are shown; the first
// `headSize` of those are the head, and any head person may board a matching
// taxi. Removing someone shifts everyone behind forward, which may bring a new
// person into the visible preview.
export class Queue {
  constructor({ people, previewSize, headSize }) {
    this.previewSize = previewSize;
    this.headSize = Math.min(headSize, previewSize);
    this.upcoming = people.map((color, id) => ({ id, color }));
  }

  peek() {
    return this.upcoming.slice(0, this.previewSize);
  }

  head() {
    return this.upcoming.slice(0, this.headSize);
  }

  remaining() {
    return this.upcoming.length;
  }

  // Removes the person at visible `index`. Returns { removed, spawned } where
  // `spawned` is the person newly revealed at the tail of the preview, or null.
  removeAt(index) {
    const [removed] = this.upcoming.splice(index, 1);
    return { removed, spawned: this.upcoming[this.previewSize - 1] ?? null };
  }
}
