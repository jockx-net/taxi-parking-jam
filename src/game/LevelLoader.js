import { Taxi } from "./Taxi.js";
import { GridLot } from "./GridLot.js";
import { Queue } from "./Queue.js";
import { Level } from "./Level.js";

// Builds a playable Level from a level definition (schema in SPEC.md).
export function loadLevel(config) {
  const taxis = config.taxis.map(
    (t) =>
      new Taxi({
        id: t.id,
        color: t.color,
        x: t.x,
        y: t.y,
        dir: t.dir,
        length: t.length,
      })
  );
  const grid = new GridLot(config.grid.width, config.grid.height, taxis);
  const queue = new Queue({
    people: config.queue,
    previewSize: config.queuePreviewSize,
    headSize: config.queueHeadSize,
  });
  return new Level({ grid, queue, slots: config.slots });
}
