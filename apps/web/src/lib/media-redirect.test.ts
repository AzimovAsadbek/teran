// @vitest-environment node
import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { legacyMediaRedirect } from './media-redirect';

const request = (path: string) => new NextRequest(`https://teran.example${path}`);
const location = (path: string) => {
  const response = legacyMediaRedirect(request(path));
  expect(response?.status).toBe(308);
  const target = new URL(response!.headers.get('location')!);
  return `${target.pathname}${target.search}`;
};

describe('legacy media redirect', () => {
  it('sends the old filtered addresses to the photographs and films pages', () => {
    expect(location('/media?kind=photo')).toBe('/media/photos');
    expect(location('/ru/media?kind=video&page=3')).toBe('/ru/media/videos?page=3');
    expect(location('/en/media/?kind=photo&page=1')).toBe('/en/media/photos');
    expect(location('/media?kind=other&page=2')).toBe('/media');
  });

  it('leaves every other address alone', () => {
    expect(legacyMediaRedirect(request('/media'))).toBeNull();
    expect(legacyMediaRedirect(request('/media/photos?kind=photo'))).toBeNull();
    expect(legacyMediaRedirect(request('/catalog?kind=photo'))).toBeNull();
  });
});
