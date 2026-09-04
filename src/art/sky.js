/**
 * Sky themes.
 *
 * The whole sky is CSS — a gradient, a sun, and a few drifting clouds — so a
 * theme is just a set of colours plus a name the stylesheet can hang extras
 * off (stars, rain, fog). Nothing here draws; `skyStyle` produces the custom
 * properties and `applySky` stamps them, with the id, onto the app shell so
 * every screen picks the same weather up at once.
 *
 * Each theme carries:
 *   sky[4]  the garden's gradient, top to horizon
 *   floor   the bottom of the app shell, seen behind the puzzle
 *   sun[3]  core, middle and rim of the disc — the moon reuses these
 *   glow    the halo around it
 *   cloud   cloud fill, dimmed and tinted to match the hour
 *   haze    a wash laid over the land, so the ground is lit by the same sky
 *   level   the garden level that reveals it
 *
 * Skies are earned, not bought. They used to cost coins — 7,750 for the set,
 * about 126 rounds, which was TWICE what finishing the 247 costs. Charging
 * for wallpaper in the currency the game’s actual collection runs on put the
 * best-looking thing in the game in competition with the point of it, and
 * left Starry Night 57 rounds away where most players would never see it.
 */
export const SKIES = {
  day: {
    en: 'Clear Day', ico: '☀️', level: 1,
    note: 'where every garden starts',
    sky: ['#9FD9F2', '#C6E9F3', '#DCF0DE', '#CFE7C6'], floor: '#F3E2BE',
    sun: ['#FFF8DC', '#FFE08A', '#FFCF57'], glow: 'rgba(255,222,130,.45)',
    cloud: 'rgba(255,255,255,.95)', cloudB: 'rgba(206,228,240,.95)',
    haze: 'rgba(0,0,0,0)',
    horizon: 'rgba(255,242,196,.5)', hills: ['#A9CFA4', '#8FBF8E'], bloom: 150, ground: '#BFDCAF',
  },
  mist: {
    en: 'Morning Mist', ico: '\u{1F32B}️', level: 1,
    note: 'fog off the fields',
    sky: ['#A9C2CC', '#CBDCDC', '#E2EAE0', '#CFDCC8'], floor: '#E5E1CE',
    sun: ['#FFFDF2', '#F4F0DE', '#E2DEC6'], glow: 'rgba(240,240,225,.4)',
    cloud: 'rgba(255,255,255,.97)', cloudB: 'rgba(222,232,232,.97)',
    haze: 'rgba(222,234,234,.3)',
    horizon: 'rgba(248,250,246,.72)', hills: ['#B6C9BE', '#9FB7A8'], bloom: 110, ground: '#C8D6C2',
  },
  dawn: {
    en: 'Sunrise', ico: '\u{1F305}', level: 2,
    note: 'first light, low and warm',
    sky: ['#3C5A8C', '#8E7FA8', '#E39A87', '#FBD9AE'], floor: '#FBE7C6',
    sun: ['#FFF3D0', '#FFC98A', '#FF9E5E'], glow: 'rgba(255,170,110,.5)',
    cloud: 'rgba(255,226,216,.9)', cloudB: 'rgba(226,150,152,.9)',
    haze: 'rgba(255,178,128,.16)',
    horizon: 'rgba(255,196,140,.62)', hills: ['#6E6C97', '#4C4A72'], bloom: 200, ground: '#8A7A86',
  },
  dusk: {
    en: 'Sunset', ico: '\u{1F307}', level: 3,
    note: 'the long orange hour',
    sky: ['#2E2352', '#7A3A70', '#D9645C', '#F6A85C'], floor: '#F7C98A',
    sun: ['#FFE9B0', '#FF9E52', '#F2683C'], glow: 'rgba(255,130,70,.55)',
    cloud: 'rgba(255,200,172,.8)', cloudB: 'rgba(198,92,96,.85)',
    haze: 'rgba(206,104,64,.22)',
    horizon: 'rgba(255,150,84,.66)', hills: ['#5B3468', '#3B2150'], bloom: 220, ground: '#6E4658',
  },
  monsoon: {
    en: 'Monsoon', ico: '\u{1F327}️', level: 4,
    note: 'grey sky, steady rain',
    sky: ['#5E6E7C', '#7E8C95', '#98A5A2', '#A6B2A2'], floor: '#B8BFA6',
    sun: ['#DCE1E4', '#C6CDD2', '#AEB6BC'], glow: 'rgba(200,210,215,.28)',
    cloud: 'rgba(206,214,219,.94)', cloudB: 'rgba(126,140,150,.94)',
    haze: 'rgba(84,106,118,.26)',
    horizon: 'rgba(196,208,206,.4)', hills: ['#5C7076', '#43585F'], bloom: 100, ground: '#75857A',
  },
  night: {
    en: 'Starry Night', ico: '\u{1F319}', level: 5,
    note: 'stars, a moon, and fireflies',
    sky: ['#0C1430', '#152147', '#24345E', '#3A4C72'], floor: '#46587E',
    sun: ['#FDFBEF', '#EDEAD6', '#CFCCB8'], glow: 'rgba(206,218,255,.2)',
    cloud: 'rgba(120,136,176,.5)', cloudB: 'rgba(60,74,112,.6)',
    haze: 'rgba(18,34,80,.44)',
    horizon: 'rgba(96,124,190,.34)', hills: ['#1B2749', '#101833'], bloom: 115, ground: '#16203E',
  },
};

