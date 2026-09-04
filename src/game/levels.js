import { LEVEL_WORDS, POOLS } from './levelwords.js';
import { letters, buildableFrom } from '../tamil/letters.js';

export { POOLS };

const MAX_TARGETS = 4;

/** Pools grouped by how many letters they put on the wheel. */
const BY_LENGTH = POOLS.reduce((m, p) => {
  (m[p.length] = m[p.length] || []).push(p);
  return m;
}, {});
const LENGTHS = Object.keys(BY_LENGTH).map(Number).sort((a, b) => a - b);

export const BASE_LETTERS = 6;
export const LEVELS_PER_LETTER = 2;
export const WHEEL_SIZES = [6, 7, 8, 9, 10];

/**
 * Six letters to start, one more every two levels, reaching ten by level 9.
 *
 * Once the garden is full grown there is nothing left to unlock, so the wheel
 * stops being a reward and becomes a setting: `choice` is whatever size the
 * player picked, and it wins outright. Every size the generator produces is
 * therefore one somebody can actually reach and keep.
 */
export function poolSizeFor(level, choice) {
  if (choice && WHEEL_SIZES.includes(choice)) return choice;
  const want = BASE_LETTERS + Math.floor(Math.max(0, level - 1) / LEVELS_PER_LETTER);
  const capped = Math.min(Math.max(...LENGTHS), Math.max(Math.min(...LENGTHS), want));
  return LENGTHS.reduce((best, n) =>
    Math.abs(n - capped) < Math.abs(best - capped) ? n : best, LENGTHS[0]);
}

/**
 * Build a level. Difficulty follows the level number, which is how far the
 * garden reaches from its centre, so the wheel grows letter by letter as the
 * garden grows ring by ring.
 */
export function makeLevel(index, level = 1, choice = null) {
  const group = BY_LENGTH[poolSizeFor(level, choice)];
  const pool = group[index % group.length];

  const valid = LEVEL_WORDS.filter((e) => buildableFrom(e.w, pool))
    .map((e) => ({ ...e, ls: letters(e.w) }))
    .sort((a, b) => b.ls.length - a.ls.length || a.w.localeCompare(b.w, 'ta'));

  const targets = valid.slice(0, MAX_TARGETS);
  const bonus = valid.slice(MAX_TARGETS);

  return {
    index,
    number: index + 1,
    pool,
    targets,
    bonus,
    byWord: new Map(valid.map((e) => [e.w, e])),
  };
}

export const LEVEL_COUNT = POOLS.length;
