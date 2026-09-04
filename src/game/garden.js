import { state, save, emit } from './state.js';
import {
  SPECIES, WALL_TIERS, MAX_WALL, STAGES, PETS, HUNTERS, HUNTER_IDS, wallRefund, RELIC,
} from '../art/garden.js';

/**
 * The garden is a grid of individual cells. Every cell is either LAND you plant
 * on or WALL you build on, set one at a time — there is no ring rule, because a
 * rule about rings is a rule about what you are allowed to imagine.
 *
 * Cells can also be swapped with a neighbour, carrying whatever is on them, so
 * a wall or a grown plant can be walked across the garden a step at a time.
 *
 * Growth and raids are tied to levels rather than wall-clock time: a Playable
 * is opened for minutes and closed, so timers running while the game is shut
 * would make the garden a chore you are losing at.
 */

export const LAND = 'land';
export const WALL = 'wall';

const key = (c, r) => `${c},${r}`;
const parse = (k) => k.split(',').map(Number);

/** A garden begins as a single plot. Everything else is expanded into. */
function seed() {
  return new Map([[key(0, 0), LAND]]);
}

export function cells() {
  if (!state.cells || !state.cells.size) state.cells = seed();
  return state.cells;
}

export function radius() {
  let R = 0;
  for (const k of cells().keys()) {
    const [c, r] = parse(k);
    R = Math.max(R, Math.abs(c), Math.abs(r));
  }
  return R;
}

export const gridSide = () => radius() * 2 + 1;
export const cellType = (k) => cells().get(k) || null;
export const allKeys = () => [...cells().keys()];

export const plotKeys = () => allKeys().filter((k) => cellType(k) === LAND);
export const wallKeys = () => allKeys().filter((k) => cellType(k) === WALL);

/**
 * The garden stops growing at level 10. Past that the grid is 19x19 and the
 * wheel has reached its widest, so there is nothing left for a ring to unlock —
 * and capping it means every wheel size the game can produce is one a player
 * will actually reach.
 */
export const MAX_LEVEL = 10;

export const atMaxLevel = () => gardenLevel() >= MAX_LEVEL;

/** Cost of the next ring, or null once the garden is full grown. */
/**
 * What the next ring costs.
 *
 * This gates the wheel — a letter is added every two levels — so an unreachable
 * curve makes most of the word pools unreachable too. At 1.75^n the tenth level
 * cost 50,980 coins, about 800 rounds of play, which put the 9- and 10-letter
 * wheels (960 of the 1,600 pools) out of reach of anyone. At 1.42 the whole
 * garden is roughly 8,000 coins: a long goal rather than an impossible one.
 */
export function expandCost() {
  if (atMaxLevel()) return null;
  return Math.round(200 * Math.pow(1.42, radius()));
}

/**
 * The level is how far the garden reaches from its centre: one cell is level 1,
 * and every ring expanded into is another level. Reading it off the shape
 * rather than a counter means it can never drift out of step with the land,
 * and flipping cells between land and wall never changes it.
 */
export function gardenLevel() {
  return radius() + 1;
}

export function expand() {
  const cost = expandCost();
  if (cost === null || state.coins < cost) return false;
  state.coins -= cost;
  const R = radius() + 1;
  for (let r = -R; r <= R; r++) {
    for (let c = -R; c <= R; c++) {
      const k = key(c, r);
      if (!cells().has(k)) cells().set(k, LAND);
    }
  }
  save();
  emit();
  return true;
}

/** Flip one cell between land and wall, refunding whatever was on it. */
export function setCellType(k, type) {
  if (!cells().has(k) || cellType(k) === type) return false;
  if (k === '0,0' && type === WALL) return false; // the relic's home stays land

  if (type === WALL) {
    const p = state.plants.get(k);
    if (p) {
      if (p.id === 'relic') return false;
      state.plants.delete(k);
      state.coins += Math.floor((SPECIES[p.id]?.cost || 0) * 0.5);
    }
  } else {
    const refund = sellValue(k);
    if (refund) state.coins += refund;
    state.walls.delete(k);
  }
  cells().set(k, type);
  save();
  emit();
  return true;
}

export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

/** Can this cell be swapped in that direction? */
export function canMove(k, dir) {
  const d = DIRS[dir];
  if (!d || !k) return false;
  const [c, r] = parse(k);
  return cells().has(key(c + d[0], r + d[1]));
}

/**
 * Swap a cell with its neighbour, carrying type, plant and wall together. Doing
 * it repeatedly is how you walk something across the garden.
 */
