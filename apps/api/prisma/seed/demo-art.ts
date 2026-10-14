/**
 * Original, code-drawn demonstration artwork for the demo catalogue.
 *
 * TERAN has no product photography yet, so every demo product gets two illustrations:
 * a packshot (tin, box, gift box or wrapped pu-erh cake carrying the real TERAN emblem) and a
 * "loose-leaf study".
 * Rendering is deterministic (seeded) so re-running the seed produces identical images.
 * Replace these with real photography through the admin area at any time.
 */
import sharp from 'sharp';

export type ArtStyle =
  'black' | 'green' | 'white' | 'oolong' | 'puerh' | 'herbal' | 'fruit' | 'gift';
export type PackShape = 'tin' | 'box' | 'gift' | 'cake';
export type ArtAccent = 'jasmine' | 'mint' | 'chamomile' | 'hibiscus';

interface Palette {
  body: string;
  dark: string;
  light: string;
  leaves: string[];
}

const PALETTES: Record<ArtStyle, Palette> = {
  black: {
    body: '#3b1f1a',
    dark: '#1f0f0c',
    light: '#6a3d31',
    leaves: ['#2a1a12', '#3a2418', '#4a2e1c', '#1e140e', '#55361f'],
  },
  green: {
    body: '#1a5530',
    dark: '#0d3019',
    light: '#3f8a52',
    leaves: ['#4f6b2a', '#5e7a30', '#6b8a38', '#435c24', '#7a9443'],
  },
  white: {
    body: '#cdbf9f',
    dark: '#9f9072',
    light: '#ece2c9',
    leaves: ['#a9a68c', '#b8b59c', '#9c9a80', '#c7c3aa', '#8f8e74'],
  },
  oolong: {
    body: '#1e5a57',
    dark: '#0f3432',
    light: '#3f8a85',
    leaves: ['#2f4a2a', '#3b5a30', '#2a3f25', '#46663a', '#22361f'],
  },
  puerh: {
    body: '#5a2a1c',
    dark: '#2e140c',
    light: '#8a4a32',
    leaves: ['#3a1e12', '#4a2818', '#2c160d', '#5a321e', '#3f2214'],
  },
  herbal: {
    body: '#6e8a5a',
    dark: '#475d38',
    light: '#9cb486',
    leaves: ['#5f7d3c', '#6f8f47', '#7f9d55', '#55703a', '#8aa864'],
  },
  fruit: {
    body: '#7a2638',
    dark: '#4a1421',
    light: '#a8475d',
    leaves: ['#7a1f2b', '#9c2a3a', '#b8434f', '#5e1620', '#c46a3a'],
  },
  gift: {
    body: '#0b2e19',
    dark: '#05190d',
    light: '#1f5a36',
    leaves: ['#4f6b2a', '#3a2418', '#a9a68c'],
  },
};

const GOLD_STOPS = `
  <stop offset="0" stop-color="#7a5512"/>
  <stop offset="0.18" stop-color="#c5963a"/>
  <stop offset="0.34" stop-color="#f3de9c"/>
  <stop offset="0.5" stop-color="#c99a3e"/>
  <stop offset="0.78" stop-color="#e2c070"/>
  <stop offset="1" stop-color="#7a5512"/>`;

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

function background(id: string): string {
  return `
    <radialGradient id="${id}" cx="50%" cy="36%" r="78%">
      <stop offset="0" stop-color="#fdfbf6"/>
      <stop offset="0.62" stop-color="#f4ede0"/>
      <stop offset="1" stop-color="#e7dcc6"/>
    </radialGradient>`;
}

function tinSvg(palette: Palette): string {
  return `
    <path d="M395 352 H805 V912 Q805 936 781 936 H419 Q395 936 395 912 Z" fill="url(#body)"/>
    <rect x="470" y="392" width="20" height="500" fill="#ffffff" opacity="0.10"/>
    <rect x="395" y="900" width="410" height="24" fill="url(#gold)"/>
    <rect x="383" y="292" width="434" height="86" rx="10" fill="url(#gold)"/>
    <ellipse cx="600" cy="294" rx="217" ry="18" fill="#f6e4ae" opacity="0.92"/>
    <rect x="383" y="368" width="434" height="5" fill="#6b4c10" opacity="0.35"/>
    <rect x="432" y="468" width="336" height="364" rx="12" fill="#fbf7ee"/>
    <rect x="444" y="480" width="312" height="340" rx="8" fill="none" stroke="#c5963a" stroke-width="2"/>
    <rect x="452" y="488" width="296" height="324" rx="6" fill="none" stroke="#c5963a" stroke-opacity="0.45" stroke-width="1"/>
    <path d="M520 760 H680" stroke="#c5963a" stroke-width="2"/>
    <path d="M600 752 l8 8 l-8 8 l-8 -8 z" fill="#c5963a"/>
    <rect x="540" y="784" width="120" height="6" rx="3" fill="${palette.body}"/>`;
}

