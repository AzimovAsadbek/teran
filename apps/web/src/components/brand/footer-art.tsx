import type { BrandValue } from '@/content/brand';
import { cn } from '@/lib/cn';

/*
 * The footer's pictures in the reference's style: its promise icons are flat shapes in a pale mint
 * (#b5e3d8) with a deeper mint for shade and white for light, 24 px high; its cup is drawn in the
 * same mint with the band's teal showing through. Here the pack's four values and a TERAN cup.
 * Decorative: the labels beside them carry the meaning.
 */

const MINT = '#b5e3d8';
const SHADE = '#95bbb2';

/** Natural product: two tea leaves. */
function NaturalMark() {
  return (
    <svg aria-hidden viewBox="0 0 26 24" className="h-6 w-auto">
      <path d="M2.4 22.6c-.9-4.8.7-8.9 5.6-11-.5 4.9-2.4 8.7-5.6 11z" fill={SHADE} />
      <path d="M4 21.4C3 11.6 9.4 3 23.6 1.8 24.4 15 17.6 22.8 4 21.4z" fill={MINT} />
      <path
        d="M6 19.4C10.6 13.6 15 9 20.4 5.4"
        fill="none"
        stroke="#fff"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Refined taste: a cup of tea on its saucer, steaming. */
function TasteMark() {
  return (
    <svg aria-hidden viewBox="0 0 30 24" className="h-6 w-auto">
      <path
        d="M10 7.2c-1.6-1.6 1.6-2.6 0-4.6M15 7.2c-1.6-1.6 1.6-2.6 0-4.6"
        fill="none"
        stroke="#fff"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M21.6 11.4h2.2a3.2 3.2 0 0 1 0 6.4h-3.4"
        fill="none"
        stroke={MINT}
        strokeWidth="2.2"
      />
      <path d="M4.4 9.4h17.8v4.2c0 4.8-4 8.4-8.9 8.4s-8.9-3.6-8.9-8.4z" fill={MINT} />
      <path d="M2 22.6h23" stroke={SHADE} strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

/** Everyday vigour: the sun. */
function VigourMark() {
  const rays = Array.from({ length: 8 }, (_, index) => (index * Math.PI) / 4);
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-auto">
      {rays.map((angle) => (
        <path
          key={angle}
          d={`M${12 + Math.cos(angle) * 8.2} ${12 + Math.sin(angle) * 8.2}L${12 + Math.cos(angle) * 11} ${12 + Math.sin(angle) * 11}`}
          stroke={MINT}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      ))}
      <circle cx="12" cy="12" r="5.8" fill={MINT} />
      <path
        d="M9.2 10.4a3.4 3.4 0 0 1 2.6-2"
        fill="none"
        stroke="#fff"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Quality choice: a cut gem. */
function QualityMark() {
  return (
    <svg aria-hidden viewBox="0 0 26 24" className="h-6 w-auto">
      <path d="M1.6 8.2 6.8 1.8h12.4l5.2 6.4z" fill={MINT} />
      <path d="M1.6 8.2h22.8L13 23z" fill={SHADE} />
      <path
        d="M9.4 8.2 13 23l3.6-14.8M6.8 1.8l2.6 6.4L13 1.8l3.6 6.4 2.6-6.4"
        fill="none"
        stroke="#fff"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const MARKS: Record<BrandValue, () => React.JSX.Element> = {
  natural: NaturalMark,
  taste: TasteMark,
  vigour: VigourMark,
  quality: QualityMark,
};

/** One of the pack's four values as a footer promise icon. */
export function ValueMarkMint({ value }: { value: BrandValue }) {
  const Mark = MARKS[value];
  return <Mark />;
}

/**
 * A take-away cup in the band's mint, as the reference's footer cup: the lid, the brand's letters
 * running up its side and the foot band, the cup's body left to the teal around them.
 */
export function FooterCup({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 114 180" className={cn('overflow-visible', className)}>
      <g transform="rotate(-5 57 90)">
        {/* The lid: its dome and the rim it closes with. */}
        <path d="M11 20 15 6.4Q57-1.6 99 6.4l4 13.6Q57 13 11 20z" fill={MINT} />
        <path d="M3 22.4Q57 14.4 111 22.4l1 8Q57 40.4 2 30.4z" fill={MINT} />
        <text
          x="57"
          y="112"
          textAnchor="middle"
          transform="rotate(-12 57 100)"
          fill={MINT}
          style={{ fontFamily: 'var(--font-oswald), sans-serif', fontWeight: 700 }}
          fontSize="40"
          letterSpacing="1"
        >
          TERAN
        </text>
        {/* The foot band. */}
        <path d="M18.6 157.6Q57 167.6 95.4 157.6l-1.8 16.4Q57 184 20.4 174z" fill={MINT} />
      </g>
    </svg>
  );
}
