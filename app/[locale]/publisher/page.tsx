"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Status = "loading" | "ok" | "error";

type SeriesRow = {
  id: string;
  user_id: string | null;
  created_at: string;
  title: string | null;
  description: string | null;
  cover_image_url: string | null;
  published: boolean | null;
  published_at: string | null;
};

const OWNER_EMAIL = "huslen.mungun1@gmail.com";

const UI_TEXT = {
  en: {
    title: "Publisher",
    subtitle:
      "Publisher is for logged-in creators. Owner can see all published series.",
    backHome: "Back to home",
    loading: "Loading…",
    error: "Could not load series.",
    notLoggedIn: "You must be logged in to use Publisher.",
    publishedOnly: "Published series",
    none: "No published series yet.",
    openStudio: "Open in Studio",
    openReader: "Open in Reader",
    created: "Created",
    publishedAt: "Published",
    login: "Go to login",
    noCover: "No cover",
    untitled: "Untitled series",
    items: "items",
  },
  mn: {
    title: "Publisher",
    subtitle:
      "Publisher нь нэвтэрсэн бүтээгчдэд зориулагдсан. Эзэмшигч бүх нийтлэгдсэн цувралыг харна.",
    backHome: "Нүүр рүү буцах",
    loading: "Ачаалж байна…",
    error: "Цувралыг ачаалж чадсангүй.",
    notLoggedIn: "Publisher ашиглахын тулд нэвтэрнэ үү.",
    publishedOnly: "Нийтлэгдсэн цувралууд",
    none: "Одоогоор нийтлэгдсэн цуврал алга.",
    openStudio: "Studio-д нээх",
    openReader: "Reader-д нээх",
    created: "Үүсгэсэн",
    publishedAt: "Нийтэлсэн",
    login: "Нэвтрэх",
    noCover: "Ковергүй",
    untitled: "Нэргүй цуврал",
    items: "ширхэг",
  },
  ko: {
    title: "Publisher",
    subtitle:
      "Publisher는 로그인한 크리에이터 전용입니다. 오너는 모든 공개 시리즈를 볼 수 있습니다.",
    backHome: "홈으로",
    loading: "불러오는 중…",
    error: "시리즈를 불러올 수 없습니다.",
    notLoggedIn: "Publisher를 사용하려면 로그인하세요.",
    publishedOnly: "발행된 시리즈",
    none: "아직 발행된 시리즈가 없습니다.",
    openStudio: "Studio에서 열기",
    openReader: "Reader에서 열기",
    created: "생성일",
    publishedAt: "발행일",
    login: "로그인",
    noCover: "표지 없음",
    untitled: "제목 없는 시리즈",
    items: "개",
  },
  ja: {
    title: "Publisher",
    subtitle:
      "Publisher はログイン済みのクリエイター専用です。オーナーは公開済みシリーズをすべて見られます。",
    backHome: "ホームへ戻る",
    loading: "読み込み中…",
    error: "シリーズを読み込めません。",
    notLoggedIn: "Publisher を使うにはログインしてください。",
    publishedOnly: "公開済みシリーズ",
    none: "まだ公開済みシリーズがありません。",
    openStudio: "Studioで開く",
    openReader: "Readerで開く",
    created: "作成日",
    publishedAt: "公開日",
    login: "ログインへ",
    noCover: "表紙なし",
    untitled: "無題のシリーズ",
    items: "件",
  },
} as const;

type SupportedLocale = keyof typeof UI_TEXT;

function normalizeLocale(raw: string): SupportedLocale {
  return (["en", "mn", "ko", "ja"].includes(raw) ? raw : "en") as SupportedLocale;
}

