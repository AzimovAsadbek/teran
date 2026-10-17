import type { PrismaService } from '../prisma/prisma.service.js';
import { SettingsService } from './settings.service.js';

const picture = {
  image: { key: 'visuals/x/a', widths: [640, 1280], width: 1280, height: 1800 },
  mobile: null,
  source: null,
};

function service(visuals: unknown): SettingsService {
  const prisma = {
    siteSetting: { findMany: () => Promise.resolve([{ key: 'visuals', value: visuals }]) },
  } as unknown as PrismaService;
  return new SettingsService(prisma);
}

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
