/**
 * Draws every shape and texture of the botanical atmosphere (src/components/brand/botanical.tsx,
 * src/styles/botanical.css) into public/brand/botanical/.
 *
 * These are original illustrations drawn in code for the website, not TERAN packaging artwork.
 *
 * - Leaves follow the tea plant (Camellia sinensis): an elliptic blade with a wedge-shaped base,
 *   a drawn-out tip, fine forward-pointing serrations and lateral veins that curve towards the
 *   tip. Veins are cut out of the silhouette with an SVG mask, so the files work as CSS masks: the
 *   page colours them with the brand palette.
 * - Branches carry alternate leaves that shrink towards "one bud, two leaves" at the tip; one is
 *   straight, one follows an arc (for the moon gate). `branch-soft.webp` is the straight branch
 *   out of focus, for the nearest foliage and for soft shadows.
 * - Ridges are two ranges of karst peaks either side of an empty centre, as in shan shui painting:
 *   a far and a near layer, each fading into mist at its foot.
 * - Mist textures are long bands of soft fractal noise that repeat seamlessly from side to side,
 *   so a band can drift endlessly without a visible seam or jump.
 * - Light: shafts of morning sun (`rays.svg`) and a soft texture that varies the strength of glows
 *   on plain backgrounds (`light.webp`), where a smooth faint gradient would show rings.
 *
 *   node scripts/botanical/generate-botanical.mjs   (run from apps/web)
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '../../public/brand/botanical');

const round = (value, step = 0.1) => Math.round(value / step) * step;
const fixed = (value, step) => String(Number(round(value, step).toFixed(step < 1 ? 1 : 0)));
const smoothstep = (from, to, x) => {
  const t = Math.min(1, Math.max(0, (x - from) / (to - from)));
  return t * t * (3 - 2 * t);
};
const pathFrom = (points, step = 0.1) =>
  `M${points.map(([x, y]) => `${fixed(x, step)} ${fixed(y, step)}`).join('L')}`;

/** Seeded random numbers (mulberry32), so every run draws the same shapes. */
function random(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Smooth gradient noise that repeats every `period` lattice cells along x, so textures built from
 * it tile seamlessly from side to side. Values are roughly within ±0.7.
 */
function periodicNoise(seed) {
  const next = random(seed);
  const size = 256;
  const gx = new Float64Array(size * size);
  const gy = new Float64Array(size * size);
  for (let index = 0; index < size * size; index += 1) {
    const angle = next() * Math.PI * 2;
    gx[index] = Math.cos(angle);
    gy[index] = Math.sin(angle);
  }
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  return (x, y, period) => {
    const x0 = Math.floor(x);
    const y0 = Math.floor(y);
    const fx = x - x0;
    const fy = y - y0;
    const corner = (ix, iy, dx, dy) => {
      const index =
        ((((ix % period) + period) % period) % size) * size + (((iy % size) + size) % size);
      return gx[index] * dx + gy[index] * dy;
    };
    const u = fade(fx);
    const v = fade(fy);
    const top = corner(x0, y0, fx, fy) * (1 - u) + corner(x0 + 1, y0, fx - 1, fy) * u;
    const bottom =
      corner(x0, y0 + 1, fx, fy - 1) * (1 - u) + corner(x0 + 1, y0 + 1, fx - 1, fy - 1) * u;
    return top * (1 - v) + bottom * v;
  };
}

/** Fractal noise: octaves of `noise`, each twice as fine; still periodic along x. */
function fbm(noise, x, y, period, octaves = 4, gain = 0.5) {
  let sum = 0;
  let amplitude = 1;
  let total = 0;
  let frequency = 1;
  for (let octave = 0; octave < octaves; octave += 1) {
    sum += amplitude * noise(x * frequency, y * frequency, period * frequency);
    total += amplitude;
    amplitude *= gain;
    frequency *= 2;
  }
  return sum / total;
}

/* ----------------------------------------------------------------------------------- Leaves */

/**
 * One leaf in local coordinates: the base of the blade at (0, 0), the tip towards negative y.
 * Returns the outline, the petiole, the vein strokes, the outline points and the bounding box.
 */
function leaf({
  length,
  width,
  base = 0.92, // exponent of the base; ~1 gives the tea leaf's wedge-shaped base
  taper = 1.45, // exponent of the tip; higher is more tapered
  tip = 0.3, // extra narrowing of the last quarter (drawn-out tip)
  bend = 0.035, // sideways curve of the midrib, as a share of the length
  asymmetry = 0.06, // one half slightly wider than the other
  fold = 1, // < 1 narrows the left half, as if the leaf were turned or folded
  sway = 0.012, // gentle S-curve of the midrib
  curl = 0.025, // the tip turns slightly to one side
  wave = 0.03, // slight waviness of the margin
  teeth = 28,
  toothDepth = 0.075,
  petiole = 0.07,
  veins = 7,
  seed = 1,
  samples: sampleCount,
  step = 0.1, // coordinate precision of the path data
}) {
  const peak = base / (base + taper);
  const peakValue = peak ** base * (1 - peak) ** taper;
  const midX = (t) =>
    length *
    (bend * 4 * t * (1 - t) +
      sway * Math.sin(2 * Math.PI * t) +
      curl * smoothstep(0.78, 1, t) ** 2);
  const mid = (t) => [midX(t), -length * t];
  const normal = (t) => {
    const tx = (midX(Math.min(1, t + 0.001)) - midX(Math.max(0, t - 0.001))) / 0.002;
    const ty = -length;
    const size = Math.hypot(tx, ty);
    return [-ty / size, tx / size];
  };
  const halfWidth = (t) =>
    ((width * (t ** base * (1 - t) ** taper)) / peakValue) *
    (1 - tip * smoothstep(0.66, 1, t)) *
    (1 + wave * Math.sin(t * Math.PI * 3.2 + seed));
  const serration = (t) => smoothstep(0.1, 0.26, t) * (1 - smoothstep(0.84, 0.97, t));
  const at = (t, side, distance) => {
    const [mx, my] = mid(t);
    const [nx, ny] = normal(t);
    return [mx + side * nx * distance, my + side * ny * distance];
  };

  const samples = sampleCount ?? Math.max(90, teeth * 4);
  const edge = (side, scale) =>
    Array.from({ length: samples + 1 }, (_, index) => {
      const t = index / samples;
      // Saw-tooth phase: each tooth rises slowly and drops sharply, so it points to the tip.
      const phase = (t * teeth + (side === 1 ? 0 : 0.5)) % 1;
      const tooth = teeth > 0 ? toothDepth * width * phase ** 1.6 * serration(t) : 0;
      return at(t, side, halfWidth(t) * scale + tooth);
    });
  const right = edge(1, 1 + asymmetry);
  const left = edge(-1, (1 - asymmetry) * fold);
  const outline = [...right, ...left.reverse().slice(1)];

  const stalk = petiole * length;
  const stalkWidth = Math.max(1.1, width * 0.05);
  const petiolePoints = [
    [-stalkWidth * 0.8, -length * 0.03],
    [-stalkWidth, 0],
    [-stalkWidth * 0.55 - bend * stalk * 4, stalk],
    [stalkWidth * 0.55 - bend * stalk * 4, stalk],
    [stalkWidth, 0],
    [stalkWidth * 0.8, -length * 0.03],
  ];

  const midrib = Array.from({ length: 41 }, (_, index) => mid((index / 40) * 0.96));
  const laterals = [];
  for (let index = 0; index < veins; index += 1) {
    const start = 0.15 + (index * 0.66) / Math.max(1, veins - 1);
    for (const side of [1, -1]) {
      const offset = side === 1 ? 0 : 0.025; // sub-opposite, as on the plant
      const t0 = start + offset;
      const t1 = Math.min(t0 + 0.11, 0.95);
      const scale = side === 1 ? 1 + asymmetry : (1 - asymmetry) * fold;
      const [sx, sy] = mid(t0);
      const [cx, cy] = at(t0 + 0.02, side, halfWidth(t0 + 0.02) * scale * 0.5);
      const [ex, ey] = at(t1, side, halfWidth(t1) * scale * 0.8);
      laterals.push(
        `M${fixed(sx, step)} ${fixed(sy, step)}Q${fixed(cx, step)} ${fixed(cy, step)} ${fixed(ex, step)} ${fixed(ey, step)}`,
      );
    }
  }

  const points = [...outline, ...petiolePoints];
  const box = {
    minX: Math.min(...points.map(([x]) => x)),
    maxX: Math.max(...points.map(([x]) => x)),
    minY: Math.min(...points.map(([, y]) => y)),
    maxY: Math.max(...points.map(([, y]) => y)),
  };

  return {
    outline: `${pathFrom(outline, step)}Z`,
    petiole: `${pathFrom(petiolePoints, step)}Z`,
    midrib: pathFrom(midrib, step),
    laterals: laterals.join(''),
    midribWidth: round(Math.max(1, width * 0.035)),
    lateralWidth: round(Math.max(0.6, width * 0.02)),
    points,
    box,
  };
}

/** A leaf as an SVG group with its veins cut out, placed by `transform`. */
function leafGroup(id, shape, transform = '', { veins = true } = {}) {
  const pad = 20;
  const { minX, minY, maxX, maxY } = shape.box;
  const area = `x="${round(minX - pad)}" y="${round(minY - pad)}" width="${round(maxX - minX + pad * 2)}" height="${round(maxY - minY + pad * 2)}"`;
  const body = `<path d="${shape.outline}"/><path d="${shape.petiole}"/>`;
  return {
    defs: veins
      ? `<mask id="${id}" maskUnits="userSpaceOnUse" ${area}><rect ${area} fill="#fff"/><g fill="none" stroke="#000" stroke-linecap="round"><path d="${shape.midrib}" stroke-width="${shape.midribWidth}" stroke-opacity="0.7"/>${shape.laterals ? `<path d="${shape.laterals}" stroke-width="${shape.lateralWidth}" stroke-opacity="0.5"/>` : ''}</g></mask>`
      : '',
    body: `<g${transform ? ` transform="${transform}"` : ''}>${veins ? `<g mask="url(#${id})">${body}</g>` : body}</g>`,
  };
}

function svg(viewBox, groups, extra = '') {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="#1a5317"><defs>${groups.map((group) => group.defs).join('')}</defs>${extra}${groups.map((group) => group.body).join('')}</svg>\n`;
}

const ratioOf = (width, height) => round((width / height) * 1000, 1) / 1000;

function single(name, options) {
  const shape = leaf(options);
  const pad = 2;
  const { minX, minY, maxX, maxY } = shape.box;
  const viewBox = [minX - pad, minY - pad, maxX - minX + pad * 2, maxY - minY + pad * 2]
    .map((value) => round(value))
    .join(' ');
  writeFileSync(join(OUT, `${name}.svg`), svg(viewBox, [leafGroup(`${name}-veins`, shape)]));
  return { name, ratio: ratioOf(maxX - minX + pad * 2, maxY - minY + pad * 2) };
}

/** A stem along `curve(t)` (t = 0 at the cut end), tapering from `from` to `to` units thick. */
function stemPath(curve, from, to, step) {
  const samples = Array.from({ length: 41 }, (_, index) => index / 40);
  const thickness = (t) => from + (to - from) * t;
  const offset = (t, side) => {
    const [x, y] = curve(t);
    const [xn, yn] = curve(Math.min(1, t + 0.01));
    const [xp, yp] = curve(Math.max(0, t - 0.01));
    const tx = xn - xp;
    const ty = yn - yp;
    const size = Math.hypot(tx, ty);
    return [x + (side * -ty * thickness(t)) / size, y + (side * tx * thickness(t)) / size];
  };
  const points = [
    ...samples.map((t) => offset(t, 1)),
    ...[...samples].reverse().map((t) => offset(t, -1)),
  ];
  return { d: `${pathFrom(points, step)}Z`, points };
}

/** Direction of `curve` at t, in degrees clockwise from "up" (the leaf's own axis). */
function heading(curve, t) {
  const [xn, yn] = curve(Math.min(1, t + 0.005));
  const [xp, yp] = curve(Math.max(0, t - 0.005));
  return (Math.atan2(xn - xp, -(yn - yp)) * 180) / Math.PI;
}

const transformPoints = (points, [tx, ty], degrees) => {
  const angle = (degrees * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return points.map(([x, y]) => [tx + x * cos - y * sin, ty + x * sin + y * cos]);
};

/**
 * Leaves along a stem: alternate nodes, the largest leaves low on the branch and the young ones
 * near the tip, which ends in a bud. `nodes` lists [t, side, length, angle, leaf options].
 */
function foliage(name, { curve, stem: [from, to], nodes, bud, step = 1, veins = true }) {
  const groups = [];
  const all = [];
  const stem = stemPath(curve, from, to, step);
  all.push(...stem.points);
  nodes.forEach(([t, side, length, angle, options = {}], index) => {
    const shape = leaf({
      length,
      width: length * (options.widthRatio ?? 0.23),
      teeth: Math.round(length / 6.5),
      samples: 56,
      veins: 6,
      tip: 0.4,
      step,
      seed: 1.3 + index * 0.77,
      ...options,
    });
    const at = curve(t);
    const direction = heading(curve, t) + side * angle;
    groups.push(
      leafGroup(
        `${name}-${index}`,
        shape,
        `translate(${fixed(at[0], step)} ${fixed(at[1], step)}) rotate(${round(direction)})`,
        { veins },
      ),
    );
    all.push(...transformPoints(shape.points, at, direction));
  });
  if (bud) {
    const shape = leaf({
      length: bud,
      width: bud * 0.13,
      base: 1.1,
      taper: 1.1,
      tip: 0.2,
      bend: 0.03,
      sway: 0,
      curl: 0.06,
      wave: 0,
      teeth: 0,
      veins: 0,
      petiole: 0.02,
      samples: 40,
      step,
    });
    const at = curve(1);
    const direction = heading(curve, 1);
    groups.push(
      leafGroup(
        `${name}-bud`,
        shape,
        `translate(${fixed(at[0], step)} ${fixed(at[1], step)}) rotate(${round(direction)})`,
        { veins: false },
      ),
    );
    all.push(...transformPoints(shape.points, at, direction));
  }
  const box = {
    minX: Math.min(...all.map(([x]) => x)),
    maxX: Math.max(...all.map(([x]) => x)),
    minY: Math.min(...all.map(([, y]) => y)),
    maxY: Math.max(...all.map(([, y]) => y)),
  };
  return { groups, stem: stem.d, box };
}

/** "One bud and two leaves", the classic tea plucking standard, on a short curved stem. */
function sprig(name) {
  const stem = (t) => {
    // Quadratic curve from the cut end (bottom) to the bud.
    const [x0, y0, x1, y1, x2, y2] = [118, 300, 92, 190, 104, 70];
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    return [a * x0 + b * x1 + c * x2, a * y0 + b * y1 + c * y2];
  };
  const stemShape = stemPath(stem, 3.4, 1.2, 0.1);

  const lower = leaf({
    length: 150,
    width: 33,
    bend: -0.04,
    sway: 0.01,
    curl: -0.03,
    asymmetry: 0.08,
    teeth: 26,
    tip: 0.4,
    seed: 1.2,
  });
  const upper = leaf({
    length: 116,
    width: 24,
    bend: 0.05,
    curl: 0.035,
    asymmetry: 0.05,
    teeth: 22,
    tip: 0.42,
    seed: 2.7,
  });
  const bud = leaf({
    length: 66,
    width: 8.5,
    base: 1.1,
    taper: 1.1,
    tip: 0.2,
    bend: 0.03,
    sway: 0,
    curl: 0.06,
    wave: 0,
    teeth: 0,
    veins: 0,
    petiole: 0.02,
  });
  const [lx, ly] = stem(0.32);
  const [ux, uy] = stem(0.66);
  const [bx, by] = stem(1);
  const groups = [
    leafGroup(`${name}-lower`, lower, `translate(${round(lx)} ${round(ly)}) rotate(-58)`),
    leafGroup(`${name}-upper`, upper, `translate(${round(ux)} ${round(uy)}) rotate(48)`),
    leafGroup(`${name}-bud`, bud, `translate(${round(bx)} ${round(by)}) rotate(6)`),
  ];
  writeFileSync(
    join(OUT, `${name}.svg`),
    svg('-40 -10 260 316', groups, `<path d="${stemShape.d}"/>`),
  );
  return { name, ratio: ratioOf(260, 316) };
}

/** Cubic Bézier through four control points. */
const bezier =
  ([p0, p1, p2, p3]) =>
  (t) => {
    const u = 1 - t;
    return [0, 1].map(
      (axis) =>
        u * u * u * p0[axis] +
        3 * u * u * t * p1[axis] +
        3 * u * t * t * p2[axis] +
        t * t * t * p3[axis],
    );
  };

/*
 * A tea branch, upright (cut end at the bottom): a gently S-curved stem with seven alternate
 * leaves, largest at the second and third nodes, and two young leaves with a bud at the tip.
 */
const BRANCH = {
  curve: bezier([
    [0, 0],
    [34, -190],
    [-52, -360],
    [14, -560],
  ]),
  stem: [5.2, 1.4],
  nodes: [
    [0.12, 1, 150, 58, { bend: -0.04, fold: 0.82, curl: -0.03, asymmetry: 0.07 }],
    [0.25, -1, 172, 52, { bend: 0.045, fold: 0.66, curl: 0.035 }],
    [0.38, 1, 166, 49, { bend: -0.035, sway: -0.012, fold: 0.9 }],
    [0.5, -1, 150, 46, { bend: 0.05, fold: 0.58, curl: 0.04 }],
    [0.61, 1, 132, 44, { bend: -0.03, fold: 0.86 }],
    [0.72, -1, 110, 40, { bend: 0.04, fold: 0.74, curl: 0.03 }],
    [0.82, 1, 88, 36, { bend: -0.03, fold: 0.9 }],
    [0.9, -1, 66, 30, { bend: 0.03, fold: 0.8, teeth: 0, veins: 0 }],
  ],
  bud: 58,
};

/*
 * A branch that follows a circle of radius 300 around (0, 0), from the lower left of the circle
 * towards its left side, leaves turned mostly outwards: placed concentric with the moon gate.
 */
const ARC = (() => {
  const radius = 300;
  const start = 128; // degrees, measured clockwise from "right" (y points down)
  const end = 214;
  const curve = (t) => {
    const angle = ((start + (end - start) * t) * Math.PI) / 180;
    return [Math.cos(angle) * radius, Math.sin(angle) * radius];
  };
  return {
    radius,
    curve,
    stem: [4.6, 1.3],
    nodes: [
      [0.1, -1, 120, 50, { bend: 0.04, fold: 0.7 }],
      [0.2, 1, 104, 56, { bend: -0.04, fold: 0.9, curl: -0.03 }],
      [0.32, -1, 128, 46, { bend: 0.05, fold: 0.62 }],
      [0.44, 1, 92, 52, { bend: -0.03, fold: 0.86 }],
      [0.56, -1, 112, 44, { bend: 0.04, fold: 0.7, curl: 0.03 }],
      [0.68, 1, 76, 48, { bend: -0.03, fold: 0.9 }],
      [0.79, -1, 84, 40, { bend: 0.03, fold: 0.76 }],
      [0.89, 1, 56, 36, { bend: -0.02, teeth: 0, veins: 0 }],
    ],
    bud: 46,
  };
})();

function branchFile(name, design) {
  const { groups, stem, box } = foliage(name, design);
  const pad = 4;
  const view = [
    box.minX - pad,
    box.minY - pad,
    box.maxX - box.minX + pad * 2,
    box.maxY - box.minY + pad * 2,
  ];
  writeFileSync(
    join(OUT, `${name}.svg`),
    svg(view.map((value) => round(value, 1)).join(' '), groups, `<path d="${stem}"/>`),
  );
  return { name, ratio: ratioOf(view[2], view[3]), view, note: cutEnd(view) };
}

/** Where the cut end of a branch (0, 0) sits in its drawing, for `transform-origin`. */
const cutEnd = ([x, y, width, height]) =>
  `cut end at ${fixed((-x / width) * 100, 0.1)}% ${fixed((-y / height) * 100, 0.1)}%`;

/**
 * The arc branch in a square centred on its circle, so the page can lay it over the moon gate and
 * turn it about the gate's centre. Reports where the cut end sits (for `transform-origin`).
 */
function arcFile(name) {
  const { groups, stem, box } = foliage(name, ARC);
  const half = Math.ceil(Math.max(-box.minX, box.maxX, -box.minY, box.maxY) + 4);
  writeFileSync(
    join(OUT, `${name}.svg`),
    svg(`${-half} ${-half} ${half * 2} ${half * 2}`, groups, `<path d="${stem}"/>`),
  );
  const [bx, by] = ARC.curve(0);
  return {
    name,
    ratio: 1,
    note: `circle radius ${fixed((ARC.radius / (half * 2)) * 100, 0.1)}% of the square, ${cutEnd([-half - bx, -half - by, half * 2, half * 2])}`,
  };
}

/**
 * The straight branch out of focus, as a small raster mask: blurred, then enlarged by the page,
 * which softens it further. Used for the nearest foliage and for soft shadows of leaves.
 */
async function softBranch(name, view) {
  const { groups, stem } = foliage(`${name}-flat`, { ...BRANCH, veins: false });
  const width = 180;
  const scale = width / view[2];
  const height = Math.round(view[3] * scale);
  const blur = 2.4;
  const pad = Math.ceil(blur * 3);
  const canvasWidth = width + pad * 2;
  const canvasHeight = height + pad * 2;
  const padUnits = pad / scale;
  const source = svg(
    [view[0] - padUnits, view[1] - padUnits, view[2] + padUnits * 2, view[3] + padUnits * 2]
      .map((value) => round(value, 1))
      .join(' '),
    groups,
    `<path d="${stem}"/>`,
  ).replace('<svg ', `<svg width="${canvasWidth}" height="${canvasHeight}" `);
  const alpha = await sharp(Buffer.from(source))
    .resize(canvasWidth, canvasHeight)
    .ensureAlpha()
    .extractChannel(3)
    .blur(blur)
    .raw()
    .toBuffer();
  await maskImage(alpha, canvasWidth, canvasHeight).toFile(join(OUT, `${name}.webp`));
  const padded = [
    view[0] - padUnits,
    view[1] - padUnits,
    view[2] + padUnits * 2,
    view[3] + padUnits * 2,
  ];
  return {
    name,
    ratio: ratioOf(canvasWidth, canvasHeight),
    note: `${canvasWidth}×${canvasHeight}, ${cutEnd(padded)}`,
  };
}

/** A raster mask: black, with the given alpha channel (the page supplies the colour). */
function maskImage(alpha, width, height, rgb = [0, 0, 0]) {
  const data = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    data[index * 4] = rgb[0];
    data[index * 4 + 1] = rgb[1];
    data[index * 4 + 2] = rgb[2];
    data[index * 4 + 3] = alpha[index];
  }
  return sharp(data, { raw: { width, height, channels: 4 } }).webp({
    quality: 80,
    alphaQuality: 72,
    effort: 6,
  });
}

/* ----------------------------------------------------------------------------------- Ridges */

/** Smooth maximum: like Math.max, but rounds the valley where two slopes meet. */
const smoothMax = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.max(a, b) + (h * h * k) / 4;
};

/**
 * A range of rounded karst peaks: each peak has its own height and slopes (steeper on one side),
 * neighbours merge in rounded saddles, a low rolling foot joins them, and the outline has a fine
 * irregular edge, like a brushed silhouette. Closed along the bottom of the drawing.
 */
function range({ peaks, from, to, bottom, roughness, seed }) {
  const noise = periodicNoise(seed);
  const points = [];
  for (let x = from; x <= to; x += 4) {
    // The foot runs out towards the empty centre; the outer end continues past the edge.
    const taper =
      (from > 0 ? smoothstep(from, from + 90, x) : 1) *
      (to < 1600 ? 1 - smoothstep(to - 90, to, x) : 1);
    let lift = (26 + 22 * fbm(noise, x / 140, 7.5, 64, 3)) * taper;
    for (const peak of peaks) {
      const side = x < peak.x ? peak.left : peak.right;
      const t = Math.abs(x - peak.x) / side;
      if (t < 1)
        lift = smoothMax(
          lift,
          peak.height * (1 - t ** (peak.round ?? 2)) ** (peak.steep ?? 1.8),
          34,
        );
    }
    const edge = fbm(noise, x / 34, 0.5, 64, 4) + 0.35 * fbm(noise, x / 8, 3.5, 256, 2);
    points.push([x, bottom - lift + roughness * edge * (0.5 + lift / 320)]);
  }
  return `${pathFrom([[from, bottom], ...points, [to, bottom]], 1)}Z`;
}

/**
 * Far and near ranges for the hero, each a file of its own (the page fades them separately).
 * Drawn 1600 × 440 and stretched to the hero: peaks either side, the centre left empty for the
 * headline, as the empty sky in a shan shui painting. Each layer darkens towards its crests and
 * dissolves into mist at its foot; the far one is paler and softer.
 */
function ridges() {
  const width = 1600;
  const height = 440;
  const peak = (x, h, left, right, steep, round) => ({ x, height: h, left, right, steep, round });
  const layers = {
    'ridges-far': {
      fade: [96, 0.6, 372],
      blur: 3,
      ranges: [
        {
          from: 0,
          to: 660,
          seed: 11,
          peaks: [
            peak(18, 306, 120, 150, 1.5),
            peak(142, 214, 64, 92, 2),
            peak(252, 268, 96, 118, 2.3, 2.2),
            peak(366, 172, 88, 76),
            peak(446, 206, 66, 112, 2.5, 2.4),
            peak(570, 108, 98, 120),
          ],
        },
        {
          from: 940,
          to: 1600,
          seed: 12,
          peaks: [
            peak(1036, 98, 110, 88),
            peak(1150, 192, 104, 66, 2.5, 2.3),
            peak(1242, 148, 70, 92),
            peak(1352, 262, 112, 98, 2.2),
            peak(1462, 206, 76, 92, 2),
            peak(1582, 312, 142, 120, 1.5),
          ],
        },
      ],
    },
    'ridges-near': {
      fade: [228, 1, 436],
      blur: 1.4,
      ranges: [
        {
          from: 0,
          to: 580,
          seed: 21,
          peaks: [
            peak(66, 150, 120, 86, 1.7),
            peak(172, 206, 78, 112, 2.3, 2.2),
            peak(302, 128, 92, 78),
            peak(384, 152, 58, 92, 2.5, 2.4),
            peak(496, 70, 92, 84),
          ],
        },
        {
          from: 1020,
          to: 1600,
          seed: 22,
          peaks: [
            peak(1106, 62, 84, 92),
            peak(1202, 140, 92, 58, 2.5, 2.4),
            peak(1292, 112, 72, 92),
            peak(1424, 202, 112, 88, 2.3, 2.2),
            peak(1544, 158, 80, 124, 1.7),
          ],
        },
      ],
    },
  };
  for (const [name, { fade, blur, ranges }] of Object.entries(layers)) {
    const [top, opacity, foot] = fade;
    const paths = ranges
      .map((options) => `<path d="${range({ ...options, bottom: height, roughness: 6 })}"/>`)
      .join('');
    writeFileSync(
      join(OUT, `${name}.svg`),
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none"><defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="0" y1="${top}" x2="0" y2="${foot}"><stop offset="0" stop-opacity="${opacity}"/><stop offset="0.55" stop-opacity="${round(opacity * 0.42, 0.01)}"/><stop offset="1" stop-opacity="0"/></linearGradient><filter id="f" x="-2%" y="-5%" width="104%" height="110%"><feGaussianBlur stdDeviation="${blur}"/></filter></defs><g fill="url(#g)" filter="url(#f)">${paths}</g></svg>\n`,
    );
  }
  return [{ name: 'ridges-far / ridges-near', note: `${width}×${height}, stretched` }];
}

