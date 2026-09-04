import './style.css';
import { load, save, clearSave, state, useStorage, serialize } from './game/state.js';
import { applySky, SKY_IDS, SKIES } from './art/sky.js';
import {
  unlock, setMusic, setSfx, setMood, setPlatformAudio, pauseAudio, resumeAudio,
} from './audio/sound.js';
import * as pf from './platform/playables.js';
import { resetIdle } from './ui/idle.js';
import { renderWorld } from './ui/world.js';
import { renderPuzzle } from './ui/puzzle.js';
import { renderChart } from './ui/chart.js';
import { loadDictionary, dictionarySize } from './tamil/dictionary.js';
import { pruneUnknownPlants, gardenLevel, expand } from './game/garden.js';

const app = document.getElementById('app');
let current = null;

/** Cross-fade + slide between screens. */
function go(name) {
  // Every existing holder is outgoing, not just the first. Background tabs
  // throttle timers to ~1s, so during rapid navigation a holder can outlive
  // its removal and orphan itself — then every later screen stacks on top of
  // it and the player sees two worlds at once.
  const outgoing = [...app.children];
  const holder = document.createElement('div');
  holder.className = 'screenholder';
  app.appendChild(holder);

  const routes = {
    world: () => renderWorld(holder, { onPlay: () => go('puzzle') }),
    puzzle: () => renderPuzzle(holder, { onDone: (act) => go(act === 'next' ? 'puzzle' : 'world') }),
    chart: () => renderChart(holder, { onBack: () => go(current === 'chart' ? 'world' : 'world') }),
  };
  routes[name]();
  current = name;

  holder.animate(
    [{ opacity: 0, transform: 'translateY(12px) scale(.99)' }, { opacity: 1, transform: 'none' }],
    { duration: 300, easing: 'cubic-bezier(.2,.8,.3,1)' }
  );
  for (const old of outgoing) {
    old.style.pointerEvents = 'none';
    old.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, easing: 'ease-in' });
    // Removal must NOT hang off animation.onfinish: a hidden or backgrounded
    // tab stops compositing, animations never finish, and screens pile up.
    // The platform pauses this game constantly, so this has to be on a timer.
    setTimeout(() => old.remove(), 220);
  }
}

// Global navigation from any topbar chip.
app.addEventListener('click', (ev) => {
  const nav = ev.target.closest('[data-go]');
  if (nav) go(nav.dataset.go);
});

// ---------------------------------------------------------------------------
// boot
// ---------------------------------------------------------------------------

/**
 * The order here is the platform's, not ours.
 *
 *   1. A loading screen is already on screen from index.html, so the very
 *      first thing we can honestly say is `firstFrameReady`.
 *   2. Read the save. `loadData` MUST be awaited before anything writes, so
 *      nothing that could save may run before this resolves.
 *   3. Build the world.
 *   4. `gameReady` — and only now, because the platform measures the initial
 *      bundle as everything downloaded up to this call, and the requirement is
 *      that the game is genuinely playable when it fires.
 *
 * Wrapped in a function rather than using top-level await: Playables runs in
 * the YouTube app's webview across a wide range of Android versions, and the
 * build target is deliberately conservative for that reason.
 */
let saveOnExit = true;

async function boot() {
  pf.firstFrameReady();

  const rawSave = await pf.readSave();
  pf.markLoaded();

  // From here on the game saves through the platform when there is one.
  useStorage({
    read: () => rawSave,
    write: (s) => pf.writeSave(s),
  });

  load();
  pruneUnknownPlants();
  applySky(state.sky);

  // Audio cannot start before a gesture, so the settings are handed over now and
  // the context itself waits for the first tap anywhere.
  setMusic(state.music);
  setSfx(state.sfx);
  setMood(state.sky);

  // YouTube's own mute overrides everything the player chose in here: the
  // requirement is that no audio is output at all while it is on.
  setPlatformAudio(pf.isAudioEnabled());
  pf.onAudioEnabledChange((enabled) => setPlatformAudio(enabled));

  const firstTouch = () => {
    unlock();
    window.removeEventListener('pointerdown', firstTouch);
    window.removeEventListener('keydown', firstTouch);
  };
  window.addEventListener('pointerdown', firstTouch);
  window.addEventListener('keydown', firstTouch);

  document.getElementById('boot')?.remove();
  // Straight into a round. On a platform built around short sessions the
  // first screen has to be the game itself — the garden is one tap away on
  // the top bar, and a new player meets the join-the-letters lesson here.
  go('puzzle');
  pf.gameReady();

  // Tier-2 validation. Absent until `npm run dict` generates it; the game runs
  // on the curated corpus alone until then and never blocks on this. Deliberately
  // after `gameReady`: the game is playable without it, so it must not be counted
  // against the initial bundle.
  loadDictionary().then((ok) => {
    console.info(ok ? `dictionary: ${dictionarySize()} words` : 'dictionary: not generated yet');
  });

  // --- pause and resume ---
  // The platform's pause is the only pause. The Page Visibility API is forbidden
  // outright by the certification requirements, so `visibilitychange` and
  // `document.hidden` appear nowhere in this codebase.
  pf.onPause(() => {
    pauseAudio();
    if (!saveOnExit) return;
    const raw = serialize();
    // The final flush is capped at 64 KiB, and a save over it is dropped — at
    // the exact moment it matters most. Report rather than lose it silently.
    if (pf.saveSize(raw) > pf.FLUSH_LIMIT) pf.logError(new Error('save over flush limit'));
    pf.flushSave(raw);
  });

  pf.onResume(() => {
    resumeAudio();
    // Time spent paused is not time spent stuck, so the idle nudges must
    // not fire the moment someone comes back.
    resetIdle();
  });

  // Off-platform only: there is no `onPause` in a plain browser, and closing the
  // tab would lose the round. `pagehide` is not the Page Visibility API.
  if (!pf.inPlayables()) {
    window.addEventListener('pagehide', () => { if (saveOnExit) save(); });
  }
}

boot();

/**
 * Dev helpers, reachable from the console.
 *
 * Each one writes to the live state and saves, then reloads so every screen
 * redraws from it. Setting a field by hand instead is a trap: the exit-save
 * fires on the way out and overwrites storage with whatever memory holds.
 */
window.t247 = {
  state,
  platform: pf,
  reset() {
    saveOnExit = false;
    clearSave();
    location.reload();
  },
  /**
   * Every sky at once. They open with the garden now, so this grows the
   * garden to the level that reveals the last of them — there is no owned
   * list any more to hand out.
   */
  skies() {
    const want = Math.max(...SKY_IDS.map((id) => SKIES[id].level));
    state.coins = Math.max(state.coins, 100000);
    while (gardenLevel() < want && expand()) { /* keep expanding */ }
    save();
    location.reload();
  },
  /** Show the first-run lesson again, to see it as a new player would. */
  teach() {
    state.taught = false;
    save();
    location.reload();
  },
  /** Set the purse outright. `t247.coins()` tops up to a comfortable 20,000. */
  coins(n = 20000) {
    state.coins = Math.max(0, Math.floor(n));
    save();
    location.reload();
  },
};
