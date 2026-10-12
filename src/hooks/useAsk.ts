"use client";

import { useCallback, useRef, useState } from "react";
import type { AskRequest, StreamEvent } from "@/lib/types";

export type AskStatus = "idle" | "loading" | "streaming" | "done" | "error";

export interface AskResult {
  answer: string;
  durationMs: number;
  model?: string;
}

const NETWORK_ERROR = "Нет связи с сервером. Проверьте подключение к интернету.";

// Sends a question to /api/ask and streams the NDJSON answer into state.
export function useAsk() {
  const [status, setStatus] = useState<AskStatus>("idle");
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);
  const controllerRef = useRef<AbortController | null>(null);

  const ask = useCallback(async (request: AskRequest): Promise<AskResult | null> => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    // A newer ask() or show() supersedes this request; it must not touch state after that.
    const isCurrent = () => controllerRef.current === controller;

    setStatus("loading");
    setAnswer("");
    setError(null);
    const startedAt = performance.now();

    const fail = (message: string) => {
      if (isCurrent()) {
        setError(message);
        setStatus("error");
      }
      return null;
    };

    try {
      const response = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => null);
        return fail(data?.error ?? `Ошибка сервера (${response.status}).`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let text = "";
      let model: string | undefined;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;

          if (event.type === "delta") {
            text += event.text;
            setAnswer(text);
            setStatus("streaming");
          } else if (event.type === "reset") {
            text = "";
            setAnswer("");
          } else if (event.type === "done") {
            model = event.model;
          } else if (event.type === "error") {
            return fail(event.message);
          }
        }
      }

      if (!text.trim()) return fail("AI вернул пустой ответ. Попробуйте ещё раз.");

      setStatus("done");
      return { answer: text, durationMs: Math.round(performance.now() - startedAt), model };
    } catch (err) {
      if (controller.signal.aborted) {
        // Stopped by the user: keep whatever was streamed so far.
        if (isCurrent()) setStatus((current) => (current === "streaming" ? "done" : "idle"));
        return null;
      }
      console.error(err);
      return fail(err instanceof SyntaxError ? "Сервер вернул некорректный ответ." : NETWORK_ERROR);
    }
  }, []);

  const stop = useCallback(() => controllerRef.current?.abort(), []);

  // Shows a saved answer (from history), cancelling any request in flight.
  const show = useCallback((text: string) => {
    controllerRef.current?.abort();
    controllerRef.current = null;
    setAnswer(text);
    setError(null);
    setStatus("done");
  }, []);

  return { status, answer, error, ask, stop, show };
}
