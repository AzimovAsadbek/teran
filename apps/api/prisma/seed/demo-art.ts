/**
 * Original, code-drawn demonstration artwork for the demonstration catalogue (ADR-014).
 *
 * TERAN has no photography of these products (most of them exist only as demonstration data),
 * so every demo product gets two illustrations in the storefront's "abr" world
 * (apps/web/DESIGN.md): flat, layered cut-outs on a transparent ground, like coloured paper pasted
 * piece over piece — depth from overlap, never from gradients or blurred shadows — in the same
 * dyes as the site (choy green, saffron, anor, indigo, jade, clay, silk). The storefront stands
 * them on the pale dye of their family.
 *
 * 1. A portrait of the product: a tin, tea-bag box, gift box, pressed cake, matcha tin, bottle,
 *    can, juice carton, discovery box, gaiwan, glass teapot or a set of piyola bowls. The TERAN
 *    emblem goes only on the tea packs and gift boxes of the earlier demonstration range; the
 *    matcha tin, bottles, cans and cartons of the wider range carry a plain label, so no drawing
 *    passes for a drink TERAN makes (ADR-050).
 * 2. A study: the loose leaves (or flowers, fruit, powder) in a dish seen from above, the drink
 *    poured into a glass, or tea served in a piyola for teaware.
 *
 * Rendering is deterministic (seeded) so re-running the seed produces identical images. Replace
 * them with real photography through the admin area at any time.
 */
import sharp from 'sharp';

export type ArtStyle =
  | 'black'
  | 'green'
  | 'white'
  | 'oolong'
  | 'puerh'
  | 'herbal'
  | 'fruit'
  | 'gift'
  | 'matcha'
  | 'iced'
  | 'peach'
  | 'water'
  | 'sparkling'
  | 'pomegranate'
  | 'apple'
  | 'porcelain'
  | 'glass';
export type PackShape =
  | 'tin'
  | 'box'
  | 'gift'
  | 'cake'
  | 'matcha'
  | 'bottle'
  | 'can'
  | 'carton'
  | 'sampler'
  | 'gaiwan'
  | 'teapot'
  | 'piyola';
export type ArtAccent =
  'jasmine' | 'mint' | 'chamomile' | 'hibiscus' | 'apple' | 'rosehip' | 'lemon' | 'bubbles';

/** OKLCH (the storefront's colour space) to an sRGB hex string, so the art matches the CSS dyes. */
function oklch(l: number, c: number, h: number): string {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l1 = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m1 = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s1 = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l1 - 3.3077115913 * m1 + 0.2309699292 * s1,
    -1.2684380046 * l1 + 2.6097574011 * m1 - 0.3413193965 * s1,
    -0.0041960863 * l1 - 0.7034186147 * m1 + 1.707614701 * s1,
  ];
  return `#${linear
    .map((value) => {
      const v = Math.min(1, Math.max(0, value));
      const srgb = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
      return Math.round(srgb * 255)
        .toString(16)
        .padStart(2, '0');
    })
    .join('')}`;
}

/** The storefront dyes (apps/web/src/styles/globals.css). */
const DYE = {
  choy950: oklch(0.205, 0.045, 152),
  choy900: oklch(0.265, 0.064, 150),
  choy800: oklch(0.33, 0.084, 147),
  choy700: oklch(0.41, 0.11, 142),
  choy600: oklch(0.49, 0.124, 140),
  choy400: oklch(0.68, 0.12, 136),
  saffron800: oklch(0.47, 0.1, 68),
  saffron700: oklch(0.56, 0.12, 72),
  saffron600: oklch(0.67, 0.14, 76),
  saffron500: oklch(0.77, 0.145, 80),
  saffron300: oklch(0.87, 0.1, 86),
  saffron100: oklch(0.955, 0.04, 90),
  anor900: oklch(0.3, 0.1, 20),
  anor800: oklch(0.37, 0.125, 22),
  anor700: oklch(0.45, 0.16, 24),
  anor500: oklch(0.58, 0.19, 27),
  anor300: oklch(0.79, 0.09, 22),
  nil950: oklch(0.21, 0.055, 270),
  nil800: oklch(0.32, 0.09, 266),
  nil600: oklch(0.46, 0.12, 262),
  nil300: oklch(0.81, 0.06, 255),
  nil200: oklch(0.89, 0.035, 255),
  nil100: oklch(0.95, 0.017, 255),
  jade800: oklch(0.42, 0.11, 138),
  jade700: oklch(0.52, 0.13, 138),
  jade600: oklch(0.62, 0.15, 135),
  jade500: oklch(0.72, 0.16, 132),
  jade300: oklch(0.86, 0.11, 128),
  clay800: oklch(0.4, 0.075, 48),
  clay600: oklch(0.55, 0.1, 48),
  clay200: oklch(0.89, 0.035, 55),
  silk50: oklch(0.985, 0.004, 120),
  silk100: oklch(0.966, 0.007, 120),
  silk200: oklch(0.935, 0.01, 122),
  silk300: oklch(0.875, 0.013, 124),
  silk400: oklch(0.78, 0.015, 126),
  ink900: oklch(0.21, 0.03, 150),
  ink700: oklch(0.36, 0.026, 150),
};

const GOLD = { body: DYE.saffron600, light: DYE.saffron500, dark: DYE.saffron800 };

interface Palette {
  /** The pack's printed colour, and the same colour a step lighter and darker. */
  body: string;
  light: string;
  dark: string;
  /** The band of colour along the bottom of a label. */
  band: string;
  /** A drink's colour in its bottle or glass. */
  liquid: string;
  /** Leaves (or petals, fruit, powder) for the study, darkest first. */
  leaves: string[];
}

