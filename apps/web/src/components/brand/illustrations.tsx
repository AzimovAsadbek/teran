import type { IllustrationKey } from '@teran/contracts';
import { useId } from 'react';
import { cn } from '@/lib/cn';

/*
 * Original illustrations drawn in code for TERAN (no third-party artwork). They echo the logo:
 * fanned leaves, gold hairlines, deep forest greens.
 */

interface ArtPalette {
  tint: string;
  leaf: string;
  leafDark: string;
  accent?: 'flower' | 'berries' | 'ribbon' | 'mint' | 'cup';
}

const PALETTES: Record<IllustrationKey, ArtPalette> = {
  black: { tint: '#efe4d6', leaf: '#5a3426', leafDark: '#2f1a12' },
  green: { tint: '#e4edd9', leaf: '#3e8535', leafDark: '#1a5530' },
  white: { tint: '#f1ece0', leaf: '#a9a68c', leafDark: '#7c7a63' },
  oolong: { tint: '#dfece8', leaf: '#2f6f69', leafDark: '#174240' },
  herbal: { tint: '#e8eedf', leaf: '#6f8f47', leafDark: '#475d38', accent: 'flower' },
  fruit: { tint: '#f4e3e3', leaf: '#9c2a3a', leafDark: '#5e1620', accent: 'berries' },
  gift: { tint: '#e9ece6', leaf: '#1a5530', leafDark: '#0b2e19', accent: 'ribbon' },
  jasmine: { tint: '#edf1e6', leaf: '#4f8a3b', leafDark: '#1a5530', accent: 'flower' },
  mint: { tint: '#e1f0e2', leaf: '#4fa04a', leafDark: '#2f6b2c', accent: 'mint' },
  'earl-grey': { tint: '#ece6dc', leaf: '#4a3a46', leafDark: '#2a2027', accent: 'cup' },
};

function Leaf({ rotate, fill, vein }: { rotate: number; fill: string; vein: string }) {
  return (
    <g transform={`rotate(${rotate} 120 150)`}>
      <path d="M120 150 C 96 118, 98 70, 120 42 C 142 70, 144 118, 120 150 Z" fill={fill} />
      <path
        d="M120 146 L120 52"
        stroke={vein}
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.9"
      />
      <path
        d="M120 150 C 96 118, 98 70, 120 42 C 142 70, 144 118, 120 150 Z"
        fill="none"
        stroke="#c5963a"
        strokeWidth="1.2"
        opacity="0.8"
      />
    </g>
  );
}

/** Round medallion for a tea type, used for category tiles, menus and image placeholders. */
export function TeaTypeArt({
  kind,
  className,
  label,
}: {
  kind: IllustrationKey | null;
  className?: string;
  /** When set, the art stands in for content (e.g. a product without a photo) and gets an accessible name. */
  label?: string;
}) {
  const palette = PALETTES[kind ?? 'green'];
  const id = useId();
  const gradient = `${id}-leaf`;
  const a11y = label
    ? { role: 'img' as const, 'aria-label': label }
    : { 'aria-hidden': true as const };

  return (
    <svg viewBox="0 0 240 240" className={cn('block h-full w-full', className)} {...a11y}>
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={palette.leaf} />
          <stop offset="1" stopColor={palette.leafDark} />
        </linearGradient>
      </defs>
      <circle cx="120" cy="120" r="112" fill={palette.tint} />
      <circle
        cx="120"
        cy="120"
        r="104"
        fill="none"
        stroke="#c5963a"
        strokeWidth="1.5"
        opacity="0.7"
      />
      <Leaf rotate={-38} fill={`url(#${gradient})`} vein="#e7c878" />
      <Leaf rotate={38} fill={`url(#${gradient})`} vein="#e7c878" />
      <Leaf rotate={0} fill={`url(#${gradient})`} vein="#e7c878" />
      <path
        d="M120 150 C 120 170, 114 186, 104 198"
        stroke={palette.leafDark}
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      {palette.accent === 'flower' ? (
        <g transform="translate(160 168)">
          {[0, 72, 144, 216, 288].map((angle) => (
            <ellipse
              key={angle}
              cx="0"
              cy="-9"
              rx="5.5"
              ry="9"
              fill="#fbf8ee"
              stroke="#e2c070"
              strokeWidth="0.8"
              transform={`rotate(${angle})`}
            />
          ))}
          <circle r="4.2" fill="#e2b23a" />
        </g>
      ) : null}
      {palette.accent === 'berries' ? (
        <g fill="#7a1f2b" stroke="#c5963a" strokeWidth="0.8">
          <circle cx="158" cy="170" r="8" />
          <circle cx="172" cy="160" r="6.5" />
          <circle cx="170" cy="178" r="5.5" />
        </g>
      ) : null}
      {palette.accent === 'mint' ? (
        <path
          d="M150 182 C 160 160, 182 156, 188 160 C 184 176, 168 186, 150 182 Z"
          fill="#7cc46a"
          stroke="#2f6b2c"
          strokeWidth="1.2"
        />
      ) : null}
      {palette.accent === 'cup' ? (
        <g transform="translate(150 162)" fill="none" stroke="#c5963a" strokeWidth="2">
          <path d="M0 0 H36 V10 C36 22, 28 28, 18 28 C8 28, 0 22, 0 10 Z" fill="#fbf7ee" />
          <path d="M36 6 C 44 6, 44 18, 35 18" />
        </g>
      ) : null}
      {palette.accent === 'ribbon' ? (
        <g transform="translate(120 196)" fill="#c5963a">
          <path d="M0 0 C -18 -14, -30 -2, -18 6 Z" />
          <path d="M0 0 C 18 -14, 30 -2, 18 6 Z" />
          <circle r="4" fill="#e7c878" />
        </g>
      ) : null}
    </svg>
  );
}

