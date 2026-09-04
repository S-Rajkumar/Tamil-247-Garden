# Status — Tamil 247 World

Handoff notes, written to be read cold. `README.md` explains how the game
works; this file records where it stands, what is settled, what is not, and the
mistakes that cost time so they do not get made twice.

Last verified: 61 automated checks passing, 0 failing, no console errors, plus a
full play-through of both screens.

**Verifying in a browser: read the DOM, do not trust a screenshot.** The preview
pane serves a cached frame while it is not compositing, so a screenshot taken
two seconds after a click can still show the old numbers. A chart purchase
looked like it was granting letters for free — the DOM had already charged the
coins. Confirm with `document.querySelector(...).textContent`, and use
screenshots only for judging artwork.

---

## Where it stands

A working prototype of a Tamil word-building puzzle wrapped around a garden.
Both halves are playable and connected: words pay coins, coins run the garden,
the garden sets the puzzle's difficulty.

```bash
npm install && npm run dev      # http://localhost:5173
```

**Verified working end to end**

| Area | State |
| --- | --- |
| Puzzle | wheel, drag-select, targets, bonus words, 4 hints, reward card |
| Garden | per-cell land/wall, plant, water, feed, harvest, move-by-swap |
| Wall | 6 tiers, per-block upgrade and sell, feeds defence |
| Pets | 8 species incl. the tiger, duplicates allowed, capped by land |
| Raiders | 11 hunters, birds swoop and grazers graze, defence decides |
| 247 chart | all 247, buy at 100, per-group progress, banyan reward |
| Economy | one currency, several sinks, no exploits found |
| Save | localStorage v6, survives reload |
| Onboarding | new players start with 100 coins |
| Sky | 6 themes, SVG ridges + clouds, rays, vignette, own weather |
| Sound | 108 BPM loop with drums, 11 effects, split music/SFX, saved |
| Playables | SDK wired: lifecycle, cloud save, pause, platform mute |
| Tamil face | bundled, 49 KB — no external request, no device dependency |
| Economy | rebalanced: the garden can turn a profit, skies are free |
| Deadlock | Restart deals a fresh round free — the only escape at 0 coins |

**The Playables SDK is wired in.** Lifecycle, cloud save, pause/resume and
YouTube's own mute all go through `src/platform/playables.js`, which is the
only file in the codebase allowed to mention `ytgame`. Checked against the
published certification requirements, September 2026:

| Requirement | Where |
| --- | --- |
| SDK loads before any game code | `index.html`, above the module script |
| `firstFrameReady` on a loading screen | `index.html` paints `#boot`; `main.js` calls it first |
| `gameReady` only when playable | after the world renders, before the dictionary loads |
| `loadData` awaited before any `saveData` | boot awaits `readSave()`, then `markLoaded()` |
| Saves via `saveData`/`loadData` | `useStorage` swaps the backend at boot |
| Final flush ≤ 64 KiB | worst case measured at **23.5 KiB** |
| Old saves still load | the `v` field and per-key defaults were already there |
| No Page Visibility API | removed; `onPause`/`onResume` instead |
| No overall mute button | music and effects switch separately |
| Silent when YouTube is muted | `isAudioEnabled` + `onAudioEnabledChange` |
| No `navigator.language` | never used; `getLanguage` is available |

**Not started:** submission itself, which is not self-serve — it goes through
the Playables interest form and an approval that can take months.

---

## The numbers that matter

| | |
| --- | --- |
| Validation dictionary | 7,082 words, every one with a meaning |
| Curated targets | 878 words a level may ask for |
| Letter pools | 1,600 — 320 each at 6, 7, 8, 9, 10 letters |
| 247 reachable by play | 209 of 247; the other 38 must be bought |
| Level cap | 10 (a 19×19 garden) |
| Initial bundle | **334 KB** — 2.2% of the 15 MiB target, 1.1% of the 30 MiB cap |
| Loaded after `gameReady` | 614 KB of dictionary, which the game plays without |
| Largest single file | 234 KB, against a 512 KiB per-file guideline |

Over 100 consecutive rounds at any wheel size: 100 distinct wheels, ~380
distinct words. The vocabulary, not the pool count, is now the limit.

---

## Map

