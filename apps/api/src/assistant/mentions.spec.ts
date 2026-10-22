import { describe, expect, it } from 'vitest';
import { mentions, plainWords } from './mentions.js';

describe('plainWords', () => {
  it('drops case, apostrophes, accents and punctuation', () => {
    expect(plainWords('Shokoladli konfetlar: sovgʻa qutisi!')).toEqual([
      'shokoladli',
      'konfetlar',
      'sovga',
      'qutisi',
    ]);
    expect(plainWords('Зелёный чай')).toEqual(['зеленыи', 'чаи']);
  });
});

describe('mentions', () => {
  it('knows a product by the code on its pack, endings and all', () => {
    expect(mentions('TERAN 8830 yashil choyi juda mayin.', 'TERAN 8830')).toBe(true);
    expect(mentions('Sizga XC2025ni tavsiya qilaman.', 'TERAN XC2025')).toBe(true);
    expect(mentions('TERAN choylari yashil.', 'TERAN XC2025')).toBe(false);
    expect(mentions('TERAN 8800 bor.', 'TERAN 8830')).toBe(false);
  });

  it('knows a name by all its longer words, whatever their endings', () => {
    expect(mentions('Klassik yashil choyni sinab koʻring.', 'Klassik yashil choy')).toBe(true);
    expect(mentions('Попробуйте классического зелёного чая.', 'Классический зелёный чай')).toBe(
      true,
    );
    expect(
      mentions(
        'Shokoladli konfetlar sovgʻa qutisi — ajoyib sovgʻa.',
        'Shokoladli konfetlar: sovgʻa qutisi',
      ),
    ).toBe(true);
    expect(mentions('Qora shokolad 70% choy bilan yaxshi.', 'Qora shokolad 70%')).toBe(true);
  });

  it('does not take a general word for a product', () => {
    expect(mentions('Bizda yashil choylar koʻp.', 'Klassik yashil choy')).toBe(false);
    expect(mentions('Shokoladlarimiz bor.', 'Qora shokolad 70%')).toBe(false);
    expect(mentions('Salom!', 'TERAN')).toBe(false);
  });
});
