import { ALL_247, letterIndex, letters } from '../tamil/letters.js';
import { SKIES, SKY_IDS, DEFAULT_SKY, applySky } from '../art/sky.js';
import { gardenLevel } from './garden.js';

const SAVE_KEY = 't247world.save.v6';

/**
 * Where the save lives. localStorage by default; on Playables `main.js` swaps
 * in a backend over `saveData`/`loadData`.
 *
 * `read` stays synchronous even there. The platform's read is a promise, so
 * boot awaits it once and hands the string over through `useStorage` — which
 * keeps `load()` and `save()` synchronous for every caller, and satisfies the
 * rule that `loadData` must be awaited before the first `saveData`.
 */
const storage = {
  read() { try { return localStorage.getItem(SAVE_KEY); } catch { return null; } },
  write(s) { try { localStorage.setItem(SAVE_KEY, s); } catch { /* private mode */ } },
};

export function useStorage({ read, write }) {
  storage.read = read;
  storage.write = write;
}

/** The exact bytes that would be persisted. Used to check the flush limit. */
export function serialize() {
  const bits = new Uint8Array(Math.ceil(ALL_247.length / 8));
  for (const i of state.letters) bits[i >> 3] |= 1 << (i & 7);
  let bin = '';
  for (const b of bits) bin += String.fromCharCode(b);

  return JSON.stringify({
    v: 6,
    coins: state.coins,
    letters: btoa(bin),
    plants: Object.fromEntries(state.plants),
    walls: Object.fromEntries(state.walls),
    pets: [...state.pets],
    cells: Object.fromEntries(state.cells || []),
    wheelSize: state.wheelSize || null,
    perched: state.perched,
    raid: state.raid,
    sky: state.sky,
    music: state.music,
    sfx: state.sfx,
    taught: state.taught,
    levelIndex: state.levelIndex,
    grandClaimed: state.grandClaimed,
  });
}

/** Coin value of a word: 2 per uyirmei, 1 per pure mei (those end in ்). */
export function wordValue(word) {
  return letters(word).reduce((sum, l) => sum + (l.endsWith('்') ? 1 : 2), 0);
}

/**
 * Filling all 247 pays out once. It must stay well under what buying every
 * letter would cost — at 100 a letter that is 24,700, so a 25,000 prize made
 * the alphabet pay for itself and turned earning letters into a formality.
 * 10,000 leaves completion firmly on the side of playing for them.
 */
export const GRAND_PRIZE = 10000;

/**
 * A new player starts with coins in hand.
 *
 * Shuffle is the only free hint, and it does not help someone who simply does
 * not know the words yet — so at zero coins a stuck first round has no way out
 * at all. 100 covers revealing all four of round one's targets, or two full
 * Meaning-Letter-Reveal sequences, and still leaves enough for a jasmine seed
 * so the garden opens on the first visit rather than after the first win.
 */
export const STARTING_COINS = 100;

function blankState() {
  return {
    coins: STARTING_COINS,
    letters: new Set(),   // indices into ALL_247
    plants: new Map(),    // "c,r" -> { id, stage }
    walls: new Map(),     // "c,r" -> wall tier 1..6
    pets: [],             // a list, so the same animal can be kept more than once
    cells: new Map(),     // "c,r" -> 'land' | 'wall', seeded on first use
    wheelSize: null,      // letters per wheel once the player picks, level 10+
    perched: null,        // a beaten hunter sitting on the wall
    raid: null,           // pending raid report, shown next time the garden opens
    sky: DEFAULT_SKY,     // the weather over the garden
    music: true,          // both default on, and both are one tap from off
    sfx: true,
    taught: false,        // has the join-the-letters lesson been given?
    levelIndex: 0,
    grandClaimed: false,
  };
}

/**
 * One currency, several sinks.
 *
 *   earn   words pay coins; extra words pay a premium; harvests pay the most
 *   spend  247 letters · seeds · wall blocks · pets · garden size
 *
 * There is deliberately no per-word collection ladder. Requiring the same word
 * ten or fifty times made the puzzle repeat itself, which is the opposite of
 * what a word game should do. The 247 is the only thing you collect.
 */
export const state = blankState();

const listeners = new Set();
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
export function emit() { listeners.forEach((fn) => fn(state)); }

// ---------------------------------------------------------------------------
// words
// ---------------------------------------------------------------------------

