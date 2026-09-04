import { state, save, setSky, ownsSky, skyUnlocksAt } from '../game/state.js';
import {
  plantAt, harvestAt, harvestValue, wallTier, wallCost, sellValue, upgradeWall, sellWall,
  upgradeAllAffordable, wallSummary, readyCount, adoptPet, releasePet, petBonus,
  totalDefence, defenceRating, takeRaidReport, clearPerched,
  boostPlant, plantProgress, BOOSTS, waterAll, growingKeys, nibble, grazeableKeys,
  roundsLeft,
  cells, cellType, radius, gridSide, expand, expandCost, setCellType, atMaxLevel,
  gardenLevel, MAX_LEVEL,
  moveCell, canMove, DIRS, petCapacity, petCount, petCountOf, petList, LAND, WALL,
} from '../game/garden.js';
import {
  gardenSvg, SPECIES, SPECIES_IDS, STAGES, WALL_TIERS, MAX_WALL, TW, TH,
  PETS, PET_IDS, HUNTERS, hunterArt,
} from '../art/garden.js';
import { SKIES, SKY_IDS, skyLayer } from '../art/sky.js';
import { sfx, setMusic, setSfx, setMood } from '../audio/sound.js';
import { poolSizeFor, WHEEL_SIZES } from '../game/levels.js';
import { toast } from './toast.js';

const STAGE_NAME = ['', 'Sprout', 'Growing', 'Ready'];
const IDLE_RAID_MS = 45000; // linger this long and you may witness a live raid

