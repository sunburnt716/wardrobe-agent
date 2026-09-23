// Shared tool_result shape (tool layer dev spec §6/§8). Every handler
// returns this; the dispatcher (tools/registry.ts) never has to know each
// tool's individual return type.
export interface ToolResult {
  tool_use_id: string;
  is_error: boolean;
  content: string;
  // Internal signal to the loop: deliver this result, then stop iterating.
  // Never serialized into the model message (the loop strips it). Used when
  // a proposal is discarded after its look card fails validation twice --
  // there is nothing for the model to fix at that point.
  endLoop?: boolean;
}

export function okResult(toolUseId: string, payload: unknown): ToolResult {
  return { tool_use_id: toolUseId, is_error: false, content: JSON.stringify(payload) };
}

export function errorResult(toolUseId: string, message: string): ToolResult {
  return { tool_use_id: toolUseId, is_error: true, content: message };
}

// A terminal error: the loop delivers it and then stops (see ToolResult.endLoop).
export function discardResult(toolUseId: string, message: string): ToolResult {
  return { tool_use_id: toolUseId, is_error: true, content: message, endLoop: true };
}
