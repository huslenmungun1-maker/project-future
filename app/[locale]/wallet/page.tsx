"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@supabase/ssr";

const BG       = "#08080a";
const SURFACE  = "#0f0f14";
const SURFACE2 = "#16161d";
const BORDER   = "rgba(255,255,255,0.06)";
const BORDER2  = "rgba(255,255,255,0.10)";
const TEXT     = "#eceae4";
const MUTED    = "#52525e";
const MUTED2   = "#7a7a8a";
const ACCENT   = "#b6a07c";
const GREEN    = "#4ea87a";
const RED      = "#c85252";

const TOPUP_AMOUNTS = [5, 10, 20, 50];

type TxType = "credit" | "debit";

type Transaction = {
  id: string;
  type: TxType;
  amount: number;
  description: string;
  status: string;
  created_at: string;
};

type Wallet = {
  id: string;
  balance: number;
  currency: string;
  created_at: string;
};

const UI = {
  en: {
    title: "Wallet",
    subtitle: "Balance & transactions",
    balance: "Available balance",
    topup: "Add funds",
    topupTitle: "Add Funds",
    topupDesc: "Select an amount to add to your wallet.",
    confirm: "Add",
    cancel: "Cancel",
    txHistory: "Transaction history",
    empty: "No transactions yet.",
    credit: "Credit",
    debit: "Debit",
    loading: "Loading…",
    adding: "Adding…",
    added: "Funds added.",
    error: "Something went wrong.",
    back: "Back",
  },
  mn: {
    title: "Хэтэвч",
    subtitle: "Үлдэгдэл & гүйлгээ",
    balance: "Боломжит үлдэгдэл",
    topup: "Мөнгө нэмэх",
    topupTitle: "Мөнгө нэмэх",
    topupDesc: "Нэмэх дүнгээ сонгоно уу.",
    confirm: "Нэмэх",
    cancel: "Цуцлах",
    txHistory: "Гүйлгээний түүх",
    empty: "Одоогоор гүйлгээ байхгүй.",
    credit: "Орлого",
    debit: "Зарлага",
    loading: "Ачаалж байна…",
    adding: "Нэмж байна…",
    added: "Мөнгө нэмэгдлээ.",
    error: "Алдаа гарлаа.",
    back: "Буцах",
  },
  ko: {
    title: "지갑",
    subtitle: "잔액 및 거래 내역",
    balance: "사용 가능한 잔액",
    topup: "충전",
    topupTitle: "충전",
    topupDesc: "충전할 금액을 선택하세요.",
    confirm: "충전",
    cancel: "취소",
    txHistory: "거래 내역",
    empty: "거래 내역이 없습니다.",
    credit: "입금",
    debit: "출금",
    loading: "불러오는 중…",
    adding: "처리 중…",
    added: "충전 완료.",
    error: "오류가 발생했습니다.",
    back: "뒤로",
  },
  ja: {
    title: "ウォレット",
    subtitle: "残高 & 取引履歴",
    balance: "利用可能残高",
    topup: "チャージ",
    topupTitle: "チャージ",
    topupDesc: "チャージ金額を選択してください。",
    confirm: "チャージ",
    cancel: "キャンセル",
    txHistory: "取引履歴",
    empty: "取引がありません。",
    credit: "入金",
    debit: "出金",
    loading: "読み込み中…",
    adding: "処理中…",
    added: "チャージ完了。",
    error: "エラーが発生しました。",
    back: "戻る",
  },
} as const;

type Locale = keyof typeof UI;

function safeLocale(raw: unknown): Locale {
  return (["en", "mn", "ko", "ja"].includes(raw as string) ? raw : "en") as Locale;
}

