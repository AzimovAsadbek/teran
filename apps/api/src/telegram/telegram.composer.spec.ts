import { escapeHtml, publicUrl, summarize, visibleLength } from './telegram.composer.js';

describe('Telegram post text', () => {
  it('escapes HTML and counts only visible characters', () => {
    expect(escapeHtml('Choy <b> & "sut"')).toBe('Choy &lt;b&gt; &amp; &quot;sut&quot;');
    expect(visibleLength('<b>TERAN</b> &amp; <a href="https://x">link</a>')).toBe(12);
  });

  it('keeps whole sentences when a text is shortened, never a cut word', () => {
    const text = 'Birinchi gap. Ikkinchi gap juda uzun boʻlib davom etadi. Uchinchi.';
    expect(summarize(text, 40)).toBe('Birinchi gap.');
    expect(summarize('Qisqa matn.', 100)).toBe('Qisqa matn.');
    expect(summarize('bitta juda uzun soʻzlarsiz gapsiz matn davom etadi', 20)).toBe(
      'bitta juda uzun…',
    );
  });

  it('links to the public page in the post language (Uzbek has no prefix)', () => {
    expect(publicUrl('https://teran.uz/', 'uz', '/products/8009')).toBe(
      'https://teran.uz/products/8009',
    );
    expect(publicUrl('https://teran.uz', 'ru', '/journal/x')).toBe('https://teran.uz/ru/journal/x');
  });
});
