// Per-client branding: logo, names, favicon, page title — and the whole colour theme,
// generated from the client's brand colours.
//
// There is ONE login page for every company, in the neutral product look below. A
// user's company is only known after sign-in: POST /login returns its `branding`
// (the app cross-fades into it), and GET /me returns it on every later visit — see
// api/routers/tenant.py. While signed in, the branding is cached in localStorage and
// painted by bootBranding() BEFORE React renders, so a reload never flashes the
// neutral or another company's look first.
//
// How the theme follows the brand: tailwind.config.js points the blue / sky / indigo /
// cyan / slate palettes at CSS variables (--tw-blue-500 …), and the app's tokens
// (--primary, --card, --border …) are variables too. A client with theme "derived"
// gets its accents from its colours and cool charcoal surfaces; theme "default" keeps the
// values in index.css untouched, so the original look is byte-for-byte unchanged.

const STORAGE_KEY = 'branding';
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];

// Lightness ladder for a brand scale (Tailwind-like: 500 is the brand itself).
const BRAND_L = { 50: 97, 100: 93, 200: 86, 300: 76, 400: 65, 600: 46, 700: 38, 800: 31, 900: 25, 950: 15 };
// Neutral ladder (slate-like): a cool grey, see NEUTRAL_HUE.
const NEUTRAL_L = { 50: 98, 100: 96, 200: 91, 300: 84, 400: 65, 500: 47, 600: 35, 700: 27, 800: 17, 900: 11, 950: 6 };

// The login page, and anything shown before a company is known: no client's logo or
// name, the product's own colours.
export const NEUTRAL_BRANDING = {
  slug: null,
  name: 'Outbound Dialer',
  legal_name: 'Outbound Dialer',
  product_name: 'Outbound Dialer',
  page_title: 'Outbound Dialer',
  logo_url: '/dialer-mark.svg',
  favicon_url: '/dialer-mark.svg',
  theme: 'default',
  colors: {},
};

// ── colour maths ─────────────────────────────────────────────────────
export function hexToHsl(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

const hsl = ({ h, s, l }) => `${h} ${s}% ${l}%`;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function brandScale(base) {
  return Object.fromEntries(SHADES.map((shade) => [
    shade,
    shade === 500
      ? { h: base.h, s: base.s, l: clamp(base.l, 45, 62) }
      : { h: base.h, s: clamp(base.s - (shade > 500 ? 4 : 0), 40, 100), l: BRAND_L[shade] },
  ]));
}

function neutralScale(hue, sat) {
  return Object.fromEntries(SHADES.map((shade) => [shade, { h: hue, s: sat, l: NEUTRAL_L[shade] }]));
}

// White or near-black text on a colour, whichever reads better (WCAG luminance).
function foregroundOn({ h, s, l }) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const c = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * f(0) + 0.7152 * f(8) + 0.0722 * f(4);
  return lum > 0.4 ? `${h} 30% 8%` : '0 0% 100%';
}

// Surfaces are a cool, almost-grey charcoal whatever the brand: the brand colour is an
// accent (buttons, active items, highlights), not a wash over every panel. Tinting all
// surfaces with a warm brand turns them brown and tires the eye on a screen agents
// watch all day. A cool brand (blue, teal, violet) may lend its own hue to the grey.
const NEUTRAL_HUE = 222;
const isCool = (h) => h >= 160 && h <= 280;

// A fully saturated brand (#FF7300 is 100% / 50%) glares on a dark background; ease it.
const soften = (c) => ({ h: c.h, s: Math.min(c.s, 88), l: clamp(c.l, 52, 60) });

