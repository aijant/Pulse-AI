import { describe, expect, it } from "vitest";
import { MAX_CONTEXT_LENGTH, MAX_QUESTION_LENGTH } from "./types";
import { parseAskRequest } from "./validation";

describe("parseAskRequest", () => {
  it("accepts a valid request and trims the text", () => {
    const result = parseAskRequest({ question: "  Что такое SLO?  ", mode: "quick", teamContext: " Next.js " });
    expect(result).toMatchObject({ ok: true, value: { question: "Что такое SLO?", teamContext: "Next.js" } });
    expect(result.ok && result.value.mode.id).toBe("quick");
  });

  it.each([null, undefined, [], "text", 42])("rejects a non-object body: %j", (body) => {
    expect(parseAskRequest(body)).toEqual({ ok: false, error: "Некорректный формат запроса." });
  });

  it("rejects an empty or whitespace-only question", () => {
    expect(parseAskRequest({ question: "   ", mode: "quick" })).toEqual({ ok: false, error: "Введите вопрос." });
  });

  it("rejects an unknown mode", () => {
    expect(parseAskRequest({ question: "Привет", mode: "hacker" })).toMatchObject({ ok: false });
  });

  it("enforces length limits", () => {
    const longQuestion = { question: "а".repeat(MAX_QUESTION_LENGTH + 1), mode: "quick" };
    const longContext = { question: "Привет", mode: "quick", teamContext: "а".repeat(MAX_CONTEXT_LENGTH + 1) };
    expect(parseAskRequest(longQuestion)).toMatchObject({ ok: false });
    expect(parseAskRequest(longContext)).toMatchObject({ ok: false });
  });

  it("ignores fields of the wrong type", () => {
    const result = parseAskRequest({ question: "Привет", mode: "quick", teamContext: { evil: true } });
    expect(result.ok && result.value.teamContext).toBe("");
  });
});
