import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { chapterId } = body;

  if (!chapterId || typeof chapterId !== "string") {
    return NextResponse.json({ error: "Missing chapterId" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("unlock_chapter", {
    p_reader_id: user.id,
    p_chapter_id: chapterId,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const result = data as { ok: boolean; error?: string; price?: number };

  if (!result.ok) {
    const status =
      result.error === "insufficient_balance"
        ? 402
        : result.error === "already_unlocked"
        ? 409
        : 400;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json(result);
}