function fmt(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function WalletPage() {
  const params = useParams();
  const router = useRouter();
  const locale = safeLocale(params?.locale);
  const t = UI[locale];

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTopup, setShowTopup] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number>(10);
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) router.push(`/${locale}/login`);
    });
  }, [supabase, router, locale]);

  async function fetchWallet() {
    setLoading(true);
    const res = await fetch("/api/wallet");
    if (res.ok) {
      const json = await res.json();
      setWallet(json.wallet);
      setTransactions(json.transactions);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchWallet();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleTopup() {
    setAdding(true);
    const res = await fetch("/api/wallet/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: selectedAmount }),
    });
    const json = await res.json();
    setAdding(false);
    setShowTopup(false);
    if (json.ok) {
      showToast(t.added, true);
      fetchWallet();
    } else {
      showToast(json.error ?? t.error, false);
    }
  }

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3200);
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT }}>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 60,
            padding: "10px 22px",
            borderRadius: 9999,
            fontSize: 13,
            fontWeight: 500,
            background: toast.ok ? "rgba(78,168,122,0.14)" : "rgba(200,82,82,0.14)",
            border: `1px solid ${toast.ok ? "rgba(78,168,122,0.35)" : "rgba(200,82,82,0.3)"}`,
            color: toast.ok ? GREEN : RED,
            backdropFilter: "blur(12px)",
            whiteSpace: "nowrap",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Top-up modal */}
      {showTopup && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.7)",
            backdropFilter: "blur(8px)",
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowTopup(false); }}
        >
          <div
            style={{
              background: SURFACE,
              border: `1px solid ${BORDER2}`,
              borderRadius: 20,
              padding: "32px 28px",
              width: "100%",
              maxWidth: 360,
              display: "flex",
              flexDirection: "column",
              gap: 24,
            }}
          >
            <div>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED2, marginBottom: 6 }}>
                {t.topupTitle}
              </p>
              <p style={{ fontSize: 13, color: MUTED2 }}>{t.topupDesc}</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {TOPUP_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => setSelectedAmount(amt)}
                  style={{
                    padding: "14px 0",
                    borderRadius: 12,
                    border: `1px solid ${selectedAmount === amt ? ACCENT : BORDER2}`,
                    background: selectedAmount === amt ? "rgba(182,160,124,0.1)" : SURFACE2,
                    color: selectedAmount === amt ? ACCENT : TEXT,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 120ms ease",
                  }}
                >
                  ${amt}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setShowTopup(false)}
                style={{
                  flex: 1,
                  padding: "11px 0",
                  borderRadius: 9999,
                  background: "transparent",
                  border: `1px solid ${BORDER2}`,
                  color: MUTED2,
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {t.cancel}
              </button>
              <button
                onClick={handleTopup}
                disabled={adding}
                style={{
                  flex: 2,
                  padding: "11px 0",
                  borderRadius: 9999,
                  background: ACCENT,
                  border: "none",
                  color: "#0a0a0c",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: adding ? "not-allowed" : "pointer",
                  opacity: adding ? 0.7 : 1,
                  transition: "opacity 120ms ease",
                }}
              >
                {adding ? t.adding : `${t.confirm} $${selectedAmount}`}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "52px 24px 80px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 40 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 6 }}>
              {t.subtitle}
            </p>
            <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em", color: TEXT }}>
              {t.title}
            </h1>
          </div>
          <button
            onClick={() => router.back()}
            style={{ fontSize: 12, color: MUTED, background: "none", border: "none", cursor: "pointer" }}
          >
            {t.back}
          </button>
        </div>

        {loading ? (
          <div style={{ padding: "60px 0", textAlign: "center" }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: ACCENT, opacity: 0.4, margin: "0 auto" }} />
          </div>
        ) : (
          <>
            {/* Balance card */}
            <div
              style={{
                background: "linear-gradient(145deg, #141418, #1a1a22)",
                border: `1px solid ${BORDER2}`,
                borderRadius: 20,
                padding: "32px 28px",
                marginBottom: 12,
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
                gap: 16,
              }}
            >
              <div>
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 10 }}>
                  {t.balance}
                </p>
                <p style={{ fontSize: 40, fontWeight: 700, letterSpacing: "-0.03em", color: TEXT, lineHeight: 1 }}>
                  {wallet ? fmt(wallet.balance, wallet.currency) : "$0.00"}
                </p>
                {wallet && (
                  <p style={{ fontSize: 11, color: MUTED, marginTop: 8 }}>
                    {wallet.currency}
                  </p>
                )}
              </div>

              <button
                onClick={() => setShowTopup(true)}
                style={{
                  padding: "11px 22px",
                  borderRadius: 9999,
                  background: ACCENT,
                  border: "none",
                  color: "#0a0a0c",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.02em",
                  cursor: "pointer",
                  flexShrink: 0,
                  transition: "opacity 120ms ease",
                }}
              >
                {t.topup}
              </button>
            </div>

            {/* Transaction history */}
            <div style={{ marginTop: 32 }}>
              <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 14 }}>
                {t.txHistory}
              </p>

              {transactions.length === 0 ? (
                <div
                  style={{
                    padding: "40px 24px",
                    textAlign: "center",
                    background: SURFACE,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 16,
                  }}
                >
                  <p style={{ fontSize: 13, color: MUTED }}>{t.empty}</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {transactions.map((tx) => (
                    <div
                      key={tx.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: 16,
                        padding: "14px 18px",
                        background: SURFACE,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 12,
                        transition: "border-color 120ms ease",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                        <span
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                            fontSize: 11,
                            background: tx.type === "credit" ? "rgba(78,168,122,0.12)" : "rgba(200,82,82,0.12)",
                            color: tx.type === "credit" ? GREEN : RED,
                          }}
                        >
                          {tx.type === "credit" ? "+" : "−"}
                        </span>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 500, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {tx.description}
                          </p>
                          <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                            {fmtDate(tx.created_at)}
                          </p>
                        </div>
                      </div>

                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          flexShrink: 0,
                          color: tx.type === "credit" ? GREEN : RED,
                          letterSpacing: "-0.01em",
                        }}
                      >
                        {tx.type === "credit" ? "+" : "−"}
                        {fmt(tx.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