export default function PublisherPage() {
  const params = useParams();
  const locale = normalizeLocale((params?.locale as string) || "en");
  const t = UI_TEXT[locale];

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<SeriesRow[]>([]);
  const [isAuthed, setIsAuthed] = useState(false);

  const localeForDate = useMemo(() => {
    return locale === "mn"
      ? "mn-MN"
      : locale === "ko"
      ? "ko-KR"
      : locale === "ja"
      ? "ja-JP"
      : "en-GB";
  }, [locale]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setStatus("loading");
      setMessage("");
      setItems([]);

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        if (!cancelled) {
          setStatus("error");
          setMessage(sessionError.message);
        }
        return;
      }

      const user = session?.user;

      if (!user) {
        if (!cancelled) {
          setIsAuthed(false);
          setStatus("error");
          setMessage(t.notLoggedIn);
        }
        return;
      }

      const isOwner =
        (user.email?.toLowerCase() ?? "") === OWNER_EMAIL.toLowerCase();

      if (!cancelled) {
        setIsAuthed(true);
      }

      let query = supabase
        .from("series")
        .select(
          "id, user_id, created_at, title, description, cover_image_url, published, published_at"
        )
        .or("published.eq.true,published_at.not.is.null")
        .order("created_at", { ascending: false });

      if (!isOwner) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query;

      if (error) {
        if (!cancelled) {
          setStatus("error");
          setMessage(`${t.error} (${error.message})`);
        }
        return;
      }

      if (!cancelled) {
        setItems((data as SeriesRow[]) || []);
        setStatus("ok");
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [locale, t.error, t.notLoggedIn]);

  return (
    <main className="min-h-screen theme-soft">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <span
              className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium"
              style={{
                borderColor: "var(--border)",
                background: "rgba(233,230,223,0.72)",
                color: "var(--muted)",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
              {t.title}
            </span>

            <div className="space-y-2">
              <h1
                className="text-3xl font-bold tracking-tight sm:text-4xl"
                style={{ color: "var(--text)" }}
              >
                {t.title}
              </h1>
              <p className="max-w-2xl text-sm" style={{ color: "var(--muted)" }}>
                {t.subtitle}
              </p>
            </div>
          </div>

          <Link
            href={`/${locale}`}
            className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-medium transition"
            style={{
              borderColor: "var(--border)",
              background: "rgba(255,255,255,0.55)",
              color: "var(--text)",
            }}
          >
            ← {t.backHome}
          </Link>
        </header>

        {status === "loading" && (
          <div
            className="rounded-[24px] border p-5"
            style={{
              borderColor: "var(--border)",
              background: "rgba(233,230,223,0.72)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {t.loading}
            </p>
          </div>
        )}

        {status === "error" && (
          <div
            className="rounded-[24px] border p-5"
            style={{
              borderColor: "rgba(122,46,46,0.2)",
              background: "rgba(233,230,223,0.72)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--danger)" }}>
              {message}
            </p>

            {!isAuthed && (
              <div className="mt-4">
                <Link
                  href={`/${locale}/login`}
                  className="inline-flex rounded-full border px-4 py-2 text-xs font-medium transition"
                  style={{
                    borderColor: "var(--border)",
                    background: "rgba(255,255,255,0.55)",
                    color: "var(--text)",
                  }}
                >
                  {t.login}
                </Link>
              </div>
            )}
          </div>
        )}

        {status === "ok" && (
          <section
            className="rounded-[28px] border p-5 space-y-5"
            style={{
              borderColor: "var(--border)",
              background: "rgba(233,230,223,0.72)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <h2
                className="text-sm font-semibold uppercase tracking-[0.18em]"
                style={{ color: "var(--muted)" }}
              >
                {t.publishedOnly}
              </h2>
              <span className="text-xs" style={{ color: "var(--muted)" }}>
                {items.length} {t.items}
              </span>
            </div>

            {items.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                {t.none}
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-5">
                {items.map((s) => {
                  const created = new Date(s.created_at).toLocaleString(
                    localeForDate,
                    {
                      dateStyle: "medium",
                      timeStyle: "short",
                    }
                  );

                  const publishedAt = s.published_at
                    ? new Date(s.published_at).toLocaleString(localeForDate, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : null;

                  return (
                    <article key={s.id} className="group">
                      <div className="block">
                        <div
                          className="relative overflow-hidden rounded-[24px] border transition duration-300 group-hover:-translate-y-1"
                          style={{
                            aspectRatio: "2 / 3",
                            borderColor: "var(--border)",
                            background:
                              "linear-gradient(145deg, rgba(233,230,223,0.94), rgba(217,212,204,0.88))",
                            boxShadow: "var(--shadow-soft)",
                          }}
                        >
                          {s.cover_image_url ? (
                            <>
                              <img
                                src={s.cover_image_url}
                                alt={s.title || t.untitled}
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/36 via-transparent to-white/10" />
                              <div className="absolute inset-y-0 right-0 w-[10px] bg-gradient-to-l from-white/30 to-transparent" />
                            </>
                          ) : (
                            <>
                              <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(94,99,87,0.24),rgba(217,212,204,0.9))]" />
                              <div className="absolute inset-y-0 right-0 w-[12px] bg-gradient-to-l from-white/35 to-transparent" />
                              <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                                <div className="space-y-3">
                                  <div
                                    className="text-[10px] uppercase tracking-[0.28em]"
                                    style={{ color: "var(--muted)" }}
                                  >
                                    Enkhverse
                                  </div>
                                  <div
                                    className="text-lg font-bold leading-tight"
                                    style={{ color: "var(--text)" }}
                                  >
                                    {s.title || t.untitled}
                                  </div>
                                  <div
                                    className="text-[11px]"
                                    style={{ color: "var(--muted)" }}
                                  >
                                    {t.noCover}
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        <div className="mt-3 space-y-2">
                          <div className="space-y-1">
                            <h3
                              className="line-clamp-2 text-sm font-semibold"
                              style={{ color: "var(--text)" }}
                            >
                              {s.title || t.untitled}
                            </h3>

                            {s.description ? (
                              <p
                                className="line-clamp-2 text-[11px]"
                                style={{ color: "var(--muted)" }}
                              >
                                {s.description}
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-1">
                            <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                              {t.created}: {created}
                            </p>

                            <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                              {t.publishedAt}: {publishedAt || "—"}
                            </p>
                          </div>

                          <div className="flex flex-wrap gap-2 pt-1">
                            <Link
                              href={`/${locale}/studio/series/${s.id}`}
                              className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold transition"
                              style={{
                                borderColor: "rgba(94,99,87,0.28)",
                                background: "rgba(94,99,87,0.14)",
                                color: "var(--text)",
                              }}
                            >
                              {t.openStudio}
                            </Link>

                            <Link
                              href={`/${locale}/reader/series/${s.id}/1`}
                              className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold transition"
                              style={{
                                borderColor: "rgba(94,99,87,0.28)",
                                background: "rgba(94,99,87,0.14)",
                                color: "var(--text)",
                              }}
                            >
                              {t.openReader}
                            </Link>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}