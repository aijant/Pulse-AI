export function jsonError(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

// Shown when a provider key is missing; works for local runs and for Vercel deployments.
export function missingKeyMessage(envKey: string): string {
  return `API-ключ не настроен. Добавьте ${envKey} в .env.local или в Environment Variables проекта на Vercel.`;
}
