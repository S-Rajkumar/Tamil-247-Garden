/**
 * The ONLY module allowed to touch a Tamil string directly.
 *
 * Tamil is written in grapheme clusters: "கோயில்" is three letters (கோ, யி, ல்)
 * but six JavaScript characters. Splitting on characters shatters every glyph,
 * and vowel signs like ெ render to the LEFT of the consonant they follow in
 * storage, so visual order never matches string order either.
 *
 * Intl.Segmenter handles both. Nothing else in the codebase should ever call
 * .split(''), .length, or index into a Tamil string.
 */

const segmenter = new Intl.Segmenter('ta', { granularity: 'grapheme' });

/** Split a Tamil word into its எழுத்து. "கோயில்" -> ["கோ","யி","ல்"] */
export function letters(word) {
  return Array.from(segmenter.segment(word), (s) => s.segment);
}

/** Number of எழுத்து in a word — never use word.length. */
export function letterCount(word) {
  return letters(word).length;
}

// ---------------------------------------------------------------------------
// The 247
// ---------------------------------------------------------------------------

export const UYIR = ['அ','ஆ','இ','ஈ','உ','ஊ','எ','ஏ','ஐ','ஒ','ஓ','ஔ'];
export const MEI_BASE = ['க','ங','ச','ஞ','ட','ண','த','ந','ப','ம','ய','ர','ல','வ','ழ','ள','ற','ன'];
export const AYTHAM = 'ஃ';

const PULLI = '்';
/** Vowel signs, index-aligned to UYIR. Index 0 is the inherent 'a' — no sign. */
const SIGNS = ['', 'ா','ி','ீ','ு','ூ','ெ','ே','ை','ொ','ோ','ௌ'];

/** The 18 pure consonants: க் ங் ச் ... */
export const MEI = MEI_BASE.map((m) => m + PULLI);

/** All 216 uyirmei, row-major by consonant. */
export const UYIRMEI = MEI_BASE.flatMap((m) => SIGNS.map((s) => m + s));

/** Every letter of the 247, in teaching order: uyir, mei, uyirmei, aytham. */
export const ALL_247 = [...UYIR, ...MEI, ...UYIRMEI, AYTHAM];

const INDEX = new Map(ALL_247.map((l, i) => [l, i]));

/** Position of a letter in the 247, or -1 if it isn't one of them. */
export function letterIndex(letter) {
  const i = INDEX.get(letter);
  return i === undefined ? -1 : i;
}

/**
 * Break a uyirmei into the parts that built it: கா -> { mei:'க்', uyir:'ஆ' }.
 * Returns null for letters that aren't composites. This is the reward screen
 * that makes the 247 chart teach something instead of just filling up.
 */
export function decompose(letter) {
  const chars = Array.from(letter);
  if (chars.length === 1) {
    const base = MEI_BASE.indexOf(chars[0]);
    if (base >= 0) return { mei: MEI[base], uyir: UYIR[0] };
    return null;
  }
  if (chars.length === 2 && chars[1] === PULLI) return null; // already a pure mei
  const base = MEI_BASE.indexOf(chars[0]);
  const sign = SIGNS.indexOf(chars[1]);
  if (base < 0 || sign < 1) return null;
  return { mei: MEI[base], uyir: UYIR[sign] };
}

// ---------------------------------------------------------------------------
// Pools
// ---------------------------------------------------------------------------

/** Count letters into a multiset, so a pool with two ம tiles can build two ம. */
export function toBag(list) {
  const bag = new Map();
  for (const l of list) bag.set(l, (bag.get(l) || 0) + 1);
  return bag;
}

/** Can `word` be built from `pool` (an array of tiles), respecting duplicates? */
export function buildableFrom(word, pool) {
  const bag = toBag(pool);
  for (const l of letters(word)) {
    const have = bag.get(l) || 0;
    if (have === 0) return false;
    bag.set(l, have - 1);
  }
  return true;
}
