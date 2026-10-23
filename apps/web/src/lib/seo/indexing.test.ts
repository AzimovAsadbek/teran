// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { decideIndexing, parseIndexingSetting, type IndexingInput } from './indexing';

const shop: IndexingInput = {
  siteUrl: 'https://terantrade.uz',
  demoContent: 'false',
  setting: undefined,
};
const decide = (overrides: Partial<IndexingInput>) => decideIndexing({ ...shop, ...overrides });

describe('search indexing policy', () => {
  it('indexes the real shop on its public https address', () => {
    expect(decide({})).toEqual({ indexable: true });
    expect(decide({ siteUrl: 'https://www.terantrade.uz' })).toEqual({ indexable: true });
    expect(decide({ setting: 'auto' })).toEqual({ indexable: true });
    // A two-label name is the shop's own, whatever it says.
    expect(decide({ siteUrl: 'https://dev.uz' })).toEqual({ indexable: true });
  });

  it('never indexes demonstration content, whatever else is set', () => {
    for (const demoContent of [undefined, '', 'true', 'TRUE', 'no']) {
      expect(decide({ demoContent, setting: 'on' })).toEqual({
        indexable: false,
        reason: 'demo-content',
      });
    }
  });

  it('keeps local, insecure and reserved origins out', () => {
    for (const siteUrl of [
      undefined,
      '',
      'not a url',
      'http://terantrade.uz',
      'http://localhost:3000',
      'https://localhost',
      'https://127.0.0.1',
      'https://[::1]',
      'https://intranet',
      'https://teran.example',
      'https://shop.test',
      'https://teran.local',
      'https://web.localhost',
      'https://teran.internal',
    ]) {
      expect(decide({ siteUrl, setting: 'on' })).toEqual({
        indexable: false,
        reason: 'local-origin',
      });
    }
  });

  it('keeps staging and preview hosts out unless told the address is the shop', () => {
    for (const siteUrl of [
      'https://staging.terantrade.uz',
      'https://dev.terantrade.uz',
      'https://preview-2.terantrade.uz',
      'https://teran-demo.vercel.app',
      'https://teran.pages.dev',
    ]) {
      expect(decide({ siteUrl })).toEqual({ indexable: false, reason: 'staging-host' });
      expect(decide({ siteUrl, setting: 'on' })).toEqual({ indexable: true });
    }
    // Only the first label counts: a shop's own subdomain is fine.
    expect(decide({ siteUrl: 'https://shop.staging-tea.uz' })).toEqual({ indexable: true });
  });

  it('obeys an explicit "off", and refuses a setting it does not understand', () => {
    expect(decide({ setting: 'off' })).toEqual({ indexable: false, reason: 'switched-off' });
    expect(decide({ setting: ' OFF ' })).toEqual({ indexable: false, reason: 'switched-off' });
    expect(decide({ setting: 'yes' })).toEqual({ indexable: false, reason: 'invalid-setting' });
  });

  it('reads the setting leniently', () => {
    expect(parseIndexingSetting(undefined)).toBe('auto');
    expect(parseIndexingSetting('')).toBe('auto');
    expect(parseIndexingSetting(' On ')).toBe('on');
    expect(parseIndexingSetting('false')).toBeNull();
  });
});