const PALETTES: Record<ArtStyle, Palette> = {
  black: {
    body: DYE.anor800,
    light: DYE.anor700,
    dark: DYE.anor900,
    band: DYE.saffron600,
    liquid: DYE.anor700,
    leaves: ['#2a1a12', '#3a2418', '#4a2e1c', '#1e140e', '#55361f'],
  },
  green: {
    body: DYE.choy700,
    light: DYE.choy600,
    dark: DYE.choy900,
    band: DYE.saffron600,
    liquid: DYE.saffron300,
    leaves: [DYE.choy800, DYE.choy700, '#5e7a30', '#6b8a38', '#7a9443'],
  },
  white: {
    body: DYE.silk300,
    light: DYE.silk100,
    dark: DYE.silk400,
    band: DYE.saffron600,
    liquid: DYE.saffron100,
    leaves: ['#8f8e74', '#a9a68c', '#b8b59c', '#c7c3aa', '#d8d4bd'],
  },
  oolong: {
    body: DYE.saffron700,
    light: DYE.saffron600,
    dark: DYE.saffron800,
    band: DYE.choy800,
    liquid: DYE.saffron500,
    leaves: ['#22361f', '#2a3f25', '#2f4a2a', '#3b5a30', '#46663a'],
  },
  puerh: {
    body: DYE.clay800,
    light: DYE.clay600,
    dark: '#2e1d14',
    band: DYE.saffron600,
    liquid: DYE.clay800,
    leaves: ['#2c160d', '#3a1e12', '#3f2214', '#4a2818', '#5a321e'],
  },
  herbal: {
    body: DYE.jade700,
    light: DYE.jade600,
    dark: DYE.jade800,
    band: DYE.saffron500,
    liquid: DYE.saffron300,
    leaves: ['#55703a', '#5f7d3c', '#6f8f47', '#7f9d55', '#8aa864'],
  },
  fruit: {
    body: DYE.anor700,
    light: DYE.anor500,
    dark: DYE.anor800,
    band: DYE.saffron500,
    liquid: DYE.anor700,
    leaves: ['#5e1620', '#7a1f2b', '#9c2a3a', '#b8434f', '#c46a3a'],
  },
  gift: {
    body: DYE.nil800,
    light: DYE.nil600,
    dark: DYE.nil950,
    band: DYE.saffron600,
    liquid: DYE.saffron300,
    leaves: [DYE.choy800, '#3a2418', '#a9a68c', DYE.saffron700, '#4f6b2a'],
  },
  matcha: {
    body: DYE.jade500,
    light: DYE.jade300,
    dark: DYE.jade700,
    band: DYE.choy800,
    liquid: DYE.jade500,
    leaves: [DYE.jade700, DYE.jade600, DYE.jade500, DYE.jade500, DYE.jade300],
  },
  iced: {
    body: DYE.choy800,
    light: DYE.choy700,
    dark: DYE.choy950,
    band: DYE.jade500,
    liquid: DYE.saffron300,
    leaves: [DYE.choy700],
  },
  peach: {
    body: DYE.anor700,
    light: DYE.anor500,
    dark: DYE.anor900,
    band: DYE.saffron500,
    liquid: DYE.saffron500,
    leaves: [DYE.anor300],
  },
  water: {
    body: DYE.nil800,
    light: DYE.nil600,
    dark: DYE.nil950,
    band: DYE.nil300,
    liquid: DYE.nil100,
    leaves: [DYE.nil200],
  },
  sparkling: {
    body: DYE.nil600,
    light: DYE.nil300,
    dark: DYE.nil800,
    band: DYE.saffron500,
    liquid: DYE.nil100,
    leaves: [DYE.nil200],
  },
  pomegranate: {
    body: DYE.anor800,
    light: DYE.anor700,
    dark: DYE.anor900,
    band: DYE.saffron500,
    liquid: DYE.anor700,
    leaves: [DYE.anor500],
  },
  apple: {
    body: DYE.saffron500,
    light: DYE.saffron300,
    dark: DYE.saffron700,
    band: DYE.jade700,
    liquid: DYE.saffron300,
    leaves: [DYE.jade600],
  },
  porcelain: {
    body: DYE.silk50,
    light: '#ffffff',
    dark: DYE.silk300,
    band: DYE.nil600,
    liquid: DYE.saffron300,
    leaves: [DYE.choy700],
  },
  glass: {
    body: DYE.silk100,
    light: '#ffffff',
    dark: DYE.silk400,
    band: DYE.saffron600,
    liquid: DYE.saffron500,
    leaves: [DYE.choy700],
  },
};

