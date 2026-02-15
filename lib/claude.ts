/**
 * CORE — Claude API Client
 *
 * Updated to support per-call model and temperature overrides.
 * The CORE pipeline passes different models for extraction vs narrative calls.
 * Falls back to CLAUDE_MODEL env var if no per-call override is provided.
 *
 * No assistant prefill — compatible with all models including Opus 4.6.
 */

import Anthropic from '@anthropic-ai/sdk';

const DEFAULT_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929';

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  }
  return client;
}

export interface GenerateReportParams {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  model?: string;       // CORE: per-call model override
  temperature?: number;  // CORE: per-call temperature override
}

/**
 * Non-streaming report generation.
 * Used by: Legacy full generation, CORE Call 1 (extraction).
 */
export async function generateReport(
  params: GenerateReportParams
): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number } }> {
  const anthropic = getClient();
  const model = params.model || DEFAULT_MODEL;

  const response = await anthropic.messages.create({
    model,
    max_tokens: params.maxTokens || 8000,
    ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
    system: [{
      type: 'text',
      text: params.systemPrompt,
      cache_control: { type: 'ephemeral' },
    }],
    messages: [{ role: 'user', content: params.userPrompt }],
  });

  const textContent = response.content
    .filter(block => block.type === 'text')
    .map(block => {
      if (block.type === 'text') return block.text;
      return '';
    })
    .join('');

  return {
    content: textContent,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}

/**
 * Streaming report generation.
 * Used by: Legacy streaming, CORE Call 2 (narrative + charts).
 * Returns a ReadableStream that the client can consume via SSE.
 */
export async function generateReportStream(
  params: GenerateReportParams
): Promise<ReadableStream<Uint8Array>> {
  const anthropic = getClient();
  const model = params.model || DEFAULT_MODEL;

  const stream = await anthropic.messages.stream({
    model,
    max_tokens: params.maxTokens || 8000,
    ...(params.temperature !== undefined ? { temperature: params.temperature } : {}),
    system: [{
      type: 'text',
      text: params.systemPrompt,
      cache_control: { type: 'ephemeral' },
    }],
    messages: [{ role: 'user', content: params.userPrompt }],
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta') {
            const delta = event.delta;
            if ('text' in delta) {
              const data = JSON.stringify({ type: 'text', text: delta.text });
              controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            }
          } else if (event.type === 'message_stop') {
            const data = JSON.stringify({ type: 'done' });
            controller.enqueue(encoder.encode(`data: ${data}\n\n`));
          }
        }

        // Get final message for usage stats
        const finalMessage = await stream.finalMessage();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rawUsage: any = finalMessage.usage;
        const usageData = JSON.stringify({
          type: 'usage',
          inputTokens: finalMessage.usage.input_tokens,
          outputTokens: finalMessage.usage.output_tokens,
          cacheReadTokens: rawUsage?.cache_read_input_tokens || 0,
          cacheCreationTokens: rawUsage?.cache_creation_input_tokens || 0,
        });
        controller.enqueue(encoder.encode(`data: ${usageData}\n\n`));
        controller.close();
      } catch (error) {
        const errorData = JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
        controller.enqueue(encoder.encode(`data: ${errorData}\n\n`));
        controller.close();
      }
    },
  });
}

/**
 * Regenerate a single section (non-streaming).
 * Uses cached system prompt for efficiency.
 */
export async function regenerateSection(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const result = await generateReport({
    systemPrompt,
    userPrompt,
    maxTokens: 4000,
  });
  return result.content;
}



