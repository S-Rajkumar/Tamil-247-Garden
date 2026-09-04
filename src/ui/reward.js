
/**
 * The post-level card. Rows climb from the permanent gain to the spendable
 * ones: new 247 letters, then base coins, then the extra-word premium, then
 * the no-hint bonus — and the 247 jackpot last, when it fires.
 */
export function showReward(root, { results, coinTotal, noHintBonus, hintsUsed, grand, raid, onDone }) {
  const newLetters = results.flatMap((r) => r.newLetters);
  const coinWords = results.filter((r) => r.coins > 0);

  const rows = [];

  if (newLetters.length) {
    rows.push(`
      <div class="rrow">
        <span class="ricon ta" style="background:#2E9E63;color:#fff">அ</span>
        <span class="rlabel">New letters in the 247
          <span class="rlets">${newLetters.map((l) => `<span class="ta">${l}</span>`).join('')}</span>
        </span>
        <span class="rval">+${newLetters.length}</span>
      </div>`);
  }

  const plainWords = coinWords.filter((r) => !r.isBonus);
  const bonusWords = coinWords.filter((r) => r.isBonus);
  const sum = (list) => list.reduce((n, r) => n + r.coins, 0);

  if (plainWords.length) {
    rows.push(`
      <div class="rrow">
        <span class="ricon" style="background:#F0B429">🪙</span>
        <span class="rlabel">${plainWords.length} word${plainWords.length > 1 ? 's' : ''} → coins</span>
        <span class="rval">+${sum(plainWords)}</span>
      </div>`);
  }

  if (bonusWords.length) {
    const top = Math.max(...bonusWords.map((r) => r.rate || 1));
    rows.push(`
      <div class="rrow rrow-hit">
        <span class="ricon" style="background:#E08A1E;color:#fff">✚</span>
        <span class="rlabel">${bonusWords.length} extra word${bonusWords.length > 1 ? 's' : ''}
          <span class="dim">up to ×${top}</span></span>
        <span class="rval">+${sum(bonusWords)}</span>
      </div>`);
  }

  if (noHintBonus > 0) {
    rows.push(`
      <div class="rrow">
        <span class="ricon" style="background:#7A5EA8;color:#fff">✦</span>
        <span class="rlabel">No hints used <span class="dim">double coins</span></span>
        <span class="rval">+${noHintBonus}</span>
      </div>`);
  } else if (hintsUsed > 0) {
    rows.push(`
      <div class="rrow rrow-dim">
        <span class="ricon" style="background:#B9BFB2">✦</span>
        <span class="rlabel">${hintsUsed} hint${hintsUsed > 1 ? 's' : ''} used</span>
        <span class="rval">—</span>
      </div>`);
  }

  if (raid) {
    rows.push(`
      <div class="rrow${raid.repelled ? ' rrow-hit' : ' rrow-warn'}">
        <span class="ricon" style="background:${raid.repelled ? '#2E9E63' : '#C4553C'};color:#fff">${raid.repelled ? '🛡' : '⚠'}</span>
        <span class="rlabel">${raid.repelled ? 'Raid driven off' : 'Raid got through'}
          <br><span class="dim">${raid.repelled ? 'bounty claimed' : `your ${raid.target} was set back`}</span></span>
        <span class="rval">${raid.repelled ? `+${raid.bounty}` : '—'}</span>
      </div>`);
  }

  if (grand > 0) {
    rows.push(`
      <div class="rrow rrow-grand">
        <span class="ricon" style="background:#7A5EA8;color:#fff">★</span>
        <span class="rlabel"><b>All 247 collected</b><br><span class="dim">a Tree of 247 takes root in your garden</span></span>
        <span class="rval">+${grand.toLocaleString()}</span>
      </div>`);
  }

  const total = coinTotal + noHintBonus + (grand || 0) + (raid && raid.repelled ? raid.bounty : 0);

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.innerHTML = `
    <div class="rcard" role="dialog" aria-label="Round complete">
      <p class="rtitle">Round complete</p>
      ${rows.join('')}
      <div class="rtotal"><span>Total</span><span><b data-count>0</b> 🪙</span></div>
      <div class="ractions">
        <button class="btn btn-ghost" data-act="world">Garden</button>
        <button class="btn btn-primary" data-act="next">Next</button>
      </div>
    </div>`;
  root.querySelector('.screen').appendChild(overlay);

  overlay.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 220, easing: 'ease-out' });
  const card = overlay.querySelector('.rcard');
  card.animate(
    [{ transform: 'translateY(30px) scale(.94)', opacity: 0 }, { transform: 'translateY(0) scale(1)', opacity: 1 }],
    { duration: 420, easing: 'cubic-bezier(.34,1.5,.64,1)' }
  );
  overlay.querySelectorAll('.rrow').forEach((r, i) =>
    r.animate([{ transform: 'translateX(-16px)', opacity: 0 }, { transform: 'translateX(0)', opacity: 1 }],
      { duration: 340, delay: 220 + i * 110, easing: 'cubic-bezier(.34,1.4,.64,1)', fill: 'backwards' })
  );

  countUp(overlay.querySelector('[data-count]'), total, 220 + rows.length * 110);

  overlay.addEventListener('click', (ev) => {
    const btn = ev.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    overlay.style.pointerEvents = 'none';
    overlay.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
    // Never hang navigation off animation.onfinish — a hidden tab stops
    // compositing and the callback never runs, stranding the player here.
    setTimeout(() => { overlay.remove(); onDone(act); }, 190);
  });
}

function countUp(node, to, delay) {
  if (!node) return;
  const dur = 700;
  let start = null;
  let done = false;

  const settle = () => { done = true; node.textContent = String(to); };

  const step = (t) => {
    if (done) return;
    if (start === null) start = t;
    const p = Math.min(1, (t - start) / dur);
    node.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(step); else done = true;
  };

  setTimeout(() => requestAnimationFrame(step), delay);
  // rAF is suspended while the tab is hidden — and this game gets hidden a lot.
  // Guarantee the real number lands even if the animation never runs.
  setTimeout(settle, delay + dur + 120);
}