| Path | What it is |
| --- | --- |
| `src/tamil/letters.js` | **The only module allowed to touch a Tamil string.** |
| `src/tamil/dictionary.js` | Tier-2 validation and meanings, loaded lazily |
| `src/game/levels.js` | Wheel size, pool selection, target/bonus split |
| `src/game/levelwords.js` | **Generated.** 1,600 pools + their target words |
| `src/game/garden.js` | Cells, planting, walls, pets, raids, level |
| `src/game/state.js` | Coins, letters, save/load, the 247 jackpot |
| `src/art/garden.js` | Every pixel of the garden, one scalable SVG scene |
| `src/art/sky.js` | The six sky themes, as sets of custom properties |
| `src/audio/sound.js` | Web Audio synthesis — no files ship |
| `src/platform/playables.js` | **Every `ytgame` call.** Nothing else touches the SDK |
| `src/fonts/` | The Tamil face and its licence. `node tools/font.mjs` refetches |
| `src/ui/fittext.js` | Shrinks a grapheme cluster to fit its tile |
| `src/ui/` | puzzle · world · chart · reward · toast |
| `tools/dict.mjs` | Wiktionary → validation list, meanings, curated targets |
| `tools/genpools.mjs` | Curated targets → `levelwords.js` |
| `tools/data/` | Downloaded sources. Not shipped. |

Regenerate word data with `npm run dict && node tools/genpools.mjs`.
`tools/data/wiktionary-ta.jsonl` (86 MB) is not in the repo — the download
command is in `THIRD-PARTY.md`.

---

## Rules the code depends on

These are not style preferences. Each one is a bug that already happened.

**Never split a Tamil string yourself.** `"கோயில்"` is three letters and six
JavaScript characters. Everything goes through `letters()`. `.split('')`,
`.length` and indexing are all wrong on Tamil text.

**Never hang state changes off `animation.onfinish`.** A hidden or backgrounded
tab stops compositing, animations never finish, the callback never runs. This
game is paused constantly on Playables. Use a timer; animate for looks only.
Three separate bugs came from this — stacked screens, a frozen reward card, a
total stuck at zero.

**`[hidden]` loses to `display: flex`.** Any component with a display value in
its base rule needs an explicit `[hidden] { display: none }`, or it sits there
as an empty bar.

**Guard anything scheduled from a submit handler.** Every found word re-armed
`setTimeout(finish, 700)`, so one more bonus word inside that window opened a
second reward card.

**The hit target is the diamond, nothing more.** An invisible plate reaching up
over tall plants let you click a tree, and also overlapped the cells behind, so
hovering one tile lit another. Selection lights the *object* when a cell has
one, the ground only when it is bare.

**Interactive geometry scales with count.** Tile size, ring radius and the drag
hit-radius all follow the wheel size; at ten tiles a fixed 30-unit catch area
claims two tiles at once.

**A retired species must not break a save.** Dropping mango and banana crashed
every garden still holding one. The renderer draws nothing for an unknown
species and `pruneUnknownPlants()` clears them on load.

**Check a reward against what it can buy.** The 247 prize was 25,000 while
buying all 247 letters cost 24,700 — completion paid for itself. It is 10,000.

**A save-on-exit handler makes "reset" impossible unless you switch it off.**
`pagehide` fired `save()`, so the console reset deleted the save and the page
wrote it straight back on the way out. It had also been deleting `save.v1` long
after the format reached v6 — a hardcoded key in the wrong module. `clearSave()`
now lives beside the key, and `t247.reset()` suppresses the exit-save first.

**Draw a big animal at normal proportions and scale the group.** The tiger,
drawn large, came out wider than the plot it stood on — which made the tile look
small rather than the tiger look big. It is dog-sized geometry under
`transform="scale(.82)"`, and every other pet stays the reference for what a
tile can hold.

**A theme attribute on the shell will hijack `closest()`.** `#app` carries
`data-sky` for the stylesheet, so `ev.target.closest('[data-sky]')` in the
delegated click handler matched the shell on every click that reached it. The
picker's cards use `data-sky-pick`. Any attribute used for styling is not safe
to also select on in a delegated handler.

