# Taxi Parking Jam

Casual web puzzle: untangle a parking-lot maze of colored taxis, send them into
a few boarding slots, and let the visible queue fill them up. Full rules are in
[SPEC.md](SPEC.md).

## Run

```
npm install
npm run dev        # http://localhost:5173/
npm test           # game-logic unit tests (no browser needed)
npm run build
```

## Layout

- `src/game/` — pure logic: `Taxi`, `GridLot` (maze/blocking), `Queue`,
  `Level` (slots, auto-boarding, win/lose, events), `LevelLoader`, `solver`.
- `src/scenes/` — Phaser scenes; `GameScene` animates the events `Level`
  returns (taxi drives to slot, people walk aboard, taxi departs).
- `src/data/levels/` — generated level JSON (do not hand-edit).
- `tools/gen-levels.mjs` — regenerates the levels: seeded jammed lots, a fixed
  visible queue, each verified winnable by the solver and banded by how often a
  random player wins. `tools/sim.mjs` prints per-level bot win rates.

## Level format

```json
{
  "id": "level001", "name": "Level 1", "seed": 1299,
  "grid": { "width": 4, "height": 4 },
  "colors": ["red", "blue"],
  "taxiCapacity": 2, "slots": 3,
  "queueHeadSize": 5, "queuePreviewSize": 11,
  "taxis": [{ "id": "t1", "color": "red", "x": 2, "y": 3, "dir": "right", "length": 3 }],
  "queue": ["red", "blue", "..."]
}
```

A taxi's `x`/`y` is its front cell; its body extends backwards from `dir`. The
`queue` holds exactly one person per seat, so the game is a deterministic
perfect-information puzzle. Difficulty knobs: `slots`, `queueHeadSize`, grid
size, taxi count, colors and `taxiCapacity`.
