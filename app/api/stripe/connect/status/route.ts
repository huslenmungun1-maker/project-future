import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });

export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const db = supabaseServiceRole();

  const { data: record } = await db
    .from("creator_stripe_accounts")
    .select("stripe_account_id, payouts_enabled, onboarding_status")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!record) {
    return NextResponse.json({ connected: false });
  }

  const account        = await stripe.accounts.retrieve(record.stripe_account_id);
  const payoutsEnabled = account.payouts_enabled ?? false;
  const complete       = account.details_submitted ?? false;

  await db
    .from("creator_stripe_accounts")
    .update({
      payouts_enabled:   payoutsEnabled,
      onboarding_status: complete ? "complete" : "pending",
      updated_at:        new Date().toISOString(),
    })
    .eq("user_id", user.id);

  return NextResponse.json({
    connected:        true,
    payoutsEnabled,
    onboardingStatus: complete ? "complete" : "pending",
  });
}
