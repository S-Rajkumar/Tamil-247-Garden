/**
 * Nudging a player who has stopped moving.
 *
 * Someone stuck on a wheel of unfamiliar letters has no way of knowing that
 * Shuffle is free, or that Restart exists at all. Rather than explain the
 * whole hint bar up front, the game says nothing until it is clear something
 * is wrong, and then points at the cheapest way out first.
 *
 * Elapsed time, not a countdown. A `setTimeout` keeps running while the
 * platform has the game paused, so a player who came back after five minutes
 * away would be met by the loudest nudge before they had touched anything.
 * The watcher compares timestamps and is reset on resume, so only time spent
 * actually looking at the puzzle counts.
 */

const active = new Set();

/** Called from the platform's resume: time spent paused was not idling. */
export function resetIdle() {
  active.forEach((w) => w.reset());
}

/**
 * @param root    the screen; any pointer or key activity inside it counts
 * @param steps   [{ after: ms, name }], in ascending order
 * @param onStep  (name) => void, called once per step until something happens
 */
export function watchIdle(root, steps, onStep) {
  let last = Date.now();
  let firedTo = -1;
  let timer = null;

  const bump = () => {
    last = Date.now();
    if (firedTo >= 0) {
      firedTo = -1;
      onStep(null);          // whatever was pointed at, stop pointing at it
    }
  };

  const tick = () => {
    const idleFor = Date.now() - last;
    for (let i = steps.length - 1; i > firedTo; i--) {
      if (idleFor >= steps[i].after) {
        firedTo = i;
        onStep(steps[i].name);
        break;
      }
    }
  };

  // `pointerdown` rather than `click`: a drag across the wheel that never
  // completes a word is still someone playing, and must not be called idle.
  const events = ['pointerdown', 'pointermove', 'keydown'];
  const onMove = (ev) => {
    // A bare pointermove with no button down is a mouse drifting, not play.
    if (ev.type === 'pointermove' && !ev.buttons) return;
    bump();
  };
  events.forEach((e) => root.addEventListener(e, onMove, { passive: true }));

  timer = setInterval(tick, 1000);

  const watcher = {
    reset: bump,
    stop() {
      clearInterval(timer);
      events.forEach((e) => root.removeEventListener(e, onMove));
      active.delete(watcher);
      if (firedTo >= 0) onStep(null);
    },
  };
  active.add(watcher);
  return watcher;
}