/* ------------------------------------------------------------------------------------- Mist */

/**
 * A long band of mist that tiles seamlessly along x: its centre line and thickness wander along
 * the band, and fractal noise stretched sideways breaks it into denser drifts and thin streaks.
 * The alpha channel is the mist; the colour is ivory, so the page can use it as a background.
 */
async function mist(name, { width, height, seed, thickness, wander, cells, floor, density }) {
  const noise = periodicNoise(seed);
  const alpha = Buffer.alloc(width * height);
  for (let px = 0; px < width; px += 1) {
    const u = px / width;
    const centre = 0.5 + wander * fbm(noise, u * 3, 0.37, 3, 3);
    const half = thickness * (1 + 0.7 * fbm(noise, u * 5, 3.71, 5, 2));
    for (let py = 0; py < height; py += 1) {
      const v = py / height;
      const distance = (v - centre) / Math.max(0.03, half);
      const envelope =
        Math.exp(-distance * distance * 1.6) *
        smoothstep(0, 0.18, v) *
        (1 - smoothstep(0.82, 1, v));
      const body = fbm(noise, u * cells[0], v * cells[1] + 9.1, cells[0], 4, 0.55);
      const drift = smoothstep(density[0], density[1], 0.5 + body * 1.5);
      const value = envelope * (floor + (1 - floor) * drift);
      alpha[py * width + px] = Math.round(255 * Math.min(1, value));
    }
  }
  await maskImage(alpha, width, height, [252, 250, 244]).toFile(join(OUT, `${name}.webp`));
  return { name, note: `${width}×${height}, tiles along x` };
}

