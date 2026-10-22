import type { ConfigService } from '@nestjs/config';
import type { Env } from '../config/env.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from './settings.service.js';

/** Settings with or without a Gemini key on the server. */
function config(key?: string): ConfigService<Env, true> {
  const values: Record<string, unknown> = {
    GEMINI_API_KEY: key,
    GEMINI_MODEL: 'gemini-3.5-flash-lite',
  };
  return { get: (name: string) => values[name] } as unknown as ConfigService<Env, true>;
}

const picture = {
  image: { key: 'visuals/x/a', widths: [640, 1280], width: 1280, height: 1800 },
  mobile: null,
  source: null,
};

function service(visuals: unknown): SettingsService {
  const prisma = {
    siteSetting: { findMany: () => Promise.resolve([{ key: 'visuals', value: visuals }]) },
  } as unknown as PrismaService;
  return new SettingsService(prisma, config());
}

function withRows(rows: { key: string; value: unknown }[], key?: string): SettingsService {
  const prisma = {
    siteSetting: { findMany: () => Promise.resolve(rows) },
  } as unknown as PrismaService;
  return new SettingsService(prisma, config(key));
}

const KNOWLEDGE = { uz: 'TERAN haqida', ru: '', en: '' };

describe('SettingsService assistant', () => {
  it('answers in the chat only when switched on and a key is configured', async () => {
    const on = [{ key: 'assistant', value: { enabled: true, knowledge: KNOWLEDGE } }];
    const off = [{ key: 'assistant', value: { enabled: false, knowledge: KNOWLEDGE } }];
    const key = 'test-gemini-key-0123456789';
    expect((await withRows(on, key).getPublic('uz')).assistant).toEqual({ enabled: true });
    expect((await withRows(on).getPublic('uz')).assistant).toEqual({ enabled: false });
    expect((await withRows(off, key).getPublic('uz')).assistant).toEqual({ enabled: false });
    expect((await withRows([], key).getPublic('uz')).assistant).toEqual({ enabled: false });
  });

  it('keeps TERAN’s text out of the public settings', async () => {
    const rows = [{ key: 'assistant', value: { enabled: true, knowledge: KNOWLEDGE } }];
    const settings = await withRows(rows, 'test-gemini-key-0123456789').getPublic('uz');
    expect(JSON.stringify(settings)).not.toContain('TERAN haqida');
  });

  it('reads a missing or malformed setting as switched off', async () => {
    expect((await withRows([]).getAll()).assistant.enabled).toBe(false);
    expect(
      (await withRows([{ key: 'assistant', value: { enabled: 'yes' } }]).getAll()).assistant,
    ).toEqual({ enabled: false, knowledge: { uz: '', ru: '', en: '' } });
  });

  it('names the model only when a key is configured', () => {
    expect(withRows([], 'test-gemini-key-0123456789').assistantModel).toBe('gemini-3.5-flash-lite');
    expect(withRows([]).assistantModel).toBeNull();
  });
});

describe('SettingsService page pictures', () => {
  it('keeps the places it knows when another entry is unknown or damaged', async () => {
    const { visuals } = await service({
      'contact.picture': picture,
      'home.hero.1': picture,
      'somewhere.new': picture,
      'about.hero': { image: { key: 42 } },
    }).getAll();
    expect(Object.keys(visuals).sort()).toEqual(['contact.picture', 'home.hero.1']);
  });

  it('reads a missing or malformed setting as no pictures', async () => {
    expect((await service(null).getAll()).visuals).toEqual({});
    expect((await service(['x']).getAll()).visuals).toEqual({});
  });
});
