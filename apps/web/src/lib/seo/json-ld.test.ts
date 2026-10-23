// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { serializeJsonLd } from './json-ld';

describe('structured data serialisation', () => {
  it('cannot end the script tag or open markup, whatever a name or review says', () => {
    const data = {
      '@type': 'Product',
      name: 'Tea</script><script>alert(1)</script>',
      description: '<!-- a & b > c -->',
    };
    const json = serializeJsonLd(data);
    expect(json).not.toMatch(/[<>&]/);
    expect(json).not.toContain('</script');
    // The values search engines read are unchanged.
    expect(JSON.parse(json)).toEqual(data);
  });

  it('escapes the JavaScript line separators', () => {
    const data = { reviewBody: 'one\u2028two\u2029three' };
    const json = serializeJsonLd(data);
    expect(json).not.toMatch(/[\u2028\u2029]/);
    expect(JSON.parse(json)).toEqual(data);
  });

  it('drops properties that have no value', () => {
    expect(JSON.parse(serializeJsonLd({ name: 'TERAN', description: undefined }))).toEqual({
      name: 'TERAN',
    });
  });
});
