/**
 * SEAM. The stylist conversation.
 *
 * The real flow is async and cross-process (see the backend bridge plan):
 * send a message -> a job row -> the worker runs the agent -> a reply row ->
 * poll. For now `send()` appends the user's message, flips `thinking` on for
 * a beat, then appends a canned reply.
 */
import { useCallback, useRef, useState } from 'react';
import { MOCK_CANNED_REPLY, MOCK_CHAT, MOCK_SUGGESTIONS } from './mock';
import type { ChatMessage } from './types';

export interface AskData {
  messages: ChatMessage[];
  suggestions: string[];
  thinking: boolean;
  send: (text: string) => void;
  status: 'loading' | 'ready' | 'error';
}

export function useAsk(): AskData {
  const [messages, setMessages] = useState<ChatMessage[]>(MOCK_CHAT);
  const [thinking, setThinking] = useState(false);
  const seq = useRef(0);

  const send = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    seq.current += 1;
    const userMsg: ChatMessage = {
      id: `local-user-${seq.current}`,
      role: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);

    // TODO(backend): Mutation.sendMessage(text) -> { jobId }, then poll
    //   Query.outfitJob(jobId) until done and append the real reply
    //   (which may carry a lookCard).
    setTimeout(() => {
      seq.current += 1;
      setMessages((prev) => [
        ...prev,
        { ...MOCK_CANNED_REPLY, id: `local-agent-${seq.current}` },
      ]);
      setThinking(false);
    }, 1400);
  }, []);

  return {
    messages,
    suggestions: MOCK_SUGGESTIONS,
    thinking,
    send,
    status: 'ready',
  };
}
