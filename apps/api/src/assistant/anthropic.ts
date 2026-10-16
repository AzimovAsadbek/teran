/**
 * The Messages API of an AI provider (Anthropic), called with the built-in fetch. The key stays
 * on the server; errors carry the HTTP status only, never the key or the request.
 */

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string; is_error?: boolean };

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ModelReply {
  content: ContentBlock[];
  stop_reason: string | null;
}

export class AssistantProviderError extends Error {}

export class AnthropicClient {
  constructor(private readonly options: { apiBase: string; apiKey: string; model: string }) {}

  async create(request: {
    system: string;
    messages: ChatMessage[];
    tools: ToolDefinition[];
    maxTokens: number;
    signal: AbortSignal;
  }): Promise<ModelReply> {
    let response: Response;
    try {
      response = await fetch(`${this.options.apiBase.replace(/\/$/, '')}/v1/messages`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': this.options.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.options.model,
          max_tokens: request.maxTokens,
          system: request.system,
          messages: request.messages,
          tools: request.tools,
          tool_choice: { type: 'auto' },
        }),
        signal: request.signal,
      });
    } catch (error) {
      const timedOut = error instanceof Error && error.name === 'TimeoutError';
      throw new AssistantProviderError(timedOut ? 'provider timeout' : 'provider unreachable');
    }
    if (!response.ok) throw new AssistantProviderError(`provider answered HTTP ${response.status}`);
    const body = (await response.json().catch(() => null)) as ModelReply | null;
    if (!body || !Array.isArray(body.content)) {
      throw new AssistantProviderError('provider answer not understood');
    }
    return body;
  }
}
