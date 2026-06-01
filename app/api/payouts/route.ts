import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });
const MIN_PAYOUT = 10;

export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: payouts } = await supabase
    .from("payout_requests")
    .select("id, amount, status, stripe_transfer_id, failure_reason, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return NextResponse.json({ payouts: payouts ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body   = await req.json().catch(() => ({}));
  const amount = Number(body.amount);

  if (!amount || amount < MIN_PAYOUT) {
    return NextResponse.json({ error: `Minimum payout is $${MIN_PAYOUT}` }, { status: 400 });
  }

  const db = supabaseServiceRole();

  // Verify connected Stripe account
  const { data: connectAccount } = await db
    .from("creator_stripe_accounts")
    .select("stripe_account_id, payouts_enabled")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!connectAccount) {
    return NextResponse.json({ error: "No connected Stripe account. Complete onboarding first." }, { status: 400 });
  }
  if (!connectAccount.payouts_enabled) {
    return NextResponse.json({ error: "Stripe account not fully verified. Finish onboarding." }, { status: 400 });
  }

  // Debit wallet first (atomic — fails if balance is insufficient)
  const { data: debitResult } = await db.rpc("debit_wallet", {
    p_user_id:     user.id,
    p_amount:      amount,
    p_description: "Payout to Stripe",
  });

  const debit = debitResult as { ok: boolean; error?: string } | null;

  if (!debit?.ok) {
    return NextResponse.json(
      { error: debit?.error === "insufficient_balance" ? "Insufficient balance" : (debit?.error ?? "Debit failed") },
      { status: 400 }
    );
  }

  // Create payout request row
  const { data: payoutRow, error: insertErr } = await db
    .from("payout_requests")
    .insert({ user_id: user.id, amount, status: "processing" })
    .select("id")
    .single();

  if (insertErr || !payoutRow) {
    // Refund wallet — debit already went through
    await db.rpc("credit_wallet", { p_user_id: user.id, p_amount: amount, p_description: "Payout reversal (internal error)" });
    return NextResponse.json({ error: "Failed to create payout record" }, { status: 500 });
  }

  // Create Stripe transfer
  try {
    const transfer = await stripe.transfers.create({
      amount:      Math.round(amount * 100),
      currency:    "usd",
      destination: connectAccount.stripe_account_id,
      description: "Enkhverse creator payout",
      metadata:    { payout_request_id: payoutRow.id, user_id: user.id },
    });

    await db
      .from("payout_requests")
      .update({ status: "paid", stripe_transfer_id: transfer.id, updated_at: new Date().toISOString() })
      .eq("id", payoutRow.id);

    return NextResponse.json({ ok: true, transferId: transfer.id, payoutId: payoutRow.id });

  } catch (err) {
    // Transfer failed — refund wallet and mark payout failed
    await Promise.all([
      db.rpc("credit_wallet", { p_user_id: user.id, p_amount: amount, p_description: "Payout reversal (transfer failed)" }),
      db.from("payout_requests").update({
        status:         "failed",
        failure_reason: (err as Error).message,
        updated_at:     new Date().toISOString(),
      }).eq("id", payoutRow.id),
    ]);
    console.error("[payouts] transfer failed", err);
    return NextResponse.json({ error: "Transfer failed: " + (err as Error).message }, { status: 500 });
  }
}
