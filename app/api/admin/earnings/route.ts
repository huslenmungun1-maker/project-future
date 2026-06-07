import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export async function GET() {
  try {
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

    const db = supabaseServiceRole();

    const { data: rows, error } = await db
      .from("transactions")
      .select("amount_cents, created_at, user_id, meta")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const allRows = rows ?? [];
    const total = allRows.reduce(
      (sum, r) => sum + (r.amount_cents ?? 0) / 100,
      0
    );

    const mapped = allRows.map((r, i) => ({
      id: `tx-${i}`,
      amount: (r.amount_cents ?? 0) / 100,
      description: r.meta?.description ?? r.meta?.note ?? "Transaction",
      created_at: r.created_at,
      user_id: r.user_id,
    }));

    return NextResponse.json({ total, rows: mapped });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
