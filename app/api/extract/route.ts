import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Screenshot → text.
 *
 * This route is ONLY an OCR layer. It never decides anything about fraud.
 * Its single job is to transcribe the messages in an image verbatim, and the
 * deterministic detector in lib/detect.ts then runs on the text exactly as if
 * the user had pasted it.
 *
 * That separation matters: if vision is unavailable, the app still works —
 * the user just pastes the text instead.
 */

const PROVIDERS = [
  {
    key: "OPENAI_API_KEY",
    url: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
  },
  {
    key: "GROQ_API_KEY",
    url: "https://api.groq.com/openai/v1/chat/completions",
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
  },
  {
    key: "XAI_API_KEY",
    url: "https://api.x.ai/v1/chat/completions",
    model: "grok-2-vision-1212",
  },
  {
    key: "OPENROUTER_API_KEY",
    url: "https://openrouter.ai/api/v1/chat/completions",
    model: "google/gemini-2.0-flash-001",
  },
];

/**
 * The instruction "do not correct spelling" is load-bearing.
 *
 * A typo like "recieved" is one of our fraud signals. If the model tidies it
 * up, we silently lose evidence. Same for the exact balance wording.
 */
const PROMPT = `You are an OCR engine. The image is a phone screenshot containing one or more mobile-money SMS messages (MTN MoMo, Airtel Money) and possibly chat bubbles, timestamps, or app chrome.

Transcribe every message body VERBATIM, exactly as written.

Critical rules:
- Do NOT correct spelling, grammar, capitalisation or punctuation. If the message says "recieved", output "recieved".
- Do NOT normalise numbers or currency formatting. Keep "UGX 1,102,000" as written.
- Do NOT summarise, explain, or add commentary.
- Do NOT invent a message that is not in the image.
- If a timestamp is visible beside a message, prefix the line with it in HH:MM form.

Output one message per line and nothing else.`;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const image: string | undefined = body?.image;

    if (!image || !image.startsWith("data:image/")) {
      return NextResponse.json(
        { ok: false, reason: "bad-image", text: "" },
        { status: 400 }
      );
    }

    // ~4MB of base64. The client downscales well below this; it's a backstop.
    if (image.length > 5_500_000) {
      return NextResponse.json({ ok: false, reason: "too-large", text: "" });
    }

    const provider = PROVIDERS.find((p) => process.env[p.key]);
    if (!provider) {
      return NextResponse.json({ ok: false, reason: "no-key", text: "" });
    }

    // Allow overriding a stale default model without a code change.
    const model = process.env.VISION_MODEL || provider.model;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 22000);

    const res = await fetch(provider.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env[provider.key]}`,
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: PROMPT },
              { type: "image_url", image_url: { url: image, detail: "high" } },
            ],
          },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      return NextResponse.json({ ok: false, reason: "upstream", text: "" });
    }

    const data = await res.json();
    let text: string = data?.choices?.[0]?.message?.content ?? "";

    // Strip accidental code fences and leading bullets.
    text = text
      .replace(/^```[a-z]*\n?/i, "")
      .replace(/```$/i, "")
      .split("\n")
      .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
      .filter(Boolean)
      .join("\n");

    if (!text) {
      return NextResponse.json({ ok: false, reason: "empty", text: "" });
    }

    return NextResponse.json({ ok: true, text });
  } catch {
    return NextResponse.json({ ok: false, reason: "error", text: "" });
  }
}
