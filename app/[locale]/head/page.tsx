"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

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
  const [toast, setToast] = useState<string | null>(null);

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
    const { error } = await supabase
      .from("creator_applications")
      .update({ status, review_notes: notes })
      .eq("id", id);

    if (!error) {
      setApps((prev) =>
        prev.map((a) => (a.id === id ? { ...a, status, review_notes: notes } : a))
      );
      showToast(status === "approved" ? "Application approved." : "Application rejected.");
    } else {
      showToast("Error: " + error.message);
    }
    setActing(null);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  const visible = apps.filter((a) => filter === "all" || a.status === filter);
  const counts = {
    all: apps.length,
    pending: apps.filter((a) => a.status === "pending").length,
    approved: apps.filter((a) => a.status === "approved").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
  };

  const statusStyle = (s: AppStatus) => ({
    pending:  { bg: "rgba(255,200,80,0.15)", border: "rgba(200,160,0,0.25)", color: "#7a6000", label: "Pending" },
    approved: { bg: "rgba(94,99,87,0.15)",  border: "rgba(94,99,87,0.3)",   color: "var(--accent)", label: "Approved" },
    rejected: { bg: "rgba(122,46,46,0.10)", border: "rgba(122,46,46,0.2)",  color: "var(--danger)", label: "Rejected" },
  }[s]);

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-sm font-medium shadow-lg"
          style={{ background: "var(--accent)", color: "#fff" }}
        >
          {toast}
        </div>
      )}

      <div className="mx-auto max-w-4xl px-6 py-10 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div className="space-y-1">
            <div
              className="inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wide"
              style={{ background: "rgba(94,99,87,0.12)", color: "var(--accent)" }}
            >
              Owner Only
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Creator Applications</h1>
          </div>
          <Link
            href={`/${locale}`}
            className="text-xs transition hover:opacity-70"
            style={{ color: "var(--muted)" }}
          >
            ← Home
          </Link>
        </div>

        {/* Stat chips */}
        <div className="flex flex-wrap gap-2">
          {(["all", "pending", "approved", "rejected"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="rounded-full px-4 py-1.5 text-xs font-semibold transition"
              style={{
                background: filter === f ? "var(--accent)" : "rgba(255,255,255,0.7)",
                border: `1px solid ${filter === f ? "var(--accent)" : "var(--border)"}`,
                color: filter === f ? "#f8f7f3" : "var(--muted)",
              }}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}{" "}
              <span className="opacity-70">({counts[f]})</span>
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>Loading applications…</p>
        ) : visible.length === 0 ? (
          <div
            className="rounded-[24px] border p-8 text-center"
            style={{ borderColor: "var(--border)", background: "rgba(233,230,223,0.66)" }}
          >
            <p className="text-sm" style={{ color: "var(--muted)" }}>No {filter === "all" ? "" : filter} applications.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((app) => {
              const style = statusStyle(app.status);
              const isOpen = expanded === app.id;
              return (
                <div
                  key={app.id}
                  className="rounded-[20px] border overflow-hidden"
                  style={{
                    borderColor: "var(--border)",
                    background: "rgba(255,255,255,0.55)",
                    boxShadow: "var(--shadow-soft)",
                  }}
                >
                  {/* Row */}
                  <button
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition hover:opacity-80"
                    onClick={() => setExpanded(isOpen ? null : app.id)}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                        style={{ background: style.bg, border: `1px solid ${style.border}`, color: style.color }}
                      >
                        {style.label}
                      </span>
                      <span className="truncate text-sm font-semibold" style={{ color: "var(--text)" }}>
                        {app.display_name}
                      </span>
                      <span className="hidden sm:inline text-xs truncate" style={{ color: "var(--muted)" }}>
                        {app.content_types?.join(", ")}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs" style={{ color: "var(--muted)" }}>
                        {new Date(app.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}
                      </span>
                      <span className="text-xs" style={{ color: "var(--muted)" }}>{isOpen ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div className="border-t px-5 py-5 space-y-4" style={{ borderColor: "var(--border)" }}>
                      <DetailRow label="Bio">{app.bio}</DetailRow>
                      <DetailRow label="Content types">{app.content_types?.join(", ")}</DetailRow>
                      {app.content_description && (
                        <DetailRow label="Description">{app.content_description}</DetailRow>
                      )}
                      {app.portfolio_url && (
                        <DetailRow label="Portfolio">
                          <a href={app.portfolio_url} target="_blank" rel="noreferrer"
                            className="underline text-xs" style={{ color: "var(--accent)" }}>
                            {app.portfolio_url}
                          </a>
                        </DetailRow>
                      )}
                      {app.sample_work_url && (
                        <DetailRow label="Sample work">
                          <a href={app.sample_work_url} target="_blank" rel="noreferrer"
                            className="underline text-xs" style={{ color: "var(--accent)" }}>
                            {app.sample_work_url}
                          </a>
                        </DetailRow>
                      )}
                      <DetailRow label="Motivation">{app.motivation}</DetailRow>

                      {app.status === "pending" && (
                        <div className="space-y-3 pt-2">
                          <div className="space-y-1">
                            <label className="block text-[11px] font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>
                              Review notes (optional, shown on rejection)
                            </label>
                            <textarea
                              value={reviewNotes[app.id] || ""}
                              onChange={(e) =>
                                setReviewNotes((prev) => ({ ...prev, [app.id]: e.target.value }))
                              }
                              rows={2}
                              placeholder="Reason for rejection, or leave blank for approval…"
                              className="soft-input w-full resize-none text-sm"
                            />
                          </div>
                          <div className="flex gap-3">
                            <button
                              disabled={acting === app.id}
                              onClick={() => act(app.id, "approved")}
                              className="btn-ios text-sm disabled:opacity-60"
                            >
                              {acting === app.id ? "…" : "Approve"}
                            </button>
                            <button
                              disabled={acting === app.id}
                              onClick={() => act(app.id, "rejected")}
                              className="btn-ios-secondary text-sm disabled:opacity-60"
                              style={{ color: "var(--danger)", borderColor: "var(--danger)" }}
                            >
                              {acting === app.id ? "…" : "Reject"}
                            </button>
                          </div>
                        </div>
                      )}

                      {app.status !== "pending" && app.review_notes && (
                        <div
                          className="rounded-2xl px-4 py-3 text-xs"
                          style={{
                            background: "rgba(94,99,87,0.06)",
                            border: "1px solid var(--border)",
                            color: "var(--muted)",
                          }}
                        >
                          <span className="font-semibold">Notes: </span>{app.review_notes}
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
    </main>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        {label}
      </p>
      <p className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
        {children}
      </p>
    </div>
  );
}
