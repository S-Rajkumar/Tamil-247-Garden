/**
 * Shrink a letter to fit its box.
 *
 * Tamil grapheme clusters vary enormously in width. A plain letter like ப is
 * about 21px at a 23px font; ணை is 71px, because the two-part vowel sign ை is
 * drawn *before* its consonant and each half takes full width. A tile sized
 * for the common case clips the wide ones, and `overflow: hidden` means the
 * player simply never sees part of the letter they are being asked to read.
 *
 * Sizing every tile for the worst case would waste most of the wheel, so
 * instead each one is measured after layout and only the wide ones shrink.
 */
export function fitText(node, { min = 0.5, room = 0.92 } = {}) {
  if (!node || !node.textContent) return;
  node.style.fontSize = '';                 // measure at the size CSS asked for
  const cs = getComputedStyle(node);
  const base = parseFloat(cs.fontSize);
  // `room` keeps a fitted glyph off the rounded corners. Without it the widest
  // clusters land exactly on the content edge, which reads as clipped even
  // when every pixel is present.
  const avail = (node.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) * room;
  if (!(avail > 0) || !(base > 0)) return;

  // A Range measures the text itself. `scrollWidth` is no use here: the
  // content is centred by flexbox, which reports no overflow either way.
  const r = document.createRange();
  r.selectNodeContents(node);
  const w = r.getBoundingClientRect().width;
  if (!(w > avail)) return;

  node.style.fontSize = `${(base * Math.max(min, avail / w)).toFixed(1)}px`;
}

/** Fit every match inside `root`. */
export function fitAll(root, selector, opts) {
  root.querySelectorAll(selector).forEach((n) => fitText(n, opts));
}

/**
 * Fit a whole row of letters, scaling every cell by the same amount.
 *
 * A word's letters must look like one word. Shrinking only the wide clusters
 * put ஙௌ at 10px beside ர at 20px — technically fitting, visibly broken. The
 * cells size to their own content now, so a row only shrinks when the word as
 * a whole is too wide for the screen, and then all of it shrinks together.
 *
 * Two passes: scaling changes the cells but not the fixed gaps and padding
 * between them, so the first estimate always overshoots slightly.
 */
export function fitRow(row, avail, { min = 0.5 } = {}) {
  if (!row || !(avail > 0)) return;
  row.style.setProperty('--cell-scale', '1');
  let scale = 1;
  for (let pass = 0; pass < 2; pass++) {
    const natural = row.scrollWidth;
    if (natural <= avail) break;
    scale = Math.max(min, scale * (avail / natural));
    row.style.setProperty('--cell-scale', scale.toFixed(3));
  }
}

/** Fit every row of letters inside a container to that container's width. */
export function fitRows(box, selector = '.slotrow') {
  const cs = getComputedStyle(box);
  const avail = box.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  box.querySelectorAll(selector).forEach((r) => fitRow(r, avail));
}
