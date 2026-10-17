import type { ReactNode } from 'react';

/*
 * Colour "stickers" for the home ribbon, drawn in the reference's style (its ribbon icons are
 * flat illustrations with soft gradients inside a thick outline in a tone of the object, slightly
 * tilted), here with TERAN's tea things: a cotton-pattern piyola of green tea, a sprig of tea
 * leaves, a gift box and a teapot. Decorative. The gradients are defined once per page by
 * <StickerDefs /> and shared by every copy of the ribbon.
 */

const OUTLINE = { strokeWidth: 7, strokeLinejoin: 'round', strokeLinecap: 'round' } as const;

/** The shared gradients; render once, before the ribbon. */
export function StickerDefs() {
  return (
    <svg aria-hidden width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="tsk-bowl" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="1" stopColor="#dce8f6" />
        </linearGradient>
        <linearGradient id="tsk-tea" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e3c95a" />
          <stop offset="1" stopColor="#b8962c" />
        </linearGradient>
        <linearGradient id="tsk-leaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#9fe06a" />
          <stop offset="1" stopColor="#2f9b47" />
        </linearGradient>
        <linearGradient id="tsk-leaf-dark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6cc35a" />
          <stop offset="1" stopColor="#1f7d3c" />
        </linearGradient>
        <linearGradient id="tsk-box" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff7487" />
          <stop offset="1" stopColor="#cf2448" />
        </linearGradient>
        <linearGradient id="tsk-ribbon" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="1" stopColor="#f2a516" />
        </linearGradient>
        <linearGradient id="tsk-pot" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#54d6cf" />
          <stop offset="1" stopColor="#0f8784" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/** One sticker; `box` is the drawing's own bounds (so each fills the ribbon's 48 px height). */
function Sticker({ turn, box, children }: { turn: number; box: string; children: ReactNode }) {
  return (
    <svg aria-hidden viewBox={box} className="h-full w-auto overflow-visible">
      <g transform={`rotate(${turn} 60 68)`}>{children}</g>
    </svg>
  );
}

/** A white piyola with the blue cotton pattern, full of green tea, steaming. */
function Piyola() {
  return (
    <Sticker turn={-8} box="5 7 114 122">
      <path
        d="M40 38c-6-7 6-11 0-19M60 34c-6-8 6-12 0-21M80 38c-6-7 6-11 0-19"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M12 60c2 34 22 54 40 58h16c18-4 38-24 40-58z"
        fill="url(#tsk-bowl)"
        stroke="#1f4f9c"
        {...OUTLINE}
      />
      <ellipse cx="60" cy="60" rx="48" ry="11" fill="url(#tsk-tea)" stroke="#1f4f9c" {...OUTLINE} />
      {/* The cotton bolls of the paxta pattern. */}
      {[
        [38, 86],
        [60, 94],
        [82, 86],
      ].map(([x, y]) => (
        <g key={x} fill="#2f6fd0">
          <circle cx={x} cy={(y ?? 0) - 6} r="4.5" />
          <circle cx={(x ?? 0) - 6} cy={(y ?? 0) + 1} r="4.5" />
          <circle cx={(x ?? 0) + 6} cy={(y ?? 0) + 1} r="4.5" />
          <circle cx={x} cy={y} r="3" fill="#fff" />
        </g>
      ))}
      <path d="M22 74c10 4 66 4 76 0" fill="none" stroke="#2f6fd0" strokeWidth="3.5" />
      <path d="M24 66c2 12 7 22 14 29" fill="none" stroke="#fff" strokeWidth="4" opacity="0.9" />
    </Sticker>
  );
}

/** Two tea leaves and a bud on a stem. */
function TeaLeaves() {
  return (
    <Sticker turn={10} box="4 13 122 122">
      <path
        d="M60 128c0-28 2-52 10-76"
        fill="none"
        stroke="#1f7a3a"
        strokeWidth="9"
        strokeLinecap="round"
      />
      <path
        d="M58 96C24 98 10 72 14 44c26 2 48 18 44 52z"
        fill="url(#tsk-leaf-dark)"
        stroke="#1f7a3a"
        {...OUTLINE}
      />
      <path
        d="M66 78c38-2 52-30 46-62-30 4-52 24-46 62z"
        fill="url(#tsk-leaf)"
        stroke="#1f7a3a"
        {...OUTLINE}
      />
      <path
        d="M56 92C42 80 30 64 22 50"
        fill="none"
        stroke="#c9f2a8"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M70 72c12-14 24-32 34-48"
        fill="none"
        stroke="#d8f7bd"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M70 52c-6-12-2-26 8-34 8 10 8 24-8 34z"
        fill="#b8ec8c"
        stroke="#1f7a3a"
        {...OUTLINE}
      />
    </Sticker>
  );
}

/** A red gift box tied with a gold ribbon and bow. */
function GiftBox() {
  return (
    <Sticker turn={-6} box="5 20 107 108">
      <rect
        x="20"
        y="62"
        width="80"
        height="58"
        rx="6"
        fill="url(#tsk-box)"
        stroke="#9b1736"
        {...OUTLINE}
      />
      <rect
        x="12"
        y="46"
        width="96"
        height="22"
        rx="6"
        fill="#ef4d68"
        stroke="#9b1736"
        {...OUTLINE}
      />
      <rect x="52" y="46" width="16" height="74" fill="url(#tsk-ribbon)" />
      <path d="M52 46v74M68 46v74" stroke="#9b1736" strokeWidth="3" />
      <path
        d="M60 44C46 22 22 26 30 40c6 10 22 8 30 4zM60 44c14-22 38-18 30-4-6 10-22 8-30 4z"
        fill="url(#tsk-ribbon)"
        stroke="#b4700e"
        {...OUTLINE}
      />
      <circle cx="60" cy="44" r="6" fill="#ffd45e" stroke="#b4700e" strokeWidth="4" />
      <path d="M26 74v34" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity="0.7" />
    </Sticker>
  );
}

/** A teal teapot with a gold lid knob. */
function Teapot() {
  return (
    <Sticker turn={7} box="1 27 118 103">
      <path
        d="M92 70c22-4 26 28 2 34"
        fill="none"
        stroke="#0b5f5c"
        strokeWidth="15"
        strokeLinecap="round"
      />
      <path
        d="M92 70c22-4 26 28 2 34"
        fill="none"
        stroke="#54d6cf"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path d="M28 80L8 58c-4-4 2-9 6-6l20 18" fill="#2fb3ad" stroke="#0b5f5c" {...OUTLINE} />
      <path
        d="M24 92c0-26 16-40 36-40s36 14 36 40c0 20-14 30-36 30S24 112 24 92z"
        fill="url(#tsk-pot)"
        stroke="#0b5f5c"
        {...OUTLINE}
      />
      <path d="M38 54c6-10 38-10 44 0z" fill="#1fa39d" stroke="#0b5f5c" {...OUTLINE} />
      <circle cx="60" cy="40" r="8" fill="#ffd45e" stroke="#b4700e" strokeWidth="5" />
      <path
        d="M36 88c2-12 8-20 16-24"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        opacity="0.85"
      />
      <path d="M30 100c18 6 42 6 60 0" fill="none" stroke="#ffd45e" strokeWidth="4" />
    </Sticker>
  );
}

/** The four stickers, in the order they recur between the ribbon's words. */
export const RIBBON_STICKERS = [Piyola, TeaLeaves, GiftBox, Teapot];
