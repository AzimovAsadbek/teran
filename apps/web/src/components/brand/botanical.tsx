import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';

/*
 * Botanical atmosphere: a tea garden at dawn behind selected storefront sections (styles in
 * src/styles/botanical.css). Shapes and textures are original drawings made in code for the
 * website (scripts/botanical/generate-botanical.mjs), not TERAN packaging artwork.
 *
 * Each scene is composed in depth for its section, back to front:
 * - ridges: far karst ranges either side of the headline, dissolving into mist (hero only);
 * - mist: long irregular bands, each drifting endlessly at its own speed, height and direction;
 *   the farthest only sways and thins;
 * - light: warm glows (over the painted hero they slowly brighten, fade and wander; on plain
 *   backgrounds they stay still), shafts of morning sun, a halo behind the moon gate;
 * - leaves: tea branches and sprigs at the edges, swaying from their cut ends, and soft shadows of
 *   branches falling on cream sections.
 * Durations are all different, so nothing moves in step or visibly repeats. Headings, prices,
 * photos and controls are always in front and clear of foliage, and the scene is finished when
 * still: below 1024 px and with reduced motion nothing moves. Server-rendered, no script. Cart,
 * checkout, account, sign-in and admin pages have none of it.
 */

/** Shown on every screen (default), only from 1024 px, or only below it. */
type Screens = 'all' | 'wide' | 'narrow';

/**
 * A slow motion: seconds per cycle (per half cycle for a back-and-forth); a negative delay starts
 * it part-way through, so nothing begins in step.
 */
interface Cycle {
  duration: number;
  delay?: number;
}

interface Ridge {
  layer: 'far' | 'near';
  /** The band of the layer the ranges are stretched over. */
  top: string;
  height: string;
  /** Overhang on each side (a negative inset), to keep the peaks in proportion on phones. */
  overhang?: string;
  opacity: number;
  screens?: Screens;
}

interface Mist {
  texture: 'band' | 'wisps';
  /** Centre line and thickness of the band. */
  y: string;
  height: string;
  /** Where the band starts and how wide it is (full width by default; narrower bands fade). */
  left?: string;
  span?: string;
  /** One repeat of the texture: at least the band's width, so no repeat is ever in view. */
  tile?: string;
  /** Start part-way along the texture (0–1), so two bands of one texture never look alike. */
  shift?: number;
  /** `ivory`: morning mist over the painted landscape; `sage`: a faint veil on white sections. */
  tone: 'ivory' | 'sage';
  opacity: number;
  /** Endless drift: seconds per tile, to the left (-1) or right (1). */
  drift?: Cycle & { direction: -1 | 1 };
  /** Or a slow sway either side of rest, in percent of the layer's width (distant mist). */
  glide?: Cycle & { distance: number };
  /** Thins to `to` × opacity and back, on a cycle of its own (only with `drift` or `glide`). */
  thin?: Cycle & { to: number };
  screens?: Screens;
}

interface Light {
  /**
   * `glow`: a smooth radial (over the painted hero); `pool`: light of gently uneven strength, for
   * plain backgrounds, where a smooth radial this faint would show rings; `halo`: brightest just
   * outside a ring; `rays`: shafts of sun falling down and to the left (a drawing in pale gold,
   * whatever the tone).
   */
  kind?: 'glow' | 'pool' | 'halo' | 'rays';
  tone: 'gold' | 'amber' | 'sun' | 'sage';
  x: string;
  y: string;
  size: string;
  opacity: number;
  /** Fades to `to` × opacity and back. */
  breathe?: Cycle & { to: number };
  /** Moves by [x, y] percent of its own size and back. */
  wander?: Cycle & { by: [number, number] };
  screens?: Screens;
}

type Shape = 'broad' | 'sprig' | 'branch' | 'soft' | 'arc';
type Tone = 'forest' | 'deep' | 'sage' | 'fresh' | 'pale' | 'shadow';

