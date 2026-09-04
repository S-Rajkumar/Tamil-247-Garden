/**
 * Garden artwork — hand-drawn isometric SVG, generated as one scalable scene.
 *
 * Everything is drawn into a single <svg> with a computed viewBox, so the
 * garden always fills its frame at any aspect ratio instead of sitting in a
 * corner of a fixed-size box.
 *
 * Lighting convention: one light upper-left, so top faces are brightest, left
 * faces mid, right faces darkest, and every form gets a contact shadow.
 */

export const TW = 64;   // tile width  (diamond)
/**
 * Diamond height sets the camera angle: for a tile rotated 45 degrees,
 * TH / TW = sin(elevation). At 60 the eye sits at 70 degrees, which turned out
 * to be too far over — the land read as a flat board propped up against the
 * sky. 44 is about 43 degrees: high enough to look into the plots, low enough
 * that the ground still behaves like ground.
 */
export const TH = 44;

/** Grid cell to screen point. The diamond's centre lands on (x, y). */
export function iso(c, r) {
  return { x: (c - r) * (TW / 2), y: (c + r) * (TH / 2) };
}

// ---------------------------------------------------------------------------
// walls
// ---------------------------------------------------------------------------

/**
 * Each tier is a different *object*, not a recolour: bamboo poles, a battered
 * iron block, polished silver, banded gold, then cut crystal. The silhouette
 * changing is what makes an upgrade read at a glance.
 *
 * `defence` feeds the raid system — the wall is a real stat, not decoration.
 */
/*
 * These are per BLOCK, and a garden has a whole ring of them — 16 blocks at
 * level 3, 32 at level 5. The old top tier was 8,280 a block cumulative, so a
 * ruby wall round a small garden cost 132,000 coins, about 2,000 rounds of
 * play. Priced for one purchase rather than for a ring.
 */
export const WALL_TIERS = [
  { name: 'Wood',    cost: 30,   defence: 1, top: '#C89A5A', left: '#A2763C', right: '#7F5A2B' },
  { name: 'Iron',    cost: 70,   defence: 2, top: '#96A1AB', left: '#727D87', right: '#565F68' },
  { name: 'Silver',  cost: 150,  defence: 3, top: '#E2E9F0', left: '#BAC5D1', right: '#98A4B1' },
  { name: 'Gold',    cost: 300,  defence: 4, top: '#F8D468', left: '#DBAB33', right: '#B4871E' },
  { name: 'Diamond', cost: 600,  defence: 6, top: '#C2F0F8', left: '#8AD4E6', right: '#63B6CC' },
  { name: 'Ruby',    cost: 1000, defence: 8, top: '#F4788A', left: '#CE4459', right: '#A32C43' },
];

export const MAX_WALL = WALL_TIERS.length;
const WALL_H = 24;

/** Refund for selling a block: everything paid in, minus a quarter. */
export function wallRefund(tier) {
  let paid = 0;
  for (let i = 0; i < tier; i++) paid += WALL_TIERS[i].cost;
  return Math.floor(paid * 0.75);
}

function cubeFaces(x, y, h, t) {
  const hw = TW / 2, hh = TH / 2;
  return `
    <polygon points="${x - hw},${y - h} ${x},${y + hh - h} ${x},${y + hh} ${x - hw},${y}" fill="${t.left}"/>
    <polygon points="${x},${y + hh - h} ${x + hw},${y - h} ${x + hw},${y} ${x},${y + hh}" fill="${t.right}"/>
    <polygon points="${x},${y - hh - h} ${x + hw},${y - h} ${x},${y + hh - h} ${x - hw},${y - h}" fill="${t.top}"/>`;
}