/* ------------------------------------------------------------------------------------ Light */

/**
 * Gentle unevenness for a pool of light, as sunlight has through leaves and mist: soft fractal
 * noise between 82 % and 100 %, used as a mask over a smooth radial gradient. A radial this faint
 * on a plain background shows rings on an 8-bit screen; varied a little, it does not. Alpha only.
 */
async function lightPool(name, { size, seed }) {
  const noise = periodicNoise(seed);
  const alpha = Buffer.alloc(size * size);
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const mottle = fbm(noise, px / (size / 3), py / (size / 3) + 31.7, 256, 3, 0.5);
      alpha[py * size + px] = Math.round(255 * Math.min(1, Math.max(0, 0.91 + 0.26 * mottle)));
    }
  }
  await maskImage(alpha, size, size).toFile(join(OUT, `${name}.webp`));
  return { name, note: `${size}×${size}` };
}

/**
 * Shafts of morning sun falling down and to the left from a sun at the top right corner: soft
 * wedges of pale gold (blurred), fading in near the sun and out with distance. A ready-made image,
 * so the page draws it without a mask (the page sets its overall strength with `opacity`).
 */
function sunRays(name) {
  const size = 1000;
  // Direction (degrees clockwise from "up", as in CSS), half-width in degrees, strength.
  const shafts = [
    [194.5, 1.6, 1],
    [207.5, 2.6, 0.55],
    [217.5, 1.4, 1],
    [230, 2.8, 0.6],
    [246, 1.6, 1],
    [258.5, 2.6, 0.5],
  ];
  const point = (degrees, radius) => {
    const angle = (degrees * Math.PI) / 180;
    return [size + Math.sin(angle) * radius, -Math.cos(angle) * radius];
  };
  const reach = size * 1.45;
  const wedges = shafts
    .map(([direction, half, alpha]) => {
      const [ax, ay] = point(direction - half, reach);
      const [bx, by] = point(direction + half, reach);
      return `<path d="M${size} 0L${round(ax, 1)} ${round(ay, 1)}L${round(bx, 1)} ${round(by, 1)}Z" fill-opacity="${alpha}"/>`;
    })
    .join('');
  writeFileSync(
    join(OUT, `${name}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}"><defs><radialGradient id="r" gradientUnits="userSpaceOnUse" cx="${size}" cy="0" r="${size}"><stop offset="0.03" stop-color="#f5e4a1" stop-opacity="0"/><stop offset="0.16" stop-color="#f5e4a1"/><stop offset="0.52" stop-color="#f5e4a1" stop-opacity="0.5"/><stop offset="0.94" stop-color="#f5e4a1" stop-opacity="0"/></radialGradient><filter id="b" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="9"/></filter><mask id="m"><g fill="#fff" filter="url(#b)">${wedges}</g></mask></defs><rect width="${size}" height="${size}" fill="url(#r)" mask="url(#m)"/></svg>\n`,
  );
  return { name, note: `${shafts.length} shafts` };
}

mkdirSync(OUT, { recursive: true });
const branch = branchFile('branch', BRANCH);
const results = [
  single('leaf-broad', {
    length: 180,
    width: 43,
    base: 0.85,
    taper: 1.35,
    bend: -0.03,
    sway: -0.01,
    curl: -0.02,
    asymmetry: 0.08,
    teeth: 26,
    tip: 0.34,
    seed: 2.1,
  }),
  sprig('sprig'),
  branch,
  arcFile('branch-arc'),
  await softBranch('branch-soft', branch.view),
  ...ridges(),
  await mist('mist-band', {
    width: 800,
    height: 112,
    seed: 5,
    thickness: 0.21,
    wander: 0.15,
    cells: [6, 4.4],
    floor: 0.36,
    density: [0.24, 0.86],
  }),
  await lightPool('light', { size: 160, seed: 17 }),
  sunRays('rays'),
  await mist('mist-wisps', {
    width: 800,
    height: 72,
    seed: 9,
    thickness: 0.13,
    wander: 0.2,
    cells: [8, 4],
    floor: 0.12,
    density: [0.38, 0.88],
  }),
];
console.log(
  results
    .map(({ name, ratio, note }) =>
      [name, ratio ? `aspect ${ratio}` : '', note ?? ''].filter(Boolean).join(': '),
    )
    .join('\n'),
);
