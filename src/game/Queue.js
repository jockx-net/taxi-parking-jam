// Endless queue of colored people, fully visible as a `previewSize`-long
// strip. The first `headSize` people are the head: any of them may board a
// matching taxi. Removing someone shifts the rest forward and appends a new
// person, drawn from `colorSource()` (the colors still wanted by the lot).
export class Queue {
  constructor({ previewSize, headSize, colorSource, rng = Math.random, initialColors = [] }) {
    this.previewSize = previewSize;
    this.headSize = Math.min(headSize, previewSize);
    this.colorSource = colorSource;
    this.rng = rng;
    this._nextId = 0;
    this.people = [];
    for (let i = 0; i < previewSize; i++) {
      const color = i < initialColors.length ? initialColors[i] : this._randomColor();
      this.people.push(this._makePerson(color));
    }
  }

  _randomColor() {
    const colors = this.colorSource();
    return colors[Math.floor(this.rng() * colors.length)];
  }

  _makePerson(color) {
    return { id: this._nextId++, color };
  }

  peek() {
    return this.people.slice();
  }

  head() {
    return this.people.slice(0, this.headSize);
  }

  // Removes the person at `index`, shifts the rest forward, and appends a new
  // person at the tail. Returns { removed, spawned }.
  removeAt(index) {
    const [removed] = this.people.splice(index, 1);
    const spawned = this._makePerson(this._randomColor());
    this.people.push(spawned);
    return { removed, spawned };
  }
}
