import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StoreMap } from './store-map';

const labels = {
  region: 'Map',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  attribution: 'OSM',
  close: 'Close',
};
const STORE = { id: 'a', name: 'TERAN Namangan', latitude: 40.990448, longitude: 71.641952 };

describe('StoreMap picking a place (the admin area)', () => {
  // jsdom has neither ResizeObserver nor pointer capture; it lays nothing out, so the frame sits
  // at the page's top left and a pointer at (0, 0) is over the middle of the map.
  beforeEach(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      },
    );
    Element.prototype.setPointerCapture ??= () => {};
  });
  afterEach(() => vi.unstubAllGlobals());

  function renderMap(onPick?: (place: { latitude: number; longitude: number }) => void) {
    render(
      <StoreMap
        points={[STORE]}
        selectedId="a"
        onSelect={() => {}}
        user={null}
        popup={null}
        labels={labels}
        onPick={onPick}
      />,
    );
    return screen.getByRole('region', { name: 'Map' });
  }

  it('gives the place clicked', () => {
    const onPick = vi.fn();
    const map = renderMap(onPick);
    fireEvent.pointerDown(map, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(map, { pointerId: 1, clientX: 2, clientY: 1 });
    expect(onPick).toHaveBeenCalledTimes(1);
    const [place] = onPick.mock.calls[0]!;
    // The map opens on the store (zoom 14, about 9.5 m a pixel here): two pixels east, one south.
    expect(place.latitude).toBeCloseTo(STORE.latitude, 3);
    expect(place.longitude).toBeCloseTo(STORE.longitude, 3);
    expect(place.longitude).toBeGreaterThan(STORE.longitude);
    expect(place.latitude).toBeLessThan(STORE.latitude);
  });

  it('moves the map on a drag without picking', () => {
    const onPick = vi.fn();
    const map = renderMap(onPick);
    fireEvent.pointerDown(map, { pointerId: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(map, { pointerId: 1, clientX: 40, clientY: 0 });
    fireEvent.pointerUp(map, { pointerId: 1, clientX: 40, clientY: 0 });
    expect(onPick).not.toHaveBeenCalled();
  });

  it('is only a map to look at on the storefront', () => {
    const map = renderMap();
    expect(map.className).toContain('cursor-grab');
    fireEvent.pointerDown(map, { pointerId: 1, clientX: 0, clientY: 0 });
    expect(() => fireEvent.pointerUp(map, { pointerId: 1, clientX: 0, clientY: 0 })).not.toThrow();
  });
});