/** Record one found word. Returns the new 247 letters it revealed, and coins. */
export function recordWord(word) {
  const newLetters = [];
  for (const l of letters(word)) {
    const i = letterIndex(l);
    if (i >= 0 && !state.letters.has(i)) {
      state.letters.add(i);
      newLetters.push(l);
    }
  }
  return { word, newLetters, coins: wordValue(word) };
}

export function addCoins(n) { state.coins = Math.max(0, state.coins + n); }

/**
 * Award the 247 jackpot the moment the chart fills, once and only once.
 * Returns the amount if it fired, otherwise 0 — callers use that to decide
 * whether to show the celebration.
 */
export function claimGrandPrize() {
  if (state.grandClaimed) return 0;
  if (state.letters.size < ALL_247.length) return 0;
  state.grandClaimed = true;
  state.coins += GRAND_PRIZE;
  save();
  emit();
  return GRAND_PRIZE;
}

// ---------------------------------------------------------------------------
// the 247
// ---------------------------------------------------------------------------

/** Every locked letter costs the same. One price is one less thing to learn. */
export const LETTER_COST = 100;

export function unlockLetterCost() {
  return LETTER_COST;
}

export function buyLetter(index) {
  if (state.letters.has(index)) return false;
  const cost = unlockLetterCost(index);
  if (state.coins < cost) return false;
  state.coins -= cost;
  state.letters.add(index);
  save();
  emit();
  return true;
}

// ---------------------------------------------------------------------------
// skies
// ---------------------------------------------------------------------------

/**
 * A sky is revealed by growing the garden, and costs nothing.
 *
 * There is no stored list of owned skies any more: ownership is read from the
 * garden's level, so it cannot drift out of step with it, and an older save
 * needs no migration — whatever it holds, the right skies are open.
 */
export const ownsSky = (id) => Boolean(SKIES[id]) && gardenLevel() >= SKIES[id].level;
export const ownedSkies = () => SKY_IDS.filter(ownsSky);
export const skyUnlocksAt = (id) => (SKIES[id] ? SKIES[id].level : null);

export function setSky(id) {
  if (!SKIES[id] || !ownsSky(id)) return false;
  state.sky = id;
  applySky(id);
  save();
  emit();
  return true;
}

// ---------------------------------------------------------------------------
// save / load
// ---------------------------------------------------------------------------

export function save() {
  storage.write(serialize());
}

export function load() {
  const raw = storage.read();
  if (!raw) return;
  try {
    const d = JSON.parse(raw);
    state.coins = d.coins || 0;
    state.levelIndex = d.levelIndex || 0;
    state.grandClaimed = Boolean(d.grandClaimed);
    state.plants = new Map(Object.entries(d.plants || {}));
    state.walls = new Map(Object.entries(d.walls || {}).map(([k, v]) => [k, Number(v)]));
    state.pets = Array.isArray(d.pets) ? d.pets : [];
    state.cells = new Map(Object.entries(d.cells || {}));
    state.wheelSize = d.wheelSize || null;
    state.perched = d.perched || null;
    state.raid = d.raid || null;
    // Which skies are open is read from the garden, so any list an older save
    // holds is ignored. The chosen one has to be checked here and not only in
    // `setSky`: a save written when skies were bought can name one this garden
    // does not reach, and loading it straight through would hand the player a
    // sky they have not opened. Cells are restored above, so the level is known.
    state.sky = SKIES[d.sky] && ownsSky(d.sky) ? d.sky : DEFAULT_SKY;
    // Undefined means a save from before sound existed, which should hear it.
    state.music = d.music !== false;
    state.sfx = d.sfx !== false;
    // A save from before the tutorial existed belongs to someone who has
    // already played, so do not teach them what they plainly know.
    state.taught = 'taught' in d ? Boolean(d.taught) : true;
    state.letters = new Set();
    if (d.letters) {
      const bin = atob(d.letters);
      for (let i = 0; i < ALL_247.length; i++) {
        if (bin.charCodeAt(i >> 3) & (1 << (i & 7))) state.letters.add(i);
      }
    }
  } catch {
    Object.assign(state, blankState());
  }
}

/**
 * Delete the save outright. Lives here because this module owns the key —
 * the console helper used to hardcode it and had been deleting `save.v1`
 * long after the format moved on to v6.
 */
export function clearSave() {
  try { localStorage.removeItem(SAVE_KEY); } catch { /* private mode */ }
}

export function resetAll() {
  Object.assign(state, blankState());
  save();
  emit();
}
