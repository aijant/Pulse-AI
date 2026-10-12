import { ApiError, FinishReason, GoogleGenAI, ThinkingLevel, Type } from "@google/genai";
import type { Effort } from "../modes";
import type { LlmChunk, LlmProvider, LlmRequest, LlmResult } from "./types";

// The free tier is often overloaded and has a small daily quota per model (~20 requests),
// so when one model is busy or exhausted the next one in the chain is tried.
const MODELS = [
  ...new Set([
    process.env.GEMINI_MODEL || "gemini-flash-latest",
    "gemini-3.5-flash",
    "gemini-3-flash-preview",
    "gemini-flash-lite-latest",
    "gemini-3.1-flash-lite",
  ]),
];

const THINKING: Record<Effort, ThinkingLevel> = {
  low: ThinkingLevel.LOW,
  medium: ThinkingLevel.MEDIUM,
  high: ThinkingLevel.HIGH,
};

const BLOCKED_REASONS = new Set<string>([
  FinishReason.SAFETY,
  FinishReason.PROHIBITED_CONTENT,
  FinishReason.BLOCKLIST,
  FinishReason.SPII,
  FinishReason.RECITATION,
]);

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  return client;
}

function isOverloaded(error: unknown): boolean {
  return error instanceof ApiError && (error.status === 429 || error.status >= 500);
}

async function* streamFromModel(model: string, request: LlmRequest): AsyncGenerator<LlmChunk, LlmResult> {
  const response = await getClient().models.generateContentStream({
    model,
    contents: request.question,
    config: {
      systemInstruction: request.system,
      maxOutputTokens: 16000,
      thinkingConfig: { thinkingLevel: THINKING[request.effort] },
      abortSignal: request.signal,
    },
  });

  let stopReason: LlmResult["stopReason"] = "end";
  let modelVersion = model;

  for await (const chunk of response) {
    modelVersion = chunk.modelVersion ?? modelVersion;
    if (chunk.promptFeedback?.blockReason) return { model: modelVersion, stopReason: "refusal" };

    const text = chunk.text;
    if (text) yield { type: "text", text };

    const finishReason = chunk.candidates?.[0]?.finishReason;
    if (finishReason && BLOCKED_REASONS.has(finishReason)) stopReason = "refusal";
    else if (finishReason === FinishReason.MAX_TOKENS) stopReason = "max_tokens";
  }

  return { model: modelVersion, stopReason };
}

const TRANSCRIBE_PROMPT = `Decide whether this audio contains a human voice speaking words. Tones, beeps, music, hum and noise are NOT speech.
If it does, transcribe exactly what was said, in the language it is spoken (usually Russian), with normal punctuation.
Never guess or invent words that were not clearly spoken.`;

// Asking for an explicit speech flag first keeps the model from "transcribing" noise.
const TRANSCRIPT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    has_speech: { type: Type.BOOLEAN },
    transcript: { type: Type.STRING },
  },
  required: ["has_speech", "transcript"],
  propertyOrdering: ["has_speech", "transcript"],
};

// Speech-to-text for voice questions. Returns "" when there is no speech.
// Uses the same model chain, so overloads fall back too.
export async function transcribe(audioBase64: string, mimeType: string, signal: AbortSignal): Promise<string> {
  for (const [index, model] of MODELS.entries()) {
    try {
      const response = await getClient().models.generateContent({
        model,
        contents: [
          { role: "user", parts: [{ inlineData: { data: audioBase64, mimeType } }, { text: TRANSCRIBE_PROMPT }] },
        ],
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: TRANSCRIPT_SCHEMA,
          abortSignal: signal,
        },
      });
      const result = JSON.parse(response.text ?? "{}") as { has_speech?: boolean; transcript?: string };
      return result.has_speech ? (result.transcript ?? "").trim() : "";
    } catch (error) {
      if (index === MODELS.length - 1 || !isOverloaded(error)) throw error;
    }
  }
  return "";
}

export const gemini: LlmProvider = {
  name: "Gemini",
  envKey: "GEMINI_API_KEY",

  isConfigured: () => Boolean(process.env.GEMINI_API_KEY),

  async *stream(request) {
    for (const [index, model] of MODELS.entries()) {
      let started = false;
      try {
        const generator = streamFromModel(model, request);
        while (true) {
          const next = await generator.next();
          if (next.done) return next.value;
          started = true;
          yield next.value;
        }
      } catch (error) {
        // Fall back only before any text was shown, and only for capacity errors.
        const hasFallback = index < MODELS.length - 1;
        if (started || !hasFallback || !isOverloaded(error)) throw error;
        console.warn(`[gemini] ${model} unavailable (${(error as ApiError).status}), trying ${MODELS[index + 1]}`);
      }
    }
    throw new Error("No Gemini models configured");
  },

  toUserMessage(error) {
    if (error instanceof ApiError) {
      if (error.status === 400 && /api key/i.test(error.message)) {
        return "Неверный API-ключ. Проверьте значение GEMINI_API_KEY.";
      }
      if (error.status === 401 || error.status === 403) {
        return "У API-ключа нет доступа к Gemini. Проверьте ключ в Google AI Studio.";
      }
      if (error.status === 404) return "Модель Gemini недоступна. Укажите другую в GEMINI_MODEL.";
      if (error.status === 429 && /PerDay/i.test(error.message)) {
        return "Дневной лимит бесплатных запросов Gemini исчерпан. Попробуйте завтра или подключите другой ключ.";
      }
      if (error.status === 429) {
        return "Слишком много запросов к Gemini. Подождите минуту и попробуйте снова.";
      }
      if (error.status >= 500) return "Все модели Gemini сейчас перегружены. Попробуйте через минуту.";
      if (error.status === 400) return "Запрос отклонён API. Попробуйте сократить или переформулировать вопрос.";
      return `Ошибка AI-сервиса (${error.status}).`;
    }
    if (error instanceof TypeError) {
      return "Не удалось связаться с AI-сервисом. Проверьте интернет-соединение.";
    }
    return "Что-то пошло не так. Попробуйте ещё раз.";
  },
};
