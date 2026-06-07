"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { getBrowserClient } from "@/lib/browserClient";

type AppStatus = "pending" | "approved" | "rejected";

type ApplicationData = {
  id: string;
  status: AppStatus;
  display_name: string;
  content_types: string[];
  created_at: string;
  review_notes: string | null;
};

const BG       = "#0a0a0c";
const SURFACE  = "#111116";
const BORDER   = "rgba(255,255,255,0.07)";
const TEXT     = "#eceae4";
const MUTED    = "#5e5e6e";
const ACCENT   = "#b6a07c";

export default function CreatorPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";
  const supabase = useMemo(() => getBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<ApplicationData | null>(null);
  const [role, setRole] = useState<string>("reader");

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace(`/${locale}/login?redirect=/${locale}/creator`);
        return;
      }

      const uid = session.user.id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("user_id", uid)
        .maybeSingle();

      const userRole = profile?.role ?? "reader";
      setRole(userRole);

      if (userRole === "owner" || session.user.email === process.env.NEXT_PUBLIC_OWNER_EMAIL) {
        router.replace(`/${locale}/studio`);
        return;
      }

      const { data: app } = await supabase
        .from("creator_applications")
        .select("id, status, display_name, content_types, created_at, review_notes")
        .eq("user_id", uid)
        .maybeSingle();

      if (!app) {
        router.replace(`/${locale}/creator/apply`);
        return;
      }

      setApplication(app as ApplicationData);
      setLoading(false);
    }

    init();
  }, [locale, router, supabase]);

  if (loading) {
    return (
      <div style={{ background: BG }} className="min-h-screen flex items-center justify-center">
        <div style={{ width: "100%", maxWidth: 520, padding: "0 24px" }}>
          <div className="skeleton-dark rounded-[20px]" style={{ height: 280 }} />
        </div>
      </div>
    );
  }

  if (!application) return null;

  const submitted = new Date(application.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const isApproved = application.status === "approved";
  const isRejected = application.status === "rejected";
  const isPending  = application.status === "pending";

  const statusConfig = {
    pending:  { label: "Under review",  color: "#c8a840", bg: "rgba(200,168,64,0.1)",  border: "rgba(200,168,64,0.25)" },
    approved: { label: "Approved",      color: "#6ea880", bg: "rgba(110,168,128,0.1)", border: "rgba(110,168,128,0.25)" },
    rejected: { label: "Not accepted",  color: "#c85252", bg: "rgba(200,82,82,0.1)",   border: "rgba(200,82,82,0.22)" },
  }[application.status];

  return (
    <div style={{ background: BG }} className="min-h-screen">
      <main style={{ maxWidth: 520, margin: "0 auto", padding: "52px 24px 80px", color: TEXT }}>

        {/* Back */}
        <Link
          href={`/${locale}/profile`}
          style={{ display: "inline-block", fontSize: 12, color: MUTED, textDecoration: "none", marginBottom: 44, letterSpacing: "0.01em" }}
        >
          ← Profile
        </Link>

        {/* Page title */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 8 }}>
            Creator Program
          </p>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: TEXT, marginBottom: 6 }}>
            Application
          </h1>
          <p style={{ fontSize: 12, color: MUTED }}>
            Submitted {submitted} as <span style={{ color: TEXT }}>{application.display_name}</span>
          </p>
        </div>

        {/* Status card */}
        <div
          style={{
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            padding: "24px 20px",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, marginBottom: 8 }}>
                Status
              </p>
              <span
                style={{
                  display: "inline-block",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  padding: "4px 12px",
                  borderRadius: 9999,
                  background: statusConfig.bg,
                  border: `1px solid ${statusConfig.border}`,
                  color: statusConfig.color,
                }}
              >
                {statusConfig.label}
              </span>
            </div>
          </div>

          <div style={{ height: 1, background: BORDER, margin: "16px 0" }} />

          {isPending && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
                Your application is being reviewed. We evaluate each submission manually and
                will reach out by email once a decision has been made.
              </p>
              <p style={{ fontSize: 12, color: "#4a4a56" }}>
                No action needed on your end.
              </p>
            </div>
          )}

          {isApproved && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
                Welcome to Enkhverse, <span style={{ color: TEXT, fontWeight: 500 }}>{application.display_name}</span>.
                Your application was approved. You now have access to the creator studio.
              </p>
              <Link
                href={`/${locale}/studio`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: "10px 24px",
                  borderRadius: 9999,
                  background: ACCENT,
                  color: "#0a0a0c",
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: "none",
                  letterSpacing: "0.01em",
                  alignSelf: "flex-start",
                }}
              >
                Open Studio
              </Link>
            </div>
          )}

          {isRejected && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
                Your application was not accepted at this time.
              </p>
              {application.review_notes && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    background: "rgba(200,82,82,0.06)",
                    border: "1px solid rgba(200,82,82,0.18)",
                  }}
                >
                  <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#c85252", marginBottom: 6 }}>
                    Review notes
                  </p>
                  <p style={{ fontSize: 13, color: "#c8a0a0", lineHeight: 1.6 }}>
                    {application.review_notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Content types */}
        {application.content_types && application.content_types.length > 0 && (
          <div
            style={{
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
              padding: "20px",
              marginBottom: 12,
            }}
          >
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>
              Content types
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {application.content_types.map((ct) => (
                <span
                  key={ct}
                  style={{
                    fontSize: 11,
                    padding: "4px 12px",
                    borderRadius: 9999,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    color: "#a0a0ac",
                    textTransform: "capitalize",
                  }}
                >
                  {ct}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Back to profile */}
        <div style={{ marginTop: 32 }}>
          <Link
            href={`/${locale}/profile`}
            style={{ fontSize: 12, color: "#4a4a56", textDecoration: "none" }}
          >
            ← Back to profile
          </Link>
        </div>

      </main>
    </div>
  );
}
