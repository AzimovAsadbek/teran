import { describe, expect, it } from 'vitest';

describe('instrumentation-client', () => {
  it('switches Zod to jitless mode without importing it', async () => {
    await import('../instrumentation-client');
    const { config } = await import('zod');
    expect(config().jitless).toBe(true);
  });
});
