/**
 * Re-fetch the bundled Tamil face.
 *
 * Google Fonts serves a different format per user agent, so the request must
 * claim to be a modern browser or it returns TTF instead of woff2. What comes
 * back is Google's own Tamil subset: one variable file, weights 400-700.
 *
 *   node tools/font.mjs
 *
 * This runs at build time, never at run time — Playables forbids external
 * requests from the game itself.
 */
import fs from 'node:fs';
import path from 'node:path';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
         + '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const CSS = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400..700&display=swap';
// Paths are repo-relative, like the other tools: run from the project root.
const OUT = 'src/fonts/noto-sans-tamil.woff2';

const css = await fetch(CSS, { headers: { 'User-Agent': UA } }).then((r) => r.text());

// The stylesheet carries one @font-face per subset. We want the Tamil one,
// identified by its unicode-range, not by its position in the file.
const blocks = css.split('@font-face').slice(1);
const tamil = blocks.find((b) => /unicode-range:[^;]*U\+0B82/i.test(b));
if (!tamil) {
  console.error('No Tamil subset in the stylesheet. Google may have changed the response.');
  process.exit(1);
}
const url = tamil.match(/src:\s*url\(([^)]+)\)/)?.[1];
const range = tamil.match(/unicode-range:\s*([^;]+);/)?.[1]?.trim();
if (!url || !/\.woff2$/.test(url)) {
  console.error('Expected a woff2 URL, got:', url);
  process.exit(1);
}

const buf = Buffer.from(await fetch(url).then((r) => r.arrayBuffer()));
if (buf.subarray(0, 4).toString('latin1') !== 'wOF2') {
  console.error('That is not a woff2 file.');
  process.exit(1);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, buf);

console.log(`saved ${(buf.length / 1024).toFixed(1)} KB to src/fonts/noto-sans-tamil.woff2`);
console.log(`source        ${url}`);
console.log(`unicode-range ${range}`);
console.log('\nIf the range differs from the one in src/style.css, update it there too.');
