"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const BG      = "#0a0a0c";
const SURFACE = "#111116";
const SURFACE2= "#18181f";
const BORDER  = "rgba(255,255,255,0.07)";
const BORDER2 = "rgba(255,255,255,0.11)";
const TEXT    = "#eceae4";
const MUTED   = "#5e5e6e";
const MUTED2  = "#7a7a8a";
const ACCENT  = "#b6a07c";
const GREEN   = "#4ea87a";
const RED     = "#c85252";

type ContractStatus = "draft" | "sent" | "active" | "completed" | "declined" | "cancelled";

type Contract = {
  id: string; title: string; description: string | null;
  offeror_type: string; offeror_id: string; creator_id: string;
  status: ContractStatus; total_amount: number; currency: string;
  deadline: string | null; terms: string | null;
  created_at: string; updated_at: string;
};

type Milestone = {
  id: string; title: string; description: string | null;
  amount: number; due_date: string | null;
  status: "pending" | "submitted" | "approved" | "paid";
};

type OfferorInfo = { display_name: string | null };

const STATUS_CFG: Record<ContractStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:     { label: "Draft",     color: MUTED2,    bg: `${MUTED2}14`,    border: `${MUTED2}30` },
  sent:      { label: "Pending",   color: "#c8a840",  bg: "rgba(200,168,64,0.1)",   border: "rgba(200,168,64,0.25)"  },
  active:    { label: "Active",    color: GREEN,      bg: "rgba(78,168,122,0.1)",   border: "rgba(78,168,122,0.25)"  },
  completed: { label: "Completed", color: ACCENT,     bg: `${ACCENT}14`,    border: `${ACCENT}30` },
  declined:  { label: "Declined",  color: RED,        bg: "rgba(200,82,82,0.1)",    border: "rgba(200,82,82,0.22)"   },
  cancelled: { label: "Cancelled", color: MUTED,      bg: `${MUTED}14`,     border: `${MUTED}22`  },
};

