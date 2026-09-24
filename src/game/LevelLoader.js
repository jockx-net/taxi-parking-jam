import { Taxi } from "./Taxi.js";
import { GridLot } from "./GridLot.js";
import { Queue } from "./Queue.js";
import { Level } from "./Level.js";

// Builds a playable Level instance from a level definition (see
// src/data/levels/*.json for the schema and README.md for field docs).
export function loadLevel(config, { rng } = {}) {
  const taxis = config.taxis.map(
    (t) =>
      new Taxi({
        id: t.id,
        color: t.color,
        capacity: config.taxiCapacity,
        x: t.x,
        y: t.y,
        exitDir: t.exitDir,
      })
  );

  const grid = new GridLot(config.grid.width, config.grid.height, taxis);

  const queue = new Queue({
    previewSize: config.queuePreviewSize,
    colors: config.colors,
    initialColors: config.initialQueueColors ?? [],
    ...(rng ? { rng } : {}),
  });

  return new Level({ grid, queue, pickupBays: config.pickupBays });
}