function boxSvg(palette: Palette): string {
  return `
    <path d="M360 382 L470 320 L880 320 L770 382 Z" fill="${palette.light}"/>
    <path d="M770 382 L880 320 L880 854 L770 916 Z" fill="${palette.dark}"/>
    <rect x="360" y="382" width="410" height="534" fill="url(#bodyFlat)"/>
    <rect x="380" y="402" width="370" height="494" fill="none" stroke="url(#gold)" stroke-width="4"/>
    <rect x="414" y="468" width="302" height="306" rx="10" fill="#fbf7ee"/>
    <rect x="424" y="478" width="282" height="286" rx="7" fill="none" stroke="#c5963a" stroke-width="1.5"/>
    <path d="M495 728 H635" stroke="#c5963a" stroke-width="2"/>
    <rect x="360" y="858" width="410" height="22" fill="url(#gold)"/>
    <path d="M770 858 L880 796 L880 818 L770 880 Z" fill="#8c6519"/>`;
}

function giftSvg(palette: Palette): string {
  return `
    <path d="M230 560 L330 500 L1000 500 L900 560 Z" fill="${palette.light}"/>
    <path d="M900 560 L1000 500 L1000 860 L900 920 Z" fill="${palette.dark}"/>
    <rect x="230" y="560" width="670" height="360" fill="url(#bodyFlat)"/>
    <rect x="250" y="580" width="630" height="320" fill="none" stroke="#c5963a" stroke-opacity="0.55" stroke-width="2"/>
    <rect x="610" y="560" width="64" height="360" fill="url(#gold)"/>
    <path d="M660 500 L724 500 L674 560 L610 560 Z" fill="url(#gold)"/>
    <path d="M900 690 L1000 630 L1000 690 L900 750 Z" fill="#8c6519" opacity="0.9"/>
    <path d="M642 528 C 560 420, 470 470, 560 540 Z" fill="url(#gold)"/>
    <path d="M652 528 C 740 420, 830 470, 740 540 Z" fill="url(#gold)"/>
    <circle cx="647" cy="530" r="20" fill="#e2c070"/>
    <circle cx="420" cy="740" r="108" fill="#fbf7ee" stroke="#c5963a" stroke-width="3"/>
    <circle cx="420" cy="740" r="96" fill="none" stroke="#c5963a" stroke-opacity="0.45" stroke-width="1"/>`;
}

/** A pressed tea cake in its paper wrapper, seen from above, with a printed band and label. */
function cakeSvg(palette: Palette): string {
  // Soft creases where the paper folds over the rim (fixed offsets keep the render deterministic).
  const pleats = Array.from({ length: 30 }, (_, index) => {
    const angle = index * 12 + (index % 3) * 3.5;
    const depth = 26 + ((index * 7) % 5) * 7;
    return `<path d="M600 254 q5 ${depth / 2} -1 ${depth}" stroke="#a8946b" stroke-opacity="0.2" stroke-width="2.5" stroke-linecap="round" fill="none" transform="rotate(${angle} 600 592)"/>`;
  }).join('');
  return `
    <circle cx="600" cy="592" r="340" fill="url(#paper)"/>
    <circle cx="600" cy="592" r="340" fill="none" stroke="#cbb994" stroke-width="5"/>
    ${pleats}
    <circle cx="600" cy="592" r="292" fill="none" stroke="url(#gold)" stroke-width="4"/>
    <circle cx="600" cy="592" r="268" fill="none" stroke="${palette.body}" stroke-width="32"/>
    <circle cx="600" cy="592" r="244" fill="none" stroke="url(#gold)" stroke-width="4"/>
    <circle cx="600" cy="592" r="212" fill="#fbf7ee"/>
    <circle cx="600" cy="592" r="200" fill="none" stroke="#c5963a" stroke-opacity="0.55" stroke-width="1.5"/>
    <path d="M532 704 H668" stroke="#c5963a" stroke-width="2"/>
    <path d="M600 696 l8 8 l-8 8 l-8 -8 z" fill="#c5963a"/>
    <rect x="550" y="726" width="100" height="6" rx="3" fill="${palette.body}"/>`;
}

/** Where the emblem is composited for each pack shape (centre x, top y, width), in scene units. */
const EMBLEM_SLOTS: Record<PackShape, { centerX: number; top: number; width: number }> = {
  tin: { centerX: 600, top: 518, width: 214 },
  box: { centerX: 565, top: 504, width: 196 },
  gift: { centerX: 420, top: 676, width: 140 },
  cake: { centerX: 600, top: 456, width: 190 },
};

