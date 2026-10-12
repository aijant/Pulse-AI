"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceStatus = "idle" | "recording" | "transcribing";

const MAX_RECORDING_MS = 60_000;
// Peak amplitude (0..1) below which a recording is treated as silence.
// Models tend to invent words for silent audio, so silence is never sent.
const SILENCE_THRESHOLD = 0.04;

// Formats the server can pass to Gemini, in order of preference.
const MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];

function pickMimeType(): string | undefined {
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type));
}

function micErrorMessage(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") {
    return "Нет доступа к микрофону. Разрешите его в настройках браузера.";
  }
  if (name === "NotFoundError") return "Микрофон не найден.";
  if (name === "NotReadableError") return "Микрофон занят другим приложением.";
  return "Не удалось включить микрофон.";
}

// Tracks the loudest sample seen on a stream; returns a function that stops tracking and reports it.
function trackPeakLevel(stream: MediaStream): () => number {
  const context = new AudioContext();
  const analyser = context.createAnalyser();
  context.createMediaStreamSource(stream).connect(analyser);
  const samples = new Float32Array(analyser.fftSize);
  let peak = 0;

  const timer = setInterval(() => {
    analyser.getFloatTimeDomainData(samples);
    for (const sample of samples) peak = Math.max(peak, Math.abs(sample));
  }, 50);

  return () => {
    clearInterval(timer);
    void context.close();
    return peak;
  };
}

// Records the microphone and transcribes the audio on the server (/api/transcribe).
// Unlike the Web Speech API this does not depend on the browser vendor's speech service.
export function useVoiceRecorder(onTranscript: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [seconds, setSeconds] = useState(0);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const onTranscriptRef = useRef(onTranscript);
  useEffect(() => {
    onTranscriptRef.current = onTranscript;
  });

  // Detected after mount so server and client render the same markup.
  useEffect(() => {
    setSupported(typeof MediaRecorder !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia));
    return () => recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
  }, []);

  // Recording timer with an automatic stop at the limit.
  useEffect(() => {
    if (status !== "recording") return;
    setSeconds(0);
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setSeconds(Math.floor(elapsed / 1000));
      if (elapsed >= MAX_RECORDING_MS) recorderRef.current?.stop();
    }, 250);
    return () => clearInterval(timer);
  }, [status]);

  const transcribe = useCallback(async (audio: Blob) => {
    setStatus("transcribing");
    try {
      const response = await fetch("/api/transcribe", {
        method: "POST",
        headers: { "Content-Type": audio.type || "audio/webm" },
        body: audio,
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.error ?? "Не удалось распознать речь.");
      onTranscriptRef.current(data.text);
    } catch (err) {
      setError(err instanceof TypeError ? "Нет связи с сервером." : (err as Error).message);
    } finally {
      setStatus("idle");
    }
  }, []);

  const start = useCallback(async () => {
    if (recorderRef.current) return;
    setError(null);

    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError(micErrorMessage(err));
      return;
    }

    const recorder = new MediaRecorder(stream, { mimeType: pickMimeType() });
    const stopLevelTracking = trackPeakLevel(stream);
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };
    recorder.onstop = () => {
      stream.getTracks().forEach((track) => track.stop());
      recorderRef.current = null;
      const peak = stopLevelTracking();
      const audio = new Blob(chunks, { type: recorder.mimeType });

      if (peak < SILENCE_THRESHOLD || audio.size === 0) {
        setError("Не слышно речи — проверьте микрофон и попробуйте ещё раз.");
        setStatus("idle");
        return;
      }
      void transcribe(audio);
    };

    recorderRef.current = recorder;
    recorder.start();
    setStatus("recording");
  }, [transcribe]);

  const stop = useCallback(() => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }, []);

  return { supported, status, error, seconds, start, stop };
}
