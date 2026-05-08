import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const kidId = searchParams.get("kidId") ?? user.id;

  const { data, error } = await supabase
    .from("kid_content_submissions")
    .select("*")
    .eq("kid_user_id", kidId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ submissions: data ?? [] });
}

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify user is a kid
  const { data: profile } = await supabase.from("profiles").select("account_type").eq("id", user.id).maybeSingle();
  if (profile?.account_type !== "kid") {
    return NextResponse.json({ error: "Only kid accounts can submit content" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { title, description, content_type, content, image_url } = body;

  if (!title || !content_type) return NextResponse.json({ error: "Missing title or content_type" }, { status: 400 });

  // Get parent's earnings preference
  const { data: kidAccount } = await supabase
    .from("kid_accounts")
    .select("earnings_receiver_type, earnings_receiver_id")
    .eq("kid_user_id", user.id)
    .maybeSingle();

  const { data, error } = await supabase.from("kid_content_submissions").insert({
    kid_user_id: user.id,
    title,
    description: description ?? null,
    content_type,
    content: content ?? null,
    image_url: image_url ?? null,
    earnings_receiver_type: kidAccount?.earnings_receiver_type ?? "parent",
    earnings_receiver_id: kidAccount?.earnings_receiver_id ?? null,
  }).select().maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, submission: data });
}

export async function PATCH(req: NextRequest) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { submission_id, action, price, rejection_reason } = body;

  if (!submission_id || !action) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const { data: sub } = await supabase.from("kid_content_submissions").select("kid_user_id, parent_approved, teacher_approved").eq("id", submission_id).maybeSingle();
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: link } = await supabase.from("kid_accounts")
    .select("created_by, linked_teacher_id, relationship")
    .eq("kid_user_id", sub.kid_user_id)
    .or(`created_by.eq.${user.id},linked_teacher_id.eq.${user.id}`)
    .maybeSingle();

  if (!link) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const isParent  = link.created_by === user.id;
  const isTeacher = link.linked_teacher_id === user.id;
  const role      = isParent ? "parent" : isTeacher ? "teacher" : null;
  if (!role) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  if (action === "reject") {
    await supabase.from("kid_content_submissions").update({ status: "rejected", rejection_reason: rejection_reason ?? null, updated_at: new Date().toISOString() }).eq("id", submission_id);
    return NextResponse.json({ ok: true, status: "rejected" });
  }

  if (action === "approve") {
    const { data: result } = await supabase.rpc("approve_kid_content", {
      p_submission_id: submission_id,
      p_approver_id: user.id,
      p_role: role,
    });

    if (price !== undefined && isParent) {
      await supabase.from("kid_content_submissions").update({ price: parseFloat(price) || 0 }).eq("id", submission_id);
    }

    return NextResponse.json({ ok: true, ...(result as object) });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