/** Small deterministic PRNG (mulberry32) so artwork is reproducible. */
function createRandom(seedText: string): () => number {
  let seed = 0;
  for (const char of seedText) seed = (Math.imul(31, seed) + char.charCodeAt(0)) | 0;
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Two short printed lines under an emblem: the pack's name and weight, as bars. */
function printedLines(x: number, y: number, width: number, ink: string): string {
  return `
    <rect x="${x - width / 2}" y="${y}" width="${width}" height="10" fill="${ink}"/>
    <rect x="${x - width * 0.32}" y="${y + 24}" width="${width * 0.64}" height="7" fill="${GOLD.body}"/>`;
}

/** A label panel of undyed paper with a hairline gold frame. */
function labelPanel(x: number, y: number, w: number, h: number): string {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${DYE.silk50}"/>
    <rect x="${x + 14}" y="${y + 14}" width="${w - 28}" height="${h - 28}" fill="none" stroke="${GOLD.body}" stroke-width="3"/>`;
}

/** A loose-leaf tin: lid, body, a light and a dark strip of paper for the curve, a label. */
function tinSvg(p: Palette): string {
  return `
    <path d="M400 410 H800 V1082 Q800 1110 772 1110 H428 Q400 1110 400 1082 Z" fill="${p.body}"/>
    <rect x="430" y="420" width="38" height="664" fill="${p.light}"/>
    <rect x="752" y="420" width="48" height="664" fill="${p.dark}"/>
    <rect x="400" y="1046" width="400" height="36" fill="${p.band}"/>
    <rect x="386" y="318" width="428" height="104" rx="6" fill="${GOLD.body}"/>
    <rect x="408" y="330" width="28" height="80" fill="${GOLD.light}"/>
    <rect x="766" y="318" width="48" height="104" fill="${GOLD.dark}"/>
    <rect x="386" y="410" width="428" height="12" fill="${GOLD.dark}"/>
    ${labelPanel(452, 528, 296, 404)}
    ${printedLines(600, 848, 150, p.dark)}`;
}

/** A tea-bag box in three faces: top lighter, side darker, front printed. */
function boxSvg(p: Palette): string {
  return `
    <path d="M370 452 L476 384 L870 384 L764 452 Z" fill="${p.light}"/>
    <path d="M764 452 L870 384 L870 1042 L764 1110 Z" fill="${p.dark}"/>
    <rect x="370" y="452" width="394" height="658" fill="${p.body}"/>
    <rect x="370" y="1052" width="394" height="34" fill="${p.band}"/>
    <path d="M764 1052 L870 984 L870 1018 L764 1086 Z" fill="${GOLD.dark}"/>
    ${labelPanel(414, 520, 306, 386)}
    ${printedLines(567, 826, 150, p.dark)}`;
}

/** A gift box with a gold ribbon, bow and a round label. */
function giftSvg(p: Palette): string {
  return `
    <path d="M220 650 L322 586 L1004 586 L902 650 Z" fill="${p.light}"/>
    <path d="M902 650 L1004 586 L1004 1046 L902 1110 Z" fill="${p.dark}"/>
    <rect x="220" y="650" width="682" height="460" fill="${p.body}"/>
    <rect x="612" y="650" width="66" height="460" fill="${GOLD.body}"/>
    <rect x="612" y="650" width="16" height="460" fill="${GOLD.light}"/>
    <path d="M662 586 L728 586 L678 650 L612 650 Z" fill="${GOLD.body}"/>
    <path d="M902 816 L1004 752 L1004 806 L902 870 Z" fill="${GOLD.dark}"/>
    <path d="M645 612 C 552 494, 452 548, 556 626 Z" fill="${GOLD.body}"/>
    <path d="M657 612 C 752 494, 852 548, 748 626 Z" fill="${GOLD.dark}"/>
    <circle cx="651" cy="612" r="24" fill="${GOLD.light}"/>
    <circle cx="420" cy="872" r="118" fill="${DYE.silk50}"/>
    <circle cx="420" cy="872" r="102" fill="none" stroke="${GOLD.body}" stroke-width="3"/>`;
}

/** A pressed tea cake in its paper wrapper, seen from above, with a printed band and label. */
function cakeSvg(p: Palette): string {
  const pleats = Array.from({ length: 30 }, (_, index) => {
    const angle = index * 12 + (index % 3) * 3.5;
    const depth = 26 + ((index * 7) % 5) * 7;
    return `<path d="M600 244 v${depth}" stroke="${DYE.silk300}" stroke-width="4" transform="rotate(${angle} 600 610)"/>`;
  }).join('');
  return `
    <circle cx="600" cy="610" r="366" fill="${DYE.silk100}"/>
    ${pleats}
    <circle cx="600" cy="610" r="312" fill="none" stroke="${GOLD.body}" stroke-width="5"/>
    <circle cx="600" cy="610" r="286" fill="none" stroke="${p.body}" stroke-width="36"/>
    <circle cx="600" cy="610" r="262" fill="none" stroke="${GOLD.body}" stroke-width="5"/>
    <circle cx="600" cy="610" r="228" fill="${DYE.silk50}"/>
    ${printedLines(600, 720, 140, p.dark)}`;
}

/** A short, wide matcha tin with a dark lid and a wraparound paper label. */
function matchaSvg(p: Palette): string {
  return `
    <path d="M410 700 H790 V1084 Q790 1110 764 1110 H436 Q410 1110 410 1084 Z" fill="${p.body}"/>
    <rect x="436" y="712" width="34" height="374" fill="${p.light}"/>
    <rect x="746" y="712" width="44" height="374" fill="${p.dark}"/>
    <rect x="398" y="612" width="404" height="96" rx="6" fill="${DYE.choy900}"/>
    <rect x="418" y="624" width="24" height="72" fill="${DYE.choy700}"/>
    <rect x="398" y="700" width="404" height="10" fill="${DYE.choy950}"/>
    <rect x="410" y="770" width="380" height="262" fill="${DYE.silk50}"/>
    <rect x="410" y="770" width="380" height="16" fill="${p.band}"/>
    <rect x="410" y="1016" width="380" height="16" fill="${p.band}"/>
    ${printedLines(600, 962, 130, p.dark)}`;
}

const BOTTLE_PATH =
  'M556 300 H644 V408 C644 462 734 482 734 562 V1068 Q734 1110 692 1110 H508 Q466 1110 466 1068 V562 C466 482 556 462 556 408 Z';

/** A glass bottle: the glass, the drink inside to its level, a cap and a paper label. */
function bottleSvg(p: Palette, style: ArtStyle): string {
  const clear = style === 'water' || style === 'sparkling';
  const bubbles = style === 'sparkling' ? bubbleField('bottle', 500, 700, 200, 360) : '';
  return `
    <clipPath id="drink"><rect x="400" y="${clear ? 452 : 486}" width="400" height="700"/></clipPath>
    <path d="${BOTTLE_PATH}" fill="${DYE.silk100}" fill-opacity="0.55"/>
    <path d="${BOTTLE_PATH}" fill="${p.liquid}" fill-opacity="${clear ? 0.7 : 0.94}" clip-path="url(#drink)"/>
    ${bubbles}
    <rect x="490" y="580" width="16" height="470" fill="#ffffff" fill-opacity="0.5"/>
    <rect x="548" y="250" width="104" height="64" rx="6" fill="${p.body}"/>
    <rect x="548" y="304" width="104" height="10" fill="${p.dark}"/>
    <rect x="562" y="258" width="18" height="44" fill="${p.light}"/>
    <rect x="466" y="642" width="268" height="250" fill="${DYE.silk50}"/>
    <rect x="466" y="642" width="268" height="18" fill="${p.body}"/>
    <rect x="466" y="874" width="268" height="18" fill="${p.band}"/>
    ${printedLines(600, 832, 120, p.dark)}`;
}

/** Small round bubbles inside a drink (sparkling water, a sparkling tea in a glass). */
function bubbleField(seed: string, x: number, y: number, w: number, h: number): string {
  const random = createRandom(`bubbles-${seed}`);
  return Array.from({ length: 26 }, () => {
    const r = 4 + random() * 9;
    return `<circle cx="${(x + random() * w).toFixed(1)}" cy="${(y + random() * h).toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="#ffffff" stroke-opacity="0.75" stroke-width="3"/>`;
  }).join('');
}

