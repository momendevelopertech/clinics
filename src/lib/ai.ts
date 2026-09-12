/**
 * Provider-configurable AI assistant (scribe / summaries / search).
 *
 * Configure via environment:
 *   AI_PROVIDER  = "openai" | "anthropic" | "none"      (default "none")
 *   AI_API_KEY   = provider API key
 *   AI_MODEL     = model id (default gpt-4o-mini / claude-3-5-haiku-latest)
 *   AI_BASE_URL  = optional OpenAI-compatible base URL override
 *
 * The system fails closed: when unconfigured the surface returns a 503 with
 * `{ enabled: false }` instead of pretending to have AI.
 */

export type AiProvider = "openai" | "anthropic" | "none";

export function getAiProvider(): AiProvider {
  const configured = (process.env.AI_PROVIDER ?? "none").toLowerCase();
  if (configured === "openai" || configured === "anthropic") {
    return configured;
  }
  return "none";
}

export function isAiEnabled(): boolean {
  if (getAiProvider() === "none" || !process.env.AI_API_KEY?.trim()) {
    return false;
  }
  return true;
}

export type AiResult =
  | { ok: true; content: string }
  | { ok: false; error: string };

export async function completeChat(prompt: string): Promise<AiResult> {
  const provider = getAiProvider();
  if (!isAiEnabled()) {
    return { ok: false, error: "AI provider is not configured" };
  }

  try {
    if (provider === "anthropic") {
      return await completeAnthropic(prompt);
    }
    return await completeOpenAi(prompt);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

async function completeOpenAi(prompt: string): Promise<AiResult> {
  const baseUrl = (process.env.AI_BASE_URL ?? "https://api.openai.com/v1").replace(
    /\/+$/,
    "",
  );
  const model = process.env.AI_MODEL ?? "gpt-4o-mini";
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `AI request failed (${res.status}): ${body.slice(0, 300)}` };
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    return { ok: false, error: "AI returned an empty response" };
  }
  return { ok: true, content };
}

async function completeAnthropic(prompt: string): Promise<AiResult> {
  const model = process.env.AI_MODEL ?? "claude-3-5-haiku-latest";
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.AI_API_KEY ?? "",
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, error: `AI request failed (${res.status}): ${body.slice(0, 300)}` };
  }
  const data = (await res.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = data.content?.filter((block) => block.type === "text")
    .map((block) => block.text ?? "")
    .join("")
    .trim();
  if (!text) {
    return { ok: false, error: "AI returned an empty response" };
  }
  return { ok: true, content: text };
}