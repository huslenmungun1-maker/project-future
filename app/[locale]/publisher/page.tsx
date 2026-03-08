"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  },
} as const;

type SupportedLocale = keyof typeof UI_TEXT;

function normalizeLocale(raw: string): SupportedLocale {
  return (["en", "mn", "ko", "ja"].includes(raw) ? raw : "en") as SupportedLocale;
}

export default function PublisherPage() {
  const params = useParams();
  const router = useRouter();
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
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold tracking-tight">{t.title}</h1>
            <p className="text-sm text-slate-300 max-w-2xl">{t.subtitle}</p>
          </div>

          <Link
            href={`/${locale}`}
            className="text-xs text-slate-400 hover:text-emerald-200"
          >
            ← {t.backHome}
          </Link>
        </div>

        {status === "loading" && (
          <p className="text-sm text-slate-300">{t.loading}</p>
        )}

        {status === "error" && (
          <div className="rounded-2xl border border-slate-800 bg-black/40 p-4">
            <p className="text-sm text-rose-300">{message}</p>
            {!isAuthed && (
              <div className="mt-3">
                <Link
                  href={`/${locale}/login`}
                  className="inline-flex rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-xs text-slate-200 hover:border-emerald-400 hover:text-emerald-200"
                >
                  {t.login}
                </Link>
              </div>
            )}
          </div>
        )}

        {status === "ok" && (
          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">
                {t.publishedOnly}
              </h2>
              <span className="text-xs text-slate-400">{items.length} items</span>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-slate-400">{t.none}</p>
            ) : (
              <ul className="space-y-3">
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
                    <li
                      key={s.id}
                      className="rounded-2xl border border-slate-800 bg-black/40 p-4 space-y-2 hover:border-emerald-400/60"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <h3 className="text-base font-bold text-slate-50 truncate">
                            {s.title || "Untitled series"}
                          </h3>

                          {s.description && (
                            <p className="text-sm text-slate-300 line-clamp-2">
                              {s.description}
                            </p>
                          )}

                          <p className="mt-2 text-[11px] text-slate-500">
                            {t.created}: {created}
                            {publishedAt ? ` · ${t.publishedAt}: ${publishedAt}` : ""}
                          </p>
                        </div>

                        <div className="flex shrink-0 flex-col gap-2">
                          <Link
                            href={`/${locale}/studio/series/${s.id}`}
                            className="rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-xs text-slate-200 hover:border-emerald-400 hover:text-emerald-200 text-center"
                          >
                            {t.openStudio}
                          </Link>

                          <Link
                            href={`/${locale}/reader/series/${s.id}/1`}
                            className="rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-xs text-slate-200 hover:border-emerald-400 hover:text-emerald-200 text-center"
                          >
                            {t.openReader}
                          </Link>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}
      </div>
    </main>
  );
}