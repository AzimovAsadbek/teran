import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GeminiClient, GeminiError, type GeminiRequest } from './gemini.js';

const KEY = 'test-gemini-key-0123456789';

function answer(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function request(): GeminiRequest {
  return {
    system: 'rules',
    contents: [{ role: 'user', parts: [{ text: 'Salom' }] }],
    schema: { type: 'object' },
    temperature: 0.4,
    maxOutputTokens: 512,
    signal: AbortSignal.timeout(5_000),
  };
}

describe('GeminiClient', () => {
  const fetchMock = vi.fn<typeof fetch>();
  const client = new GeminiClient({
    apiBase: 'https://gemini.test/',
    apiKey: KEY,
    model: 'gemini-3.5-flash-lite',
  });
  beforeEach(() => vi.stubGlobal('fetch', fetchMock));
  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it('asks the model for JSON with the key in a header, never in the address', async () => {
    fetchMock.mockResolvedValue(
      answer({ candidates: [{ content: { parts: [{ text: '{"reply":"Salom"}' }] } }] }),
    );
    await expect(client.generate(request())).resolves.toEqual({
      kind: 'text',
      text: '{"reply":"Salom"}',
    });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('https://gemini.test/v1beta/models/gemini-3.5-flash-lite:generateContent');
    expect(url as string).not.toContain(KEY);
    expect((init?.headers as Record<string, string>)['x-goog-api-key']).toBe(KEY);
    const body = JSON.parse(init?.body as string) as Record<string, unknown>;
    expect(body).toMatchObject({
      systemInstruction: { parts: [{ text: 'rules' }] },
      contents: [{ role: 'user', parts: [{ text: 'Salom' }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseJsonSchema: { type: 'object' },
        maxOutputTokens: 512,
      },
    });
  });

  it('leaves the model’s thoughts out of the answer', async () => {
    fetchMock.mockResolvedValue(
      answer({
        candidates: [
          {
            content: {
              parts: [
                { text: 'thinking…', thought: true },
                { text: '{"reply":' },
                { text: '"Ha"}' },
              ],
            },
          },
        ],
      }),
    );
    await expect(client.generate(request())).resolves.toEqual({
      kind: 'text',
      text: '{"reply":"Ha"}',
    });
  });

  it('tells a held-back question or answer apart from a failure', async () => {
    fetchMock.mockResolvedValueOnce(answer({ promptFeedback: { blockReason: 'SAFETY' } }));
    await expect(client.generate(request())).resolves.toEqual({ kind: 'blocked' });
    fetchMock.mockResolvedValueOnce(
      answer({ candidates: [{ finishReason: 'PROHIBITED_CONTENT' }] }),
    );
    await expect(client.generate(request())).resolves.toEqual({ kind: 'blocked' });
  });

  it('reports an error with the status only, never the key', async () => {
    fetchMock.mockResolvedValue(
      answer({ error: { code: 429, status: 'RESOURCE_EXHAUSTED', message: `key ${KEY}` } }, 429),
    );
    const error = await client.generate(request()).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(GeminiError);
    expect((error as Error).message).toBe('Gemini answered HTTP 429 RESOURCE_EXHAUSTED');
    expect((error as Error).message).not.toContain(KEY);
    // A spent quota is not worth another try at once; a busy or failing Google is.
    expect((error as GeminiError).retryable).toBe(false);
    fetchMock.mockResolvedValue(answer({ error: { code: 503, status: 'UNAVAILABLE' } }, 503));
    const busy = await client.generate(request()).catch((caught: unknown) => caught);
    expect((busy as GeminiError).retryable).toBe(true);
  });

  it('fails plainly when there is no answer or no text', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    await expect(client.generate(request())).rejects.toThrow('Gemini unreachable');
    fetchMock.mockResolvedValueOnce(answer({ candidates: [{ finishReason: 'MAX_TOKENS' }] }));
    await expect(client.generate(request())).rejects.toThrow('Gemini gave no text (MAX_TOKENS)');
  });
});
