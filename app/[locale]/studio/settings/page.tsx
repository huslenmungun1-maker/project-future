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

const MIN_PAYOUT = 10;

type ConnectStatus = {
  connected: boolean;
  payoutsEnabled?: boolean;
  onboardingStatus?: "pending" | "complete";
};

type PayoutRow = {
  id: string;
  amount: number;
  status: "pending" | "processing" | "paid" | "failed";
  stripe_transfer_id: string | null;
  failure_reason: string | null;
  created_at: string;
};

const STATUS_CFG = {
  pending:    { label: "Pending",    color: MUTED2 },
  processing: { label: "Processing", color: "#c8a840" },
  paid:       { label: "Paid",       color: GREEN },
  failed:     { label: "Failed",     color: RED },
} as const;

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function StudioSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";

  const supabase = useMemo(
    () => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!),
    []
  );

  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [balance, setBalance]             = useState<number | null>(null);
  const [payouts, setPayouts]             = useState<PayoutRow[]>([]);
  const [loading, setLoading]             = useState(true);

  const [connectLoading, setConnectLoading] = useState(false);
  const [payoutAmount, setPayoutAmount]     = useState("");
  const [payoutLoading, setPayoutLoading]   = useState(false);
  const [toast, setToast]   = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [statusRes, walletRes, payoutsRes] = await Promise.all([
      fetch("/api/stripe/connect/status"),
      fetch("/api/wallet"),
      fetch("/api/payouts"),
    ]);

    if (statusRes.ok) {
      const j = await statusRes.json();
      setConnectStatus(j);
    }
    if (walletRes.ok) {
      const j = await walletRes.json();
      setBalance(j.wallet?.balance ?? 0);
    }
    if (payoutsRes.ok) {
      const j = await payoutsRes.json();
      setPayouts(j.payouts ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push(`/${locale}/login`);
    });

    async function init() {
      await fetchAll();
      // Detect return from Stripe Connect onboarding
      const params = new URLSearchParams(window.location.search);
      if (params.get("stripe_return") === "1") {
        window.history.replaceState({}, "", window.location.pathname);
        showToast("Checking account status…", true);
      }
    }
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConnect() {
    setConnectLoading(true);
    const origin      = window.location.origin;
    const returnUrl   = `${origin}/${locale}/studio/settings?stripe_return=1`;
    const refreshUrl  = `${origin}/${locale}/studio/settings?stripe_refresh=1`;

    const res  = await fetch("/api/stripe/connect", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ returnUrl, refreshUrl }),
    });
    const json = await res.json();
    setConnectLoading(false);

    if (!res.ok || !json.url) {
      showToast(json.error ?? "Failed to start onboarding", false);
      return;
    }
    window.location.href = json.url;
  }

  async function handlePayout() {
    const amount = Number(payoutAmount);
    if (!amount || amount < MIN_PAYOUT) {
      showToast(`Minimum payout is $${MIN_PAYOUT}`, false);
      return;
    }
    if (balance !== null && amount > balance) {
      showToast("Amount exceeds your balance", false);
      return;
    }

    setPayoutLoading(true);
    const res  = await fetch("/api/payouts", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ amount }),
    });
    const json = await res.json();
    setPayoutLoading(false);

    if (!res.ok || !json.ok) {
      showToast(json.error ?? "Payout failed", false);
      return;
    }

    showToast("Payout initiated successfully", true);
    setPayoutAmount("");
    fetchAll();
  }

  const canPayout = connectStatus?.connected && connectStatus.payoutsEnabled &&
                    balance !== null && balance >= MIN_PAYOUT;

  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT }}>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 28, left: "50%", transform: "translateX(-50%)",
          zIndex: 60, padding: "10px 22px", borderRadius: 9999,
          fontSize: 13, fontWeight: 500, whiteSpace: "nowrap",
          backdropFilter: "blur(12px)",
          background: toast.ok ? "rgba(78,168,122,0.14)" : "rgba(200,82,82,0.14)",
          border: `1px solid ${toast.ok ? "rgba(78,168,122,0.35)" : "rgba(200,82,82,0.3)"}`,
          color: toast.ok ? GREEN : RED,
        }}>
          {toast.msg}
        </div>
      )}

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "52px 24px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 40 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 6 }}>
              Studio
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: TEXT }}>
              Payout Settings
            </h1>
          </div>
          <Link href={`/${locale}/studio`} style={{ fontSize: 12, color: MUTED, textDecoration: "none" }}>
            ← Studio
          </Link>
        </div>

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT, opacity: 0.4, margin: "0 auto" }} />
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Stripe Connect card */}
            <div style={{ background: SURFACE, border: `1px solid ${BORDER2}`, borderRadius: 18, padding: "28px 24px" }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 18 }}>
                Stripe Account
              </p>

              {!connectStatus?.connected ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: TEXT, marginBottom: 4 }}>Not connected</p>
                    <p style={{ fontSize: 12, color: MUTED2, lineHeight: 1.6 }}>
                      Connect a Stripe account to receive payouts from your earnings.
                    </p>
                  </div>
                  <button
                    onClick={handleConnect}
                    disabled={connectLoading}
                    style={{
                      padding: "10px 22px", borderRadius: 9999, flexShrink: 0,
                      background: ACCENT, border: "none", color: "#0a0a0c",
                      fontSize: 13, fontWeight: 700, cursor: connectLoading ? "not-allowed" : "pointer",
                      opacity: connectLoading ? 0.7 : 1,
                    }}
                  >
                    {connectLoading ? "→ Stripe…" : "Connect with Stripe"}
                  </button>
                </div>
              ) : connectStatus.onboardingStatus === "pending" ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#c8a840" }}>Onboarding incomplete</span>
                    </div>
                    <p style={{ fontSize: 12, color: MUTED2, lineHeight: 1.6 }}>
                      Finish setting up your Stripe account to enable payouts.
                    </p>
                  </div>
                  <button
                    onClick={handleConnect}
                    disabled={connectLoading}
                    style={{
                      padding: "10px 22px", borderRadius: 9999, flexShrink: 0,
                      background: "rgba(200,168,64,0.12)", border: "1px solid rgba(200,168,64,0.3)",
                      color: "#c8a840", fontSize: 13, fontWeight: 600,
                      cursor: connectLoading ? "not-allowed" : "pointer",
                      opacity: connectLoading ? 0.7 : 1,
                    }}
                  >
                    {connectLoading ? "→ Stripe…" : "Continue onboarding"}
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: "rgba(78,168,122,0.14)", color: GREEN, fontSize: 13, fontWeight: 700,
                  }}>✓</span>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: GREEN }}>Connected</p>
                    <p style={{ fontSize: 12, color: MUTED2 }}>
                      {connectStatus.payoutsEnabled ? "Payouts enabled" : "Payouts not yet enabled — check your Stripe dashboard"}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Balance + payout request */}
            <div style={{ background: SURFACE, border: `1px solid ${BORDER2}`, borderRadius: 18, padding: "28px 24px" }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 18 }}>
                Earnings
              </p>

              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
                <div>
                  <p style={{ fontSize: 11, color: MUTED, marginBottom: 6 }}>Available balance</p>
                  <p style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.03em", color: TEXT, lineHeight: 1 }}>
                    {balance !== null ? fmt(balance) : "$0.00"}
                  </p>
                </div>
                <Link
                  href={`/${locale}/wallet`}
                  style={{ fontSize: 12, color: MUTED2, textDecoration: "none" }}
                >
                  View transactions →
                </Link>
              </div>

              {canPayout ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={{ fontSize: 11, color: MUTED, marginBottom: 2 }}>
                    Request payout (min ${MIN_PAYOUT})
                  </p>
                  <div style={{ display: "flex", gap: 8 }}>
                    <div style={{ position: "relative", flex: 1 }}>
                      <span style={{
                        position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                        fontSize: 14, color: MUTED2, pointerEvents: "none",
                      }}>$</span>
                      <input
                        type="number"
                        min={MIN_PAYOUT}
                        max={balance ?? undefined}
                        step="0.01"
                        value={payoutAmount}
                        onChange={e => setPayoutAmount(e.target.value)}
                        placeholder={balance !== null ? String(Math.floor(balance * 100) / 100) : "0.00"}
                        style={{
                          width: "100%", padding: "10px 12px 10px 26px",
                          background: SURFACE2, border: `1px solid ${BORDER2}`,
                          borderRadius: 10, color: TEXT, fontSize: 14,
                          outline: "none",
                        }}
                      />
                    </div>
                    <button
                      onClick={handlePayout}
                      disabled={payoutLoading}
                      style={{
                        padding: "10px 22px", borderRadius: 10, flexShrink: 0,
                        background: ACCENT, border: "none", color: "#0a0a0c",
                        fontSize: 13, fontWeight: 700,
                        cursor: payoutLoading ? "not-allowed" : "pointer",
                        opacity: payoutLoading ? 0.7 : 1,
                      }}
                    >
                      {payoutLoading ? "Sending…" : "Request payout"}
                    </button>
                  </div>
                  <button
                    onClick={() => setPayoutAmount(String(Math.floor((balance ?? 0) * 100) / 100))}
                    style={{ fontSize: 11, color: MUTED2, background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 }}
                  >
                    Use full balance ({balance !== null ? fmt(balance) : "—"})
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: 12, color: MUTED2, lineHeight: 1.65 }}>
                  {!connectStatus?.connected
                    ? "Connect your Stripe account above to request payouts."
                    : connectStatus.onboardingStatus !== "complete"
                    ? "Complete Stripe onboarding to enable payouts."
                    : !connectStatus.payoutsEnabled
                    ? "Payouts will be available once Stripe verifies your account."
                    : `Minimum payout amount is $${MIN_PAYOUT}. Keep earning!`}
                </p>
              )}
            </div>

            {/* Payout history */}
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 12 }}>
                Payout History
              </p>

              {payouts.length === 0 ? (
                <div style={{ padding: "36px 24px", textAlign: "center", background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 14 }}>
                  <p style={{ fontSize: 13, color: MUTED }}>No payouts yet.</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {payouts.map(p => {
                    const cfg = STATUS_CFG[p.status];
                    return (
                      <div
                        key={p.id}
                        style={{
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                          gap: 16, padding: "13px 18px",
                          background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 12,
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 700, color: cfg.color,
                              background: `${cfg.color}18`, borderRadius: 999, padding: "2px 8px",
                            }}>
                              {cfg.label}
                            </span>
                          </div>
                          <p style={{ fontSize: 11, color: MUTED }}>{fmtDate(p.created_at)}</p>
                          {p.failure_reason && (
                            <p style={{ fontSize: 11, color: RED, marginTop: 2 }}>{p.failure_reason}</p>
                          )}
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 600, color: TEXT, flexShrink: 0 }}>
                          {fmt(p.amount)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
