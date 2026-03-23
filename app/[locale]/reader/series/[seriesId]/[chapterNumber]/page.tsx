"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Status = "loading" | "ok" | "error";
type SupportedLocale = "en" | "mn" | "ko" | "ja";

type SeriesBaseRow = {
  id: string;
  created_at: string;
  cover_url?: string | null;
  cover_image_url?: string | null;
  published?: boolean | null;
  published_at?: string | null;
  default_locale?: string | null;
  title?: string | null;
  description?: string | null;
  views?: number | null;
};

type SeriesTranslationRow = {
  series_id: string;
  locale: SupportedLocale;
  title: string;
  description: string | null;
};

type ChapterBaseRow = {
  id: string;
  series_id: string;
  chapter_number: number;
  created_at: string;
  title: string | null;
  content: string | null;
  is_published?: boolean | null;
  published_at?: string | null;
};

type ChapterTranslationRow = {
  chapter_id: string;
  locale: SupportedLocale;
  title: string;
  script: string | null;
};

const UI_TEXT = {
  en: {
    backToReader: "Back to Reader",
    chip: "Reader • Project",
    loading: "Loading…",
    notFound: "Project or chapter not found.",
    supabaseError: "Could not load project/chapter.",
    chapter: "Chapter",
    next: "Next",
    prev: "Prev",
    createdAt: "Created",
    noContent: "No content yet for this chapter.",
    views: "views",
  },
  mn: {
    backToReader: "Уншигч руу буцах",
    chip: "Уншигч • Төсөл",
    loading: "Ачаалж байна…",
    notFound: "Төсөл эсвэл бүлэг олдсонгүй.",
    supabaseError: "Төсөл/бүлгийг ачаалж чадсангүй.",
    chapter: "Бүлэг",
    next: "Дараах",
    prev: "Өмнөх",
    createdAt: "Үүсгэсэн",
    noContent: "Энэ бүлэгт одоогоор контент алга.",
    views: "үзэлт",
  },
  ko: {
    backToReader: "리더로 돌아가기",
    chip: "리더 • 프로젝트",
    loading: "불러오는 중…",
    notFound: "프로젝트 또는 챕터를 찾을 수 없습니다.",
    supabaseError: "프로젝트/챕터를 불러올 수 없습니다.",
    chapter: "챕터",
    next: "다음",
    prev: "이전",
    createdAt: "생성일",
    noContent: "이 챕터에는 아직 내용이 없습니다.",
    views: "조회수",
  },
  ja: {
    backToReader: "リーダーへ戻る",
    chip: "リーダー • プロジェクト",
    loading: "読み込み中…",
    notFound: "プロジェクトまたはチャプターが見つかりません。",
    supabaseError: "プロジェクト/チャプターを読み込めません。",
    chapter: "チャプター",
    next: "次へ",
    prev: "前へ",
    createdAt: "作成日",
    noContent: "このチャプターにはまだ内容がありません。",
    views: "閲覧",
  },
} as const;

function normalizeLocale(raw: string): SupportedLocale {
  return (["en", "mn", "ko", "ja"].includes(raw) ? raw : "en") as SupportedLocale;
}

async function fetchSeriesTranslation(seriesId: string, locale: SupportedLocale) {
  const { data: tr1 } = await supabase
    .from("series_translations")
    .select("series_id, locale, title, description")
    .eq("series_id", seriesId)
    .eq("locale", locale)
    .maybeSingle();

  if (tr1) return tr1 as SeriesTranslationRow;

  const { data: tr2 } = await supabase
    .from("series_translations")
    .select("series_id, locale, title, description")
    .eq("series_id", seriesId)
    .eq("locale", "en")
    .maybeSingle();

  if (tr2) return tr2 as SeriesTranslationRow;

  return null;
}

