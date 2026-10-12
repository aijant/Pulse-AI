import Anthropic from "@anthropic-ai/sdk";
import type { LlmProvider } from "./types";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-opus-5-5";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  client ??= new Anthropic({ maxRetries: 2, timeout: 120_000 });
  return client;
}

export const claude: LlmProvider = {
  name: "Claude",
  envKey: "ANTHROPIC_API_KEY",

  isConfigured: () => Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN),

  async *stream(request) {
    const stream = getClient().beta.messages.stream(
      {
        model: MODEL,
        max_tokens: 16000,
        system: request.system,
        messages: [{ role: "user", content: request.question }],
        output_config: { effort: request.effort },
        // If a safety classifier declines, the API re-runs the request on a fallback model.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
      },
      { signal: request.signal },
    );

    for await (const event of stream) {
      if (event.type === "content_block_start" && event.content_block.type === "fallback") {
        yield { type: "reset" };
      } else if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        yield { type: "text", text: event.delta.text };
      }
    }

    const message = await stream.finalMessage();
    const stopReason =
      message.stop_reason === "refusal" ? "refusal" : message.stop_reason === "max_tokens" ? "max_tokens" : "end";
    return { model: message.model, stopReason };
  },

  toUserMessage(error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return "Неверный API-ключ. Проверьте значение ANTHROPIC_API_KEY.";
    }
    if (error instanceof Anthropic.PermissionDeniedError) {
      return "У API-ключа нет доступа к этой модели.";
    }
    if (error instanceof Anthropic.RateLimitError) {
      return "Слишком много запросов. Подождите немного и попробуйте снова.";
    }
    // The API reports an empty balance as a plain 400, so the message is the only signal.
    if (error instanceof Anthropic.APIError && /credit balance/i.test(error.message)) {
      return "На аккаунте Anthropic закончились кредиты. Пополните баланс в Plans & Billing.";
    }
    if (error instanceof Anthropic.BadRequestError) {
      return "Запрос отклонён API. Попробуйте сократить или переформулировать вопрос.";
    }
    if (error instanceof Anthropic.APIConnectionTimeoutError) {
      return "AI слишком долго отвечает. Попробуйте ещё раз.";
    }
    // APIConnectionError extends APIError in the TS SDK, so check it first.
    if (error instanceof Anthropic.APIConnectionError) {
      return "Не удалось связаться с AI-сервисом. Проверьте интернет-соединение.";
    }
    if (error instanceof Anthropic.APIError) {
      if (error.status === 529 || (error.status ?? 0) >= 500) {
        return "AI-сервис временно перегружен. Попробуйте через минуту.";
      }
      return `Ошибка AI-сервиса (${error.status ?? "unknown"}).`;
    }
    return "Что-то пошло не так. Попробуйте ещё раз.";
  },
};