interface Leaf {
  /** `soft` is the branch out of focus: the nearest foliage, or (with tone `shadow`) a shadow. */
  shape: Shape;
  /** Centre of the drawing within the layer; any CSS length, e.g. "12%" or "calc(50% + 20rem)". */
  x: string;
  y: string;
  /** Height of the drawing before rotation. */
  length: string;
  rotate: number;
  flip?: boolean;
  tone: Tone;
  opacity: number;
  /** Turns ± `turn` degrees about the cut end. */
  sway?: Cycle & { turn: number };
  /**
   * Drifts down through the whole layer from `y` (just above it) on a swaying path: `swing` percent
   * of the layer's width to one side and back to the other (negative starts the other way), tilting
   * `tilt` degrees with each sway. One animation per leaf, the whole fall long, so the compositor
   * runs it without waking the page. Falling leaves are shown only while they move (wide screens,
   * motion allowed).
   */
  fall?: Cycle & { swing: number; tilt: number };
  screens?: Screens;
}

interface Scene {
  ridges?: Ridge[];
  mists?: Mist[];
  lights?: Light[];
  leaves?: Leaf[];
  /** Clip to the section sideways, for branches that reach past its edges. */
  clip?: boolean;
}

const SCENES = {
  /*
   * Home hero background (deep green): far ranges low across the garden, two thin bands of mist
   * drifting through it, and shafts of morning sun from beyond the top right corner. The words on
   * the left stay on calm, dark ground.
   */
  heroNight: {
    ridges: [
      { layer: 'far', top: '50%', height: '50%', opacity: 0.1, screens: 'wide' },
      { layer: 'near', top: '58%', height: '42%', opacity: 0.12, screens: 'wide' },
      {
        layer: 'far',
        top: '62%',
        height: '38%',
        overhang: '-40%',
        opacity: 0.1,
        screens: 'narrow',
      },
    ],
    mists: [
      {
        texture: 'band',
        y: '84%',
        height: '22%',
        tone: 'ivory',
        opacity: 0.1,
        drift: { duration: 97, delay: -40, direction: -1 },
        thin: { duration: 43, delay: -11, to: 0.55 },
        screens: 'wide',
      },
      {
        texture: 'wisps',
        y: '64%',
        height: '9%',
        shift: 0.4,
        tone: 'ivory',
        opacity: 0.12,
        drift: { duration: 71, delay: -23, direction: 1 },
        thin: { duration: 29, delay: -6, to: 0.4 },
        screens: 'wide',
      },
    ],
    lights: [
      {
        kind: 'rays',
        tone: 'sun',
        x: '100%',
        y: '-6%',
        size: '86cqh',
        opacity: 0.32,
        breathe: { duration: 37, delay: -9, to: 0.45 },
        screens: 'wide',
      },
    ],
  },

  /*
   * Behind the products on the stage: two small, distant leaves drifting down behind the pack, and
   * mist at the foot of the moon gate, spreading beyond it into the garden.
   */
  stageBack: {
    mists: [
      {
        texture: 'band',
        y: '86%',
        height: '20%',
        left: '-12%',
        span: '124%',
        tile: '124cqw',
        tone: 'ivory',
        opacity: 0.34,
        drift: { duration: 83, delay: -30, direction: 1 },
        thin: { duration: 31, delay: -13, to: 0.6 },
        screens: 'wide',
      },
    ],
    leaves: [
      {
        shape: 'broad',
        x: '40%',
        y: '-4%',
        length: '1.5rem',
        rotate: 24,
        tone: 'pale',
        opacity: 0.32,
        fall: { duration: 34, delay: -8, swing: 5, tilt: 26 },
      },
      {
        shape: 'broad',
        x: '62%',
        y: '-4%',
        length: '1.25rem',
        rotate: -40,
        tone: 'pale',
        opacity: 0.26,
        fall: { duration: 41, delay: -27, swing: -4, tilt: 30 },
      },
    ],
  },

  /*
   * In front of the products, at the sides only, so the pack is never covered: a near leaf
   * drifting down on each side and a branch out of focus reaching in from the top right corner.
   */
  stageFront: {
    clip: true,
    leaves: [
      {
        shape: 'broad',
        x: '7%',
        y: '-6%',
        length: '2.5rem',
        rotate: -18,
        tone: 'sage',
        opacity: 0.8,
        fall: { duration: 27, delay: -4, swing: 3.5, tilt: 24 },
      },
      {
        shape: 'broad',
        x: '93%',
        y: '-6%',
        length: '2.1rem',
        rotate: 52,
        flip: true,
        tone: 'sage',
        opacity: 0.7,
        fall: { duration: 31, delay: -19, swing: -3, tilt: 28 },
      },
      {
        shape: 'soft',
        x: '96%',
        y: '4%',
        length: '19rem',
        rotate: 204,
        tone: 'pale',
        opacity: 0.14,
        sway: { duration: 12, delay: -5, turn: 2.2 },
        screens: 'wide',
      },
    ],
  },

  /* Inside the moon gate: bands of mist drifting slowly across the painted lake. */
  gate: {
    mists: [
      {
        texture: 'band',
        y: '60%',
        height: '22%',
        tone: 'ivory',
        opacity: 0.62,
        drift: { duration: 68, delay: -21, direction: -1 },
        thin: { duration: 33, delay: -8, to: 0.6 },
      },
      {
        texture: 'wisps',
        y: '76%',
        height: '12%',
        shift: 0.55,
        tone: 'ivory',
        opacity: 0.5,
        drift: { duration: 47, delay: -12, direction: 1 },
        thin: { duration: 23, delay: -4, to: 0.5 },
        screens: 'wide',
      },
    ],
  },

  /*
   * Inside the moon gate's frame: warm light behind it, brightest just outside the rim, ground
   * mist drifting beneath it (wide screens), a branch following the circle on its lower left and a
   * sprig at its upper right.
   */
  story: {
    lights: [
      { kind: 'pool', tone: 'gold', x: '50%', y: '50%', size: '150%', opacity: 0.13 },
      {
        kind: 'halo',
        tone: 'sun',
        x: '50%',
        y: '50%',
        size: '128%',
        opacity: 0.85,
        breathe: { duration: 29, delay: -8, to: 0.45 },
      },
    ],
    mists: [
      {
        texture: 'band',
        y: '93%',
        height: '24%',
        left: '-38%',
        span: '156%',
        tile: '160cqw',
        tone: 'sage',
        opacity: 0.42,
        drift: { duration: 71, delay: -22, direction: -1 },
        thin: { duration: 31, delay: -6, to: 0.6 },
        screens: 'wide',
      },
    ],
    leaves: [
      {
        shape: 'arc',
        x: '50%',
        y: '50%',
        length: '134%',
        rotate: -8,
        tone: 'forest',
        opacity: 0.34,
        sway: { duration: 19, delay: -7, turn: 1.4 },
      },
      {
        shape: 'sprig',
        x: '93%',
        y: '9%',
        length: '30%',
        rotate: 38,
        tone: 'sage',
        opacity: 0.3,
        sway: { duration: 13, delay: -3, turn: 2.2 },
      },
    ],
  },

  /* The far corners of the philosophy section: soft shadows of branches on the white (wide). */
  storyEdges: {
    clip: true,
    leaves: [
      {
        shape: 'soft',
        x: '2%',
        y: '22%',
        length: '30rem',
        rotate: 132,
        tone: 'shadow',
        opacity: 0.07,
        sway: { duration: 23, delay: -10, turn: 1.3 },
        screens: 'wide',
      },
      {
        shape: 'soft',
        x: '98.5%',
        y: '84%',
        length: '26rem',
        rotate: -36,
        tone: 'shadow',
        opacity: 0.06,
        sway: { duration: 27, delay: -16, turn: 1.1 },
        screens: 'wide',
      },
    ],
  },

  /*
   * The home brewing section: warmer and closer. Amber light pools behind the heading, the shadow
   * of a branch falls across the top left as if from a window, a branch reaches in at the lower
   * left and a sprig at the upper right. No mist on cream: it would read as a smudge.
   */
  brewing: {
    clip: true,
    lights: [
      {
        kind: 'pool',
        tone: 'amber',
        x: '16%',
        y: '58%',
        size: '46rem',
        opacity: 0.1,
        screens: 'wide',
      },
      {
        kind: 'pool',
        tone: 'gold',
        x: '88%',
        y: '12%',
        size: '36rem',
        opacity: 0.08,
        screens: 'wide',
      },
      {
        kind: 'pool',
        tone: 'amber',
        x: '20%',
        y: '30%',
        size: '26rem',
        opacity: 0.08,
        screens: 'narrow',
      },
    ],
    leaves: [
      {
        shape: 'soft',
        x: '1.5%',
        y: '4%',
        length: '23rem',
        rotate: 132,
        tone: 'shadow',
        opacity: 0.065,
        sway: { duration: 21, delay: -6, turn: 1.4 },
        screens: 'wide',
      },
      {
        shape: 'branch',
        x: '1.5%',
        y: '88%',
        length: '13rem',
        rotate: 38,
        tone: 'sage',
        opacity: 0.24,
        sway: { duration: 16, delay: -11, turn: 1.6 },
        screens: 'wide',
      },
      {
        shape: 'sprig',
        x: '97%',
        y: '8%',
        length: '6.5rem',
        rotate: -32,
        tone: 'forest',
        opacity: 0.18,
        screens: 'wide',
      },
      {
        shape: 'sprig',
        x: '94%',
        y: '4%',
        length: '4.5rem',
        rotate: -40,
        tone: 'sage',
        opacity: 0.16,
        screens: 'narrow',
      },
    ],
  },

  /*
   * About and Journal headers: light and selective. Warm light at the upper right, a soft
   * cream-to-sage wash rising from the lower left, the shadow of a branch at the right edge and a
   * still sprig in the lower left corner.
   */
  editorial: {
    clip: true,
    lights: [
      {
        kind: 'pool',
        tone: 'gold',
        x: '86%',
        y: '22%',
        size: '34rem',
        opacity: 0.09,
        screens: 'wide',
      },
      { kind: 'pool', tone: 'sage', x: '8%', y: '100%', size: '52rem', opacity: 0.4 },
      {
        kind: 'pool',
        tone: 'gold',
        x: '96%',
        y: '6%',
        size: '22rem',
        opacity: 0.08,
        screens: 'narrow',
      },
    ],
    leaves: [
      {
        shape: 'soft',
        x: '99%',
        y: '42%',
        length: '22rem',
        rotate: -148,
        tone: 'shadow',
        opacity: 0.06,
        sway: { duration: 25, delay: -9, turn: 1 },
        screens: 'wide',
      },
      {
        shape: 'sprig',
        x: '2.5%',
        y: '80%',
        length: '7rem',
        rotate: 26,
        tone: 'sage',
        opacity: 0.16,
        screens: 'wide',
      },
      {
        shape: 'broad',
        x: '94%',
        y: '5%',
        length: '2.4rem',
        rotate: -40,
        tone: 'sage',
        opacity: 0.14,
        screens: 'narrow',
      },
    ],
  },

  /* The partnership band (dark green): sunlight in its upper corner, fog low over its foot. */
  business: {
    clip: true,
    lights: [{ kind: 'pool', tone: 'gold', x: '86%', y: '6%', size: '38rem', opacity: 0.13 }],
    mists: [
      {
        texture: 'band',
        y: '97%',
        height: '30%',
        shift: 0.2,
        tone: 'ivory',
        opacity: 0.09,
        drift: { duration: 79, delay: -25, direction: 1 },
        screens: 'wide',
      },
    ],
    leaves: [
      {
        shape: 'soft',
        x: '95%',
        y: '10%',
        length: '17rem',
        rotate: 214,
        tone: 'pale',
        opacity: 0.12,
        sway: { duration: 15, delay: -5, turn: 1.8 },
        screens: 'wide',
      },
    ],
  },

  /*
   * The gallery's dark band (home page and the archive): the quietest dark scene, so photographs
   * stay the subject. Warm light in the upper left corner, behind the heading; a long, faint bank
   * of mist far below the pictures; a branch out of focus beyond the right edge. Nothing passes over
   * a picture.
   */
  gallery: {
    clip: true,
    lights: [{ kind: 'pool', tone: 'gold', x: '6%', y: '2%', size: '34rem', opacity: 0.1 }],
    mists: [
      {
        texture: 'band',
        y: '100%',
        height: '22%',
        shift: 0.6,
        tone: 'ivory',
        opacity: 0.06,
        drift: { duration: 113, delay: -47, direction: -1 },
        screens: 'wide',
      },
    ],
    leaves: [
      {
        shape: 'soft',
        x: '99%',
        y: '36%',
        length: '15rem',
        rotate: 236,
        tone: 'pale',
        opacity: 0.09,
        sway: { duration: 23, delay: -9, turn: 1.4 },
        screens: 'wide',
      },
    ],
  },

  /*
   * Catalogue and collection headers: still, beside the title only (nothing moves behind grids or
   * filters). Warm light and a branch, wide screens only. Heights are absolute so they stay level
   * with the title however tall the chip rows grow.
   */
  listing: {
    // Sized in percent of the header so the light never reaches past the page edge.
    lights: [
      {
        kind: 'pool',
        tone: 'gold',
        x: '84%',
        y: '3.5rem',
        size: '24%',
        opacity: 0.07,
        screens: 'wide',
      },
    ],
    leaves: [
      {
        shape: 'branch',
        x: '94%',
        y: '4.4rem',
        length: '9.5rem',
        rotate: 24,
        tone: 'sage',
        opacity: 0.2,
        screens: 'wide',
      },
    ],
  },

  /*
   * Product pages, the lightest touch (wide screens): warm light behind the gallery and the soft,
   * still shadow of a branch in the space beneath it. The photo stays the brightest thing.
   */
  product: {
    lights: [
      {
        kind: 'pool',
        tone: 'gold',
        x: '26%',
        y: '22%',
        size: '46rem',
        opacity: 0.07,
        screens: 'wide',
      },
    ],
    leaves: [
      {
        shape: 'soft',
        x: '5%',
        y: '86%',
        length: '24rem',
        rotate: 28,
        tone: 'shadow',
        opacity: 0.05,
        screens: 'wide',
      },
      {
        shape: 'sprig',
        x: '7%',
        y: '93%',
        length: '8rem',
        rotate: 24,
        tone: 'sage',
        opacity: 0.12,
        screens: 'wide',
      },
    ],
  },
} satisfies Record<string, Scene>;

