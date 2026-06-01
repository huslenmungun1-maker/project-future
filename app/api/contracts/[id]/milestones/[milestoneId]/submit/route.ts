import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; milestoneId: string }> }
) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: contractId, milestoneId } = await params;
  const db = supabaseServiceRole();

  const { data: contract } = await db
    .from("contracts")
    .select("id, status, creator_id")
    .eq("id", contractId)
    .maybeSingle();

  if (!contract)                         return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (contract.creator_id !== user.id)   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (contract.status !== "active")      return NextResponse.json({ error: "Contract is not active" }, { status: 400 });

  const { data: milestone } = await db
    .from("contract_milestones")
    .select("id, status, contract_id")
    .eq("id", milestoneId)
    .eq("contract_id", contractId)
    .maybeSingle();

  if (!milestone)                        return NextResponse.json({ error: "Milestone not found" }, { status: 404 });
  if (milestone.status !== "pending")    return NextResponse.json({ error: "Milestone is not pending" }, { status: 400 });

  await db
    .from("contract_milestones")
    .update({ status: "submitted", updated_at: new Date().toISOString() })
    .eq("id", milestoneId);

  return NextResponse.json({ ok: true });
}
