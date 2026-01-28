"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import CoverImageUploader from "@/components/studio/CoverImageUploader";

/* ================= TYPES ================= */

type SeriesRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  cover_image_url: string | null;
  language: string | null;

  // publish fields
  published: boolean;
  published_at: string | null;
};

type ChapterRow = {
  id: string;
  series_id: string;
  title: string;
  chapter_number: number;
  content: string | null;
  created_at: string;
};

/* ================= UI TEXT ================= */

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
    retry: "Retry",
    delete: "Delete",
    confirmDelete: "Delete this chapter? This cannot be undone.",
    loading: "Loading project…",
    projectNotFound: "Project not found",
    titleEmpty: "Title cannot be empty.",
    chapterTitleRequired: "Chapter title is required.",
    chapterNumberRequired: "Chapter number is required.",
    chapterNumberInvalid: "Chapter number must be a positive whole number.",
    seriesIdMissing: "Series ID is missing. Refresh the page and try again.",
    create: "Creating…",
    added: "Chapter added ✅",
    deleted: "Chapter deleted ✅",
    deleteFailed: "Failed to delete chapter: ",

    // publish
    publish: "Publish",
    unpublish: "Unpublish",
    draft: "Draft",
    published: "Published",
    confirmUnpublish: "Unpublish this project? Readers won’t see it anymore.",
    publishUpdateFailed: "Publish update failed: ",
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
    retry: "Дахин оролдох",
    delete: "Устгах",
    confirmDelete: "Энэ бүлгийг устгах уу? Буцаах боломжгүй.",
    loading: "Төслийг ачаалж байна…",
    projectNotFound: "Төсөл олдсонгүй",
    titleEmpty: "Гарчиг хоосон байж болохгүй.",
    chapterTitleRequired: "Бүлгийн гарчиг шаардлагатай.",
    chapterNumberRequired: "Бүлгийн дугаар шаардлагатай.",
    chapterNumberInvalid:
      "Бүлгийн дугаар нь 1,2,3… гэсэн бүхэл тоо байх ёстой.",
    seriesIdMissing:
      "Series ID алга байна. Page-аа refresh хийгээд дахин оролдоорой.",
    create: "Үүсгэж байна…",
    added: "Бүлэг нэмэгдлээ ✅",
    deleted: "Бүлэг устгагдлаа ✅",
    deleteFailed: "Устгаж чадсангүй: ",

    publish: "Нийтлэх",
    unpublish: "Буцааж нуух",
    draft: "Ноорог",
    published: "Нийтлэгдсэн",
    confirmUnpublish: "Энэ төслийг нийтлэлээс буулгах уу? Уншигчид харахгүй.",
    publishUpdateFailed: "Нийтлэл шинэчлэлт амжилтгүй: ",
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
    retry: "다시 시도",
    delete: "삭제",
    confirmDelete: "이 챕터를 삭제할까요? 되돌릴 수 없습니다.",
    loading: "프로젝트 불러오는 중…",
    projectNotFound: "프로젝트를 찾을 수 없습니다",
    titleEmpty: "제목은 비울 수 없습니다.",
    chapterTitleRequired: "챕터 제목이 필요합니다.",
    chapterNumberRequired: "챕터 번호가 필요합니다.",
    chapterNumberInvalid:
      "챕터 번호는 1,2,3… 같은 양의 정수여야 합니다.",
    seriesIdMissing: "Series ID가 없습니다. 새로고침 후 다시 시도하세요.",
    create: "생성 중…",
    added: "챕터 추가 완료 ✅",
    deleted: "챕터 삭제 완료 ✅",
    deleteFailed: "삭제 실패: ",

    publish: "게시",
    unpublish: "게시 해제",
    draft: "초안",
    published: "게시됨",
    confirmUnpublish: "게시를 해제할까요? 리더에서 보이지 않아요.",
    publishUpdateFailed: "게시 업데이트 실패: ",
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
    retry: "再試行",
    delete: "削除",
    confirmDelete: "このチャプターを削除しますか？元に戻せません。",
    loading: "読み込み中…",
    projectNotFound: "プロジェクトが見つかりません",
    titleEmpty: "タイトルは空にできません。",
    chapterTitleRequired: "チャプタータイトルが必要です。",
    chapterNumberRequired: "チャプター番号が必要です。",
    chapterNumberInvalid:
      "チャプター番号は正の整数（1,2,3…）にしてください。",
    seriesIdMissing: "Series ID がありません。更新して再試行してください。",
    create: "作成中…",
    added: "チャプター追加 ✅",
    deleted: "チャプター削除 ✅",
    deleteFailed: "削除に失敗しました: ",

    publish: "公開",
    unpublish: "非公開",
    draft: "下書き",
    published: "公開中",
    confirmUnpublish: "非公開にしますか？読者に表示されません。",
    publishUpdateFailed: "公開更新に失敗: ",
  },
} as const;