/** One wall block, drawn according to its tier. */
function wallBlock(c, r, tier, key) {
  const t = WALL_TIERS[tier - 1];
  const { x, y } = iso(c, r);
  const hw = TW / 2, hh = TH / 2;
  const shadow = `<ellipse cx="${x}" cy="${y + hh - 2}" rx="${hw * 0.82}" ry="${hh * 0.5}" fill="#2C4A3A" opacity=".22"/>`;
  let body = '';

  if (tier === 1) {
    // A crate of boards: the same box the other tiers use, divided into
    // planks with grain lines so it reads as timber rather than a brown block.
    const planks = (a, b, dark) => {
      const face = dark ? t.right : t.left;
      const line = dark ? '#63421F' : '#7A5129';
      const out = [`
        <polygon points="${a.x},${a.y - WALL_H} ${b.x},${b.y - WALL_H} ${b.x},${b.y} ${a.x},${a.y}"
                 fill="${face}"/>`];
      for (let i = 1; i < 4; i++) {
        const f = i / 4;
        const px = a.x + (b.x - a.x) * f;
        const py = a.y + (b.y - a.y) * f;
        out.push(`<line x1="${px.toFixed(1)}" y1="${(py - WALL_H).toFixed(1)}"
                        x2="${px.toFixed(1)}" y2="${py.toFixed(1)}"
                        stroke="${line}" stroke-width="1.3" opacity=".85"/>`);
      }
      // one grain streak per face, and a band across the middle
      out.push(`<polygon points="${a.x},${a.y - WALL_H + 7} ${b.x},${b.y - WALL_H + 7}
                                 ${b.x},${b.y - WALL_H + 10} ${a.x},${a.y - WALL_H + 10}"
                         fill="${line}" opacity=".35"/>`);
      return out.join('');
    };
    const L = { x: x - hw, y }, R = { x: x + hw, y }, F = { x, y: y + hh };
    body = `
      ${planks(L, F, false)}
      ${planks(F, R, true)}
      <polygon points="${x},${y - hh - WALL_H} ${x + hw},${y - WALL_H} ${x},${y + hh - WALL_H} ${x - hw},${y - WALL_H}"
               fill="${t.top}"/>
      <polygon points="${x},${y - hh - WALL_H} ${x + hw},${y - WALL_H} ${x},${y + hh - WALL_H} ${x - hw},${y - WALL_H}"
               fill="none" stroke="#7A5129" stroke-width="1.2" opacity=".55"/>
      <line x1="${x - hw / 2}" y1="${y - hh / 2 - WALL_H}" x2="${x + hw / 2}" y2="${y + hh / 2 - WALL_H}"
            stroke="#7A5129" stroke-width="1.2" opacity=".45"/>
      <line x1="${x + hw / 2}" y1="${y - hh / 2 - WALL_H}" x2="${x - hw / 2}" y2="${y + hh / 2 - WALL_H}"
            stroke="#7A5129" stroke-width="1.2" opacity=".45"/>`;
  } else if (tier === 2) {
    // Iron: battered and uneven — dents on the top face, rivets on the front.
    body = `
      ${cubeFaces(x, y, WALL_H, t)}
      <polygon points="${x - 12},${y - WALL_H - 4} ${x - 3},${y - WALL_H - 8} ${x + 4},${y - WALL_H - 2} ${x - 5},${y - WALL_H + 2}"
               fill="#7E8993" opacity=".8"/>
      <polygon points="${x + 6},${y - WALL_H + 3} ${x + 15},${y - WALL_H - 1} ${x + 19},${y - WALL_H + 5} ${x + 10},${y - WALL_H + 8}"
               fill="#828D97" opacity=".7"/>
      <circle cx="${x - 20}" cy="${y - 8}" r="1.9" fill="#5B646D"/>
      <circle cx="${x - 8}"  cy="${y - 3}" r="1.9" fill="#5B646D"/>
      <circle cx="${x + 12}" cy="${y - 9}" r="1.9" fill="#49515A"/>
      <circle cx="${x + 23}" cy="${y - 15}" r="1.9" fill="#49515A"/>`;
  } else if (tier === 3) {
    // Silver: clean, with one soft highlight streak.
    body = `
      ${cubeFaces(x, y, WALL_H, t)}
      <polygon points="${x - hw},${y - WALL_H} ${x},${y - hh - WALL_H} ${x - 4},${y - hh - WALL_H + 6} ${x - hw + 6},${y - WALL_H + 4}"
               fill="#FFFFFF" opacity=".55"/>
      <polygon points="${x - hw + 3},${y - 4} ${x - 5},${y + hh - 5} ${x - 5},${y + hh - 1} ${x - hw + 3},${y}"
               fill="#FFFFFF" opacity=".22"/>`;
  } else if (tier === 4) {
    // Gold: banded, with a travelling shine.
    body = `
      ${cubeFaces(x, y, WALL_H, t)}
      <polygon points="${x - hw},${y - 14} ${x},${y + hh - 14} ${x},${y + hh - 9} ${x - hw},${y - 9}" fill="#FFF0B8" opacity=".55"/>
      <polygon points="${x},${y + hh - 14} ${x + hw},${y - 14} ${x + hw},${y - 9} ${x},${y + hh - 9}" fill="#C89822" opacity=".65"/>
      <polygon class="goldshine" points="${x - hw},${y - WALL_H} ${x},${y - hh - WALL_H} ${x + hw},${y - WALL_H} ${x},${y + hh - WALL_H}"
               fill="#FFFFFF" opacity=".3"/>`;
  } else {
    // Diamond and ruby: cut crystal — the top face narrows, so the silhouette
    // itself changes rather than only the colour.
    const nw = hw * 0.52, nh = hh * 0.52, ch = WALL_H + 6;
    body = `
      <polygon points="${x - hw},${y} ${x},${y + hh} ${x},${y + hh - 4} ${x - nw},${y - ch + nh}" fill="${t.left}"/>
      <polygon points="${x},${y + hh} ${x + hw},${y} ${x + nw},${y - ch + nh} ${x},${y + hh - 4}" fill="${t.right}"/>
      <polygon points="${x - hw},${y} ${x - nw},${y - ch + nh} ${x},${y - ch} ${x},${y + hh - 4}" fill="${t.top}" opacity=".92"/>
      <polygon points="${x + hw},${y} ${x + nw},${y - ch + nh} ${x},${y - ch} ${x},${y + hh - 4}" fill="${t.left}" opacity=".8"/>
      <polygon points="${x - nw},${y - ch + nh} ${x},${y - ch - nh} ${x + nw},${y - ch + nh} ${x},${y - ch + nh * 2}" fill="${t.top}"/>
      <polyline points="${x},${y - ch - nh} ${x},${y + hh - 4}" stroke="#fff" stroke-opacity=".45" stroke-width="1.2" fill="none"/>
      <g class="gemshine">
        <polygon points="${x},${y - ch - nh - 4} ${x + 4},${y - ch - nh} ${x},${y - ch - nh + 4} ${x - 4},${y - ch - nh}" fill="#fff"/>
        <polygon points="${x - 12},${y - ch + 6} ${x - 9},${y - ch + 9} ${x - 12},${y - ch + 12} ${x - 15},${y - ch + 9}" fill="#fff" opacity=".8"/>
      </g>`;
  }

  return `
    <g class="wallblock wall-t${tier}" data-wall="${key}" tabindex="0" role="button"
       aria-label="${t.name} wall block">
      ${shadow}${body}
    </g>`;
}

// ---------------------------------------------------------------------------
// plants
// ---------------------------------------------------------------------------

export const STAGES = 4; // 0 empty · 1 sprout · 2 growing · 3 ready

/*
 * Every yield beats its own seed, by roughly 1.7x.
 *
 * It used to be the other way round — every plant sold for less than it cost,
 * and on top of that the only way to grow one was to pay for water. A jasmine
 * cost 840 to bring to harvest and paid back 30. The garden was advertised as
 * an income source and was in fact incapable of making money at all, at any
 * combination of seed, pets and patience.
 *
 * Plants now ripen on their own, one stage per round played (see `growAll`),
 * so the only outlay is the seed. Water is an optional accelerant.
 *
 * `rounds` is how many completed rounds it takes to ripen, and it is what
 * makes the seed choice a real one. Without it the dearest seed was simply
 * the best and the cheap ones existed only until you could afford better.
 * Now jasmine turns over every single round but must be replanted every
 * round, while a palmyra ties its plot up for six and pays about 2.5x as
 * much per round for it. Cheap is flexible and fiddly; dear is patient and
 * hands-off.
 *
 * The multipliers stay modest on purpose: plots grow with the square of the
 * garden, so a generous one has the garden out-earning the word game several
 * times over by level 5, which would invert the game.
 */
export const SPECIES = {
  jasmine:  { en: 'Jasmine',  cost: 40,  yield: 70,   rounds: 1, kind: 'flower', petal: '#FFFFFF', heart: '#F4E3A8' },
  marigold: { en: 'Marigold', cost: 70,  yield: 130,  rounds: 2, kind: 'flower', petal: '#F7A428', heart: '#C9701A' },
  rose:     { en: 'Rose',     cost: 120, yield: 220,  rounds: 3, kind: 'flower', petal: '#E4566B', heart: '#A82C43' },
  lotus:    { en: 'Lotus',    cost: 200, yield: 380,  rounds: 4, kind: 'flower', petal: '#F2A0C0', heart: '#F7D061' },
  flamelily:{ en: 'Flame Lily', cost: 340, yield: 640, rounds: 5, kind: 'flower', shape: 'flame', petal: '#E23B2B', heart: '#F7C93B' },
  palmyra:  { en: 'Palmyra',    cost: 520, yield: 980, rounds: 6, kind: 'tree',  shape: 'fan',   leaf: '#3E8C56', fruit: '#3B2C1E' },
};

export const SPECIES_IDS = Object.keys(SPECIES);

