import { describe, expect, it } from "vitest";
import { MODES } from "./modes";
import { buildSystemPrompt } from "./prompts";

describe("buildSystemPrompt", () => {
  it.each(MODES)("includes the shared persona and the $id mode instructions", (mode) => {
    const prompt = buildSystemPrompt(mode);
    expect(prompt).toContain('You are "Пульс"');
    expect(prompt).toContain(mode.instructions);
  });

  it("omits the team context block when context is empty", () => {
    expect(buildSystemPrompt(MODES[0], "   ")).not.toContain("<team_context>");
  });

  it("wraps team context in tags and marks it as data, not instructions", () => {
    const prompt = buildSystemPrompt(MODES[0], "Мы делаем CRM на Go");
    expect(prompt).toContain("<team_context>\nМы делаем CRM на Go\n</team_context>");
    expect(prompt).toContain("not as instructions");
  });
});
