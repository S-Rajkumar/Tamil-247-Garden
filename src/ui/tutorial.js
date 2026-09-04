/**
 * The first-run tutorial: how to join letters into a word.
 *
 * It teaches exactly one thing. Joining letters by dragging across them is the
 * whole game, it is not guessable, and a player who does not discover it in
 * the first few seconds simply leaves — on Playables there is no manual and no
 * patience. Everything else in the game (planting, walls, pets, the 247) is
 * reachable from a labelled button and can wait until someone taps it.
 *
 * How it teaches: a ghost finger traces a real target word across the real
 * wheel, on a loop, with the word's meaning as the caption. It shows the
 * answer on purpose — the lesson is the gesture, not the vocabulary.
 *
 * What it must never do:
 *   - block the wheel. The overlay is `pointer-events: none` except for Skip,
 *     so a player who works it out immediately is never in a cutscene.
 *   - depend on an animation finishing. Playables pauses this game constantly
 *     and a paused tab never fires `onfinish`; the loop is decorative and the
 *     ending is driven by the player, not by a timer.
 */

/** Map a word's letters onto tiles, honouring repeats. */
function pathFor(target, tiles) {
  const used = new Set();
  const out = [];
  for (const letter of target.ls) {
    const i = tiles.findIndex((t, n) => t.letter === letter && !used.has(n));
    if (i < 0) return null;          // the wheel cannot spell it; teach nothing
    used.add(i);
    out.push(tiles[i]);
  }
  return out;
}

/**
 * @param arc     the wheel element, whose 240x240 viewBox the tiles live in
 * @param tiles   [{ letter, x, y, node }]
 * @param targets the level's target words
 * @param onEnd   called once, whether the player learns it or skips it
 */
export function startTutorial({ arc, tiles, targets, onEnd }) {
  // The shortest word makes the shortest drag, which is the easiest first go.
  const ordered = [...targets].sort((a, b) => a.ls.length - b.ls.length);
  let path = null;
  let target = null;
  for (const t of ordered) {
    path = pathFor(t, tiles);
    if (path) { target = t; break; }
  }
  if (!path || path.length < 2) { onEnd(); return { stop() {} }; }

  const layer = document.createElement('div');
  layer.className = 'tut';
  layer.innerHTML = `
    <div class="tut-card">
      <b>Join the letters</b>
      <p>Press a letter and drag across the others without lifting.</p>
      <p class="tut-word">Spell <b>“${target.en}”</b></p>
    </div>
    <button class="tut-skip" data-tut-skip>Skip</button>`;

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('class', 'tut-path');
  svg.setAttribute('viewBox', '0 0 240 240');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = `
    <polyline class="tut-trail" points="${path.map((p) => `${p.x},${p.y}`).join(' ')}"/>
    <g class="tut-hand">
      <circle class="tut-halo" r="17"/>
      <circle class="tut-tip" r="7"/>
    </g>`;

  arc.appendChild(svg);
  // Fall all the way back to the wheel itself. A missing host would throw, and
  // it would throw on a brand new player's very first screen — the one moment
  // where a crash costs the whole player rather than one round.
  const screen = arc.closest?.('.screen') || arc.parentElement || arc;
  screen.appendChild(layer);

  // The finger. Held a moment at each letter so the eye can follow it, then a
  // pause on the last before it starts over.
  const hand = svg.querySelector('.tut-hand');
  const holdAt = path.map((p, i) => ({
    transform: `translate(${p.x}px, ${p.y}px)`,
    offset: (i / path.length) * 0.82,
  }));
  const anim = hand.animate(
    [
      { transform: `translate(${path[0].x}px, ${path[0].y}px)`, opacity: 0, offset: 0 },
      { transform: `translate(${path[0].x}px, ${path[0].y}px)`, opacity: 1, offset: 0.06 },
      ...holdAt.slice(1),
      { transform: `translate(${path[path.length - 1].x}px, ${path[path.length - 1].y}px)`, opacity: 1, offset: 0.9 },
      { transform: `translate(${path[path.length - 1].x}px, ${path[path.length - 1].y}px)`, opacity: 0, offset: 1 },
    ],
    { duration: 600 + path.length * 700, iterations: Infinity, easing: 'ease-in-out' }
  );

  // Light each tile as the finger reaches it, on the same cycle.
  const lit = [];
  path.forEach((p, i) => {
    const a = p.node.animate(
      [
        { boxShadow: '0 3px 0 rgba(14,60,80,.16), 0 4px 10px rgba(10,50,70,.14)', offset: 0 },
        { boxShadow: '0 0 0 3px var(--coin), 0 4px 14px rgba(240,180,41,.6)', offset: 0.04 },
        { boxShadow: '0 0 0 3px var(--coin), 0 4px 14px rgba(240,180,41,.6)', offset: 0.2 },
        { boxShadow: '0 3px 0 rgba(14,60,80,.16), 0 4px 10px rgba(10,50,70,.14)', offset: 0.34 },
      ],
      {
        duration: 600 + path.length * 700,
        iterations: Infinity,
        delay: -(600 + path.length * 700) * (1 - (i / path.length) * 0.82),
      }
    );
    lit.push(a);
  });

  let ended = false;
  function stop() {
    if (ended) return;
    ended = true;
    anim.cancel();
    lit.forEach((a) => a.cancel());
    // Fade rather than vanish, but remove on a timer: a paused tab never
    // finishes an animation, and a tutorial that cannot be dismissed is worse
    // than one that disappears abruptly.
    layer.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in' });
    svg.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in' });
    setTimeout(() => { layer.remove(); svg.remove(); }, 220);
    onEnd();
  }

  layer.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-tut-skip]')) stop();
  });

  return { stop, word: target.w };
}
