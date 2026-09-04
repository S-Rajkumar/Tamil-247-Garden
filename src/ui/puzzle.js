import { makeLevel, LEVEL_COUNT } from '../game/levels.js';
import {
  state, recordWord, addCoins, save, emit, claimGrandPrize, ownsSky, setSky,
} from '../game/state.js';
import { letters } from '../tamil/letters.js';
import { inDictionary, dictionaryReady, meaningOf } from '../tamil/dictionary.js';
import {
  rollRaid, plantRelic, gardenLevel, cells, cellType, radius, petList, MAX_LEVEL,
  gridSide, growAll,
} from '../game/garden.js';
import { gardenSvg } from '../art/garden.js';
import { showReward } from './reward.js';
import { SKIES, SKY_IDS, skyLayer } from '../art/sky.js';
import { sfx, setMusic, setSfx, setMood } from '../audio/sound.js';
import { fitAll, fitRows } from './fittext.js';
import { startTutorial } from './tutorial.js';
import { watchIdle } from './idle.js';

import { toast } from './toast.js';

const HINT_COST = { picture: 10, first: 15, word: 20 };

/** How much of the garden is drawn behind the puzzle. */
const BG_RADIUS = 4;

/** Coin multiplier for the 1st, 2nd, 3rd, 4th+ extra word found in a level. */
const BONUS_STEPS = [1.5, 2, 2.5, 3];
const bonusRate = (i) => BONUS_STEPS[Math.min(i, BONUS_STEPS.length - 1)];

