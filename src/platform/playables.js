/**
 * The YouTube Playables SDK, behind one door.
 *
 * Every `ytgame` call in the game lives here. Outside Playables — `npm run
 * dev`, or a plain web build — each function falls back to something sane, so
 * the game runs identically in a browser with no SDK present.
 *
 * The rules this module exists to keep, from the certification requirements:
 *
 *   - The SDK loads before any game code (a script tag in index.html).
 *   - `firstFrameReady` when a loading screen is on screen; `gameReady` only
 *     when the game can actually be played.
 *   - Pause and resume come from `onPause`/`onResume`. The Page Visibility
 *     API is forbidden outright, so it appears nowhere in this codebase.
 *   - Saves go through `saveData`/`loadData`, and `loadData` MUST be awaited
 *     before the first `saveData`.
 *   - Audio must be silent whenever YouTube itself is muted.
 *   - `navigator.language` is forbidden; the locale comes from `getLanguage`.
 */

/**
 * The SDK script loads from youtube.com wherever the page is served, so
 * `ytgame` and every method on it exist off-platform too — `loadData` is a
 * real function there and resolves to an empty string. Checking that a method
 * is present therefore proves nothing, and gating storage on it silently read
 * an empty save over a real one during development.
 *
 * `IN_PLAYABLES_ENV` is the documented signal and the only one used here:
 * `sdk()` returns the SDK only when it will actually do something.
 */
const raw_ = () => (typeof ytgame !== 'undefined' ? ytgame : null);

/** True only inside a real Playables frame. */
export function inPlayables() {
  const y = raw_();
  return Boolean(y && y.IN_PLAYABLES_ENV);
}

const sdk = () => (inPlayables() ? raw_() : null);

/** Present whenever the script loaded, in or out of a Playables frame. */
export function sdkVersion() {
  const y = raw_();
  return y && y.SDK_VERSION ? y.SDK_VERSION : null;
}

// ---------------------------------------------------------------------------
// lifecycle
// ---------------------------------------------------------------------------

let announcedFirstFrame = false;
let announcedReady = false;

/** The loading screen is up. Safe to call more than once. */
export function firstFrameReady() {
  if (announcedFirstFrame) return;
  announcedFirstFrame = true;
  try { sdk()?.game?.firstFrameReady?.(); } catch (e) { logError(e); }
}

/**
 * The game can be played. Must not be called while anything non-interactive
 * is still on screen — the platform measures initial bundle size as the bytes
 * downloaded up to this call.
 */
export function gameReady() {
  if (announcedReady) return;
  announcedReady = true;
  try { sdk()?.game?.gameReady?.(); } catch (e) { logError(e); }
}

/**
 * Pause and resume. Both SDK registrations return an unsubscribe function.
 * Outside Playables these never fire, which is correct: a dev browser tab has
 * no platform pause, and reaching for `visibilitychange` instead is exactly
 * what the requirements forbid.
 */
export function onPause(fn) {
  try { return sdk()?.system?.onPause?.(fn) || (() => {}); } catch { return () => {}; }
}

export function onResume(fn) {
  try { return sdk()?.system?.onResume?.(fn) || (() => {}); } catch { return () => {}; }
}

// ---------------------------------------------------------------------------
// audio
// ---------------------------------------------------------------------------

/** Whether YouTube itself permits sound right now. True when there is no SDK. */
export function isAudioEnabled() {
  const y = sdk();
  // Off-platform there is no YouTube mute to respect, so sound is permitted.
  if (!y) return true;
  try { return y.system.isAudioEnabled() !== false; } catch { return true; }
}

export function onAudioEnabledChange(fn) {
  try { return sdk()?.system?.onAudioEnabledChange?.(fn) || (() => {}); } catch { return () => {}; }
}

// ---------------------------------------------------------------------------
// locale
// ---------------------------------------------------------------------------

/**
 * The player's YouTube language as a BCP-47 tag. `navigator.language` is
 * forbidden, so there is no fallback to it: off-platform we simply do not know,
 * and the interface is English regardless.
 */
export async function getLanguage() {
  try { return (await sdk()?.system?.getLanguage?.()) || null; } catch { return null; }
}

// ---------------------------------------------------------------------------
// saving
// ---------------------------------------------------------------------------

const LOCAL_KEY = 't247world.save.v6';

/**
 * The final flush save is capped at 64 KiB of content, so a save that has
 * grown past that would be silently dropped at the worst possible moment.
 * Measured in UTF-16 code units, which is how the platform counts it.
 */
export const FLUSH_LIMIT = 64 * 1024;
export const saveSize = (s) => (s ? s.length : 0);

/** Read the save once, at boot. Nothing may be written before this resolves. */
export async function readSave() {
  const y = sdk();
  if (y) {
    try {
      const raw = await y.game.loadData();
      return typeof raw === 'string' && raw ? raw : null;
    } catch (e) {
      // A first-time player has no save; that is not a failure worth logging
      // loudly, but a genuine read error means we must not overwrite it.
      if (e?.errorType && e.errorType !== 'INVALID_PARAMS') logError(e);
      return null;
    }
  }
  try { return localStorage.getItem(LOCAL_KEY); } catch { return null; }
}

let loaded = false;
let pending = null;
let inFlight = false;

/** Called once `readSave` has resolved. Until then every write is refused. */
export function markLoaded() { loaded = true; }

/**
 * Persist. Writes coalesce: the game saves after almost every action, and the
 * platform call is a round trip, so only the newest state is ever sent and
 * only one request is ever open.
 */
export function writeSave(raw) {
  const y = sdk();
  if (!y) {
    try { localStorage.setItem(LOCAL_KEY, raw); } catch { /* private mode */ }
    return;
  }
  if (!loaded) {
    // `loadData` MUST be awaited before `saveData`. Writing first would
    // overwrite a real save with a blank one.
    logWarning('save before load');
    return;
  }
  pending = raw;
  drain();
}

function drain() {
  const y = sdk();
  if (!y || inFlight || pending == null) return;
  const raw = pending;
  pending = null;
  inFlight = true;
  try {
    y.game.saveData(raw)
      .catch((e) => logError(e))
      .finally(() => { inFlight = false; drain(); });
  } catch (e) {
    inFlight = false;
    logError(e);
  }
}

/** Force the newest state out now — for `onPause`, which may precede an exit. */
export function flushSave(raw) {
  // Off-platform this has to fall through to localStorage like any other
  // write, or a flush would quietly do nothing outside a Playables frame.
  if (!inPlayables()) { if (raw != null) writeSave(raw); return; }
  if (raw != null) pending = raw;
  drain();
}

// ---------------------------------------------------------------------------
// health
// ---------------------------------------------------------------------------

export function logError(err) {
  try { sdk()?.health?.logError?.(); } catch { /* nothing left to try */ }
  if (!inPlayables()) console.error('[playables]', err);
}

export function logWarning(msg) {
  try { sdk()?.health?.logWarning?.(); } catch { /* nothing left to try */ }
  if (!inPlayables()) console.warn('[playables]', msg);
}
