"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { getBrowserClient } from "@/lib/browserClient";

const LABELS: Record<string, Record<string, string>> = {
  en: { title: "Read", subtitle: "Stories just for you", empty: "No stories yet — check back soon!", searchPlaceholder: "Search stories..." },
  mn: { title: "Унших", subtitle: "Зориулж тавьсан үлгэрүүд", empty: "Одоохондоо байхгүй байна!", searchPlaceholder: "Хайх..." },
  ko: { title: "읽기", subtitle: "나만을 위한 이야기", empty: "아직 이야기가 없어요!", searchPlaceholder: "이야기 검색..." },
  ja: { title: "読む", subtitle: "あなただけのお話", empty: "まだお話がないよ！", searchPlaceholder: "お話を検索..." },
};

interface Book {
  id: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  content_type: string;
  status: string;
}

function IconManga({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function IconWebnovel({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="9" y1="7" x2="15" y2="7" />
      <line x1="9" y1="11" x2="15" y2="11" />
    </svg>
  );
}

function IconComic({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconArtbook({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <rect x="7" y="7" width="10" height="10" rx="1" />
    </svg>
  );
}

function ContentTypeIcon({ type, size = 22 }: { type: string; size?: number }) {
  switch (type) {
    case "manga":    return <IconManga    size={size} />;
    case "webnovel": return <IconWebnovel size={size} />;
    case "comic":    return <IconComic    size={size} />;
    case "artbook":  return <IconArtbook  size={size} />;
    default:         return <IconWebnovel size={size} />;
  }
}

function LoadingSpinner() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spin 1s linear infinite" }}>
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

export default function KidsReaderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const t = LABELS[locale] ?? LABELS.en;

  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getBrowserClient();
    (async () => {
      const { data } = await supabase
        .from("books")
        .select("id, title, description, cover_image_url, content_type, status")
        .eq("status", "published")
        .in("audience", ["kids", "all"])
        .order("created_at", { ascending: false })
        .limit(50);
      setBooks(data ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = books.filter(b =>
    !search || b.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "40px 20px 24px" }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "var(--kids-text, #2a3a52)" }}>{t.title}</div>
        <div style={{ fontSize: "0.9rem", color: "var(--kids-muted, #7a9ab8)", marginTop: 4 }}>{t.subtitle}</div>
      </div>

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={t.searchPlaceholder}
        style={{
          width: "100%",
          padding: "12px 16px",
          borderRadius: 16,
          border: "2px solid var(--kids-border, rgba(100,160,220,0.22))",
          background: "var(--kids-panel, rgba(255,255,255,0.82))",
          color: "var(--kids-text, #2a3a52)",
          fontSize: "0.95rem",
          outline: "none",
          marginBottom: 20,
          boxSizing: "border-box",
        }}
      />

      {loading ? (
        <div style={{ textAlign: "center", color: "var(--kids-muted, #7a9ab8)", padding: 40 }}>
          <LoadingSpinner />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: "var(--kids-muted, #7a9ab8)", padding: 40 }}>
          {t.empty}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {filtered.map(book => (
            <Link
              key={book.id}
              href={`/${locale}/reader/${book.id}`}
              style={{
                display: "flex",
                flexDirection: "column",
                borderRadius: 20,
                overflow: "hidden",
                textDecoration: "none",
                background: "var(--kids-panel, rgba(255,255,255,0.85))",
                border: "2px solid var(--kids-border, rgba(100,160,220,0.18))",
                boxShadow: "var(--kids-shadow, 0 4px 16px rgba(100,160,220,0.14))",
                transition: "transform 140ms ease",
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-2px)")}
              onMouseLeave={e => (e.currentTarget.style.transform = "")}
            >
              {book.cover_image_url ? (
                <img
                  src={book.cover_image_url}
                  alt={book.title}
                  style={{ width: "100%", aspectRatio: "2/3", objectFit: "cover" }}
                />
              ) : (
                <div style={{
                  width: "100%",
                  aspectRatio: "2/3",
                  background: "linear-gradient(135deg, #b8dff8, #c9a0e0)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,0.9)",
                }}>
                  <ContentTypeIcon type={book.content_type} size={40} />
                </div>
              )}
              <div style={{ padding: "10px 12px 14px" }}>
                <div style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "var(--kids-text, #2a3a52)",
                  lineHeight: 1.3,
                  marginBottom: 6,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}>
                  {book.title}
                </div>
                <span style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: "0.7rem",
                  background: "rgba(126,200,164,0.18)",
                  color: "#4a9a7c",
                  borderRadius: 999,
                  padding: "2px 8px",
                  fontWeight: 600,
                }}>
                  <ContentTypeIcon type={book.content_type} size={12} />
                  {book.content_type}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
