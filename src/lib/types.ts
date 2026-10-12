import type { ModeId } from "./modes";

export const MAX_QUESTION_LENGTH = 8000;
export const MAX_CONTEXT_LENGTH = 2000;

export interface AskRequest {
  question: string;
  mode: ModeId;
  teamContext?: string;
}

// The API streams newline-delimited JSON events.
export type StreamEvent =
  | { type: "delta"; text: string }
  | { type: "reset" } // a fallback model took over: discard the partial answer
  | { type: "done"; model: string }
  | { type: "error"; message: string };

export interface HistoryItem {
  id: string;
  question: string;
  answer: string;
  mode: ModeId;
  createdAt: number;
  durationMs: number;
  model?: string;
}
