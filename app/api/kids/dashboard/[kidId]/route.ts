import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET(req: NextRequest, { params }: { params: Promise<{ kidId: string }> }) {
  const { kidId } = await params;
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify this adult is linked to this kid
  const { data: link } = await supabase
    .from("kid_accounts")
    .select("id, relationship, linked_teacher_id")
    .eq("kid_user_id", kidId)
    .or(`created_by.eq.${user.id},linked_teacher_id.eq.${user.id}`)
    .maybeSingle();

  if (!link) return NextResponse.json({ error: "Not authorized for this kid" }, { status: 403 });

  const [profileRes, historyRes, chatRes, contentRes, flagsRes, permRes] = await Promise.all([
    supabase.from("profiles").select("display_name, age, kid_theme, account_type").eq("user_id", kidId).maybeSingle(),
    supabase.from("kid_read_history").select("id, content_type, content_title, read_at").eq("kid_user_id", kidId).order("read_at", { ascending: false }).limit(50),
    supabase.from("kid_chat_messages").select("id, sender_id, receiver_id, message, is_flagged, created_at").or(`sender_id.eq.${kidId},receiver_id.eq.${kidId}`).order("created_at", { ascending: false }).limit(100),
    supabase.from("kid_content_submissions").select("id, title, content_type, status, created_at").eq("kid_user_id", kidId).order("created_at", { ascending: false }),
    supabase.from("adult_flags").select("id, flagged_by, message, resolved, created_at").eq("kid_user_id", kidId).order("created_at", { ascending: false }),
    supabase.from("kid_permissions").select("*").eq("kid_user_id", kidId).maybeSingle(),
  ]);

  return NextResponse.json({
    profile: profileRes.data,
    readHistory: historyRes.data ?? [],
    chatMessages: chatRes.data ?? [],
    contentSubmissions: contentRes.data ?? [],
    flags: flagsRes.data ?? [],
    permissions: permRes.data,
    isParent: link.relationship === "parent_guardian" || user.id !== link.linked_teacher_id,
    isTeacher: link.linked_teacher_id === user.id,
  });
}
