import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseServer } from "@/lib/supabaseServer";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: "2025-04-30.basil" });

export async function POST(req: NextRequest) {
  try {
    const supabase = await supabaseServer();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { chapterId, successUrl, cancelUrl } = await req.json();
    if (!chapterId || !successUrl || !cancelUrl) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Fetch chapter price + title
    const { data: chapter, error: chErr } = await supabase
      .from("chapters")
      .select("id, title, chapter_number, price")
      .eq("id", chapterId)
      .maybeSingle();

    if (chErr || !chapter) {
      return NextResponse.json({ error: "Chapter not found" }, { status: 404 });
    }

    const price = Number(chapter.price ?? 0);
    if (price <= 0) {
      return NextResponse.json({ error: "Chapter is free" }, { status: 400 });
    }

    // Already unlocked?
    const { data: existing } = await supabase
      .from("chapter_unlocks")
      .select("id")
      .eq("user_id", user.id)
      .eq("chapter_id", chapterId)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ error: "already_unlocked" }, { status: 409 });
    }

    const chapterLabel = chapter.title || `Chapter ${chapter.chapter_number ?? ""}`;

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(price * 100),
            product_data: { name: chapterLabel },
          },
          quantity: 1,
        },
      ],
      metadata: {
        chapter_id: chapterId,
        user_id: user.id,
      },
      client_reference_id: user.id,
      success_url: successUrl,
      cancel_url: cancelUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("[stripe/checkout]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
