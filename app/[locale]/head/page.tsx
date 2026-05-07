"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

const BG      = "#0a0a0c";
const SURFACE = "#111116";
const SURFACE2= "#18181f";
const BORDER  = "rgba(255,255,255,0.07)";
const TEXT    = "#eceae4";
const MUTED   = "#5e5e6e";
const ACCENT  = "#b6a07c";

type AppStatus = "pending" | "approved" | "rejected";

type Application = {
  id: string;
  user_id: string;
  display_name: string;
  bio: string;
  content_types: string[];
  content_description: string | null;
  portfolio_url: string | null;
  sample_work_url: string | null;
  motivation: string;
  agreed_to_terms: boolean;
  status: AppStatus;
  review_notes: string | null;
  created_at: string;
};

const STATUS_CONFIG = {
  pending:  { label: "Pending",       color: "#c8a840", bg: "rgba(200,168,64,0.1)",  border: "rgba(200,168,64,0.22)"  },
  approved: { label: "Approved",      color: "#6ea880", bg: "rgba(110,168,128,0.1)", border: "rgba(110,168,128,0.22)" },
  rejected: { label: "Not accepted",  color: "#c85252", bg: "rgba(200,82,82,0.1)",   border: "rgba(200,82,82,0.2)"   },
} as const;

