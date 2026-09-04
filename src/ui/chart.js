import { ALL_247, UYIR, MEI, UYIRMEI, MEI_BASE, decompose, letterIndex } from '../tamil/letters.js';
import { state, buyLetter, unlockLetterCost, claimGrandPrize, GRAND_PRIZE } from '../game/state.js';
import { plantRelic } from '../game/garden.js';
import { RELIC, relicIcon } from '../art/garden.js';
import { toast } from './toast.js';

const VOWEL_HEADS = ['அ','ஆ','இ','ஈ','உ','ஊ','எ','ஏ','ஐ','ஒ','ஓ','ஔ'];

/**
 * A section heading carries information: how many of this group the player
 * holds, as a number and as a bar. The Tamil name is the title — the English
 * sits underneath as description, because the alphabet is the subject here.
 */
function section(group, tamil, blurb, total, hue) {
  return `
    <div class="chead" style="--hue:${hue}">
      <div class="chead-main">
        <span class="chead-title ta">${tamil}</span>
        <span class="chead-count"><b data-have="${group}">0</b><span class="dim">/${total}</span></span>
      </div>
      <span class="chead-blurb">${blurb}</span>
      <div class="chead-bar"><i data-bar="${group}"></i></div>
    </div>`;
}

/** The 247 chart. Tapping an unlocked letter shows how it was built. */
export function renderChart(root, { onBack }) {
  const done = state.letters.size >= ALL_247.length;

  root.innerHTML = `
    <div class="screen chart">
      <div class="topbar">
        <button class="chip chip-btn" data-back><span class="chip-ico">&lsaquo;</span><span>Back</span></button>
        <span class="chip chip-coin"><i class="coin"></i><b data-coins>${state.coins}</b></span>
        <span class="chip chip-title"><b data-count>${state.letters.size}</b><span class="dim">/247</span></span>
      </div>

      <div class="chartscroll">
        <div class="progressline"><i data-fill style="width:${(state.letters.size / 247) * 100}%"></i></div>

        ${section('uyir', 'உயிர்', 'the 12 sounds every letter is built from', 12, '#2E9E63')}
        <div class="lrow" data-group="uyir"></div>

        ${section('aytham', 'ஆய்தம்', 'the odd one out', 1, '#E08A1E')}
        <div class="lrow" data-group="aytham"></div>

        ${section('mei', 'மெய்', 'the 18 bare consonants', 18, '#3D9EC4')}
        <div class="lrow" data-group="mei"></div>

        ${section('uyirmei', 'உயிர்மெய்', 'every consonant crossed with every vowel', 216, '#7A5EA8')}
        <div class="lgrid" data-group="uyirmei"></div>

        <div class="reliccard${done ? ' is-won' : ''}">
          <div class="relicart">${relicIcon()}</div>
          <div class="relicinfo">
            <b>${RELIC.en}</b>
            <span>${done
              ? 'Planted in the centre of your garden, bearing forever.'
              : `Fill all 247 and a banyan takes root in the middle of your garden, with <b>${GRAND_PRIZE.toLocaleString()}</b> coins.`}</span>
            <span class="relicnote">Locked letters cost ${unlockLetterCost()} coins each. Some of the 247
              appear in no Tamil word anyone would put in a word game — those are what the coins are for.</span>
          </div>
        </div>
      </div>
      <div class="detail" data-detail hidden></div>
    </div>`;

  const cell = (letter) => {
    const i = letterIndex(letter);
    const got = state.letters.has(i);
    return `<button class="lcell${got ? ' got' : ''}" data-letter="${letter}" data-i="${i}" type="button">
      <span class="ta">${letter}</span>
    </button>`;
  };

  const fill = (sel, list) => { root.querySelector(sel).innerHTML = list.map(cell).join(''); };
  fill('[data-group="uyir"]', UYIR);
  fill('[data-group="aytham"]', ['ஃ']);
  fill('[data-group="mei"]', MEI);

  // A 13-column grid rather than a scrolling table: the whole 216 fits the
  // width of a phone, so nothing has to be dragged sideways to be read.
  const grid = root.querySelector('[data-group="uyirmei"]');
  grid.innerHTML =
    '<span class="lgrid-corner"></span>' +
    VOWEL_HEADS.map((v) => `<span class="lgrid-head ta">${v}</span>`).join('') +
    MEI_BASE.map((m, r) =>
      `<span class="lgrid-row ta">${m}</span>` +
      UYIRMEI.slice(r * 12, r * 12 + 12).map(cell).join('')
    ).join('');

  const detail = root.querySelector('[data-detail]');
  refreshGroups();

  root.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-back]')) return onBack();

    const btn = ev.target.closest('[data-letter]');
    if (!btn) { detail.hidden = true; return; }

    const letter = btn.dataset.letter;
    const i = Number(btn.dataset.i);

    if (!state.letters.has(i)) {
      const cost = unlockLetterCost(i);
      if (buyLetter(i)) {
        btn.classList.add('got');
        btn.animate(
          [{ transform: 'scale(1)' }, { transform: 'scale(1.35)' }, { transform: 'scale(1)' }],
          { duration: 420, easing: 'cubic-bezier(.34,1.6,.64,1)' }
        );
        // The last letter can be bought as easily as found, so the whole
        // reward — coins and the banyan — has to fire here too.
        const grand = claimGrandPrize();
        if (grand > 0) plantRelic();
        refreshCounts();
        if (grand > 0) toast(root, `All 247 collected · +${grand.toLocaleString()} and a banyan`, 'bonus');
        showDetail(letter);
      } else {
        toast(root, `${cost} coins needed`, 'bad');
        btn.animate(
          [{ transform: 'translateX(0)' }, { transform: 'translateX(-4px)' },
           { transform: 'translateX(4px)' }, { transform: 'translateX(0)' }],
          { duration: 260 }
        );
      }
      return;
    }
    showDetail(letter);
  });

  function refreshCounts() {
    root.querySelector('[data-count]').textContent = String(state.letters.size);
    root.querySelector('[data-coins]').textContent = String(state.coins);
    root.querySelector('[data-fill]').style.width = `${(state.letters.size / 247) * 100}%`;
    refreshGroups();
  }

  function refreshGroups() {
    const groups = { uyir: UYIR, aytham: ['ஃ'], mei: MEI, uyirmei: UYIRMEI };
    for (const [name, list] of Object.entries(groups)) {
      const have = list.filter((l) => state.letters.has(letterIndex(l))).length;
      const haveEl = root.querySelector(`[data-have="${name}"]`);
      const barEl = root.querySelector(`[data-bar="${name}"]`);
      if (haveEl) haveEl.textContent = String(have);
      if (barEl) barEl.style.width = `${(have / list.length) * 100}%`;
    }
  }

  function showDetail(letter) {
    const parts = decompose(letter);
    detail.hidden = false;
    detail.innerHTML = parts
      ? `<span class="dpart ta">${parts.mei}</span><span class="dop">+</span>
         <span class="dpart ta">${parts.uyir}</span><span class="dop">=</span>
         <span class="dpart dbig ta">${letter}</span>`
      : `<span class="dpart dbig ta">${letter}</span>`;
    detail.animate(
      [{ transform: 'translateY(16px)', opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
      { duration: 300, easing: 'cubic-bezier(.34,1.5,.64,1)' }
    );
  }
}
