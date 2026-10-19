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
  accent?: 'flower' | 'berries' | 'ribbon' | 'mint' | 'cup' | 'beans' | 'sweet';
}

/**
 * Without a chosen illustration: the same medallion in sand and gold, a TERAN mark rather than a
 * tea type, so a category or product of any kind (not only tea) gets a fitting placeholder.
 */
const NEUTRAL: ArtPalette = { tint: '#f3eee2', leaf: '#e6dcc2', leafDark: '#b8962e' };

const PALETTES: Record<IllustrationKey, ArtPalette> = {
  black: { tint: '#efe4d6', leaf: '#5a3426', leafDark: '#2f1a12' },
  green: { tint: '#e3f0d8', leaf: '#2f9431', leafDark: '#1a5317' },
  white: { tint: '#f1ece0', leaf: '#a9a68c', leafDark: '#7c7a63' },
  oolong: { tint: '#dfece8', leaf: '#2f6f69', leafDark: '#174240' },
  herbal: { tint: '#e8eedf', leaf: '#6f8f47', leafDark: '#475d38', accent: 'flower' },
  fruit: { tint: '#f4e3e3', leaf: '#9c2a3a', leafDark: '#5e1620', accent: 'berries' },
  gift: { tint: '#e9ece6', leaf: '#1a5317', leafDark: '#0e3d12', accent: 'ribbon' },
  jasmine: { tint: '#edf1e6', leaf: '#4f8a3b', leafDark: '#1a5317', accent: 'flower' },
  mint: { tint: '#e1f0e2', leaf: '#4fa04a', leafDark: '#2b7a26', accent: 'mint' },
  'earl-grey': { tint: '#ece6dc', leaf: '#4a3a46', leafDark: '#2a2027', accent: 'cup' },
  // Beyond tea: coffee beans, a wrapped sweet, a cup (the leaves stay: they are TERAN's mark).
  coffee: { tint: '#efe4d6', leaf: '#3f6b35', leafDark: '#1f3b1a', accent: 'beans' },
  sweets: { tint: '#f7e6e3', leaf: '#4f8a3b', leafDark: '#1a5317', accent: 'sweet' },
  teaware: { tint: '#dfece8', leaf: '#2f6f69', leafDark: '#174240', accent: 'cup' },
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
        stroke="#d0a20a"
        strokeWidth="1.2"
        opacity="0.8"
      />
    </g>
  );
}

/**
 * Round medallion for a tea type, used for category tiles, menus and image placeholders; without a
 * key, a neutral TERAN medallion.
 */
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
  const palette = kind ? PALETTES[kind] : NEUTRAL;
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
        stroke="#d0a20a"
        strokeWidth="1.5"
        opacity="0.7"
      />
      <Leaf rotate={-38} fill={`url(#${gradient})`} vein="#efcf4a" />
      <Leaf rotate={38} fill={`url(#${gradient})`} vein="#efcf4a" />
      <Leaf rotate={0} fill={`url(#${gradient})`} vein="#efcf4a" />
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
        <g fill="#7a1f2b" stroke="#d0a20a" strokeWidth="0.8">
          <circle cx="158" cy="170" r="8" />
          <circle cx="172" cy="160" r="6.5" />
          <circle cx="170" cy="178" r="5.5" />
        </g>
      ) : null}
      {palette.accent === 'mint' ? (
        <path
          d="M150 182 C 160 160, 182 156, 188 160 C 184 176, 168 186, 150 182 Z"
          fill="#7cc46a"
          stroke="#2b7a26"
          strokeWidth="1.2"
        />
      ) : null}
      {palette.accent === 'cup' ? (
        <g transform="translate(150 162)" fill="none" stroke="#d0a20a" strokeWidth="2">
          <path d="M0 0 H36 V10 C36 22, 28 28, 18 28 C8 28, 0 22, 0 10 Z" fill="#fbf7ee" />
          <path d="M36 6 C 44 6, 44 18, 35 18" />
        </g>
      ) : null}
      {palette.accent === 'beans' ? (
        <g stroke="#d0a20a" strokeWidth="0.8">
          <g transform="translate(160 174) rotate(-30)">
            <ellipse rx="9" ry="12" fill="#5a3426" />
            <path d="M0 -10 C 4 -4, -4 4, 0 10" fill="none" stroke="#2f1a12" strokeWidth="1.6" />
          </g>
          <g transform="translate(178 160) rotate(20)">
            <ellipse rx="7.5" ry="10" fill="#6b3f2c" />
            <path d="M0 -8 C 3 -3, -3 3, 0 8" fill="none" stroke="#2f1a12" strokeWidth="1.4" />
          </g>
        </g>
      ) : null}
      {palette.accent === 'sweet' ? (
        <g transform="translate(166 172) rotate(-20)" stroke="#d0a20a" strokeWidth="0.8">
          <path d="M-12 0 L-23 -8 L-23 8 Z" fill="#eab0b4" />
          <path d="M12 0 L23 -8 L23 8 Z" fill="#eab0b4" />
          <ellipse rx="13" ry="9" fill="#c94f63" />
          <path
            d="M-5 -7 C -1 -2, -1 2, -5 7 M3 -8 C 7 -3, 7 3, 3 8"
            fill="none"
            stroke="#fbf8ee"
            strokeWidth="1.4"
          />
        </g>
      ) : null}
      {palette.accent === 'ribbon' ? (
        <g transform="translate(120 196)" fill="#d0a20a">
          <path d="M0 0 C -18 -14, -30 -2, -18 6 Z" />
          <path d="M0 0 C 18 -14, 30 -2, 18 6 Z" />
          <circle r="4" fill="#efcf4a" />
        </g>
      ) : null}
    </svg>
  );
}