**A dark sky needs opaque chrome.** The slot cells were `rgba(255,255,255,.5)`,
which put their dark text at 4.2:1 over the night theme. They are .74 now. Any
translucent surface has to be checked against the darkest theme, not the
default one.

**Audio cannot start before a gesture, and must stop when the page hides.**
No AudioContext exists at import time; the first tap creates and resumes it.
The music loop is a timer, and a hidden tab throttles timers to about one a
second, so it stops on `visibilitychange` and restarts on return rather than
coming back stuttering. That is also the shape `onPause`/`onResume` will want.

**Tamil clusters vary threefold in width, so a fixed tile clips them.**
ப is 21px at a 23px font; ணை is 71px, because the two-part vowel sign ை is drawn
*before* its consonant and each half takes full width. Sizing every tile for the
worst case wastes the wheel, so `fitText` measures each one after layout with a
Range and shrinks only what overflows. `scrollWidth` is no use for this: the
content is centred by flexbox, which reports no overflow either way.

**`String.replace` takes the first match, which is rarely the one you meant.**
A patch adding `drawSkyBtn()` after `drawSound();` landed inside the click
handler rather than the render path, because the handler comes first in the
file. The button rendered blank. Anchor on surrounding lines, or use
`lastIndexOf`, when a call appears more than once.

**A child's z-index cannot escape its parent's stacking context.** The level
tip lives in `.topbar`, which sat at `z-index: 2` alongside `.slots`; the
panel's own `z-index: 30` only competed *inside* the bar, and at a tie the later
element in the DOM won, so the word slots painted straight over the tip. The bar
is `z-index: 5` now. Raise the ancestor, not the child.

**A transient toast is the wrong shape for an explanation.** The level tip was
two toasts, 3.4s each, appearing 460px from the chip that opened them and
pointing at nothing. It is a panel anchored under the chip that stays until
dismissed. Toasts are for outcomes; tips need somewhere to live.

**An inset box-shadow paints under the background image, not over it.** The
moon's crescent was an inset shadow on a disc whose face is a radial gradient,
so it was drawn beneath that gradient and was invisible — the CSS was applied,
computed correctly, and had no effect whatever. It is a `mask-image` now, which
cuts a real bite so the sky shows through it and clips the craters for free.

**A glow belongs behind its light source.** The sun's bloom was a `::before`
with no z-index, so it laid a translucent veil across the whole disc and
flattened the moon. It is `z-index: -1`.

**An `<svg>` is a replaced element: it ignores `right` when width is auto.**
The ridge and treeline layers were positioned with `left: -4%; right: -4%` and
came out sized from their viewBox ratio instead — the treeline was 158px wide in
a 536px frame. Replaced elements need an explicit width.

**SVG `url(#id)` resolves document-wide, to the first match.** Both screens can
be mounted at once during a cross-fade, so a shared gradient id would let the
outgoing screen's defs win and then vanish, leaving the survivor's clouds
unpainted. `skyLayer` mints a fresh id per call.

**A stale dev module looks exactly like a bug in the code.** The play screen
rendered the previous sky markup for a while after the source was correct: the
file on disk, the file Vite served, and `skyLayer()`'s output were all right,
and the DOM still had the old children. Restarting the dev server fixed it.
Before hunting a phantom, fetch the served source and compare it to the DOM.

**A repeating gradient makes rails, not rain.** One gradient draws lines the
full height of the frame; sliding them reads as a moving screen door. A second
repeating gradient banded ACROSS the first, used as a mask, breaks each line
into short streaks with gaps between them. Both live on the same element, so
they move together.

**A constant-width bar is a dash, not a comet.** The shooting star was 2px tall
with a gradient along it, and no fade could make that read as a streak. It
needs a bright round head and a tail that tapers to nothing behind it — a
`clip-path` triangle — aligned to the direction it actually travels.

**A cancelled pointer is not an answer.** `pointercancel` fires when the
browser takes a gesture over as a scroll or a native drag. It was wired to the
same handler as `pointerup`, so a stolen gesture graded whatever was
half-selected — one letter, which can never be a Tamil word, so it always came
back "Not a word". Cancel abandons the selection; only `pointerup` submits.