/** The reward for filling all 247 — one of these, and nothing else grows it. */
export const RELIC = {
  en: 'Banyan of the 247',
  yield: 900,
};

/**
 * The banyan: a wide spreading crown held up by aerial roots dropping back to
 * the ground. Nothing else in the garden has that silhouette, which is the
 * point — it should be unmistakable from across the board.
 */
function banyan(x, y, scale = 1) {
  const s = (n) => n * scale;
  const roots = [-26, -15, 15, 25].map((dx, i) => `
    <path d="M${x + s(dx)} ${y - s(46 - Math.abs(dx) * 0.35)}
             Q${x + s(dx * 1.12)} ${y - s(22)} ${x + s(dx * 0.92)} ${y}"
          stroke="#7A5A34" stroke-width="${s(2.4 + (i % 2))}" fill="none" stroke-linecap="round"/>`).join('');
  return `
      <ellipse cx="${x}" cy="${y + s(4)}" rx="${s(34)}" ry="${s(12)}" fill="#2C4A3A" opacity=".26"/>
      ${roots}
      <path d="M${x - s(7)} ${y} L${x - s(5)} ${y - s(44)} L${x + s(5)} ${y - s(44)} L${x + s(7)} ${y} Z" fill="#7A5A34"/>
      <path d="M${x - s(7)} ${y} L${x - s(5)} ${y - s(44)} L${x - s(1)} ${y - s(44)} L${x - s(2)} ${y} Z" fill="#9A7444"/>
      <g class="crown">
        <ellipse cx="${x}" cy="${y - s(56)}" rx="${s(34)}" ry="${s(18)}" fill="#3F8F58"/>
        <circle cx="${x - s(24)}" cy="${y - s(52)}" r="${s(14)}" fill="#4FA96A"/>
        <circle cx="${x + s(24)}" cy="${y - s(53)}" r="${s(13)}" fill="#37804D"/>
        <circle cx="${x - s(9)}"  cy="${y - s(68)}" r="${s(14)}" fill="#5EBC7A"/>
        <circle cx="${x + s(10)}" cy="${y - s(66)}" r="${s(12)}" fill="#4FA96A"/>
        <circle cx="${x}"         cy="${y - s(60)}" r="${s(16)}" fill="#57B473"/>
      </g>
      <g class="relicglow">
        <circle cx="${x - s(14)}" cy="${y - s(58)}" r="${s(3.2)}" fill="#FFE58A"/>
        <circle cx="${x + s(15)}" cy="${y - s(54)}" r="${s(2.8)}" fill="#FFD65E"/>
        <circle cx="${x + s(2)}"  cy="${y - s(72)}" r="${s(2.5)}" fill="#FFF0B8"/>
        <circle cx="${x - s(22)}" cy="${y - s(46)}" r="${s(2.3)}" fill="#FFD65E"/>
      </g>`;
}

function relicArt(x, y) {
  return `<g class="plant is-relic is-ready">${banyan(x, y)}</g>`;
}

/** A small standalone banyan, for the 247 chart's reward card. */
export function relicIcon() {
  return `<svg viewBox="0 0 96 88" class="relicsvg" aria-hidden="true">
    <g class="plant is-relic">${banyan(48, 82, 0.82)}</g>
  </svg>`;
}

/** A plant at a grid cell and growth stage. Stage 3 is harvestable. */
function plantArt(c, r, id, stage) {
  const { x, y } = iso(c, r);
  if (id === 'relic') return relicArt(x, y);

  const s = SPECIES[id];
  // A species can be retired between versions; a save still holding one must
  // not take the whole garden down with it.
  if (!s) return '';
  const ready = stage >= STAGES - 1;

  if (s.shape === 'fan') {
    // Palmyra: a ringed bare trunk, taller than anything else, topped with a
    // crown of stiff fan fronds rather than a soft round canopy.
    const h = [0, 16, 34, 52][stage];
    const spread = [0, 9, 15, 21][stage];
    const fronds = [];
    for (let i = 0; i < 7; i++) {
      const a = Math.PI + (i / 6) * Math.PI;
      const fx = x + Math.cos(a) * spread;
      const fy = y - h + Math.sin(a) * spread * 0.55;
      fronds.push(`<path d="M${x} ${y - h} Q${((x + fx) / 2).toFixed(1)} ${(fy - 5).toFixed(1)}
                            ${fx.toFixed(1)} ${fy.toFixed(1)}"
                         stroke="${i % 2 ? shade(s.leaf, -12) : s.leaf}" stroke-width="${(spread * 0.34).toFixed(1)}"
                         fill="none" stroke-linecap="round"/>`);
    }
    const rings = [];
    for (let i = 1; i < 4; i++) {
      const ry = y - (h * i) / 4;
      rings.push(`<line x1="${x - 3}" y1="${ry.toFixed(1)}" x2="${x + 3}" y2="${ry.toFixed(1)}"
                        stroke="#6E5232" stroke-width="1.2" opacity=".8"/>`);
    }
    return `
      <g class="plant${ready ? ' is-ready' : ''}">
        <ellipse cx="${x}" cy="${y + 3}" rx="${spread * 0.8 + 4}" ry="${spread * 0.35 + 2}" fill="#2C4A3A" opacity=".22"/>
        <rect x="${x - 3}" y="${y - h}" width="6" height="${h}" rx="2.4" fill="#8A6A44"/>
        <rect x="${x - 3}" y="${y - h}" width="2.4" height="${h}" rx="1.2" fill="#A6825A"/>
        ${rings.join('')}
        <g class="crown">
          ${fronds.join('')}
          ${ready ? `
            <circle cx="${x - 4}" cy="${y - h + 4}" r="3.2" fill="${s.fruit}"/>
            <circle cx="${x + 5}" cy="${y - h + 5}" r="2.8" fill="${s.fruit}"/>` : ''}
        </g>
      </g>`;
  }

  if (s.kind === 'tree') {
    const h = [0, 12, 26, 40][stage];
    const rad = [0, 7, 13, 19][stage];
    return `
      <g class="plant${ready ? ' is-ready' : ''}">
        <ellipse cx="${x}" cy="${y + 3}" rx="${rad * 0.9 + 4}" ry="${rad * 0.42 + 2}" fill="#2C4A3A" opacity=".22"/>
        <rect x="${x - 2}" y="${y - h}" width="4" height="${h}" rx="2" fill="#8A6236"/>
        <g class="crown">
          <circle cx="${x}" cy="${y - h - rad * 0.5}" r="${rad}" fill="${s.leaf}"/>
          <circle cx="${x - rad * 0.55}" cy="${y - h - rad * 0.25}" r="${rad * 0.72}" fill="${s.leaf}"/>
          <circle cx="${x + rad * 0.55}" cy="${y - h - rad * 0.3}" r="${rad * 0.66}" fill="${shade(s.leaf, -14)}"/>
          <circle cx="${x - rad * 0.3}" cy="${y - h - rad * 0.85}" r="${rad * 0.5}" fill="${shade(s.leaf, 16)}"/>
          ${ready ? `
            <circle cx="${x + rad * 0.45}" cy="${y - h - rad * 0.1}" r="${rad * 0.3}" fill="${s.fruit}"/>
            <circle cx="${x - rad * 0.6}" cy="${y - h - rad * 0.6}" r="${rad * 0.26}" fill="${s.fruit}"/>` : ''}
        </g>
      </g>`;
  }

  const h = [0, 9, 17, 26][stage];
  const bloom = [0, 0, 3.5, 7][stage];
  const petals = [];
  if (stage >= 2) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = x + Math.cos(a) * bloom;
      const py = y - h + Math.sin(a) * bloom * 0.62;
      if (s.shape === 'flame') {
        // Swept-back points, the way a flame lily curls away from its centre.
        const tipX = x + Math.cos(a) * bloom * 2.1;
        const tipY = y - h + Math.sin(a) * bloom * 1.25 - bloom * 0.5;
        petals.push(`<path d="M${x.toFixed(1)} ${(y - h).toFixed(1)}
                              Q${(px * 1.15).toFixed(1)} ${(py - bloom * 0.7).toFixed(1)}
                               ${tipX.toFixed(1)} ${tipY.toFixed(1)}
                              Q${px.toFixed(1)} ${(py + bloom * 0.4).toFixed(1)}
                               ${x.toFixed(1)} ${(y - h).toFixed(1)} Z"
                           fill="${i % 2 ? s.petal : shade(s.petal, 14)}"/>`);
      } else {
        petals.push(`<ellipse cx="${px.toFixed(1)}" cy="${py.toFixed(1)}"
                              rx="${(bloom * 0.72).toFixed(1)}" ry="${(bloom * 0.56).toFixed(1)}"
                              fill="${i % 2 ? shade(s.petal, -10) : s.petal}"/>`);
      }
    }
  }
  return `
    <g class="plant${ready ? ' is-ready' : ''}">
      <ellipse cx="${x}" cy="${y + 3}" rx="${8 + bloom}" ry="${3.5 + bloom * 0.35}" fill="#2C4A3A" opacity=".2"/>
      <path d="M${x} ${y} Q${x - 1} ${y - h * 0.6} ${x} ${y - h}" stroke="#4E9B4A" stroke-width="2.4" fill="none" stroke-linecap="round"/>
      ${stage >= 1 ? `
        <ellipse cx="${x - 6}" cy="${y - h * 0.45}" rx="6" ry="3.2" fill="#5AAE52" transform="rotate(-22 ${x - 6} ${y - h * 0.45})"/>
        <ellipse cx="${x + 6}" cy="${y - h * 0.62}" rx="5.4" ry="3" fill="#4E9B4A" transform="rotate(20 ${x + 6} ${y - h * 0.62})"/>` : ''}
      ${petals.join('')}
      ${stage >= 2 ? `<circle cx="${x}" cy="${y - h}" r="${bloom * 0.5}" fill="${s.heart}"/>` : ''}
    </g>`;
}