/** A slim can, printed all round, with a band and a round label for the emblem. */
function canSvg(p: Palette): string {
  return `
    <rect x="472" y="410" width="256" height="700" rx="18" fill="${p.body}"/>
    <rect x="494" y="430" width="26" height="660" fill="${p.light}"/>
    <rect x="690" y="430" width="38" height="660" fill="${p.dark}"/>
    <rect x="472" y="736" width="256" height="128" fill="${p.band}"/>
    <rect x="472" y="736" width="256" height="10" fill="${GOLD.dark}"/>
    <rect x="480" y="392" width="240" height="30" rx="10" fill="${DYE.silk400}"/>
    <rect x="480" y="1092" width="240" height="18" rx="6" fill="${DYE.silk400}"/>
    <circle cx="600" cy="586" r="96" fill="${DYE.silk50}"/>
    <rect x="540" y="790" width="120" height="10" fill="${p.dark}"/>
    <rect x="560" y="814" width="80" height="7" fill="${p.dark}"/>`;
}

/** A gable-top juice carton: front printed, side darker, roof and fin. */
function cartonSvg(p: Palette): string {
  return `
    <path d="M736 446 L812 400 L812 1064 L736 1110 Z" fill="${p.dark}"/>
    <path d="M736 446 L694 352 L770 306 L812 400 Z" fill="${p.dark}"/>
    <rect x="430" y="446" width="306" height="664" fill="${p.body}"/>
    <path d="M430 446 L472 352 L694 352 L736 446 Z" fill="${p.light}"/>
    <rect x="472" y="322" width="222" height="34" fill="${DYE.silk100}"/>
    <path d="M694 322 L770 276 L770 306 L694 352 Z" fill="${DYE.silk300}"/>
    ${labelPanel(462, 520, 242, 300)}
    <circle cx="520" cy="980" r="70" fill="${p.band}"/>
    <circle cx="610" cy="1004" r="62" fill="${DYE.saffron300}"/>
    <path d="M520 912 c8 -26 24 -38 44 -42" stroke="${DYE.ink700}" stroke-width="7" fill="none"/>
    ${printedLines(583, 756, 110, p.dark)}`;
}

/** A discovery box: five small tins standing in a low tray with a printed front. */
function samplerSvg(p: Palette): string {
  const colours = [DYE.choy700, DYE.anor800, DYE.saffron700, DYE.silk300, DYE.clay800];
  const tins = colours
    .map((colour, index) => {
      const x = 318 + index * 118;
      return `
        <rect x="${x}" y="600" width="100" height="270" fill="${colour}"/>
        <rect x="${x + 8}" y="612" width="14" height="250" fill="#ffffff" fill-opacity="0.18"/>
        <rect x="${x - 6}" y="566" width="112" height="44" rx="4" fill="${GOLD.body}"/>
        <rect x="${x - 6}" y="602" width="112" height="8" fill="${GOLD.dark}"/>
        <rect x="${x + 14}" y="672" width="72" height="92" fill="${DYE.silk50}"/>`;
    })
    .join('');
  return `
    ${tins}
    <path d="M258 836 L340 780 L1024 780 L942 836 Z" fill="${p.light}"/>
    <path d="M942 836 L1024 780 L1024 1054 L942 1110 Z" fill="${p.dark}"/>
    <rect x="258" y="836" width="684" height="274" fill="${p.body}"/>
    ${labelPanel(296, 868, 240, 210)}
    <rect x="590" y="928" width="300" height="12" fill="${GOLD.body}"/>
    <rect x="590" y="956" width="220" height="8" fill="${p.light}"/>`;
}