export function moveCell(k, dir) {
  if (!canMove(k, dir)) return null;
  const d = DIRS[dir];
  const [c, r] = parse(k);
  const dest = key(c + d[0], r + d[1]);
  if (k === '0,0' || dest === '0,0') return null; // never displace the centre

  const swap = (map) => {
    const a = map.get(k);
    const b = map.get(dest);
    if (b === undefined) map.delete(k); else map.set(k, b);
    if (a === undefined) map.delete(dest); else map.set(dest, a);
  };
  swap(cells());
  swap(state.plants);
  swap(state.walls);
  save();
  emit();
  return dest;
}

// --------------------------------------------------------------- planting --

export const STAGE_POINTS = 100;
/**
 * Water and feed hurry a plant along; they are not the only way it grows.
 *
 * They used to be. A plant advanced only when paid for, which cost 800 coins
 * to bring anything to harvest — more than the most valuable crop paid back.
 * Growth is free per round now (`growAll`), so these are for when you want a
 * particular plot ready sooner, and they are priced to be worth it on a
 * valuable crop and not on a cheap one.
 */
export const BOOSTS = {
  // `rounds` is how many of the plant's own rounds the boost is worth, not a
  // flat number of points: a fixed amount would skip a whole palmyra for the
  // price of a jasmine and undo the ripening times entirely.
  water: { en: 'Water', cost: 30, rounds: 1 },
  feed: { en: 'Feed', cost: 80, rounds: 3 },
};

/** Growth points one completed round is worth to this species. */
export function roundGain(id) {
  const s = SPECIES[id];
  if (!s) return STAGE_POINTS;
  // Two stages to cross, sprout -> growing -> ready.
  return ((STAGES - 2) * STAGE_POINTS) / Math.max(1, s.rounds || 2);
}

/** Rounds still to wait, at the plant's own pace. */
export function roundsLeft(k) {
  const p = state.plants.get(k);
  if (!p || p.id === 'relic' || p.stage >= STAGES - 1) return 0;
  const need = (STAGES - 1 - p.stage) * STAGE_POINTS - (p.prog || 0);
  return Math.max(1, Math.ceil(need / roundGain(p.id)));
}

export function plantAt(k, speciesId) {
  const s = SPECIES[speciesId];
  if (!s || state.plants.has(k) || cellType(k) !== LAND || state.coins < s.cost) return false;
  state.coins -= s.cost;
  state.plants.set(k, { id: speciesId, stage: 1, prog: 0 });
  save();
  emit();
  return true;
}

function advance(k, points) {
  const p = state.plants.get(k);
  if (!p || p.id === 'relic' || p.stage >= STAGES - 1) return 0;
  let stage = p.stage;
  let prog = (p.prog || 0) + points;
  let gained = 0;
  while (prog >= STAGE_POINTS && stage < STAGES - 1) { prog -= STAGE_POINTS; stage += 1; gained += 1; }
  if (stage >= STAGES - 1) prog = 0;
  state.plants.set(k, { id: p.id, stage, prog });
  return gained;
}

export function boostPlant(k, kind) {
  const b = BOOSTS[kind];
  const p = state.plants.get(k);
  if (!b || !p || p.id === 'relic' || p.stage >= STAGES - 1 || state.coins < b.cost) return false;
  state.coins -= b.cost;
  advance(k, roundGain(p.id) * b.rounds);
  save();
  emit();
  return true;
}

export const growingKeys = () => [...state.plants.entries()]
  .filter(([, p]) => p.id !== 'relic' && p.stage < STAGES - 1).map(([k]) => k);

export function waterAll() {
  const keys = growingKeys();
  const cost = BOOSTS.water.cost;
  let count = 0, spent = 0, ready = 0;
  for (const k of keys) {
    if (state.coins < cost) break;
    state.coins -= cost;
    advance(k, roundGain(state.plants.get(k).id) * BOOSTS.water.rounds);
    spent += cost; count += 1;
    if (state.plants.get(k).stage >= STAGES - 1) ready += 1;
  }
  if (count) { save(); emit(); }
  return { count, spent, ready, remaining: keys.length - count };
}

/**
 * A grazer eating: the exact inverse of a watering can. Progress comes off in
 * the same 25-point units it went on in, dropping a stage when it runs out.
 */