// ---------------------------------------------------------------------------
// pets
// ---------------------------------------------------------------------------

export const PETS = {
  butterfly: { en: 'Butterfly', cost: 300,  bonus: 0.08, defence: 0 },
  bee:       { en: 'Bee',       cost: 500,  bonus: 0.10, defence: 1 },
  rabbit:    { en: 'Rabbit',    cost: 800,  bonus: 0.12, defence: 2 },
  cat:       { en: 'Cat',       cost: 1200, bonus: 0.15, defence: 4 },
  dog:       { en: 'Dog',       cost: 1800, bonus: 0.18, defence: 7 },
  owl:       { en: 'Owl',       cost: 2600, bonus: 0.22, defence: 11 },
  peacock:   { en: 'Peacock',   cost: 3600, bonus: 0.26, defence: 9 },
  // The apex guardian. Nothing else comes close on defence, so it has to be
  // priced out of reach until the garden is producing properly. Note that
  // `threatLevel` counts your own defence, so a tiger raises the raiders it
  // attracts as well as your odds against them — it is not a win button.
  tiger:     { en: 'Tiger',     cost: 5200, bonus: 0.30, defence: 18 },
};

export const PET_IDS = Object.keys(PETS);

/** Pet artwork, drawn side-on at roughly tile scale. */
export function petArt(id) {
  switch (id) {
    case 'cat':
      return `
        <g class="pet pet-cat">
          <ellipse cx="0" cy="6" rx="13" ry="4" fill="#2C4A3A" opacity=".22"/>
          <g class="legs">
            <rect x="-8" y="-2" width="3.2" height="8" rx="1.6" fill="#C97F3B"/>
            <rect x="-2" y="-2" width="3.2" height="8" rx="1.6" fill="#D98F49"/>
            <rect x="4"  y="-2" width="3.2" height="8" rx="1.6" fill="#C97F3B"/>
            <rect x="9"  y="-2" width="3.2" height="8" rx="1.6" fill="#D98F49"/>
            <ellipse cx="-6.4" cy="6" rx="2.6" ry="1.5" fill="#F0C089"/>
            <ellipse cx="-0.4" cy="6" rx="2.6" ry="1.5" fill="#F0C089"/>
            <ellipse cx="5.6"  cy="6" rx="2.6" ry="1.5" fill="#F0C089"/>
            <ellipse cx="10.6" cy="6" rx="2.6" ry="1.5" fill="#F0C089"/>
          </g>
          <path d="M-10 -2 q0 -9 10 -9 q10 0 10 9 z" fill="#E4A055"/>
          <path d="M-10 -2 q0 -9 10 -9 q3 5 2 11 z" fill="#EFB068"/>
          <circle cx="11" cy="-10" r="6.2" fill="#EFB068"/>
          <path d="M6.6 -14.4 l1.6 -6 l4.2 4 z" fill="#D08B42"/>
          <path d="M13.6 -15.2 l4.4 -5 l1 6.2 z" fill="#D08B42"/>
          <circle cx="9.2" cy="-10.6" r="1.3" fill="#2F2418"/>
          <circle cx="13.4" cy="-10.6" r="1.3" fill="#2F2418"/>
          <path d="M11.3 -8.4 l-1.4 1.2 h2.8 z" fill="#C0674F"/>
          <path class="tail" d="M-10 -4 q-9 -3 -7 -12" stroke="#D08B42" stroke-width="3.2" fill="none" stroke-linecap="round"/>
        </g>`;
    case 'dog':
      return `
        <g class="pet pet-dog">
          <ellipse cx="0" cy="7" rx="14" ry="4" fill="#2C4A3A" opacity=".22"/>
          <g class="legs">
            <rect x="-9" y="-1" width="3.6" height="9" rx="1.8" fill="#8A6236"/>
            <rect x="-3" y="-1" width="3.6" height="9" rx="1.8" fill="#9C7040"/>
            <rect x="4"  y="-1" width="3.6" height="9" rx="1.8" fill="#8A6236"/>
            <rect x="10" y="-1" width="3.6" height="9" rx="1.8" fill="#9C7040"/>
          </g>
          <path d="M-11 -1 q0 -10 11 -10 q11 0 11 10 z" fill="#A97A45"/>
          <path d="M-11 -1 q0 -10 11 -10 q3 6 2 12 z" fill="#BE8B52"/>
          <circle cx="12" cy="-11" r="6.8" fill="#BE8B52"/>
          <ellipse cx="7.5" cy="-12" rx="3" ry="5" fill="#8A6236"/>
          <circle cx="10.6" cy="-11.6" r="1.4" fill="#2F2418"/>
          <circle cx="15" cy="-11.6" r="1.4" fill="#2F2418"/>
          <ellipse cx="17.4" cy="-9.4" rx="2.6" ry="2" fill="#4A3B2A"/>
          <path class="tail" d="M-11 -4 q-8 -6 -4 -12" stroke="#A97A45" stroke-width="3.4" fill="none" stroke-linecap="round"/>
        </g>`;
    case 'rabbit':
      return `
        <g class="pet pet-rabbit">
          <ellipse cx="0" cy="5" rx="10" ry="3.4" fill="#2C4A3A" opacity=".22"/>
          <ellipse cx="-1" cy="-3" rx="9" ry="7.5" fill="#EDE7DC"/>
          <circle cx="7" cy="-8" r="5.4" fill="#F6F1E7"/>
          <ellipse cx="5" cy="-16" rx="2.2" ry="6.5" fill="#EDE7DC" transform="rotate(-9 5 -16)"/>
          <ellipse cx="9.6" cy="-16.4" rx="2.2" ry="6.5" fill="#F6F1E7" transform="rotate(8 9.6 -16.4)"/>
          <ellipse cx="5" cy="-16" rx="1" ry="4" fill="#F0BFC6" transform="rotate(-9 5 -16)"/>
          <circle cx="9.2" cy="-8.4" r="1.2" fill="#4A3B2A"/>
          <circle cx="-9.5" cy="-3" r="3.2" fill="#FFFFFF"/>
          <g class="legs">
            <ellipse cx="-3" cy="4" rx="3.4" ry="2" fill="#DCD5C7"/>
            <ellipse cx="4"  cy="4" rx="3.4" ry="2" fill="#DCD5C7"/>
          </g>
        </g>`;
    case 'tiger':
      // Drawn at dog proportions and scaled up, rather than drawn large: at
      // full size it was wider than the plot it stood on, which made the tile
      // look small instead of the tiger looking big. The tail stripes are a
      // dashed overlay on the same curve, so they bend with it rather than
      // needing a second path kept in sync by hand.
      return `
        <g class="pet pet-tiger" transform="scale(.82)">
          <ellipse cx="0" cy="9" rx="19" ry="5" fill="#2C4A3A" opacity=".22"/>
          <g class="tail">
            <path d="M-14 -6 q-13 -1 -14 -15" stroke="#E08A2E" stroke-width="4.2" fill="none" stroke-linecap="round"/>
            <path d="M-14 -6 q-13 -1 -14 -15" stroke="#2F2418" stroke-width="4.2" fill="none" stroke-dasharray="2.4 5.4" stroke-dashoffset="4"/>
            <circle cx="-28" cy="-21" r="2.4" fill="#2F2418"/>
          </g>
          <g class="legs">
            <rect x="-12" y="-2" width="4.4" height="11" rx="2.2" fill="#D07C26"/>
            <rect x="-5"  y="-2" width="4.4" height="11" rx="2.2" fill="#E08A2E"/>
            <rect x="5"   y="-2" width="4.4" height="11" rx="2.2" fill="#D07C26"/>
            <rect x="11"  y="-2" width="4.4" height="11" rx="2.2" fill="#E08A2E"/>
            <ellipse cx="-9.8" cy="9"  rx="3.2" ry="1.8" fill="#F6EDDC"/>
            <ellipse cx="-2.8" cy="9"  rx="3.2" ry="1.8" fill="#F6EDDC"/>
            <ellipse cx="7.2"  cy="9"  rx="3.2" ry="1.8" fill="#F6EDDC"/>
            <ellipse cx="13.2" cy="9"  rx="3.2" ry="1.8" fill="#F6EDDC"/>
          </g>
          <path d="M-14 -2 q0 -13 14 -13 q14 0 14 13 z" fill="#E08A2E"/>
          <path d="M-11 -2 q0 -5 12 -5 q12 0 12 5 z" fill="#F6EDDC" opacity=".85"/>
          <path d="M-14 -2 q0 -13 14 -13 q3 7 2 15 z" fill="#F0A34A" opacity=".5"/>
          <g fill="none" stroke="#2F2418" stroke-width="2" stroke-linecap="round">
            <path d="M-8 -13.4 q1.5 4 .5 7.4"/>
            <path d="M-2 -14.6 q1.6 4.5 .6 8"/>
            <path d="M4 -14.4 q1.6 4.5 .6 8"/>
            <path d="M10 -12.8 q1.6 4 .6 7"/>
          </g>
          <path d="M8.6 -19.4 l-1.2 -6.4 l5.8 3.2 z" fill="#D07C26"/>
          <path d="M9.4 -20.2 l-.6 -3.2 l2.8 1.6 z" fill="#3A2A1E"/>
          <path d="M20 -20.6 l4 -5 l1.2 5.6 z" fill="#D07C26"/>
          <path d="M20.8 -20.8 l2.2 -2.8 l.6 3.2 z" fill="#3A2A1E"/>
          <circle cx="16" cy="-15" r="7.8" fill="#F0A34A"/>
          <path d="M8.6 -15.6 q1.2 -6 7.4 -7.2 q6.2 1.2 7.4 7.2 q-3.4 -3.4 -7.4 -3.4 q-4 0 -7.4 3.4 z" fill="#E08A2E"/>
          <ellipse cx="12.6" cy="-11.4" rx="3.4" ry="2.6" fill="#F6EDDC"/>
          <ellipse cx="19.4" cy="-11.4" rx="3.4" ry="2.6" fill="#F6EDDC"/>
          <ellipse cx="13.2" cy="-16.2" rx="2.2" ry="2.4" fill="#F6EDDC"/>
          <ellipse cx="19"   cy="-16.4" rx="2.2" ry="2.4" fill="#F6EDDC"/>
          <circle cx="13.4" cy="-16.2" r="1.3" fill="#1E1A14"/>
          <circle cx="19.2" cy="-16.4" r="1.3" fill="#1E1A14"/>
          <path d="M16 -13.6 l-2 1.6 h4 z" fill="#C0674F"/>
          <path d="M16 -12 v2 M16 -10 q-1.8 1 -3 -.4 M16 -10 q1.8 1 3 -.4"
                stroke="#8A5A3A" stroke-width="1" fill="none" stroke-linecap="round"/>
          <g stroke="#2F2418" stroke-width="1.6" stroke-linecap="round" fill="none">
            <path d="M11.8 -20.6 q1.4 2 1 3.4"/>
            <path d="M16 -21.6 q0 2 0 3.2"/>
            <path d="M20.2 -20.8 q-1.4 2 -1 3.4"/>
          </g>
        </g>`;
    case 'owl':
      return `
        <g class="pet pet-owl">
          <ellipse cx="0" cy="6" rx="10" ry="3.4" fill="#2C4A3A" opacity=".22"/>
          <ellipse cx="0" cy="-6" rx="9" ry="11" fill="#8A7358"/>
          <ellipse cx="0" cy="-3" rx="6" ry="7.5" fill="#C4AE8C"/>
          <g class="wingL"><ellipse cx="-8" cy="-6" rx="3.4" ry="8" fill="#75603F"/></g>
          <g class="wingR"><ellipse cx="8" cy="-6" rx="3.4" ry="8" fill="#75603F"/></g>
          <circle cx="-3.4" cy="-11" r="3.6" fill="#F6F1E7"/>
          <circle cx="3.4" cy="-11" r="3.6" fill="#F6F1E7"/>
          <circle cx="-3.4" cy="-11" r="1.8" fill="#2F2418"/>
          <circle cx="3.4" cy="-11" r="1.8" fill="#2F2418"/>
          <path d="M0 -9 l-2 3 h4 z" fill="#E0A340"/>
          <path d="M-6 -17 l3 -4 l2 4 z" fill="#75603F"/>
          <path d="M6 -17 l-3 -4 l-2 4 z" fill="#75603F"/>
          <rect x="-4" y="4" width="2.4" height="3" fill="#E0A340"/>
          <rect x="1.6" y="4" width="2.4" height="3" fill="#E0A340"/>
        </g>`;
    case 'bee':
      return `
        <g class="pet pet-bee">
          <ellipse cx="0" cy="0" rx="6" ry="4.4" fill="#F2C230"/>
          <rect x="-2.6" y="-4.4" width="2.6" height="8.8" fill="#3A2E1C"/>
          <rect x="2.2" y="-4" width="2.4" height="8" fill="#3A2E1C"/>
          <circle cx="6.4" cy="-1" r="3.2" fill="#3A2E1C"/>
          <path d="M4.6 -4.2 l1.6 -3.4 M8 -4 l2.6 -3" stroke="#3A2E1C" stroke-width="1" stroke-linecap="round"/>
          <g class="wingL"><ellipse cx="-2" cy="-6" rx="5.4" ry="3.2" fill="#DFF2FA" opacity=".85"/></g>
          <g class="wingR"><ellipse cx="3" cy="-6" rx="4.6" ry="2.8" fill="#DFF2FA" opacity=".8"/></g>
        </g>`;
    case 'peacock':
      return `
        <g class="pet pet-peacock">
          <ellipse cx="0" cy="7" rx="12" ry="4" fill="#2C4A3A" opacity=".22"/>
          <g class="pfan">
            ${Array.from({ length: 9 }, (_, i) => {
              const a = (-70 + i * 17.5) * (Math.PI / 180);
              const len = 26;
              const fx = Math.sin(a) * len;
              const fy = -Math.cos(a) * len - 2;
              return `
                <g>
                  <path d="M0 0 Q${(fx * 0.5).toFixed(1)} ${(fy * 0.6).toFixed(1)} ${fx.toFixed(1)} ${fy.toFixed(1)}"
                        stroke="#2E8F72" stroke-width="2.2" fill="none" stroke-linecap="round"/>
                  <ellipse cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" rx="4.4" ry="5.4" fill="#1E7F86"/>
                  <ellipse cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" rx="2.8" ry="3.6" fill="#2B5FA8"/>
                  <circle  cx="${fx.toFixed(1)}" cy="${fy.toFixed(1)}" r="1.5" fill="#F2C230"/>
                </g>`;
            }).join('')}
          </g>
          <g class="legs">
            <rect x="-3" y="1" width="2.6" height="7" rx="1.3" fill="#B98A46"/>
            <rect x="2"  y="1" width="2.6" height="7" rx="1.3" fill="#C79A56"/>
          </g>
          <ellipse cx="0" cy="-4" rx="8" ry="9" fill="#1E6FA8"/>
          <ellipse cx="-2" cy="-4" rx="5" ry="7" fill="#2B8ACB"/>
          <path d="M4 -10 q7 -5 9 -12 q-3 8 -6 13 z" fill="#1E7F86"/>
          <circle cx="6" cy="-14" r="4.4" fill="#2B8ACB"/>
          <path d="M8.6 -15.6 l4.4 1.2 l-4.4 1.6 z" fill="#E0A340"/>
          <circle cx="5.2" cy="-15" r="1.1" fill="#12303F"/>
          <path d="M4 -19 l.6 -4 M6.4 -19.4 l1.6 -3.6 M8.6 -18.6 l2.8 -3"
                stroke="#2E8F72" stroke-width="1.1" stroke-linecap="round"/>
          <circle cx="4.4" cy="-23.4" r="1.2" fill="#1E7F86"/>
          <circle cx="8.2" cy="-23.2" r="1.2" fill="#1E7F86"/>
          <circle cx="11.6" cy="-22" r="1.2" fill="#1E7F86"/>
        </g>`;
    default: // butterfly
      return `
        <g class="pet pet-fly">
          <ellipse cx="0" cy="0" rx="1.6" ry="4.4" fill="#4A3B2A"/>
          <path d="M0 -4 l-2.6 -3.4 M0 -4 l2.6 -3.4" stroke="#4A3B2A" stroke-width=".9" stroke-linecap="round"/>
          <g class="wingL"><ellipse cx="-5.4" cy="-1" rx="5.8" ry="4.2" fill="#F2A0C0"/></g>
          <g class="wingR"><ellipse cx="5.4" cy="-1" rx="5.8" ry="4.2" fill="#E4566B"/></g>
        </g>`;
  }
}