export default function HeadPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const supabase = useMemo(() => createClientComponentClient(), []);

  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AppStatus | "all">("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("creator_applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) setApps(data as Application[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function act(id: string, status: "approved" | "rejected") {
    setActing(id);
    const notes = reviewNotes[id]?.trim() || null;
    const app   = apps.find((a) => a.id === id);

    const { error } = await supabase
      .from("creator_applications")
      .update({ status, review_notes: notes })
      .eq("id", id);

    if (error) {
      showToast(error.message, false);
      setActing(null);
      return;
    }

    if (status === "approved" && app) {
      const { error: creatorsError } = await supabase.from("creators").upsert(
        {
          id: app.user_id,
          display_name: app.display_name,
          bio: app.bio,
          portfolio_url: app.portfolio_url,
          application_id: app.id,
          approved_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

      if (creatorsError) {
        showToast("Approved, but failed to create creator row: " + creatorsError.message, false);
        setActing(null);
        return;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ role: "creator" })
        .eq("id", app.user_id);

      if (profileError) {
        showToast("Approved, but failed to update profile: " + profileError.message, false);
        setActing(null);
        return;
      }
    }

    setApps((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status, review_notes: notes } : a))
    );
    showToast(status === "approved" ? "Application approved." : "Application rejected.", true);
    setActing(null);
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const visible = apps.filter((a) => filter === "all" || a.status === filter);
  const counts = {
    all:      apps.length,
    pending:  apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };

  return (
    <div style={{ background: BG }} className="min-h-screen">

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 50,
            padding: "10px 20px",
            borderRadius: 9999,
            fontSize: 13,
            fontWeight: 500,
            background: toast.ok ? "rgba(110,168,128,0.15)" : "rgba(200,82,82,0.15)",
            border: `1px solid ${toast.ok ? "rgba(110,168,128,0.35)" : "rgba(200,82,82,0.3)"}`,
            color: toast.ok ? "#6ea880" : "#c85252",
            backdropFilter: "blur(12px)",
            whiteSpace: "nowrap",
          }}
        >
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 840, margin: "0 auto", padding: "52px 24px 80px", color: TEXT }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 36 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 6 }}>
              Admin
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: TEXT }}>
              Creator Applications
            </h1>
          </div>
          <Link
            href={`/${locale}`}
            style={{ fontSize: 12, color: MUTED, textDecoration: "none" }}
          >
            ← Home
          </Link>
        </div>

        {/* Filter tabs */}
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: 4,
            background: SURFACE,
            border: `1px solid ${BORDER}`,
            borderRadius: 12,
            marginBottom: 20,
            width: "fit-content",
          }}
        >
          {(["all", "pending", "approved", "rejected"] as const).map((f) => {
            const active = filter === f;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  border: "none",
                  transition: "all 120ms ease",
                  background: active ? "rgba(255,255,255,0.07)" : "transparent",
                  color: active ? TEXT : MUTED,
                }}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
                <span style={{ marginLeft: 6, opacity: 0.6, fontSize: 11 }}>
                  {counts[f]}
                </span>
              </button>
            );
          })}
        </div>

        {/* List */}
        {loading ? (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, opacity: 0.4, margin: "0 auto" }} />
          </div>
        ) : visible.length === 0 ? (
          <div
            style={{
              padding: "48px 24px",
              textAlign: "center",
              background: SURFACE,
              border: `1px solid ${BORDER}`,
              borderRadius: 16,
            }}
          >
            <p style={{ fontSize: 13, color: MUTED }}>
              No {filter === "all" ? "" : filter} applications.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {visible.map((app) => {
              const cfg   = STATUS_CONFIG[app.status];
              const isOpen = expanded === app.id;

              return (
                <div
                  key={app.id}
                  style={{
                    background: SURFACE,
                    border: `1px solid ${isOpen ? "rgba(255,255,255,0.1)" : BORDER}`,
                    borderRadius: 14,
                    overflow: "hidden",
                    transition: "border-color 120ms ease",
                  }}
                >
                  {/* Row header */}
                  <button
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      padding: "14px 18px",
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                    onClick={() => setExpanded(isOpen ? null : app.id)}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          padding: "3px 10px",
                          borderRadius: 9999,
                          flexShrink: 0,
                          background: cfg.bg,
                          border: `1px solid ${cfg.border}`,
                          color: cfg.color,
                        }}
                      >
                        {cfg.label}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {app.display_name}
                      </span>
                      {app.content_types?.length > 0 && (
                        <span style={{ fontSize: 11, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "none" }}
                          className="sm:block"
                        >
                          {app.content_types.join(", ")}
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                      <span style={{ fontSize: 11, color: "#4a4a56" }}>
                        {new Date(app.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                      </span>
                      <span style={{ fontSize: 10, color: MUTED }}>
                        {isOpen ? "▲" : "▼"}
                      </span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div
                      style={{
                        borderTop: `1px solid ${BORDER}`,
                        padding: "20px 18px",
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                        background: SURFACE2,
                      }}
                    >
                      <DetailRow label="Bio">{app.bio}</DetailRow>
                      <DetailRow label="Content types">
                        {app.content_types?.join(", ") || "—"}
                      </DetailRow>
                      {app.content_description && (
                        <DetailRow label="Description">{app.content_description}</DetailRow>
                      )}
                      {app.portfolio_url && (
                        <DetailRow label="Portfolio">
                          <a
                            href={app.portfolio_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: ACCENT, fontSize: 12, textDecoration: "none" }}
                          >
                            {app.portfolio_url}
                          </a>
                        </DetailRow>
                      )}
                      {app.sample_work_url && (
                        <DetailRow label="Sample work">
                          <a
                            href={app.sample_work_url}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: ACCENT, fontSize: 12, textDecoration: "none" }}
                          >
                            {app.sample_work_url}
                          </a>
                        </DetailRow>
                      )}
                      <DetailRow label="Motivation">{app.motivation}</DetailRow>

                      {app.status === "pending" && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8, borderTop: `1px solid ${BORDER}` }}>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            <label style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED }}>
                              Review notes (optional)
                            </label>
                            <textarea
                              value={reviewNotes[app.id] || ""}
                              onChange={(e) =>
                                setReviewNotes((prev) => ({ ...prev, [app.id]: e.target.value }))
                              }
                              rows={2}
                              placeholder="Reason for rejection, or leave blank for approval…"
                              className="dark-input"
                              style={{ resize: "none" }}
                            />
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              disabled={acting === app.id}
                              onClick={() => act(app.id, "approved")}
                              className="btn-dark text-sm"
                            >
                              {acting === app.id ? "…" : "Approve"}
                            </button>
                            <button
                              disabled={acting === app.id}
                              onClick={() => act(app.id, "rejected")}
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                padding: "8px 20px",
                                borderRadius: 9999,
                                background: "rgba(200,82,82,0.1)",
                                border: "1px solid rgba(200,82,82,0.25)",
                                color: "#c85252",
                                fontSize: 13,
                                fontWeight: 500,
                                cursor: "pointer",
                                transition: "opacity 120ms ease",
                              }}
                            >
                              {acting === app.id ? "…" : "Reject"}
                            </button>
                          </div>
                        </div>
                      )}

                      {app.status !== "pending" && app.review_notes && (
                        <div
                          style={{
                            padding: "12px 14px",
                            borderRadius: 10,
                            background: "rgba(255,255,255,0.03)",
                            border: `1px solid ${BORDER}`,
                          }}
                        >
                          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: MUTED, marginBottom: 6 }}>
                            Notes
                          </p>
                          <p style={{ fontSize: 13, color: "#a0a0ac", lineHeight: 1.6 }}>
                            {app.review_notes}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <p style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED }}>
        {label}
      </p>
      <div style={{ fontSize: 13, color: "#a8a8b4", lineHeight: 1.65 }}>
        {children}
      </div>
    </div>
  );
}
