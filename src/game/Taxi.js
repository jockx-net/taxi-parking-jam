export class Taxi {
  constructor({ id, color, capacity, x, y, exitDir }) {
    this.id = id;
    this.color = color;
    this.capacity = capacity;
    this.x = x;
    this.y = y;
    this.exitDir = exitDir;
    this.seatsFilled = 0;
    this.state = "parked"; // 'parked' | 'active' | 'departed'
  }

  get isFull() {
    return this.seatsFilled >= this.capacity;
  }
}
