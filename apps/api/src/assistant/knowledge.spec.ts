import { describe, expect, it } from 'vitest';
import {
  brewingText,
  formatSom,
  knowledgeText,
  systemInstruction,
  type KnowledgeProduct,
  type SiteFacts,
} from './knowledge.js';

function product(overrides: Partial<KnowledgeProduct> = {}): KnowledgeProduct {
  return {
    slug: 'teran-xc2025',
    name: 'TERAN XC2025',
    shortDescription: 'Yunnan togʻlaridan yashil choy.',
    description: 'Uzun matn. '.repeat(200),
    tastingNotes: 'Yangi, gulli',
    ingredients: null,
    origin: 'Yunnan, Xitoy',
    category: { slug: 'green-tea', name: 'Yashil choy', path: 'tea/green-tea' },
    breadcrumbs: [
      { slug: 'tea', name: 'Choy', path: 'tea' },
      { slug: 'green-tea', name: 'Yashil choy', path: 'tea/green-tea' },
    ],
    collections: ['TERAN Premium'],
    productType: { key: 'tea', name: 'Choy' },
    attributes: [
      {
        key: 'leaf',
        label: 'Barg',
        kind: 'SELECT',
        unit: null,
        text: null,
        number: null,
        boolean: null,
        options: [{ key: 'rolled', label: 'Buralgan' }],
      },
    ],
    caffeineLevel: 'MEDIUM',
    variants: [
      {
        sku: 'XC-400',
        weightGrams: 400,
        unitCount: null,
        price: '120000.00',
        stockLevel: 'in_stock',
      },
      {
        sku: 'XC-100',
        weightGrams: 100,
        unitCount: null,
        price: '35000.00',
        stockLevel: 'out_of_stock',
      },
    ],
    brewing: {
      temperatureCelsius: 80,
      temperatureMaxCelsius: 85,
      timeMinSeconds: 120,
      timeMaxSeconds: 180,
      amountGrams: '3',
      amountMaxGrams: null,
    },
    rating: { average: 4.8, count: 12 },
    isNew: false,
    ...overrides,
  } as unknown as KnowledgeProduct;
}

function facts(overrides: Partial<SiteFacts> = {}): SiteFacts {
  return {
    locale: 'uz',
    prices: false,
    owner: 'TERAN — Namangandagi choy kompaniyasi.',
    contact: {
      phone: '+998 90 123 45 67',
      phone2: null,
      email: null,
      email2: null,
      telegram: 'teran_tea',
      instagram: null,
      whatsapp: null,
      youtube: null,
      address: 'Namangan shahri',
      workingHours: 'Har kuni 9:00–20:00',
    },
    stores: [],
    delivery: [
      {
        code: 'courier',
        name: 'Kuryer',
        description: null,
        estimate: '1–2 kun',
        price: '20000.00',
        freeFromAmount: null,
        currency: 'UZS',
        regionCodes: ['UZ-NG'],
        requiresAddress: true,
      },
    ],
    categories: [
      { slug: 'tea', name: 'Choy', parentSlug: null, productCount: 1 },
      { slug: 'empty', name: 'Boʻsh', parentSlug: null, productCount: 0 },
    ] as unknown as SiteFacts['categories'],
    collections: [],
    products: [product()],
    ...overrides,
  };
}

describe('formatSom and brewingText', () => {
  it('writes amounts and brewing guides as a person reads them', () => {
    expect(formatSom('120000.00')).toBe("120 000 so'm");
    expect(formatSom('950')).toBe("950 so'm");
    expect(brewingText(product().brewing)).toBe('80–85 °C, 2–3 min, 3 g per cup');
    expect(
      brewingText({
        temperatureCelsius: 95,
        temperatureMaxCelsius: null,
        timeMinSeconds: 30,
        timeMaxSeconds: 45,
        amountGrams: null,
        amountMaxGrams: null,
      }),
    ).toBe('95 °C, 30–45 s');
    expect(brewingText(null)).toBe('');
  });
});

describe('knowledgeText', () => {
  it('gives TERAN’s own text, the contacts, delivery, stocked categories and every product', () => {
    const text = knowledgeText(facts());
    expect(text).toContain('TERAN — Namangandagi choy kompaniyasi.');
    expect(text).toContain('Telegram: @teran_tea');
    expect(text).toContain('- Kuryer; takes 1–2 kun; regions: Namangan viloyati');
    expect(text).toContain('- tea: Choy, 1');
    expect(text).not.toContain('Boʻsh');
    expect(text).toContain('### TERAN XC2025\nslug: teran-xc2025');
    expect(text).toContain('category: Choy › Yashil choy');
    expect(text).toContain('details: Barg: Buralgan');
    expect(text).toContain('brewing: 80–85 °C, 2–3 min, 3 g per cup');
    // Long descriptions are cut; the rest is on the product's page.
    expect(text).not.toContain('Uzun matn. '.repeat(100));
  });

  it('names no price or fee while the store shows none', () => {
    const hidden = knowledgeText(facts());
    expect(hidden).toContain('packs: 400 g (in stock); 100 g (out of stock)');
    expect(hidden).not.toContain("so'm");
    const shown = knowledgeText(facts({ prices: true }));
    expect(shown).toContain("packs: 400 g (in stock, 120 000 so'm)");
    expect(shown).toContain("fee 20 000 so'm");
  });

  it('says so when the catalogue is empty', () => {
    expect(knowledgeText(facts({ products: [], owner: '' }))).toContain(
      'The catalogue is empty at the moment.',
    );
  });
});

describe('systemInstruction', () => {
  it('sets the rules before the data, in the visitor’s language', () => {
    const uz = systemInstruction(facts());
    expect(uz.indexOf('Rules:')).toBeLessThan(uz.indexOf('# TERAN information'));
    expect(uz).toContain('Write in Uzbek in the Latin script');
    expect(uz).toContain('never name a price');
    expect(systemInstruction(facts({ locale: 'ru', prices: true }))).toContain('Write in Russian');
    expect(systemInstruction(facts({ prices: true }))).toContain("Prices are in Uzbek so'm");
  });
});