export const SKY_IDS = Object.keys(SKIES);
export const DEFAULT_SKY = 'day';

/** The custom properties one theme sets, as an inline style string. */
export function skyStyle(id) {
  const s = SKIES[id] || SKIES[DEFAULT_SKY];
  return [
    `--sky-1:${s.sky[0]}`, `--sky-2:${s.sky[1]}`,
    `--sky-3:${s.sky[2]}`, `--sky-4:${s.sky[3]}`,
    `--sky-floor:${s.floor}`,
    `--sun-core:${s.sun[0]}`, `--sun-mid:${s.sun[1]}`, `--sun-edge:${s.sun[2]}`,
    `--sun-glow:${s.glow}`,
    `--cloud-a:${s.cloud}`, `--cloud-b:${s.cloudB}`,
    `--haze:${s.haze}`, `--horizon:${s.horizon}`, `--sun-bloom:${s.bloom}`,
    `--hill-far:${s.hills[0]}`, `--hill-near:${s.hills[1]}`, `--ground:${s.ground}`,
  ].join(';');
}

/**
 * Stamp a theme onto the app shell. Everything else — garden, puzzle backdrop,
 * chart, reward card — reads the same properties, so one write retints them
 * all and no screen has to know a theme exists.
 */
export function applySky(id) {
  const app = document.getElementById('app');
  if (!app) return;
  const use = SKIES[id] ? id : DEFAULT_SKY;
  app.dataset.sky = use;
  app.setAttribute('style', skyStyle(use));
}

/**
 * Everything inside a sky layer, in paint order.
 *
 * Both screens call this, so a theme is described once. Depth is what sells a
 * sky: a flat gradient with a disc on it reads as a wallpaper, while a glow at
 * the horizon, two ridgelines at different distances and shaded clouds read as
 * somewhere with air in it. All of it is CSS shapes — no images, no requests.
 */
export function skyLayer(id) {
  const use = SKIES[id] ? id : DEFAULT_SKY;
  // Gradient ids have to be unique per layer. Both screens can be mounted at
  // once during a cross-fade, and `url(#id)` resolves document-wide to the
  // FIRST match — which may belong to the screen being removed, leaving the
  // survivor's clouds unpainted.
  const k = `sk${++layerSeq}`;
  return `
    <span class="skyglow"></span>
    <span class="sun"></span>
    ${ridge(k, 'far')}
    ${ridge(k, 'near')}
    ${treeline(k)}
    <span class="ground"></span>
    ${cloud(k, 'c1')}${cloud(k, 'c2')}${cloud(k, 'c3')}
    <span class="rays"></span>
    <span class="vignette"></span>
    ${skyExtras(use)}`;
}

let layerSeq = 0;