export function renderWorld(root, { onPlay }) {
  let drawer = null;      // 'seeds' | 'pets' | 'layout' | null
  let pickedPlot = null;  // plot awaiting a seed
  let picked = null;      // the one selected cell, whatever is on it
  let zoom = state.zoom || 1;
  let panX = state.panX || 0;
  let panY = state.panY || 0;
  let raidTimer = null;

  root.innerHTML = `
    <div class="screen garden">
      <div class="topbar">
        <span class="chip chip-title"><span class="chip-ico">🌿</span><span class="chip-label">Garden</span></span>
        <span class="chip chip-coin"><i class="coin"></i><b data-coins>${state.coins}</b></span>
        <span class="chip chip-shield" title="Defence from wall and pets, against the current threat">
          <span class="shieldico">🛡</span><b data-def>${totalDefence()}</b>
          <span class="dim" data-rating>${defenceRating()}</span>
        </span>
        <span class="chip chip-btn" data-go="chart" role="button" tabindex="0">
          <svg class="ring" viewBox="0 0 20 20" aria-hidden="true">
            <circle cx="10" cy="10" r="8" class="ring-bg"/>
            <circle cx="10" cy="10" r="8" class="ring-fg" data-ring/>
          </svg><b>${state.letters.size}</b><span class="dim">/247</span>
        </span>
        <button class="chip chip-btn chip-mini" data-drawer-tab="sky"
                aria-label="Change the sky" data-sky-btn></button>
        <button class="chip chip-btn chip-mini" data-sound
                aria-label="Sound settings"></button>
        <div class="soundpop" data-soundpop hidden></div>
      </div>

      <div class="gview" data-view>
        <div class="gsky" aria-hidden="true" data-sky-layer>${skyLayer(state.sky)}</div>
        <div class="gstage" data-stage></div>
        <div class="gfloat" data-float aria-hidden="true"></div>
        <div class="zoomer">
          <button class="zbtn" data-zoom="in"  aria-label="Zoom in">+</button>
          <button class="zbtn" data-zoom="out" aria-label="Zoom out">&minus;</button>
          <button class="zbtn" data-zoom="fit" aria-label="Fit garden">&#8690;</button>
        </div>
        <div class="raidbanner" data-raid hidden></div>
      </div>

      <div class="gbar" data-bar></div>
      <div class="gdrawer" data-drawer hidden></div>

      <div class="worldactions">
        <button class="btn btn-primary btn-lg" data-act="play">Play</button>
      </div>
    </div>`;

  const stage = root.querySelector('[data-stage]');
  const bar = root.querySelector('[data-bar]');
  const drawerEl = root.querySelector('[data-drawer]');
  const floatLayer = root.querySelector('[data-float]');
  const banner = root.querySelector('[data-raid]');

  // ------------------------------------------------------------- drawing --
  /**
   * Send every pet off on its own errand: pick a spot, amble there, stand
   * about for a few seconds, pick another. Each animal keeps its own timer, so
   * nothing marches in step.
   */
  let wanderTimers = [];
  function wanderPets() {
    wanderTimers.forEach(clearTimeout);
    wanderTimers = [];
    const R = Math.max(1, radius());
    const svg = stage.querySelector('.gardensvg');
    if (!svg) return;

    svg.querySelectorAll('.petorbit').forEach((node) => {
      const ground = node.dataset.ground === '1';
      const step = () => {
        // Somewhere inside the garden, biased away from the exact centre so
        // they do not all pile onto the relic.
        const a = Math.random() * Math.PI * 2;
        const d = (0.25 + Math.random() * 0.7) * R;
        const x = Math.cos(a) * d * TW * 0.5;
        const y = Math.sin(a) * d * TH * 0.5 - (ground ? 0 : 26 + Math.random() * 22);
        const travel = 2200 + Math.random() * 2600;
        const rest = 2000 + Math.random() * 3000;   // 2-5 seconds standing still
        node.style.transition = `transform ${travel}ms cubic-bezier(.4,.05,.35,1)`;
        node.style.transform = `translate(${x.toFixed(0)}px, ${y.toFixed(0)}px) scaleX(${x < 0 ? -1 : 1})`;
        wanderTimers.push(setTimeout(step, travel + rest));
      };
      wanderTimers.push(setTimeout(step, Math.random() * 1800));
    });
  }

  function drawGarden() {
    stage.innerHTML = gardenSvg({
      cells: [...cells().keys()].map((k) => {
        const [c, r] = k.split(',').map(Number);
        return { c, r, type: cellType(k) };
      }),
      radius: radius(),
      plants: state.plants,
      walls: state.walls,
      pets: petList(),
      perched: state.perched,
      selected: picked,
    });
    applyView(false);
    wanderPets();
  }

  /** One transform carries both the pan and the zoom of the view. */
  function applyView(smooth = true) {
    const svg = stage.querySelector('.gardensvg');
    if (!svg) return;
    svg.style.transition = smooth ? '' : 'none';
    svg.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
  }

  function setZoom(next, smooth = true) {
    zoom = Math.min(3, Math.max(0.5, next));
    if (zoom <= 1) { panX = 0; panY = 0; }   // zoomed out, always recentre
    state.zoom = zoom; state.panX = panX; state.panY = panY;
    applyView(smooth);
  }

  // --- drag to pan, wheel to zoom -----------------------------------------
  // The view moves, not the land: cells keep their grid positions, so a drag
  // never disturbs anything the player has arranged.
  let dragging = false;
  let moved = false;
  let sx = 0, sy = 0, ox = 0, oy = 0;

  stage.addEventListener('pointerdown', (ev) => {
    if (ev.button != null && ev.button !== 0) return;
    dragging = true; moved = false;
    sx = ev.clientX; sy = ev.clientY; ox = panX; oy = panY;
  });
  stage.addEventListener('pointermove', (ev) => {
    if (!dragging) return;
    const dx = ev.clientX - sx;
    const dy = ev.clientY - sy;
    // A few pixels of slop, so a tap with a shaky thumb is still a tap.
    if (!moved && Math.hypot(dx, dy) < 6) return;
    if (!moved) { moved = true; stage.setPointerCapture(ev.pointerId); stage.classList.add('is-panning'); }
    panX = ox + dx; panY = oy + dy;
    applyView(false);
  });
  const endPan = () => {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove('is-panning');
    if (moved) { state.panX = panX; state.panY = panY; }
  };
  stage.addEventListener('pointerup', endPan);
  stage.addEventListener('pointercancel', endPan);
  // Swallow the click that ends a drag, or panning would also select a cell.
  stage.addEventListener('click', (ev) => {
    if (moved) { ev.stopPropagation(); moved = false; }
  }, true);

  stage.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    setZoom(zoom * (ev.deltaY < 0 ? 1.12 : 0.89), false);
  }, { passive: false });

  function drawBar() {
    const w = wallSummary();
    const ready = readyCount();
    const growing = growingKeys().length;
    const cost = expandCost();
    const dot = w.min ? WALL_TIERS[w.min - 1].top : '#C9D2CB';

    const tab = ({ ico, label, note, on, can, off, attr }) => `
      <button class="gtab${on ? ' is-on' : ''}${can ? ' can' : ''}${off ? ' is-off' : ''}"
              ${attr} ${off ? 'disabled' : ''}>
        <span class="gt-ico">${ico}</span>
        <span class="gt-l">${label}</span>
        <span class="gt-sub">${note}</span>
      </button>`;

    bar.innerHTML = [
      tab({ ico: '\u{1F331}', label: 'Seeds', note: 'plant', on: drawer === 'seeds',
            attr: 'data-drawer-tab="seeds"' }),
      tab({ ico: '\u{1F4A7}', label: 'Water',
            note: growing ? `${growing} for ${growing * BOOSTS.water.cost}` : 'none due',
            can: growing && state.coins >= BOOSTS.water.cost, off: !growing,
            attr: 'data-water-all' }),
      tab({ ico: `<span class="wdot" style="background:${dot}"></span>`, label: 'Wall',
            note: w.total ? (w.bare ? `${w.bare} bare` : w.name) : 'none',
            attr: 'data-upgrade-all' }),
      tab({ ico: '\u{1F43E}', label: 'Pets', note: `${petCount()} of ${petCapacity()}`,
            on: drawer === 'pets', attr: 'data-drawer-tab="pets"' }),
      // The button that grew the garden becomes the one that sets the puzzle,
      // exactly when there is nothing left to grow.
      cost === null
        ? tab({ ico: '\u25CE', label: 'Wheel',
                note: `${poolSizeFor(gardenLevel(), state.wheelSize)} letters`,
                on: drawer === 'wheel', attr: 'data-drawer-tab="wheel"' })
        : tab({ ico: '\u2922', label: 'Expand', note: `${gridSide() + 2}\u00B2 for ${cost}`,
                can: state.coins >= cost, attr: 'data-expand' }),
    ].join('') + (ready ? `<span class="readypip">${ready} ready</span>` : '');
  }

  function drawDrawer() {
    if (picked) { drawCellPanel(); return; }
    if (!drawer) { drawerEl.hidden = true; return; }
    drawerEl.hidden = false;

    if (drawer === 'seeds') {
      drawerEl.innerHTML = `
        <div class="drawhead"><b>Seeds</b>
          <span class="dim">tap an empty plot to plant one</span></div>
        ${seedRow(false)}`;
    } else if (drawer === 'sky') {
      // Free, and opened by growing the garden. They used to be bought, and
      // the set cost twice what finishing the 247 does — cosmetics competing
      // with the one thing the game is actually about.
      drawerEl.innerHTML = `
        <div class="drawhead"><b>Sky</b>
          <span class="dim">each one opens as the garden grows — they cost nothing</span></div>
        <div class="seedrow">
          ${SKY_IDS.map((id) => {
            const s = SKIES[id];
            const open = ownsSky(id);
            const using = state.sky === id;
            return `
              <button class="card skycard${using ? ' is-using' : ''}${open ? ' is-owned' : ' is-off'}"
                      data-sky-pick="${id}" aria-disabled="${open ? 'false' : 'true'}">
                <span class="skyswatch" style="background:linear-gradient(${s.sky[0]},${s.sky[2]},${s.sky[3]})"></span>
                <span class="card-art">${s.ico}</span>
                <span class="card-name">${s.en}</span>
                <span class="card-meta">${open
                  ? (using ? '<b>in use</b>' : 'open')
                  : `level ${skyUnlocksAt(id)}`}</span>
                <span class="card-gain">${s.note}</span>
              </button>`;
          }).join('')}
        </div>`;
    } else if (drawer === 'wheel') {
      // Only reachable once the garden is full grown, so the wheel stops being
      // something you unlock and becomes something you set.
      const current = poolSizeFor(gardenLevel(), state.wheelSize);
      drawerEl.innerHTML = `
        <div class="drawhead"><b>Wheel</b>
          <span class="dim">the garden is full grown — choose how many letters you want</span></div>
        <div class="seedrow">
          ${WHEEL_SIZES.map((n) => `
            <button class="card wheelcard${n === current ? ' is-owned' : ''}" data-wheel="${n}">
              <span class="card-art">◎</span>
              <span class="card-name">${n} letters</span>
              <span class="card-gain">${n <= 6 ? 'gentle' : n <= 8 ? 'steady' : 'hard'}</span>
            </button>`).join('')}
        </div>`;
    } else {
      drawerEl.innerHTML = `
        <div class="drawhead"><b>Pets</b>
          <span class="dim">${petCount()} of ${petCapacity()} \u2014 one per row of planting land</span></div>
        <div class="seedrow">
          ${PET_IDS.map((id) => {
            const p = PETS[id];
            const have = petCountOf(id);
            const can = petCount() < petCapacity() && state.coins >= p.cost;
            return `
              <button class="card${have ? ' is-owned' : ''}${can ? '' : ' is-off'}"
                      data-pet="${id}" aria-disabled="${can ? 'false' : 'true'}">
                <span class="card-art">${PET_EMOJI[id]}${have > 1 ? `<b class="petn">x${have}</b>` : ''}</span>
                <span class="card-name">${p.en}</span>
                <span class="card-meta"><i class="coin"></i>${p.cost}</span>
                <span class="card-gain">+${Math.round(p.bonus * 100)}% \u00B7 \u{1F6E1}${p.defence}</span>
              </button>`;
          }).join('')}
        </div>
        ${petCount() ? `<div class="petlist">${petList().map((id, i) => `
          <button class="petchip" data-release="${i}" title="Release for half the price">
            ${PET_EMOJI[id]} ${PETS[id].en} <span class="x">\u2715</span>
          </button>`).join('')}</div>` : ''}`;
    }
    pop(drawerEl);
  }

  /** The seed cards. `live` means a plot is selected, so they can be bought. */
  function seedRow(live) {
    return `<div class="seedrow">
      ${SPECIES_IDS.map((id) => {
        const s = SPECIES[id];
        const can = live && state.coins >= s.cost;
        return `
          <button class="card${can ? '' : ' is-off'}" data-seed="${id}"
                  aria-disabled="${can ? 'false' : 'true'}">
            <span class="card-art">${s.kind === 'tree'
              ? `<span class="treedot" style="--p:${s.leaf}"></span>`
              : `<span class="bloomdot" style="--p:${s.petal}"></span>`}</span>
            <span class="card-name">${s.en}</span>
            <span class="card-meta"><i class="coin"></i>${s.cost}</span>
            <span class="card-gain">\u2192 ${s.yield} <span class="dim">${s.rounds}${s.rounds === 1 ? 'rd' : 'rds'}</span></span>
          </button>`;
      }).join('')}
    </div>`;
  }

  /** Everything you can do to one cell, in one place. */
  function drawCellPanel() {
    const type = cellType(picked);
    const plant = state.plants.get(picked);
    const tier = wallTier(picked);
    const centre = picked === '0,0';
    const relic = plant && plant.id === 'relic';
    drawerEl.hidden = false;

    let title = 'Empty plot';
    let sub = 'choose a seed below';
    let acts = '';
    let body = '';

    if (type === WALL) {
      const cost = wallCost(picked);
      const refund = sellValue(picked);
      title = tier ? WALL_TIERS[tier - 1].name : 'Empty wall slot';
      sub = tier < MAX_WALL
        ? `Next: ${WALL_TIERS[tier].name}, +${WALL_TIERS[tier].defence} defence`
        : 'Fully upgraded';
      acts = `
        ${tier < MAX_WALL ? `
          <button class="act act-buy${state.coins >= cost ? '' : ' is-off'}" data-upgrade
                  ${state.coins >= cost ? '' : 'disabled'}>
            <span class="act-l">${tier ? 'Upgrade' : 'Build'}</span>
            <span class="act-n"><i class="coin"></i>${cost}</span>
          </button>` : '<span class="act act-max">MAX</span>'}
        ${refund ? `<button class="act act-sell" data-sell>
            <span class="act-l">Sell</span><span class="act-n"><i class="coin"></i>${refund}</span>
          </button>` : ''}`;
    } else if (plant) {
      const pct = plantProgress(picked);
      const ready = plant.stage >= STAGES - 1;
      title = relic ? 'Tree of 247' : SPECIES[plant.id].en;
      sub = relic ? 'it never stops bearing'
        : ready ? 'ripe and ready'
        : `${STAGE_NAME[plant.stage]} \u00B7 ${roundsLeft(picked)} more ${roundsLeft(picked) === 1 ? 'round' : 'rounds'}`;
      if (!ready && !relic) body = `<div class="growbar"><i style="width:${pct}%"></i></div>`;

      // Harvesting is a deliberate button, never a stray tap on the garden.
      const boosts = ready || relic ? '' : Object.entries(BOOSTS).map(([kind, b]) => `
        <button class="act act-buy${state.coins >= b.cost ? '' : ' is-off'}"
                data-boost="${kind}" ${state.coins >= b.cost ? '' : 'disabled'}>
          <span class="act-l">${kind === 'water' ? '\u{1F4A7} Water' : '\u{1F33E} Feed'}<span class="dim"> \u2212${b.rounds}${b.rounds === 1 ? 'rd' : 'rds'}</span></span>
          <span class="act-n"><i class="coin"></i>${b.cost}</span>
        </button>`).join('');
      const reap = ready ? `
        <button class="act act-reap" data-harvest>
          <span class="act-l">\u{1F9FA} Harvest</span>
          <span class="act-n"><i class="coin"></i>${harvestValue(plant.id)}</span>
        </button>` : '';
      acts = boosts + reap;
    } else {
      body = seedRow(true);
    }

    const glyph = { up: '\u25B2', down: '\u25BC', left: '\u25C0', right: '\u25B6' };
    const arrows = ['up', 'left', 'right', 'down'].map((d) => `
      <button class="mv mv-${d}" data-move="${d}"
              ${canMove(picked, d) && !centre ? '' : 'disabled'}
              aria-label="Move ${d}">${glyph[d]}</button>`).join('');

    drawerEl.innerHTML = `
      <div class="cellpanel">
        <div class="cp-top">
          <div class="cp-title"><b>${title}</b><span class="dim">${sub}</span></div>
          <div class="cp-right">
            ${centre ? '' : `<button class="act act-flip" data-flip="${type === WALL ? LAND : WALL}">
              ${type === WALL ? '\u{1F331} To land' : '\u{1F9F1} To wall'}
            </button>`}
            <button class="cp-x" data-close aria-label="Close">\u2715</button>
          </div>
        </div>
        ${body}
        <div class="cp-bottom">
          <div class="cp-move" title="${centre ? 'the centre never moves' : 'swap with a neighbour'}">${arrows}</div>
          <div class="cp-acts">${acts}</div>
        </div>
      </div>`;
    pop(drawerEl);
  }

  function pop(node) {
    node.animate(
      [{ transform: 'translateY(20px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: 260, easing: 'cubic-bezier(.34,1.5,.64,1)' }
    );
  }

  function refresh({ scene = true } = {}) {
    root.querySelector('[data-coins]').textContent = String(state.coins);
    root.querySelector('[data-def]').textContent = String(totalDefence());
    const rating = root.querySelector('[data-rating]');
    if (rating) rating.textContent = defenceRating();
    if (scene) drawGarden();
    drawSky();
    drawBar();
    drawDrawer();
    markPicked();
  }

  /** The sky's own furniture: the picker's icon, and any weather it carries. */
  function drawSky() {
    const s = SKIES[state.sky] || SKIES.day;
    // Two of these now: one in the topbar, one under the zoom controls.
    root.querySelectorAll('[data-sky-btn]').forEach((btn) => {
      btn.textContent = s.ico;
      btn.title = s.en;
    });
    drawSound();
    const layer = root.querySelector('[data-sky-layer]');
    if (layer) layer.innerHTML = skyLayer(state.sky);
  }

  /**
   * Music and effects switch separately.
   *
   * A single mute for everything is not allowed: the certification
   * requirements ask for granular controls and specifically say to avoid an
   * overall mute button. YouTube's own mute sits above both of these and is
   * handled in the audio module, not here — it is not a setting the player
   * changes from inside the game.
   */
  function drawSound() {
    const btn = root.querySelector('[data-sound]');
    if (btn) {
      const any = state.music || state.sfx;
      btn.textContent = any ? '\u{1F50A}' : '\u{1F507}';
      btn.title = 'Sound settings';
    }
    const pop = root.querySelector('[data-soundpop]');
    if (!pop) return;
    pop.innerHTML = [
      ['music', '\u{1F3B5}', 'Music'],
      ['sfx', '\u{1F514}', 'Effects'],
    ].map(([key, ico, label]) => `
      <button class="sndrow${state[key] ? ' is-on' : ''}" data-toggle="${key}"
              role="switch" aria-checked="${state[key] ? 'true' : 'false'}">
        <span class="snd-ico">${ico}</span>
        <span class="snd-label">${label}</span>
        <span class="snd-sw" aria-hidden="true"><i></i></span>
      </button>`).join('');
  }

  function markPicked() {
    stage.querySelectorAll('.soil').forEach((n) =>
      n.classList.toggle('is-picked', n.dataset.plot === pickedPlot));
  }

  function coinBurst(clientX, clientY, amount) {
    const box = floatLayer.getBoundingClientRect();
    const x = clientX - box.left;
    const y = clientY - box.top;

    const label = document.createElement('span');
    label.className = 'floatnum';
    label.textContent = `+${amount}`;
    label.style.left = `${x}px`;
    label.style.top = `${y}px`;
    floatLayer.appendChild(label);
    setTimeout(() => label.remove(), 1100);

    for (let i = 0; i < 6; i++) {
      const c = document.createElement('i');
      c.className = 'floatcoin';
      c.style.left = `${x}px`;
      c.style.top = `${y}px`;
      c.style.setProperty('--dx', `${(Math.random() * 70 - 35).toFixed(0)}px`);
      c.style.setProperty('--dy', `${(-40 - Math.random() * 40).toFixed(0)}px`);
      c.style.animationDelay = `${i * 40}ms`;
      floatLayer.appendChild(c);
      setTimeout(() => c.remove(), 1000 + i * 40);
    }
  }

  // ------------------------------------------------------------ raid news --
  const report = takeRaidReport();
  if (report) {
    const h = HUNTERS[report.id];
    banner.hidden = false;
    banner.className = `raidbanner ${report.repelled ? 'is-win' : 'is-loss'}`;
    banner.innerHTML = `
      <span class="rb-bird">${report.repelled ? '🛡' : '⚠'}</span>
      <span class="rb-text">
        <b>${h.en} raided the garden</b>
        ${report.repelled
          ? `Driven off. Bounty <b>+${report.bounty}</b>.`
          : `It got at your ${report.target}, knocking it back a stage.`}
      </span>
      <button class="rb-x" data-dismiss aria-label="Dismiss">✕</button>`;
    banner.animate(
      [{ transform: 'translateY(-16px)', opacity: 0 }, { transform: 'none', opacity: 1 }],
      { duration: 340, easing: 'cubic-bezier(.34,1.5,.64,1)' }
    );
  }

  /**
   * A raid the player actually watches. Birds streak across in one pass;
   * grazers amble in, stop at a plant, eat for a beat, and move to the next —
   * each stop taking a bite out of that plant's growth.
   */
  function liveRaid() {
    const ids = Object.keys(HUNTERS);
    const id = ids[Math.floor(Math.random() * Math.min(ids.length, 3 + petCount()))];
    const h = HUNTERS[id];
    const win = totalDefence() >= HUNTERS[id].power;

    const layer = document.createElement('div');
    layer.className = `liveraid${h.ground ? ' is-ground' : ''}`;
    layer.innerHTML = `<svg viewBox="-30 -24 60 44">${hunterArt(id, 'fly')}</svg>`;
    root.querySelector('[data-view]').appendChild(layer);

    if (!h.ground) {
      if (!readyCount()) { layer.remove(); return schedule(); }
      layer.classList.add(win ? 'is-repelled' : 'is-through');
      setTimeout(() => {
        layer.remove();
        toast(root, win ? `${h.en} chased off` : `${h.en} slipped past`, win ? 'bonus' : 'bad', 'raid');
        schedule();
      }, 4200);
      return;
    }

    // Grazers pick real plants and walk between them slowly.
    const targets = grazeableKeys();
    if (!targets.length) { layer.remove(); return schedule(); }
    const stops = targets.sort(() => Math.random() - 0.5).slice(0, win ? 1 : h.graze || 2);

    let i = 0;
    let eaten = 0;
    const step = () => {
      if (i >= stops.length) {
        layer.classList.add('is-leaving');
        setTimeout(() => {
          layer.remove();
          if (win) toast(root, `${h.en} shooed off the land`, 'bonus', 'raid');
          else toast(root, `${h.en} grazed ${eaten} plant${eaten > 1 ? 's' : ''}`, 'bad', 'raid');
          refresh();
          schedule();
        }, 1400);
        return;
      }
      const node = stage.querySelector(`.soil[data-plot="${CSS.escape(stops[i])}"]`);
      const view = root.querySelector('[data-view]').getBoundingClientRect();
      if (node) {
        const b = node.getBoundingClientRect();
        layer.style.left = `${b.x - view.x + b.width / 2 - 37}px`;
        layer.style.top = `${b.y - view.y - 12}px`;
      }
      // 1.6s to amble over, then a beat or two standing there eating.
      setTimeout(() => {
        if (!win) { nibble(stops[i]); eaten += 1; refresh({ scene: true }); }
        layer.classList.add('is-eating');
        setTimeout(() => { layer.classList.remove('is-eating'); i += 1; step(); }, 1800);
      }, 1600);
    };
    layer.classList.add('is-arriving');
    setTimeout(step, 600);
  }

  function schedule() {
    clearTimeout(raidTimer);
    raidTimer = setTimeout(liveRaid, IDLE_RAID_MS + Math.random() * IDLE_RAID_MS);
  }
  schedule();

  drawGarden();
  drawSky();
  drawBar();
  const ring = root.querySelector('[data-ring]');
  if (ring) ring.style.strokeDasharray = `${(state.letters.size / 247) * 50.3} 50.3`;
  stage.querySelector('.gardensvg')?.animate(
    [{ transform: 'scale(.93)', opacity: 0 }, { transform: 'none', opacity: 1 }],
    { duration: 440, easing: 'cubic-bezier(.34,1.4,.64,1)' }
  );

  // -------------------------------------------------------------- events --
  root.addEventListener('click', (ev) => {
    if (ev.target.closest('[data-act="play"]')) {
      clearTimeout(raidTimer);
      wanderTimers.forEach(clearTimeout);
      return onPlay();
    }

    if (ev.target.closest('[data-dismiss]')) {
      banner.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 180, fill: 'forwards' });
      setTimeout(() => { banner.hidden = true; }, 190);
      return;
    }

    if (ev.target.closest('[data-close]')) {
      picked = null; pickedPlot = null;
      refresh();
      return;
    }

    const z = ev.target.closest('[data-zoom]');
    if (z) {
      const k = z.dataset.zoom;
      if (k === 'fit') { panX = 0; panY = 0; setZoom(1); }
      else setZoom(zoom * (k === 'in' ? 1.25 : 0.8));
      return;
    }

    const tab = ev.target.closest('[data-drawer-tab]');
    if (tab) {
      picked = null;
      drawer = drawer === tab.dataset.drawerTab ? null : tab.dataset.drawerTab;
      if (drawer !== 'seeds') pickedPlot = null;
      refresh();
      return;
    }

    if (ev.target.closest('[data-water-all]')) {
      const { count, spent, ready, remaining } = waterAll();
      if (!count) return toast(root, `${BOOSTS.water.cost} coins needed`, 'bad');
      toast(root, `${count} watered · −${spent}${ready ? ` · ${ready} ready` : ''}${
        remaining ? ` · ${remaining} left` : ''}`, 'bonus');
      refresh();
      return;
    }

    if (ev.target.closest('[data-upgrade-all]')) {
      const { count, spent, blocks, cheapest } = upgradeAllAffordable();
      if (count) {
        toast(root, `${count} block${count > 1 ? 's' : ''} raised · −${spent}`, 'bonus', 'buy');
        refresh();
        return;
      }
      // Nothing was raised, and there are three quite different reasons why.
      // Saying "not enough coins" to someone with a full purse and no wall at
      // all is both wrong and no help in building one.
      if (!blocks) {
        return toast(root, 'No wall yet — tap a cell, then “To wall”',
                     'hint', null, 3200);
      }
      if (cheapest === null) {
        return toast(root, `Every block is ${WALL_TIERS[MAX_WALL - 1].name} — the wall is finished`,
                     'hint', null, 2800);
      }
      return toast(root, `${cheapest} coins for the next block`, 'bad');
    }

    // Not [data-sky]: #app carries that for the stylesheet, so a bare
    // attribute match would claim every click that reached the shell.
    if (ev.target.closest('[data-sound]')) {
      const pop = root.querySelector('[data-soundpop]');
      pop.hidden = !pop.hidden;
      if (!pop.hidden) drawSound();
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

    // Any tap elsewhere closes the sound panel.
    const spop = root.querySelector('[data-soundpop]');
    if (spop && !spop.hidden) spop.hidden = true;

    const sky = ev.target.closest('[data-sky-pick]');
    if (sky) {
      const id = sky.dataset.skyPick;
      const s = SKIES[id];
      if (ownsSky(id)) {
        if (state.sky !== id) { setSky(id); setMood(id); toast(root, s.en, 'bonus', 'tap'); }
      } else {
        return toast(root, `${s.en} opens at garden level ${skyUnlocksAt(id)}`,
                     'hint', null, 2600);
      }
      refresh();
      return;
    }

    const wheel = ev.target.closest('[data-wheel]');
    if (wheel) {
      state.wheelSize = Number(wheel.dataset.wheel);
      save();
      toast(root, `${state.wheelSize}-letter wheel`, 'bonus');
      refresh({ scene: false });
      return;
    }

    if (ev.target.closest('[data-expand]')) {
      const cost = expandCost();
      if (cost === null) return toast(root, `The garden is full grown at level ${MAX_LEVEL}`, 'hint');
      if (!expand()) return toast(root, `${cost} coins needed`, 'bad');
      toast(root, `Garden is now ${gridSide()}×${gridSide()}`, 'bonus', 'buy');
      refresh();
      return;
    }

    const mv = ev.target.closest('[data-move]');
    if (mv) {
      const dest = moveCell(picked, mv.dataset.move);
      if (!dest) return;
      picked = dest;               // keep hold of it, so it can be walked further
      refresh();
      return;
    }

    const flip = ev.target.closest('[data-flip]');
    if (flip) {
      if (!setCellType(picked, flip.dataset.flip)) {
        return toast(root, 'Harvest or clear this cell first', 'bad');
      }
      toast(root, `Now ${flip.dataset.flip}`, 'bonus');
      refresh();
      return;
    }

    if (ev.target.closest('[data-upgrade]')) {
      const cost = wallCost(picked);
      if (!upgradeWall(picked)) return toast(root, `${cost} coins needed`, 'bad');
      toast(root, `${WALL_TIERS[wallTier(picked) - 1].name} block`, 'bonus', 'buy');
      refresh();
      return;
    }

    if (ev.target.closest('[data-sell]')) {
      toast(root, `Block sold · +${sellWall(picked)}`, 'bonus');
      refresh();
      return;
    }

    if (ev.target.closest('[data-harvest]')) {
      const node = stage.querySelector('.soil[data-plot="' + CSS.escape(picked) + '"]');
      const box = node ? node.getBoundingClientRect() : null;
      const gain = harvestAt(picked);
      sfx('harvest');
      if (box) coinBurst(box.x + box.width / 2, box.y + box.height / 2, gain);
      picked = null;
      refresh();
      return;
    }

    const boost = ev.target.closest('[data-boost]');
    if (boost) {
      const kind = boost.dataset.boost;
      if (!boostPlant(picked, kind)) return toast(root, `${BOOSTS[kind].cost} coins needed`, 'bad');
      refresh();
      return;
    }

    const seed = ev.target.closest('[data-seed]');
    if (seed) {
      if (!pickedPlot) return toast(root, 'Tap an empty plot first, then a seed', 'hint', null, 2600);
      const id = seed.dataset.seed;
      if (!plantAt(pickedPlot, id)) {
        // The card is disabled when the coins are short, so reaching here
        // means something else: the plot was taken or is no longer land.
        return toast(root, state.coins < SPECIES[id].cost
          ? `${SPECIES[id].cost} coins needed`
          : 'That plot is not free any more', 'bad');
      }
      toast(root, `${SPECIES[id].en} planted`, 'bonus', 'plant');
      pickedPlot = null; drawer = null;
      refresh();          // the panel stays put, now showing the sprout
      return;
    }

    const pet = ev.target.closest('[data-pet]');
    if (pet) {
      const id = pet.dataset.pet;
      if (petCount() >= petCapacity()) return toast(root, 'The land supports no more pets', 'bad');
      if (!adoptPet(id)) return toast(root, `${PETS[id].cost} coins needed`, 'bad');
      toast(root, `${PETS[id].en} joined the garden`, 'bonus', 'buy');
      refresh();
      return;
    }

    const rel = ev.target.closest('[data-release]');
    if (rel) {
      const gone = releasePet(Number(rel.dataset.release));
      toast(root, gone ? 'Pet released' : 'That pet has already gone', gone ? 'hint' : 'bad');
      refresh();
      return;
    }

    if (ev.target.closest('[data-perched]')) {
      clearPerched();
      toast(root, 'The bird flaps away', 'hint');
      refresh();
      return;
    }

    // --- the garden itself: one selection model for every cell ---
    const wall = ev.target.closest('[data-wall]');
    if (wall) {
      picked = picked === wall.dataset.wall ? null : wall.dataset.wall;
      pickedPlot = null; drawer = null;
      refresh();
      return;
    }

    const plot = ev.target.closest('[data-plot]');
    if (plot) {
      const k = plot.dataset.plot;
      const p = state.plants.get(k);

      if (!p) {
        picked = k; pickedPlot = k; drawer = 'seeds';
        refresh();
        return;
      }
      picked = picked === k ? null : k;
      pickedPlot = null; drawer = null;
      refresh();
    }
  });
}

const PET_EMOJI = {
  butterfly: '🦋', bee: '🐝', rabbit: '🐇', cat: '🐈', dog: '🐕',
  owl: '🦉', peacock: '🦚', tiger: '🐅',
};