async function fetchChapterTranslations(
  chapterIds: string[],
  locale: SupportedLocale
): Promise<Map<string, ChapterTranslationRow>> {
  const map = new Map<string, ChapterTranslationRow>();

  if (chapterIds.length === 0) return map;

  const { data: localeRows } = await supabase
    .from("chapter_translations")
    .select("chapter_id, locale, title, script")
    .eq("locale", locale)
    .in("chapter_id", chapterIds);

  for (const row of (localeRows as ChapterTranslationRow[] | null) || []) {
    map.set(row.chapter_id, row);
  }

  const missingIds = chapterIds.filter((id) => !map.has(id));
  if (missingIds.length === 0) return map;

  const { data: enRows } = await supabase
    .from("chapter_translations")
    .select("chapter_id, locale, title, script")
    .eq("locale", "en")
    .in("chapter_id", missingIds);

  for (const row of (enRows as ChapterTranslationRow[] | null) || []) {
    if (!map.has(row.chapter_id)) {
      map.set(row.chapter_id, row);
    }
  }

  return map;
}

export default function ReaderSeriesChapterPage() {
  const params = useParams() as Record<string, string>;
  const pathname = usePathname();

  const locale = normalizeLocale((pathname.split("/")[1] || "en") as string);
  const seriesId = params.seriesId || "";
  const chapterNumber = Number(params.chapterNumber || "1") || 1;

  const t = UI_TEXT[locale];

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  const [seriesBase, setSeriesBase] = useState<SeriesBaseRow | null>(null);
  const [seriesTr, setSeriesTr] = useState<SeriesTranslationRow | null>(null);

  const [chapters, setChapters] = useState<ChapterBaseRow[]>([]);
  const [chapterTranslations, setChapterTranslations] = useState<
    Map<string, ChapterTranslationRow>
  >(new Map());

  const [views, setViews] = useState<number>(0);

  const localeForDate = useMemo(() => {
    return locale === "mn"
      ? "mn-MN"
      : locale === "ko"
      ? "ko-KR"
      : locale === "ja"
      ? "ja-JP"
      : "en-GB";
  }, [locale]);

  const currentChapter = useMemo(() => {
    return chapters.find((c) => c.chapter_number === chapterNumber) || null;
  }, [chapters, chapterNumber]);

  const currentChapterTranslation = useMemo(() => {
    if (!currentChapter) return null;
    return chapterTranslations.get(currentChapter.id) || null;
  }, [chapterTranslations, currentChapter]);

  const currentChapterIndex = useMemo(() => {
    return chapters.findIndex((c) => c.chapter_number === chapterNumber);
  }, [chapters, chapterNumber]);

  const prevChapter = currentChapterIndex > 0 ? chapters[currentChapterIndex - 1] : null;
  const nextChapter =
    currentChapterIndex >= 0 && currentChapterIndex < chapters.length - 1
      ? chapters[currentChapterIndex + 1]
      : null;

  useEffect(() => {
    const load = async () => {
      setStatus("loading");
      setMessage("");
      setSeriesBase(null);
      setSeriesTr(null);
      setChapters([]);
      setChapterTranslations(new Map());
      setViews(0);

      if (!seriesId) {
        setStatus("error");
        setMessage(t.notFound);
        return;
      }

      const { data: s, error: sErr } = await supabase
        .from("series")
        .select(
          "id, created_at, cover_url, cover_image_url, published, published_at, default_locale, title, description, views"
        )
        .eq("id", seriesId)
        .maybeSingle();

      if (sErr || !s) {
        setStatus("error");
        setMessage(t.supabaseError);
        return;
      }

      const isSeriesPublished = Boolean(s.published) || Boolean(s.published_at);
      if (!isSeriesPublished) {
        setStatus("error");
        setMessage(t.notFound);
        return;
      }

      const seriesRow = s as SeriesBaseRow;
      setSeriesBase(seriesRow);
      setViews(Number(seriesRow.views ?? 0) + 1);

      try {
        await supabase.rpc("increment_series_views", { target_id: seriesId });
      } catch {
        try {
          const current = Number(seriesRow.views ?? 0);
          await supabase.from("series").update({ views: current + 1 }).eq("id", seriesId);
        } catch {
          // ignore
        }
      }

      const sTr = await fetchSeriesTranslation(seriesId, locale);
      setSeriesTr(sTr);

      const { data: allChapters, error: cErr } = await supabase
        .from("chapters")
        .select(
          "id, series_id, chapter_number, created_at, title, content, is_published, published_at"
        )
        .eq("series_id", seriesId)
        .order("chapter_number", { ascending: true });

      if (cErr || !allChapters) {
        setStatus("error");
        setMessage(t.supabaseError);
        return;
      }

      const publishedChapters = (allChapters as ChapterBaseRow[]).filter(
        (ch) => Boolean(ch.is_published) || Boolean(ch.published_at)
      );

      if (publishedChapters.length === 0) {
        setStatus("error");
        setMessage(t.notFound);
        return;
      }

      const foundCurrent = publishedChapters.find((ch) => ch.chapter_number === chapterNumber);
      if (!foundCurrent) {
        setStatus("error");
        setMessage(t.notFound);
        return;
      }

      setChapters(publishedChapters);

      const trMap = await fetchChapterTranslations(
        publishedChapters.map((ch) => ch.id),
        locale
      );
      setChapterTranslations(trMap);

      setStatus("ok");
    };

    load();
  }, [seriesId, chapterNumber, locale, t.notFound, t.supabaseError]);

  const homeHref = `/${locale}/reader`;
  const basePath = `/${locale}/reader/series/${seriesId}`;
  const prevHref = prevChapter ? `${basePath}/${prevChapter.chapter_number}` : null;
  const nextHref = nextChapter ? `${basePath}/${nextChapter.chapter_number}` : null;

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-[linear-gradient(to_bottom,#020617,#0f172a_35%,#111827)] text-stone-100">
        <div className="mx-auto max-w-6xl px-6 py-12">
          <p className="text-sm text-stone-300">{t.loading}</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !seriesBase || !currentChapter) {
    return (
      <main className="min-h-screen bg-[linear-gradient(to_bottom,#020617,#0f172a_35%,#111827)] text-stone-100">
        <div className="mx-auto max-w-6xl space-y-4 px-6 py-12">
          <Link
            href={homeHref}
            className="inline-flex items-center rounded-full border border-stone-700/70 bg-black/20 px-4 py-2 text-xs text-stone-200 transition hover:border-stone-500"
          >
            {t.backToReader}
          </Link>
          <p className="text-sm text-rose-300">{message || t.notFound}</p>
        </div>
      </main>
    );
  }

  const seriesTitle = seriesTr?.title || seriesBase.title || "Untitled series";
  const seriesDesc = seriesTr?.description || seriesBase.description || null;
  const coverSrc = seriesBase.cover_url || seriesBase.cover_image_url || "";

  const chapterTitle =
    currentChapterTranslation?.title ||
    currentChapter.title ||
    `${t.chapter} ${currentChapter.chapter_number}`;

  const chapterText =
    (currentChapterTranslation?.script && currentChapterTranslation.script.trim()) ||
    (currentChapter.content && currentChapter.content.trim()) ||
    "";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.08),transparent_28%),linear-gradient(to_bottom,#020617,#0f172a_35%,#111827)] text-stone-100 transition-all duration-500">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <div className="rounded-[28px] border border-slate-800 bg-slate-950/65 p-4 shadow-[0_18px_40px_rgba(0,0,0,0.35)] backdrop-blur">
              <div
                className="relative overflow-hidden rounded-[22px] border border-slate-800 bg-slate-900/70 shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
                style={{ aspectRatio: "2 / 3" }}
              >
                {coverSrc ? (
                  <>
                    <img
                      src={coverSrc}
                      alt={seriesTitle}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/72 via-black/20 to-white/10" />
                    <div className="absolute inset-y-0 right-0 w-[10px] bg-gradient-to-l from-white/10 to-transparent" />
                  </>
                ) : (
                  <>
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/25 via-slate-900 to-slate-950" />
                    <div className="absolute inset-y-0 right-0 w-[12px] bg-gradient-to-l from-white/10 to-transparent" />
                    <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                      <div className="space-y-3">
                        <div className="text-[10px] uppercase tracking-[0.28em] text-slate-300/70">
                          Enkhverse
                        </div>
                        <div className="text-lg font-bold leading-tight text-white">
                          {seriesTitle}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Link
                    href={homeHref}
                    className="inline-flex items-center rounded-full border border-slate-700 bg-black/20 px-4 py-2 text-xs text-slate-200 transition hover:border-slate-500"
                  >
                    ← {t.backToReader}
                  </Link>

                  <span className="rounded-full border border-slate-700 bg-black/20 px-3 py-1 text-[11px] text-slate-300">
                    {views.toLocaleString()} {t.views}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400">{t.chip}</p>
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-800 bg-slate-950/55 p-4 backdrop-blur">
              <h2 className="mb-2 text-sm font-semibold text-white">{seriesTitle}</h2>

              {seriesDesc && (
                <p className="mb-4 line-clamp-3 text-[12px] text-slate-400">{seriesDesc}</p>
              )}

              <div className="space-y-2">
                {chapters.map((ch) => {
                  const tr = chapterTranslations.get(ch.id);
                  const itemTitle =
                    tr?.title || ch.title || `${t.chapter} ${ch.chapter_number}`;
                  const href = `${basePath}/${ch.chapter_number}`;
                  const active = ch.chapter_number === chapterNumber;

                  return (
                    <Link
                      key={ch.id}
                      href={href}
                      className={`block rounded-2xl border px-3 py-2 text-sm transition ${
                        active
                          ? "border-emerald-400/60 bg-emerald-500/12 text-white"
                          : "border-slate-800 bg-black/20 text-slate-300 hover:border-slate-600"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate">
                          {t.chapter} {ch.chapter_number}
                        </span>
                        <span className="truncate text-[11px] opacity-80">
                          {itemTitle}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </aside>

          <section className="space-y-6">
            <header className="rounded-[28px] border border-slate-800 bg-slate-950/60 p-6 shadow-[0_18px_40px_rgba(0,0,0,0.28)] backdrop-blur">
              <div className="space-y-2">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-700 bg-black/40 px-3 py-1 text-[11px] font-medium text-slate-300">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  {t.chip}
                </span>

                <h1 className="text-3xl font-bold tracking-tight text-white">
                  {seriesTitle}
                </h1>

                <p className="text-sm text-slate-300">
                  {t.chapter} {currentChapter.chapter_number}
                  {chapterTitle ? ` · ${chapterTitle}` : ""}
                </p>

                <p className="text-[11px] text-slate-500">
                  {t.createdAt}:{" "}
                  {new Date(currentChapter.created_at).toLocaleString(localeForDate, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </header>

            <article className="rounded-[30px] border border-stone-300/10 bg-[linear-gradient(to_bottom,rgba(255,255,255,0.96),rgba(248,250,252,0.94))] p-8 text-stone-900 shadow-[0_24px_70px_rgba(0,0,0,0.26)] md:p-12">
              {chapterText ? (
                <div className="mx-auto max-w-3xl">
                  <pre className="whitespace-pre-wrap break-words font-sans text-[15px] leading-8 text-stone-800">
                    {chapterText}
                  </pre>
                </div>
              ) : (
                <p className="text-sm text-stone-500">{t.noContent}</p>
              )}
            </article>

            <div className="flex items-center justify-between gap-3">
              {prevHref ? (
                <Link
                  href={prevHref}
                  className="inline-flex items-center rounded-full border border-slate-700 bg-black/20 px-5 py-2.5 text-xs font-medium text-slate-200 transition hover:border-slate-500"
                >
                  {t.prev}
                </Link>
              ) : (
                <span className="inline-flex cursor-not-allowed items-center rounded-full border border-slate-800 bg-black/10 px-5 py-2.5 text-xs font-medium text-slate-500">
                  {t.prev}
                </span>
              )}

              {nextHref ? (
                <Link
                  href={nextHref}
                  className="inline-flex items-center rounded-full border border-emerald-400/40 bg-emerald-500/14 px-5 py-2.5 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-500/20"
                >
                  {t.next}
                </Link>
              ) : (
                <span className="inline-flex cursor-not-allowed items-center rounded-full border border-slate-800 bg-black/10 px-5 py-2.5 text-xs font-semibold text-slate-500">
                  {t.next}
                </span>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}