/** Visible square of the 1200×1200 scene per shape, so the pack fills the product card. */
const VIEWPORTS: Record<PackShape, { x: number; y: number; size: number }> = {
  tin: { x: 190, y: 200, size: 820 },
  box: { x: 180, y: 200, size: 850 },
  gift: { x: 150, y: 230, size: 900 },
  cake: { x: 190, y: 182, size: 820 },
};

const SHAPES: Record<PackShape, (palette: Palette) => string> = {
  tin: tinSvg,
  box: boxSvg,
  gift: giftSvg,
  cake: cakeSvg,
};

const OUTPUT_SIZE = 1200;

export async function renderPackshot(options: {
  style: ArtStyle;
  shape: PackShape;
  emblem: Buffer;
}): Promise<Buffer> {
  const palette = PALETTES[options.style];
  const shapeSvg = SHAPES[options.shape](palette);
  const shadow =
    options.shape === 'gift'
      ? '<ellipse cx="620" cy="935" rx="420" ry="40" fill="#3b2a12" opacity="0.2" filter="url(#soft)"/>'
      : options.shape === 'cake'
        ? '<ellipse cx="612" cy="618" rx="352" ry="352" fill="#3b2a12" opacity="0.2" filter="url(#soft)"/>'
        : '<ellipse cx="610" cy="950" rx="290" ry="40" fill="#3b2a12" opacity="0.22" filter="url(#soft)"/>';

  const view = VIEWPORTS[options.shape];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OUTPUT_SIZE}" height="${OUTPUT_SIZE}" viewBox="${view.x} ${view.y} ${view.size} ${view.size}">
    <defs>
      ${background('bg')}
      <linearGradient id="body" x1="0" x2="1">
        <stop offset="0" stop-color="${palette.dark}"/>
        <stop offset="0.16" stop-color="${palette.body}"/>
        <stop offset="0.3" stop-color="${palette.light}"/>
        <stop offset="0.46" stop-color="${palette.body}"/>
        <stop offset="0.86" stop-color="${palette.body}"/>
        <stop offset="1" stop-color="${palette.dark}"/>
      </linearGradient>
      <linearGradient id="bodyFlat" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="${palette.light}"/>
        <stop offset="0.25" stop-color="${palette.body}"/>
        <stop offset="1" stop-color="${palette.dark}"/>
      </linearGradient>
      <linearGradient id="gold" x1="0" x2="1">${GOLD_STOPS}</linearGradient>
      <radialGradient id="paper" cx="46%" cy="40%" r="70%">
        <stop offset="0" stop-color="#fdf9f0"/>
        <stop offset="0.7" stop-color="#f1e7d2"/>
        <stop offset="1" stop-color="#e2d3b4"/>
      </radialGradient>
      <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter>
    </defs>
    <rect x="${view.x}" y="${view.y}" width="${view.size}" height="${view.size}" fill="url(#bg)"/>
    ${shadow}
    ${shapeSvg}
  </svg>`;

  // Map the emblem slot from scene units to output pixels.
  const scale = OUTPUT_SIZE / view.size;
  const slot = EMBLEM_SLOTS[options.shape];
  const width = Math.round(slot.width * scale);
  const emblem = await sharp(options.emblem).resize({ width }).png().toBuffer();
  return sharp(Buffer.from(svg))
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
  return `<g transform="translate(${x} ${y})">${petals}<circle r="${radius * 0.42}" fill="${centre}"/></g>`;
}

/** A shallow ceramic dish of loose tea seen from above, procedurally scattered. */
export async function renderLeafStudy(options: {
  style: ArtStyle;
  accent?: ArtAccent;
  seed: string;
}): Promise<Buffer> {
  const random = createRandom(options.seed);
  const palette = PALETTES[options.style];
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)] as T;
  const insideDish = (rx: number, ry: number) => {
    for (;;) {
      const x = (random() * 2 - 1) * rx;
      const y = (random() * 2 - 1) * ry;
      if ((x * x) / (rx * rx) + (y * y) / (ry * ry) <= 1) return { x: 600 + x, y: 600 + y };
    }
  };

  const pieces: string[] = [];
  const count = options.style === 'oolong' ? 230 : 320;
  for (let index = 0; index < count; index++) {
    const { x, y } = insideDish(300, 228);
    const rotation = Math.round(random() * 360);
    const color = pick(palette.leaves);
    if (options.style === 'oolong') {
      const radius = 9 + random() * 9;
      pieces.push(
        `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotation})"><ellipse rx="${radius.toFixed(1)}" ry="${(radius * 0.78).toFixed(1)}" fill="${color}"/><ellipse cx="${(-radius * 0.3).toFixed(1)}" cy="${(-radius * 0.3).toFixed(1)}" rx="${(radius * 0.35).toFixed(1)}" ry="${(radius * 0.2).toFixed(1)}" fill="#ffffff" opacity="0.12"/></g>`,
      );
    } else if (options.style === 'puerh' && random() < 0.3) {
      // Pieces broken from a pressed cake: irregular, flat chunks.
      const size = 22 + random() * 22;
      const points = Array.from({ length: 6 }, (_, corner) => {
        const angle = (corner / 6) * Math.PI * 2;
        const radius = size * (0.55 + random() * 0.45);
        return `${(Math.cos(angle) * radius).toFixed(1)},${(Math.sin(angle) * radius * 0.8).toFixed(1)}`;
      }).join(' ');
      pieces.push(
        `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotation})"><polygon points="${points}" fill="${color}"/><polygon points="${points}" fill="#ffffff" opacity="0.06" transform="translate(-2 -2) scale(0.8)"/></g>`,
      );
    } else if (options.style === 'fruit' && random() < 0.55) {
      const size = 12 + random() * 16;
      pieces.push(
        `<rect x="${(x - size / 2).toFixed(1)}" y="${(y - size / 2).toFixed(1)}" width="${size.toFixed(1)}" height="${(size * 0.8).toFixed(1)}" rx="3" fill="${color}" transform="rotate(${rotation} ${x.toFixed(1)} ${y.toFixed(1)})"/>`,
      );
    } else {
      const narrow = options.style === 'black' || options.style === 'puerh' ? 0.22 : 0.36;
      const length = 30 + random() * 36;
      const width = length * (narrow + random() * 0.1);
      pieces.push(
        `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rotation})"><path d="${leafPath(length, width)}" fill="${color}"/><path d="M ${(-length / 2).toFixed(1)} 0 L ${(length / 2).toFixed(1)} 0" stroke="#000000" stroke-opacity="0.18" stroke-width="1.2"/></g>`,
      );
    }
  }

  const accents: string[] = [];
  const accentCount = 9;
  for (let index = 0; index < accentCount && options.accent; index++) {
    const { x, y } = insideDish(270, 205);
    const rotation = random() * 72;
    if (options.accent === 'jasmine')
      accents.push(flower(x, y, 11 + random() * 4, '#fbf8ee', '#e7c878', rotation));
    if (options.accent === 'chamomile')
      accents.push(flower(x, y, 10 + random() * 4, '#ffffff', '#e2b23a', rotation));
    if (options.accent === 'mint') {
      const length = 60 + random() * 22;
      accents.push(
        `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${Math.round(random() * 360)})"><path d="${leafPath(length, length * 0.42)}" fill="#5aa24a"/><path d="M ${-length / 2} 0 L ${length / 2} 0" stroke="#2f6b2c" stroke-width="2"/></g>`,
      );
    }
    if (options.accent === 'hibiscus') {
      const size = 30 + random() * 16;
      accents.push(
        `<path d="M ${x} ${y} q ${size / 2} ${-size} ${size} 0 q ${-size / 3} ${size / 2} ${-size} 0 z" fill="#8e1b2e" opacity="0.92" transform="rotate(${Math.round(random() * 360)} ${x} ${y})"/>`,
      );
    }
  }

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OUTPUT_SIZE}" height="${OUTPUT_SIZE}" viewBox="150 150 900 900">
    <defs>
      ${background('bg')}
      <radialGradient id="dish" cx="45%" cy="38%" r="70%">
        <stop offset="0" stop-color="#ffffff"/>
        <stop offset="0.7" stop-color="#f3ecdf"/>
        <stop offset="1" stop-color="#d9ccb2"/>
      </radialGradient>
      <radialGradient id="dishInner" cx="50%" cy="45%" r="65%">
        <stop offset="0" stop-color="#f7f1e6"/>
        <stop offset="1" stop-color="#e6dac3"/>
      </radialGradient>
      <filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="20"/></filter>
    </defs>
    <rect x="150" y="150" width="900" height="900" fill="url(#bg)"/>
    <ellipse cx="620" cy="650" rx="430" ry="340" fill="#3b2a12" opacity="0.18" filter="url(#soft)"/>
    <ellipse cx="600" cy="600" rx="420" ry="330" fill="url(#dish)"/>
    <ellipse cx="600" cy="600" rx="420" ry="330" fill="none" stroke="#c5963a" stroke-width="3" opacity="0.7"/>
    <ellipse cx="600" cy="604" rx="352" ry="272" fill="url(#dishInner)"/>
    ${pieces.join('')}
    ${accents.join('')}
  </svg>`;

  return sharp(Buffer.from(svg)).png().toBuffer();
}