export function nibble(k, units = 1) {
  const p = state.plants.get(k);
  if (!p || p.id === 'relic') return false;
  let stage = p.stage;
  let prog = (p.prog || 0) - units * BOOSTS.water.points;
  while (prog < 0 && stage > 1) { stage -= 1; prog += STAGE_POINTS; }
  if (prog < 0) prog = 0;
  state.plants.set(k, { id: p.id, stage, prog });
  save();
  emit();
  return true;
}

/** Plants a wandering grazer would stop at — anything with something on it. */
export function grazeableKeys() {
  return [...state.plants.entries()]
    .filter(([, p]) => p.id !== 'relic')
    .map(([k]) => k);
}

export function plantProgress(k) {
  const p = state.plants.get(k);
  if (!p) return 0;
  if (p.stage >= STAGES - 1) return 100;
  return Math.min(100, Math.round(((p.prog || 0) / STAGE_POINTS) * 100));
}

export const harvestValue = (id) =>
  Math.round((id === 'relic' ? RELIC.yield : SPECIES[id].yield) * (1 + petBonus()));

export function harvestAt(k) {
  const p = state.plants.get(k);
  if (!p || p.stage < STAGES - 1) return 0;
  const gain = harvestValue(p.id);
  state.coins += gain;
  if (p.id === 'relic') state.plants.set(k, { id: 'relic', stage: STAGES - 1, prog: 0 });
  else state.plants.delete(k);
  save();
  emit();
  return gain;
}

/**
 * One completed round moves every plant on by one of ITS OWN rounds.
 *
 * `grown` counts plants that made progress, not only those that crossed a
 * stage: a palmyra advances a sixth of its life per round and would
 * otherwise be reported as having done nothing five rounds out of six.
 */
export function growAll() {
  let grown = 0, ready = 0;
  for (const [k, p] of [...state.plants]) {
    if (p.id === 'relic' || p.stage >= STAGES - 1) continue;
    advance(k, roundGain(p.id));
    grown += 1;
    if (state.plants.get(k).stage >= STAGES - 1) ready += 1;
  }
  return { grown, ready };
}

/**
 * Drop anything the current build no longer knows how to grow, refunding half.
 * Retiring a species should cost the player a little, never break their save.
 */
export function pruneUnknownPlants() {
  let dropped = 0;
  for (const [k, p] of [...state.plants]) {
    if (p.id === 'relic' || SPECIES[p.id]) continue;
    state.plants.delete(k);
    dropped += 1;
  }
  if (dropped) save();
  return dropped;
}

export function readyCount() {
  let n = 0;
  for (const p of state.plants.values()) if (p.stage >= STAGES - 1) n += 1;
  return n;
}

export function plantRelic() {
  if ([...state.plants.values()].some((p) => p.id === 'relic')) return null;
  const centre = '0,0';
  cells().set(centre, LAND);
  const existing = state.plants.get(centre);
  if (existing) {
    const free = plotKeys().find((k) => k !== centre && !state.plants.has(k));
    if (free) state.plants.set(free, existing);
  }
  state.plants.set(centre, { id: 'relic', stage: STAGES - 1, prog: 0 });
  save();
  return centre;
}

// ------------------------------------------------------------------ walls --

export const wallTier = (k) => state.walls.get(k) || 0;
export const wallCost = (k) => (wallTier(k) >= MAX_WALL ? null : WALL_TIERS[wallTier(k)].cost);
export const sellValue = (k) => (wallTier(k) === 0 ? 0 : wallRefund(wallTier(k)));

export function upgradeWall(k) {
  const cost = wallCost(k);
  if (cost === null || state.coins < cost) return false;
  state.coins -= cost;
  state.walls.set(k, wallTier(k) + 1);
  save(); emit();
  return true;
}

export function sellWall(k) {
  const value = sellValue(k);
  if (!value) return 0;
  state.coins += value;
  state.walls.delete(k);
  save(); emit();
  return value;
}

/**
 * Raise every block the purse can reach, cheapest first.
 *
 * Reports why nothing happened as well as what did, because "no blocks were
 * raised" has three quite different causes and the caller cannot tell them
 * apart from a count of zero. It used to return only the count, and the UI
 * guessed — telling a player with 536 coins and no wall at all that they could
 * not afford one.
 *
 *   blocks    how many wall cells exist; zero means there is no wall yet
 *   cheapest  the cheapest upgrade available, or null when all are at the top
 */