**Hit-test the release, not just the moves.** Pointer moves are coalesced under
load and a fast flick can jump the gap between two tiles without a single move
landing on the second one. The letter the player let go on has to be picked at
`pointerup` too, or the drag silently builds a one-letter word.

**Never grade a one-letter selection.** The dictionary requires two letters, so
submitting one produces a guaranteed rejection. A drag that failed to catch a
second tile falls away quietly rather than accusing the player of a mistake
they did not make.

**Read "was it already selected" at pointerdown, not pointerup.** By pointerup
the press has already added the letter, so every tap looks like a tap on a
letter you already had — which made the tap-to-take-back branch fire on the
first tap.

**Every input mode needs its own visible controls.** Drag submits on release,
which is its own affordance; tapping has none, so it needed a tick and a cross
on the word itself. "Tap the last letter again to send" was invented, invisible
and never found — the reported symptom was a word growing to
சாலிள்யாவேலை with no way to send or clear it.

**`pick()` returns early for a letter already picked, so it does not repaint.**
The controls are suppressed while the pointer is down; on a tap the press
picks the letter and the release's `pick` is a no-op, so the last paint ran
with the pointer still down and the controls never appeared. The release path
has to repaint explicitly.

**The Playables SDK exists off-platform too, and that is a trap.** The script
loads from youtube.com wherever the page is served, so `ytgame` and every
method on it are present in local development — `loadData` is a real function
there and resolves to `""`. Gating storage on "does this method exist" therefore
took the SDK path outside Playables, read an empty save over a real one, and
made saving a no-op. `IN_PLAYABLES_ENV` is the only honest signal, and `sdk()`
in the adapter returns the SDK only when it will actually do something.

**A device is not guaranteed to have a Tamil font.** Relying on the system
stack meant a player without one saw rows of empty boxes where the entire
subject of the game should be — not a styling problem, a broken game. The
face is bundled now, and it is verified: coverage of all 247 was checked
against the bundled file with every system fallback stripped out of the
stack, so a pass cannot come from the machine happening to have Tamil.

**A word’s letters must all be one size, so the box fits the letter.**
Tamil clusters are genuinely different widths — ர is 13px where ஙௌ is 66px at
the same font size. A fixed-width slot therefore either clipped the wide ones
or shrank them to half their neighbours’ size, which reads as broken even
when every pixel is present. The cell width is a minimum now and the cell
grows to its cluster; when a whole word is still too wide for the screen the
ROW scales through one `--cell-scale`, so the letters stay equal to each
other. Measured: all 870 curated targets fit at full size on a 375px phone,
so the scaling is a safety net that real content never reaches.

**The garden could not make money, at all.** Every plant sold for less than
its own seed, and on top of that the only way to grow one was to pay for
water: a jasmine cost 840 to bring to harvest and paid back 30. Break-even
needed a +200% pet bonus. `growAll` — free growth on a completed round —
was exported and never called, left behind when growth was made paid-only.
Plants ripen a stage per round again, water only hurries them, and every
yield beats its seed by about 1.7x. Not more than that: plots grow with the
square of the garden, so a generous multiplier has the garden out-earning
the word game several times over by level 5.

**Prices have to be read against income, and against each other.** At 61
coins a round: a ruby wall round a small garden was 132,480 coins (2,100
rounds), the full garden 50,980 (836 rounds, which put the 9- and 10-letter
wheels — 960 of the 1,600 pools — out of anyone’s reach), and the six skies
7,750, which is TWICE what finishing the 247 costs. Wallpaper outpriced the
collection the game is named after.

**A ladder is not a choice.** With every seed ripening in the same two
rounds, the dearest was simply the best and the cheap ones existed only
until you could afford better. Each species has its own `rounds` now: a
jasmine turns over every round but must be replanted every round, a palmyra
ties its plot up for six and pays about 2.5x as much for it. Water and feed
buy a number of the plant's OWN rounds rather than a flat number of points
— a fixed amount would skip a whole palmyra for the price of a jasmine and
undo the ripening times entirely.

**A count of zero does not say why.** The Wall button ran "upgrade every
block you can afford", got back a count of 0, and reported "not enough
coins" — to a player holding 536 coins who had simply never built a wall.
Zero has three causes there: no blocks exist, every block is already at
the top, or the purse really is short. The function returns `blocks` and
`cheapest` alongside the count now, so the message can be true, and the
no-wall case says how a wall is actually started.

