"use client";
import Link from "next/link";

const LABELS: Record<string, { home: string; read: string; create: string; profile: string }> = {
  en: { home: "Home", read: "Read", create: "Create", profile: "Profile" },
  mn: { home: "Нүүр", read: "Унших", create: "Бүтээх", profile: "Профайл" },
  ko: { home: "홈", read: "읽기", create: "만들기", profile: "프로필" },
  ja: { home: "ホーム", read: "読む", create: "つくる", profile: "プロフィール" },
};

interface Props {
  locale: string;
  night: boolean;
  onToggleNight: () => void;
}

export default function KidsNav({ locale, night, onToggleNight }: Props) {
  const t = LABELS[locale] ?? LABELS.en;

  const navStyle: React.CSSProperties = {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-around",
    padding: "12px 8px 20px",
    background: night
      ? "rgba(26,16,64,0.92)"
      : "rgba(255,255,255,0.88)",
    backdropFilter: "blur(16px)",
    borderTop: night
      ? "1.5px solid rgba(180,140,255,0.18)"
      : "1.5px solid rgba(100,160,220,0.18)",
  };

  const itemStyle = (active?: boolean): React.CSSProperties => ({
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    textDecoration: "none",
    color: active
      ? night ? "#c4b5fd" : "#f7a84a"
      : night ? "#a090d0" : "#7a9ab8",
    fontWeight: active ? 700 : 500,
    fontSize: "0.7rem",
    minWidth: 56,
  });

  const iconSize = 26;

  return (
    <nav style={navStyle}>
      <Link href={`/${locale}/kids`} style={itemStyle()}>
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        {t.home}
      </Link>

      <Link href={`/${locale}/kids/reader`} style={itemStyle()}>
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
        {t.read}
      </Link>

      <Link href={`/${locale}/kids/create`} style={itemStyle()}>
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="16" />
          <line x1="8" y1="12" x2="16" y2="12" />
        </svg>
        {t.create}
      </Link>

      <Link href={`/${locale}/profile`} style={itemStyle()}>
        <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        {t.profile}
      </Link>

      {/* Day/Night toggle */}
      <button
        onClick={onToggleNight}
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: night ? "#c4b5fd" : "#7a9ab8",
          fontWeight: 500,
          fontSize: "0.7rem",
          minWidth: 56,
          padding: 0,
        }}
      >
        {night ? (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </svg>
        ) : (
          <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
        )}
        {night ? "Day" : "Night"}
      </button>
    </nav>
  );
}
