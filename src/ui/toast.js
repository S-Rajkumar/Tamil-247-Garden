import { sfx } from '../audio/sound.js';

/** What each kind of toast sounds like, unless the caller names something. */
const SOUND = { bonus: 'good', bad: 'bad', hint: 'tap' };

/**
 * Transient pill that pops above the letter arc.
 *
 * Sound rides along with it: every outcome in the garden already announces
 * itself through a toast, so this is the one place that has to know whether a
 * thing succeeded. Pass `sound` to override, or `null` for a silent toast.
 */
export function toast(root, text, kind = 'bonus', sound, ms = 1500) {
  sfx(sound === undefined ? SOUND[kind] : sound);
  let layer = root.querySelector('.toastlayer');
  if (!layer) {
    layer = document.createElement('div');
    layer.className = 'toastlayer';
    root.querySelector('.screen')?.appendChild(layer);
  }
  const node = document.createElement('div');
  node.className = `toast toast-${kind}`;
  node.textContent = text;
  layer.appendChild(node);

  node.animate(
    [
      { transform: 'translateY(14px) scale(.8)', opacity: 0 },
      { transform: 'translateY(0) scale(1)', opacity: 1, offset: 0.22 * (1500 / ms) },
      { transform: 'translateY(-4px) scale(1)', opacity: 1, offset: 1 - 0.3 * (1500 / ms) },
      { transform: 'translateY(-26px) scale(.94)', opacity: 0 },
    ],
    { duration: ms, easing: 'cubic-bezier(.34,1.4,.64,1)', fill: 'forwards' }
  );
  // Timer, not onfinish — a hidden tab would otherwise leave toasts stacked up.
  setTimeout(() => node.remove(), ms + 50);
}
