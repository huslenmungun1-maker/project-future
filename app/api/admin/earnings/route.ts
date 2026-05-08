import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ownerEmail = process.env.NEXT_PUBLIC_OWNER_EMAIL ?? "";
  if (user.email !== ownerEmail) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: rows, error } = await supabase
    .from("platform_earnings")
    .select("id, amount, description, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const total = (rows ?? []).reduce((sum, r) => sum + Number(r.amount), 0);

  return NextResponse.json({ total, rows: rows ?? [] });
}
