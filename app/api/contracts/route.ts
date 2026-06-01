import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { supabaseServiceRole } from "@/lib/supabaseServiceRole";

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles").select("role").eq("user_id", user.id).maybeSingle();

  const ownerEmail   = process.env.NEXT_PUBLIC_OWNER_EMAIL ?? "";
  const role         = user.email === ownerEmail ? "owner" : (profile?.role ?? "reader");
  const offerorType  = role === "owner" ? "owner" : "company";

  if (role !== "company" && role !== "owner") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { title, description, terms, totalAmount, deadline, creatorId, milestones } = body;

  if (!title?.trim() || !creatorId) {
    return NextResponse.json({ error: "title and creatorId are required" }, { status: 400 });
  }

  const db = supabaseServiceRole();

  const { data: contract, error: contractErr } = await db
    .from("contracts")
    .insert({
      title:        title.trim(),
      description:  description?.trim() || null,
      terms:        terms?.trim()       || null,
      offeror_type: offerorType,
      offeror_id:   user.id,
      creator_id:   creatorId,
      status:       "draft",
      total_amount: Number(totalAmount) || 0,
      currency:     "usd",
      deadline:     deadline || null,
    })
    .select("id")
    .single();

  if (contractErr || !contract) {
    return NextResponse.json({ error: contractErr?.message ?? "Failed to create contract" }, { status: 500 });
  }

  if (Array.isArray(milestones) && milestones.length > 0) {
    const rows = milestones
      .filter((m: { title?: string }) => m.title?.trim())
      .map((m: { title: string; description?: string; amount?: string | number; dueDate?: string }) => ({
        contract_id: contract.id,
        title:       m.title.trim(),
        description: m.description?.trim() || null,
        amount:      Number(m.amount) || 0,
        due_date:    m.dueDate || null,
      }));
    if (rows.length > 0) await db.from("contract_milestones").insert(rows);
  }

  return NextResponse.json({ id: contract.id });
}
