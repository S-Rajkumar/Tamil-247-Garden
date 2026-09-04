/**
 * Two-tier word validation.
 *
 *   Tier 1 — the curated corpus (corpus.js). Has glosses, object mappings and
 *            frequency bands. Drives targets, hints and what gets built.
 *   Tier 2 — this dictionary. Validity only, no meaning. Its whole job is to
 *            stop the game telling a player that a real Tamil word is wrong.
 *
 * A player who builds நகம் or நரகம் from the pool has done nothing wrong, and
 * a word game that rejects real words feels broken no matter how good the rest
 * of it is. Tier 2 accepts them and pays coins; it just can't show a meaning.
 *
 * The dictionary ships as a generated JSON array of surface forms, built by
 * `npm run dict`. Until that file exists the game runs on tier 1 alone and
 * says so honestly in the UI.
 */

import { letters, letterIndex } from './letters.js';

let DICT = null;          // Set<string> once loaded
let MEANINGS = null;      // word -> short English gloss
let loadState = 'idle';   // idle | loading | ready | absent

export function dictionaryReady() {
  return loadState === 'ready';
}

export function dictionarySize() {
  return DICT ? DICT.size : 0;
}

/**
 * Load the generated wordlist. Safe to call repeatedly. Never throws — if the
 * file is missing the game simply runs without tier 2.
 */
export async function loadDictionary() {
  if (loadState === 'ready' || loadState === 'absent') return dictionaryReady();
  loadState = 'loading';
  try {
    const [wordsRes, meaningRes] = await Promise.all([
      fetch('/dict/ta-words.json'),
      fetch('/dict/ta-meanings.json'),
    ]);
    if (!wordsRes.ok) throw new Error(String(wordsRes.status));
    DICT = new Set(await wordsRes.json());
    // Meanings are a bonus: the game plays fine without them, so a failure
    // here must not take validation down with it.
    MEANINGS = meaningRes.ok ? await meaningRes.json() : null;
    loadState = 'ready';
  } catch {
    DICT = null;
    loadState = 'absent';
  }
  return dictionaryReady();
}

/** The English gloss for a word, when the dictionary carries one. */
export function meaningOf(word) {
  return (MEANINGS && MEANINGS[word]) || null;
}

/** Is this a real Tamil word, per the dictionary? False when none is loaded. */
export function inDictionary(word) {
  return DICT ? DICT.has(word) : false;
}

/**
 * Words worth keeping for a word game: 2–7 எழுத்து, every letter inside the
 * 247, no Grantha or Latin. Used by the generator and to sanity-check input.
 */
export function isGameWord(word) {
  const ls = letters(word);
  if (ls.length < 2 || ls.length > 7) return false;
  return ls.every((l) => letterIndex(l) >= 0);
}
