/**
 * Builds the tier-2 wordlist and its meanings.
 *
 *   node tools/dict.mjs   →   public/dict/ta-words.json
 *                             public/dict/ta-meanings.json
 *
 * SOURCE: Tamil Wiktionary, via the kaikki.org machine-readable extraction
 * (CC BY-SA). Every entry carries a part of speech and at least one gloss,
 * which is what the old subtitle list could not give us.
 *
 * That matters because the subtitle list had no way to tell a word from a name.
 * சாம் sat in it with a frequency of 61 — that is "Sam", not Tamil. Wiktionary
 * tags proper nouns as `name`, so they can simply be dropped, and so can the
 * pronouns, particles and postpositions that are real Tamil but no fun at all
 * to "discover" in a word game.
 *
 * The old frequency list is still read, but only to rank what survives by how
 * common it is. It never adds a word any more.
 */
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { WORDS } from '../src/tamil/corpus.js';
import { letters, letterIndex } from '../src/tamil/letters.js';

const WIKT = 'tools/data/wiktionary-ta.jsonl';
const FREQ = 'tools/data/ta_full.txt';
const OUT_DIR = 'public/dict';

const MIN_LEN = 2;
const MAX_LEN = 7;
const GLOSS_MAX = 64;

/**
 * Parts of speech worth finding in a puzzle. Adverbs are deliberately out:
 * இங்கே, வெளியே and மிகவும் are real Tamil and no fun at all to uncover.
 */
const KEEP_POS = new Set(['noun', 'verb', 'adj', 'num']);

/**
 * A word listed anywhere as one of these is out, whatever else it also is.
 * நான் survived an earlier pass because Wiktionary also records it as a noun
 * meaning "naan bread" — true, and useless to a player looking for Tamil.
 */
const VETO_POS = new Set(['pron', 'det', 'particle', 'postp', 'conj', 'intj', 'name']);

/**
 * Glosses that only point at another word rather than saying anything.
 * "third-person future neuter of வேண்டு (vēṇṭu)" describes a grammatical form,
 * not a word worth finding — and the Tamil-in-parentheses shape catches those
 * however the description in front of it is phrased.
 */
const TAMIL = '஀-௿';
const REFERENCE = [
  new RegExp(`\\bof\\s+[${TAMIL}]+\\s*\\(`, 'i'),
  new RegExp(`^[${TAMIL}]+\\s*\\(`),
  /\bform of\b/i,
  /^(inflection|infinitive|accusative|dative|genitive|locative|nominative)\b/i,
  /^(plural|singular|adjectival|oblique|past|present|future|participle)\b/i,
  /^(first|second|third)-person\b/i,
  /^(adverbial|verbal noun|negative|imperative|optative|conditional)\b/i,
  /^(alternative|alternate|obsolete|archaic|misspelling|synonym|superseded)\b/i,
  /^(abbreviation|initialism|acronym|romanization|romanisation|transliteration)\b/i,
  /^(spoken tamil form|a form of|used to|used as|see\b)/i,
];
const isReference = (g) => REFERENCE.some((re) => re.test(g));

/** Demonstratives, titles and interjections: real words, but never finds. */
const STOPLIST = new Set([
  'திரு', 'திருமதி', 'ஆம்', 'ஆமாம்', 'இல்லை', 'ஏன்', 'ஓ',
  'இந்த', 'அந்த', 'எந்த', 'எப்படி', 'அனைத்து', 'ஒரு', 'வேண்டாம்',
]);

/**
 * Tamil words never end in a hard stop consonant; those are stems a source
 * captured mid-compound, not words.
 */
const BAD_FINAL = new Set(['க்', 'ச்', 'ட்', 'த்', 'ப்', 'ஞ்']);

/**
 * Cut a dictionary gloss down to something that fits on a hint card.
 *
 * Wiktionary writes for readers of dictionaries: "banyan, strangler fig,
 * banyan fig (Ficus benghalensis, syn. Ficus indica)". A player wants
 * "banyan". Parentheses, Latin binomials and trailing senses all go.
 */
