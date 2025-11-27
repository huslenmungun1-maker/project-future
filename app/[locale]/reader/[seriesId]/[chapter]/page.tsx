"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Status = "loading" | "ok" | "error";

type SeriesRow = {
  id: string;
  title: string;
  description: string | null;
};

type ChapterRow = {
  id: string;
  series_id: string;
  title: string;
  chapter_number: number | null;
  created_at?: string;
  page_count?: number | null;
};

const FALLBACK_TOTAL_PAGES = 12;

export default function ReaderDynamicPage() {
  const params = useParams();
  const router = useRouter();

  const locale = ((params?.locale as string) || "en") as string;
  const seriesId = params?.seriesId as string;
  const chapterParam = params?.chapter as string;
  const chapterNumber = Number(chapterParam) || 1;

  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);

  const [series, setSeries] = useState<SeriesRow | null>(null);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [currentChapter, setCurrentChapter] = useState<ChapterRow | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(FALLBACK_TOTAL_PAGES);

  useEffect(() => {
    if (!seriesId) {
      setStatus("error");
      setError("Missing seriesId in URL.");
      return;
    }

    async function fetchData() {
      setStatus("loading");
      setError(null);

      // 1) Load series – NO .single(), just take first row
      const { data: seriesList, error: seriesError } = await supabase
        .from("series")
        .select("id, title, description")
        .eq("id", seriesId);

      if (seriesError) {
        console.error("Series error:", seriesError);
        setStatus("error");
        setError(seriesError.message || "Failed to load series.");
        return;
      }

      const seriesData = (seriesList || [])[0] as SeriesRow | undefined;

      if (!seriesData) {
        console.warn("Series not found for id:", seriesId);
        setStatus("error");
        setError("Series not found in Supabase.");
        return;
      }

      // 2) Load all chapters for this series
      const { data: chaptersData, error: chaptersError } = await supabase
        .from("chapters")
        .select("*")
        .eq("series_id", seriesId)
        .order("chapter_number", { ascending: true });

      if (chaptersError) {
        console.error("Chapters error:", chaptersError);
        setStatus("error");
        setError(chaptersError.message || "Failed to load chapters.");
        return;
      }

      if (!chaptersData || chaptersData.length === 0) {
        setStatus("error");
        setError("No chapters found for this series yet.");
        return;
      }

      // 3) Pick current chapter
      let chapter =
        chaptersData.find(
          (ch) => (ch.chapter_number ?? 0) === chapterNumber
        ) ?? chaptersData[0];

      const pagesForChapter =
        (chapter.page_count ?? undefined) || FALLBACK_TOTAL_PAGES;

      setSeries(seriesData);
      setChapters(chaptersData);
      setCurrentChapter(chapter);
      setTotalPages(pagesForChapter);
      setCurrentPage(1);
      setStatus("ok");
    }

    fetchData();
  }, [seriesId, chapterNumber]);

  // ------ navigation helpers ------

  function goToChapter(targetChapterNumber: number) {
    if (!seriesId) return;
    router.push(`/${locale}/reader/${seriesId}/${targetChapterNumber}`);
  }

  function goToPrevChapter() {
    if (!currentChapter || !currentChapter.chapter_number) return;
    const prevChapterNumber = currentChapter.chapter_number - 1;
    const hasPrev = chapters.some(
      (ch) => (ch.chapter_number ?? 0) === prevChapterNumber
    );
    if (hasPrev) goToChapter(prevChapterNumber);
  }

  function goToNextChapter() {
    if (!currentChapter || !currentChapter.chapter_number) return;
    const nextChapterNumber = currentChapter.chapter_number + 1;
    const hasNext = chapters.some(
      (ch) => (ch.chapter_number ?? 0) === nextChapterNumber
    );
    if (hasNext) goToChapter(nextChapterNumber);
  }

  function goToPage(page: number) {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  }

  const imageSrc =
    currentChapter && currentChapter.chapter_number
      ? `/reader-images/${seriesId}/${currentChapter.chapter_number}/${currentPage}.jpg`
      : "";

  // ------ UI states ------

  if (status === "loading") {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-neutral-500">Loading chapter…</p>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-red-500">
          {error || "Something went wrong while loading this chapter."}
        </p>
        <Link
          href={`/${locale}`}
          className="text-xs underline text-neutral-500 hover:text-neutral-800"
        >
          Go back home
        </Link>
      </main>
    );
  }

  if (!series || !currentChapter) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-neutral-500">
          This chapter could not be found.
        </p>
        <Link
          href={`/${locale}`}
          className="text-xs underline text-neutral-500 hover:text-neutral-800"
        >
          Go back home
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col bg-neutral-950 text-neutral-100">
      {/* Header */}
      <header className="w-full border-b border-neutral-800 px-4 py-3 flex items-center justify-between">
        <div className="flex flex-col">
          <Link
            href={`/${locale}`}
            className="text-xs text-neutral-400 hover:text-neutral-200"
          >
            ← Back to Home
          </Link>
          <h1 className="text-lg font-semibold mt-1">{series.title}</h1>
          <p className="text-[11px] text-neutral-400">
            Chapter {currentChapter.chapter_number ?? "?"}:{" "}
            {currentChapter.title}
          </p>
        </div>
        <div className="flex flex-col items-end text-[11px] text-neutral-400">
          <span>
            Pages: {currentPage} / {totalPages}
          </span>
          <span>
            Total chapters:{" "}
            {chapters.filter((ch) => ch.chapter_number != null).length}
          </span>
        </div>
      </header>

      {/* Reader body */}
      <section className="flex-1 flex flex-col items-center justify-center px-2 py-4 gap-4">
        <div className="w-full max-w-3xl aspect-[3/4] bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden flex items-center justify-center">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt={`Page ${currentPage} of chapter ${
                currentChapter.chapter_number ?? ""
              }`}
              className="w-full h-full object-contain"
            />
          ) : (
            <p className="text-xs text-neutral-500">
              No image configured yet. Hook this to your storage later.
            </p>
          )}
        </div>

        {/* Page controls */}
        <div className="flex items-center justify-center gap-3 text-xs">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="px-3 py-1 rounded border border-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Prev page
          </button>
          <span className="text-neutral-400">
            Page {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 rounded border border-neutral-700 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next page
          </button>
        </div>

        {/* Chapter controls */}
        <div className="flex items-center justify-center gap-3 text-xs mt-2">
          <button
            onClick={goToPrevChapter}
            className="px-3 py-1 rounded border border-neutral-700 disabled:opacity-40"
            disabled={
              !chapters.some(
                (ch) =>
                  (ch.chapter_number ?? 0) ===
                  (currentChapter.chapter_number ?? 0) - 1
              )
            }
          >
            ← Prev chapter
          </button>
          <span className="text-neutral-500">
            Chapter {currentChapter.chapter_number ?? "?"}
          </span>
          <button
            onClick={goToNextChapter}
            className="px-3 py-1 rounded border border-neutral-700 disabled:opacity-40"
            disabled={
              !chapters.some(
                (ch) =>
                  (ch.chapter_number ?? 0) ===
                  (currentChapter.chapter_number ?? 0) + 1
              )
            }
          >
            Next chapter →
          </button>
        </div>
      </section>
    </main>
  );
}