export function renderPuzzle(root, { onDone }) {
  const tier = gardenLevel();
  const level = makeLevel(state.levelIndex, tier, state.wheelSize);
  const found = new Set();
  const foundBonus = new Set();
  const results = [];
  let hintsUsed = 0;
  let finished = false;
  let confirmRestart = false;
  let tutorial = null;
  let idle = null;
  let pool = [...level.pool];

  root.innerHTML = `
    <div class="screen puzzle">
      <div class="puzzlebg" aria-hidden="true" data-sky-layer>
        ${skyLayer(state.sky)}
        <div class="pbgstage">${gardenSvg({
          // Only the middle of the garden goes behind the puzzle. A large
          // garden is hundreds of cells, and none of it is readable at this
          // size or opacity — drawing it all would cost frames for nothing.
          cells: [...cells().keys()].map((k) => {
            const [c, r] = k.split(',').map(Number);
            return { c, r, type: cellType(k) };
          }).filter(({ c, r }) => Math.max(Math.abs(c), Math.abs(r)) <= BG_RADIUS),
          radius: Math.min(radius(), BG_RADIUS),
          plants: state.plants,
          walls: state.walls,
          pets: petList(),
        })}</div>
      </div>
      <div class="topbar">
        <button class="chip chip-btn" data-go="world" aria-label="Go to your garden">
          <span class="chip-ico">🌿</span><span class="chip-label">Garden</span>
        </button>
        <span class="chip chip-coin"><i class="coin"></i><b data-coins>${state.coins}</b></span>
        <button class="chip chip-btn chip-mini" data-sky-btn
                aria-label="Change the sky"></button>
        <button class="chip chip-btn chip-mini" data-sound
                aria-label="Sound settings"></button>
        <div class="soundpop" data-soundpop hidden></div>
        <div class="skypop" data-skypop hidden></div>
        <div class="tippop" data-leveltippop hidden></div>
        <button class="chip chip-btn chip-level" data-leveltip
                aria-label="What sets the level">Level ${tier}<span class="qmark">?</span></button>
      </div>

      <div class="slots" data-slots></div>

      <div class="bonusbar">
        <span class="bonus-pill"><b data-bonuscount>0</b> bonus ${level.bonus.length ? `<span class="dim">/ ${level.bonus.length} known</span>` : ''}</span>
      </div>

      <div class="wordpreview" data-preview aria-live="polite"></div>

      <div class="arcwrap">
        <div class="arc" data-arc>
          <div class="arc-disc"></div>
          <svg class="arc-halo" viewBox="0 0 240 240" aria-hidden="true">
            <circle class="halo-base" cx="120" cy="120" r="114"/>
            <circle class="halo-trail" cx="120" cy="120" r="114" data-trail/>
            <g class="halo-comet" data-comet>
              <circle class="comet-tail" cx="120" cy="6" r="9"/>
              <circle class="comet-head" cx="120" cy="6" r="4.5"/>
            </g>
          </svg>
          <svg class="arc-link" viewBox="0 0 240 240" aria-hidden="true"><polyline data-link/></svg>
        </div>
      </div>

      <div class="hintbar">
        <button class="hint" data-hint="shuffle"><span class="hi">🔀</span><span class="hl">Shuffle</span><span class="hc free">free</span></button>
        <button class="hint" data-hint="picture"><span class="hi">🖼️</span><span class="hl">Meaning</span><span class="hc">${HINT_COST.picture}</span></button>
        <button class="hint" data-hint="first"><span class="hi">🔤</span><span class="hl">Letter</span><span class="hc">${HINT_COST.first}</span></button>
        <button class="hint" data-hint="word"><span class="hi">💡</span><span class="hl">Reveal</span><span class="hc">${HINT_COST.word}</span></button>
        <button class="hint" data-restart><span class="hi">🔄</span><span class="hl">Restart</span><span class="hc free">free</span></button>
      </div>
    </div>`;

  const el = (s) => root.querySelector(s);
  const arc = el('[data-arc]');
  const link = el('[data-link]');
  const preview = el('[data-preview]');
  const slotsBox = el('[data-slots]');

  // --- slots ----------------------------------------------------------------
  function drawSlots() {
    slotsBox.innerHTML = level.targets
      .map((t, i) => {
        const got = found.has(t.w);
        const cells = t.ls
          .map((l, j) => `<span class="cell${got ? ' filled' : ''}" style="--d:${j * 45}ms">${got ? l : ''}</span>`)
          .join('');
        return `<div class="slotrow" data-row="${i}">${cells}</div>`;
      })
      .join('');
    // Rows, not cells: every letter of a word keeps the same size.
    fitRows(slotsBox);
  }

  // --- tiles ----------------------------------------------------------------
  let tiles = [];
  // Half the gap between neighbours, so a drag never claims two tiles at once.
  let hitR = 30;
  /** Send a light around the wheel — on arrival, and on every reshuffle. */
  function sweep() {
    const halo = el('.arc-halo');
    if (!halo) return;
    halo.classList.remove('is-sweeping');
    void halo.offsetWidth;          // restart the animation, not just re-add it
    halo.classList.add('is-sweeping');
  }

  function drawTiles() {
    arc.querySelectorAll('.tile').forEach((n) => n.remove());
    const n = pool.length;
    // A ten-letter wheel has to breathe: push the ring out and shrink the
    // tiles, or the last few overlap their neighbours.
    const R = n >= 9 ? 92 : 84;
    arc.style.setProperty('--tile-size', n <= 6 ? '54px' : n <= 8 ? '48px' : '42px');
    arc.style.setProperty('--tile-font', n <= 6 ? '23px' : n <= 8 ? '20px' : '17px');
    // Neighbours sit 2·pi·R/n apart; claim a little under half that each.
    hitR = Math.min(30, (Math.PI * R) / n * 0.92);
    tiles = pool.map((letter, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      const x = 120 + Math.cos(a) * R;
      const y = 120 + Math.sin(a) * R;
      const node = document.createElement('button');
      node.className = 'tile';
      node.type = 'button';
      node.textContent = letter;
      node.style.left = `${(x / 240) * 100}%`;
      node.style.top = `${(y / 240) * 100}%`;
      node.style.setProperty('--i', i);
      node.dataset.index = String(i);
      arc.appendChild(node);
      return { letter, x, y, node, index: i };
    });
    // A cluster like ணை is three times the width of ப at the same size, and
    // the tile clips what does not fit. Measure after layout, shrink the wide
    // ones only.
    fitAll(arc, '.tile');
  }

  // --- drag selection -------------------------------------------------------
  let picked = [];
  let dragging = false;

  const toLocal = (ev) => {
    const r = arc.getBoundingClientRect();
    return { x: ((ev.clientX - r.left) / r.width) * 240, y: ((ev.clientY - r.top) / r.height) * 240 };
  };

  function hitTest(p) {
    for (const t of tiles) {
      if (Math.hypot(t.x - p.x, t.y - p.y) < hitR) return t;
    }
    return null;
  }

  function pick(t) {
    if (!t || picked.includes(t)) return;
    picked.push(t);
    sfx('tap', picked.length - 1);
    t.node.classList.add('on');
    t.node.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.22)' }, { transform: 'scale(1.08)' }],
      { duration: 220, easing: 'cubic-bezier(.34,1.56,.64,1)' }
    );
    paint();
  }

  function paint() {
    link.setAttribute('points', picked.map((t) => `${t.x},${t.y}`).join(' '));
    const word = picked.map((t) => t.letter).join('');
    // The word being built is also the button that sends it. Tapping letters
    // one at a time had no visible way to submit or to undo, so the word just
    // grew until it was nonsense.
    // Not while a finger is down: a drag submits on release, so the controls
    // would flash up mid-word and never be used.
    const controls = !dragging && picked.length >= 1;
    preview.innerHTML = word
      ? `<span class="pw-word">${word}</span>
         ${controls && picked.length >= 2 ? '<button class="pw-go" data-submit aria-label="Enter this word">✓</button>' : ''}
         ${controls ? '<button class="pw-x" data-clearpick aria-label="Clear">✕</button>' : ''}`
      : '';
    preview.classList.toggle('show', word.length > 0);
    preview.classList.remove('bad', 'good');
  }

  function clearPick() {
    picked.forEach((t) => t.node.classList.remove('on'));
    picked = [];
    paint();
  }

  /** Step back to a letter already in the word, dropping everything after it. */
  function truncateTo(t) {
    const i = picked.indexOf(t);
    if (i < 0) return;
    picked.slice(i + 1).forEach((x) => x.node.classList.remove('on'));
    picked = picked.slice(0, i + 1);
    paint();
  }

  // Did this press ever reach a second tile? A press that did not is a tap,
  // and taps build a word letter by letter instead of submitting one.
  let gestureMoved = false;
  let tapMode = false;
  let pressedOn = null;
  // Whether the pressed letter was in the word BEFORE this press. It has to be
  // read at pointerdown: by pointerup the press has already added it, so every
  // tap would look like a tap on a letter you already had.
  let pressedWasPicked = false;

  arc.addEventListener('pointerdown', (ev) => {
    if (ev.button != null && ev.button !== 0) return;
    dragging = true;
    gestureMoved = false;
    // Capture can throw if the pointer is already gone by the time this runs.
    try { arc.setPointerCapture(ev.pointerId); } catch { /* pointer released */ }
    if (!tapMode) clearPick();
    pressedOn = hitTest(toLocal(ev));
    pressedWasPicked = Boolean(pressedOn) && picked.includes(pressedOn);
    pick(pressedOn);
  });

  arc.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    const before = picked.length;
    pick(hitTest(toLocal(ev)));
    if (picked.length > before) gestureMoved = true;
  });

  arc.addEventListener('pointerup', (ev) => {
    if (!dragging) return;
    dragging = false;

    // Hit-test the release too. Moves are coalesced under load and a fast
    // flick can jump the gap between two tiles entirely, so the letter the
    // player actually let go on may never have arrived as a move — which is
    // what made a drag "not work" and fail on a single letter.
    const t = hitTest(toLocal(ev));
    pick(t);

    // Letting go on a different letter than you pressed is a drag, whether or
    // not a single move event survived to say so.
    if (t && pressedOn && t !== pressedOn) gestureMoved = true;

    if (gestureMoved) {
      tapMode = false;
      // One letter is never a Tamil word, so grading it can only ever say so.
      // A drag that failed to catch a second tile should fall away quietly
      // rather than accuse the player of a mistake they did not make.
      if (picked.length >= 2) submit(); else clearPick();
      return;
    }

    // A tap. Tapping a letter already in the word steps back to it, which is
    // the undo; ✓ on the word itself sends it. There used to be no way to do
    // either, so a tapped word simply grew until it was nonsense.
    if (pressedWasPicked) {
      if (picked.length === 1) { tapMode = false; clearPick(); return; }
      truncateTo(t);
      tapMode = true;
      return;
    }
    tapMode = picked.length > 0;
    // Repaint even though nothing was added: the press already picked this
    // letter, so `pick` above was a no-op, and the last paint ran while the
    // pointer was still down — which is when the controls are suppressed.
    paint();
  });

  // The word being built doubles as its own controls.
  preview.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-submit]')) {
      tapMode = false;
      submit();
      return;
    }
    if (ev.target.closest('[data-clearpick]')) {
      tapMode = false;
      clearPick();
    }
  });

  // The browser cancels a pointer when it decides the gesture is its own —
  // a scroll, a native drag. Whatever is half-selected was never an answer
  // the player gave, so it must be abandoned rather than graded.
  arc.addEventListener('pointercancel', () => {
    dragging = false;
    tapMode = false;
    clearPick();
  });

  // Keyboard only. `detail` is 0 for a click synthesised by Enter or Space on
  // a focused button; a real pointer click is already handled above, and
  // letting it through here picked the tile a second time after every drag.
  arc.addEventListener('click', (ev) => {
    if (ev.detail !== 0) return;
    const btn = ev.target.closest('.tile');
    if (!btn) return;
    tapMode = true;
    pick(tiles[Number(btn.dataset.index)]);
  });
  root.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter') submit();
    if (ev.key === 'Escape') clearPick();
  });

  // --- submitting a word ----------------------------------------------------
  function submit() {
    const word = picked.map((t) => t.letter).join('');
    if (!word) return clearPick();

    const entry = level.byWord.get(word);
    const already = found.has(word) || foundBonus.has(word);
    // A word the curated corpus doesn't carry can still be a real Tamil word.
    // Accept it on the dictionary's word, pay coins, skip the meaning.
    const inDict = !entry && !already && letters(word).length >= 2 && inDictionary(word);

    if (already) return reject('Already found');
    if (!entry && !inDict) return reject(dictionaryReady() ? 'Not a word' : 'Not in our list yet');

    preview.classList.add('good');
    const isTarget = level.targets.some((t) => t.w === word);
    if (isTarget) found.add(word); else foundBonus.add(word);

    const res = recordWord(word);
    res.isBonus = !isTarget;

    // Extra words are optional effort, so they pay a premium — and the premium
    // climbs with each one found, so the player who keeps digging after the
    // level is technically finished is the one who gets paid for it.
    if (res.isBonus) {
      res.rate = bonusRate(foundBonus.size - 1);
      res.baseCoins = res.coins;
      res.coins = Math.round(res.coins * res.rate);
    }

    results.push(res);
    drawSlots();
    const counter = el('[data-bonuscount]');
    if (counter) counter.textContent = String(foundBonus.size);

    // Whatever else happens, joining a word is the lesson. End it here
    // rather than waiting for the tutorial's own word: a player who works
    // out the gesture and spells something else has plainly learnt it.
    if (tutorial) { tutorial.stop(); tutorial = null; }

    if (isTarget) { sfx('good'); flyToSlot(word); }
    else toast(root, `${word} · +${res.coins}  ×${res.rate}`, 'bonus', 'bonus');

    setTimeout(clearPick, 260);

    if (found.size === level.targets.length) setTimeout(finish, 700);
  }

  function reject(message) {
    preview.classList.add('bad');
    preview.animate(
      [{ transform: 'translateX(0)' }, { transform: 'translateX(-7px)' },
       { transform: 'translateX(7px)' }, { transform: 'translateX(0)' }],
      { duration: 300 }
    );
    toast(root, message, 'bad');
    setTimeout(clearPick, 320);
  }

  function flyToSlot(word) {
    const i = level.targets.findIndex((t) => t.w === word);
    const row = slotsBox.querySelector(`[data-row="${i}"]`);
    if (!row) return;
    row.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(1.09)' }, { transform: 'scale(1)' }],
      { duration: 380, easing: 'cubic-bezier(.34,1.56,.64,1)' }
    );
  }

  // --- hints ----------------------------------------------------------------
  root.addEventListener('click', (ev) => {
    const skyBtn = ev.target.closest('[data-sky-btn]');
    if (skyBtn) {
      const pop = el('[data-skypop]');
      // Rebuild on open, not just at render: a sky bought in the garden should
      // be here the next time this is opened, whenever that is.
      if (pop.hidden) drawSkyBtn();
      pop.hidden = !pop.hidden;
      return;
    }

    const pick = ev.target.closest('[data-skyset]');
    if (pick) {
      const id = pick.dataset.skyset;
      if (id !== state.sky) {
        setSky(id); setMood(id); sfx('tap');
        const layer = el('[data-sky-layer]');
        // Keep the garden behind it; only the weather in front is rebuilt.
        const keep = layer.querySelector('.pbgstage');
        layer.innerHTML = skyLayer(state.sky);
        if (keep) layer.appendChild(keep);
      }
      el('[data-skypop]').hidden = true;
      drawSkyBtn();
      return;
    }

    if (ev.target.closest('[data-restart]')) {
      // The one escape from a genuine dead end: at zero coins every hint is
      // out of reach, Shuffle does not help someone who does not know the
      // words, and leaving for the garden deals the same level again because
      // levelIndex only advances on a win. Without this a new player who
      // spends their opening 100 coins on a round they cannot solve is stuck
      // for good. It pays nothing, so there is nothing to farm by using it.
      if (results.length && !confirmRestart) {
        confirmRestart = true;
        toast(root, `Tap Restart again — ${results.length} found word${
          results.length > 1 ? 's' : ''} will be lost`, 'bad', 'bad', 2600);
        setTimeout(() => { confirmRestart = false; }, 2600);
        return;
      }
      state.levelIndex = (state.levelIndex + 1) % LEVEL_COUNT;
      save();
      sfx('tap');
      onDone('next');
      return;
    }

    if (ev.target.closest('[data-leveltip]')) {
      // A panel under the chip, not a toast. The level is not a counter that
      // ticks over on a win — it is the size of the garden — and that takes a
      // couple of sentences to say. A pill in the middle of the screen, 460px
      // from the chip you tapped, was gone before it had been read.
      const pop = el('[data-leveltippop]');
      if (!pop.hidden) { pop.hidden = true; return; }   // tapping again closes it
      const grown = tier >= MAX_LEVEL;
      const side = gridSide();
      pop.innerHTML = `
        <b class="tip-h">Level ${tier}</b>
        <p>Your garden is <b>${side}×${side}</b>. The level <em>is</em> its size — it
           does not tick over when you win a round.</p>
        <p>${grown
          ? 'Fully grown, so the wheel is yours to choose in the garden.'
          : `<b>Expand</b> in the garden to reach level ${tier + 1}.`}</p>
        <p class="tip-f">Every 2 levels adds a letter to the wheel — <b>${level.pool.length}</b> now.</p>`;
      el('[data-skypop]').hidden = true;
      pop.hidden = false;
      sfx('tap');
      return;
    }

    // Any other tap closes whichever panel is open.
    for (const sel of ['[data-skypop]', '[data-leveltippop]', '[data-soundpop]']) {
      const open = el(sel);
      if (open && !open.hidden) open.hidden = true;
    }

    if (ev.target.closest('[data-sound]')) {
      const pop = el('[data-soundpop]');
      if (pop.hidden) drawSound();
      pop.hidden = !pop.hidden;
      return;
    }

    const tog = ev.target.closest('[data-toggle]');
    if (tog) {
      const which = tog.dataset.toggle;
      state[which] = !state[which];
      if (which === 'music') setMusic(state.music); else setSfx(state.sfx);
      save();
      drawSound();
      return;
    }


    const btn = ev.target.closest('[data-hint]');
    if (!btn) return;
    const kind = btn.dataset.hint;

    if (kind === 'shuffle') {
      pool = shuffle(pool);
      clearPick();
      drawTiles();
      sweep();
      arc.querySelectorAll('.tile').forEach((n, i) =>
        n.animate([{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
          { duration: 300, delay: i * 30, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' })
      );
      return;
    }

    const remaining = level.targets.filter((t) => !found.has(t.w));
    if (!remaining.length) {
      return toast(root, 'Every word is found — nothing left to hint at',
                   'hint', null, 2400);
    }
    const target = remaining[0];
    const cost = HINT_COST[kind];
    if (state.coins < cost) {
      return toast(root, `${cost - state.coins} more coins needed`, 'bad');
    }

    addCoins(-cost);
    hintsUsed += 1;
    el('[data-coins]').textContent = String(state.coins);

    // A hint has to outlast being read. At the default 1500ms a toast is only
    // at full opacity between 330ms and 1050ms, so a meaning was legible for
    // about seven tenths of a second — and a meaning is not just read, it is
    // worked from: you hold the English and hunt the wheel for the Tamil.
    if (kind === 'picture') toast(root, target.en || meaningOf(target.w) || '?', 'hint', undefined, 4500);
    if (kind === 'first') toast(root, `${target.ls[0]} …`, 'hint', undefined, 2800);
    if (kind === 'word') {
      found.add(target.w);
      results.push(recordWord(target.w));
      drawSlots();
      if (found.size === level.targets.length) setTimeout(finish, 700);
    }
  });

  // --- finishing ------------------------------------------------------------
  /**
   * The sky picker, in-play. A popover rather than the garden's drawer: a
   * drawer here would cover the wheel, and the only thing worth doing mid-round
   * is switching between skies already owned — buying belongs in the garden.
   */
  function drawSkyBtn() {
    const b = el('[data-sky-btn]');
    if (!b) return;
    const s = SKIES[state.sky] || SKIES.day;
    b.textContent = s.ico;
    b.title = s.en;

    const pop = el('[data-skypop]');
    if (!pop) return;
    const owned = SKY_IDS.filter(ownsSky);
    pop.innerHTML = owned.map((id) => `
      <button class="skydot${id === state.sky ? ' is-using' : ''}" data-skyset="${id}" title="${SKIES[id].en}">
        <span class="skydot-sw" style="background:linear-gradient(${SKIES[id].sky[0]},${SKIES[id].sky[3]})"></span>
        <span class="skydot-ico">${SKIES[id].ico}</span>
      </button>`).join('')
      + (owned.length < SKY_IDS.length
        ? `<span class="skydot-note">${SKY_IDS.length - owned.length} more as the garden grows</span>` : '');
  }

/**
   * Music and effects switch separately. An overall mute button is disallowed
   * by the certification requirements, which ask for granular controls.
   */
  function drawSound() {
    const b = el('[data-sound]');
    if (b) {
      b.textContent = (state.music || state.sfx) ? '🔊' : '🔇';
      b.title = 'Sound settings';
    }
    const pop = el('[data-soundpop]');
    if (!pop) return;
    pop.innerHTML = [
      ['music', '🎵', 'Music'],
      ['sfx', '🔔', 'Effects'],
    ].map(([key, ico, label]) => `
      <button class="sndrow${state[key] ? ' is-on' : ''}" data-toggle="${key}"
              role="switch" aria-checked="${state[key] ? 'true' : 'false'}">
        <span class="snd-ico">${ico}</span>
        <span class="snd-label">${label}</span>
        <span class="snd-sw" aria-hidden="true"><i></i></span>
      </button>`).join('');
  }

  function finish() {
    // Every successful submit used to re-arm this once the last target was in,
    // so finding one more bonus word during the 700ms wait opened a second
    // reward card on top of the first.
    if (finished) return;
    finished = true;
    idle?.stop();
    idle = null;
    const coinTotal = results.reduce((s, r) => s + r.coins, 0);
    // Clearing a round untouched is worth the round again, not a third of it.
    const noHintBonus = hintsUsed === 0 ? coinTotal : 0;
    addCoins(coinTotal + noHintBonus);
    state.levelIndex = (state.levelIndex + 1) % LEVEL_COUNT;
    // Filling the 247 pays out here, once — the celebration belongs on the
    // card that just revealed the final letter.
    const grand = claimGrandPrize();
    sfx(grand > 0 ? 'jackpot' : 'win');
    // A round of play moves every plant on a stage. This is the garden's only
    // free growth and the reason it can turn a profit at all: paying for water
    // was once the only way, and it cost more than any crop was worth.
    const grown = growAll();
    const raid = rollRaid();
    if (grand > 0) plantRelic();
    save();
    emit();
    showReward(root, { results, coinTotal, noHintBonus, hintsUsed, grand, raid, onDone });
  }

  drawSlots();
  drawTiles();
  sweep();
  arc.querySelectorAll('.tile').forEach((n, i) =>
    n.animate([{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1)', opacity: 1 }],
      { duration: 380, delay: 80 + i * 45, easing: 'cubic-bezier(.34,1.56,.64,1)', fill: 'backwards' })
  );

  // The first-run lesson: how to join letters into a word. Shown only to
  // someone who has never done it, and started after the tiles have finished
  // popping in so the finger has something to trace.
  /**
   * Point at a way out, once it is clear the player is stuck.
   *
   * Shuffle first, because it is free and often enough — a wheel read in a new
   * order frequently gives the word up. Only if that goes unused as well does
   * the game point at the hints and Restart, which cost coins or the round.
   */
  const NUDGES = [
    { after: 15000, name: 'shuffle' },
    { after: 40000, name: 'more' },
  ];

  function highlight(which) {
    root.querySelectorAll('.hint').forEach((b) => b.classList.remove('is-nudge'));
    if (!which) return;
    const sel = which === 'shuffle'
      ? ['[data-hint="shuffle"]']
      : ['[data-hint="picture"]', '[data-hint="first"]', '[data-hint="word"]', '[data-restart]'];
    sel.forEach((s) => root.querySelector(s)?.classList.add('is-nudge'));
  }

  function startIdleWatch() {
    if (idle || finished) return;
    idle = watchIdle(root, NUDGES, highlight);
  }

  if (!state.taught) {
    setTimeout(() => {
      if (state.taught) return;
      tutorial = startTutorial({
        arc,
        tiles,
        targets: level.targets,
        onEnd() {
          state.taught = true;
          save();
          tutorial = null;
          startIdleWatch();       // the lesson was the nudge; now the clock runs
        },
      });
    }, 900);
  } else {
    startIdleWatch();
  }

  drawSound();
  drawSkyBtn();

  const ring = el('[data-ring]');
  if (ring) {
    const pct = state.letters.size / 247;
    ring.style.strokeDasharray = `${pct * 50.3} 50.3`;
  }
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
