import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });

async function grantUnlock(
  chapterId: string,
  userId: string,
  amountPaid: number,
  currency: string,
  sessionId: string
) {
  const db = supabaseServiceRole();

  await db
    .from("purchases")
    .upsert(
      { user_id: userId, chapter_id: chapterId, stripe_session_id: sessionId, amount_paid: amountPaid, currency },
      { onConflict: "stripe_session_id" }
    );

  await db
    .from("chapter_unlocks")
    .upsert(
      { user_id: userId, chapter_id: chapterId, paid_amount: amountPaid },
      { onConflict: "user_id,chapter_id" }
    );
}

async function creditWallet(userId: string, amount: number) {
  const db = supabaseServiceRole();
  await db.rpc("credit_wallet", {
    p_user_id:     userId,
    p_amount:      amount,
    p_description: "Wallet top-up",
  });
}

export async function POST(req: NextRequest) {
  const sig     = req.headers.get("stripe-signature") ?? "";
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("[stripe/webhook] signature error", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status === "paid") {
      const type   = session.metadata?.type;
      const userId = session.metadata?.user_id;

      if (type === "wallet_topup") {
        const amount = Number(session.metadata?.amount);
        if (userId && amount > 0) {
          await creditWallet(userId, amount);
        }
      } else {
        const chapterId = session.metadata?.chapter_id;
        if (chapterId && userId) {
          await grantUnlock(
            chapterId,
            userId,
            (session.amount_total ?? 0) / 100,
            session.currency ?? "usd",
            session.id
          );
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}