/** Layered dawn landscape over tea terraces, used behind the homepage hero. */
export function HeroLandscape({ className }: { className?: string }) {
  const id = useId();
  const sky = `${id}-sky`;
  const sun = `${id}-sun`;
  const mist = `${id}-mist`;
  const blur = `${id}-blur`;

  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      className={cn('h-full w-full', className)}
      aria-hidden
    >
      <defs>
        <linearGradient id={sky} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0b2e19" />
          <stop offset="0.38" stopColor="#1f4a2c" />
          <stop offset="0.62" stopColor="#7d7a45" />
          <stop offset="0.78" stopColor="#d2b064" />
          <stop offset="1" stopColor="#efd9a1" />
        </linearGradient>
        <radialGradient id={sun} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#fbf0c8" />
          <stop offset="0.45" stopColor="#f0d88f" stopOpacity="0.95" />
          <stop offset="1" stopColor="#e7c878" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={mist} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fdf7e6" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fdf7e6" stopOpacity="0.55" />
          <stop offset="1" stopColor="#fdf7e6" stopOpacity="0" />
        </linearGradient>
        <filter id={blur} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>

      <rect width="1600" height="900" fill={`url(#${sky})`} />
      <circle cx="1140" cy="500" r="230" fill={`url(#${sun})`} />
      <circle cx="1140" cy="500" r="74" fill="#fbf0c8" opacity="0.95" />

      {/* Far ridges */}
      <path
        d="M0 560 C 180 470, 330 500, 470 450 C 610 400, 760 470, 900 430 C 1060 385, 1210 460, 1380 420 C 1480 398, 1550 410, 1600 420 V900 H0 Z"
        fill="#6e7a4c"
      />
      <rect
        x="0"
        y="470"
        width="1600"
        height="160"
        fill={`url(#${mist})`}
        filter={`url(#${blur})`}
      />
      <path
        d="M0 620 C 160 560, 300 600, 450 560 C 620 515, 780 590, 960 545 C 1120 505, 1280 575, 1440 540 C 1520 523, 1570 530, 1600 535 V900 H0 Z"
        fill="#40603f"
      />
      <rect
        x="0"
        y="560"
        width="1600"
        height="140"
        fill={`url(#${mist})`}
        filter={`url(#${blur})`}
        opacity="0.8"
      />

      {/* Tea terraces */}
      <path
        d="M0 700 C 220 640, 420 690, 640 650 C 860 610, 1080 680, 1300 640 C 1430 618, 1530 626, 1600 632 V900 H0 Z"
        fill="#24492f"
      />
      <g fill="none" stroke="#3e8535" strokeWidth="5" strokeLinecap="round" opacity="0.55">
        <path d="M-20 742 C 220 690, 420 734, 640 698 C 860 662, 1080 724, 1300 690 C 1440 670, 1540 676, 1620 682" />
        <path d="M-20 782 C 220 734, 420 776, 640 742 C 860 708, 1080 766, 1300 734 C 1440 716, 1540 720, 1620 726" />
        <path d="M-20 822 C 220 778, 420 818, 640 786 C 860 754, 1080 808, 1300 778 C 1440 762, 1540 766, 1620 770" />
      </g>
      <g fill="none" stroke="#e7c878" strokeWidth="1.5" opacity="0.35">
        <path d="M-20 736 C 220 684, 420 728, 640 692 C 860 656, 1080 718, 1300 684 C 1440 664, 1540 670, 1620 676" />
        <path d="M-20 816 C 220 772, 420 812, 640 780 C 860 748, 1080 802, 1300 772 C 1440 756, 1540 760, 1620 764" />
      </g>
      <path
        d="M0 840 C 260 800, 520 846, 800 816 C 1080 786, 1340 836, 1600 812 V900 H0 Z"
        fill="#0f3b21"
      />

      {/* Foreground tea sprig echoing the logo leaves */}
      <g transform="translate(70 900) rotate(-8)">
        <path
          d="M0 0 C 40 -90, 100 -170, 190 -230"
          stroke="#071f10"
          strokeWidth="9"
          fill="none"
          strokeLinecap="round"
        />
        {[
          { x: 60, y: -96, r: -64 },
          { x: 110, y: -150, r: 24 },
          { x: 150, y: -196, r: -48 },
          { x: 196, y: -226, r: 30 },
        ].map((leaf) => (
          <g
            key={`${leaf.x}-${leaf.y}`}
            transform={`translate(${leaf.x} ${leaf.y}) rotate(${leaf.r})`}
          >
            <path d="M0 0 C -26 -30, -24 -82, 0 -112 C 24 -82, 26 -30, 0 0 Z" fill="#0b2e19" />
            <path
              d="M0 0 C -26 -30, -24 -82, 0 -112 C 24 -82, 26 -30, 0 0 Z"
              fill="none"
              stroke="#c5963a"
              strokeWidth="2"
              opacity="0.85"
            />
            <path d="M0 -4 L0 -104" stroke="#c5963a" strokeWidth="1.4" opacity="0.6" />
          </g>
        ))}
      </g>
    </svg>
  );
}
