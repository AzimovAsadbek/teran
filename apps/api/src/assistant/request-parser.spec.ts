import {
  parsePrices,
  parseRequest,
  redactPersonalData,
  type CatalogVocabulary,
} from './request-parser.js';

const vocabulary: CatalogVocabulary = {
  categories: [
    { slug: 'tea', path: 'tea', parentSlug: null, names: ['Choy', 'Чай', 'Tea'] },
    {
      slug: 'green-tea',
      path: 'tea/green-tea',
      parentSlug: 'tea',
      names: ['Yashil choy', 'Зелёный чай', 'Green tea'],
    },
    {
      slug: 'black-tea',
      path: 'tea/black-tea',
      parentSlug: 'tea',
      names: ['Qora choy', 'Чёрный чай', 'Black tea'],
    },
    {
      slug: 'gift-sets',
      path: 'gift-sets',
      parentSlug: null,
      names: ['Sovgʻa toʻplamlari', 'Подарочные наборы', 'Gift sets'],
    },
  ],
  productTypes: [{ key: 'coffee', names: ['Qahva', 'Кофе', 'Coffee'] }],
  attributes: [
    {
      key: 'leaf-style',
      kind: 'SELECT',
      labels: ['Barg turi', 'Тип листа', 'Leaf style'],
      options: [
        { key: 'whole', labels: ['Butun barg', 'Цельный лист', 'Whole leaf'] },
        { key: 'broken', labels: ['Maydalangan barg', 'Ломаный лист', 'Broken leaf'] },
      ],
    },
    {
      key: 'flavoured',
      kind: 'BOOLEAN',
      labels: ['Xushboʻy', 'Ароматизированный', 'Flavoured'],
      options: [],
    },
  ],
  origins: [
    { key: 'hunan', names: ['Hunan', 'Хунань'] },
    { key: 'yunnan', names: ['Yunnan', 'Юньнань'] },
  ],
};

describe('parsePrices', () => {
  it('reads a budget in each language and separator style', () => {
    expect(parsePrices("100 000 so'mlik budjetim bor")).toEqual({ min: null, max: 100_000 });
    expect(parsePrices('100 000 soʻmgacha')).toEqual({ min: null, max: 100_000 });
    expect(parsePrices('100 ming atrofida')).toEqual({ min: null, max: 100_000 });
    expect(parsePrices('до 150 тыс сум')).toEqual({ min: null, max: 150_000 });
    expect(parsePrices('under 80,000 UZS')).toEqual({ min: null, max: 80_000 });
    expect(parsePrices('1.5 mln')).toEqual({ min: null, max: 1_500_000 });
  });

  it('reads floors and ranges', () => {
    expect(parsePrices('200 mingdan qimmat')).toEqual({ min: 200_000, max: null });
    expect(parsePrices('от 50 000 сум')).toEqual({ min: 50_000, max: null });
    expect(parsePrices('50 000 dan 120 000 gacha')).toEqual({ min: 50_000, max: 120_000 });
    expect(parsePrices('80 000 - 120 000')).toEqual({ min: 80_000, max: 120_000 });
  });

  it('ignores pack sizes, counts and a quality word near the price', () => {
    expect(parsePrices('250 g qadoq')).toEqual({ min: null, max: null });
    expect(parsePrices('20 dona paketcha')).toEqual({ min: null, max: null });
    // "yuqori sifatli" means "high quality", not "more than".
    expect(parsePrices('yuqori sifatli choy 100 ming')).toEqual({ min: null, max: 100_000 });
  });
});

describe('parseRequest', () => {
  it('maps a request to catalogue criteria, preferring the more specific category', () => {
    const parsed = parseRequest(
      "Budjetim 100 000 so'm. Yaxshi sifatli, yumshoq yashil choy kerak, oson damlanadigan.",
      vocabulary,
    );
    expect(parsed).toMatchObject({
      maxPrice: 100_000,
      categorySlug: 'green-tea',
      textQuery: 'yumshoq',
    });
    expect(parsed.unrecorded).toEqual(expect.arrayContaining(['taste', 'quality', 'easyBrew']));
  });

  it('understands Russian and English names, attributes and negations', () => {
    expect(parseRequest('Чёрный чай, цельный лист', vocabulary)).toMatchObject({
      categorySlug: 'black-tea',
      attributes: { 'leaf-style': ['whole'] },
    });
    expect(parseRequest('green tea, not flavoured', vocabulary).attributes).toEqual({
      flavoured: ['false'],
    });
    expect(parseRequest('a flavoured tea', vocabulary).attributes).toEqual({ flavoured: ['true'] });
  });

  it('finds gifts, formats and product types without tea-specific rules', () => {
    expect(parseRequest("sovg'a uchun", vocabulary)).toMatchObject({
      gift: true,
      categorySlug: 'gift-sets',
    });
    expect(parseRequest('qahva 200 ming', vocabulary)).toMatchObject({
      productTypeKey: 'coffee',
      maxPrice: 200_000,
      categorySlug: null,
    });
    expect(parseRequest('choy paketchalarda', vocabulary).formats).toEqual(['TEA_BAGS']);
    expect(parseRequest('ozish uchun foydali choy', vocabulary).unrecorded).toEqual(['health']);
  });

  it('finds a place of origin the catalogue records, with its endings', () => {
    expect(parseRequest('Yunnan choyi', vocabulary)).toMatchObject({
      origin: 'yunnan',
      categorySlug: 'tea',
      textQuery: null,
    });
    expect(parseRequest('Hunandan yashil choy', vocabulary)).toMatchObject({
      origin: 'hunan',
      categorySlug: 'green-tea',
    });
    expect(parseRequest('юньнаньский чай', vocabulary).origin).toBe('yunnan');
    expect(parseRequest('Yashil choy tavsiya qiling', vocabulary).origin).toBeNull();
  });
});

describe('redactPersonalData', () => {
  it('removes phone numbers and e-mail addresses but keeps prices', () => {
    expect(
      redactPersonalData('Menga +998 90 123 45 67 ga yoki a.b@mail.uz ga yozing, 100 000'),
    ).toBe('Menga [phone] ga yoki [email] ga yozing, 100 000');
  });
});
