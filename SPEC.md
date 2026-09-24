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

## The streets

- The lot is surrounded by a **one-way ring road**. Its flow starts at the
  bottom-right corner heading west along the bottom, then north up the left
  side, east along the top, and south down the right side, ending at the **main
  road** that runs below the lot.
- A taxi leaving the lot enters the ring in the direction it faces and drives
  the rest of the loop (a taxi facing down does nearly a full lap, one facing
  right joins the last stretch directly).
- The boarding slots are bays along the main road, which flows west to the
  map **exit**. A taxi drives along the main road, turns into its bay nose-in,
  and once full reverses out and leaves west along the main road.

## Selecting while others are still moving

- The rules resolve a tap instantly, but the animation takes a while. The
  player is **never locked out**: as soon as a taxi starts moving, the next one
  can be selected, and several taxis can be on the road at once.
- Taxis **yield to taxis selected before them**: a later taxi will not join the
  ring road ahead of an earlier one, waits for crossing/approaching earlier
  traffic, follows rather than overtakes, and queues on the main road until the
  earlier taxi that used its bay has fully left it.
- A taxi picks a bay when tapped, but while it is still on the final approach
  it switches to any bay that becomes free, so it never waits at the junction
  for one bay while another is empty.
- Boarding and departure are shown in rules order, each once its taxi has
  really reached its bay (boarding people walk to the taxi only then).
- Win or lose is announced only once all movement has finished.

- The roads are painted as ordinary two-way streets (dashed centre line, a
  direction arrow in each lane's traffic direction) and are wide enough that a
  taxi takes only about 55% of the width. Traffic keeps to the right: clockwise
  round the ring (the inner lane) and westbound in the northern lane of the main
  road, and a taxi turns across the empty lane to enter its bay.

## Boarding slots

- The level defines N slots. Tapping a free taxi sends it into an empty slot.
  If no slot is empty, taps are ignored.
- A taxi stays in its slot until all its seats are filled, then departs and
  frees the slot. There is no recall / undo: the choice is final.
- Taxis have a single color. **Seats follow size:** a taxi's seat count is
  its length plus one (1 cell = 2 seats, 2 = 3, 3 = 4), so larger taxis always
  have more seats.

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
- People who cannot board yet (everyone behind the head) stand inside a picket
  fence; the fence shrinks as the queue shortens. There is no other head marker.
- Boarding is animated (person walks to the taxi, seat fills, taxi departs).

## End conditions

- **Win:** all taxis have departed.
- **Lose:** no person in the queue head can board any taxi in a slot, and the
  player cannot make progress: there is no empty slot, or no free taxi to send.

## Difficulty parameters (per level)

- `slots` — number of boarding slots (fewer = harder).
- `queueHeadSize` — how many people at the front can board (fewer = harder).
- Grid size, number of taxis, number of colors, taxi lengths/directions and
  `queuePreviewSize` (visibility only).

## Presentation

- Portrait 720x1280 canvas, FIT-scaled and centered.
- One reference taxi size everywhere: a lot cell is the same size in every
  level and taxis keep that scale in the lot, on the road and in the bays. Small
  lots are simply drawn smaller, inside a ring road that is never narrower than
  the bays need.
- Everything inside the ring road is plain, uniformly painted concrete (no grid: the cells mean nothing
  to the player).
- Stylized 2D cartoon art: top-down taxis per color and length with a long
  bonnet (grille, headlights, chevrons) so the front is unmistakable, people
  sprites, ring/main road, slot bays.

## Out of scope for the MVP

Undo/recall, hints, power-ups, scoring/stars, monetization, sound, mobile
packaging.
