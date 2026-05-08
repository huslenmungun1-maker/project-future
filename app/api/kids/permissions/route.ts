import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function PATCH(req: NextRequest) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { kid_user_id, field, value } = body;

  if (!kid_user_id || !field) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const allowed = ["ai_enabled", "can_create_content", "age_restrictions_lifted"];
  if (!allowed.includes(field)) return NextResponse.json({ error: "Invalid field" }, { status: 400 });

  // Verify link
  const { data: link } = await supabase
    .from("kid_accounts")
    .select("id, relationship, created_by, linked_teacher_id")
    .eq("kid_user_id", kid_user_id)
    .or(`created_by.eq.${user.id},linked_teacher_id.eq.${user.id}`)
    .maybeSingle();

  if (!link) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

  const isParent  = link.created_by === user.id;
  const isTeacher = link.linked_teacher_id === user.id;

  // ai_enabled requires BOTH parent and teacher to approve
  if (field === "ai_enabled") {
    const approvalCol = isParent ? "approved_by_parent" : isTeacher ? "approved_by_teacher" : null;
    if (!approvalCol) return NextResponse.json({ error: "Not authorized" }, { status: 403 });

    await supabase.from("kid_permissions")
      .upsert({ kid_user_id, [approvalCol]: value, updated_at: new Date().toISOString() }, { onConflict: "kid_user_id" });

    // Check if both approved
    const { data: perms } = await supabase.from("kid_permissions").select("approved_by_parent, approved_by_teacher").eq("kid_user_id", kid_user_id).maybeSingle();
    const bothApproved = perms?.approved_by_parent && perms?.approved_by_teacher;

    await supabase.from("kid_permissions")
      .update({ ai_enabled: bothApproved ?? false, updated_at: new Date().toISOString() })
      .eq("kid_user_id", kid_user_id);

    return NextResponse.json({ ok: true, ai_enabled: bothApproved ?? false });
  }

  // Other fields — parent only
  if (!isParent) return NextResponse.json({ error: "Only parent can change this" }, { status: 403 });

  await supabase.from("kid_permissions")
    .upsert({ kid_user_id, [field]: value, updated_at: new Date().toISOString() }, { onConflict: "kid_user_id" });

  return NextResponse.json({ ok: true });
}
