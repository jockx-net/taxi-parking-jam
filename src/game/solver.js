import { Taxi } from "./Taxi.js";
import { GridLot } from "./GridLot.js";
import { loadLevel } from "./LevelLoader.js";

// True if the lot can be fully cleared ignoring slots and the queue. Removing a
// taxi can only free others, so greedily removing any free taxi is exhaustive.
export function isLotClearable(config) {
  return unjamDepth(config) !== Infinity;
}

// Number of "waves" needed to clear the lot when every free taxi leaves at
// once: a rough measure of how tangled it is (Infinity if it can't be cleared).
export function unjamDepth(config) {
  const taxis = config.taxis.map((t) => new Taxi({ ...t, capacity: config.taxiCapacity }));
  const grid = new GridLot(config.grid.width, config.grid.height, taxis);
  let depth = 0;
  for (;;) {
    const ids = grid.freeTaxiIds();
    if (!ids.length) return grid.isCleared() ? depth : Infinity;
    for (const id of ids) {
      const taxi = grid.getTaxi(id);
      grid.removeFromGrid(taxi);
      taxi.state = "departed";
    }
    depth += 1;
  }
}

function replay(config, moves) {
  const level = loadLevel(config);
  for (const id of moves) level.selectTaxi(id);
  return level;
}

function stateKey(level) {
  const taxis = level.grid
    .allTaxis()
    .map((t) => `${t.id}${t.state[0]}${t.seatsFilled}`)
    .join("|");
  return `${taxis}#${level.queue.remaining()}#${level.queue.peek().map((p) => p.id).join(",")}`;
}

// Depth-first search over the player's taxi choices (queue is deterministic).
// Returns a winning move list, null if provably unwinnable, or undefined if the
// node budget ran out first.
export function solve(config, nodeLimit = 20000) {
  const seen = new Set();
  let nodes = 0;
  let exhausted = false;

  function visit(moves) {
    const level = replay(config, moves);
    if (level.status === "won") return moves;
    if (level.status === "lost") return null;
    const key = stateKey(level);
    if (seen.has(key)) return null;
    seen.add(key);
    if (++nodes > nodeLimit) {
      exhausted = true;
      return null;
    }
    const head = level.queue.peek();
    const score = (id) => {
      const taxi = level.grid.getTaxi(id);
      return head.reduce((s, p, i) => s + (p.color === taxi.color ? (i < level.queue.headSize ? 10 : 3) : 0), 0);
    };
    const options = level.selectableTaxiIds().sort((a, b) => score(b) - score(a));
    for (const id of options) {
      const found = visit([...moves, id]);
      if (found) return found;
      if (exhausted) return null;
    }
    return null;
  }

  const result = visit([]);
  if (result) return result;
  return exhausted ? undefined : null;
}

// Fraction of games won by a player who picks a random selectable taxi each turn.
export function randomWinRate(config, games = 200, rng = Math.random) {
  let wins = 0;
  for (let g = 0; g < games; g++) {
    const level = loadLevel(config);
    while (level.status === "playing") {
      const ids = level.selectableTaxiIds();
      level.selectTaxi(ids[Math.floor(rng() * ids.length)]);
    }
    if (level.status === "won") wins++;
  }
  return wins / games;
}
