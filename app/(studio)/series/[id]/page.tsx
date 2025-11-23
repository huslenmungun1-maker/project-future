"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CoverImageUploader from "@/components/studio/CoverImageUploader";

type SeriesRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  cover_image_url: string | null;
  language: string | null;      // 👈 important
};

type ChapterRow = {
  id: string;
  series_id: string;
  title: string;
  chapter_number: number;
  created_at: string;
  content: string | null;
};

/**
 * Simple UI translation dictionary.
 * Keys = language code stored in `series.language`
 * Fallback will be EN.
 */
const UI_TEXT = {
  en: {
    backToAllSeries: "Back to all projects",
    homeBreadcrumb: "Project Future · Home",
    seriesDetail: "Project detail",
    editSeries: "Edit project",
    editSeriesInfo: "Edit project info",
    idLabel: "ID",
    createdAt: "Created at",
    seriesCover: "Project cover",
    coverHelp:
      "Upload a cover image for this project. This will be used later on listings and reader pages.",
    addChapter: "Add a new chapter",
    chapterTitle: "Chapter title",
    chapterNumber: "Chapter number",
    contentScript: "Content / script",
    chaptersTitle: "Chapters",
    noChapters: "No chapters yet. Create your first chapter on the left.",
    saving: "Saving…",
    save: "Save",
    cancel: "Cancel",
  },
  mn: {
    backToAllSeries: "Бүх төслүүд рүү буцах",
    homeBreadcrumb: "Project Future · Нүүр",
    seriesDetail: "Төслийн дэлгэрэнгүй",
    editSeries: "Төслийг засах",
    editSeriesInfo: "Төслийн мэдээллийг засах",
    idLabel: "ID",
    createdAt: "Үүсгэсэн огноо",
    seriesCover: "Нүүр зураг",
    coverHelp:
      "Энэ төслийн нүүр зургийг байршуулна уу. Дараа нь жагсаалт болон уншигчийн хуудсан дээр ашиглагдана.",
    addChapter: "Шинэ бүлэг нэмэх",
    chapterTitle: "Бүлгийн гарчиг",
    chapterNumber: "Бүлгийн дугаар",
    contentScript: "Агуулга / скрипт",
    chaptersTitle: "Бүлгүүд",
    noChapters:
      "Одоогоор бүлэг алга. Зүүн талаас анхны бүлгээ үүсгээрэй.",
    saving: "Хадгалж байна…",
    save: "Хадгалах",
    cancel: "Цуцлах",
  },
  ko: {
    backToAllSeries: "모든 프로젝트로 돌아가기",
    homeBreadcrumb: "Project Future · 홈",
    seriesDetail: "프로젝트 상세",
    editSeries: "프로젝트 편집",
    editSeriesInfo: "프로젝트 정보 편집",
    idLabel: "ID",
    createdAt: "생성일",
    seriesCover: "표지 이미지",
    coverHelp:
      "이 프로젝트의 표지 이미지를 업로드하세요. 목록과 리더 페이지에서 사용됩니다.",
    addChapter: "새 챕터 추가",
    chapterTitle: "챕터 제목",
    chapterNumber: "챕터 번호",
    contentScript: "내용 / 스크립트",
    chaptersTitle: "챕터",
    noChapters:
      "아직 챕터가 없습니다. 왼쪽에서 첫 챕터를 만들어 보세요.",
    saving: "저장 중…",
    save: "저장",
    cancel: "취소",
  },
  ja: {
    backToAllSeries: "すべてのプロジェクトに戻る",
    homeBreadcrumb: "Project Future · ホーム",
    seriesDetail: "プロジェクト詳細",
    editSeries: "プロジェクトを編集",
    editSeriesInfo: "プロジェクト情報を編集",
    idLabel: "ID",
    createdAt: "作成日時",
    seriesCover: "表紙画像",
    coverHelp:
      "このプロジェクトの表紙画像をアップロードしてください。 一覧やリーダーページで使われます。",
    addChapter: "新しいチャプターを追加",
    chapterTitle: "チャプタータイトル",
    chapterNumber: "チャプター番号",
    contentScript: "内容 / スクリプト",
    chaptersTitle: "チャプター",
    noChapters:
      "まだチャプターがありません。左側で最初のチャプターを作成してください。",
    saving: "保存中…",
    save: "保存",
    cancel: "キャンセル",
  },
} as const;

