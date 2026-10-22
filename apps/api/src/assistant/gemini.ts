/**
 * Google's Gemini API (generateContent), called with the built-in fetch. The key travels in a
 * header and stays on the server; errors carry the HTTP status and Google's status word only,
 * never the key, the question or the answer.
 */

export interface GeminiContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GeminiRequest {
  /** The standing instructions with what the assistant knows. */
  system: string;
  /** The conversation, oldest first, ending with the visitor's question. */
  contents: GeminiContent[];
  /** The JSON Schema the answer follows. */
  schema: Record<string, unknown>;
  temperature: number;
  maxOutputTokens: number;
  signal: AbortSignal;
}

export type GeminiResult =
  /** The answer's text (JSON, as the schema asks). */
  | { kind: 'text'; text: string }
  /** Google's safety filters held the question or the answer back. */
  | { kind: 'blocked' };

export class GeminiError extends Error {
  /** Worth one more try: Google was busy ("high demand", 503), failed (5xx) or out of reach. */
  constructor(
    message: string,
    readonly retryable = false,
  ) {
    super(message);
  }
}

interface GenerateContentResponse {
  candidates?: {
    content?: { parts?: { text?: unknown; thought?: unknown }[] };
    finishReason?: string;
  }[];
  promptFeedback?: { blockReason?: string };
}

/** Finish reasons that mean a filter stopped the answer, not that something broke. */
const HELD_BACK = new Set(['SAFETY', 'BLOCKLIST', 'PROHIBITED_CONTENT', 'SPII', 'RECITATION']);

export class GeminiClient {
  constructor(private readonly options: { apiBase: string; apiKey: string; model: string }) {}

  get model(): string {
    return this.options.model;
  }

  async generate(request: GeminiRequest): Promise<GeminiResult> {
    const url = `${this.options.apiBase.replace(/\/$/, '')}/v1beta/models/${encodeURIComponent(
      this.options.model,
    )}:generateContent`;
    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': this.options.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: request.system }] },
          contents: request.contents,
          generationConfig: {
            responseMimeType: 'application/json',
            responseJsonSchema: request.schema,
            temperature: request.temperature,
            maxOutputTokens: request.maxOutputTokens,
          },
        }),
        signal: request.signal,
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      throw timedOut
        ? new GeminiError('Gemini timeout')
        : new GeminiError('Gemini unreachable', true);
    }
    if (!response.ok) {
      // Google's status word ("RESOURCE_EXHAUSTED", "PERMISSION_DENIED") says why; nothing else.
      const status = await response
        .json()
        .then((body: { error?: { status?: unknown } }) =>
          typeof body.error?.status === 'string' ? ` ${body.error.status}` : '',
        )
        .catch(() => '');
      throw new GeminiError(
        `Gemini answered HTTP ${response.status}${status}`,
        response.status >= 500,
      );
    }
    const body = (await response.json().catch(() => null)) as GenerateContentResponse | null;
    if (!body) throw new GeminiError('Gemini answer not understood');
    if (body.promptFeedback?.blockReason) return { kind: 'blocked' };
    const candidate = body.candidates?.[0];
    if (candidate?.finishReason && HELD_BACK.has(candidate.finishReason)) {
      return { kind: 'blocked' };
    }
    const text = (candidate?.content?.parts ?? [])
      .filter((part) => part.thought !== true && typeof part.text === 'string')
      .map((part) => part.text as string)
      .join('')
      .trim();
    if (!text) {
      throw new GeminiError(`Gemini gave no text (${candidate?.finishReason ?? 'no candidate'})`);
    }
    return { kind: 'text', text };
  }
}