// ---------------------------------------------------------------------------
// hunters
// ---------------------------------------------------------------------------

/**
 * Birds swoop; grazers wander in and eat. Ground raiders are slower and less
 * dangerous individually, which makes them the early-game nuisance while the
 * birds stay the late-game threat.
 */
export const HUNTERS = {
  // Ordered weakest first. The raid picker takes a slice off the front, so
  // this order is what decides which raiders a young garden ever meets —
  // grouped by species it only ever saw grazers, and never a crow.
  myna:    { en: 'Myna',      power: 2,  bounty: 20,  body: '#4A3B2A', wing: '#33281B' },
  crow:    { en: 'Crow',      power: 3,  bounty: 30,  body: '#3A3A44', wing: '#26262E' },
  goat:    { en: 'Goat',      power: 4,  bounty: 40,  ground: true, graze: 2, body: '#D8D2C4', dark: '#B3AC9C' },
  parakeet:{ en: 'Parakeet',  power: 5,  bounty: 60,  body: '#4FAE55', wing: '#3B8B41' },
  sheep:   { en: 'Sheep',     power: 6,  bounty: 70,  ground: true, graze: 2, body: '#F2EFE6', dark: '#CFC9BA' },
  hawk:    { en: 'Hawk',      power: 7,  bounty: 90,  body: '#8A6236', wing: '#6B4A28' },
  cow:     { en: 'Cow',       power: 9,  bounty: 140, ground: true, graze: 3, body: '#E8E4DA', dark: '#3E3A34' },
  kite:    { en: 'Brahminy kite', power: 10, bounty: 170, body: '#C4633A', wing: '#A0492A' },
  vulture: { en: 'Vulture',   power: 12, bounty: 220, body: '#6E6458', wing: '#524A40' },
  eagle:   { en: 'Eagle',     power: 15, bounty: 340, body: '#5C4A33', wing: '#3E3122' },
  phoenix: { en: 'Fire bird', power: 20, bounty: 600, body: '#E4623A', wing: '#C4402A', mythic: true },
};

