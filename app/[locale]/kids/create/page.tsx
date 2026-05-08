"use client";
import { use, useEffect, useState } from "react";
import { createBrowserClient } from "@supabase/ssr";

const LABELS: Record<string, Record<string, string>> = {
  en: {
    title: "Create",
    subtitle: "Share your story with the world!",
    titleLabel: "Title *",
    titlePlaceholder: "Give your story a name",
    typeLabel: "Type *",
    descLabel: "Description",
    descPlaceholder: "Tell us a little about your story...",
    contentLabel: "Your Story",
    contentPlaceholder: "Write your story here...",
    submit: "Submit for Review",
    submitting: "Submitting...",
    success: "Your story was submitted! Your parent or teacher will review it. 🎉",
    noPermission: "You need permission from your parent or teacher to create content.",
    errorTitle: "Please add a title.",
    errorType: "Please choose a type.",
  },
  mn: {
    title: "Бүтээх",
    subtitle: "Өөрийн үлгэрийг дэлхийд хуваалц!",
    titleLabel: "Гарчиг *",
    titlePlaceholder: "Үлгэртээ нэр өг",
    typeLabel: "Төрөл *",
    descLabel: "Тайлбар",
    descPlaceholder: "Үлгэрийнхаа тухай ярь...",
    contentLabel: "Таны үлгэр",
    contentPlaceholder: "Үлгэрээ энд бич...",
    submit: "Хянуулахаар илгээх",
    submitting: "Илгээж байна...",
    success: "Таны үлгэр хянуулахаар илгээгдлээ! 🎉",
    noPermission: "Контент үүсгэхийн тулд эцэг эх эсвэл багшийн зөвшөөрөл хэрэгтэй.",
    errorTitle: "Гарчиг оруулна уу.",
    errorType: "Төрлийг сонгоно уу.",
  },
  ko: {
    title: "만들기",
    subtitle: "내 이야기를 세상과 나눠요!",
    titleLabel: "제목 *",
    titlePlaceholder: "이야기에 이름을 붙여요",
    typeLabel: "종류 *",
    descLabel: "설명",
    descPlaceholder: "이야기에 대해 조금 알려주세요...",
    contentLabel: "내 이야기",
    contentPlaceholder: "이야기를 여기에 써요...",
    submit: "검토 요청하기",
    submitting: "제출 중...",
    success: "이야기가 제출되었어요! 부모님이나 선생님이 검토할 거예요. 🎉",
    noPermission: "콘텐츠를 만들려면 부모님이나 선생님의 허락이 필요해요.",
    errorTitle: "제목을 입력해주세요.",
    errorType: "종류를 선택해주세요.",
  },
  ja: {
    title: "つくる",
    subtitle: "あなたのお話を世界に届けよう！",
    titleLabel: "タイトル *",
    titlePlaceholder: "お話の名前をつけよう",
    typeLabel: "種類 *",
    descLabel: "説明",
    descPlaceholder: "お話について少し教えてね...",
    contentLabel: "あなたのお話",
    contentPlaceholder: "ここにお話を書こう...",
    submit: "レビューに出す",
    submitting: "送信中...",
    success: "お話が送られました！保護者か先生が確認するよ。🎉",
    noPermission: "コンテンツを作るには保護者か先生の許可が必要だよ。",
    errorTitle: "タイトルを入力してね。",
    errorType: "種類を選んでね。",
  },
};

const CONTENT_TYPES = ["webnovel", "manga", "comic", "artbook", "poem", "other"];

export default function KidsCreatePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const t = LABELS[locale] ?? LABELS.en;

  const [canCreate, setCanCreate] = useState<boolean | null>(null);
  const [title, setTitle] = useState("");
  const [contentType, setContentType] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return setCanCreate(false);
      const { data: perms } = await supabase
        .from("kid_permissions")
        .select("can_create_content")
        .eq("kid_user_id", user.id)
        .maybeSingle();
      setCanCreate(perms?.can_create_content ?? false);
    })();
  }, []);

  async function handleSubmit() {
    setError("");
    if (!title.trim()) return setError(t.errorTitle);
    if (!contentType) return setError(t.errorType);
    setSubmitting(true);
    const res = await fetch("/api/kids/content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim(), content_type: contentType, description: description.trim() || null, content: content.trim() || null }),
    });
    setSubmitting(false);
    if (res.ok) {
      setSuccess(true);
      setTitle(""); setContentType(""); setDescription(""); setContent("");
    } else {
      const d = await res.json();
      setError(d.error ?? "Error");
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 16,
    border: "2px solid var(--kids-border, rgba(100,160,220,0.22))",
    background: "var(--kids-panel, rgba(255,255,255,0.82))",
    color: "var(--kids-text, #2a3a52)",
    fontSize: "0.95rem",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--kids-muted, #7a9ab8)",
    marginBottom: 6,
    display: "block",
  };

  if (canCreate === false) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>🔒</div>
        <div style={{ color: "var(--kids-text, #2a3a52)", fontSize: "1rem" }}>{t.noPermission}</div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "40px 20px 24px" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--kids-text, #2a3a52)" }}>{t.title}</div>
        <div style={{ fontSize: "0.9rem", color: "var(--kids-muted, #7a9ab8)", marginTop: 4 }}>{t.subtitle}</div>
      </div>

      {success && (
        <div style={{
          background: "rgba(126,200,164,0.18)",
          border: "2px solid rgba(126,200,164,0.4)",
          borderRadius: 16,
          padding: "16px 20px",
          color: "#3a7a5a",
          marginBottom: 24,
          fontSize: "0.9rem",
          fontWeight: 600,
        }}>
          {t.success}
        </div>
      )}

      {error && (
        <div style={{
          background: "rgba(220,80,80,0.1)",
          border: "2px solid rgba(220,80,80,0.28)",
          borderRadius: 16,
          padding: "12px 16px",
          color: "#aa4444",
          marginBottom: 16,
          fontSize: "0.875rem",
        }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <label style={labelStyle}>{t.titleLabel}</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={t.titlePlaceholder} style={inputStyle} />
        </div>

        <div>
          <label style={labelStyle}>{t.typeLabel}</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CONTENT_TYPES.map(ct => (
              <button
                key={ct}
                onClick={() => setContentType(ct)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 999,
                  border: "2px solid",
                  borderColor: contentType === ct ? "var(--kids-accent, #f7a84a)" : "var(--kids-border, rgba(100,160,220,0.22))",
                  background: contentType === ct ? "var(--kids-accent, #f7a84a)" : "var(--kids-panel, rgba(255,255,255,0.82))",
                  color: contentType === ct ? "#fff" : "var(--kids-text, #2a3a52)",
                  fontWeight: 600,
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  transition: "all 140ms ease",
                }}
              >
                {ct}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label style={labelStyle}>{t.descLabel}</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder={t.descPlaceholder}
            rows={2}
            style={{ ...inputStyle, resize: "none" }}
          />
        </div>

        <div>
          <label style={labelStyle}>{t.contentLabel}</label>
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={t.contentPlaceholder}
            rows={8}
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="btn-kids"
          style={{ fontSize: "1rem", marginTop: 4 }}
        >
          {submitting ? t.submitting : t.submit}
        </button>
      </div>
    </div>
  );
}