type Lang = keyof typeof UI_TEXT;

/* ================= PAGE ================= */

export default function SeriesDetailPage() {
  const params = useParams();

  // Support both [id] and [seriesId] folder names
  const seriesId =
    (params?.id as string) ||
    (params?.seriesId as string) ||
    (params?.seriesID as string) ||
    "";

  const localeRaw = (params?.locale as string) || "en";
  const locale = (["en", "mn", "ko", "ja"].includes(localeRaw) ? localeRaw : "en") as Lang;

  const [series, setSeries] = useState<SeriesRow | null>(null);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [loading, setLoading] = useState(true);

  // editable meta
  const [editingMeta, setEditingMeta] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);

  // create chapter
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // publish
  const [togglingPublish, setTogglingPublish] = useState(false);

  // messages you will ACTUALLY see on screen
  const [pageError, setPageError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const currentLang: Lang = useMemo(() => {
    const lang = series?.language as Lang | null;
    if (lang && UI_TEXT[lang]) return lang;
    return locale;
  }, [series?.language, locale]);

  const t = UI_TEXT[currentLang];

  const localeForDate = useMemo(() => {
    const lang = currentLang;
    return lang === "mn"
      ? "mn-MN"
      : lang === "ko"
      ? "ko-KR"
      : lang === "ja"
      ? "ja-JP"
      : "en-GB";
  }, [currentLang]);

  async function reloadAll() {
    setLoading(true);
    setPageError(null);
    setActionMsg(null);

    if (!seriesId) {
      setPageError(t.seriesIdMissing);
      setSeries(null);
      setChapters([]);
      setLoading(false);
      return;
    }

    try {
      const { data: s, error: sErr } = await supabase
        .from("series")
        .select("*")
        .eq("id", seriesId)
        .single();

      if (sErr) {
        setPageError(`Series load failed: ${sErr.message}`);
        setSeries(null);
        setChapters([]);
        setLoading(false);
        return;
      }

      const { data: c, error: cErr } = await supabase
        .from("chapters")
        .select("*")
        .eq("series_id", seriesId)
        .order("chapter_number", { ascending: true });

      if (cErr) {
        setPageError(`Chapters load failed: ${cErr.message}`);
        setSeries(s as SeriesRow);
        setChapters([]);
        setLoading(false);
        return;
      }

      setSeries(s as SeriesRow);
      setDraftTitle((s as SeriesRow).title);
      setDraftDescription((s as SeriesRow).description ?? "");
      setChapters((c as ChapterRow[]) || []);
      setLoading(false);
    } catch (e: any) {
      setPageError(e?.message || "Unknown load error.");
      setLoading(false);
    }
  }

  useEffect(() => {
    reloadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId]);

  // keep draft meta in sync
  useEffect(() => {
    if (series) {
      setDraftTitle(series.title);
      setDraftDescription(series.description ?? "");
    }
  }, [series]);

  async function saveMeta() {
    if (!series || savingMeta) return;

    const titleTrim = draftTitle.trim();
    const descTrim = draftDescription.trim();

    if (!titleTrim) {
      alert(t.titleEmpty);
      return;
    }

    setSavingMeta(true);
    setActionMsg(null);

    try {
      const { data, error } = await supabase
        .from("series")
        .update({
          title: titleTrim,
          description: descTrim || null,
        })
        .eq("id", series.id)
        .select()
        .single();

      if (error) {
        setActionMsg(`Save failed: ${error.message}`);
        setSavingMeta(false);
        return;
      }

      if (data) {
        setSeries(data as SeriesRow);
        setActionMsg("Saved ✅");
        setEditingMeta(false);
      }
    } catch (e: any) {
      setActionMsg(e?.message || "Save failed: unknown error.");
    } finally {
      setSavingMeta(false);
    }
  }

  async function updateLanguage(nextLang: Lang) {
    if (!series) return;

    const prev = series;
    setSeries({ ...series, language: nextLang });
    setActionMsg(null);

    const { data, error } = await supabase
      .from("series")
      .update({ language: nextLang })
      .eq("id", series.id)
      .select()
      .single();

    if (error) {
      setSeries(prev);
      setActionMsg(`Language update failed: ${error.message}`);
      return;
    }

    if (data) setSeries(data as SeriesRow);
  }

  async function togglePublish() {
    if (!series || togglingPublish) return;

    const next = !Boolean(series.published);

    if (!next) {
      const ok = confirm(t.confirmUnpublish);
      if (!ok) return;
    }

    setTogglingPublish(true);
    setActionMsg(null);

    const { data, error } = await supabase
      .from("series")
      .update({
        published: next,
        published_at: next ? new Date().toISOString() : null,
      })
      .eq("id", series.id)
      .select()
      .single();

    if (error) {
      setActionMsg(t.publishUpdateFailed + error.message);
      setTogglingPublish(false);
      return;
    }

    setSeries(data as SeriesRow);
    setActionMsg(next ? `${t.published} ✅` : `${t.draft} ✅`);
    setTogglingPublish(false);
  }

async function createChapter() {
  setActionMsg(null);
  setCreateError(null);

  const titleTrim = chapterTitle.trim();
  const numRaw = chapterNumber.trim();

  if (!seriesId) {
    setCreateError(t.seriesIdMissing);
    return;
  }

  if (!titleTrim) {
    setCreateError(t.chapterTitleRequired);
    return;
  }

  if (!numRaw) {
    setCreateError(t.chapterNumberRequired);
    return;
  }

  const num = Number(numRaw);
  if (!Number.isInteger(num) || num <= 0) {
    setCreateError(t.chapterNumberInvalid);
    return;
  }

  setCreating(true);

  try {
    const scriptTrim = chapterContent.trim();

    // 1) Create chapter base (NO title, NO content here)
    const { data: ch, error: chErr } = await supabase
      .from("chapters")
      .insert({
        series_id: seriesId,
        chapter_number: num,
      })
      .select("id")
      .single();

    if (chErr || !ch) {
      setCreateError(chErr?.message || "Chapter create failed");
      return;
    }

    // 2) Save language-specific text
    const { error: trErr } = await supabase
      .from("chapter_translations")
      .upsert(
        {
          chapter_id: ch.id,
          locale: currentLang, // en / mn / ko / ja
          title: titleTrim,
          script: scriptTrim || null,
        },
        { onConflict: "chapter_id,locale" }
      );

    if (trErr) {
      setCreateError(trErr.message);
      return;
    }

    setChapterTitle("");
    setChapterNumber("");
    setChapterContent("");
    setActionMsg(t.added);

    await reloadAll();
  } catch (e: any) {
    setCreateError(e?.message || "Insert failed");
  } finally {
    setCreating(false);
  }
}

  async function deleteChapter(chapterId: string) {
    setActionMsg(null);

    const ok = confirm(t.confirmDelete);
    if (!ok) return;

    const { error } = await supabase.from("chapters").delete().eq("id", chapterId);

    if (error) {
      setActionMsg(t.deleteFailed + error.message);
      return;
    }

    setActionMsg(t.deleted);
    await reloadAll();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-800 text-slate-100">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <p className="text-sm text-slate-300">{t.loading}</p>
        </div>
      </main>
    );
  }

  if (!series) {
    return (
      <main className="min-h-screen bg-black text-slate-200 p-10 space-y-3">
        <div className="text-lg font-semibold">{t.projectNotFound}.</div>
        {pageError && (
          <pre className="whitespace-pre-wrap text-sm text-rose-300">{pageError}</pre>
        )}
        <Link href="/" className="inline-block text-xs text-slate-400 hover:text-emerald-300">
          ← {t.backToAllSeries}
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-800 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
        {/* Top breadcrumb */}
        <div className="flex items-center justify-between text-xs text-slate-400">
          <Link href="/" className="inline-flex items-center gap-1 hover:text-slate-100">
            <span className="text-lg">←</span>
            {t.backToAllSeries}
          </Link>
          <Link href="/" className="hover:text-slate-100">
            {t.homeBreadcrumb}
          </Link>
        </div>

        {/* HEADER */}
        <section className="space-y-3">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-700 bg-black/40 px-3 py-1 text-[11px] font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {t.seriesDetail}
            {series.language && (
              <span className="ml-2 rounded-full border border-slate-600 px-2 py-0.5 text-[10px] text-slate-300">
                {series.language.toUpperCase()}
              </span>
            )}
            <span
              className={`ml-2 rounded-full border px-2 py-0.5 text-[10px]
              ${series.published ? "border-emerald-500/40 text-emerald-300" : "border-slate-600 text-slate-300"}`}
              title={series.published_at ? `published_at: ${series.published_at}` : undefined}
            >
              {series.published ? t.published : t.draft}
            </span>
          </span>

          {/* title + actions */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                {series.title}
              </h1>
              {series.description && (
                <p className="max-w-xl text-sm text-slate-300">{series.description}</p>
              )}
              <p className="mt-2 text-[11px] text-slate-500">
                {t.createdAt}:{" "}
                {new Date(series.created_at).toLocaleString(localeForDate, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={currentLang}
                onChange={(e) => updateLanguage(e.target.value as Lang)}
                className="rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-xs text-slate-100 outline-none focus:border-emerald-400"
              >
                <option value="en">English</option>
                <option value="mn">Монгол</option>
                <option value="ko">한국어</option>
                <option value="ja">日本語</option>
              </select>

              {/* PUBLISH BUTTON */}
              <button
                type="button"
                onClick={togglePublish}
                disabled={togglingPublish}
                className={`text-[11px] px-3 py-2 rounded-xl border bg-black/40 transition
                  ${series.published
                    ? "border-emerald-400 text-emerald-300 hover:border-emerald-300"
                    : "border-slate-700 text-slate-200 hover:border-emerald-400 hover:text-emerald-300"}
                  ${togglingPublish ? "opacity-60 cursor-not-allowed" : ""}`}
                title={series.published ? t.unpublish : t.publish}
              >
                {togglingPublish ? "..." : series.published ? t.unpublish : t.publish}
              </button>

              {/* EDIT BUTTON */}
              <button
                type="button"
                onClick={() => setEditingMeta((v) => !v)}
                className="text-[11px] px-3 py-2 rounded-xl border border-slate-700 bg-black/40
                           text-slate-200 hover:border-emerald-400 hover:text-emerald-300 transition"
              >
                {t.editSeries}
              </button>
            </div>
          </div>

          {(pageError || actionMsg) && (
            <div className="rounded-xl border border-slate-800 bg-black/30 p-3 text-xs">
              {pageError && (
                <pre className="whitespace-pre-wrap text-rose-300">{pageError}</pre>
              )}
              {actionMsg && (
                <pre className="whitespace-pre-wrap text-emerald-200">{actionMsg}</pre>
              )}
            </div>
          )}

          {/* EDIT META */}
          {editingMeta && (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">{t.editSeriesInfo}</h2>
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
                    className="h-28 rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                    value={draftDescription}
                    onChange={(e) => setDraftDescription(e.target.value)}
                    placeholder="Short summary of your world..."
                  />
                </div>

                <div className="flex items-center gap-2 justify-end pt-1">
                  <button
                    type="button"
                    onClick={saveMeta}
                    disabled={savingMeta}
                    className="text-[11px] px-3 py-2 rounded-xl bg-emerald-500 text-black
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
                    className="text-[11px] px-3 py-2 rounded-xl border border-slate-700 bg-black/40 text-slate-300 hover:border-slate-500"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* COVER */}
        <section className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-100">{t.seriesCover}</h2>
            <CoverImageUploader seriesId={series.id} initialUrl={series.cover_image_url} />
          </div>
          <div className="self-center text-xs text-slate-400">
            <p>{t.coverHelp}</p>
          </div>
        </section>

        {/* CREATE + LIST */}
        <section className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)]">
          {/* Create */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-3">
            <h2 className="text-sm font-semibold text-slate-100">{t.addChapter}</h2>

            <input
              placeholder={t.chapterTitle}
              value={chapterTitle}
              onChange={(e) => setChapterTitle(e.target.value)}
              className="w-full rounded-xl bg-black/40 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            />

            <input
              placeholder={t.chapterNumber}
              value={chapterNumber}
              onChange={(e) => setChapterNumber(e.target.value)}
              className="w-full rounded-xl bg-black/40 border border-slate-700 px-3 py-2 text-sm outline-none focus:border-emerald-400"
            />

            <textarea
              placeholder={t.contentScript}
              value={chapterContent}
              onChange={(e) => setChapterContent(e.target.value)}
              className="w-full rounded-xl bg-black/40 border border-slate-700 px-3 py-2 text-sm h-32 outline-none focus:border-emerald-400"
            />

            {createError && <p className="text-xs text-rose-300">⚠️ {createError}</p>}

            <button
              onClick={createChapter}
              disabled={creating}
              className="w-full rounded-xl bg-emerald-500 py-2 text-black font-semibold hover:bg-emerald-400 disabled:opacity-60"
              type="button"
            >
              {creating ? t.create : t.addChapter}
            </button>
          </div>

          {/* List */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-100">{t.chaptersTitle}</h2>
              <button
                onClick={reloadAll}
                className="text-xs rounded-xl border border-slate-700 bg-black/40 px-3 py-2 hover:border-slate-500"
                type="button"
              >
                {t.retry}
              </button>
            </div>

            {chapters.length === 0 && (
              <p className="text-xs text-slate-400 mt-2">{t.noChapters}</p>
            )}

            <ul className="mt-3 flex flex-col gap-3">
              {chapters.map((c) => (
                <li
                  key={c.id}
                  className="rounded-xl border border-slate-800 bg-black/30 hover:border-emerald-400/60"
                >
                  <div className="flex items-start justify-between gap-3 px-4 py-3">
                    {/* Left: link */}
                    <Link href={`/chapters/${c.id}`} className="block flex-1">
                      <p className="font-semibold text-slate-50 text-sm">
                        #{c.chapter_number} · {c.title}
                      </p>

                      {c.content?.trim() && (
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

                    {/* Right: delete */}
                    <button
                      type="button"
                      onClick={() => deleteChapter(c.id)}
                      className="ml-3 text-[11px] text-rose-400 hover:text-rose-300"
                      title={t.delete}
                    >
                      {t.delete}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
