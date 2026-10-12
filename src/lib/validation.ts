import { getMode, type Mode } from "./modes";
import { MAX_CONTEXT_LENGTH, MAX_QUESTION_LENGTH } from "./types";

export interface ValidAskRequest {
  question: string;
  mode: Mode;
  teamContext: string;
}

export type ValidationResult = { ok: true; value: ValidAskRequest } | { ok: false; error: string };

// Validates an untrusted /api/ask body. Never throws, whatever JSON the client sends.
export function parseAskRequest(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, error: "Некорректный формат запроса." };
  }
  const input = body as Record<string, unknown>;

  const question = typeof input.question === "string" ? input.question.trim() : "";
  const teamContext = typeof input.teamContext === "string" ? input.teamContext.trim() : "";
  const mode = typeof input.mode === "string" ? getMode(input.mode) : undefined;

  if (!question) return { ok: false, error: "Введите вопрос." };
  if (question.length > MAX_QUESTION_LENGTH) {
    return { ok: false, error: `Вопрос слишком длинный (максимум ${MAX_QUESTION_LENGTH} символов).` };
  }
  if (teamContext.length > MAX_CONTEXT_LENGTH) {
    return { ok: false, error: `Контекст команды слишком длинный (максимум ${MAX_CONTEXT_LENGTH} символов).` };
  }
  if (!mode) return { ok: false, error: "Неизвестный режим ассистента." };

  return { ok: true, value: { question, mode, teamContext } };
}
