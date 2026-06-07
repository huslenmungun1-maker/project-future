import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  try {
    const supabase = await supabaseServer();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: walletRow, error: walletErr } = await supabase
      .from("wallets")
      .select("balance_cents, updated_at")
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletErr) {
      return NextResponse.json({ error: walletErr.message }, { status: 500 });
    }

    if (!walletRow) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const wallet = {
      id: user.id,
      balance: (walletRow.balance_cents ?? 0) / 100,
      currency: "USD",
      created_at: walletRow.updated_at,
    };

    const { data: txRows, error: txErr } = await supabase
      .from("transactions")
      .select("amount_cents, created_at, meta, book_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);

    if (txErr) {
      return NextResponse.json({ error: txErr.message }, { status: 500 });
    }

    const transactions = (txRows ?? []).map((tx, i) => ({
      id: `${user.id}-${i}`,
      type: (
        tx.meta?.type ?? (tx.amount_cents >= 0 ? "credit" : "debit")
      ) as "credit" | "debit",
      amount: Math.abs((tx.amount_cents ?? 0) / 100),
      description:
        tx.meta?.description ??
        tx.meta?.note ??
        (tx.book_id ? "Book purchase" : "Transaction"),
      status: tx.meta?.status ?? "completed",
      created_at: tx.created_at,
    }));

    return NextResponse.json({ wallet, transactions });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
