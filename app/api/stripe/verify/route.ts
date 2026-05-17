import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2026-04-22.dahlia" });

export async function GET(req: NextRequest) {
  try {
    const sessionId = req.nextUrl.searchParams.get("session_id");
    if (!sessionId) {
      return NextResponse.json({ ok: false, error: "Missing session_id" }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== "paid") {
      return NextResponse.json({ ok: false, error: "Not paid" });
    }

    const chapterId = session.metadata?.chapter_id;
    const userId    = session.metadata?.user_id;

    if (!chapterId || !userId) {
      return NextResponse.json({ ok: false, error: "Missing metadata" }, { status: 400 });
    }

    const amountPaid = (session.amount_total ?? 0) / 100;
    const currency   = session.currency ?? "usd";
    const db         = supabaseServiceRole();

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

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[stripe/verify]", err);
    return NextResponse.json({ ok: false, error: "Server error" }, { status: 500 });
  }
}
