// Model client interface (tool layer dev spec §10): the loop is written
// against this, not against @anthropic-ai/sdk directly, so it can be
// exercised end to end with a deterministic fake and zero API calls in
// tests. AnthropicModelClient is the real implementation.
import Anthropic from '@anthropic-ai/sdk';

export type ContentBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown };

export interface AssistantMessage {
  role: 'assistant';
  content: ContentBlock[];
}

export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  is_error?: boolean;
  content: string;
}

export interface UserMessage {
  role: 'user';
  content: string | ToolResultBlock[];
}

export type ConversationMessage = AssistantMessage | UserMessage;

export type StopReason = 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';

export interface ModelResponse {
  stop_reason: StopReason;
  content: ContentBlock[];
}

export type ToolChoice = { type: 'auto' } | { type: 'tool'; name: string };

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface ModelClient {
  send(params: {
    system: string;
    messages: ConversationMessage[];
    tools: ToolDefinition[];
    toolChoice: ToolChoice;
  }): Promise<ModelResponse>;
}

const MODEL = 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 2048;

export class AnthropicModelClient implements ModelClient {
  private readonly client: Anthropic;

  constructor(apiKey?: string, workspaceId?: string) {
    // Identity-linked API keys must name the workspace the request acts in
    // (the API rejects them 400 otherwise). Workspace-scoped keys don't need
    // this, so the header is only sent when ANTHROPIC_WORKSPACE_ID is set.
    const ws = workspaceId ?? process.env.ANTHROPIC_WORKSPACE_ID;
    this.client = new Anthropic({
      apiKey,
      ...(ws ? { defaultHeaders: { 'anthropic-workspace-id': ws } } : {}),
    });
  }

  async send(params: {
    system: string;
    messages: ConversationMessage[];
    tools: ToolDefinition[];
    toolChoice: ToolChoice;
  }): Promise<ModelResponse> {
    const response = await this.client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: params.system,
      messages: params.messages as Anthropic.MessageParam[],
      tools: params.tools as Anthropic.Tool[],
      tool_choice:
        params.toolChoice.type === 'tool'
          ? { type: 'tool', name: params.toolChoice.name }
          : { type: 'auto' },
    });

    return {
      stop_reason: (response.stop_reason ?? 'end_turn') as StopReason,
      content: response.content as ContentBlock[],
    };
  }
}
