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
    .select("id, status, offeror_id, creator_id")
    .eq("id", contractId)
    .maybeSingle();

  if (!contract)                         return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (contract.offeror_id !== user.id)   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (contract.status !== "active")      return NextResponse.json({ error: "Contract is not active" }, { status: 400 });

  const { data: result } = await db.rpc("approve_milestone", {
    p_milestone_id: milestoneId,
    p_offeror_id:   user.id,
    p_creator_id:   contract.creator_id,
  });

  const res = result as { ok: boolean; error?: string; balance?: number; required?: number; allPaid?: boolean; amount?: number } | null;

  if (!res?.ok) {
    const status = res?.error === "insufficient_balance" ? 402 : 400;
    return NextResponse.json(
      { error: res?.error ?? "Approval failed", balance: res?.balance, required: res?.required },
      { status }
    );
  }

  return NextResponse.json({ ok: true, allPaid: res.allPaid ?? false, amount: res.amount });
}