// Every CSS variable a "derived" theme sets. Explicit colours in branding.colors win.
export function themeVariables(branding) {
  const c = branding?.colors || {};
  const raw = hexToHsl(c.primary);
  if (!raw) return {};
  const primary = soften(raw);
  const accent = soften(hexToHsl(c.accent) || { ...raw, h: (raw.h + 30) % 360 });
  const nh = isCool(primary.h) ? primary.h : NEUTRAL_HUE;      // hue of the greys
  const ns = isCool(primary.h) ? 16 : 12;                        // …and their saturation
  const pick = (key, fallback) => (hexToHsl(c[key]) ? hsl(hexToHsl(c[key])) : fallback);

  const vars = {
    '--primary': hsl(primary),
    '--primary-foreground': foregroundOn(primary),
    '--accent': hsl(primary),
    '--accent-foreground': foregroundOn(primary),
    '--ring': hsl(primary),
    '--brand-from': hsl(primary),
    // Half-way the SHORT way round the colour wheel: orange 27° → pink 344° passes
    // through red, not through cyan as a plain average would.
    '--brand-via': hsl({
      h: Math.round((primary.h + (((accent.h - primary.h + 540) % 360) - 180) / 2 + 360) % 360),
      s: primary.s,
      l: primary.l,
    }),
    '--brand-to': hsl(accent),
    '--brand-deep': hsl({ h: primary.h, s: primary.s, l: clamp(primary.l - 10, 30, 50) }),
    '--brand-surface-1': `${nh} ${ns + 4}% 19%`,
    '--brand-surface-2': `${nh} ${ns + 6}% 12%`,
    '--chart-1': hsl(primary),
    // The brand's complement: a cool second series reads apart from a warm first one.
    '--chart-2': hsl({ h: (primary.h + 180) % 360, s: 65, l: 55 }),
    '--background': pick('background', `${nh} ${ns + 6}% 6%`),
    '--card': pick('card', `${nh} ${ns + 2}% 10%`),
    '--popover': pick('card', `${nh} ${ns + 2}% 10%`),
    '--secondary': pick('secondary', `${nh} ${ns}% 15%`),
    '--muted': pick('secondary', `${nh} ${ns}% 15%`),
    '--border': pick('border', `${nh} ${ns - 2}% 21%`),
    '--input': pick('border', `${nh} ${ns - 2}% 21%`),
    '--muted-foreground': pick('muted_foreground', `${nh} 10% 66%`),
    '--grid-foreground': `${nh} 14% 88%`,
    // Page-scoped light mode: a darker brand for contrast on white, a deep charcoal
    // header bar and the brand itself as the live strip.
    '--scope-light-primary': hsl({ h: primary.h, s: primary.s, l: clamp(primary.l - 12, 34, 44) }),
    '--scope-head-light': `${nh} ${ns + 6}% 14%`,
    '--scope-accent-light': hsl(primary),
    '--scope-accent-dark': hsl(primary),
  };
  // blue / indigo carry the brand (primary buttons, active nav, links). sky / cyan
  // keep Tailwind's own cool tones for secondary highlights, and slate is the grey.
  const palettes = [
    ['blue', brandScale(primary)],
    ['indigo', brandScale(primary)],
    ['slate', neutralScale(nh, ns)],
  ];
  if (isCool(primary.h)) palettes.push(['sky', brandScale(accent)], ['cyan', brandScale(accent)]);
  for (const [name, scale] of palettes) {
    for (const shade of SHADES) vars[`--tw-${name}-${shade}`] = hsl(scale[shade]);
  }
  return vars;
}

// ── applying ─────────────────────────────────────────────────────────
let current = NEUTRAL_BRANDING;
let appliedVars = [];
const listeners = new Set();

const API_BASE = import.meta.env.VITE_BASE_URL;

/** Logos and favicons served by the API (/tenant-assets/…) need the API origin. */
export function assetUrl(path) {
  if (!path) return path;
  return /^\/tenant-assets\//.test(path) ? `${API_BASE}${path}` : path;
}

function setFavicon(href) {
  if (!href) return;
  let link = document.querySelector('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.href = assetUrl(href);
}

function paint(branding) {
  const root = document.documentElement;
  for (const name of appliedVars) root.style.removeProperty(name);
  const vars = branding.theme === 'derived' ? themeVariables(branding) : {};
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
  appliedVars = Object.keys(vars);

  root.dataset.brand = branding.slug || 'default';
  document.title = branding.page_title || `${branding.name} ${branding.product_name}`;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (themeColor) themeColor.setAttribute('content', vars['--background'] ? `hsl(${vars['--background']})` : '#070B1A');
  setFavicon(branding.favicon_url);
}

const sameBranding = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Apply a branding object from the API. A real change (another client) cross-fades
 * through the View Transitions API where the browser has it; an identical one is a
 * no-op, so polling /me never flickers.
 */
export function applyBranding(next, { animate = true } = {}) {
  const branding = { ...NEUTRAL_BRANDING, ...(next || {}), colors: { ...(next?.colors || {}) } };
  if (sameBranding(branding, current)) return;
  current = branding;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(branding));
  } catch {
    /* private mode — the theme still applies, just not cached */
  }
  const run = () => {
    paint(branding);
    listeners.forEach((fn) => fn());
  };
  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (animate && !reduceMotion && document.startViewTransition) document.startViewTransition(run);
  else run();
}

/**
 * Called once from main.jsx before render, with no fade: the signed-in user's cached
 * company look, or the neutral one when nobody is signed in on this browser.
 */
export function bootBranding() {
  let cached = null;
  let signedIn = false;
  try {
    signedIn = !!localStorage.getItem('user');
    cached = signedIn ? JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') : null;
  } catch {
    cached = null;
  }
  current = { ...NEUTRAL_BRANDING, ...(cached || {}) };
  paint(current);
}

export const getBranding = () => current;
export function subscribeBranding(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

