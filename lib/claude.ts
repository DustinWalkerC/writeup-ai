import Anthropic from '@anthropic-ai/sdk';

const CLAUDE_MODEL = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

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
}

/** Non-streaming report generation */
export async function generateReport(
  params: GenerateReportParams
): Promise<{ content: string; usage: { inputTokens: number; outputTokens: number } }> {
  const anthropic = getClient();

  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: params.maxTokens || 8000,
    system: [{
      type: 'text',
      text: params.systemPrompt,
      cache_control: { type: 'ephemeral' }
    }],
    messages: [{ role: 'user', content: params.userPrompt }],
  });

  const textContent = response.content
    .filter(block => block.type === 'text')
    .map(block => block.type === 'text' ? block.text : '')
    .join('');

  return {
    content: textContent,
    usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
  };
}

/** Streaming report generation — returns SSE stream */
export async function generateReportStream(
  params: GenerateReportParams
): Promise<ReadableStream<Uint8Array>> {
  const anthropic = getClient();

  const stream = await anthropic.messages.stream({
    model: CLAUDE_MODEL,
    max_tokens: params.maxTokens || 8000,
    system: [{
      type: 'text',
      text: params.systemPrompt,
      cache_control: { type: 'ephemeral' }
    }],
    messages: [{ role: 'user', content: params.userPrompt }],
  });

  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && 'text' in event.delta) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'text', text: event.delta.text })}\n\n`));
          } else if (event.type === 'message_stop') {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
          }
        }
        const final = await stream.finalMessage();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const usageData = final.usage as any;
        const usage = JSON.stringify({
          type: 'usage',
          inputTokens: final.usage.input_tokens,
          outputTokens: final.usage.output_tokens,
          cacheReadTokens: usageData.cache_read_input_tokens || 0,
          cacheCreationTokens: usageData.cache_creation_input_tokens || 0,
        });
        controller.enqueue(encoder.encode(`data: ${usage}\n\n`));
        controller.close();
      } catch (error) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'error', message: error instanceof Error ? error.message : 'Unknown error' })}\n\n`));
        controller.close();
      }
    }
  });
}

/** Regenerate single section (non-streaming, fast) */
export async function regenerateSection(
  systemPrompt: string,
  sectionPrompt: string
): Promise<string> {
  const anthropic = getClient();
  const response = await anthropic.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 2000,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: sectionPrompt }],
  });
  return response.content.filter(b => b.type === 'text').map(b => b.type === 'text' ? b.text : '').join('');
}
