// Endless, randomly-colored queue of people, fully visible to the player as
// a `previewSize`-long strip. Only the person at the front (index 0) is ever
// eligible to board; removing it shifts the rest forward and appends a
// freshly generated person at the tail, so the preview is always full.
export class Queue {
  constructor({ previewSize, colors, rng = Math.random, initialColors = [] }) {
    this.previewSize = previewSize;
    this.colors = colors;
    this.rng = rng;
    this._nextId = 0;
    this.preview = [];
    for (let i = 0; i < previewSize; i++) {
      const color = i < initialColors.length ? initialColors[i] : this._randomColor();
      this.preview.push(this._makePerson(color));
    }
  }

  _randomColor() {
    return this.colors[Math.floor(this.rng() * this.colors.length)];
  }

  _makePerson(color) {
    return { id: this._nextId++, color };
  }

  peek() {
    return this.preview.slice();
  }

  front() {
    return this.preview[0];
  }

  // Removes the front person, shifts the rest forward, and appends a new
  // random person at the tail so the preview stays full.
  popFront() {
    const [removed] = this.preview.splice(0, 1);
    this.preview.push(this._makePerson(this._randomColor()));
    return removed;
  }
}
