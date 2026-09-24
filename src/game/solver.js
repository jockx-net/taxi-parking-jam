import { Taxi } from "./Taxi.js";
import { GridLot } from "./GridLot.js";

// True if the lot can be fully cleared ignoring slots and the queue. Removing a
// taxi can only free others, so greedily removing any free taxi is exhaustive.
export function isLotClearable(config) {
  const taxis = config.taxis.map((t) => new Taxi({ ...t, capacity: config.taxiCapacity }));
  const grid = new GridLot(config.grid.width, config.grid.height, taxis);
  let ids;
  while ((ids = grid.freeTaxiIds()).length) {
    const taxi = grid.getTaxi(ids[0]);
    grid.removeFromGrid(taxi);
    taxi.state = "departed";
  }
  return grid.isCleared();
}

// Length of the longest chain of "must leave before" dependencies: a rough
// measure of how tangled the lot is (0 = every taxi starts free).
export function unjamDepth(config) {
  const taxis = config.taxis.map((t) => new Taxi({ ...t, capacity: config.taxiCapacity }));
  const grid = new GridLot(config.grid.width, config.grid.height, taxis);
  let depth = 0;
  for (;;) {
    const ids = grid.freeTaxiIds();
    if (!ids.length) return depth;
    for (const id of ids) {
      const taxi = grid.getTaxi(id);
      grid.removeFromGrid(taxi);
      taxi.state = "departed";
    }
    depth += 1;
  }
}
