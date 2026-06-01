import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contractId } = await params;
  const db = supabaseServiceRole();

  const { data: contract } = await db
    .from("contracts")
    .select("id, title, status, offeror_id, creator_id")
    .eq("id", contractId)
    .maybeSingle();

  if (!contract)                       return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (contract.offeror_id !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (contract.status !== "draft")     return NextResponse.json({ error: "Contract is not a draft" }, { status: 400 });

  const { data: offerorProfile } = await db
    .from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
  const offerorName = offerorProfile?.display_name || user.email || user.id.slice(0, 8);

  const { data: creatorProfile } = await db
    .from("profiles").select("display_name").eq("user_id", contract.creator_id).maybeSingle();
  const creatorName = creatorProfile?.display_name || contract.creator_id.slice(0, 8);

  await Promise.all([
    db.from("contracts")
      .update({ status: "sent", updated_at: new Date().toISOString() })
      .eq("id", contractId),
    db.from("contract_signatures")
      .upsert({ contract_id: contractId, user_id: user.id, role: "offeror" }, { onConflict: "contract_id,user_id" }),
    db.from("owner_messages").insert({
      sender_id:    user.id,
      sender_name:  offerorName,
      message_type: "contract_sent",
      subject:      `Contract sent to ${creatorName}: "${contract.title}"`,
      body:         `${offerorName} sent a contract offer to ${creatorName}. Contract: "${contract.title}" (ID: ${contractId})`,
      status:       "unread",
      content_ref:  contractId,
    }),
  ]);

  return NextResponse.json({ ok: true });
}
