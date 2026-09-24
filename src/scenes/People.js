// Drives one person sprite: walking (facing the way it moves, limbs swinging) and
// idle fidgets (look around, scratch head or belly, check a watch).
const STRIDE = 9; // pixels walked per walk-cycle frame

const IDLE_ACTIONS = [
  { weight: 3, steps: [["lookL", 550], ["lookR", 700]] },
  { weight: 2, steps: [["head0", 180], ["head1", 180], ["head0", 180], ["head1", 180], ["head0", 180]] },
  { weight: 2, steps: [["belly0", 220], ["belly1", 220], ["belly0", 220], ["belly1", 220]] },
  { weight: 2, steps: [["watch0", 600], ["watch1", 900], ["watch0", 300]] },
];

function pickAction() {
  const total = IDLE_ACTIONS.reduce((sum, a) => sum + a.weight, 0);
  let r = Math.random() * total;
  for (const action of IDLE_ACTIONS) {
    r -= action.weight;
    if (r <= 0) return action;
  }
  return IDLE_ACTIONS[0];
}

export class PersonView {
  constructor(sprite, now) {
    this.sprite = sprite;
    this.walking = false;
    this.distance = 0;
    this.plan = null; // { steps, index, until }
    this.nextAt = now + 300 + Math.random() * 4000;
  }

  stand(now) {
    this.walking = false;
    this.plan = null;
    this.sprite.setFrame("stand").setFlipX(false);
    this.nextAt = now + 1500 + Math.random() * 4500;
  }

  // Call with the distance just moved; picks the walk frame and facing.
  walkStep(dx, dy) {
    this.walking = true;
    this.plan = null;
    this.distance += Math.hypot(dx, dy);
    const horizontal = Math.abs(dx) >= Math.abs(dy);
    const dir = horizontal ? (dx < 0 ? "left" : "right") : dy > 0 ? "down" : "up";
    const frame = Math.floor(this.distance / STRIDE) % 4;
    this.sprite.setFrame(`${dir === "right" ? "left" : dir}${frame}`).setFlipX(dir === "right");
  }

  update(now) {
    if (this.walking) return;
    if (!this.plan) {
      if (now < this.nextAt) return;
      this.plan = { steps: pickAction().steps, index: 0, until: 0 };
    }
    if (now < this.plan.until) return;
    if (this.plan.index >= this.plan.steps.length) {
      this.stand(now);
      return;
    }
    const [frame, ms] = this.plan.steps[this.plan.index++];
    this.sprite.setFrame(frame);
    this.plan.until = now + ms;
  }
}
