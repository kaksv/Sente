import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 20;

/**
 * Optional AI layer.
 *
 * The deterministic detector in lib/detect.ts already produces the flags and
 * their reasoning. This route only rewrites those reasons into one plain
 * sentence a shop owner would understand — and can catch language-level
 * oddities the rules miss.
 *
 * If no key is configured, or the call fails, or it's slow, we return
 * ok:false and the UI keeps the deterministic output. The demo never breaks.
 */

const PROVIDERS = [
  {
    key: "OPENAI_API_KEY",
    url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
  },
  {
    key: "XAI_API_KEY",
    url: "https://api.x.ai/v1/chat/completions",
    model: "grok-3-mini",
  },
  {
    key: "OPENROUTER_API_KEY",
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: "openai/gpt-4o-mini",
  },
  {
    key: "GROQ_API_KEY",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
  },
];

interface Flagged {
  id: number;
  time: string | null;
  counterparty: string;
  amount: number;
  raw: string;
  signals: { label: string; detail: string }[];
}

const SYSTEM = `You are a fraud analyst explaining mobile-money fraud to a Ugandan shop owner.

For each flagged SMS you receive, write ONE sentence (maximum 30 words) explaining why it is probably fake.
Rules:
- Reference the concrete numbers or the specific flaw.
- Plain, calm English. No jargon, no bullet points, no "AI", no "the system".
- Never invent a fact that is not in the message or the signals.
- If the signals already explain it, sharpen them; do not pad.

Return ONLY valid JSON in this exact shape:
{"explanations":{"<id>":"<one sentence>"}}`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const flagged: Flagged[] = Array.isArray(body?.flagged) ? body.flagged : [];
    if (!flagged.length) {
      return NextResponse.json({ ok: true, explanations: {} });
    }

    const provider = PROVIDERS.find((p) => process.env[p.key]);
    if (!provider) {
      return NextResponse.json({ ok: false, reason: "no-key", explanations: {} });
    }

    const user = flagged
      .map(
        (f) =>
          `id: ${f.id}\ntime: ${f.time ?? "unknown"}\namount: UGX ${f.amount}\nmessage: ${
            f.raw
          }\nsignals: ${f.signals
            .map((s) => `${s.label} — ${s.detail}`)
            .join(" | ")}`
      )
      .join("\n\n---\n\n");

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 9000);

    const res = await fetch(provider.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env[provider.key]}`,
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: 0.2,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: user },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json({ ok: false, reason: "upstream", explanations: {} });
    }

    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    const parsed = JSON.parse(text);

    const explanations: Record<string, string> = {};
    for (const [id, sentence] of Object.entries(parsed?.explanations ?? {})) {
      if (typeof sentence === "string" && sentence.trim()) {
        explanations[String(id)] = sentence.trim();
      }
    }

    return NextResponse.json({ ok: true, explanations });
  } catch {
    return NextResponse.json({ ok: false, reason: "error", explanations: {} });
  }
}