/**
 * A cumulus, drawn rather than assembled from rounded boxes.
 *
 * The pill-and-two-bumps version could only ever read as a shape. A real
 * silhouette with a lit crown and a shaded base is what makes a cloud look
 * like it has a top and a bottom — which is the whole of the 2.5D trick.
 */
function cloud(k, cls) {
  const id = `${k}-${cls}`;
  return `
    <svg class="cloud ${cls}" viewBox="0 0 120 52" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="var(--cloud-a)"/>
          <stop offset="0.55" stop-color="var(--cloud-a)"/>
          <stop offset="1" stop-color="var(--cloud-b)"/>
        </linearGradient>
      </defs>
      <path fill="url(#${id})" d="M14 46 Q3 46 3 37 Q3 28 13 26.5
        Q14 13 28 12 Q34 2 47 4.5 Q57 -2.5 68 5.5 Q81 2.5 87 14
        Q101 13 105 24.5 Q117 27 117 37 Q117 46 105 46 Z"/>
      <path fill="var(--cloud-a)" opacity=".55" d="M20 20 Q28 9 42 11 Q34 15 30 24 Z"/>
    </svg>`;
}

/** One ridgeline. Rolling, uneven — a bezier horizon rather than a half-oval. */
function ridge(k, which) {
  const far = which === 'far';
  const d = far
    ? 'M0 46 C 60 12, 120 34, 190 16 C 260 0, 330 30, 400 22 L400 60 L0 60 Z'
    : 'M0 52 C 70 30, 130 46, 200 34 C 280 20, 340 44, 400 36 L400 60 L0 60 Z';
  return `
    <svg class="hills hills-${which}" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true">
      <path fill="var(--hill-${far ? 'far' : 'near'})" d="${d}"/>
    </svg>`;
}

/**
 * The nearest edge: a treeline. Conifers at this distance are triangles, and
 * that is exactly how a painted background does them — the silhouette carries
 * it, not the detail.
 */
function treeline(k) {
  const trees = [];
  // Fixed, uneven spacing. Evenly spaced trees read as a fence.
  const spots = [4, 13, 19, 28, 36, 41, 52, 58, 67, 74, 79, 88, 95];
  spots.forEach((x, i) => {
    const h = 7 + ((i * 5) % 6);
    const w = 2.6 + ((i * 3) % 3) * 0.5;
    trees.push(`<path d="M${x} 30 L${(x - w).toFixed(1)} 30 L${x} ${(30 - h).toFixed(1)}
                         L${(x + w).toFixed(1)} 30 Z"/>`);
  });
  return `
    <svg class="hills treeline" viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <g fill="var(--hill-near)">${trees.join('')}</g>
      <rect x="0" y="27" width="100" height="3" fill="var(--hill-near)"/>
    </svg>`;
}

/** The weather particular to one theme. Empty for a plain one. */
export function skyExtras(id) {
  if (id === 'night') {
    // Fixed offsets rather than random ones: fireflies that jump to new spots
    // on every redraw read as flicker, not as insects.
    const flies = [10, 32, 58, 76, 88]
      .map((x, i) => `<span class="firefly" style="left:${x}%;top:${52 + (i % 3) * 11}%;animation-delay:${-i * 2.6}s"></span>`)
      .join('');
    // Two star fields at different sizes twinkle out of step, which is what
    // stops a starry sky looking like a single flashing texture.
    return `<span class="stars stars-far"></span><span class="stars stars-near"></span>
            <span class="shooter"></span>${flies}`;
  }
  if (id === 'monsoon') {
    // Two rain sheets at different angles and speeds give parallax, so the
    // rain has depth rather than sliding as one flat pane.
    return '<span class="rain rain-far"></span><span class="rain rain-near"></span>'
         + '<span class="flash"></span>';
  }
  if (id === 'mist') {
    return '<span class="fog fog-high"></span><span class="fog fog-low"></span>';
  }
  if (id === 'day' || id === 'dawn') {
    // A few birds, far enough away to be three strokes each.
    return [0, 1, 2].map((i) =>
      `<span class="bird b${i + 1}"></span>`).join('');
  }
  return '';
}
