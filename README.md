# Taxi Parking Jam

Casual puzzle game: clear a parking lot of colored taxis. Taxis block each
other's straight-line exit path, so you choose the order to send them into a
small number of pickup bays. People from a fully-visible, endless queue board
automatically — the person at the front boards any bay taxi whose color
matches, the instant one is available. If the front person's color has no
match among the active bay taxis, they simply wait; there is no fail state.
All the challenge comes from unjamming the grid in the right order so the
right color is active in a bay by the time the queue calls for it.

## Running it

```
npm install
npm run dev
```

Open the printed `http://localhost:5173/` URL in a browser.

## Running the core-logic tests

```
npm test
```

These cover the grid/blocking logic, the queue, and the auto-boarding/win
rules in `src/game/` without needing a browser.

## Project layout

- `src/game/` — pure game logic, no rendering:
  - `Taxi.js` — a single taxi's color/capacity/position/state.
  - `GridLot.js` — the parking grid; computes whether a taxi's straight-line
    exit path is blocked by other parked taxis.
  - `Queue.js` — the endless, fully-visible people queue (a `previewSize`-long
    strip); only the front person is ever eligible to board.
  - `Level.js` — orchestrates one playthrough: a fixed number of pickup bays,
    sending a taxi into a free bay, and automatic FIFO boarding that cascades
    until the front person's color has no matching active taxi. Win when the
    grid is fully cleared; there is no lose condition.
  - `LevelLoader.js` — builds a `Level` from a level JSON config.
- `src/scenes/` — Phaser scenes (Boot, Menu, LevelSelect, Game, Result).
- `src/data/levels/` — level definitions, see schema below.

## Adding a level

Add a new `levelNNN.json` file to `src/data/levels/` and import/append it in
`src/data/levels/index.js`. Schema:

```json
{
  "id": "level009",
  "name": "Level 9",
  "grid": { "width": 4, "height": 4 },
  "colors": ["red", "blue", "green", "yellow"],
  "taxiCapacity": 3,
  "pickupBays": 2,
  "queuePreviewSize": 12,
  "taxis": [
    { "id": "t1", "color": "red", "x": 0, "y": 0, "exitDir": "down" }
  ]
}
```

- `grid.width` / `grid.height`: grid dimensions. `x`/`y` are 0-indexed,
  `y = 0` is the top row.
- `exitDir`: `"up"`, `"down"`, `"left"`, or `"right"` — the taxi drives in a
  straight line toward that edge and is blocked if another parked taxi
  occupies any cell along that line.
- `pickupBays`: how many taxis can be actively loading at once. This is the
  main difficulty lever — set it **below** the number of distinct `colors` in
  the level to force the player to choose which colors stay active and time
  the grid unjamming around what's coming up in the queue.
- `queuePreviewSize`: how many upcoming people are visible in the queue
  strip. Kept generous (8-12) since the queue is meant to be fully visible,
  not a source of hidden-information difficulty.
- `taxiCapacity`: seats per taxi, fixed across all taxis in a level for the
  MVP.
- `colors`: the palette people/taxis are drawn from for this level.

The 8 levels shipped with the MVP (`src/data/levels/level001.json` ...
`level008.json`) follow a "column stack" pattern — each column has taxis
stacked vertically, all exiting downward, so the bottom of each column is
immediately available and taxis above it unblock as the ones below depart.
Difficulty ramps by growing the grid, adding more colors than there are bays,
and deepening blocking chains.

## Current MVP scope

Implemented: core loop (grid blocking, multiple pickup bays, automatic
front-of-queue boarding, win-only end state), 8 hand-authored levels, minimal
menu/level-select/result flow, placeholder shape-based rendering (colored
rectangles/circles — see `src/game/colors.js`).

Not yet implemented (see the project plan): real sprite art, undo/hints/
power-ups, scoring, and more levels (target 10-20).
