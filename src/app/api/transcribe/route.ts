import { jsonError, missingKeyMessage } from "@/lib/http";
import { gemini, transcribe } from "@/lib/llm/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

// Vercel rejects request bodies over 4.5 MB; a minute of Opus audio is well under 1 MB.
const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const TOO_LONG = "Запись слишком длинная. Говорите не дольше минуты.";

// Accepts raw recorded audio (Content-Type: audio/*) and returns { text }.
export async function POST(request: Request) {
  // Drop codec parameters: "audio/webm;codecs=opus" -> "audio/webm".
  const mimeType = (request.headers.get("content-type") ?? "").split(";")[0].trim();
  if (!mimeType.startsWith("audio/")) return jsonError("Ожидается аудиозапись.", 415);
  if (Number(request.headers.get("content-length")) > MAX_AUDIO_BYTES) return jsonError(TOO_LONG, 413);

  if (!gemini.isConfigured()) return jsonError(missingKeyMessage(gemini.envKey), 503);

  const audio = Buffer.from(await request.arrayBuffer());
  if (audio.length === 0) return jsonError("Запись пустая. Попробуйте ещё раз.", 400);
  if (audio.length > MAX_AUDIO_BYTES) return jsonError(TOO_LONG, 413);

  try {
    const text = await transcribe(audio.toString("base64"), mimeType, request.signal);
    // A lone letter is the model guessing at noise, not a question.
    if (text.replace(/[^\p{L}\p{N}]/gu, "").length < 2) {
      return jsonError("Не удалось расслышать речь. Попробуйте ещё раз.", 422);
    }
    return Response.json({ text });
  } catch (error) {
    console.error("[api/transcribe]", error);
    return jsonError(gemini.toUserMessage(error), 502);
  }
}