export function upgradeAllAffordable() {
  const keys = wallKeys();
  let count = 0, spent = 0;
  for (const k of [...keys].sort((a, b) => wallTier(a) - wallTier(b))) {
    const cost = wallCost(k);
    if (cost === null || state.coins < cost) continue;
    state.coins -= cost;
    state.walls.set(k, wallTier(k) + 1);
    spent += cost; count += 1;
  }
  if (count) { save(); emit(); }

  const open = keys.map(wallCost).filter((c) => c !== null);
  return {
    count,
    spent,
    blocks: keys.length,
    cheapest: open.length ? Math.min(...open) : null,
  };
}

export function wallSummary() {
  const keys = wallKeys();
  if (!keys.length) return { total: 0, bare: 0, min: 0, name: 'None' };
  let min = MAX_WALL, bare = 0;
  for (const k of keys) {
    const t = wallTier(k);
    if (t < min) min = t;
    if (t === 0) bare += 1;
  }
  return { total: keys.length, bare, min, name: min === 0 ? 'None' : WALL_TIERS[min - 1].name };
}

export function wallDefence() {
  const keys = wallKeys();
  if (!keys.length) return 0;
  let sum = 0;
  for (const k of keys) { const t = wallTier(k); if (t) sum += WALL_TIERS[t - 1].defence; }
  return (sum / keys.length) * 6;
}

// ------------------------------------------------------------------- pets --

export const petCapacity = () => Math.max(1, Math.floor(Math.sqrt(plotKeys().length)));
export const petList = () => state.pets || [];
export const petCount = () => petList().length;
export const petCountOf = (id) => petList().filter((p) => p === id).length;
export const petBonus = () => petList().reduce((b, id) => b + (PETS[id]?.bonus || 0), 0);
export const petDefence = () => petList().reduce((d, id) => d + (PETS[id]?.defence || 0), 0);
export const totalDefence = () => Math.round(wallDefence() + petDefence());

export function adoptPet(id) {
  const p = PETS[id];
  if (!p || state.coins < p.cost || petCount() >= petCapacity()) return false;
  state.coins -= p.cost;
  state.pets = [...petList(), id];
  save(); emit();
  return true;
}

export function releasePet(i) {
  const list = [...petList()];
  if (i < 0 || i >= list.length) return false;
  const [id] = list.splice(i, 1);
  state.pets = list;
  state.coins += Math.floor((PETS[id]?.cost || 0) * 0.5);
  save(); emit();
  return true;
}

// ------------------------------------------------------------------ raids --

export const threatLevel = () => Math.floor(totalDefence() / 12)
  + Math.max(0, radius() - 1) * 2
  + Math.floor(state.letters.size / 40);

export const hunterPower = (id) => HUNTERS[id].power + threatLevel() * 2;
export const hunterBounty = (id) => Math.round(HUNTERS[id].bounty * (1 + threatLevel() * 0.25));

export function rollRaid() {
  const ripe = [...state.plants.entries()].filter(([, p]) => p.stage >= 2 && p.id !== 'relic');
  if (!ripe.length) return null;
  if (Math.random() > Math.min(0.55, 0.18 + ripe.length * 0.05)) return null;

  const wealth = ripe.length + Math.floor(totalDefence() / 6);
  const pool = HUNTER_IDS.slice(0, Math.max(1, Math.min(HUNTER_IDS.length, 1 + Math.floor(wealth / 3))));
  const id = pool[Math.floor(Math.random() * pool.length)];
  const roll = totalDefence() + Math.random() * 8 - 2;

  if (roll >= hunterPower(id)) {
    const bounty = hunterBounty(id);
    state.coins += bounty;
    state.perched = id;
    state.raid = { id, repelled: true, bounty, target: null };
  } else {
    const [k, p] = ripe[Math.floor(Math.random() * ripe.length)];
    state.plants.set(k, { id: p.id, stage: Math.max(1, p.stage - 1), prog: 0 });
    state.perched = null;
    state.raid = { id, repelled: false, bounty: 0, target: SPECIES[p.id].en };
  }
  return state.raid;
}

export function takeRaidReport() {
  const r = state.raid;
  state.raid = null;
  if (r) save();
  return r;
}

export function clearPerched() { state.perched = null; save(); emit(); }

export function defenceRating() {
  const worst = Math.max(...HUNTER_IDS.map(hunterPower));
  const ratio = worst ? totalDefence() / worst : 0;
  if (ratio >= 1.05) return 'Fortress';
  if (ratio >= 0.85) return 'Strong';
  if (ratio >= 0.6) return 'Fair';
  if (ratio >= 0.3) return 'Weak';
  return 'Open';
}
