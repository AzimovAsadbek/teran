/**
 * Draws the botanical shapes the category art uses (src/styles/category-art.css) into
 * public/brand/botanical/: a sprig, a branch and the branch out of focus.
 *
 * These are original illustrations drawn in code for the website, not TERAN packaging artwork.
 *
 * - Leaves follow the tea plant (Camellia sinensis): an elliptic blade with a wedge-shaped base,
 *   a drawn-out tip, fine forward-pointing serrations and lateral veins that curve towards the
 *   tip. Veins are cut out of the silhouette with an SVG mask, so the files work as CSS masks: the
 *   page colours them with the brand palette.
 * - The branch carries alternate leaves that shrink towards "one bud, two leaves" at the tip;
 *   `branch-soft.webp` is the branch out of focus, for the nearest foliage.
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

mkdirSync(OUT, { recursive: true });
const branch = branchFile('branch', BRANCH);
const results = [sprig('sprig'), branch, await softBranch('branch-soft', branch.view)];
console.log(
  results
    .map(({ name, ratio, note }) =>
      [name, ratio ? `aspect ${ratio}` : '', note ?? ''].filter(Boolean).join(': '),
    )
    .join('\n'),
);