export const HUNTER_IDS = Object.keys(HUNTERS);

/** A hunter. `mode` is 'fly' for a live raid or 'hurt' when beaten. */
export function hunterArt(id, mode = 'fly') {
  const h = HUNTERS[id];
  const hurt = mode === 'hurt';
  if (h.ground) return grazerArt(id, h, hurt);
  return `
    <g class="hunter hunter-${id}${hurt ? ' is-hurt' : ''}">
      ${hurt ? '<circle cx="0" cy="-14" r="2" fill="#8ED1E0" opacity=".7" class="dazed"/>' : ''}
      <g class="wingL"><path d="M-2 -2 q-13 -7 -17 1 q9 2 16 4 z" fill="${h.wing}"/></g>
      <g class="wingR"><path d="M2 -2 q13 -7 17 1 q-9 2 -16 4 z" fill="${h.wing}"/></g>
      <ellipse cx="0" cy="0" rx="7.5" ry="5.2" fill="${h.body}"/>
      <circle cx="6" cy="-3.4" r="3.8" fill="${h.body}"/>
      <path d="M9.4 -3.6 l4.4 1.4 l-4.4 1.8 z" fill="#E8B54A"/>
      <circle cx="6.6" cy="-4.2" r="1.1" fill="${hurt ? '#C4553C' : '#F6F1E7'}"/>
      ${hurt ? '<path d="M4.6 -6.2 l4 2.6 M8.6 -6.2 l-4 2.6" stroke="#2C2A28" stroke-width="1" stroke-linecap="round"/>' : ''}
      ${h.mythic ? `
        <path class="flame" d="M-7 -3 q-5 -6 -1 -10 q1 6 4 8 z" fill="#F7C948" opacity=".9"/>
        <path class="flame" d="M-9 1 q-7 -3 -6 -8 q3 5 7 6 z" fill="#E4623A" opacity=".8"/>` : ''}
      <path d="M-7 2 q-8 3 -11 0 q7 -1 10 -3 z" fill="${h.wing}"/>
    </g>`;
}

