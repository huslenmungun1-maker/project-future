import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

const TOPUP_AMOUNTS = [5, 10, 20, 50];

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);

  if (!TOPUP_AMOUNTS.includes(amount)) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const { data, error } = await supabase.rpc("mock_topup", {
    p_user_id: user.id,
    p_amount: amount,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