export type BotanicalScene = keyof typeof SCENES;

const SCREEN_CLASS = { all: undefined, wide: 'botanical-wide', narrow: 'botanical-narrow' };

const seconds = (value: number | undefined) => `${value ?? 0}s`;

function MistBand({ mist }: { mist: Mist }) {
  const tile = mist.tile ?? '100cqw';
  return (
    <span
      className={cn(
        'botanical-mist',
        `botanical-mist--${mist.texture}`,
        mist.tone === 'sage' && 'botanical-mist--sage',
        mist.span && 'botanical-mist--fade',
        SCREEN_CLASS[mist.screens ?? 'all'],
      )}
      style={
        {
          '--y': mist.y,
          '--height': mist.height,
          '--left': mist.left,
          '--span': mist.span,
        } as CSSProperties
      }
    >
      <span
        className={cn(
          mist.drift && 'botanical-drift',
          mist.glide && 'botanical-glide',
          mist.thin && 'botanical-thin',
        )}
        style={
          {
            '--opacity': mist.opacity,
            ...(mist.thin && {
              '--breathe-duration': seconds(mist.thin.duration),
              '--breathe-delay': seconds(mist.thin.delay),
              '--thin': mist.thin.to,
            }),
            '--tile': tile,
            '--shift': mist.shift,
            // A band drifting right starts one tile to the left, and a swaying band half a tile,
            // so the band is covered from end to end wherever the strip has moved.
            '--start':
              mist.drift?.direction === 1
                ? `calc(${tile} * -1)`
                : mist.glide
                  ? `calc(${tile} * -0.5)`
                  : undefined,
            ...(mist.drift && {
              '--duration': seconds(mist.drift.duration),
              '--delay': seconds(mist.drift.delay),
              '--direction': mist.drift.direction,
            }),
            ...(mist.glide && {
              '--duration': seconds(mist.glide.duration),
              '--delay': seconds(mist.glide.delay),
              '--distance': `${mist.glide.distance}cqw`,
            }),
          } as CSSProperties
        }
      />
    </span>
  );
}

