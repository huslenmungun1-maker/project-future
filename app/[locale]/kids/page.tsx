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
    setup: "Set Up a Child Account",
    setupSub: "Create a safe space for your child to read and create",
  },
  mn: {
    greeting: "Сайн уу!",
    subtitle: "Өнөөдөр юу хийх вэ?",
    read: "Үлгэр унших",
    readSub: "Ном, манга олдог",
    create: "Бүтээх",
    createSub: "Өөрийн үлгэр бичих эсвэл зурах",
    noKidAccount: "Эцэг эх эсвэл багш таны Kids бүртгэлийг тохируулах хэрэгтэй.",
    setup: "Хүүхдийн бүртгэл үүсгэх",
    setupSub: "Хүүхдэд зориулсан аюулгүй орчин бүтээх",
  },
  ko: {
    greeting: "안녕하세요!",
    subtitle: "오늘은 무엇을 할까요?",
    read: "이야기 읽기",
    readSub: "책과 만화 찾기",
    create: "만들기",
    createSub: "나만의 이야기 쓰거나 그리기",
    noKidAccount: "부모님이나 선생님께 Kids 계정 설정을 부탁하세요.",
    setup: "아이 계정 만들기",
    setupSub: "아이를 위한 안전한 공간 만들기",
  },
  ja: {
    greeting: "こんにちは！",
    subtitle: "今日は何をする？",
    read: "お話を読む",
    readSub: "本やマンガを探そう",
    create: "つくる",
    createSub: "自分のお話を書いたり描いたり",
    noKidAccount: "保護者か先生にKidsアカウントの設定をお願いしてね。",
    setup: "子どものアカウントを作る",
    setupSub: "子どもが安心して読んだり作ったりできる場所",
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
      {/* ── Page 4 — topmost page, pure black ── */}
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <span style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#ffffff",
            textTransform: "uppercase",
            background: "rgba(255,255,255,0.06)",
            borderRadius: 99,
            padding: "4px 14px",
          }}>Page 4</span>
        </div>
      </div>

      {/* ── Page 3 — topmost page, space background shows through ── */}
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <span style={{
            fontSize: "0.7rem",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#a78bfa",
            textTransform: "uppercase",
            background: "rgba(255,255,255,0.08)",
            borderRadius: 99,
            padding: "4px 14px",
          }}>Page 3</span>
        </div>
      </div>

      {/* ── Page 2 — full of clouds ── */}
      <div style={{ height: "100vh", position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #aed6f1 0%, #c9e8f8 45%, #e0f3ff 100%)" }}>
        <div className="p2-cloud p2-cloud--1" />
        <div className="p2-cloud p2-cloud--2" />
        <div className="p2-cloud p2-cloud--3" />
        <div className="p2-cloud p2-cloud--4" />
        <div className="p2-cloud p2-cloud--5" />
        <div className="p2-cloud p2-cloud--6" />
        <div className="p2-cloud p2-cloud--7" />
        <div className="p2-cloud p2-cloud--8" />
        <div className="p2-cloud p2-cloud--9" />
        <div className="p2-cloud p2-cloud--10" />
        <div className="p2-cloud p2-cloud--11" />
        <div className="p2-cloud p2-cloud--12" />
        <style>{`
          @keyframes p2-drift {
            from { transform: translateX(-400px); }
            to   { transform: translateX(calc(100vw + 400px)); }
          }
          .p2-cloud {
            position: absolute;
            border-radius: 999px;
            background: rgba(255,255,255,0.92);
            box-shadow: 0 8px 32px rgba(160,210,255,0.22);
          }
          .p2-cloud::before, .p2-cloud::after {
            content: "";
            position: absolute;
            border-radius: 999px;
            background: inherit;
          }
          .p2-cloud--1  { width:300px; height:80px;  top: 6%;  left:-300px; animation: p2-drift 36s linear infinite; }
          .p2-cloud--1::before  { width:130px; height:96px;  top:-42px; left:50px; }
          .p2-cloud--1::after   { width:100px; height:74px;  top:-28px; left:148px; }
          .p2-cloud--2  { width:200px; height:56px;  top:20%;  left:-200px; animation: p2-drift 50s linear infinite 6s; }
          .p2-cloud--2::before  { width: 90px; height:68px;  top:-30px; left:36px; }
          .p2-cloud--2::after   { width: 68px; height:50px;  top:-20px; left:102px; }
          .p2-cloud--3  { width:130px; height:38px;  top:11%;  left:-130px; animation: p2-drift 64s linear infinite 20s; }
          .p2-cloud--3::before  { width: 60px; height:46px;  top:-20px; left:24px; }
          .p2-cloud--3::after   { width: 46px; height:36px;  top:-14px; left:66px; }
          .p2-cloud--4  { width:340px; height:92px;  top:33%;  left:-340px; animation: p2-drift 30s linear infinite 10s; }
          .p2-cloud--4::before  { width:150px; height:110px; top:-48px; left:60px; }
          .p2-cloud--4::after   { width:110px; height:82px;  top:-32px; left:170px; }
          .p2-cloud--5  { width:180px; height:52px;  top:48%;  left:-180px; animation: p2-drift 54s linear infinite 2s; }
          .p2-cloud--5::before  { width: 82px; height:62px;  top:-28px; left:32px; }
          .p2-cloud--5::after   { width: 62px; height:46px;  top:-18px; left:92px; }
          .p2-cloud--6  { width:110px; height:32px;  top:28%;  left:-110px; animation: p2-drift 72s linear infinite 28s; }
          .p2-cloud--6::before  { width: 50px; height:40px;  top:-18px; left:18px; }
          .p2-cloud--6::after   { width: 38px; height:30px;  top:-12px; left:56px; }
          .p2-cloud--7  { width:260px; height:72px;  top:60%;  left:-260px; animation: p2-drift 42s linear infinite 14s; }
          .p2-cloud--7::before  { width:116px; height:86px;  top:-38px; left:44px; }
          .p2-cloud--7::after   { width: 88px; height:66px;  top:-24px; left:130px; }
          .p2-cloud--8  { width:160px; height:46px;  top:74%;  left:-160px; animation: p2-drift 58s linear infinite 8s; }
          .p2-cloud--8::before  { width: 72px; height:56px;  top:-24px; left:28px; }
          .p2-cloud--8::after   { width: 56px; height:42px;  top:-16px; left:82px; }
          .p2-cloud--9  { width: 90px; height:26px;  top:16%;  left:- 90px; animation: p2-drift 68s linear infinite 35s; }
          .p2-cloud--9::before  { width: 42px; height:32px;  top:-14px; left:14px; }
          .p2-cloud--9::after   { width: 32px; height:24px;  top:-10px; left:46px; }
          .p2-cloud--10 { width:240px; height:66px;  top:42%;  left:-240px; animation: p2-drift 46s linear infinite 22s; }
          .p2-cloud--10::before { width:108px; height:80px;  top:-35px; left:42px; }
          .p2-cloud--10::after  { width: 82px; height:60px;  top:-22px; left:120px; }
          .p2-cloud--11 { width:170px; height:48px;  top:82%;  left:-170px; animation: p2-drift 52s linear infinite 17s; }
          .p2-cloud--11::before { width: 76px; height:58px;  top:-26px; left:30px; }
          .p2-cloud--11::after  { width: 58px; height:44px;  top:-17px; left:86px; }
          .p2-cloud--12 { width:120px; height:34px;  top:55%;  left:-120px; animation: p2-drift 66s linear infinite 40s; }
          .p2-cloud--12::before { width: 54px; height:42px;  top:-18px; left:20px; }
          .p2-cloud--12::after  { width: 42px; height:32px;  top:-13px; left:60px; }
        `}</style>
      </div>

      {/* ── Page 1: Sky / Home — starting view ── */}
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 480, width: "100%", padding: "48px 20px 100px" }}>
          {/* Page label */}
          <div style={{ textAlign: "center", marginBottom: 12 }}>
            <span style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              color: "var(--kids-muted, #7a9ab8)",
              textTransform: "uppercase",
              background: "rgba(255,255,255,0.5)",
              borderRadius: 99,
              padding: "4px 14px",
            }}>Page 1</span>
          </div>
          {/* Greeting */}
          <div style={{ marginBottom: 36, textAlign: "center" }}>
            <div style={{ fontSize: "2rem", fontWeight: 800, color: "var(--kids-text, #2a3a52)", lineHeight: 1.2 }}>
              {t.greeting}{displayName ? ` ${displayName}` : ""}
            </div>
            <div style={{ fontSize: "1rem", color: "var(--kids-muted, #7a9ab8)", marginTop: 6 }}>
              {t.subtitle}
            </div>
          </div>

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

            {hasKidAccount === false && (
              <Link
                href={`/${locale}/kids/setup`}
                style={cardStyle("#a78bfa")}
                onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
                onMouseLeave={e => (e.currentTarget.style.transform = "")}
              >
                <div style={{ color: "#a78bfa" }}>
                  <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <line x1="19" y1="8" x2="19" y2="14" />
                    <line x1="22" y1="11" x2="16" y2="11" />
                  </svg>
                </div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--kids-text, #2a3a52)" }}>{t.setup}</div>
                <div style={{ fontSize: "0.875rem", color: "var(--kids-muted, #7a9ab8)" }}>{t.setupSub}</div>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
