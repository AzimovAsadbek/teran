import { describe, expect, it } from 'vitest';
import { gridFor, shelfGridFor } from './catalog-grid';

/** The number of columns a `lg:grid-cols-N` class gives. */
function lgColumns(list: string): number {
  return Number(/lg:grid-cols-(\d)/.exec(list)?.[1] ?? 0);
}

describe('shelfGridFor', () => {
  it('keeps one or two products as feature cards', () => {
    expect(shelfGridFor(1).list).toBe(gridFor(1, true).list);
    expect(shelfGridFor(1).layout(0)).toBe('feature');
    expect(shelfGridFor(2).layout(0)).toBe('feature');
  });

  it('never leaves one card alone on the last row from 1024 px', () => {
    for (let count = 3; count <= 48; count++) {
      const columns = lgColumns(shelfGridFor(count).list);
      expect(columns, `count ${count}`).toBeGreaterThan(0);
      expect(count === columns || count % columns !== 1, `count ${count}`).toBe(true);
    }
  });

  it('prefers four across and never opens on a lead card', () => {
    expect(lgColumns(shelfGridFor(3).list)).toBe(3);
    expect(lgColumns(shelfGridFor(5).list)).toBe(5);
    expect(lgColumns(shelfGridFor(8).list)).toBe(4);
    expect(lgColumns(shelfGridFor(13).list)).toBe(5);
    for (let count = 3; count <= 20; count++) {
      const grid = shelfGridFor(count);
      expect(Array.from({ length: count }, (_, index) => grid.layout(index))).not.toContain('lead');
    }
  });

  it('keeps an odd last card the size of the others on a phone', () => {
    const grid = shelfGridFor(7);
    expect(grid.layout(6)).toBe('card');
    expect(grid.item(6)).toBeUndefined();
  });
});

describe('gridFor', () => {
  it('keeps every card the size of the others on a phone, an odd last one too', () => {
    for (const count of [3, 5, 7, 9, 11]) {
      const grid = gridFor(count, true);
      expect(grid.list, `count ${count}`).toMatch(/^grid-cols-2 /);
      expect(grid.layout(count - 1), `count ${count}`).toBe('card');
      expect(grid.item(count - 1), `count ${count}`).toBeUndefined();
    }
  });

  it('lays one or two products down only from 768 px', () => {
    expect(gridFor(1, true).list).toContain('grid-cols-2 md:grid-cols-1');
    expect(gridFor(2, true).list).toContain('grid-cols-2');
    expect(gridFor(1, true).layout(0)).toBe('feature');
  });
});
