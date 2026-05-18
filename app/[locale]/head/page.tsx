"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

const BG      = "#0a0a0c";
const SURFACE = "#111116";
const SURFACE2= "#18181f";
const BORDER  = "rgba(255,255,255,0.07)";
const TEXT    = "#eceae4";
const MUTED   = "#5e5e6e";
const ACCENT  = "#b6a07c";

type AppStatus = "pending" | "approved" | "rejected";

type EarningRow = {
  id: string;
  amount: number;
  description: string;
  created_at: string;
};

type KidsSubmission = {
  id: string;
  kid_user_id: string;
  title: string;
  content_type: string;
  status: string;
  description: string | null;
  content: string | null;
  created_at: string;
};

type MessageRow = {
  id: string;
  sender_id: string;
  sender_name: string;
  message_type: string;
  subject: string;
  body: string;
  status: string;
  content_ref: string | null;
  created_at: string;
};

type Application = {
  id: string;
  user_id: string;
  applicant_email: string | null;
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
  const supabase = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []);

  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<AppStatus | "all">("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [reviewNotes, setReviewNotes] = useState<Record<string, string>>({});
  const [acting, setActing] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const [earnings, setEarnings] = useState<{ total: number; rows: EarningRow[] } | null>(null);
  const [earningsLoading, setEarningsLoading] = useState(true);
  const [earningsTab, setEarningsTab] = useState(false);
  const [kidsTab, setKidsTab] = useState(false);
  const [kidsContent, setKidsContent] = useState<KidsSubmission[]>([]);
  const [kidsLoading, setKidsLoading] = useState(false);
  const [messagesTab, setMessagesTab] = useState(false);
  const [messages, setMessages] = useState<MessageRow[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);

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

  useEffect(() => {
    async function loadEarnings() {
      setEarningsLoading(true);
      const res = await fetch("/api/admin/earnings");
      if (res.ok) {
        const json = await res.json();
        setEarnings(json);
      }
      setEarningsLoading(false);
    }
    loadEarnings();
  }, []);

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
        .eq("user_id", app.user_id);

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

  async function loadKidsContent() {
    setKidsLoading(true);
    const { data } = await supabase
      .from("kid_content_submissions")
      .select("id, kid_user_id, title, content_type, status, description, content, created_at")
      .order("created_at", { ascending: false })
      .limit(100);
    setKidsContent((data as KidsSubmission[]) ?? []);
    setKidsLoading(false);
  }

  async function adminRejectKids(id: string) {
    await supabase.from("kid_content_submissions").update({ status: "rejected" }).eq("id", id);
    setKidsContent(prev => prev.map(s => s.id === id ? { ...s, status: "rejected" } : s));
    showToast("Submission rejected.", true);
  }

  async function loadMessages() {
    setMessagesLoading(true);
    const { data } = await supabase
      .from("owner_messages")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    setMessages((data as MessageRow[]) ?? []);
    setMessagesLoading(false);
  }

  async function updateMessageStatus(id: string, newStatus: string) {
    await supabase.from("owner_messages").update({ status: newStatus }).eq("id", id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
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
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 6 }}>
              Admin
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: TEXT }}>
              {messagesTab ? "Messages" : kidsTab ? "Kids Content Review" : earningsTab ? "Platform Earnings" : "Creator Applications"}
            </h1>
          </div>
          <Link
            href={`/${locale}`}
            style={{ fontSize: 12, color: MUTED, textDecoration: "none" }}
          >
            ← Home
          </Link>
        </div>

        {/* Tab switcher */}
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
          {[
            { key: "apps",     label: "Applications" },
            { key: "earnings", label: "Earnings" },
            { key: "kids",     label: "Kids" },
            { key: "messages", label: "Messages" },
          ].map(({ key, label }) => {
            const active =
              key === "messages" ? messagesTab :
              key === "kids" ? (kidsTab && !messagesTab) :
              key === "earnings" ? (earningsTab && !kidsTab && !messagesTab) :
              (!earningsTab && !kidsTab && !messagesTab);
            return (
              <button
                key={key}
                onClick={() => {
                  if (key === "messages") { setMessagesTab(true); setKidsTab(false); setEarningsTab(false); loadMessages(); }
                  else if (key === "kids") { setKidsTab(true); setEarningsTab(false); setMessagesTab(false); loadKidsContent(); }
                  else if (key === "earnings") { setEarningsTab(true); setKidsTab(false); setMessagesTab(false); }
                  else { setEarningsTab(false); setKidsTab(false); setMessagesTab(false); }
                }}
                style={{
                  padding: "6px 18px",
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
                {label}
              </button>
            );
          })}
        </div>

        {messagesTab ? (
          /* ── Messages panel ── */
          messagesLoading ? (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, opacity: 0.4, margin: "0 auto" }} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {messages.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16 }}>
                  <p style={{ fontSize: 13, color: MUTED }}>No messages from creators yet.</p>
                </div>
              ) : messages.map(msg => {
                const typeColors: Record<string, string> = {
                  general: MUTED,
                  delete_request: "#c85252",
                  edit_request: "#6ea880",
                  question: "#c8a840",
                };
                const typeColor = typeColors[msg.message_type] ?? MUTED;
                const isUnread = msg.status === "unread";
                return (
                  <div
                    key={msg.id}
                    style={{
                      background: isUnread ? "rgba(255,255,255,0.03)" : SURFACE,
                      border: `1px solid ${isUnread ? "rgba(255,255,255,0.12)" : BORDER}`,
                      borderRadius: 14,
                      padding: "16px 20px",
                      display: "flex",
                      flexDirection: "column",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: typeColor, background: `${typeColor}18`, borderRadius: 999, padding: "3px 10px", textTransform: "capitalize" }}>
                            {msg.message_type.replace("_", " ")}
                          </span>
                          {isUnread && (
                            <span style={{ fontSize: 10, fontWeight: 700, color: "#6ea880", background: "rgba(110,168,128,0.12)", borderRadius: 999, padding: "2px 8px" }}>
                              New
                            </span>
                          )}
                          {msg.status === "resolved" && (
                            <span style={{ fontSize: 10, color: MUTED, background: "rgba(255,255,255,0.04)", borderRadius: 999, padding: "2px 8px" }}>
                              Resolved
                            </span>
                          )}
                        </div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: TEXT }}>{msg.subject || "(no subject)"}</div>
                        <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                          From: {msg.sender_name || msg.sender_id.slice(0, 8)} · {new Date(msg.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                        </div>
                        {msg.content_ref && (
                          <div style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Ref: {msg.content_ref}</div>
                        )}
                      </div>
                    </div>
                    <div style={{ fontSize: 13, color: "#a0a0ac", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{msg.body}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {msg.status !== "read" && msg.status !== "resolved" && (
                        <button
                          onClick={() => updateMessageStatus(msg.id, "read")}
                          style={{ fontSize: 11, padding: "4px 12px", borderRadius: 999, border: `1px solid ${BORDER}`, background: "transparent", color: MUTED, cursor: "pointer" }}
                        >
                          Mark read
                        </button>
                      )}
                      {msg.status !== "resolved" && (
                        <button
                          onClick={() => updateMessageStatus(msg.id, "resolved")}
                          style={{ fontSize: 11, padding: "4px 12px", borderRadius: 999, border: "1px solid rgba(110,168,128,0.3)", background: "rgba(110,168,128,0.08)", color: "#6ea880", cursor: "pointer" }}
                        >
                          Mark resolved
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : kidsTab ? (
          /* ── Kids content panel ── */
          kidsLoading ? (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, opacity: 0.4, margin: "0 auto" }} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {kidsContent.length === 0 ? (
                <div style={{ padding: "48px 24px", textAlign: "center", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16 }}>
                  <p style={{ fontSize: 13, color: MUTED }}>No kids content submissions yet.</p>
                </div>
              ) : kidsContent.map(s => {
                const statusColor: Record<string, string> = { pending: "#c8a840", both_approved: "#6ea880", parent_approved: "#b0c86a", teacher_approved: "#6ac8c8", rejected: "#c85252" };
                const col = statusColor[s.status] ?? MUTED;
                return (
                  <div key={s.id} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: TEXT }}>{s.title}</div>
                        <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{s.content_type} · {new Date(s.created_at).toLocaleDateString()}</div>
                        {s.description && <div style={{ fontSize: 12, color: MUTED, marginTop: 6, fontStyle: "italic" }}>{s.description}</div>}
                        {s.content && <div style={{ fontSize: 12, color: "#999", marginTop: 6, maxHeight: 80, overflow: "hidden", lineHeight: 1.5 }}>{s.content}</div>}
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: col, background: `${col}18`, borderRadius: 999, padding: "3px 10px" }}>
                          {s.status}
                        </span>
                        {s.status !== "rejected" && (
                          <button
                            onClick={() => adminRejectKids(s.id)}
                            style={{ fontSize: 11, padding: "4px 12px", borderRadius: 999, border: "1px solid rgba(200,82,82,0.35)", background: "transparent", color: "#c85252", cursor: "pointer" }}
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        ) : earningsTab ? (
          /* ── Earnings panel ── */
          earningsLoading ? (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, opacity: 0.4, margin: "0 auto" }} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Summary card */}
              <div
                style={{
                  background: "linear-gradient(145deg, #141418, #1a1a22)",
                  border: `1px solid rgba(255,255,255,0.1)`,
                  borderRadius: 18,
                  padding: "28px 24px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED }}>
                  Total platform earnings
                </p>
                <p style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em", color: TEXT, lineHeight: 1 }}>
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(earnings?.total ?? 0)}
                </p>
                <p style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>
                  {earnings?.rows.length ?? 0} transaction{(earnings?.rows.length ?? 0) !== 1 ? "s" : ""} · 15% platform cut
                </p>
              </div>

              {/* Row list */}
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginTop: 8 }}>
                Earning history
              </p>
              {!earnings?.rows.length ? (
                <div
                  style={{
                    padding: "40px 24px",
                    textAlign: "center",
                    background: SURFACE,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 14,
                  }}
                >
                  <p style={{ fontSize: 13, color: MUTED }}>No earnings recorded yet.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {earnings.rows.map((row) => (
                    <div
                      key={row.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 16,
                        padding: "13px 18px",
                        background: SURFACE,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 12,
                      }}
                    >
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>{row.description}</p>
                        <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                          {new Date(row.created_at).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#6ea880", flexShrink: 0, letterSpacing: "-0.01em" }}>
                        +{new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(row.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        ) : (
          <>
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
                      <div style={{ minWidth: 0 }}>
                        <span style={{ fontSize: 13, fontWeight: 500, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                          {app.display_name}
                        </span>
                        {app.applicant_email && (
                          <span style={{ fontSize: 11, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                            {app.applicant_email}
                          </span>
                        )}
                      </div>
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
                      {app.applicant_email && (
                        <DetailRow label="Email">
                          <a href={`mailto:${app.applicant_email}`} style={{ color: ACCENT, textDecoration: "none", fontSize: 12 }}>
                            {app.applicant_email}
                          </a>
                        </DetailRow>
                      )}
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
          </>
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
