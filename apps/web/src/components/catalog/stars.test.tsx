import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Stars } from './stars';

describe('Stars', () => {
  it('fills the stars up to the average, the last one in part', () => {
    const { container } = render(<Stars value={4.8} />);
    const filled = container.querySelector<HTMLElement>('[style]');
    expect(filled?.style.width).toBe('96%');
    // Decorative: the number is said in words by whoever shows the stars.
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });

  it('keeps every star empty before the first rating and never overflows', () => {
    expect(
      render(<Stars value={0} />).container.querySelector<HTMLElement>('[style]')?.style.width,
    ).toBe('0%');
    expect(
      render(<Stars value={7} />).container.querySelector<HTMLElement>('[style]')?.style.width,
    ).toBe('100%');
  });
});
