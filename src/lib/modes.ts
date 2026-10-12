// Assistant modes shared by the UI and the API route.
// Each mode is a "specialist" with its own prompt, answer format and thinking effort.

export type ModeId = "quick" | "tech" | "summary" | "comms" | "plan";

export type Effort = "low" | "medium" | "high";

export interface Mode {
  id: ModeId;
  label: string;
  icon: string;
  tagline: string;
  placeholder: string;
  examples: string[];
  effort: Effort;
  instructions: string;
}

export const MODES: Mode[] = [
  {
    id: "quick",
    label: "Быстрый ответ",
    icon: "⚡",
    tagline: "Коротко и по делу",
    placeholder: "Например: чем отличается SLA от SLO?",
    examples: [
      "Чем отличается SLA от SLO?",
      "Что такое RICE-приоритизация?",
      "Как провести эффективное ретро за 30 минут?",
    ],
    effort: "low",
    instructions: `Mode: quick answer.
- Answer in at most ~120 words unless the question genuinely needs more.
- Lead with the answer itself in one or two sentences, then up to 4 bullet points of supporting detail.
- If there is a common misconception around the topic, name it in one line.`,
  },
  {
    id: "tech",
    label: "Техлид",
    icon: "🛠️",
    tagline: "Код, архитектура, отладка",
    placeholder: "Например: как сделать идемпотентный POST-эндпоинт?",
    examples: [
      "Как сделать идемпотентный POST-эндпоинт для оплаты?",
      "Postgres или MongoDB для ленты событий? Аргументы",
      "Почему useEffect вызывается дважды в React 18?",
    ],
    effort: "medium",
    instructions: `Mode: senior engineer / tech lead.
- Give the recommended approach first, then the reasoning.
- Show code only when it clarifies; keep snippets minimal and runnable, always with a language tag.
- When there are real alternatives, compare them in a short Markdown table (option / when to choose / cost).
- Finish with a "Подводные камни" (pitfalls) list of 2-4 concrete risks: edge cases, security, performance.
- Do not invent library APIs. If unsure about a version-specific detail, say so.`,
  },
  {
    id: "summary",
    label: "Саммари",
    icon: "📋",
    tagline: "Встречи, треды, документы",
    placeholder: "Вставьте заметки со встречи, тред из Slack или текст документа…",
    examples: [
      "Сделай саммари: Обсудили релиз 2.3. Аня сказала, что бэкенд готов, но нужен ещё день на миграцию. Решили сдвинуть релиз на четверг. Олег сделает анонс в канале. Открытый вопрос — нужен ли feature flag для новой оплаты.",
    ],
    effort: "low",
    instructions: `Mode: summarizer for meeting notes, chat threads and documents.
Use exactly this structure (skip a section only if it would be empty):
**TL;DR** — one sentence.
## Ключевые моменты — 3-6 bullets.
## Решения — what was decided.
## Задачи — a Markdown checklist "- [ ] task — owner — deadline"; write "не указан" when owner or deadline is missing. Never invent owners or dates.
## Открытые вопросы — what is still unresolved.
If the input is too short to summarize, say so and ask for the full text.`,
  },
  {
    id: "comms",
    label: "Коммуникация",
    icon: "✉️",
    tagline: "Письма, сообщения, анонсы",
    placeholder: "Например: напиши сообщение в канал о переносе релиза на четверг",
    examples: [
      "Напиши сообщение в канал команды о переносе релиза на четверг",
      "Вежливо откажи заказчику в срочной доработке до конца спринта",
      "Анонс нового сотрудника-дизайнера для общего чата",
    ],
    effort: "low",
    instructions: `Mode: team communication writer.
- Output the ready-to-send draft first, inside a single blockquote, so it can be copied as-is.
- Match the channel: a chat message is short and friendly; an email has a subject line ("**Тема:** …") and a clear ask.
- Use placeholders like [имя] or [дата] instead of inventing specifics.
- After the draft add "**Вариант покороче:**" with a one- or two-sentence alternative.
- No corporate filler ("хотим донести", "в рамках"); plain, warm, direct language.`,
  },
  {
    id: "plan",
    label: "Планирование",
    icon: "🗺️",
    tagline: "Декомпозиция задач и рисков",
    placeholder: "Например: распиши план внедрения онбординга для новых пользователей",
    examples: [
      "Распиши план внедрения онбординга для новых пользователей",
      "Как разбить миграцию монолита на сервисы на этапы?",
      "Подготовь план хакатона на 2 дня для команды из 12 человек",
    ],
    effort: "medium",
    instructions: `Mode: delivery planner.
Use this structure:
**Цель** — one sentence describing the outcome, not the activity.
## Этапы — numbered stages; under each, a checklist of concrete tasks with a rough estimate in brackets, e.g. "(~2 дня)".
## Риски — a Markdown table: риск / вероятность / как снизить.
## Критерии готовности — 3-5 measurable Definition-of-Done bullets.
Keep estimates honest and label them as rough. Prefer the smallest plan that achieves the goal.`,
  },
];

export const DEFAULT_MODE: ModeId = "quick";

export function getMode(id: string): Mode | undefined {
  return MODES.find((mode) => mode.id === id);
}
