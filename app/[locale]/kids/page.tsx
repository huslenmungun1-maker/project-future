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

function sr(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}
const P4_STARS = Array.from({ length: 160 }, (_, i) => ({
  top:   sr(i * 11 + 500) * 82,
  left:  sr(i * 11 + 501) * 100,
  size:  i % 18 === 0 ? 3.5 : i % 6 === 0 ? 2.5 : i % 3 === 0 ? 2 : 1.5,
  big:   i % 18 === 0,
  opacity: 0.35 + sr(i * 11 + 502) * 0.65,
  dur:   1.5 + sr(i * 11 + 503) * 4.5,
  delay: sr(i * 11 + 504) * 9,
}));

const P3_STARS = Array.from({ length: 45 }, (_, i) => ({
  top:   sr(i * 5 + 100) * 94,
  left:  sr(i * 5 + 101) * 100,
  size:  i % 7 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
  opacity: 0.45 + sr(i * 5 + 102) * 0.55,
  dur:   2 + sr(i * 5 + 103) * 3.5,
  delay: sr(i * 5 + 104) * 6,
}));

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
      {/* ── Page 4 — CSS galaxy + MLP night silhouette ── */}
      <div style={{ height: "100vh", background: "#0a0a2e", position: "relative", overflow: "hidden" }}>

        {/* Pan wrapper */}
        <div className="p4-pan">
          {/* Pulse wrapper */}
          <div className="p4-pulse">
            {/* Nebula clouds */}
            <div className="p4-nebula p4-nb--core"  />
            <div className="p4-nebula p4-nb--blue1" />
            <div className="p4-nebula p4-nb--blue2" />
            <div className="p4-nebula p4-nb--pink1" />
            <div className="p4-nebula p4-nb--pink2" />
            <div className="p4-nebula p4-nb--warm"  />
            {/* Stars */}
            {P4_STARS.map((s, i) => (
              <div key={i} style={{
                position: "absolute",
                top: `${s.top}%`, left: `${s.left}%`,
                width: s.size, height: s.size,
                borderRadius: "50%",
                background: "#fff",
                opacity: s.opacity,
                boxShadow: s.big ? `0 0 6px 2px rgba(200,220,255,0.5)` : undefined,
                animation: `p4-twinkle ${s.dur.toFixed(1)}s ease-in-out infinite ${s.delay.toFixed(2)}s`,
              }} />
            ))}
            {/* Bright star flares */}
            <div className="p4-flare" style={{ top: "18%", left: "32%" }} />
            <div className="p4-flare" style={{ top: "42%", left: "72%" }} />
            <div className="p4-flare" style={{ top: "12%", left: "78%" }} />
            <div className="p4-flare" style={{ top: "58%", left: "18%" }} />
          </div>
        </div>

        {/* MLP-style night silhouette landscape */}
        <svg style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 180 }}
             viewBox="0 0 1440 180" preserveAspectRatio="none">
          {/* Rolling hill silhouettes — back to front */}
          <path d="M0,110 C200,70 400,95 600,80 C800,65 1000,55 1200,80 C1360,100 1440,90 1440,100 L1440,180 L0,180 Z" fill="#0f0628"/>
          <path d="M0,125 C180,100 380,110 580,118 C780,126 940,108 1140,118 C1300,126 1400,118 1440,122 L1440,180 L0,180 Z" fill="#1a0a3e"/>
          <path d="M0,140 Q240,122 480,134 Q720,146 960,130 Q1200,114 1440,136 L1440,180 L0,180 Z" fill="#1e0d46"/>
          <path d="M0,152 Q200,140 400,148 Q600,156 800,144 Q1000,132 1200,146 Q1380,158 1440,152 L1440,180 L0,180 Z" fill="#200f4e"/>
          {/* Left tree silhouette */}
          <path d="M94,155 C93,142 92,128 93,118 C94,109 97,103 99,96 L107,96 C109,103 111,109 112,118 C113,128 112,142 111,155 Z" fill="#0d0520"/>
          <circle cx="100" cy="82"  r="36" fill="#0d0520"/>
          <circle cx="74"  cy="95"  r="25" fill="#0d0520"/>
          <circle cx="126" cy="93"  r="27" fill="#0d0520"/>
          <circle cx="92"  cy="68"  r="22" fill="#0d0520"/>
          {/* Right tree silhouette */}
          <path d="M1328,155 C1327,143 1326,130 1327,120 C1328,111 1331,105 1333,98 L1341,98 C1343,105 1345,111 1346,120 C1347,130 1346,143 1344,155 Z" fill="#0d0520"/>
          <circle cx="1335" cy="85"  r="30" fill="#0d0520"/>
          <circle cx="1312" cy="97"  r="21" fill="#0d0520"/>
          <circle cx="1358" cy="95"  r="23" fill="#0d0520"/>
          <circle cx="1328" cy="72"  r="18" fill="#0d0520"/>
          {/* Center-left small tree */}
          <rect x="576" y="130" width="6" height="28" fill="#0d0520"/>
          <circle cx="579" cy="122" r="16" fill="#0d0520"/>
          <circle cx="565" cy="128" r="11" fill="#0d0520"/>
          <circle cx="593" cy="126" r="13" fill="#0d0520"/>
          {/* Faint glowing path */}
          <path d="M720,180 C700,165 678,155 658,145 C638,135 630,127 642,119 C652,112 674,109 680,102" fill="none" stroke="rgba(140,80,255,0.20)" strokeWidth="10" strokeLinecap="round"/>
          {/* Glowing ground flowers */}
          <circle cx="180"  cy="162" r="2.5" fill="#7bc8ff" opacity="0.85"/>
          <circle cx="310"  cy="165" r="2"   fill="#c77dff" opacity="0.75"/>
          <circle cx="460"  cy="160" r="2.5" fill="#7bc8ff" opacity="0.85"/>
          <circle cx="620"  cy="163" r="2"   fill="#c77dff" opacity="0.75"/>
          <circle cx="800"  cy="161" r="2.5" fill="#7bc8ff" opacity="0.85"/>
          <circle cx="950"  cy="164" r="2"   fill="#c77dff" opacity="0.75"/>
          <circle cx="1100" cy="162" r="2.5" fill="#7bc8ff" opacity="0.85"/>
          <circle cx="1270" cy="160" r="2"   fill="#c77dff" opacity="0.75"/>
          <circle cx="1400" cy="163" r="2.5" fill="#7bc8ff" opacity="0.75"/>
        </svg>

        <style>{`
          @keyframes p4-twinkle {
            0%, 100% { opacity: 0.2; transform: scale(0.85); }
            50%       { opacity: 1;   transform: scale(1.15); }
          }
          @keyframes p4-pan {
            from { transform: translateX(0); }
            to   { transform: translateX(-20px); }
          }
          @keyframes p4-pulse {
            from { transform: scale(1.0); }
            to   { transform: scale(1.05); }
          }
          .p4-pan {
            position: absolute; inset: -25px;
            animation: p4-pan 20s ease-in-out infinite alternate;
          }
          .p4-pulse {
            position: absolute; inset: 0;
            animation: p4-pulse 8s ease-in-out infinite alternate;
          }
          .p4-nebula {
            position: absolute; border-radius: 50%; pointer-events: none;
          }
          .p4-nb--core  { top:20%; left:28%; width:560px; height:320px; background:radial-gradient(ellipse,rgba(180,80,255,0.22) 0%,rgba(100,40,180,0.10) 55%,transparent 82%); filter:blur(55px); }
          .p4-nb--blue1 { top: 5%; left:48%; width:440px; height:270px; background:radial-gradient(ellipse,rgba(79,195,247,0.28) 0%,rgba(30,100,200,0.12) 52%,transparent 80%); filter:blur(50px); }
          .p4-nb--blue2 { top:52%; left: 5%; width:380px; height:220px; background:radial-gradient(ellipse,rgba(79,195,247,0.20) 0%,rgba(20,80,160,0.08) 55%,transparent 82%); filter:blur(60px); }
          .p4-nb--pink1 { top:28%; left:58%; width:480px; height:300px; background:radial-gradient(ellipse,rgba(199,125,255,0.25) 0%,rgba(120,40,200,0.10) 52%,transparent 80%); filter:blur(52px); }
          .p4-nb--pink2 { top:55%; right:2%; width:320px; height:210px; background:radial-gradient(ellipse,rgba(255,120,180,0.18) 0%,rgba(180,40,120,0.08) 55%,transparent 82%); filter:blur(65px); }
          .p4-nb--warm  { top:35%; left:33%; width:380px; height:220px; background:radial-gradient(ellipse,rgba(255,160,80,0.14) 0%,rgba(200,80,40,0.06) 55%,transparent 82%); filter:blur(80px); }
          .p4-flare {
            position: absolute;
            width: 6px; height: 6px; border-radius: 50%;
            background: #fff;
            transform: translate(-50%,-50%);
            box-shadow: 0 0 12px 6px rgba(255,255,255,0.55), 0 0 32px 12px rgba(200,220,255,0.28);
          }
          .p4-flare::before {
            content:""; position:absolute;
            width:110px; height:1.5px;
            background:linear-gradient(90deg,transparent,rgba(255,255,255,0.55),transparent);
            top:50%; left:50%; transform:translate(-50%,-50%);
          }
          .p4-flare::after {
            content:""; position:absolute;
            width:1.5px; height:110px;
            background:linear-gradient(180deg,transparent,rgba(255,255,255,0.55),transparent);
            top:50%; left:50%; transform:translate(-50%,-50%);
          }
        `}</style>
      </div>

      {/* ── Page 3 — dark starfield, sun slides left, moon slides right ── */}
      <div style={{ height: "100vh", position: "relative", overflow: "hidden", background: "#0d0d2b" }}>

        {/* Sun — day mode: visible, slides left on entry */}
        <div className="p3-sun">
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "radial-gradient(circle, #ffe97a 40%, #ffcf3a 100%)", boxShadow: "0 0 48px 16px rgba(255,210,60,0.38)" }} />
        </div>

        {/* Moon — night mode: visible, slides right on entry */}
        <div className="p3-moon">
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f7e8a0", boxShadow: "0 0 40px 12px rgba(247,232,160,0.35)" }} />
        </div>

        {/* 45 twinkling stars */}
        {P3_STARS.map((s, i) => (
          <div key={i} style={{
            position: "absolute",
            top: `${s.top}%`, left: `${s.left}%`,
            width: s.size, height: s.size,
            borderRadius: "50%",
            background: "#fff",
            opacity: s.opacity,
            animation: `p3-twinkle ${s.dur.toFixed(1)}s ease-in-out infinite ${s.delay.toFixed(2)}s`,
          }} />
        ))}

        <style>{`
          @keyframes p3-twinkle {
            0%, 100% { opacity: 0.15; transform: scale(0.8); }
            50%       { opacity: 1;    transform: scale(1.2); }
          }

          /* Sun: visible in day, slides off left when entering page 3 */
          .p3-sun {
            position: absolute; left: 10%; top: 7%;
            transform: translateX(0);
            transition: transform 0.55s cubic-bezier(0.4,0,0.2,1);
          }
          .theme-kids-night .p3-sun {
            transform: translateY(calc(100vh + 80px));
          }
          .kids-page-1 .p3-sun {
            transform: translateX(calc(-100vw - 80px));
          }

          /* Moon: hidden in day, visible at night, slides off right when entering page 3 */
          .p3-moon {
            position: absolute; right: 10%; top: 7%;
            transform: translateY(calc(100vh + 80px));
            transition: transform 0.55s cubic-bezier(0.4,0,0.2,1);
          }
          .theme-kids-night .p3-moon {
            transform: translateY(0);
          }
          .kids-page-1 .p3-moon {
            transform: translateX(calc(100vw + 80px));
          }
        `}</style>
      </div>

      {/* ── Page 2 — full of clouds, day/night, sun + moon follow ── */}
      <div style={{ height: "100vh", position: "relative", overflow: "hidden" }}>
        {/* Day sky */}
        <div className="p2-bg-day" />
        {/* Night sky + stars */}
        <div className="p2-bg-night" />

        {/* Sun — day */}
        <div className="p2-sun">
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "radial-gradient(circle, #ffe97a 40%, #ffcf3a 100%)", boxShadow: "0 0 48px 16px rgba(255,210,60,0.38)" }} />
        </div>

        {/* Moon — night */}
        <div className="p2-moon">
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f7e8a0", boxShadow: "0 0 40px 12px rgba(247,232,160,0.35)" }} />
        </div>

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
        <div className="p2-cloud p2-cloud--13" />
        <div className="p2-cloud p2-cloud--14" />
        <div className="p2-cloud p2-cloud--15" />
        <div className="p2-cloud p2-cloud--16" />
        <div className="p2-cloud p2-cloud--17" />
        <div className="p2-cloud p2-cloud--18" />

        <style>{`
          @keyframes p2-drift {
            from { transform: translateX(-400px); }
            to   { transform: translateX(calc(100vw + 400px)); }
          }

          /* Day/night backgrounds */
          .p2-bg-day {
            position: absolute; inset: 0;
            background: linear-gradient(180deg, #aed6f1 0%, #c9e8f8 45%, #e0f3ff 100%);
            opacity: 1;
            transition: opacity 2.6s cubic-bezier(0.4,0,0.2,1);
          }
          .theme-kids-night .p2-bg-day { opacity: 0; }
          .p2-bg-night {
            position: absolute; inset: 0;
            background:
              radial-gradient(1px 1px at  6% 10%, rgba(255,255,255,0.85) 0%, transparent 100%),
              radial-gradient(2px 2px at 19%  4%, rgba(255,255,255,0.92) 0%, transparent 100%),
              radial-gradient(1px 1px at 31% 26%, rgba(255,255,255,0.70) 0%, transparent 100%),
              radial-gradient(2px 2px at 45%  8%, rgba(255,255,255,0.95) 0%, transparent 100%),
              radial-gradient(1px 1px at 58% 18%, rgba(255,255,255,0.75) 0%, transparent 100%),
              radial-gradient(2px 2px at 71%  3%, rgba(255,255,255,0.88) 0%, transparent 100%),
              radial-gradient(1px 1px at 83% 14%, rgba(255,255,255,0.65) 0%, transparent 100%),
              radial-gradient(1px 1px at 93% 28%, rgba(255,255,255,0.80) 0%, transparent 100%),
              radial-gradient(2px 2px at 12% 44%, rgba(255,255,255,0.72) 0%, transparent 100%),
              radial-gradient(1px 1px at 26% 54%, rgba(255,255,255,0.60) 0%, transparent 100%),
              radial-gradient(1px 1px at 39% 66%, rgba(255,255,255,0.78) 0%, transparent 100%),
              radial-gradient(2px 2px at 53% 38%, rgba(255,255,255,0.88) 0%, transparent 100%),
              radial-gradient(1px 1px at 66% 56%, rgba(255,255,255,0.65) 0%, transparent 100%),
              radial-gradient(1px 1px at 78% 70%, rgba(255,255,255,0.72) 0%, transparent 100%),
              radial-gradient(2px 2px at 89% 46%, rgba(255,255,255,0.90) 0%, transparent 100%),
              radial-gradient(1px 1px at  4% 76%, rgba(255,255,255,0.60) 0%, transparent 100%),
              radial-gradient(1px 1px at 16% 84%, rgba(255,255,255,0.75) 0%, transparent 100%),
              radial-gradient(2px 2px at 35% 79%, rgba(255,255,255,0.82) 0%, transparent 100%),
              radial-gradient(1px 1px at 50% 87%, rgba(255,255,255,0.65) 0%, transparent 100%),
              radial-gradient(1px 1px at 68% 81%, rgba(255,255,255,0.70) 0%, transparent 100%),
              radial-gradient(2px 2px at 87% 92%, rgba(255,255,255,0.85) 0%, transparent 100%),
              linear-gradient(180deg, #1a1040 0%, #2e1c6a 60%, #3d1a5a 100%);
            opacity: 0;
            transition: opacity 2.6s cubic-bezier(0.4,0,0.2,1);
          }
          .theme-kids-night .p2-bg-night { opacity: 1; }

          /* Sun/moon: follow day/night theme */
          .p2-sun {
            position: absolute; left: 8%; top: 6%;
            transform: translateY(0);
            transition: transform 2.4s ease-in;
          }
          .theme-kids-night .p2-sun { transform: translateY(calc(100vh + 80px)); }
          .p2-moon {
            position: absolute; right: 8%; top: 8%;
            transform: translateY(calc(100vh + 80px));
            transition: transform 2.4s ease-out;
          }
          .theme-kids-night .p2-moon { transform: translateY(0); }

          .p2-cloud {
            position: absolute;
            border-radius: 999px;
            background: rgba(255,255,255,0.92);
            box-shadow: 0 8px 32px rgba(160,210,255,0.22);
            transition: background 2.6s cubic-bezier(0.4,0,0.2,1),
                        box-shadow  2.6s cubic-bezier(0.4,0,0.2,1),
                        opacity     2.6s cubic-bezier(0.4,0,0.2,1);
          }
          .theme-kids-night .p2-cloud {
            background: rgba(72,48,168,0.50);
            box-shadow: 0 8px 24px rgba(40,20,100,0.12);
            opacity: 0.65;
          }
          .p2-cloud::before, .p2-cloud::after {
            content: "";
            position: absolute;
            border-radius: 999px;
            background: inherit;
          }

          .p2-cloud--1  { width:300px; height:80px;  top: 6%;  left:0; animation: p2-drift 36s linear infinite -18s; }
          .p2-cloud--1::before  { width:130px; height:96px;  top:-42px; left:50px; }
          .p2-cloud--1::after   { width:100px; height:74px;  top:-28px; left:148px; }

          .p2-cloud--2  { width:200px; height:56px;  top:20%;  left:0; animation: p2-drift 48s linear infinite -12s; }
          .p2-cloud--2::before  { width: 90px; height:68px;  top:-30px; left:36px; }
          .p2-cloud--2::after   { width: 68px; height:50px;  top:-20px; left:102px; }

          .p2-cloud--3  { width:130px; height:38px;  top:11%;  left:0; animation: p2-drift 60s linear infinite -30s; }
          .p2-cloud--3::before  { width: 60px; height:46px;  top:-20px; left:24px; }
          .p2-cloud--3::after   { width: 46px; height:36px;  top:-14px; left:66px; }

          .p2-cloud--4  { width:340px; height:92px;  top:33%;  left:0; animation: p2-drift 32s linear infinite -16s; }
          .p2-cloud--4::before  { width:150px; height:110px; top:-48px; left:60px; }
          .p2-cloud--4::after   { width:110px; height:82px;  top:-32px; left:170px; }

          .p2-cloud--5  { width:180px; height:52px;  top:48%;  left:0; animation: p2-drift 52s linear infinite -26s; }
          .p2-cloud--5::before  { width: 82px; height:62px;  top:-28px; left:32px; }
          .p2-cloud--5::after   { width: 62px; height:46px;  top:-18px; left:92px; }

          .p2-cloud--6  { width:110px; height:32px;  top:28%;  left:0; animation: p2-drift 68s linear infinite -10s; }
          .p2-cloud--6::before  { width: 50px; height:40px;  top:-18px; left:18px; }
          .p2-cloud--6::after   { width: 38px; height:30px;  top:-12px; left:56px; }

          .p2-cloud--7  { width:260px; height:72px;  top:60%;  left:0; animation: p2-drift 40s linear infinite -20s; }
          .p2-cloud--7::before  { width:116px; height:86px;  top:-38px; left:44px; }
          .p2-cloud--7::after   { width: 88px; height:66px;  top:-24px; left:130px; }

          .p2-cloud--8  { width:160px; height:46px;  top:74%;  left:0; animation: p2-drift 56s linear infinite -28s; }
          .p2-cloud--8::before  { width: 72px; height:56px;  top:-24px; left:28px; }
          .p2-cloud--8::after   { width: 56px; height:42px;  top:-16px; left:82px; }

          .p2-cloud--9  { width: 90px; height:26px;  top:16%;  left:0; animation: p2-drift 64s linear infinite -32s; }
          .p2-cloud--9::before  { width: 42px; height:32px;  top:-14px; left:14px; }
          .p2-cloud--9::after   { width: 32px; height:24px;  top:-10px; left:46px; }

          .p2-cloud--10 { width:240px; height:66px;  top:42%;  left:0; animation: p2-drift 44s linear infinite -22s; }
          .p2-cloud--10::before { width:108px; height:80px;  top:-35px; left:42px; }
          .p2-cloud--10::after  { width: 82px; height:60px;  top:-22px; left:120px; }

          .p2-cloud--11 { width:170px; height:48px;  top:82%;  left:0; animation: p2-drift 50s linear infinite  -8s; }
          .p2-cloud--11::before { width: 76px; height:58px;  top:-26px; left:30px; }
          .p2-cloud--11::after  { width: 58px; height:44px;  top:-17px; left:86px; }

          .p2-cloud--12 { width:120px; height:34px;  top:55%;  left:0; animation: p2-drift 62s linear infinite -31s; }
          .p2-cloud--12::before { width: 54px; height:42px;  top:-18px; left:20px; }
          .p2-cloud--12::after  { width: 42px; height:32px;  top:-13px; left:60px; }

          .p2-cloud--13 { width:280px; height:76px;  top:24%;  left:0; animation: p2-drift 38s linear infinite -19s; }
          .p2-cloud--13::before { width:124px; height:92px;  top:-40px; left:48px; }
          .p2-cloud--13::after  { width: 94px; height:70px;  top:-26px; left:140px; }

          .p2-cloud--14 { width:150px; height:44px;  top:67%;  left:0; animation: p2-drift 54s linear infinite -27s; }
          .p2-cloud--14::before { width: 68px; height:52px;  top:-23px; left:26px; }
          .p2-cloud--14::after  { width: 52px; height:40px;  top:-16px; left:78px; }

          .p2-cloud--15 { width:210px; height:60px;  top:38%;  left:0; animation: p2-drift 46s linear infinite -23s; }
          .p2-cloud--15::before { width: 94px; height:72px;  top:-32px; left:38px; }
          .p2-cloud--15::after  { width: 72px; height:54px;  top:-21px; left:108px; }

          .p2-cloud--16 { width: 80px; height:24px;  top:50%;  left:0; animation: p2-drift 70s linear infinite -35s; }
          .p2-cloud--16::before { width: 36px; height:28px;  top:-12px; left:12px; }
          .p2-cloud--16::after  { width: 28px; height:22px;  top: -9px; left:40px; }

          .p2-cloud--17 { width:320px; height:88px;  top:72%;  left:0; animation: p2-drift 34s linear infinite -17s; }
          .p2-cloud--17::before { width:142px; height:106px; top:-46px; left:56px; }
          .p2-cloud--17::after  { width:108px; height:80px;  top:-30px; left:164px; }

          .p2-cloud--18 { width:140px; height:40px;  top:88%;  left:0; animation: p2-drift 58s linear infinite -14s; }
          .p2-cloud--18::before { width: 64px; height:48px;  top:-21px; left:24px; }
          .p2-cloud--18::after  { width: 48px; height:36px;  top:-15px; left:72px; }
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
