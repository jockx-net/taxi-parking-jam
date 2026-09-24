# Taxi Parking Jam — Specification

Casual web puzzle (Phaser 3 + Vite). Empty a parking lot of colored taxis by
sending them, one at a time, into a small number of boarding slots where
people from a visible queue climb aboard.

## Objective

Select a taxi to occupy one of the available boarding slots, wait until it is
filled, and it leaves. Clear every taxi in the lot to win.

## The lot (a 2D maze to untangle)

- A rectangular grid. Each taxi occupies 1–3 consecutive cells in a straight
  line and faces one of four directions (up/down/left/right).
- A taxi can only drive straight forward, out of the lot, in the direction it
  faces. It is **free** when every cell ahead of its front, up to the grid
  edge, is empty. Otherwise it is **blocked** by whatever taxi sits in the way.
- Taxis face all four directions, so blocking forms chains and cycles-free
  dependency mazes the player must untangle by choosing the order.
- Every shipped level must be fully clearable (verified by a test).

## Boarding slots

- The level defines N slots. Tapping a free taxi sends it into an empty slot.
  If no slot is empty, taps are ignored.
- A taxi stays in its slot until all its seats are filled, then departs and
  frees the slot. There is no recall / undo: the choice is final.
- Taxis have a single color and a fixed seat capacity per level.

## The queue

- A fixed, fully visible line of colored people: exactly one person per taxi
  seat in the level, so nobody is ever left over and the game is a
  deterministic, perfect-information puzzle (retrying replays the same queue).
  The order was generated with a seed and the level is verified winnable by a
  solver.
- The first H people form the **queue head**. Any person in the head whose
  color matches a taxi in a slot (with a free seat) boards it — it is **not**
  strictly first-in-line. Boarding is automatic and cascades until nothing in
  the head matches.
- When someone boards, everyone behind shifts forward, which may bring a new
  person into the head and reveal another at the end of the visible preview.
- Boarding is animated (person walks to the taxi, seat fills, taxi departs).

## End conditions

- **Win:** all taxis have departed.
- **Lose:** no person in the queue head can board any taxi in a slot, and the
  player cannot make progress: there is no empty slot, or no free taxi to send.

## Difficulty parameters (per level)

- `slots` — number of boarding slots (fewer = harder).
- `queueHeadSize` — how many people at the front can board (fewer = harder).
- Grid size, number of taxis, number of colors, taxi lengths/directions,
  `taxiCapacity`, and `queuePreviewSize` (visibility only).

## Presentation

- Portrait 720x1280 canvas, FIT-scaled and centered.
- Stylized 2D cartoon art: top-down taxis per color and length, people
  sprites, a parking-lot backdrop with slot bays. Delivered after mechanics.

## Out of scope for the MVP

Undo/recall, hints, power-ups, scoring/stars, monetization, sound, mobile
packaging.
