// @vitest-environment node
import type { ImageDto } from '@teran/contracts';
import { describe, expect, it } from 'vitest';
import { containedSizes } from './product-image';

const image = (width: number, height: number): ImageDto => ({
  src: '/uploads/products/pouch',
  widths: [320, 480, 640, 960],
  width,
  height,
  alt: '',
  transparent: true,
});

describe('containedSizes', () => {
  it('scales every entry to the width a portrait pouch is drawn at', () => {
    // 0.88 (margins) × 1016/1510 (pouch) × 0.95 (slack) ≈ 0.563.
    expect(containedSizes('(min-width: 95rem) 700px, 100vw', image(1016, 1510))).toBe(
      '(min-width: 95rem) calc(700px * 0.563), calc(100vw * 0.563)',
    );
  });

  it('lets a 412 px phone at 2.625× take the 640 px file for the product page pouch', () => {
    const scale = Number(/\* ([\d.]+)\)$/.exec(containedSizes('100vw', image(1016, 1510)))![1]);
    expect(412 * scale * 2.625).toBeLessThanOrEqual(640);
  });

  it('keeps only the margins for a cut-out wider than tall', () => {
    expect(containedSizes('80px', image(1600, 1000))).toBe('calc(80px * 0.836)');
  });
});
