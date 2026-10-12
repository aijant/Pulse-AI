import { claude } from "./claude";
import { gemini } from "./gemini";
import type { LlmProvider } from "./types";

const PROVIDERS: Record<string, LlmProvider> = { gemini, claude };

// LLM_PROVIDER picks a vendor explicitly; otherwise the first one with a key wins (Gemini first: free tier).
export function getProvider(): LlmProvider {
  const explicit = process.env.LLM_PROVIDER?.toLowerCase();
  if (explicit && PROVIDERS[explicit]) return PROVIDERS[explicit];
  return Object.values(PROVIDERS).find((provider) => provider.isConfigured()) ?? gemini;
}

export type { LlmProvider } from "./types";