function tidy(gloss) {
  let g = String(gloss)
    .replace(/\([^)]*\)/g, ' ')          // parenthetical asides
    .replace(/\[[^\]]*\]/g, ' ')
    .split(/[;:]/)[0]                     // only the first sense group
    .replace(/\s+/g, ' ')
    .trim();
  // At most two comma-separated synonyms; more reads as a thesaurus entry.
  const parts = g.split(',').map((s) => s.trim()).filter(Boolean);
  g = parts.slice(0, 2).join(', ');
  return g.replace(/[.,;\s]+$/, '');
}

/** A Latin binomial in the gloss means a botany entry, not a game word. */
const BINOMIAL = /\b[A-Z][a-z]{2,}\s+[a-z]{3,}\b/;

/**
 * Is this a word a level should be allowed to *ask* for?
 *
 * Far stricter than mere validity. A target has to be a word a player can
 * recognise and a hint can explain in a few syllables, so this wants concrete
 * nouns and adjectives with short plain glosses. Everything rejected here is
 * still perfectly valid as a bonus find — it just never gets set as homework.
 */
function isGameWord(word, entry, freq) {
  if (!entry) return false;
  const { pos, clean, en } = entry;
  if (pos !== 'noun' && pos !== 'adj') return false;     // verbs conjugate; skip
  if (!clean || clean.length < 2 || clean.length > 28) return false;
  if (BINOMIAL.test(en)) return false;                   // botany and zoology
  if (/[஀-௿]/.test(clean)) return false;                 // gloss still in Tamil
  if (/\b(see|cf|etc|var|obsolete|archaic|dialectal|poetic)\b/i.test(en)) return false;
  if (/\d/.test(clean)) return false;
  if (clean.split(/\s+/).length > 4) return false;        // must fit a hint
  const n = letters(word).length;
  if (n < 2 || n > 6) return false;                       // fits the widest wheel
  return (freq.get(word) || 0) >= 2;                      // people actually say it
}

if (!fs.existsSync(WIKT)) {
  console.error(`missing ${WIKT} — see THIRD-PARTY.md for the download step`);
  process.exit(1);
}

const stats = {
  entries: 0, wrongPos: 0, properNoun: 0, functionWord: 0, reference: 0,
  tooShort: 0, tooLong: 0, outside247: 0, badFinal: 0,
};

const meanings = new Map();   // word -> { en, pos, clean }
const vetoed = new Set();

const rl = readline.createInterface({
  input: fs.createReadStream(WIKT),
  crlfDelay: Infinity,
});

