import { describeDevice } from './account.service.js';

describe('describeDevice', () => {
  it('shortens a User-Agent header to browser and system', () => {
    expect(
      describeDevice(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('Safari, iOS');
    expect(
      describeDevice(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0',
      ),
    ).toBe('Edge, Windows');
    expect(describeDevice('curl/8.0')).toBeNull();
    expect(describeDevice(null)).toBeNull();
  });
});
