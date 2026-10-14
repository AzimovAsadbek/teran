import type { Localized, LongFormContent } from '../types';

/**
 * About page sections that are not part of the official brand copy. The brand story and the three
 * principles come from content/brand.ts (supplied by TERAN); history, production and photographs
 * are still to be supplied, so they appear as a highlighted placeholder.
 */
export const aboutPage: Localized<LongFormContent> = {
  en: {
    title: 'About TERAN',
    description:
      'TERAN® — premium Chinese tea. In every cup, the rich traditions of Chinese tea culture meet the spirit of Uzbek hospitality.',
    sections: [
      {
        id: 'range',
        heading: 'Something for every cup',
        blocks: [
          'Loose leaf tea for a slow brew, tea bags and pyramids for busy days, and gift sets for the people you care about.',
        ],
      },
      {
        id: 'history',
        heading: 'Our history',
        blocks: [
          {
            note: '[TERAN’s history and photographs will be added here once TERAN provides them.]',
          },
        ],
      },
    ],
  },
  ru: {
    title: 'О TERAN',
    description:
      'TERAN® — премиальный китайский чай. В каждой пиале традиции китайской чайной культуры соединяются с узбекским гостеприимством.',
    sections: [
      {
        id: 'range',
        heading: 'Для каждой чашки',
        blocks: [
          'Листовой чай для неторопливого заваривания, чайные пакетики и пирамидки для занятых дней и подарочные наборы для близких.',
        ],
      },
      {
        id: 'history',
        heading: 'Наша история',
        blocks: [
          {
            note: '[История TERAN и фотографии появятся здесь, когда TERAN их предоставит.]',
          },
        ],
      },
    ],
  },
  uz: {
    title: 'TERAN haqida',
    description:
      'TERAN® — premium Xitoy choyi. Har bir piyolada Xitoy choy madaniyatining boy an’analari va o‘zbekona mehmondo‘stlik ruhi uyg‘unlashadi.',
    sections: [
      {
        id: 'range',
        heading: 'Har bir piyola uchun',
        blocks: [
          'Shoshilmasdan damlash uchun bargli choy, band kunlar uchun choy paketchalari va piramidalar hamda yaqinlaringiz uchun sovgʻa toʻplamlari.',
        ],
      },
      {
        id: 'history',
        heading: 'Bizning tariximiz',
        blocks: [
          {
            note: '[TERAN tarixi va suratlari TERAN ularni taqdim etgach shu yerda paydo boʻladi.]',
          },
        ],
      },
    ],
  },
};
