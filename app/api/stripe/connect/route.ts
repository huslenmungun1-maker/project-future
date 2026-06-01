import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const returnUrl: string  = body.returnUrl;
  const refreshUrl: string = body.refreshUrl;

  if (!returnUrl || !refreshUrl) {
    return NextResponse.json({ error: "Missing redirect URLs" }, { status: 400 });
  }

  const db = supabaseServiceRole();

  const { data: existing } = await db
    .from("creator_stripe_accounts")
    .select("stripe_account_id")
    .eq("user_id", user.id)
    .maybeSingle();

  let accountId: string;

  if (existing?.stripe_account_id) {
    accountId = existing.stripe_account_id;
  } else {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email ?? undefined,
      metadata: { user_id: user.id },
    });
    accountId = account.id;

    await db.from("creator_stripe_accounts").insert({
      user_id:           user.id,
      stripe_account_id: accountId,
      onboarding_status: "pending",
      payouts_enabled:   false,
    });
  }

  const accountLink = await stripe.accountLinks.create({
    account:     accountId,
    return_url:  returnUrl,
    refresh_url: refreshUrl,
    type:        "account_onboarding",
  });

  return NextResponse.json({ url: accountLink.url });
}