/** Cow, goat and sheep — four legs, a lowered head, and no wings. */
function grazerArt(id, h, hurt) {
  const horns = id === 'goat'
    ? `<path d="M7 -13 q3 -6 6 -4 M10 -13 q3 -5 6 -3" stroke="#8A7A5E" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
    : id === 'cow'
      ? `<path d="M6 -13 q-3 -4 -6 -2 M13 -13 q3 -4 6 -2" stroke="#C9C2B2" stroke-width="1.8" fill="none" stroke-linecap="round"/>`
      : '';
  const woolly = id === 'sheep';
  return `
    <g class="hunter hunter-${id}${hurt ? ' is-hurt' : ''}">
      ${hurt ? '<circle cx="0" cy="-20" r="2" fill="#8ED1E0" opacity=".7" class="dazed"/>' : ''}
      <ellipse cx="2" cy="8" rx="15" ry="4" fill="#2C4A3A" opacity=".2"/>
      <g class="legs">
        <rect x="-8" y="-1" width="3.4" height="9" rx="1.7" fill="${h.dark}"/>
        <rect x="-1" y="-1" width="3.4" height="9" rx="1.7" fill="${h.dark}"/>
        <rect x="6"  y="-1" width="3.4" height="9" rx="1.7" fill="${h.dark}"/>
        <rect x="12" y="-1" width="3.4" height="9" rx="1.7" fill="${h.dark}"/>
      </g>
      ${woolly
        ? `<ellipse cx="2" cy="-6" rx="13" ry="8" fill="${h.body}"/>
           <circle cx="-7" cy="-8" r="5" fill="${h.body}"/>
           <circle cx="0" cy="-11" r="5.4" fill="${h.body}"/>
           <circle cx="8" cy="-9" r="4.6" fill="${h.body}"/>`
        : `<ellipse cx="2" cy="-6" rx="13" ry="7.5" fill="${h.body}"/>`}
      ${id === 'cow'
        ? `<ellipse cx="-4" cy="-8" rx="4.5" ry="3.4" fill="${h.dark}"/>
           <ellipse cx="6" cy="-3" rx="3.4" ry="2.6" fill="${h.dark}"/>` : ''}
      <circle cx="13" cy="-11" r="5.6" fill="${woolly ? '#3E3A34' : h.body}"/>
      ${horns}
      <circle cx="15.4" cy="-11.6" r="1.2" fill="${hurt ? '#C4553C' : '#2F2418'}"/>
      ${hurt ? '<path d="M13 -14 l4 3 M17 -14 l-4 3" stroke="#2C2A28" stroke-width="1" stroke-linecap="round"/>' : ''}
      <path class="tail" d="M-11 -8 q-6 2 -5 8" stroke="${h.dark}" stroke-width="2.4" fill="none" stroke-linecap="round"/>
    </g>`;
}

// ---------------------------------------------------------------------------
// ground
// ---------------------------------------------------------------------------

/**
 * Soil and whatever grows on it are one group, and the diamond *is* the hit
 * target — nothing extends above it.
 *
 * An earlier version added an invisible plate reaching up over the plant so a
 * tall tree could be clicked. That plate overlapped the cells behind, so
 * hovering one tile lit up another. A plant hiding its own tile is the honest
 * trade: you select the ground, and the ground is exactly the diamond.
 */
function plotGroup(c, r, planted, inner) {
  const { x, y } = iso(c, r);
  const hw = TW / 2, hh = TH / 2, d = 7;
  const top = `${x},${y - hh} ${x + hw},${y} ${x},${y + hh} ${x - hw},${y}`;
  return `
    <g class="soil${planted ? ' has-plant' : ''}" data-plot="${c},${r}" tabindex="0"
       role="button" aria-label="Garden plot">
      <polygon points="${x - hw},${y} ${x},${y + hh} ${x},${y + hh + d} ${x - hw},${y + d}" fill="#5E4028"/>
      <polygon points="${x},${y + hh} ${x + hw},${y} ${x + hw},${y + d} ${x},${y + hh + d}" fill="#4C3320"/>
      <polygon class="soilface" points="${top}" fill="${planted ? '#7C5836' : '#8A6440'}"/>
      <polygon points="${top}" fill="none" stroke="#5E4028" stroke-opacity=".5" stroke-width="1"/>
      ${inner || ''}
    </g>`;
}

function grassTile(c, r) {
  const { x, y } = iso(c, r);
  const hw = TW / 2, hh = TH / 2, d = 7;
  const top = `${x},${y - hh} ${x + hw},${y} ${x},${y + hh} ${x - hw},${y}`;
  return `
    <g>
      <polygon points="${x - hw},${y} ${x},${y + hh} ${x},${y + hh + d} ${x - hw},${y + d}" fill="#5E7C3E"/>
      <polygon points="${x},${y + hh} ${x + hw},${y} ${x + hw},${y + d} ${x},${y + hh + d}" fill="#4C6733"/>
      <polygon points="${top}" fill="#79A24E"/>
    </g>`;
}

function emptyWall(c, r, key) {
  const { x, y } = iso(c, r);
  const hw = TW / 2, hh = TH / 2;
  return `
    <g class="wallslot" data-wall="${key}" tabindex="0" role="button" aria-label="Empty wall slot">
      <polygon class="slotface" points="${x},${y - hh} ${x + hw},${y} ${x},${y + hh} ${x - hw},${y}"
               fill="#FFFFFF" fill-opacity=".18" stroke="#3F5E3A" stroke-opacity=".45"
               stroke-width="1.4" stroke-dasharray="4 3"/>
    </g>`;
}

/** A selection marker that follows the diamond rather than boxing it in. */
function selectRing(c, r) {
  const { x, y } = iso(c, r);
  const hw = TW / 2, hh = TH / 2;
  return `<polygon class="selring" points="${x},${y - hh} ${x + hw},${y} ${x},${y + hh} ${x - hw},${y}"
                   fill="none" stroke="#FFE08A" stroke-width="3" stroke-linejoin="round"/>`;
}

/** Plain ground beyond the garden, so the plots sit in a place. */
function apronTile(c, r) {
  const { x, y } = iso(c, r);
  const hw = TW / 2, hh = TH / 2;
  return `<polygon points="${x},${y - hh} ${x + hw},${y} ${x},${y + hh} ${x - hw},${y}"
                   fill="#8FB566" opacity=".55"/>`;
}

// ---------------------------------------------------------------------------
// scene assembly
// ---------------------------------------------------------------------------

export function gardenSvg({ cells, plants, walls, pets = [], perched = null, selected = null, radius = 1 }) {
  const drawn = [];
  const owned = new Set(cells.map(({ c, r }) => `${c},${r}`));

  // Two rings of plain ground around the garden so it reads as a clearing in a
  // field rather than a board floating in front of wallpaper.
  for (let r = -radius - 2; r <= radius + 2; r++) {
    for (let c = -radius - 2; c <= radius + 2; c++) {
      if (owned.has(`${c},${r}`)) continue;
      drawn.push({ d: c + r - 0.5, html: apronTile(c, r) });
    }
  }

  for (const { c, r, type } of cells) {
    const key = `${c},${r}`;
    const d = c + r;
    const on = selected === key;

    if (type === 'wall') {
      const tier = walls.get(key) || 0;
      // With a block standing there, light the block; a bare slot lights the
      // ground, because there is nothing else to point at.
      const block = tier
        ? wallBlock(c, r, tier, key).replace('class="wallblock', `class="wallblock${on ? ' is-lit' : ''}`)
        : emptyWall(c, r, key);
      drawn.push({ d, html: grassTile(c, r) + block + (on && !tier ? selectRing(c, r) : '') });
    } else {
      const p = plants.get(key);
      const art = p
        ? plantArt(c, r, p.id, p.stage).replace('class="plant', `class="plant${on ? ' is-lit' : ''}`)
        : '';
      drawn.push({ d, html: plotGroup(c, r, Boolean(p), art) + (on && !p ? selectRing(c, r) : '') });
    }
  }

  drawn.sort((a, b) => a.d - b.d);

  const span = radius * 2 + 5;
  const halfW = span * (TW / 2) + 8;
  const top = -((radius + 2) * TH) - 60;
  const bottom = (radius + 2) * TH + TH + 16;

  return `
    <svg class="gardensvg" viewBox="${-halfW} ${top} ${halfW * 2} ${bottom - top}"
         preserveAspectRatio="xMidYMid meet" role="img" aria-label="Your garden">
      ${drawn.map((c) => c.html).join('')}
      ${perched ? perchedHunter(perched, radius) : ''}
      ${pets.map((id, i) => petLayer(id, radius, i)).join('')}
    </svg>`;
}

/** A beaten hunter, sat on the wall where the player can see what happened. */
function perchedHunter(id, radius) {
  const { x, y } = iso(radius, -radius);
  return `
    <g class="perched" transform="translate(${x} ${y - 34})" data-perched="${id}"
       tabindex="0" role="button" aria-label="A beaten ${HUNTERS[id].en}">
      ${hunterArt(id, 'hurt')}
    </g>`;
}

/**
 * Pets are emitted parked at the centre; `wanderPets` in the world view gives
 * each one its own random route. A shared CSS keyframe made every animal trace
 * the same rectangle in lockstep, which read as clockwork rather than life.
 */
function petLayer(id, radius, i) {
  const ground = id === 'cat' || id === 'dog' || id === 'rabbit'
    || id === 'peacock' || id === 'tiger';
  return `
    <g class="petorbit petorbit-${ground ? 'ground' : 'air'}" data-pet-i="${i}"
       data-ground="${ground ? 1 : 0}" transform="translate(0 0)">
      ${petArt(id)}
    </g>`;
}

/** Lighten (+) or darken (−) a hex colour by a percentage. */
function shade(hex, pct) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + (pct / 100) * 255)));
  return `#${[(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, '0')).join('')}`;
}
