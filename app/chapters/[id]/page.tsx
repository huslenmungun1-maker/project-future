"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type SeriesRow = {
  id: string;
  title: string;
  language: string | null; // for UI language
};

type ChapterRow = {
  id: string;
  series_id: string;
  title: string;
  chapter_number: number;
  created_at: string;
  content: string | null;
};

// Simple translations for the CHAPTER PAGE UI
const UI_TEXT = {
  en: {
    backToSeries: "Back to series",
    homeBreadcrumb: "Project Future · Home",
    chapterDetail: "Chapter detail",
    createdAt: "Created at",
    chapterNumber: "Chapter",
    content: "Content",
    loading: "Loading chapter…",
    notFound: "Chapter not found",
  },
  mn: {
    backToSeries: "Цуврал руу буцах",
    homeBreadcrumb: "Project Future · Нүүр",
    chapterDetail: "Бүлгийн дэлгэрэнгүй",
    createdAt: "Үүсгэсэн огноо",
    chapterNumber: "Бүлэг",
    content: "Агуулга",
    loading: "Бүлгийг ачааллаж байна…",
    notFound: "Бүлэг олдсонгүй",
  },
  ko: {
    backToSeries: "시리즈로 돌아가기",
    homeBreadcrumb: "Project Future · 홈",
    chapterDetail: "챕터 상세",
    createdAt: "생성일",
    chapterNumber: "챕터",
    content: "내용",
    loading: "챕터 로딩 중…",
    notFound: "챕터를 찾을 수 없습니다",
  },
  ja: {
    backToSeries: "シリーズに戻る",
    homeBreadcrumb: "Project Future · ホーム",
    chapterDetail: "チャプター詳細",
    createdAt: "作成日時",
    chapterNumber: "チャプター",
    content: "内容",
    loading: "チャプター読み込み中…",
    notFound: "チャプターが見つかりません",
  },
} as const;

type SupportedLang = keyof typeof UI_TEXT;

export default function ChapterPage() {
  const params = useParams();
  const chapterId = (params as any)?.id as string;

  const [chapter, setChapter] = useState<ChapterRow | null>(null);
  const [series, setSeries] = useState<SeriesRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!chapterId) return;
    setLoading(true);
    setError(null);

    // 1) fetch chapter
    const { data: chapterData, error: chapterError } = await supabase
      .from("chapters")
      .select("*")
      .eq("id", chapterId)
      .single();

    if (chapterError || !chapterData) {
      setError(chapterError?.message || "Chapter not found");
      setChapter(null);
      setSeries(null);
      setLoading(false);
      return;
    }

    const ch = chapterData as ChapterRow;
    setChapter(ch);

    // 2) fetch parent series to get language + title
    const { data: seriesData, error: seriesError } = await supabase
      .from("series")
      .select("id, title, language")
      .eq("id", ch.series_id)
      .single();

    if (seriesError || !seriesData) {
      // If series not found, we still show chapter but no series link
      setSeries(null);
    } else {
      setSeries(seriesData as SeriesRow);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapterId]);

  // While loading
  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-800 text-slate-100">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <p className="text-sm text-slate-300">{UI_TEXT.en.loading}</p>
        </div>
      </main>
    );
  }

  // If completely broken
  if (error || !chapter) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <Link
          href="/"
          className="mb-4 inline-block text-xs text-slate-400 hover:text-emerald-300"
        >
          ← {UI_TEXT.en.backToSeries}
        </Link>
        <p className="text-sm text-rose-300">
          {UI_TEXT.en.notFound}
          {error ? `: ${error}` : ""}
        </p>
      </main>
    );
  }

  // Decide what language to use for UI
  const langCode: SupportedLang =
    (series?.language as SupportedLang) && UI_TEXT[series?.language as SupportedLang]
      ? (series?.language as SupportedLang)
      : "en";

  const t = UI_TEXT[langCode];

  const localeForDate =
    langCode === "mn"
      ? "mn-MN"
      : langCode === "ko"
      ? "ko-KR"
      : langCode === "ja"
      ? "ja-JP"
      : "en-GB";

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-800 text-slate-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-6 px-6 py-10">
        {/* Breadcrumbs */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-1 hover:text-slate-100"
            >
              <span className="text-lg">←</span>
              {t.homeBreadcrumb}
            </Link>
            {series && (
              <>
                <span className="text-slate-500">/</span>
                <Link
                  href={`/series/${series.id}`}
                  className="hover:text-slate-100"
                >
                  {series.title}
                </Link>
              </>
            )}
          </div>
          {series?.language && (
            <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300">
              {series.language.toUpperCase()}
            </span>
          )}
        </div>

        {/* Header */}
        <section className="space-y-2">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-700 bg-black/40 px-3 py-1 text-[11px] font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {t.chapterDetail}
          </span>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            #{chapter.chapter_number} · {chapter.title}
          </h1>

          <p className="text-[11px] text-slate-500">
            {t.createdAt}:{" "}
            {new Date(chapter.created_at).toLocaleString(localeForDate, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </section>

        {/* Content */}
        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
          <h2 className="mb-2 text-sm font-semibold text-slate-100">
            {t.content}
          </h2>
          {chapter.content ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100">
              {chapter.content}
            </p>
          ) : (
            <p className="text-xs text-slate-400">
              (No content yet. You can store your script or story text here.)
            </p>
          )}
        </section>
      </div>
    </main>
  );
}
