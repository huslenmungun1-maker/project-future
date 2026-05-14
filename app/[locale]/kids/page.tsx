"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

function BookIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="12" y1="6" x2="16" y2="6" />
      <line x1="12" y1="10" x2="16" y2="10" />
    </svg>
  );
}

function PencilIcon({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L18.5 9.5a2.121 2.121 0 0 0-3-3L4 16v4" />
      <line x1="13.5" y1="6.5" x2="17.5" y2="10.5" />
    </svg>
  );
}

const LABELS: Record<string, Record<string, string>> = {
  en: {
    greeting: "Hello!",
    subtitle: "What do you want to do today?",
    read: "Read a Story",
    readSub: "Discover books & manga",
    create: "Create Something",
    createSub: "Write or draw your own story",
    noKidAccount: "Ask a parent or teacher to set up your Kids account.",
    scrollHint: "Scroll up to explore space",
    spaceTitle: "You're in Space!",
    spaceSub: "The universe is full of stories waiting for you.",
    spaceRead: "Space Stories",
    spaceReadSub: "Read adventures from across the galaxy",
    spaceCreate: "Write a Space Story",
    spaceCreateSub: "Create your own universe",
  },
  mn: {
    greeting: "Сайн уу!",
    subtitle: "Өнөөдөр юу хийх вэ?",
    read: "Үлгэр унших",
    readSub: "Ном, манга олдог",
    create: "Бүтээх",
    createSub: "Өөрийн үлгэр бичих эсвэл зурах",
    noKidAccount: "Эцэг эх эсвэл багш таны Kids бүртгэлийг тохируулах хэрэгтэй.",
    scrollHint: "Сансрыг судлахаар доош гүйл",
    spaceTitle: "Та сансарт байна!",
    spaceSub: "Орчлон ертөнц танг хүлээж буй үлгэрүүдээр дүүрэн.",
    spaceRead: "Сансрын үлгэрүүд",
    spaceReadSub: "Галактик даяар адал явдал уншаарай",
    spaceCreate: "Сансрын үлгэр бич",
    spaceCreateSub: "Өөрийн орчлон ертөнцийг бүтээ",
  },
  ko: {
    greeting: "안녕하세요!",
    subtitle: "오늘은 무엇을 할까요?",
    read: "이야기 읽기",
    readSub: "책과 만화 찾기",
    create: "만들기",
    createSub: "나만의 이야기 쓰거나 그리기",
    noKidAccount: "부모님이나 선생님께 Kids 계정 설정을 부탁하세요.",
    scrollHint: "스크롤해서 우주 탐험하기",
    spaceTitle: "우주에 왔어요!",
    spaceSub: "우주는 당신을 기다리는 이야기로 가득해요.",
    spaceRead: "우주 이야기",
    spaceReadSub: "은하 너머의 모험을 읽어요",
    spaceCreate: "우주 이야기 쓰기",
    spaceCreateSub: "나만의 우주를 만들어요",
  },
  ja: {
    greeting: "こんにちは！",
    subtitle: "今日は何をする？",
    read: "お話を読む",
    readSub: "本やマンガを探そう",
    create: "つくる",
    createSub: "自分のお話を書いたり描いたり",
    noKidAccount: "保護者か先生にKidsアカウントの設定をお願いしてね。",
    scrollHint: "スクロールして宇宙を探検",
    spaceTitle: "宇宙にいるよ！",
    spaceSub: "宇宙はあなたを待つ物語でいっぱい。",
    spaceRead: "宇宙のお話",
    spaceReadSub: "銀河の向こうの冒険を読もう",
    spaceCreate: "宇宙のお話をつくる",
    spaceCreateSub: "自分だけの宇宙をつくろう",
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
        .eq("user_id", user.id)
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
    <>
      {/* ── Page 2 (very top) ── */}
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: "2rem", fontWeight: 800, color: "#e0d0ff", opacity: 0.5 }}>Page 2</div>
      </div>

      {/* ── Section 1: Space (top) — scroll UP to reach ── */}
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 480, width: "100%", padding: "48px 20px 120px" }}>
          {/* Space heading */}
          <div style={{ marginBottom: 36, textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "#e0d0ff", lineHeight: 1.2 }}>
              {t.spaceTitle}
            </div>
            <div style={{ fontSize: "1rem", color: "#a090d0", marginTop: 6 }}>
              {t.spaceSub}
            </div>
          </div>

          {/* Space cards */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <Link
              href={`/${locale}/kids/reader`}
              style={{
                background: "rgba(80,20,140,0.55)",
                border: "2.5px solid rgba(180,140,255,0.35)",
                borderRadius: 24,
                padding: "28px 24px",
                display: "flex", flexDirection: "column", gap: 8,
                textDecoration: "none",
                boxShadow: "0 4px 28px rgba(120,60,220,0.25)",
                backdropFilter: "blur(12px)",
                transition: "transform 140ms ease, box-shadow 140ms ease",
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "")}
            >
              <div style={{ fontSize: 32 }}>🚀</div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#e0d0ff" }}>{t.spaceRead}</div>
              <div style={{ fontSize: "0.875rem", color: "#a090d0" }}>{t.spaceReadSub}</div>
            </Link>

            {(canCreate || hasKidAccount === null) && (
              <Link
                href={`/${locale}/kids/create`}
                style={{
                  background: "rgba(20,60,120,0.55)",
                  border: "2.5px solid rgba(100,180,255,0.30)",
                  borderRadius: 24,
                  padding: "28px 24px",
                  display: "flex", flexDirection: "column", gap: 8,
                  textDecoration: "none",
                  boxShadow: "0 4px 28px rgba(40,120,220,0.20)",
                  backdropFilter: "blur(12px)",
                  transition: "transform 140ms ease, box-shadow 140ms ease",
                }}
                onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "")}
              >
                <div style={{ fontSize: 32 }}>✨</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#c0e0ff" }}>{t.spaceCreate}</div>
                <div style={{ fontSize: "0.875rem", color: "#80b0d0" }}>{t.spaceCreateSub}</div>
              </Link>
            )}
          </div>

          <div style={{ textAlign: "center", marginTop: 40, color: "#6040a0", fontSize: "0.8rem" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>↓</div>
            scroll down to return home
          </div>
        </div>
      </div>

      {/* ── Section 2: Sky / Home (bottom) — starting view ── */}
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 480, width: "100%", padding: "48px 20px 120px" }}>
          {/* Greeting */}
          <div style={{ marginBottom: 36, textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--kids-text, #2a3a52)", lineHeight: 1.2 }}>
              {t.greeting}{displayName ? ` ${displayName}` : ""}
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
              <div style={{ color: "#7ec8a4" }}><BookIcon size={36} /></div>
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
                <div style={{ color: "#f7a84a" }}><PencilIcon size={36} /></div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--kids-text, #2a3a52)" }}>{t.create}</div>
                <div style={{ fontSize: "0.875rem", color: "var(--kids-muted, #7a9ab8)" }}>{t.createSub}</div>
              </Link>
            )}
          </div>

          {/* Scroll hint */}
          <div style={{ textAlign: "center", marginTop: 40, color: "var(--kids-muted, #7a9ab8)", fontSize: "0.8rem" }}>
            <div style={{ fontSize: 20, marginBottom: 4 }}>↑</div>
            {t.scrollHint}
          </div>
        </div>
      </div>
    </>
  );
}
