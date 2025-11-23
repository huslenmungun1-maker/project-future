// app/api/core-assistant/route.ts
import { NextResponse } from "next/server";

type APIRole = "system" | "user" | "assistant";

type IncomingMessage = {
  role: APIRole;
  content: string;
};

export async function POST(req: Request) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY in environment." },
        { status: 500 }
      );
    }

    const body = await req.json();
    const messages = (body?.messages || []) as IncomingMessage[];

    const systemPrompt = `
You are "Core Assistant", an AI that helps the owner manage an AI manga / webnovel studio.

User is a solo creator building:
- manga / comics / web novels
- story ideas, characters, worlds
- chapters and series stored in Supabase

Your job:
- Plan tasks step-by-step (today, this week, long term).
- Help outline series, arcs, chapters.
- Suggest improvements to titles, tags, genres.
- Keep explanations short, clear, and encouraging.
- When user is vague, ask one simple clarifying question.
- Never talk about API keys or internal implementation.
- Answer as if you live inside their studio dashboard.

Be practical and concrete. Examples:
- "Here are 3 concrete tasks for the next 30 minutes…"
- "Here is a 5-beat outline for this chapter…"
- "Here are 5 better title ideas with different vibes…"
`.trim();

    const payload = {
      model: "gpt-4.1-mini",
      messages: [
        { role: "system" as const, content: systemPrompt },
        ...messages,
      ],
      temperature: 0.7,
      max_tokens: 512,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      return NextResponse.json(
        { error: "OpenAI API error", details: errorText },
        { status: 500 }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content ?? "";

    return NextResponse.json({ reply });
  } catch (err: any) {
    console.error("core-assistant route error:", err);
    return NextResponse.json(
      { error: "Server error", details: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