type SupportedLang = keyof typeof UI_TEXT;

export default function SeriesDetailPage() {
  const params = useParams();
  const seriesId = (params as any)?.id as string;

  const [series, setSeries] = useState<SeriesRow | null>(null);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ---- SERIES EDIT STATE (title + description) ----
  const [editingMeta, setEditingMeta] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);

  // ---- CHAPTER CREATE STATE ----
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!seriesId) return;
    setLoading(true);
    setError(null);

    const [
      { data: seriesData, error: seriesError },
      { data: chaptersData, error: chaptersError },
    ] = await Promise.all([
      supabase.from("series").select("*").eq("id", seriesId).single(),
      supabase
        .from("chapters")
        .select("*")
        .eq("series_id", seriesId)
        .order("chapter_number", { ascending: true }),
    ]);

    if (seriesError) {
      setError(seriesError.message);
      setSeries(null);
    } else {
      setSeries(seriesData as SeriesRow);
    }

    if (chaptersError) {
      setError(chaptersError.message);
      setChapters([]);
    } else {
      setChapters((chaptersData as ChapterRow[]) || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId]);

  // keep draft title/description in sync when series changes
  useEffect(() => {
    if (series) {
      setDraftTitle(series.title);
      setDraftDescription(series.description ?? "");
    }
  }, [series]);

  // ---- SAVE SERIES META (TITLE + DESCRIPTION) ----
  const handleSaveMeta = async () => {
    if (!series || savingMeta) return;

    const trimmedTitle = draftTitle.trim();
    const trimmedDesc = draftDescription.trim();

    if (!trimmedTitle) {
      alert("Title cannot be empty.");
      return; // (this alert is fine to stay EN for now)
    }

    setSavingMeta(true);

    const { data, error } = await supabase
      .from("series")
      .update({
        title: trimmedTitle,
        description: trimmedDesc || null,
      })
      .eq("id", series.id)
      .select("*");

    if (error) {
      console.error("Update series error:", error);
      alert("Failed to update series: " + error.message);
      setSavingMeta(false);
      return;
    }

    if (!data || data.length === 0) {
      alert("Failed to update series: no rows returned");
      setSavingMeta(false);
      return;
    }

    setSeries(data[0] as SeriesRow);
    setEditingMeta(false);
    setSavingMeta(false);
  };

  // ---- CREATE CHAPTER ----
  const handleCreateChapter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chapterTitle.trim()) {
      setCreateError("Chapter title is required.");
      return;
    }
    if (!chapterNumber.trim()) {
      setCreateError("Chapter number is required.");
      return;
    }

    const numberValue = Number(chapterNumber);
    if (Number.isNaN(numberValue) || numberValue <= 0) {
      setCreateError("Chapter number must be a positive number.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    const { error } = await supabase.from("chapters").insert([
      {
        series_id: seriesId,
        title: chapterTitle.trim(),
        chapter_number: numberValue,
        content: chapterContent.trim() || null,
      },
    ]);

    if (error) {
      setCreateError(error.message);
    } else {
      setChapterTitle("");
      setChapterNumber("");
      setChapterContent("");
      await fetchData();
    }

    setCreating(false);
  };

  // ---- EARLY RENDERS ----
  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-800 text-slate-100">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <p className="text-sm text-slate-300">Loading project…</p>
        </div>
      </main>
    );
  }

  if (error || !series) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <Link
          href="/"
          className="mb-4 inline-block text-xs text-slate-400 hover:text-emerald-300"
        >
          ← Back to home
        </Link>
        <p className="text-sm text-rose-300">
          Project not found{error ? `: ${error}` : ""}.
        </p>
      </main>
    );
  }

  // ---- LANGUAGE / TEXT SELECTION ----
  const langCode: SupportedLang =
    (series.language as SupportedLang) && UI_TEXT[series.language as SupportedLang]
      ? (series.language as SupportedLang)
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
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <Link
            href="/"
            className="inline-flex items-center gap-1 hover:text-slate-100"
          >
            <span className="text-lg">←</span>
            {t.backToAllSeries}
          </Link>
          <Link href="/" className="hover:text-slate-100">
            {t.homeBreadcrumb}
          </Link>
        </div>

        {/* SERIES HEADER + EDIT META */}
        <section className="space-y-3">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-700 bg-black/40 px-3 py-1 text-[11px] font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {t.seriesDetail}
            {series.language && (
              <span className="ml-2 rounded-full border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300">
                {series.language.toUpperCase()}
              </span>
            )}
          </span>

          {!editingMeta ? (
            <>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                    {series.title}
                  </h1>
                  {series.description && (
                    <p className="max-w-xl text-sm text-slate-300">
                      {series.description}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setEditingMeta(true)}
                  className="mt-1 text-[11px] px-3 py-1 rounded-md border border-slate-600
                             text-slate-200 hover:border-emerald-400 hover:text-emerald-300 transition"
                >
                  {t.editSeries}
                </button>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">
                  {t.editSeriesInfo}
                </h2>
                <span className="text-[11px] text-slate-400">
                  {t.idLabel}: {series.id.slice(0, 8)}…
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-300">Title</label>
                  <input
                    className="rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="Series title"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-300">Description</label>
                  <textarea
                    className="h-24 rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                    value={draftDescription}
                    onChange={(e) => setDraftDescription(e.target.value)}
                    placeholder="Short summary of your world..."
                  />
                </div>

                <div className="flex items-center gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleSaveMeta}
                    disabled={savingMeta}
                    className="text-[11px] px-3 py-1 rounded-md bg-emerald-500 text-black
                               hover:bg-emerald-400 transition disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {savingMeta ? t.saving : t.save}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraftTitle(series.title);
                      setDraftDescription(series.description ?? "");
                      setEditingMeta(false);
                    }}
                    className="text-[11px] px-3 py-1 rounded-md border border-slate-600 text-slate-300 hover:border-slate-400"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            </div>
          )}

          <p className="text-[11px] text-slate-500">
            {t.createdAt}:{" "}
            {new Date(series.created_at).toLocaleString(localeForDate, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </section>

        {/* COVER IMAGE SECTION */}
        <section className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-100">
              {t.seriesCover}
            </h2>
            <CoverImageUploader
              seriesId={series.id}
              initialUrl={series.cover_image_url}
            />
          </div>
          <div className="self-center text-xs text-slate-400">
            <p>{t.coverHelp}</p>
          </div>
        </section>

        {/* CREATE CHAPTER + LIST */}
        <section className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)]">
          {/* Create chapter */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-100">
              {t.addChapter}
            </h2>
            <form
              className="flex flex-col gap-3"
              onSubmit={handleCreateChapter}
            >
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">
                  {t.chapterTitle}
                </label>
                <input
                  className="rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                  placeholder="e.g. Episode 1"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">
                  {t.chapterNumber}
                </label>
                <input
                  className="rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                  placeholder="e.g. 1"
                  value={chapterNumber}
                  onChange={(e) => setChapterNumber(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">
                  {t.contentScript}
                </label>
                <textarea
                  className="h-32 rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                  placeholder="Write the script or notes for this chapter..."
                  value={chapterContent}
                  onChange={(e) => setChapterContent(e.target.value)}
                />
              </div>

              {createError && (
                <p className="text-xs text-rose-300">⚠️ {createError}</p>
              )}

              <button
                type="submit"
                disabled={creating}
                className="mt-1 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {creating ? "Creating…" : t.addChapter}
              </button>
            </form>
          </div>

          {/* Chapter list */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-100">
              {t.chaptersTitle}
            </h2>

            {chapters.length === 0 && (
              <p className="text-xs text-slate-400">{t.noChapters}</p>
            )}

            {chapters.length > 0 && (
              <ul className="flex flex-col gap-3">
                {chapters.map((c) => (
                  <li
                    key={c.id}
                    className="rounded-xl border border-slate-800 bg-black/40 px-0 py-0 hover:border-emerald-400/70"
                  >
                    <Link href={`/chapters/${c.id}`} className="block px-4 py-3">
                      <p className="font-semibold text-slate-50 text-sm">
                        #{c.chapter_number} · {c.title}
                      </p>
                      {c.content && (
                        <p className="mt-1 text-[11px] text-slate-300 line-clamp-2">
                          {c.content}
                        </p>
                      )}
                      <p className="mt-1 text-[10px] text-slate-500">
                        {t.createdAt}:{" "}
                        {new Date(c.created_at).toLocaleString(localeForDate, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