for await (const line of rl) {
  if (!line.trim()) continue;
  let e;
  try { e = JSON.parse(line); } catch { continue; }
  if (e.lang_code !== 'ta' || !e.word) continue;
  stats.entries++;

  const word = e.word.trim();
  if (VETO_POS.has(e.pos)) {
    if (e.pos === 'name') stats.properNoun++; else stats.functionWord++;
    vetoed.add(word);
    continue;
  }
  if (!KEEP_POS.has(e.pos)) { stats.wrongPos++; continue; }
  if (/[\s\-–—.,'"()]/.test(word)) { stats.wrongPos++; continue; }

  const ls = letters(word);
  if (ls.length < MIN_LEN) { stats.tooShort++; continue; }
  if (ls.length > MAX_LEN) { stats.tooLong++; continue; }
  if (!ls.every((l) => letterIndex(l) >= 0)) { stats.outside247++; continue; }
  if (BAD_FINAL.has(ls[ls.length - 1])) { stats.badFinal++; continue; }

  // A word earns its place on a gloss that actually says something.
  const gloss = e.senses
    ?.flatMap((s) => s.glosses || [])
    .find((g) => g && !isReference(g.trim()));
  if (!gloss) { stats.reference++; vetoed.add(word); continue; }

  // Keep the shortest gloss seen for a word — the tersest is usually the
  // plainest, and it has to fit on a hint card.
  const en = gloss.replace(/\s+/g, ' ').trim().slice(0, GLOSS_MAX);
  const prev = meanings.get(word);
  if (!prev || en.length < prev.en.length) meanings.set(word, { en, pos: e.pos, clean: tidy(gloss) });
}

// Anything vetoed anywhere in the dump comes out now, even if some other entry
// for the same spelling looked respectable.
let vetoRemoved = 0;
for (const w of vetoed) if (meanings.delete(w)) vetoRemoved++;
for (const w of STOPLIST) if (meanings.delete(w)) vetoRemoved++;

// The curated corpus is authoritative: its words are always valid and its
// glosses always win, because they were written for this game.
let fromCorpus = 0;
for (const { w, en } of WORDS) {
  if (!meanings.has(w)) fromCorpus++;
  meanings.set(w, { en, pos: 'noun', clean: en });
}

// Rank by how common the word is in real speech, so the level generator can
// prefer words a player will actually recognise.
const freq = new Map();
if (fs.existsSync(FREQ)) {
  for (const line of fs.readFileSync(FREQ, 'utf8').split('\n')) {
    const [w, c] = line.trim().split(/\s+/);
    if (w) freq.set(w, Number(c) || 0);
  }
}

const words = [...meanings.keys()].sort(
  (a, b) => (freq.get(b) || 0) - (freq.get(a) || 0) || a.localeCompare(b, 'ta')
);

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'ta-words.json'), JSON.stringify(words));
fs.writeFileSync(
  path.join(OUT_DIR, 'ta-meanings.json'),
  JSON.stringify(Object.fromEntries(words.map((w) => [w, meanings.get(w).en])))
);

// The curated set: words a level may actually ask for. Everything else stays
// valid as a bonus find, but is never set as a target.
const targets = words
  .filter((w) => isGameWord(w, meanings.get(w), freq))
  .map((w) => ({ w, en: meanings.get(w).clean }));
fs.writeFileSync(
  path.join(OUT_DIR, 'ta-targets.json'),
  JSON.stringify(targets)
);

const reachable = new Set();
for (const w of words) for (const l of letters(w)) if (letterIndex(l) >= 0) reachable.add(l);

const leftovers = words.filter((w) => isReference(meanings.get(w).en || ''));
const kb = (f) => (fs.statSync(path.join(OUT_DIR, f)).size / 1024).toFixed(0);

console.log(`read       ${stats.entries} Tamil entries`);
console.log(`  dropped  ${stats.properNoun} proper nouns  (this is where "சாம்" went)`);
console.log(`  dropped  ${stats.functionWord} pronouns, particles, postpositions, interjections`);
console.log(`  dropped  ${stats.wrongPos} phrases, affixes, symbols and the like`);
console.log(`  dropped  ${stats.reference} grammatical forms pointing at a headword`);
console.log(`  dropped  ${stats.tooShort} too short, ${stats.tooLong} too long`);
console.log(`  dropped  ${stats.outside247} with letters outside the 247`);
console.log(`  dropped  ${stats.badFinal} ending in a hard stop`);
console.log(`  removed  ${vetoRemoved} on the second pass, vetoed by another sense`);
console.log(`kept       ${words.length - fromCorpus}  (+${fromCorpus} only in the curated corpus)`);
console.log(`written    ${words.length} words, ${kb('ta-words.json')} KB`);
console.log(`           ${words.length} meanings, ${kb('ta-meanings.json')} KB`);
console.log(`re-check   ${leftovers.length} entries still carry a pointer gloss`);
console.log(`targets    ${targets.length} curated as words a level may ask for`);
console.log('');
console.log(`247 coverage: ${reachable.size}/247 reachable — ${247 - reachable.size} must be bought`);
