import { jsonError, missingKeyMessage } from "@/lib/http";
import { getProvider } from "@/lib/llm";
import { buildSystemPrompt } from "@/lib/prompts";
import type { StreamEvent } from "@/lib/types";
import { parseAskRequest } from "@/lib/validation";

export const runtime = "nodejs";
// Answers take 5-20 s and a model fallback can add more; keep well above that on Vercel.
export const maxDuration = 60;

export async function POST(request: Request) {
  const body: unknown = await request.json().catch(() => undefined);
  const parsed = parseAskRequest(body);
  if (!parsed.ok) return jsonError(parsed.error, 400);
  const { question, mode, teamContext } = parsed.value;

  const provider = getProvider();
  if (!provider.isConfigured()) return jsonError(missingKeyMessage(provider.envKey), 503);

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: StreamEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));

      try {
        const answer = provider.stream({
          system: buildSystemPrompt(mode, teamContext),
          question,
          effort: mode.effort,
          signal: request.signal,
        });

        let next = await answer.next();
        while (!next.done) {
          const chunk = next.value;
          send(chunk.type === "text" ? { type: "delta", text: chunk.text } : { type: "reset" });
          next = await answer.next();
        }

        const result = next.value;
        if (result.stopReason === "refusal") {
          send({ type: "error", message: "AI не может ответить на этот запрос. Попробуйте переформулировать." });
        } else {
          if (result.stopReason === "max_tokens") {
            send({ type: "delta", text: "\n\n_…ответ обрезан из-за ограничения длины._" });
          }
          send({ type: "done", model: result.model });
        }
      } catch (error) {
        if (request.signal.aborted) return;
        console.error("[api/ask]", error);
        send({ type: "error", message: provider.toUserMessage(error) });
      } finally {
        try {
          controller.close();
        } catch {
          // stream already closed by a client disconnect
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
