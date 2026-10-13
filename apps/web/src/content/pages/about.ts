import type { Localized, LongFormContent } from '../types';

/**
 * About page. Brand values only (from TERAN's own slogan "nature, quality, elegance"); no history,
 * origins, certifications or figures are stated until TERAN provides verified facts.
 */
export const aboutPage: Localized<LongFormContent> = {
  en: {
    title: 'About TERAN',
    description:
      'TERAN is a tea manufacturer from Uzbekistan. Nature, quality and elegance — in every cup.',
    intro:
      'TERAN is a tea manufacturer from Uzbekistan. We make tea for everyday rituals and for the moments worth celebrating — from the first cup of the morning to a long conversation over a pot of tea.',
    sections: [
      {
        id: 'nature',
        heading: 'Nature',
        blocks: [
          'Good tea starts with the leaf. We respect it, and let its colour, aroma and taste speak for themselves.',
        ],
      },
      {
        id: 'quality',
        heading: 'Quality',
        blocks: [
          'We pay attention to every step that brings tea to your cup, and to packing it so that it reaches you as it should.',
        ],
      },
      {
        id: 'elegance',
        heading: 'Elegance',
        blocks: [
          'Tea is part of hospitality. Our packaging, gift sets and this store are made to make sharing tea feel special.',
        ],
      },
      {
        id: 'range',
        heading: 'Something for every cup',
        blocks: [
          'Loose leaf tea for a slow brew, tea bags and pyramids for busy days, and gift sets for the people you care about.',
        ],
      },
      {
        id: 'story',
        heading: 'Our story',
        blocks: [
          {
            note: '[TERAN’s history, production and photographs will be added here once TERAN provides them.]',
          },
        ],
      },
    ],
  },
  ru: {
    title: 'О TERAN',
    description:
      'TERAN — производитель чая из Узбекистана. Природа, качество и элегантность — в каждой чашке.',
    intro:
      'TERAN — производитель чая из Узбекистана. Мы делаем чай для ежедневных ритуалов и для особых моментов — от первой утренней чашки до долгой беседы за чайником.',
    sections: [
      {
        id: 'nature',
        heading: 'Природа',
        blocks: [
          'Хороший чай начинается с листа. Мы бережно относимся к нему и позволяем его цвету, аромату и вкусу говорить самим за себя.',
        ],
      },
      {
        id: 'quality',
        heading: 'Качество',
        blocks: [
          'Мы внимательны к каждому шагу на пути чая к вашей чашке — и к упаковке, чтобы он дошёл до вас таким, каким должен быть.',
        ],
      },
      {
        id: 'elegance',
        heading: 'Элегантность',
        blocks: [
          'Чай — часть гостеприимства. Наша упаковка, подарочные наборы и этот магазин созданы, чтобы делиться чаем было особенно приятно.',
        ],
      },
      {
        id: 'range',
        heading: 'Для каждой чашки',
        blocks: [
          'Листовой чай для неторопливого заваривания, чайные пакетики и пирамидки для занятых дней и подарочные наборы для близких.',
        ],
      },
      {
        id: 'story',
        heading: 'Наша история',
        blocks: [
          {
            note: '[История TERAN, сведения о производстве и фотографии появятся здесь, когда TERAN их предоставит.]',
          },
        ],
      },
    ],
  },
  uz: {
    title: 'TERAN haqida',
    description:
      'TERAN — Oʻzbekistondagi choy ishlab chiqaruvchisi. Tabiat, sifat va nafosat — har bir piyolada.',
    intro:
      'TERAN — Oʻzbekistondagi choy ishlab chiqaruvchisi. Biz kundalik odatlar va alohida lahzalar uchun choy tayyorlaymiz — ertalabki birinchi piyoladan tortib choynak atrofidagi uzoq suhbatgacha.',
    sections: [
      {
        id: 'nature',
        heading: 'Tabiat',
        blocks: [
          'Yaxshi choy bargdan boshlanadi. Biz unga ehtiyotkorlik bilan munosabatda boʻlamiz va uning rangi, xushboʻyligi va taʼmi oʻzi gapirishiga imkon beramiz.',
        ],
      },
      {
        id: 'quality',
        heading: 'Sifat',
        blocks: [
          'Biz choyning piyolangizgacha boʻlgan har bir bosqichiga va u sizga kerakli holatda yetib borishi uchun qadoqlashga eʼtibor beramiz.',
        ],
      },
      {
        id: 'elegance',
        heading: 'Nafosat',
        blocks: [
          'Choy — mehmondoʻstlikning bir qismi. Qadoqlarimiz, sovgʻa toʻplamlarimiz va ushbu doʻkon choy bilan boʻlishishni yanada yoqimli qilish uchun yaratilgan.',
        ],
      },
      {
        id: 'range',
        heading: 'Har bir piyola uchun',
        blocks: [
          'Shoshilmasdan damlash uchun bargli choy, band kunlar uchun choy paketchalari va piramidalar hamda yaqinlaringiz uchun sovgʻa toʻplamlari.',
        ],
      },
      {
        id: 'story',
        heading: 'Bizning tariximiz',
        blocks: [
          {
            note: '[TERAN tarixi, ishlab chiqarish haqidagi maʼlumotlar va suratlar TERAN ularni taqdim etgach shu yerda paydo boʻladi.]',
          },
        ],
      },
    ],
  },
};