const MILESTONE_STATUS_CFG = {
  pending:   { label: "Pending",   color: MUTED2 },
  submitted: { label: "Submitted", color: "#c8a840" },
  approved:  { label: "Approved",  color: ACCENT },
  paid:      { label: "Paid",      color: GREEN },
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-GB", { dateStyle: "medium" });
}
function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function StudioContractsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [view, setView]             = useState<string>("list");
  const [contracts, setContracts]   = useState<Contract[]>([]);
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "all">("all");
  const [loading, setLoading]       = useState(true);

  const [detail, setDetail]           = useState<Contract | null>(null);
  const [milestones, setMilestones]   = useState<Milestone[]>([]);
  const [offerorInfo, setOfferorInfo] = useState<OfferorInfo | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [responding, setResponding]   = useState(false);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const loadContracts = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push(`/${locale}/login`); return; }

    const { data } = await supabase
      .from("contracts")
      .select("*")
      .eq("creator_id", user.id)
      .order("created_at", { ascending: false });

    setContracts((data as Contract[]) ?? []);
    setLoading(false);
  }, [supabase, locale, router]);

  useEffect(() => {
    loadContracts();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function openDetail(contract: Contract) {
    setView(contract.id);
    setDetail(contract);
    setDetailLoading(true);
    const [msRes, offerorRes] = await Promise.all([
      supabase.from("contract_milestones").select("*").eq("contract_id", contract.id).order("due_date"),
      supabase.from("profiles").select("display_name").eq("user_id", contract.offeror_id).maybeSingle(),
    ]);
    setMilestones((msRes.data as Milestone[]) ?? []);
    setOfferorInfo(offerorRes.data as OfferorInfo | null);
    setDetailLoading(false);
  }

  async function handleSubmitMilestone(milestoneId: string) {
    if (!detail) return;
    setSubmittingId(milestoneId);
    const res = await fetch(`/api/contracts/${detail.id}/milestones/${milestoneId}/submit`, { method: "PATCH" });
    const json = await res.json();
    setSubmittingId(null);
    if (!res.ok) { showToast(json.error ?? "Failed to submit", false); return; }
    showToast("Milestone marked as submitted.", true);
    setMilestones(prev => prev.map(m => m.id === milestoneId ? { ...m, status: "submitted" as const } : m));
  }

  async function handleRespond(action: "accept" | "decline") {
    if (!detail) return;
    setResponding(true);
    const res = await fetch(`/api/contracts/${detail.id}/respond`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    const json = await res.json();
    setResponding(false);
    if (!res.ok) { showToast(json.error ?? "Failed", false); return; }

    const newStatus: ContractStatus = action === "accept" ? "active" : "declined";
    showToast(action === "accept" ? "Contract accepted." : "Contract declined.", true);
    setDetail(prev => prev ? { ...prev, status: newStatus } : null);
    setContracts(prev => prev.map(c => c.id === detail.id ? { ...c, status: newStatus } : c));
  }

  const visible = contracts.filter(c => statusFilter === "all" || c.status === statusFilter);
  const pendingCount = contracts.filter(c => c.status === "sent").length;

  // ── Detail view ──────────────────────────────────────────────────

  if (view !== "list" && detail) {
    const cfg = STATUS_CFG[detail.status];

    return (
      <div style={{ background: BG, minHeight: "100vh", color: TEXT }}>
        {toast && <Toast {...toast} />}
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "52px 24px 80px" }}>
          <button onClick={() => setView("list")} style={{ fontSize: 12, color: MUTED, background: "none", border: "none", cursor: "pointer", marginBottom: 24, padding: 0 }}>
            ← All contracts
          </button>

          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 28 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: TEXT }}>{detail.title}</h1>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 9999, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
                  {cfg.label}
                </span>
              </div>
              <p style={{ fontSize: 12, color: MUTED2 }}>
                From: <span style={{ color: TEXT }}>{offerorInfo?.display_name ?? detail.offeror_id.slice(0, 8)}</span>
                {" · "}Total: <span style={{ color: TEXT }}>{fmt(detail.total_amount)}</span>
                {detail.deadline && <>{" · "}Deadline: <span style={{ color: TEXT }}>{fmtDate(detail.deadline)}</span></>}
              </p>
            </div>
          </div>

          {detailLoading ? (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT, opacity: 0.4, margin: "0 auto" }} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

              {/* Accept / Decline (only when 'sent') */}
              {detail.status === "sent" && (
                <div style={{ background: "rgba(182,160,124,0.07)", border: `1px solid rgba(182,160,124,0.2)`, borderRadius: 14, padding: "20px" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, marginBottom: 6 }}>
                    You have a pending contract offer
                  </p>
                  <p style={{ fontSize: 12, color: MUTED2, lineHeight: 1.65, marginBottom: 16 }}>
                    Review the terms and milestones below. Accepting is binding — the contract status will move to Active.
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => handleRespond("accept")} disabled={responding}
                      style={{ padding: "10px 24px", borderRadius: 9999, background: GREEN, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: responding ? "not-allowed" : "pointer", opacity: responding ? 0.7 : 1 }}>
                      {responding ? "…" : "Accept contract"}
                    </button>
                    <button onClick={() => handleRespond("decline")} disabled={responding}
                      style={{ padding: "10px 24px", borderRadius: 9999, background: "rgba(200,82,82,0.12)", border: "1px solid rgba(200,82,82,0.3)", color: RED, fontSize: 13, fontWeight: 500, cursor: responding ? "not-allowed" : "pointer", opacity: responding ? 0.7 : 1 }}>
                      {responding ? "…" : "Decline"}
                    </button>
                  </div>
                </div>
              )}

              {detail.status === "active" && (
                <div style={{ background: "rgba(78,168,122,0.07)", border: "1px solid rgba(78,168,122,0.22)", borderRadius: 14, padding: "16px 20px" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: GREEN }}>✓ Contract active</p>
                  <p style={{ fontSize: 12, color: MUTED2, marginTop: 4 }}>You accepted this contract. Deliver each milestone as agreed.</p>
                </div>
              )}

              {detail.status === "declined" && (
                <div style={{ background: "rgba(200,82,82,0.07)", border: "1px solid rgba(200,82,82,0.2)", borderRadius: 14, padding: "16px 20px" }}>
                  <p style={{ fontSize: 13, color: RED }}>You declined this contract.</p>
                </div>
              )}

              {/* Description */}
              {detail.description && (
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 20px" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, marginBottom: 8 }}>Overview</p>
                  <p style={{ fontSize: 13, color: MUTED2, lineHeight: 1.7 }}>{detail.description}</p>
                </div>
              )}

              {/* Terms */}
              {detail.terms && (
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 20px" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, marginBottom: 8 }}>Contract terms</p>
                  <p style={{ fontSize: 13, color: MUTED2, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{detail.terms}</p>
                </div>
              )}

              {/* Milestones */}
              {milestones.length > 0 && (
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 20px" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>
                    Milestones
                    <span style={{ marginLeft: 8, opacity: 0.5, fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
                      {fmt(milestones.reduce((s, m) => s + m.amount, 0))} total
                    </span>
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {milestones.map(ms => {
                      const msCfg       = MILESTONE_STATUS_CFG[ms.status];
                      const canSubmit   = detail.status === "active" && ms.status === "pending";
                      const isSubmitting = submittingId === ms.id;
                      return (
                        <div key={ms.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 14px", background: SURFACE2, borderRadius: 10, border: `1px solid ${BORDER}` }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>{ms.title}</p>
                            {ms.description && <p style={{ fontSize: 11, color: MUTED2, marginTop: 2 }}>{ms.description}</p>}
                            {ms.due_date && <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Due {fmtDate(ms.due_date)}</p>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: msCfg.color, background: `${msCfg.color}18`, borderRadius: 999, padding: "2px 8px" }}>{msCfg.label}</span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{fmt(ms.amount)}</span>
                            {canSubmit && (
                              <button
                                onClick={() => handleSubmitMilestone(ms.id)}
                                disabled={isSubmitting || !!submittingId}
                                style={{ padding: "5px 12px", borderRadius: 9999, background: "rgba(182,160,124,0.14)", border: `1px solid rgba(182,160,124,0.3)`, color: ACCENT, fontSize: 11, fontWeight: 600, cursor: (isSubmitting || !!submittingId) ? "not-allowed" : "pointer", opacity: (isSubmitting || !!submittingId) ? 0.6 : 1, whiteSpace: "nowrap" }}
                              >
                                {isSubmitting ? "…" : "Mark submitted"}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Meta */}
              <div style={{ padding: "10px 0" }}>
                <p style={{ fontSize: 11, color: MUTED }}>Received {fmtDateTime(detail.created_at)}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── List view ────────────────────────────────────────────────────

  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT }}>
      {toast && <Toast {...toast} />}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "52px 24px 80px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 6 }}>Studio</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: TEXT }}>Contracts</h1>
              {pendingCount > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "#c8a840", background: "rgba(200,168,64,0.12)", border: "1px solid rgba(200,168,64,0.3)", borderRadius: 9999, padding: "2px 10px" }}>
                  {pendingCount} pending
                </span>
              )}
            </div>
          </div>
          <Link href={`/${locale}/studio`} style={{ fontSize: 12, color: MUTED, textDecoration: "none" }}>← Studio</Link>
        </div>

        {/* Status filter */}
        <div style={{ display: "flex", gap: 4, padding: 4, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, marginBottom: 20, width: "fit-content", flexWrap: "wrap" }}>
          {(["all", "sent", "active", "completed", "declined"] as const).map(s => {
            const active = statusFilter === s;
            const count  = s === "all" ? contracts.length : contracts.filter(c => c.status === s).length;
            return (
              <button key={s} onClick={() => setStatusFilter(s as ContractStatus | "all")}
                style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 120ms ease", background: active ? "rgba(255,255,255,0.07)" : "transparent", color: active ? TEXT : MUTED }}>
                {s === "sent" ? "Pending" : s.charAt(0).toUpperCase() + s.slice(1)}
                <span style={{ marginLeft: 5, opacity: 0.5, fontSize: 11 }}>{count}</span>
              </button>
            );
          })}
        </div>

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT, opacity: 0.4, margin: "0 auto" }} />
          </div>
        ) : visible.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16 }}>
            <p style={{ fontSize: 13, color: MUTED }}>
              {contracts.length === 0 ? "No contract offers yet." : `No ${statusFilter === "all" ? "" : statusFilter} contracts.`}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {visible.map(c => {
              const cfg = STATUS_CFG[c.status];
              const isPending = c.status === "sent";
              return (
                <button key={c.id} onClick={() => openDetail(c)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 18px", background: isPending ? "rgba(255,255,255,0.025)" : SURFACE, border: `1px solid ${isPending ? "rgba(255,255,255,0.1)" : BORDER}`, borderRadius: 14, cursor: "pointer", textAlign: "left" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 9999, flexShrink: 0, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: isPending ? 600 : 500, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</p>
                      <p style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>Received {fmtDate(c.created_at)}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
                    {c.deadline && <span style={{ fontSize: 11, color: MUTED }}>Due {fmtDate(c.deadline)}</span>}
                    <span style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>{fmt(c.total_amount)}</span>
                    <span style={{ fontSize: 10, color: MUTED }}>›</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <div style={{ position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)", zIndex: 60, padding: "10px 22px", borderRadius: 9999, fontSize: 13, fontWeight: 500, whiteSpace: "nowrap", backdropFilter: "blur(12px)", background: ok ? "rgba(78,168,122,0.14)" : "rgba(200,82,82,0.14)", border: `1px solid ${ok ? "rgba(78,168,122,0.35)" : "rgba(200,82,82,0.3)"}`, color: ok ? GREEN : RED }}>
      {msg}
    </div>
  );
}
