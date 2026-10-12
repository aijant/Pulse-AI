"use client";

import { useState } from "react";
import { AnswerPanel } from "./AnswerPanel";
import { HistoryPanel } from "./HistoryPanel";
import { ModeSelector } from "./ModeSelector";
import { QuestionForm } from "./QuestionForm";
import { TeamContext } from "./TeamContext";
import { ThemeToggle } from "./ThemeToggle";
import { useAsk } from "@/hooks/useAsk";
import { useHistory } from "@/hooks/useHistory";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { DEFAULT_MODE, getMode, MODES, type ModeId } from "@/lib/modes";
import type { HistoryItem } from "@/lib/types";

// The whole dashboard is interactive (state, localStorage, streaming), so it is one client component.
export function Dashboard() {
  const [modeId, setModeId] = useState<ModeId>(DEFAULT_MODE);
  const [question, setQuestion] = useState("");
  const [teamContext, setTeamContext] = useLocalStorage("pulse:team-context", "");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [meta, setMeta] = useState<{ durationMs: number; model?: string } | null>(null);
  // Mode the shown answer was produced in; differs from modeId once the user switches modes.
  const [answerModeId, setAnswerModeId] = useState<ModeId>(DEFAULT_MODE);

  const { status, answer, error, ask, stop, show } = useAsk();
  const history = useHistory();
  const mode = getMode(modeId) ?? MODES[0];
  const answerMode = status === "idle" ? mode : (getMode(answerModeId) ?? mode);
  const busy = status === "loading" || status === "streaming";

  const submit = async () => {
    const asked = question.trim();
    setActiveId(null);
    setMeta(null);
    setAnswerModeId(modeId);

    const result = await ask({ question: asked, mode: modeId, teamContext });
    if (!result) return;

    const entry = history.add({ question: asked, mode: modeId, ...result });
    setActiveId(entry.id);
    setMeta({ durationMs: result.durationMs, model: result.model });
  };

  const openFromHistory = (item: HistoryItem) => {
    setModeId(item.mode);
    setQuestion(item.question);
    setActiveId(item.id);
    setAnswerModeId(item.mode);
    setMeta({ durationMs: item.durationMs, model: item.model });
    show(item.answer);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:py-12">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-ink">
            <span className="logo-dot" aria-hidden /> Пульс
          </h1>
          <p className="mt-1 text-sm text-muted">AI-ассистент команды: ответы, саммари, тексты и планы за минуту</p>
        </div>
        <ThemeToggle />
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <main className="min-w-0 space-y-4">
          <ModeSelector value={modeId} onChange={setModeId} disabled={busy} />
          <QuestionForm
            mode={mode}
            value={question}
            onChange={setQuestion}
            onSubmit={submit}
            onStop={stop}
            busy={busy}
          />
          <AnswerPanel status={status} answer={answer} error={error} mode={answerMode} meta={meta} onRetry={submit} />
        </main>

        <aside className="space-y-4">
          <HistoryPanel
            items={history.items}
            limit={history.limit}
            activeId={activeId}
            onSelect={openFromHistory}
            onRemove={history.remove}
            onClear={history.clear}
          />
          <TeamContext value={teamContext} onChange={setTeamContext} />
        </aside>
      </div>
    </div>
  );
}
