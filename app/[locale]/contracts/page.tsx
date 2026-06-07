"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/browserClient";

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
  id: string; contract_id: string; title: string;
  description: string | null; amount: number; due_date: string | null;
  status: "pending" | "submitted" | "approved" | "paid";
};

type Signature = { id: string; user_id: string; role: string; agreed_at: string };

type Creator = { id: string; display_name: string | null };

type MilestoneInput = { title: string; amount: string; dueDate: string };

const STATUS_CFG: Record<ContractStatus, { label: string; color: string; bg: string; border: string }> = {
  draft:     { label: "Draft",     color: MUTED2,    bg: `${MUTED2}14`,    border: `${MUTED2}30` },
  sent:      { label: "Sent",      color: "#c8a840",  bg: "rgba(200,168,64,0.1)",   border: "rgba(200,168,64,0.25)"  },
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

const EMPTY_FORM = {
  creatorId: "", title: "", description: "", terms: "", totalAmount: "", deadline: "",
  milestones: [{ title: "", amount: "", dueDate: "" }] as MilestoneInput[],
};

export default function ContractsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";
  const supabase = useMemo(() => getBrowserClient(), []);

  // view: 'list' | 'new' | contractId
  const [view, setView]           = useState<string>("list");
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [creators, setCreators]   = useState<Creator[]>([]);
  const [statusFilter, setStatusFilter] = useState<ContractStatus | "all">("all");
  const [loading, setLoading]     = useState(true);

  // Detail state
  const [detail, setDetail]         = useState<Contract | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [signatures, setSignatures] = useState<Signature[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  // New contract form
  const [form, setForm]       = useState({ ...EMPTY_FORM, milestones: [{ title: "", amount: "", dueDate: "" }] });
  const [saving, setSaving]   = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Send
  const [sending, setSending] = useState(false);

  // Milestone payments
  const [approvingId, setApprovingId]   = useState<string | null>(null);
  const [approveError, setApproveError] = useState<string | null>(null);
  const [offerorBalance, setOfferorBalance] = useState<number | null>(null);

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
      .eq("offeror_id", user.id)
      .order("created_at", { ascending: false });

    setContracts((data as Contract[]) ?? []);
    setLoading(false);
  }, [supabase, locale, router]);

  useEffect(() => {
    async function init() {
      await loadContracts();
      const { data } = await supabase.from("creators").select("id, display_name").order("display_name");
      setCreators((data as Creator[]) ?? []);
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function openDetail(contract: Contract) {
    setView(contract.id);
    setDetail(contract);
    setApproveError(null);
    setDetailLoading(true);
    const fetches: PromiseLike<unknown>[] = [
      supabase.from("contract_milestones").select("*").eq("contract_id", contract.id).order("due_date"),
      supabase.from("contract_signatures").select("*").eq("contract_id", contract.id),
    ];
    if (contract.status === "active") fetches.push(fetch("/api/wallet"));
    const [msRes, sigRes, walletRes] = await Promise.all(fetches) as [
      { data: Milestone[] | null }, { data: Signature[] | null }, Response | undefined
    ];
    setMilestones(msRes.data ?? []);
    setSignatures(sigRes.data ?? []);
    if (walletRes?.ok) {
      const wj = await walletRes.json();
      setOfferorBalance(wj.wallet?.balance ?? null);
    }
    setDetailLoading(false);
  }

  async function handleApprove(milestoneId: string) {
    if (!detail) return;
    setApprovingId(milestoneId);
    setApproveError(null);
    const res = await fetch(`/api/contracts/${detail.id}/milestones/${milestoneId}/approve`, { method: "PATCH" });
    const json = await res.json();
    setApprovingId(null);
    if (!res.ok) {
      const msg = json.error === "insufficient_balance"
        ? `Insufficient balance — need ${fmt(json.required ?? 0)}, have ${fmt(json.balance ?? 0)}. Top up your wallet first.`
        : (json.error ?? "Approval failed");
      setApproveError(msg);
      return;
    }
    setMilestones(prev => prev.map(m => m.id === milestoneId ? { ...m, status: "paid" as const } : m));
    if (json.allPaid) {
      setDetail(prev => prev ? { ...prev, status: "completed" } : null);
      setContracts(prev => prev.map(c => c.id === detail.id ? { ...c, status: "completed" as ContractStatus } : c));
      showToast("All milestones paid — contract completed!", true);
    } else {
      showToast("Milestone paid.", true);
    }
    // Refresh balance
    const walletRes = await fetch("/api/wallet");
    if (walletRes.ok) {
      const wj = await walletRes.json();
      setOfferorBalance(wj.wallet?.balance ?? null);
    }
  }

  async function handleSaveDraft() {
    if (!form.creatorId || !form.title.trim()) {
      setFormError("Creator and title are required.");
      return;
    }
    setSaving(true);
    setFormError(null);
    const res = await fetch("/api/contracts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        creatorId:   form.creatorId,
        title:       form.title,
        description: form.description,
        terms:       form.terms,
        totalAmount: form.totalAmount,
        deadline:    form.deadline || null,
        milestones:  form.milestones.filter(m => m.title.trim()),
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setFormError(json.error ?? "Failed to create contract"); return; }
    showToast("Contract saved as draft.", true);
    setForm({ ...EMPTY_FORM, milestones: [{ title: "", amount: "", dueDate: "" }] });
    await loadContracts();
    setView("list");
  }

  async function handleSend(contractId: string) {
    setSending(true);
    const res = await fetch(`/api/contracts/${contractId}/send`, { method: "PATCH" });
    const json = await res.json();
    setSending(false);
    if (!res.ok) { showToast(json.error ?? "Failed to send", false); return; }
    showToast("Contract sent to creator.", true);
    await loadContracts();
    // Refresh detail
    const { data } = await supabase.from("contracts").select("*").eq("id", contractId).maybeSingle();
    if (data) setDetail(data as Contract);
    const sigRes = await supabase.from("contract_signatures").select("*").eq("contract_id", contractId);
    setSignatures((sigRes.data as Signature[]) ?? []);
  }

  function addMilestone() {
    setForm(f => ({ ...f, milestones: [...f.milestones, { title: "", amount: "", dueDate: "" }] }));
  }

  function removeMilestone(i: number) {
    setForm(f => ({ ...f, milestones: f.milestones.filter((_, idx) => idx !== i) }));
  }

  function updateMilestone(i: number, key: keyof MilestoneInput, value: string) {
    setForm(f => {
      const ms = [...f.milestones];
      ms[i] = { ...ms[i], [key]: value };
      return { ...f, milestones: ms };
    });
  }

  const creatorNameMap = useMemo(() => {
    const m: Record<string, string> = {};
    creators.forEach(c => { m[c.id] = c.display_name ?? c.id.slice(0, 8); });
    return m;
  }, [creators]);

  const visible = contracts.filter(c => statusFilter === "all" || c.status === statusFilter);
  const statusCounts = useMemo(() => {
    const out: Record<string, number> = { all: contracts.length };
    contracts.forEach(c => { out[c.status] = (out[c.status] ?? 0) + 1; });
    return out;
  }, [contracts]);

  // ── New contract form ────────────────────────────────────────────

  if (view === "new") {
    return (
      <div style={{ background: BG, minHeight: "100vh", color: TEXT }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "52px 24px 80px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, marginBottom: 36 }}>
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 6 }}>Contracts</p>
              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: TEXT }}>New contract</h1>
            </div>
            <button onClick={() => setView("list")} style={{ fontSize: 12, color: MUTED, background: "none", border: "none", cursor: "pointer" }}>
              ← Back
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Creator + basic info */}
            <div style={{ background: SURFACE, border: `1px solid ${BORDER2}`, borderRadius: 16, padding: "24px 20px", display: "flex", flexDirection: "column", gap: 18 }}>
              <FormField label="Creator *">
                <select
                  value={form.creatorId}
                  onChange={e => setForm(f => ({ ...f, creatorId: e.target.value }))}
                  style={{ width: "100%", padding: "9px 12px", background: SURFACE2, border: `1px solid ${BORDER2}`, borderRadius: 10, color: form.creatorId ? TEXT : MUTED2, fontSize: 13, outline: "none" }}
                >
                  <option value="">Select a creator…</option>
                  {creators.map(c => (
                    <option key={c.id} value={c.id}>{c.display_name ?? c.id.slice(0, 8)}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="Title *">
                <input
                  type="text" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. 6-chapter manga series" className="dark-input"
                />
              </FormField>

              <FormField label="Description">
                <textarea
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3} placeholder="Brief overview of the project…" className="dark-input" style={{ resize: "none" }}
                />
              </FormField>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <FormField label="Total amount (USD)">
                  <input
                    type="number" min="0" step="0.01" value={form.totalAmount}
                    onChange={e => setForm(f => ({ ...f, totalAmount: e.target.value }))}
                    placeholder="0.00" className="dark-input"
                  />
                </FormField>
                <FormField label="Deadline">
                  <input
                    type="date" value={form.deadline}
                    onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                    className="dark-input"
                    style={{ colorScheme: "dark" }}
                  />
                </FormField>
              </div>
            </div>

            {/* Terms */}
            <div style={{ background: SURFACE, border: `1px solid ${BORDER2}`, borderRadius: 16, padding: "24px 20px" }}>
              <FormField label="Contract terms">
                <textarea
                  value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))}
                  rows={8} placeholder="Write the full contract terms here — deliverables, rights, usage, payment schedule, revision policy, etc."
                  className="dark-input" style={{ resize: "vertical" }}
                />
              </FormField>
            </div>

            {/* Milestones */}
            <div style={{ background: SURFACE, border: `1px solid ${BORDER2}`, borderRadius: 16, padding: "24px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED }}>Milestones</p>
                <button onClick={addMilestone} style={{ fontSize: 12, color: ACCENT, background: "none", border: "none", cursor: "pointer" }}>
                  + Add milestone
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {form.milestones.map((m, i) => (
                  <div key={i} style={{ background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "14px 16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, marginBottom: 8 }}>
                      <input
                        type="text" value={m.title}
                        onChange={e => updateMilestone(i, "title", e.target.value)}
                        placeholder={`Milestone ${i + 1} title`} className="dark-input"
                        style={{ fontSize: 13 }}
                      />
                      <input
                        type="number" min="0" step="0.01" value={m.amount}
                        onChange={e => updateMilestone(i, "amount", e.target.value)}
                        placeholder="$0.00" className="dark-input"
                        style={{ width: 90, fontSize: 13 }}
                      />
                      {form.milestones.length > 1 && (
                        <button onClick={() => removeMilestone(i)}
                          style={{ fontSize: 13, color: RED, background: "none", border: "none", cursor: "pointer", padding: "0 4px" }}>
                          ×
                        </button>
                      )}
                    </div>
                    <input
                      type="date" value={m.dueDate}
                      onChange={e => updateMilestone(i, "dueDate", e.target.value)}
                      className="dark-input" style={{ fontSize: 12, colorScheme: "dark" }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {formError && <p style={{ fontSize: 12, color: RED }}>{formError}</p>}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setView("list")} style={{ padding: "10px 22px", borderRadius: 9999, background: "transparent", border: `1px solid ${BORDER2}`, color: MUTED2, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={handleSaveDraft} disabled={saving}
                style={{ padding: "10px 22px", borderRadius: 9999, background: ACCENT, border: "none", color: BG, fontSize: 13, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
                {saving ? "Saving…" : "Save as draft"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Contract detail view ─────────────────────────────────────────

  if (view !== "list" && detail) {
    const cfg = STATUS_CFG[detail.status];
    const offerorSigned = signatures.some(s => s.role === "offeror");
    const creatorSigned = signatures.some(s => s.role === "creator");

    return (
      <div style={{ background: BG, minHeight: "100vh", color: TEXT }}>
        {toast && <Toast {...toast} />}
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "52px 24px 80px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 32 }}>
            <div>
              <button onClick={() => setView("list")} style={{ fontSize: 12, color: MUTED, background: "none", border: "none", cursor: "pointer", marginBottom: 12, padding: 0 }}>
                ← All contracts
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.02em", color: TEXT }}>{detail.title}</h1>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 9999, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
                  {cfg.label}
                </span>
              </div>
              <p style={{ fontSize: 12, color: MUTED2 }}>
                Creator: <span style={{ color: TEXT }}>{creatorNameMap[detail.creator_id] ?? detail.creator_id.slice(0, 8)}</span>
                {" · "}Total: <span style={{ color: TEXT }}>{fmt(detail.total_amount)}</span>
                {detail.deadline && <>{" · "}Deadline: <span style={{ color: TEXT }}>{fmtDate(detail.deadline)}</span></>}
              </p>
            </div>
            {detail.status === "draft" && (
              <button onClick={() => handleSend(detail.id)} disabled={sending}
                style={{ padding: "10px 22px", borderRadius: 9999, flexShrink: 0, background: ACCENT, border: "none", color: BG, fontSize: 13, fontWeight: 700, cursor: sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1 }}>
                {sending ? "Sending…" : "Send to creator"}
              </button>
            )}
          </div>

          {detailLoading ? (
            <div style={{ padding: "40px 0", textAlign: "center" }}>
              <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT, opacity: 0.4, margin: "0 auto" }} />
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>

              {/* Description */}
              {detail.description && (
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 20px" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, marginBottom: 8 }}>Description</p>
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
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED }}>Milestones</p>
                    {detail.status === "active" && offerorBalance !== null && (
                      <p style={{ fontSize: 11, color: MUTED2 }}>
                        Your balance: <span style={{ color: TEXT, fontWeight: 600 }}>{fmt(offerorBalance)}</span>
                      </p>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {milestones.map(ms => {
                      const msCfg     = MILESTONE_STATUS_CFG[ms.status];
                      const canApprove = detail.status === "active" && ms.status === "submitted";
                      const isApproving = approvingId === ms.id;
                      return (
                        <div key={ms.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 14px", background: canApprove ? "rgba(255,255,255,0.025)" : SURFACE2, borderRadius: 10, border: `1px solid ${canApprove ? "rgba(255,255,255,0.1)" : BORDER}` }}>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 500, color: TEXT }}>{ms.title}</p>
                            {ms.due_date && <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>Due {fmtDate(ms.due_date)}</p>}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: msCfg.color, background: `${msCfg.color}18`, borderRadius: 999, padding: "2px 8px" }}>{msCfg.label}</span>
                            <span style={{ fontSize: 14, fontWeight: 600, color: TEXT }}>{fmt(ms.amount)}</span>
                            {canApprove && (
                              <button
                                onClick={() => handleApprove(ms.id)}
                                disabled={isApproving || !!approvingId}
                                style={{ padding: "5px 14px", borderRadius: 9999, background: GREEN, border: "none", color: "#fff", fontSize: 11, fontWeight: 700, cursor: (isApproving || !!approvingId) ? "not-allowed" : "pointer", opacity: (isApproving || !!approvingId) ? 0.6 : 1, whiteSpace: "nowrap" }}
                              >
                                {isApproving ? "…" : `Approve & pay`}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {approveError && (
                    <div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(200,82,82,0.08)", border: "1px solid rgba(200,82,82,0.25)", borderRadius: 10 }}>
                      <p style={{ fontSize: 12, color: RED }}>{approveError}</p>
                      <a href={`/${locale}/wallet`} style={{ fontSize: 11, color: ACCENT, textDecoration: "none", marginTop: 4, display: "inline-block" }}>
                        Top up wallet →
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* Signatures */}
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "18px 20px" }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>Signatures</p>
                <div style={{ display: "flex", gap: 10 }}>
                  <SigBadge label="You (offeror)" signed={offerorSigned} date={signatures.find(s => s.role === "offeror")?.agreed_at} />
                  <SigBadge label="Creator" signed={creatorSigned} date={signatures.find(s => s.role === "creator")?.agreed_at} />
                </div>
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
      <div style={{ maxWidth: 840, margin: "0 auto", padding: "52px 24px 80px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 28 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 6 }}>Company</p>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: TEXT }}>Contracts</h1>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Link href={`/${locale}`} style={{ fontSize: 12, color: MUTED, textDecoration: "none" }}>← Home</Link>
            <button onClick={() => setView("new")}
              style={{ padding: "9px 18px", borderRadius: 9999, background: ACCENT, border: "none", color: BG, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
              + New contract
            </button>
          </div>
        </div>

        {/* Status filter */}
        <div style={{ display: "flex", gap: 4, padding: 4, background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12, marginBottom: 20, width: "fit-content", flexWrap: "wrap" }}>
          {(["all", "draft", "sent", "active", "completed", "declined"] as const).map(s => {
            const active = statusFilter === s;
            const count  = statusCounts[s] ?? 0;
            return (
              <button key={s} onClick={() => setStatusFilter(s)}
                style={{ padding: "6px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer", border: "none", transition: "all 120ms ease", background: active ? "rgba(255,255,255,0.07)" : "transparent", color: active ? TEXT : MUTED }}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
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
              {contracts.length === 0 ? "No contracts yet. Create your first one." : `No ${statusFilter === "all" ? "" : statusFilter} contracts.`}
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {visible.map(c => {
              const cfg  = STATUS_CFG[c.status];
              const name = creatorNameMap[c.creator_id] ?? c.creator_id.slice(0, 8);
              return (
                <button key={c.id} onClick={() => openDetail(c)}
                  style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "14px 18px", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14, cursor: "pointer", textAlign: "left", transition: "border-color 120ms ease" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = BORDER)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", padding: "3px 10px", borderRadius: 9999, flexShrink: 0, background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color }}>
                      {cfg.label}
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 500, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</p>
                      <p style={{ fontSize: 11, color: MUTED, marginTop: 1 }}>Creator: {name}</p>
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
                    {c.deadline && <span style={{ fontSize: 11, color: MUTED }}>{fmtDate(c.deadline)}</span>}
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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED }}>{label}</label>
      {children}
    </div>
  );
}

function SigBadge({ label, signed, date }: { label: string; signed: boolean; date?: string }) {
  return (
    <div style={{ flex: 1, padding: "12px 14px", background: signed ? "rgba(78,168,122,0.07)" : SURFACE2, border: `1px solid ${signed ? "rgba(78,168,122,0.25)" : BORDER}`, borderRadius: 10 }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: signed ? GREEN : MUTED, marginBottom: 3 }}>
        {signed ? "✓ Signed" : "Awaiting signature"}
      </p>
      <p style={{ fontSize: 12, color: TEXT }}>{label}</p>
      {date && <p style={{ fontSize: 10, color: MUTED, marginTop: 2 }}>{new Date(date).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })}</p>}
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
