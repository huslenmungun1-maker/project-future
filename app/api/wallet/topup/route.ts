import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });

const TOPUP_AMOUNTS = [5, 10, 20, 50];

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const amount = Number(body.amount);
  const successUrl: string = body.successUrl;
  const cancelUrl: string  = body.cancelUrl;

  if (!TOPUP_AMOUNTS.includes(amount)) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }
  if (!successUrl || !cancelUrl) {
    return NextResponse.json({ error: "Missing redirect URLs" }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          unit_amount: amount * 100,
          product_data: {
            name: `Enkhverse Wallet — $${amount} top-up`,
            description: "Funds credited to your Enkhverse wallet",
          },
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      statement_descriptor: "ENKHVERSE",
      description: `Enkhverse wallet top-up $${amount}`,
    },
    metadata: {
      type: "wallet_topup",
      user_id: user.id,
      amount: String(amount),
    },
    client_reference_id: user.id,
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return NextResponse.json({ url: session.url });
}
