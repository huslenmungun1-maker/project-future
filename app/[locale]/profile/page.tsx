import { redirect } from "next/navigation";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import SignOutButton from "@/components/SignOutButton";

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${locale}/login`);

  const email = user.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, account_type")
    .eq("id", user.id)
    .maybeSingle();
  const role = profile?.role ?? "reader";
  const isKid = profile?.account_type === "kid";
  const isOwner = role === "owner" || email === process.env.NEXT_PUBLIC_OWNER_EMAIL;
  const isCreator = role === "creator" || isOwner;

  // Kids accounts linked to this adult
  const { data: kidAccounts } = await supabase
    .from("kid_accounts")
    .select("kid_user_id, age, relationship, profiles:kid_user_id ( display_name )")
    .or(`created_by.eq.${user.id},linked_teacher_id.eq.${user.id}`)
    .order("created_at", { ascending: false })
    .limit(10);

  const joinedAt = new Date(user.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const roleLabel = isOwner ? "Owner" : isCreator ? "Creator" : "Reader";
  const roleColor  = isOwner ? "#c9a84c" : isCreator ? "#6ea880" : "#5e5e6e";
  const roleBg     = isOwner ? "rgba(201,168,76,0.1)"  : isCreator ? "rgba(110,168,128,0.1)"  : "rgba(94,94,110,0.1)";
  const roleBorder = isOwner ? "rgba(201,168,76,0.28)" : isCreator ? "rgba(110,168,128,0.25)" : "rgba(94,94,110,0.22)";

  return (
    <div style={{ background: "#0a0a0c" }} className="min-h-screen">
      <main style={{ maxWidth: 440, margin: "0 auto", padding: "52px 24px 80px", color: "#eceae4" }}>

        {/* Back */}
        <Link
          href={`/${locale}`}
          style={{
            display: "inline-block",
            fontSize: 12,
            color: "#5e5e6e",
            textDecoration: "none",
            marginBottom: 44,
            letterSpacing: "0.01em",
          }}
        >
          ← Home
        </Link>

        {/* Identity card */}
        <div
          style={{
            background: "#111116",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16,
            padding: "24px 20px",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: "50%",
                background: "rgba(182,160,124,0.1)",
                border: "1px solid rgba(182,160,124,0.18)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 15,
                fontWeight: 600,
                color: "#b6a07c",
                flexShrink: 0,
                letterSpacing: "0.02em",
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: "#eceae4",
                  marginBottom: 7,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {email}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    padding: "3px 10px",
                    borderRadius: 9999,
                    background: roleBg,
                    border: `1px solid ${roleBorder}`,
                    color: roleColor,
                  }}
                >
                  {roleLabel}
                </span>
                <span style={{ fontSize: 11, color: "#4a4a56" }}>
                  Since {joinedAt}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action links */}
        <div
          style={{
            background: "#111116",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 16,
            overflow: "hidden",
            marginBottom: 12,
          }}
        >
          {isCreator && (
            <Link
              href={`/${locale}/studio`}
              className="flex items-center justify-between px-5 py-3.5 text-[13px] font-medium transition hover:bg-white/[0.03] border-b border-white/[0.05]"
              style={{ color: "#eceae4", textDecoration: "none" }}
            >
              Studio
              <span style={{ color: "#5e5e6e", fontSize: 12 }}>→</span>
            </Link>
          )}

          {!isCreator && (
            <Link
              href={`/${locale}/creator/apply`}
              className="flex items-center justify-between px-5 py-3.5 text-[13px] font-medium transition hover:bg-white/[0.03] border-b border-white/[0.05]"
              style={{ color: "#eceae4", textDecoration: "none" }}
            >
              Apply to become a creator
              <span style={{ color: "#5e5e6e", fontSize: 12 }}>→</span>
            </Link>
          )}

          {isCreator && !isOwner && (
            <Link
              href={`/${locale}/creator`}
              className="flex items-center justify-between px-5 py-3.5 text-[13px] font-medium transition hover:bg-white/[0.03] border-b border-white/[0.05]"
              style={{ color: "#eceae4", textDecoration: "none" }}
            >
              Creator status
              <span style={{ color: "#5e5e6e", fontSize: 12 }}>→</span>
            </Link>
          )}

          <Link
            href={`/${locale}/reader`}
            className="flex items-center justify-between px-5 py-3.5 text-[13px] font-medium transition hover:bg-white/[0.03]"
            style={{ color: "#eceae4", textDecoration: "none" }}
          >
            Browse reader
            <span style={{ color: "#5e5e6e", fontSize: 12 }}>→</span>
          </Link>
        </div>

        {/* Kids section — shown for non-kid adults */}
        {!isKid && (
          <div
            style={{
              background: "#111116",
              border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 16,
              overflow: "hidden",
              marginBottom: 12,
            }}
          >
            <div style={{ padding: "12px 20px 8px", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#4a4a56" }}>
              My Kids
            </div>
            {(kidAccounts ?? []).map((ka) => {
              const displayName = (ka.profiles as { display_name?: string } | null)?.display_name ?? "Child";
              return (
                <Link
                  key={ka.kid_user_id}
                  href={`/${locale}/kids/dashboard/${ka.kid_user_id}`}
                  className="flex items-center justify-between px-5 py-3 text-[13px] font-medium transition hover:bg-white/[0.03] border-t border-white/[0.05]"
                  style={{ color: "#eceae4", textDecoration: "none" }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 16 }}>👦</span>
                    {displayName}
                    <span style={{ fontSize: 11, color: "#4a4a56" }}>age {ka.age}</span>
                  </span>
                  <span style={{ color: "#5e5e6e", fontSize: 12 }}>→</span>
                </Link>
              );
            })}
            <Link
              href={`/${locale}/kids/setup`}
              className="flex items-center justify-between px-5 py-3.5 text-[13px] font-medium transition hover:bg-white/[0.03] border-t border-white/[0.05]"
              style={{ color: "#7ec8a4", textDecoration: "none" }}
            >
              + Add a child account
              <span style={{ color: "#5e5e6e", fontSize: 12 }}>→</span>
            </Link>
          </div>
        )}

        {/* Kids portal link — shown for kid accounts */}
        {isKid && (
          <div style={{ marginBottom: 12 }}>
            <Link
              href={`/${locale}/kids`}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                borderRadius: 16,
                background: "rgba(184,223,248,0.08)",
                border: "1px solid rgba(100,160,220,0.2)",
                color: "#b8dff8",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Go to Kids Portal
              <span style={{ fontSize: 12, opacity: 0.7 }}>→</span>
            </Link>
          </div>
        )}

        {/* Sign out */}
        <div style={{ paddingTop: 8 }}>
          <SignOutButton
            locale={locale}
            style={{
              width: "100%",
              padding: "11px 16px",
              borderRadius: 12,
              background: "transparent",
              border: "1px solid rgba(255,255,255,0.08)",
              color: "#5e5e6e",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
              transition: "border-color 120ms ease, color 120ms ease",
              textAlign: "left",
            }}
          />
        </div>

      </main>
    </div>
  );
}