/** A porcelain gaiwan: saucer, bowl and lid, with an indigo band and a gold rim. */
function gaiwanSvg(p: Palette): string {
  return `
    <ellipse cx="600" cy="1076" rx="318" ry="44" fill="${p.dark}"/>
    <ellipse cx="600" cy="1062" rx="318" ry="44" fill="${p.body}"/>
    <ellipse cx="600" cy="1062" rx="292" ry="34" fill="none" stroke="${p.band}" stroke-width="5"/>
    <path d="M378 770 H822 C814 906 762 1012 700 1040 H500 C438 1012 386 906 378 770 Z" fill="${p.body}"/>
    <path d="M744 770 H822 C814 906 762 1012 700 1040 H668 C724 1004 760 904 744 770 Z" fill="${p.dark}"/>
    <path d="M390 846 H810 C806 866 802 880 798 892 H402 C398 880 394 866 390 846 Z" fill="${p.band}"/>
    <rect x="370" y="760" width="460" height="16" rx="8" fill="${GOLD.body}"/>
    <path d="M404 762 C 420 640, 780 640, 796 762 Z" fill="${p.body}"/>
    <path d="M700 676 C 760 696, 790 728, 796 762 H730 C 726 728, 716 700, 700 676 Z" fill="${p.dark}"/>
    <path d="M440 724 C 520 700, 680 700, 760 724" stroke="${p.band}" stroke-width="6" fill="none"/>
    <ellipse cx="600" cy="652" rx="54" ry="22" fill="${p.dark}"/>
    <ellipse cx="600" cy="640" rx="54" ry="22" fill="${p.body}"/>
    <ellipse cx="600" cy="640" rx="54" ry="22" fill="none" stroke="${GOLD.body}" stroke-width="4"/>`;
}

/** A glass teapot with a leaf infuser, tea to the line, a handle and a spout. */
function teapotSvg(p: Palette): string {
  return `
    <clipPath id="pot"><circle cx="600" cy="832" r="262"/></clipPath>
    <path d="M362 884 C 300 860, 268 760, 214 690 L 252 672 C 300 736, 330 800, 400 820 Z" fill="${DYE.silk100}" fill-opacity="0.6" stroke="${DYE.silk400}" stroke-width="5"/>
    <path d="M846 712 C 960 712, 960 960, 840 960" stroke="${DYE.silk400}" stroke-width="36" fill="none" stroke-linecap="round"/>
    <path d="M846 712 C 960 712, 960 960, 840 960" stroke="${DYE.silk100}" stroke-width="18" fill="none" stroke-linecap="round"/>
    <circle cx="600" cy="832" r="262" fill="${DYE.silk100}" fill-opacity="0.5"/>
    <rect x="300" y="760" width="600" height="400" fill="${p.liquid}" fill-opacity="0.82" clip-path="url(#pot)"/>
    <rect x="556" y="560" width="88" height="420" fill="${DYE.silk50}" fill-opacity="0.45" stroke="${DYE.silk400}" stroke-width="4"/>
    <rect x="566" y="840" width="68" height="130" fill="${DYE.choy800}" fill-opacity="0.85"/>
    <circle cx="600" cy="832" r="262" fill="none" stroke="${DYE.silk400}" stroke-width="6"/>
    <rect x="404" y="760" width="16" height="200" fill="#ffffff" fill-opacity="0.55"/>
    <path d="M476 594 C 520 556, 680 556, 724 594 Z" fill="${DYE.silk100}" fill-opacity="0.7" stroke="${DYE.silk400}" stroke-width="5"/>
    <rect x="574" y="530" width="52" height="40" rx="10" fill="${GOLD.body}"/>`;
}

/** One piyola bowl, front view from a little above, with a dotted band and a gold rim. */
function bowl(cx: number, top: number, w: number, p: Palette): string {
  const h = w * 0.62;
  const x0 = cx - w / 2;
  const x1 = cx + w / 2;
  const dots = Array.from({ length: 9 }, (_, index) => {
    const x = x0 + w * 0.16 + (index * w * 0.68) / 8;
    return `<circle cx="${x.toFixed(1)}" cy="${(top + h * 0.3).toFixed(1)}" r="${(w * 0.018).toFixed(1)}" fill="${p.band}"/>`;
  }).join('');
  return `
    <path d="M${x0} ${top} H${x1} C${x1 - 6} ${top + h * 0.62} ${x1 - w * 0.2} ${top + h * 0.96} ${cx + w * 0.17} ${top + h} H${cx - w * 0.17} C${x0 + w * 0.2} ${top + h * 0.96} ${x0 + 6} ${top + h * 0.62} ${x0} ${top} Z" fill="${p.body}"/>
    <path d="M${x1 - w * 0.16} ${top} H${x1} C${x1 - 6} ${top + h * 0.62} ${x1 - w * 0.2} ${top + h * 0.96} ${cx + w * 0.17} ${top + h} H${cx + w * 0.1} C${x1 - w * 0.24} ${top + h * 0.9} ${x1 - w * 0.14} ${top + h * 0.5} ${x1 - w * 0.16} ${top} Z" fill="${p.dark}"/>
    ${dots}
    <rect x="${cx - w * 0.16}" y="${top + h - 4}" width="${w * 0.32}" height="${w * 0.06}" fill="${p.dark}"/>
    <ellipse cx="${cx}" cy="${top}" rx="${w / 2}" ry="${w * 0.08}" fill="${DYE.silk200}"/>
    <ellipse cx="${cx}" cy="${top}" rx="${w / 2}" ry="${w * 0.08}" fill="none" stroke="${GOLD.body}" stroke-width="5"/>`;
}

