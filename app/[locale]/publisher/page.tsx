"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Status = "loading" | "ok" | "error";

type SeriesRow = {
  id: string;
  created_at: string;
  title: string | null;
  description: string | null;
  cover_image_url: string | null;

  // publish flags (your schema seems to have these)
  published: boolean | null;
  published_at: string | null;
};

const UI_TEXT = {
  en: {
    title: "Publisher",
    subtitle: "Owner tools (keep this minimal). Studio is for creating. Publisher is for controlling published content.",
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
  },
  mn: {
    title: "Publisher",
    subtitle: "Эзэмшигчийн хэрэгсэл. Studio — бүтээхэд, Publisher — нийтлэгдсэнийг удирдахад.",
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
  },
  ko: {
    title: "Publisher",
    subtitle: "오너 전용 도구. Studio는 생성, Publisher는 발행된 콘텐츠 관리.",
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
  },
  ja: {
    title: "Publisher",
    subtitle: "オーナー用ツール。Studioは作成、Publisherは公開済みの管理。",
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
  const [message, setMessage] = useState<string>("");
  const [items, setItems] = useState<SeriesRow[]>([]);
  const [isAuthed, setIsAuthed] = useState<boolean>(false);

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
    const load = async () => {
      setStatus("loading");
      setMessage("");
      setItems([]);

      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) {
        setIsAuthed(false);
        setStatus("error");
        setMessage(t.notLoggedIn);
        return;
      }

      setIsAuthed(true);

      const { data, error } = await supabase
        .from("series")
        .select("id, created_at, title, description, cover_image_url, published, published_at")
        .order("created_at", { ascending: false });

      if (error) {
        setStatus("error");
        setMessage(`${t.error} (${error.message})`);
        return;
      }

      const list = (data as SeriesRow[]) || [];
      // keep publisher focused: only published items
      const published = list.filter((s) => Boolean(s.published) || Boolean(s.published_at));
      setItems(published);
      setStatus("ok");
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

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
                  Go to login
                </Link>
              </div>
            )}
          </div>
        )}

        {status === "ok" && (
          <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">{t.publishedOnly}</h2>
              <span className="text-xs text-slate-400">{items.length} items</span>
            </div>

            {items.length === 0 ? (
              <p className="text-sm text-slate-400">{t.none}</p>
            ) : (
              <ul className="space-y-3">
                {items.map((s) => {
                  const created = new Date(s.created_at).toLocaleString(localeForDate, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  });

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