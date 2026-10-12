import type { Effort } from "../modes";

export interface LlmRequest {
  system: string;
  question: string;
  effort: Effort;
  signal: AbortSignal;
}

// "reset" means the provider switched models mid-answer: drop the partial text.
export type LlmChunk = { type: "text"; text: string } | { type: "reset" };

export interface LlmResult {
  model: string;
  stopReason: "end" | "max_tokens" | "refusal";
}

// Each AI vendor implements this, so the API route does not depend on a specific SDK.
export interface LlmProvider {
  name: string;
  envKey: string;
  isConfigured(): boolean;
  stream(request: LlmRequest): AsyncGenerator<LlmChunk, LlmResult>;
  toUserMessage(error: unknown): string;
}
