"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";

function KidAvatarIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function FlagIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M4 4h12l-2 5 2 5H4V4z" />
      <rect x="3" y="4" width="2" height="17" rx="1" />
    </svg>
  );
}

function CheckIcon({ size = 13 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DotIcon({ size = 10 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 10 10">
      <circle cx="5" cy="5" r="4" fill="currentColor" />
    </svg>
  );
}

const LABELS: Record<string, Record<string, string>> = {
  en: {
    back: "← Back",
    loading: "Loading...",
    tabActivity: "Activity",
    tabContent: "Content",
    tabChat: "Chat",
    tabFlags: "Flags",
    tabPerms: "Settings",
    readHistory: "Recent Reading",
    noActivity: "No activity yet.",
    noContent: "No content yet.",
    noChat: "No chat messages yet.",
    noFlags: "No flags.",
    pending: "pending",
    approved: "approved",
    rejected: "rejected",
    approve: "Approve",
    reject: "Reject",
    aiEnabled: "AI Assistant",
    canCreate: "Can Create Content",
    ageRestrictions: "Age Restrictions Lifted",
    bothRequired: "(Both parent & teacher must approve)",
    parentOnly: "(Parent only)",
    saving: "Saving...",
    saved: "Saved!",
  },
  mn: {
    back: "← Буцах",
    loading: "Ачааллаж байна...",
    tabActivity: "Идэвх",
    tabContent: "Контент",
    tabChat: "Чат",
    tabFlags: "Тэмдэглэл",
    tabPerms: "Тохиргоо",
    readHistory: "Сүүлийн уншилт",
    noActivity: "Идэвх байхгүй.",
    noContent: "Контент байхгүй.",
    noChat: "Чат мессеж байхгүй.",
    noFlags: "Тэмдэглэл байхгүй.",
    pending: "хүлээгдэж байгаа",
    approved: "зөвшөөрсөн",
    rejected: "татгалзсан",
    approve: "Зөвшөөрөх",
    reject: "Татгалзах",
    aiEnabled: "AI Туслагч",
    canCreate: "Контент Бүтээх",
    ageRestrictions: "Насны хязгаар арилгасан",
    bothRequired: "(Эцэг эх ба багш хоёулаа зөвшөөрөх ёстой)",
    parentOnly: "(Зөвхөн эцэг эх)",
    saving: "Хадгалж байна...",
    saved: "Хадгалагдлаа!",
  },
  ko: {
    back: "← 뒤로",
    loading: "로딩 중...",
    tabActivity: "활동",
    tabContent: "콘텐츠",
    tabChat: "채팅",
    tabFlags: "플래그",
    tabPerms: "설정",
    readHistory: "최근 읽기",
    noActivity: "활동 없음.",
    noContent: "콘텐츠 없음.",
    noChat: "채팅 메시지 없음.",
    noFlags: "플래그 없음.",
    pending: "대기 중",
    approved: "승인됨",
    rejected: "거부됨",
    approve: "승인",
    reject: "거부",
    aiEnabled: "AI 도우미",
    canCreate: "콘텐츠 만들기",
    ageRestrictions: "연령 제한 해제",
    bothRequired: "(부모와 교사 모두 승인 필요)",
    parentOnly: "(부모만)",
    saving: "저장 중...",
    saved: "저장됨!",
  },
  ja: {
    back: "← 戻る",
    loading: "読み込み中...",
    tabActivity: "活動",
    tabContent: "コンテンツ",
    tabChat: "チャット",
    tabFlags: "フラグ",
    tabPerms: "設定",
    readHistory: "最近の読書",
    noActivity: "活動なし。",
    noContent: "コンテンツなし。",
    noChat: "チャットメッセージなし。",
    noFlags: "フラグなし。",
    pending: "審査中",
    approved: "承認済み",
    rejected: "拒否済み",
    approve: "承認",
    reject: "拒否",
    aiEnabled: "AIアシスタント",
    canCreate: "コンテンツ作成",
    ageRestrictions: "年齢制限解除",
    bothRequired: "(保護者と先生の両方の承認が必要)",
    parentOnly: "(保護者のみ)",
    saving: "保存中...",
    saved: "保存しました！",
  },
};

type Tab = "activity" | "content" | "chat" | "flags" | "perms";

interface DashData {
  profile: { display_name: string; age: number; account_type: string } | null;
  readHistory: { id: string; content_title: string; content_type: string; read_at: string }[];
  chatMessages: { id: string; sender_id: string; message: string; is_flagged: boolean; created_at: string }[];
  contentSubmissions: { id: string; title: string; content_type: string; status: string; created_at: string }[];
  flags: { id: string; message: string; resolved: boolean; created_at: string }[];
  permissions: Record<string, unknown> | null;
  isParent: boolean;
  isTeacher: boolean;
}

export default function KidsDashboardPage({ params }: { params: Promise<{ locale: string; kidId: string }> }) {
  const { locale, kidId } = use(params);
  const t = LABELS[locale] ?? LABELS.en;

  const [data, setData] = useState<DashData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("activity");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  useEffect(() => {
    fetch(`/api/kids/dashboard/${kidId}`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); });
  }, [kidId]);

  async function handleContentAction(submissionId: string, action: "approve" | "reject") {
    await fetch("/api/kids/content", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ submission_id: submissionId, action }),
    });
    const res = await fetch(`/api/kids/dashboard/${kidId}`);
    setData(await res.json());
  }

  async function togglePerm(field: string, value: boolean) {
    setSaving(true);
    await fetch("/api/kids/permissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kid_user_id: kidId, field, value }),
    });
    const res = await fetch(`/api/kids/dashboard/${kidId}`);
    setData(await res.json());
    setSaving(false);
    setSavedMsg(t.saved);
    setTimeout(() => setSavedMsg(""), 2000);
  }

  const panelStyle: React.CSSProperties = {
    background: "var(--kids-panel, rgba(255,255,255,0.85))",
    border: "2px solid var(--kids-border, rgba(100,160,220,0.18))",
    borderRadius: 20,
    padding: "18px 20px",
    marginBottom: 16,
  };

  const statusColor: Record<string, string> = { pending: "#f7a84a", approved: "#7ec8a4", rejected: "#e07070" };

  if (loading) return <div style={{ textAlign: "center", padding: 60, color: "var(--kids-muted, #7a9ab8)" }}>{t.loading}</div>;
  if (!data) return null;

  const tabs: { key: Tab; label: string }[] = [
    { key: "activity", label: t.tabActivity },
    { key: "content", label: t.tabContent },
    { key: "chat", label: t.tabChat },
    { key: "flags", label: t.tabFlags },
    { key: "perms", label: t.tabPerms },
  ];

  const perms = (data.permissions ?? {}) as Record<string, unknown>;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 20px 24px" }}>
      <Link href={`/${locale}/profile`} style={{ color: "var(--kids-muted, #7a9ab8)", fontSize: "0.875rem", textDecoration: "none", marginBottom: 20, display: "inline-block" }}>
        {t.back}
      </Link>

      {/* Kid header */}
      <div style={{ ...panelStyle, display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%",
          background: "linear-gradient(135deg, #b8dff8, #c9a0e0)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "rgba(255,255,255,0.9)",
        }}>
          <KidAvatarIcon />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: "1.15rem", color: "var(--kids-text, #2a3a52)" }}>
            {data.profile?.display_name ?? kidId}
          </div>
          <div style={{ fontSize: "0.8rem", color: "var(--kids-muted, #7a9ab8)" }}>
            Age {data.profile?.age ?? "—"} · {data.isParent ? "Parent view" : "Teacher view"}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {tabs.map(tb => (
          <button
            key={tb.key}
            onClick={() => setTab(tb.key)}
            style={{
              padding: "8px 16px",
              borderRadius: 999,
              border: "2px solid",
              borderColor: tab === tb.key ? "var(--kids-accent, #f7a84a)" : "var(--kids-border, rgba(100,160,220,0.22))",
              background: tab === tb.key ? "var(--kids-accent, #f7a84a)" : "transparent",
              color: tab === tb.key ? "#fff" : "var(--kids-muted, #7a9ab8)",
              fontWeight: 600,
              fontSize: "0.8rem",
              cursor: "pointer",
              transition: "all 140ms ease",
            }}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Activity tab */}
      {tab === "activity" && (
        <div>
          <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--kids-muted, #7a9ab8)", marginBottom: 12 }}>{t.readHistory}</div>
          {data.readHistory.length === 0 ? (
            <div style={{ ...panelStyle, color: "var(--kids-muted, #7a9ab8)", fontSize: "0.875rem" }}>{t.noActivity}</div>
          ) : data.readHistory.map(h => (
            <div key={h.id} style={{ ...panelStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: "0.9rem", color: "var(--kids-text, #2a3a52)" }}>{h.content_title}</div>
                <div style={{ fontSize: "0.75rem", color: "var(--kids-muted, #7a9ab8)" }}>{h.content_type}</div>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--kids-muted, #7a9ab8)" }}>
                {new Date(h.read_at).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Content tab */}
      {tab === "content" && (
        <div>
          {data.contentSubmissions.length === 0 ? (
            <div style={{ ...panelStyle, color: "var(--kids-muted, #7a9ab8)", fontSize: "0.875rem" }}>{t.noContent}</div>
          ) : data.contentSubmissions.map(s => (
            <div key={s.id} style={{ ...panelStyle }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--kids-text, #2a3a52)" }}>{s.title}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--kids-muted, #7a9ab8)", marginTop: 2 }}>{s.content_type}</div>
                </div>
                <span style={{
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  color: statusColor[s.status] ?? "#999",
                  background: `${statusColor[s.status] ?? "#999"}18`,
                  borderRadius: 999,
                  padding: "3px 10px",
                }}>
                  {(t as Record<string, string>)[s.status] ?? s.status}
                </span>
              </div>
              {s.status === "pending" && (
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleContentAction(s.id, "approve")}
                    style={{ padding: "6px 16px", borderRadius: 999, background: "#7ec8a4", border: "none", color: "#fff", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
                  >
                    {t.approve}
                  </button>
                  <button
                    onClick={() => handleContentAction(s.id, "reject")}
                    style={{ padding: "6px 16px", borderRadius: 999, background: "#e07070", border: "none", color: "#fff", fontWeight: 700, fontSize: "0.8rem", cursor: "pointer" }}
                  >
                    {t.reject}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Chat tab */}
      {tab === "chat" && (
        <div>
          {data.chatMessages.length === 0 ? (
            <div style={{ ...panelStyle, color: "var(--kids-muted, #7a9ab8)", fontSize: "0.875rem" }}>{t.noChat}</div>
          ) : data.chatMessages.map(m => (
            <div key={m.id} style={{
              ...panelStyle,
              borderColor: m.is_flagged ? "rgba(220,80,80,0.35)" : undefined,
              background: m.is_flagged ? "rgba(220,80,80,0.06)" : undefined,
            }}>
              <div style={{ fontSize: "0.875rem", color: "var(--kids-text, #2a3a52)", wordBreak: "break-word" }}>{m.message}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <div style={{ fontSize: "0.7rem", color: "var(--kids-muted, #7a9ab8)" }}>
                  {m.sender_id === kidId ? "Kid" : "Other"}
                </div>
                {m.is_flagged && (
                  <span style={{ fontSize: "0.7rem", fontWeight: 700, color: "#e07070", display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <FlagIcon size={11} /> Flagged
                  </span>
                )}
                <div style={{ fontSize: "0.7rem", color: "var(--kids-muted, #7a9ab8)" }}>
                  {new Date(m.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Flags tab */}
      {tab === "flags" && (
        <div>
          {data.flags.length === 0 ? (
            <div style={{ ...panelStyle, color: "var(--kids-muted, #7a9ab8)", fontSize: "0.875rem" }}>{t.noFlags}</div>
          ) : data.flags.map(f => (
            <div key={f.id} style={{
              ...panelStyle,
              borderColor: f.resolved ? undefined : "rgba(220,80,80,0.3)",
            }}>
              <div style={{ fontSize: "0.875rem", color: "var(--kids-text, #2a3a52)" }}>{f.message}</div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 600, color: f.resolved ? "#7ec8a4" : "#e07070", display: "inline-flex", alignItems: "center", gap: 3 }}>
                  {f.resolved ? <><CheckIcon /> Resolved</> : <><DotIcon /> Open</>}
                </span>
                <div style={{ fontSize: "0.7rem", color: "var(--kids-muted, #7a9ab8)" }}>
                  {new Date(f.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Permissions tab */}
      {tab === "perms" && (
        <div>
          {savedMsg && (
            <div style={{ padding: "10px 16px", borderRadius: 12, background: "rgba(126,200,164,0.18)", color: "#3a7a5a", fontWeight: 600, fontSize: "0.875rem", marginBottom: 16 }}>
              {savedMsg}
            </div>
          )}

          {[
            { field: "ai_enabled", label: t.aiEnabled, note: t.bothRequired, parentOnly: false },
            { field: "can_create_content", label: t.canCreate, note: t.parentOnly, parentOnly: true },
            { field: "age_restrictions_lifted", label: t.ageRestrictions, note: t.parentOnly, parentOnly: true },
          ].map(item => {
            if (item.parentOnly && !data.isParent) return null;
            const val = !!(perms[item.field]);
            return (
              <div key={item.field} style={{ ...panelStyle, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--kids-text, #2a3a52)" }}>{item.label}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--kids-muted, #7a9ab8)", marginTop: 2 }}>{item.note}</div>
                </div>
                <button
                  disabled={saving}
                  onClick={() => togglePerm(item.field, !val)}
                  style={{
                    width: 52,
                    height: 28,
                    borderRadius: 999,
                    background: val ? "#7ec8a4" : "rgba(100,160,220,0.18)",
                    border: "none",
                    cursor: saving ? "not-allowed" : "pointer",
                    position: "relative",
                    transition: "background 200ms ease",
                    flexShrink: 0,
                  }}
                >
                  <span style={{
                    position: "absolute",
                    top: 4,
                    left: val ? 28 : 4,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 200ms ease",
                    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                  }} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
