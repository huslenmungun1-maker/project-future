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
  const supabase = supabaseServer();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) redirect(`/${locale}/login`);

  const email = session.user.email ?? "";
  const initials = email.slice(0, 2).toUpperCase();

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .maybeSingle();
  const role = profile?.role ?? "reader";
  const isOwner = role === "owner";
  const isCreator = role === "creator" || isOwner;

  const joinedAt = new Date(session.user.created_at).toLocaleDateString("en-US", {
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
