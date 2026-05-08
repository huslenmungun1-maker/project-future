"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

const LABELS: Record<string, Record<string, string>> = {
  en: {
    greeting: "Hello! 👋",
    subtitle: "What do you want to do today?",
    read: "Read a Story",
    readSub: "Discover books & manga",
    create: "Create Something",
    createSub: "Write or draw your own story",
    noKidAccount: "Ask a parent or teacher to set up your Kids account.",
  },
  mn: {
    greeting: "Сайн уу! 👋",
    subtitle: "Өнөөдөр юу хийх вэ?",
    read: "Үлгэр унших",
    readSub: "Ном, манга олдог",
    create: "Бүтээх",
    createSub: "Өөрийн үлгэр бичих эсвэл зурах",
    noKidAccount: "Эцэг эх эсвэл багш таны Kids бүртгэлийг тохируулах хэрэгтэй.",
  },
  ko: {
    greeting: "안녕하세요! 👋",
    subtitle: "오늘은 무엇을 할까요?",
    read: "이야기 읽기",
    readSub: "책과 만화 찾기",
    create: "만들기",
    createSub: "나만의 이야기 쓰거나 그리기",
    noKidAccount: "부모님이나 선생님께 Kids 계정 설정을 부탁하세요.",
  },
  ja: {
    greeting: "こんにちは！ 👋",
    subtitle: "今日は何をする？",
    read: "お話を読む",
    readSub: "本やマンガを探そう",
    create: "つくる",
    createSub: "自分のお話を書いたり描いたり",
    noKidAccount: "保護者か先生にKidsアカウントの設定をお願いしてね。",
  },
};

export default function KidsHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const t = LABELS[locale] ?? LABELS.en;

  const [displayName, setDisplayName] = useState<string | null>(null);
  const [hasKidAccount, setHasKidAccount] = useState<boolean | null>(null);
  const [canCreate, setCanCreate] = useState(false);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, account_type")
        .eq("id", user.id)
        .maybeSingle();

      setDisplayName(profile?.display_name ?? null);
      const isKid = profile?.account_type === "kid";
      setHasKidAccount(isKid);

      if (isKid) {
        const { data: perms } = await supabase
          .from("kid_permissions")
          .select("can_create_content")
          .eq("kid_user_id", user.id)
          .maybeSingle();
        setCanCreate(perms?.can_create_content ?? false);
      }
    })();
  }, []);

  const cardStyle = (accent: string): React.CSSProperties => ({
    background: "var(--kids-panel, rgba(255,255,255,0.85))",
    border: `2.5px solid ${accent}44`,
    borderRadius: 24,
    padding: "28px 24px",
    display: "flex",
    flexDirection: "column",
    gap: 8,
    textDecoration: "none",
    boxShadow: `0 4px 20px ${accent}22`,
    cursor: "pointer",
    transition: "transform 140ms ease, box-shadow 140ms ease",
  });

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "48px 20px 24px" }}>
      {/* Greeting */}
      <div style={{ marginBottom: 36, textAlign: "center" }}>
        <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--kids-text, #2a3a52)", lineHeight: 1.2 }}>
          {t.greeting} {displayName ? displayName : ""}
        </div>
        <div style={{ fontSize: "1rem", color: "var(--kids-muted, #7a9ab8)", marginTop: 6 }}>
          {t.subtitle}
        </div>
      </div>

      {hasKidAccount === false && (
        <div style={{
          background: "rgba(247,168,74,0.12)",
          border: "2px solid rgba(247,168,74,0.35)",
          borderRadius: 16,
          padding: "16px 20px",
          color: "var(--kids-text, #2a3a52)",
          fontSize: "0.9rem",
          marginBottom: 28,
          textAlign: "center",
        }}>
          {t.noKidAccount}
        </div>
      )}

      {/* Action cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Link
          href={`/${locale}/kids/reader`}
          style={cardStyle("#7ec8a4")}
          onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseLeave={e => (e.currentTarget.style.transform = "")}
        >
          <div style={{ fontSize: "2.2rem" }}>📚</div>
          <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--kids-text, #2a3a52)" }}>{t.read}</div>
          <div style={{ fontSize: "0.875rem", color: "var(--kids-muted, #7a9ab8)" }}>{t.readSub}</div>
        </Link>

        {(canCreate || hasKidAccount === null) && (
          <Link
            href={`/${locale}/kids/create`}
            style={cardStyle("#f7a84a")}
            onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
            onMouseLeave={e => (e.currentTarget.style.transform = "")}
          >
            <div style={{ fontSize: "2.2rem" }}>✏️</div>
            <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--kids-text, #2a3a52)" }}>{t.create}</div>
            <div style={{ fontSize: "0.875rem", color: "var(--kids-muted, #7a9ab8)" }}>{t.createSub}</div>
          </Link>
        )}
      </div>
    </div>
  );
}
