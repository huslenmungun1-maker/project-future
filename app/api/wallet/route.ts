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

  const { data: wallet, error: walletErr } = await supabase
    .from("wallets")
    .select("id, balance, currency, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (walletErr) {
    return NextResponse.json({ error: walletErr.message }, { status: 500 });
  }

  if (!wallet) {
    return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
  }

  const { data: txs, error: txErr } = await supabase
    .from("transactions")
    .select("id, type, amount, description, status, created_at")
    .eq("wallet_id", wallet.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (txErr) {
    return NextResponse.json({ error: txErr.message }, { status: 500 });
  }

  return NextResponse.json({ wallet, transactions: txs ?? [] });
}
