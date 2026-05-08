import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export async function GET() {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Return kids created by this adult OR kids linked to this teacher
  const { data, error } = await supabase
    .from("kid_accounts")
    .select(`
      id, kid_user_id, family_name, school_name, age, relationship,
      earnings_receiver_type, created_at,
      profiles:kid_user_id ( display_name, account_type, kid_theme, age ),
      kid_permissions:kid_user_id ( ai_enabled, approved_by_parent, approved_by_teacher, can_create_content )
    `)
    .or(`created_by.eq.${user.id},linked_teacher_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accounts: data ?? [] });
}