function LightGlow({ light }: { light: Light }) {
  return (
    <span
      className={cn(
        'botanical-light',
        `botanical-light--${light.tone}`,
        light.kind && light.kind !== 'glow' && `botanical-light--${light.kind}`,
        light.breathe && 'botanical-breathe',
        light.wander && 'botanical-wander',
        SCREEN_CLASS[light.screens ?? 'all'],
      )}
      style={
        {
          '--x': light.x,
          '--y': light.y,
          '--size': light.size,
          '--opacity': light.opacity,
          ...(light.breathe && {
            '--breathe-duration': seconds(light.breathe.duration),
            '--breathe-delay': seconds(light.breathe.delay),
            '--thin': light.breathe.to,
          }),
          ...(light.wander && {
            '--duration': seconds(light.wander.duration),
            '--delay': seconds(light.wander.delay),
            '--wander-x': `${light.wander.by[0]}%`,
            '--wander-y': `${light.wander.by[1]}%`,
          }),
        } as CSSProperties
      }
    />
  );
}

export function BotanicalLayer({
  scene,
  className,
}: {
  scene: BotanicalScene;
  /** Stacking and extent within the section, e.g. "-z-10". */
  className?: string;
}) {
  const {
    ridges = [],
    mists = [],
    lights = [],
    leaves = [],
    clip = false,
  } = SCENES[scene] as Scene;
  // Still light is drawn before the mist: it then merges with the background, so only the pieces
  // that move become layers of their own for the compositor (fewer layers to blend each frame).
  const still = lights.filter((light) => !light.breathe && !light.wander);
  const moving = lights.filter((light) => light.breathe || light.wander);
  return (
    <div
      aria-hidden
      className={cn('botanical', clip && 'botanical--clip', className)}
      data-botanical={scene}
    >
      {ridges.map((ridge, index) => (
        <span
          key={`ridge-${index}`}
          className={cn(
            'botanical-ridge',
            `botanical-ridge--${ridge.layer}`,
            SCREEN_CLASS[ridge.screens ?? 'all'],
          )}
          style={
            {
              '--top': ridge.top,
              '--height': ridge.height,
              '--overhang': ridge.overhang,
              '--opacity': ridge.opacity,
            } as CSSProperties
          }
        />
      ))}
      {still.map((light, index) => (
        <LightGlow key={`light-${index}`} light={light} />
      ))}
      {mists.map((mist, index) => (
        <MistBand key={`mist-${index}`} mist={mist} />
      ))}
      {moving.map((light, index) => (
        <LightGlow key={`moving-${index}`} light={light} />
      ))}
      {leaves.map((leaf, index) =>
        leaf.fall ? (
          <span
            key={`leaf-${index}`}
            className={cn('botanical-fall', SCREEN_CLASS[leaf.screens ?? 'all'])}
            style={
              {
                '--x': leaf.x,
                '--y': leaf.y,
                '--fall-duration': seconds(leaf.fall.duration),
                '--fall-delay': seconds(leaf.fall.delay),
                '--swing': `${leaf.fall.swing}cqw`,
                '--tilt': `${leaf.fall.tilt}deg`,
              } as CSSProperties
            }
          >
            <LeafShape leaf={leaf} />
          </span>
        ) : (
          <LeafShape key={`leaf-${index}`} leaf={leaf} />
        ),
      )}
    </div>
  );
}

function LeafShape({ leaf }: { leaf: Leaf }) {
  return (
    <span
      className={cn(
        'botanical-leaf',
        `botanical-leaf--${leaf.shape}`,
        leaf.tone === 'shadow' && 'botanical-leaf--shadow',
        // A falling leaf's wrapper carries the breakpoint class.
        !leaf.fall && SCREEN_CLASS[leaf.screens ?? 'all'],
      )}
      style={
        {
          '--x': leaf.x,
          '--y': leaf.y,
          '--length': leaf.length,
          '--rotate': `${leaf.rotate}deg`,
          '--flip': leaf.flip ? -1 : 1,
          '--leaf-color': `var(--botanical-${leaf.tone})`,
        } as CSSProperties
      }
    >
      <span
        className={cn(leaf.sway && 'botanical-sway')}
        style={
          {
            '--opacity': leaf.opacity,
            ...(leaf.sway && {
              '--duration': seconds(leaf.sway.duration),
              '--delay': seconds(leaf.sway.delay),
              '--turn': `${leaf.sway.turn}deg`,
            }),
          } as CSSProperties
        }
      />
    </span>
  );
}
