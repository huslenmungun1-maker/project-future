import { NextRequest, NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { createClient } from "@supabase/supabase-js";

function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

export async function POST(req: NextRequest) {
  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const { name, age, email, password, relationship, family_name, school_name, earnings_receiver_type } = body;

  if (!name || !age || !email || !password || !relationship) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (!["parent_guardian", "teacher"].includes(relationship)) {
    return NextResponse.json({ error: "Invalid relationship" }, { status: 400 });
  }
  if (age < 3 || age > 17) {
    return NextResponse.json({ error: "Age must be between 3 and 17" }, { status: 400 });
  }

  let admin;
  try {
    admin = adminClient();
  } catch {
    return NextResponse.json({ error: "Service role key not configured. Add SUPABASE_SERVICE_ROLE_KEY to your environment." }, { status: 500 });
  }

  // Create auth user for the kid
  const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: name, account_type: "kid" },
  });

  if (createErr || !newUser.user) {
    return NextResponse.json({ error: createErr?.message ?? "Failed to create user" }, { status: 500 });
  }

  const kidId = newUser.user.id;

  // Set profile as kid
  await admin.from("profiles").upsert({
    id: kidId,
    role: "reader",
    account_type: "kid",
    display_name: name,
    age: Number(age),
  }, { onConflict: "id" });

  // Create wallet for kid
  await admin.from("wallets").upsert({ user_id: kidId, balance: 0, currency: "USD" }, { onConflict: "user_id" });

  // Link to parent/teacher
  const { error: linkErr } = await admin.from("kid_accounts").insert({
    created_by: user.id,
    kid_user_id: kidId,
    family_name: family_name ?? null,
    school_name: school_name ?? null,
    age: Number(age),
    relationship,
    earnings_receiver_type: earnings_receiver_type ?? "parent",
    earnings_receiver_id: user.id,
  });

  if (linkErr) {
    // Roll back user creation
    await admin.auth.admin.deleteUser(kidId);
    return NextResponse.json({ error: linkErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, kid_user_id: kidId, name });
}
