"use client";
import { use, useEffect, useState } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

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

export default function KidsReaderPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const t = LABELS[locale] ?? LABELS.en;

  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
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

  const typeEmoji: Record<string, string> = {
    manga: "🎨",
    webnovel: "📖",
    comic: "💬",
    artbook: "🖼️",
  };

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
          <div style={{ fontSize: "2rem" }}>📚</div>
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
                  fontSize: "2.5rem",
                }}>
                  {typeEmoji[book.content_type] ?? "📖"}
                </div>
              )}
              <div style={{ padding: "10px 12px 14px" }}>
                <div style={{
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  color: "var(--kids-text, #2a3a52)",
                  lineHeight: 1.3,
                  marginBottom: 4,
                  overflow: "hidden",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                }}>
                  {book.title}
                </div>
                <span style={{
                  fontSize: "0.7rem",
                  background: "rgba(126,200,164,0.18)",
                  color: "#4a9a7c",
                  borderRadius: 999,
                  padding: "2px 8px",
                  fontWeight: 600,
                }}>
                  {typeEmoji[book.content_type]} {book.content_type}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
