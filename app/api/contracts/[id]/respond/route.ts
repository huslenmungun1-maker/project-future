import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const action: "accept" | "decline" = body.action;
  if (action !== "accept" && action !== "decline") {
    return NextResponse.json({ error: "action must be 'accept' or 'decline'" }, { status: 400 });
  }

  const { id: contractId } = await params;
  const db = supabaseServiceRole();

  const { data: contract } = await db
    .from("contracts")
    .select("id, title, status, creator_id, offeror_id")
    .eq("id", contractId)
    .maybeSingle();

  if (!contract)                        return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (contract.creator_id !== user.id)  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (contract.status !== "sent")       return NextResponse.json({ error: "Contract is not awaiting response" }, { status: 400 });

  const { data: creatorProfile } = await db
    .from("profiles").select("display_name").eq("user_id", user.id).maybeSingle();
  const creatorName = creatorProfile?.display_name || user.email || user.id.slice(0, 8);

  const newStatus = action === "accept" ? "active" : "declined";

  const ops: PromiseLike<unknown>[] = [
    db.from("contracts")
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", contractId),
    db.from("owner_messages").insert({
      sender_id:    user.id,
      sender_name:  creatorName,
      message_type: action === "accept" ? "contract_accepted" : "contract_declined",
      subject:      `Contract ${action === "accept" ? "accepted" : "declined"}: "${contract.title}"`,
      body:         `${creatorName} has ${action === "accept" ? "accepted" : "declined"} the contract "${contract.title}".`,
      status:       "unread",
      content_ref:  contractId,
    }),
  ];

  if (action === "accept") {
    ops.push(
      db.from("contract_signatures")
        .upsert({ contract_id: contractId, user_id: user.id, role: "creator" }, { onConflict: "contract_id,user_id" })
    );
  }

  await Promise.all(ops);
  return NextResponse.json({ ok: true });
}