/** A set of piyola bowls: two behind, one in front. */
function piyolaSvg(p: Palette): string {
  return `${bowl(470, 690, 300, p)}${bowl(730, 690, 300, p)}${bowl(600, 852, 330, p)}`;
}

const SHAPES: Record<PackShape, (palette: Palette, style: ArtStyle) => string> = {
  tin: tinSvg,
  box: boxSvg,
  gift: giftSvg,
  cake: cakeSvg,
  matcha: matchaSvg,
  bottle: bottleSvg,
  can: canSvg,
  carton: cartonSvg,
  sampler: samplerSvg,
  gaiwan: gaiwanSvg,
  teapot: teapotSvg,
  piyola: piyolaSvg,
};

/**
 * Where the emblem is composited for each shape (centre x, top y, width): the tea packs and gift
 * boxes only; none on teaware, nor on the matcha tin, bottles, cans and cartons (drinks TERAN does
 * not make).
 */
const EMBLEM_SLOTS: Record<PackShape, { centerX: number; top: number; width: number } | null> = {
  tin: { centerX: 600, top: 590, width: 196 },
  box: { centerX: 567, top: 572, width: 180 },
  gift: { centerX: 420, top: 806, width: 140 },
  cake: { centerX: 600, top: 476, width: 190 },
  matcha: null,
  bottle: null,
  can: null,
  carton: null,
  sampler: { centerX: 416, top: 904, width: 120 },
  gaiwan: null,
  teapot: null,
  piyola: null,
};

/** Visible square of the 1200×1200 scene per shape, so each object fills the product card. */
const VIEWPORTS: Record<PackShape, { x: number; y: number; size: number }> = {
  tin: { x: 180, y: 270, size: 880 },
  box: { x: 170, y: 300, size: 860 },
  gift: { x: 150, y: 380, size: 900 },
  cake: { x: 180, y: 190, size: 840 },
  matcha: { x: 230, y: 470, size: 740 },
  bottle: { x: 160, y: 200, size: 950 },
  can: { x: 190, y: 330, size: 820 },
  carton: { x: 190, y: 230, size: 920 },
  sampler: { x: 180, y: 440, size: 900 },
  gaiwan: { x: 220, y: 500, size: 760 },
  teapot: { x: 150, y: 420, size: 900 },
  piyola: { x: 210, y: 480, size: 780 },
};

const OUTPUT_SIZE = 1200;

/** The product's portrait: a transparent PNG cut-out. */
export async function renderPackshot(options: {
  style: ArtStyle;
  shape: PackShape;
  emblem: Buffer;
}): Promise<Buffer> {
  const palette = PALETTES[options.style];
  const view = VIEWPORTS[options.shape];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OUTPUT_SIZE}" height="${OUTPUT_SIZE}" viewBox="${view.x} ${view.y} ${view.size} ${view.size}">
    ${SHAPES[options.shape](palette, options.style)}
  </svg>`;
  const slot = EMBLEM_SLOTS[options.shape];
  const base = sharp(Buffer.from(svg));
  if (!slot) return base.png().toBuffer();
  const scale = OUTPUT_SIZE / view.size;
  const emblem = await sharp(options.emblem)
    .resize({ width: Math.round(slot.width * scale) })
    .png()
    .toBuffer();
  return base
    .composite([
      {
        input: emblem,
        left: Math.round((slot.centerX - slot.width / 2 - view.x) * scale),
        top: Math.round((slot.top - view.y) * scale),
      },
    ])
    .png()
    .toBuffer();
}

function leafPath(length: number, width: number): string {
  const half = length / 2;
  return `M ${-half} 0 Q 0 ${-width} ${half} 0 Q 0 ${width} ${-half} 0 Z`;
}

function flower(
  x: number,
  y: number,
  radius: number,
  petal: string,
  centre: string,
  rotation: number,
): string {
  const petals = Array.from({ length: 5 }, (_, index) => {
    const angle = rotation + (index * 360) / 5;
    return `<ellipse cx="0" cy="${-radius}" rx="${radius * 0.55}" ry="${radius}" fill="${petal}" transform="rotate(${angle})"/>`;
  }).join('');
  return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})">${petals}<circle r="${radius * 0.42}" fill="${centre}"/></g>`;
}

const DRINK_STYLES: readonly ArtStyle[] = [
  'iced',
  'peach',
  'water',
  'sparkling',
  'pomegranate',
  'apple',
];

/**
 * The second picture: loose tea (or flowers, fruit, powder) in a dish seen from above; a drink
 * poured into a glass; or, for teaware, tea served in a piyola. Transparent PNG.
 */
export async function renderLeafStudy(options: {
  style: ArtStyle;
  accent?: ArtAccent;
  seed: string;
}): Promise<Buffer> {
  const svg = DRINK_STYLES.includes(options.style)
    ? glassStudy(options.style, options.accent, options.seed)
    : options.style === 'porcelain' || options.style === 'glass'
      ? servedStudy()
      : dishStudy(options.style, options.accent, options.seed);
  return sharp(Buffer.from(svg)).png().toBuffer();
}

