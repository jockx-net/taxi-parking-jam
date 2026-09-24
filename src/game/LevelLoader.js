import { Taxi } from "./Taxi.js";
import { GridLot } from "./GridLot.js";
import { Queue } from "./Queue.js";
import { Level } from "./Level.js";

// Builds a playable Level from a level definition (schema in SPEC.md/README).
export function loadLevel(config, { rng } = {}) {
  const taxis = config.taxis.map(
    (t) =>
      new Taxi({
        id: t.id,
        color: t.color,
        capacity: config.taxiCapacity,
        x: t.x,
        y: t.y,
        dir: t.dir,
        length: t.length,
      })
  );
  const grid = new GridLot(config.grid.width, config.grid.height, taxis);

  // People are drawn from colors of taxis that haven't departed yet.
  const colorSource = () => {
    const wanted = [...new Set(grid.allTaxis().filter((t) => t.state !== "departed").map((t) => t.color))];
    return wanted.length ? wanted : config.colors;
  };

  const queue = new Queue({
    previewSize: config.queuePreviewSize,
    headSize: config.queueHeadSize,
    colorSource,
    initialColors: config.initialQueueColors ?? [],
    ...(rng ? { rng } : {}),
  });

  return new Level({ grid, queue, slots: config.slots });
}
