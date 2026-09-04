# Third-party assets

## Fonts — Noto Sans Tamil

`src/fonts/noto-sans-tamil.woff2` · 49 KB · **SIL Open Font License 1.1**

Google's own Tamil subset of Noto Sans Tamil: one variable file covering
weights 400-700. Fetch or refresh it with:

```bash
node tools/font.mjs
```

The script reads Google Fonts' stylesheet, picks the `@font-face` block whose
`unicode-range` contains U+0B82 (so it finds the Tamil subset by what it covers
rather than by its position in the file), and saves the woff2. It must claim a
modern browser user agent or Google returns TTF instead.

**It is bundled, not linked.** A `<link>` to Google Fonts is an external
network request and Playables forbids those. Bundling is also the only way the
game is readable at all on a device with no Tamil face installed — without it a
player sees empty boxes where the entire subject of the game should be.

The `unicode-range` in `src/style.css` must match the one the script prints. It
covers the Tamil block, ZWJ and ZWNJ (U+200C-200D) which Tamil shaping needs,
the rupee sign, and U+25CC — the dotted circle a renderer shows for a combining
mark standing on its own, which the 247 chart relies on for the vowel signs.

The OFL permits bundling and redistribution, including in a commercial game,
provided the font is not sold on its own and the copyright notice and licence
travel with it. Keep `LICENSE-Noto.txt` beside the woff2 when shipping.

## Artwork — none

All garden artwork is hand-drawn SVG generated at runtime by
`src/art/garden.js`. Nothing is downloaded, nothing is licensed from anyone,
and the whole scene costs zero bytes of image payload.

### Previously used, now removed

Kenney isometric tile packs (CC0) built the earlier town view. They were
dropped when the town became a garden: the packs have no garden, wall, plant
or pet assets, and the town they did build read as a generic asset flip.
Two things learned there are worth keeping:

- **Never mix isometric tile scales.** Kenney's landscape tiles are 132 px
  wide and do not line up with its 100 px buildings.
- **Never lay a world out with absolutely-positioned sprites in a fixed box.**
  It huddles in one corner on any other aspect ratio. One SVG with a computed
  viewBox scales properly.

## Wordlist and meanings - Tamil Wiktionary (CC BY-SA)

The tier-2 dictionary and every word meaning come from **Tamil Wiktionary**,
via the machine-readable extraction at [kaikki.org](https://kaikki.org/dictionary/Tamil/),
licensed **CC BY-SA** like Wiktionary itself. Attribution and share-alike apply
to the generated word data, not to the game code.

Download the source once (86 MB, not shipped):

```
curl -L -o tools/data/wiktionary-ta.jsonl   https://kaikki.org/dictionary/Tamil/kaikki.org-dictionary-Tamil.jsonl
```

Then `npm run dict` filters it down to **7,082 words with meanings** (168 KB +
338 KB shipped). Wiktionary tags parts of speech, which is the whole reason for
switching to it: names, pronouns, particles and inflected forms can be
identified and dropped rather than guessed at.

### Why the subtitle list was replaced

The previous tier-2 list came from
[hermitdave/FrequencyWords](https://github.com/hermitdave/FrequencyWords) (MIT),
derived from OpenSubtitles. It had no part-of-speech information, so it could
not tell a word from a name: **சாம்** sat in it with a frequency of 61, which is
the English name "Sam". It also carried pronouns and particles that are real
Tamil but no fun to "discover" in a puzzle.

That file is still downloaded and still used, but only as a **frequency signal**
for ranking. It never adds a word now. Its licence text is at
`tools/data/FrequencyWords-LICENSE`.

### Considered and rejected

**LibreOffice `ta_IN.dic`** — MPL 1.1, a stem list with affix flags rather than
surface forms, and no meanings.

**tdulcet/compact-dictionaries** — GPL-3.0, which is awkward for a commercial
game, and Hunspell-derived so it has the same no-meanings problem.