function dishStudy(style: ArtStyle, accent: ArtAccent | undefined, seed: string): string {
  const random = createRandom(seed);
  const palette = PALETTES[style];
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;
  const insideDish = (rx: number, ry: number) => {
    for (;;) {
      const x = (random() * 2 - 1) * rx;
      const y = (random() * 2 - 1) * ry;
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) return { x: 600 + x, y: 600 + y };
    }
  };

  const pieces: string[] = [];
  if (style === 'matcha') {
    // A soft mound of powder: overlapping discs from dark to light, then a bamboo scoop.
    for (let index = 0; index < 90; index++) {
      const { x, y } = insideDish(150 - index, 110 - index * 0.7);
      pieces.push(
        `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${(26 + random() * 30).toFixed(1)}" fill="${pick(palette.leaves)}"/>`,
      );
    }
    pieces.push(
      `<path d="M700 470 L960 360 L972 384 L716 498 Z" fill="${DYE.saffron300}"/><path d="M700 470 L716 498 L690 506 Z" fill="${DYE.saffron600}"/>`,
    );
  } else {
    const count = style === 'oolong' ? 230 : 320;
    for (let index = 0; index < count; index++) {
      const { x, y } = insideDish(300, 228);
      const rotation = Math.round(random() * 360);
      const color = pick(palette.leaves);
      if (style === 'oolong') {
        const radius = 9 + random() * 9;
        pieces.push(
          `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotation})"><ellipse rx="${radius.toFixed(1)}" ry="${(radius * 0.78).toFixed(1)}" fill="${color}"/><ellipse cx="${(-radius * 0.3).toFixed(1)}" cy="${(-radius * 0.3).toFixed(1)}" rx="${(radius * 0.35).toFixed(1)}" ry="${(radius * 0.2).toFixed(1)}" fill="#ffffff" fill-opacity="0.14"/></g>`,
        );
      } else if (style === 'puerh' && random() < 0.3) {
        const size = 22 + random() * 22;
        const points = Array.from({ length: 6 }, (_, corner) => {
          const angle = (corner / 6) * Math.PI * 2;
          const radius = size * (0.55 + random() * 0.45);
          return `${(Math.cos(angle) * radius).toFixed(1)},${(Math.sin(angle) * radius * 0.8).toFixed(1)}`;
        }).join(' ');
        pieces.push(
          `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotation})"><polygon points="${points}" fill="${color}"/></g>`,
        );
      } else if (style === 'fruit' && random() < 0.55) {
        const size = 12 + random() * 16;
        pieces.push(
          `<rect x="${(x - size / 2).toFixed(1)}" y="${(y - size / 2).toFixed(1)}" width="${size.toFixed(1)}" height="${(size * 0.8).toFixed(1)}" rx="3" fill="${color}" transform="rotate(${rotation} ${x.toFixed(1)} ${y.toFixed(1)})"/>`,
        );
      } else {
        const narrow = style === 'black' || style === 'puerh' ? 0.22 : 0.36;
        const length = 30 + random() * 36;
        const width = length * (narrow + random() * 0.1);
        pieces.push(
          `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotation})"><path d="${leafPath(length, width)}" fill="${color}"/><path d="M ${(-length / 2).toFixed(1)} 0 L ${(length / 2).toFixed(1)} 0" stroke="${DYE.ink900}" stroke-opacity="0.22" stroke-width="1.4"/></g>`,
        );
      }
    }
  }

  const accents: string[] = [];
  for (let index = 0; index < 9 && accent; index++) {
    const { x, y } = insideDish(270, 205);
    const rotation = random() * 72;
    if (accent === 'jasmine')
      accents.push(flower(x, y, 11 + random() * 4, DYE.silk50, DYE.saffron500, rotation));
    if (accent === 'chamomile')
      accents.push(flower(x, y, 10 + random() * 4, '#ffffff', DYE.saffron600, rotation));
    if (accent === 'mint') {
      const length = 60 + random() * 22;
      accents.push(
        `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${Math.round(random() * 360)})"><path d="${leafPath(length, length * 0.42)}" fill="${DYE.jade600}"/><path d="M ${-length / 2} 0 L ${length / 2} 0" stroke="${DYE.choy700}" stroke-width="2"/></g>`,
      );
    }
    if (accent === 'hibiscus') {
      const size = 30 + random() * 16;
      accents.push(
        `<path d="M ${x} ${y} q ${size / 2} ${-size} ${size} 0 q ${-size / 3} ${size / 2} ${-size} 0 z" fill="${DYE.anor800}" transform="rotate(${Math.round(random() * 360)} ${x} ${y})"/>`,
      );
    }
    if (accent === 'apple' || accent === 'lemon') {
      const r = 20 + random() * 8;
      const flesh = accent === 'apple' ? DYE.saffron100 : DYE.saffron300;
      const peel = accent === 'apple' ? DYE.anor700 : DYE.saffron600;
      accents.push(
        `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${Math.round(random() * 360)})"><path d="M ${-r} 0 A ${r} ${r} 0 0 1 ${r} 0 Z" fill="${peel}"/><path d="M ${-r + 5} 0 A ${r - 5} ${r - 5} 0 0 1 ${r - 5} 0 Z" fill="${flesh}"/></g>`,
      );
    }
    if (accent === 'rosehip') {
      accents.push(
        `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="${(10 + random() * 4).toFixed(1)}" ry="${(14 + random() * 4).toFixed(1)}" fill="${DYE.anor500}" transform="rotate(${Math.round(random() * 360)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`,
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OUTPUT_SIZE}" height="${OUTPUT_SIZE}" viewBox="150 150 900 900">
    <ellipse cx="600" cy="614" rx="420" ry="330" fill="${DYE.silk300}"/>
    <ellipse cx="600" cy="600" rx="420" ry="330" fill="${DYE.silk50}"/>
    <ellipse cx="600" cy="600" rx="420" ry="330" fill="none" stroke="${GOLD.body}" stroke-width="4"/>
    <ellipse cx="600" cy="604" rx="352" ry="272" fill="${DYE.silk100}"/>
    ${pieces.join('')}
    ${accents.join('')}
  </svg>`;
}

/** A tumbler of the drink, ice for the cold teas and water, fruit for the juices. */
function glassStudy(style: ArtStyle, accent: ArtAccent | undefined, seed: string): string {
  const palette = PALETTES[style];
  const random = createRandom(`glass-${seed}`);
  const clear = style === 'water' || style === 'sparkling';
  const ice =
    style === 'iced' || style === 'peach' || style === 'water'
      ? Array.from({ length: 4 }, (_, index) => {
          const x = 480 + index * 60 + random() * 20;
          const y = 560 + (index % 2) * 70 + random() * 30;
          return `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="92" height="84" rx="14" fill="#ffffff" fill-opacity="0.55" stroke="#ffffff" stroke-opacity="0.85" stroke-width="3" transform="rotate(${Math.round(random() * 30 - 15)} ${x + 46} ${y + 42})"/>`;
        }).join('')
      : '';
  const bubbles =
    style === 'sparkling' || accent === 'bubbles' ? bubbleField(seed, 450, 560, 300, 400) : '';
  const garnish =
    style === 'pomegranate'
      ? Array.from({ length: 14 }, () => {
          const x = 760 + random() * 170;
          const y = 960 + random() * 90;
          return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="16" ry="20" fill="${DYE.anor500}"/><ellipse cx="${(x - 5).toFixed(1)}" cy="${(y - 6).toFixed(1)}" rx="5" ry="6" fill="#ffffff" fill-opacity="0.5"/>`;
        }).join('')
      : style === 'apple'
        ? `<circle cx="850" cy="980" r="92" fill="${DYE.saffron500}"/><path d="M850 888 c6 -30 26 -44 48 -48" stroke="${DYE.ink700}" stroke-width="8" fill="none"/><path d="M870 870 c30 -30 70 -20 80 0 c-30 18 -60 18 -80 0 z" fill="${DYE.jade600}"/>`
        : style === 'peach'
          ? `<path d="M770 1060 A 110 110 0 0 1 990 1060 Z" fill="${DYE.anor300}"/><path d="M800 1060 A 80 80 0 0 1 960 1060 Z" fill="${DYE.saffron300}"/>`
          : style === 'iced'
            ? `<g transform="translate(840 1000) rotate(-20)"><path d="${leafPath(150, 60)}" fill="${DYE.jade600}"/><path d="M -75 0 L 75 0" stroke="${DYE.choy700}" stroke-width="3"/></g>`
            : accent === 'lemon'
              ? `<circle cx="860" cy="990" r="86" fill="${DYE.saffron500}"/><circle cx="860" cy="990" r="70" fill="${DYE.saffron300}"/>`
              : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OUTPUT_SIZE}" height="${OUTPUT_SIZE}" viewBox="200 300 900 900">
    <clipPath id="tumbler"><path d="M420 470 H780 L744 1100 Q742 1120 722 1120 H478 Q458 1120 456 1100 Z"/></clipPath>
    <path d="M420 470 H780 L744 1100 Q742 1120 722 1120 H478 Q458 1120 456 1100 Z" fill="${DYE.silk100}" fill-opacity="0.6"/>
    <rect x="400" y="${clear ? 560 : 540}" width="400" height="600" fill="${palette.liquid}" fill-opacity="${clear ? 0.65 : 0.92}" clip-path="url(#tumbler)"/>
    <g clip-path="url(#tumbler)">${ice}${bubbles}</g>
    <path d="M420 470 H780 L744 1100 Q742 1120 722 1120 H478 Q458 1120 456 1100 Z" fill="none" stroke="${DYE.silk400}" stroke-width="6"/>
    <rect x="452" y="520" width="18" height="520" fill="#ffffff" fill-opacity="0.5"/>
    ${garnish}
  </svg>`;
}

/** Tea served in a piyola, seen from above: gold rim, a dotted band and the tea. */
function servedStudy(): string {
  const dots = Array.from({ length: 28 }, (_, index) => {
    const angle = (index / 28) * Math.PI * 2;
    return `<circle cx="${(600 + Math.cos(angle) * 300).toFixed(1)}" cy="${(600 + Math.sin(angle) * 300).toFixed(1)}" r="9" fill="${DYE.nil600}"/>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OUTPUT_SIZE}" height="${OUTPUT_SIZE}" viewBox="180 180 840 840">
    <circle cx="600" cy="616" r="372" fill="${DYE.silk300}"/>
    <circle cx="600" cy="600" r="372" fill="${DYE.silk50}"/>
    <circle cx="600" cy="600" r="372" fill="none" stroke="${GOLD.body}" stroke-width="8"/>
    ${dots}
    <circle cx="600" cy="600" r="250" fill="${DYE.saffron300}"/>
    <circle cx="600" cy="600" r="250" fill="none" stroke="${DYE.saffron600}" stroke-width="5"/>
    <g transform="translate(640 560) rotate(-28)"><path d="${leafPath(120, 46)}" fill="${DYE.choy700}"/><path d="M -60 0 L 60 0" stroke="${DYE.choy900}" stroke-width="3"/></g>
  </svg>`;
}