**A `disabled` button fires no click, so it can never explain itself.**
The seed, pet and sky cards were all disabled when unavailable, and all
three had a message written for exactly that case sitting unreachable in
the handler behind them — tapping gave silence. They use `aria-disabled`
now, which keeps the meaning for assistive tech and lets the tap through.

**A tutorial teaches one thing, and never traps anyone.** Joining letters by
dragging is the whole game and is not guessable; everything else is behind a
labelled button and can wait. The overlay is `pointer-events: none` apart
from Skip, so a player who works the gesture out in two seconds is not stuck
in a cutscene, and ANY joined word ends it — not only the one being traced.
A save from before the flag existed is treated as already taught.

**A percentage margin resolves against the WIDTH, even for `margin-top`.**
`margin-top: 26%` put the tutorial card over the word slots on a phone.

**Idle is elapsed time, not a countdown.** A `setTimeout` keeps running while
the platform has the game paused, so a player returning after five minutes
away would be met by the loudest nudge before touching anything. The watcher
compares timestamps and `onResume` resets it, so only time spent actually
looking at the puzzle counts. A drag in progress counts as playing; a mouse
merely crossing the page does not.

**Never mix isometric tile scales.** Ground and buildings must share a tile
width. This is why the Kenney packs were dropped.

**Editing files with Unicode in them: use the edit tools, not shell-escaped
Python.** Escaping mangled patches four times this session, twice silently —
once writing backspace control characters into a regex that then matched
nothing, once leaving a `null` in the UI. If a patch "applies" but the
behaviour does not change, suspect this first.

---

## Decisions that are settled

- **Levels come from the garden**, read off its radius, not a counter. One cell
  is level 1; each ring is another; it caps at 10.
- **The wheel gains a letter every two levels** to 10, then the player picks any
  size from 6 to 10 — the Expand button becomes the Wheel picker.
- **Growth is bought, never given.** Levels pay for growth rather than being it.
- **Harvest empties the plot**, so replanting costs again.
- **Two word tiers, graded differently.** A target must be recognisable; a bonus
  need only be real. Never tell a player a real word is wrong.
- **The wall is a stat**, not decoration — it and the pets are the defence roll.
- **English interface.** Tamil appears only where it is the subject.

---

## Open, in rough priority order

1. **More vocabulary.** 878 curated targets is bounded by how many Tamil words
   have usage frequency data, not by the dictionary. A written-text corpus
   (Tamil Wikipedia, or a body of stories) would widen it without lowering the
   bar. This is the single biggest quality lever left.
2. **Bulk planting and harvesting.** A level-10 garden is 361 cells; watering
   has a bulk action, the others do not.
3. **Duplicate pets stack hard** — seven of one animal is a large flat bonus.
   Diminishing returns per duplicate.
4. **Rename.** "Word World" collides with the PBS Kids series, whose premise is
   also words forming the objects they name. "Tamil 247 World" is legally clear
   but reads as an alphabet-learning app, which risks the made-for-kids
   rejection the platform applies.
5. **Custom art before launch** if the garden is to look like nobody else's.

---

## The raid-deletes-my-stuff report, settled

A report that a grazing raid deleted wall blocks and a pet. Testing never
reproduced it, so this time the question was answered by enumeration instead:
only four lines in the codebase can remove a wall or a pet, and no raid reaches
any of them.

| Line | What it is | Reachable from a raid |
| --- | --- | --- |
| `garden.js:108` | `setCellType`, flipping a wall cell to land | no |
| `garden.js:322` | `sellWall` | no |
| `garden.js:374` | `adoptPet` | no (adds) |
| `garden.js:383` | `releasePet` | no |

`rollRaid` writes only `state.plants`, `state.perched` and `state.raid`, and
`nibble` writes only `state.plants`. A repelled goat raid was run live with a
tiger defending and walls, pets, cells and plants all came back byte-identical.

So a raid cannot delete either. What can is a mis-tap: `setCellType` and
`releasePet` both sit one tap away in the cell panel and the pet chip. If it
recurs, the thing to check is whether a tap landed on **To land** or on a pet
chip's ✕ rather than what the raid did.
