"use client";

import { useEffect, useMemo, useState } from "react";
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
const YELLOW  = "#c8a840";

type PayoutStatus = "processing" | "paid" | "failed";

type Payout = {
  id: string;
  amount: number;
  status: PayoutStatus;
  stripe_transfer_id: string | null;
  failure_reason: string | null;
  created_at: string;
};

const STATUS_CFG: Record<PayoutStatus, { label: string; color: string; bg: string; border: string }> = {
  processing: { label: "Processing", color: YELLOW,  bg: "rgba(200,168,64,0.1)",  border: "rgba(200,168,64,0.25)" },
  paid:       { label: "Paid",       color: GREEN,   bg: "rgba(78,168,122,0.1)",  border: "rgba(78,168,122,0.25)" },
  failed:     { label: "Failed",     color: RED,     bg: "rgba(200,82,82,0.1)",   border: "rgba(200,82,82,0.22)"  },
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function StudioPayoutsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";

  const supabase = useMemo(
    () => getBrowserClient(),
    []
  );

  const [payouts, setPayouts]           = useState<Payout[]>([]);
  const [balance, setBalance]           = useState<number | null>(null);
  const [connectEnabled, setConnectEnabled] = useState<boolean | null>(null);
  const [loading, setLoading]           = useState(true);
  const [requesting, setRequesting]     = useState(false);
  const [requestAmount, setRequestAmount] = useState<string>("");
  const [showForm, setShowForm]         = useState(false);
  const [toast, setToast]               = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push(`/${locale}/login`);
    });
  }, [supabase, router, locale]);

  async function fetchAll() {
    setLoading(true);

    const [walletRes, payoutsRes, connectRes] = await Promise.all([
      fetch("/api/wallet"),
      fetch("/api/payouts"),
      supabase
        .from("creator_stripe_accounts")
        .select("payouts_enabled")
        .maybeSingle(),
    ]);

    if (walletRes.ok) {
      const json = await walletRes.json();
      setBalance(json.wallet?.balance ?? null);
    }

    if (payoutsRes.ok) {
      const json = await payoutsRes.json();
      setPayouts(json.payouts ?? []);
    }

    if (!connectRes.error && connectRes.data) {
      setConnectEnabled(connectRes.data.payouts_enabled ?? false);
    } else {
      setConnectEnabled(false);
    }

    setLoading(false);
  }

  useEffect(() => { fetchAll(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRequestPayout() {
    const amount = parseFloat(requestAmount);
    if (!amount || amount < 10) {
      showToast("Minimum payout is $10", false);
      return;
    }
    setRequesting(true);
    const res = await fetch("/api/payouts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount }),
    });
    const json = await res.json();
    setRequesting(false);
    if (!res.ok) {
      showToast(json.error ?? "Payout request failed", false);
      return;
    }
    showToast("Payout initiated! Transfer usually completes within 2 business days.", true);
    setShowForm(false);
    setRequestAmount("");
    fetchAll();
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 4000);
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          zIndex: 60, padding: "10px 22px", borderRadius: 9999, fontSize: 13,
          fontWeight: 500, whiteSpace: "nowrap",
          background: toast.ok ? "rgba(78,168,122,0.14)" : "rgba(200,82,82,0.14)",
          border: `1px solid ${toast.ok ? "rgba(78,168,122,0.35)" : "rgba(200,82,82,0.3)"}`,
          color: toast.ok ? GREEN : RED,
          backdropFilter: "blur(12px)",
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "52px 24px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 40 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 6 }}>
              Studio
            </p>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: TEXT }}>
              Payouts
            </h1>
          </div>
          <Link
            href={`/${locale}/studio`}
            style={{ fontSize: 12, color: MUTED2, textDecoration: "none" }}
          >
            ← Studio
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT, opacity: 0.4, margin: "0 auto" }} />
          </div>
        ) : (
          <>
            {/* Balance + Connect status */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24,
            }}>
              <div style={{
                background: "linear-gradient(145deg, #141418, #1a1a22)",
                border: `1px solid ${BORDER2}`, borderRadius: 20, padding: "24px 22px",
              }}>
                <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 8 }}>
                  Available balance
                </p>
                <p style={{ fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", color: TEXT, lineHeight: 1 }}>
                  {balance !== null ? fmt(balance) : "—"}
                </p>
              </div>

              <div style={{
                background: SURFACE, border: `1px solid ${BORDER2}`, borderRadius: 20, padding: "24px 22px",
                display: "flex", flexDirection: "column", justifyContent: "space-between",
              }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 8 }}>
                    Stripe Connect
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: connectEnabled ? GREEN : connectEnabled === false ? RED : MUTED,
                    }} />
                    <span style={{ fontSize: 13, color: connectEnabled ? GREEN : RED }}>
                      {connectEnabled === null ? "Checking…" : connectEnabled ? "Active" : "Not connected"}
                    </span>
                  </div>
                </div>
                {!connectEnabled && (
                  <p style={{ fontSize: 11, color: MUTED2, marginTop: 8 }}>
                    Complete Stripe onboarding to receive payouts.
                  </p>
                )}
              </div>
            </div>

            {/* Request payout */}
            <div style={{
              background: SURFACE, border: `1px solid ${BORDER2}`, borderRadius: 20,
              padding: "24px 22px", marginBottom: 24,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>Request a payout</p>
                  <p style={{ fontSize: 11, color: MUTED2, marginTop: 3 }}>
                    Minimum $10 · Requires active Stripe Connect account
                  </p>
                </div>
                <button
                  onClick={() => setShowForm(v => !v)}
                  disabled={!connectEnabled}
                  style={{
                    padding: "9px 20px", borderRadius: 9999, fontSize: 12, fontWeight: 600,
                    background: connectEnabled ? ACCENT : SURFACE2,
                    border: `1px solid ${connectEnabled ? "transparent" : BORDER2}`,
                    color: connectEnabled ? "#0a0a0c" : MUTED,
                    cursor: connectEnabled ? "pointer" : "not-allowed",
                    flexShrink: 0, transition: "opacity 120ms ease",
                  }}
                >
                  {showForm ? "Cancel" : "Request payout"}
                </button>
              </div>

              {showForm && (
                <div style={{ marginTop: 20, display: "flex", gap: 10 }}>
                  <div style={{ flex: 1, position: "relative" }}>
                    <span style={{
                      position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                      fontSize: 13, color: MUTED2, pointerEvents: "none",
                    }}>$</span>
                    <input
                      type="number"
                      min="10"
                      step="0.01"
                      value={requestAmount}
                      onChange={e => setRequestAmount(e.target.value)}
                      placeholder="0.00"
                      style={{
                        width: "100%", padding: "11px 14px 11px 28px",
                        background: SURFACE2, border: `1px solid ${BORDER2}`,
                        borderRadius: 12, color: TEXT, fontSize: 14,
                        outline: "none", boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <button
                    onClick={handleRequestPayout}
                    disabled={requesting || !requestAmount}
                    style={{
                      padding: "11px 24px", borderRadius: 12, fontSize: 13, fontWeight: 700,
                      background: ACCENT, border: "none", color: "#0a0a0c",
                      cursor: requesting ? "not-allowed" : "pointer",
                      opacity: requesting || !requestAmount ? 0.6 : 1,
                      flexShrink: 0,
                    }}
                  >
                    {requesting ? "Sending…" : "Confirm"}
                  </button>
                </div>
              )}
            </div>

            {/* Payout history */}
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 14 }}>
                Payout history
              </p>

              {payouts.length === 0 ? (
                <div style={{
                  padding: "40px 24px", textAlign: "center",
                  background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16,
                }}>
                  <p style={{ fontSize: 13, color: MUTED }}>No payouts yet.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {payouts.map((p) => {
                    const cfg = STATUS_CFG[p.status] ?? STATUS_CFG.processing;
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          gap: 16, padding: "14px 18px",
                          background: SURFACE, border: `1px solid ${BORDER}`,
                          borderRadius: 12,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 600, color: TEXT }}>
                            {fmt(p.amount)}
                          </p>
                          <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                            {fmtDate(p.created_at)}
                            {p.stripe_transfer_id && (
                              <span style={{ marginLeft: 8, color: MUTED2 }}>
                                · {p.stripe_transfer_id.slice(0, 16)}…
                              </span>
                            )}
                          </p>
                          {p.failure_reason && (
                            <p style={{ fontSize: 11, color: RED, marginTop: 4 }}>
                              {p.failure_reason}
                            </p>
                          )}
                        </div>
                        <span style={{
                          fontSize: 11, fontWeight: 600, padding: "3px 10px",
                          borderRadius: 9999, flexShrink: 0,
                          color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}`,
                        }}>
                          {cfg.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
