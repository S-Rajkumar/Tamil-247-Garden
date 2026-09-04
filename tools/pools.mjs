/**
 * Level designer. Finds letter pools that yield good levels from the corpus,
 * and audits the corpus for letters outside the 247.
 *
 *   node tools/pools.mjs
 */
import { WORDS } from '../src/tamil/corpus.js';
import { letters, letterIndex, ALL_247, buildableFrom, toBag } from '../src/tamil/letters.js';

// --- audit: every letter used must be one of the 247 -------------------------
const outside = new Map();
for (const { w } of WORDS) {
  for (const l of letters(w)) {
    if (letterIndex(l) < 0) {
      if (!outside.has(l)) outside.set(l, []);
      outside.get(l).push(w);
    }
  }
}
console.log(`corpus: ${WORDS.length} words`);
if (outside.size) {
  console.log(`\n!! letters outside the 247 (Grantha / borrowed):`);
  for (const [l, ws] of outside) console.log(`   ${l}  in  ${ws.join(', ')}`);
} else {
  console.log('all letters are within the 247');
}

// --- coverage: how much of the 247 can this corpus ever unlock? --------------
const seen = new Set();
for (const { w } of WORDS) for (const l of letters(w)) if (letterIndex(l) >= 0) seen.add(l);
console.log(`\ncoverage: ${seen.size}/247 letters reachable from this corpus`);
console.log(`          ${247 - seen.size} would have to be bought with coins`);

// --- pool search -------------------------------------------------------------
const MIN_WORDS = 3;
const MAX_TILES = 8;

const bags = WORDS.map((e) => ({ ...e, ls: letters(e.w) }));

/** union of two letter multisets */
function union(a, b) {
  const out = new Map(a);
  for (const [l, n] of b) out.set(l, Math.max(out.get(l) || 0, n));
  return out;
}
const size = (bag) => [...bag.values()].reduce((a, b) => a + b, 0);
const flat = (bag) => [...bag].flatMap(([l, n]) => Array(n).fill(l));

const candidates = [];

for (const seed of bags) {
  for (const partner of bags) {
    if (partner.w === seed.w) continue;
    const bag = union(toBag(seed.ls), toBag(partner.ls));
    if (size(bag) > MAX_TILES) continue;
    const pool = flat(bag);
    const found = bags.filter((b) => buildableFrom(b.w, pool));
    if (found.length < MIN_WORDS) continue;
    candidates.push({
      pool,
      tiles: size(bag),
      words: found.map((f) => f.w),
      objects: found.filter((f) => f.obj).map((f) => f.w),
    });
  }
}

// dedupe by sorted pool, then rank: more words, more objects, fewer tiles
const uniq = new Map();
for (const c of candidates) {
  const key = [...c.pool].sort().join('|');
  const prev = uniq.get(key);
  if (!prev || c.words.length > prev.words.length) uniq.set(key, c);
}
const ranked = [...uniq.values()].sort(
  (a, b) => b.words.length - a.words.length || b.objects.length - a.objects.length || a.tiles - b.tiles
);

console.log(`\n${ranked.length} viable pools (>=${MIN_WORDS} words, <=${MAX_TILES} tiles)\n`);

// Pick a level set: every object word should appear early, then fill with the
// richest remaining pools, never repeating a pool's word set.
const chosen = [];
const usedKey = new Set();
const objectsCovered = new Set();

for (const pass of ['objects', 'rest']) {
  for (const c of ranked) {
    if (chosen.length >= 12) break;
    const key = [...c.words].sort().join('|');
    if (usedKey.has(key)) continue;
    if (pass === 'objects') {
      const fresh = c.objects.filter((o) => !objectsCovered.has(o));
      if (!fresh.length) continue;
      fresh.forEach((o) => objectsCovered.add(o));
    }
    usedKey.add(key);
    chosen.push(c);
  }
}
chosen.sort((a, b) => a.tiles - b.tiles || a.words.length - b.words.length);

for (const c of chosen) {
  console.log(`[${c.pool.join(' ')}]  ${c.words.length} words  obj:${c.objects.join(',') || '-'}`);
  console.log(`    ${c.words.join('  ')}`);
}

console.log('\n--- paste into src/game/levels.js ---\n');
console.log('export const POOLS = [');
for (const c of chosen) console.log(`  [${c.pool.map((l) => `'${l}'`).join(', ')}],`);
console.log('];');
