"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import CoverImageUploader from "@/components/studio/CoverImageUploader";

/* ================= TYPES ================= */

type SeriesRow = {
  id: string;
  user_id?: string | null;
  title: string;
  description: string | null;
  created_at: string;
  cover_image_url: string | null;
  language: string | null;
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
    checkingAccess: "Checking access…",
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
    notLoggedIn: "You must be logged in.",
    ownerOnly: "Owner access only.",
    saveFailed: "Save failed: ",
    languageUpdateFailed: "Language update failed: ",
    chapterCreateFailed: "Chapter create failed",
    insertFailed: "Insert failed",
    publish: "Publish",
    unpublish: "Unpublish",
    draft: "Draft",
    published: "Published",
    confirmUnpublish: "Unpublish this project? Readers won’t see it anymore.",
    publishUpdateFailed: "Publish update failed: ",
    titleLabel: "Title",
    descriptionLabel: "Description",
    titlePlaceholder: "Project title",
    descriptionPlaceholder: "Short summary of your world...",
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
    checkingAccess: "Хандалтыг шалгаж байна…",
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
    notLoggedIn: "Нэвтрэх шаардлагатай.",
    ownerOnly: "Зөвхөн эзэмшигч хандах боломжтой.",
    saveFailed: "Хадгалж чадсангүй: ",
    languageUpdateFailed: "Хэл шинэчлэлт амжилтгүй: ",
    chapterCreateFailed: "Бүлэг үүсгэж чадсангүй",
    insertFailed: "Оруулахад алдаа гарлаа",
    publish: "Нийтлэх",
    unpublish: "Буцааж нуух",
    draft: "Ноорог",
    published: "Нийтлэгдсэн",
    confirmUnpublish: "Энэ төслийг нийтлэлээс буулгах уу? Уншигчид харахгүй.",
    publishUpdateFailed: "Нийтлэл шинэчлэлт амжилтгүй: ",
    titleLabel: "Гарчиг",
    descriptionLabel: "Тайлбар",
    titlePlaceholder: "Төслийн гарчиг",
    descriptionPlaceholder: "Өөрийн ертөнцийн товч тайлбар...",
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
    checkingAccess: "접근 권한 확인 중…",
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
    notLoggedIn: "로그인이 필요합니다.",
    ownerOnly: "오너만 접근할 수 있습니다.",
    saveFailed: "저장 실패: ",
    languageUpdateFailed: "언어 변경 실패: ",
    chapterCreateFailed: "챕터 생성 실패",
    insertFailed: "삽입 실패",
    publish: "게시",
    unpublish: "게시 해제",
    draft: "초안",
    published: "게시됨",
    confirmUnpublish: "게시를 해제할까요? 리더에서 보이지 않아요.",
    publishUpdateFailed: "게시 업데이트 실패: ",
    titleLabel: "제목",
    descriptionLabel: "설명",
    titlePlaceholder: "프로젝트 제목",
    descriptionPlaceholder: "당신의 세계를 짧게 소개해보세요...",
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
    checkingAccess: "アクセス確認中…",
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
    notLoggedIn: "ログインが必要です。",
    ownerOnly: "オーナーのみアクセスできます。",
    saveFailed: "保存に失敗: ",
    languageUpdateFailed: "言語更新に失敗: ",
    chapterCreateFailed: "チャプター作成に失敗",
    insertFailed: "挿入に失敗しました",
    publish: "公開",
    unpublish: "非公開",
    draft: "下書き",
    published: "公開中",
    confirmUnpublish: "非公開にしますか？読者に表示されません。",
    publishUpdateFailed: "公開更新に失敗: ",
    titleLabel: "タイトル",
    descriptionLabel: "説明",
    titlePlaceholder: "プロジェクトタイトル",
    descriptionPlaceholder: "あなたの世界を短く紹介してください...",
  },
} as const;

type Lang = keyof typeof UI_TEXT;

const OWNER_EMAIL = "huslen.mungun1@gmail.com";

/* ================= PAGE ================= */

export default function SeriesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const supabase = useMemo(() => createClientComponentClient(), []);

  const seriesId =
    (params?.id as string) ||
    (params?.seriesId as string) ||
    (params?.seriesID as string) ||
    "";

  const localeRaw = (params?.locale as string) || "en";
  const locale = (["en", "mn", "ko", "ja"].includes(localeRaw)
    ? localeRaw
    : "en") as Lang;

  const [accessChecked, setAccessChecked] = useState(false);
  const [allowed, setAllowed] = useState(false);

  const [series, setSeries] = useState<SeriesRow | null>(null);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [editingMeta, setEditingMeta] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);

  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [togglingPublish, setTogglingPublish] = useState(false);

  const [pageError, setPageError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const currentLang: Lang = locale as Lang;
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

  const checkAccess = useCallback(async () => {
    setAccessChecked(false);
    setAllowed(false);
    setPageError(null);

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      setPageError(error.message);
      setAccessChecked(true);
      router.replace(`/${locale}/login`);
      return null;
    }

    const user = session?.user;

    if (!user) {
      setPageError(t.notLoggedIn);
      setAccessChecked(true);
      router.replace(`/${locale}/login`);
      return null;
    }

    const email = user.email?.toLowerCase() ?? "";
    if (email !== OWNER_EMAIL.toLowerCase()) {
      setPageError(t.ownerOnly);
      setAccessChecked(true);
      router.replace(`/${locale}`);
      return null;
    }

    setAllowed(true);
    setAccessChecked(true);
    return user;
  }, [locale, router, supabase, t.notLoggedIn, t.ownerOnly]);

  const reloadAll = useCallback(async () => {
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

    const user = await checkAccess();
    if (!user) {
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
        .eq("user_id", user.id)
        .maybeSingle();

      if (sErr) {
        setPageError(`Series load failed: ${sErr.message}`);
        setSeries(null);
        setChapters([]);
        setLoading(false);
        return;
      }

      if (!s) {
        setPageError(t.projectNotFound);
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
  }, [checkAccess, seriesId, supabase, t.projectNotFound, t.seriesIdMissing]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

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
        .maybeSingle();

      if (error) {
        setActionMsg(`${t.saveFailed}${error.message}`);
        return;
      }

      if (!data) {
        setActionMsg(t.projectNotFound);
        return;
      }

      setSeries(data as SeriesRow);
      setActionMsg("Saved ✅");
      setEditingMeta(false);
    } catch (e: any) {
      setActionMsg(e?.message || `${t.saveFailed}unknown error.`);
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
      .maybeSingle();

    if (error) {
      setSeries(prev);
      setActionMsg(`${t.languageUpdateFailed}${error.message}`);
      return;
    }

    if (!data) {
      setSeries(prev);
      setActionMsg(t.projectNotFound);
      return;
    }

    setSeries(data as SeriesRow);
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
      .maybeSingle();

    if (error) {
      setActionMsg(t.publishUpdateFailed + error.message);
      setTogglingPublish(false);
      return;
    }

    if (!data) {
      setActionMsg(t.projectNotFound);
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

      const { data: ch, error: chErr } = await supabase
        .from("chapters")
        .insert({
          series_id: seriesId,
          chapter_number: num,
          title: titleTrim,
          content: scriptTrim || null,
        })
        .select("id")
        .maybeSingle();

      if (chErr || !ch) {
        setCreateError(chErr?.message || t.chapterCreateFailed);
        return;
      }

      const { error: trErr } = await supabase
        .from("chapter_translations")
        .upsert(
          {
            chapter_id: ch.id,
            locale: currentLang,
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
      setCreateError(e?.message || t.insertFailed);
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

  if (!accessChecked || loading) {
    return (
      <main
        className="min-h-screen"
        style={{
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.3), transparent 32%), var(--bg)",
          color: "var(--text)",
        }}
      >
        <div className="mx-auto max-w-5xl px-6 py-10">
          <p style={{ color: "var(--muted)" }}>
            {!accessChecked ? t.checkingAccess : t.loading}
          </p>
        </div>
      </main>
    );
  }

  if (!allowed) {
    return null;
  }

  if (!series) {
    return (
      <main
        className="min-h-screen"
        style={{
          background:
            "radial-gradient(circle at top, rgba(255,255,255,0.3), transparent 32%), var(--bg)",
          color: "var(--text)",
        }}
      >
        <div className="mx-auto max-w-5xl px-6 py-10 space-y-4">
          <div className="text-lg font-semibold">{t.projectNotFound}.</div>
          {pageError && (
            <pre
              className="whitespace-pre-wrap rounded-2xl p-4 text-sm"
              style={{
                background: "rgba(122,46,46,0.08)",
                border: "1px solid rgba(122,46,46,0.2)",
                color: "var(--danger)",
              }}
            >
              {pageError}
            </pre>
          )}
          <Link
            href={`/${locale}/studio`}
            className="inline-flex items-center gap-2 text-sm transition"
            style={{ color: "var(--muted)" }}
          >
            <span>←</span>
            {t.backToAllSeries}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(circle at top, rgba(255,255,255,0.3), transparent 32%), var(--bg)",
        color: "var(--text)",
      }}
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
        <div
          className="flex flex-col gap-3 text-xs md:flex-row md:items-center md:justify-between"
          style={{ color: "var(--muted)" }}
        >
          <Link
            href={`/${locale}/studio`}
            className="inline-flex items-center gap-2 transition hover:opacity-80"
          >
            <span className="text-base">←</span>
            {t.backToAllSeries}
          </Link>

          <Link href={`/${locale}`} className="transition hover:opacity-80">
            {t.homeBreadcrumb}
          </Link>
        </div>

        <section
          className="rounded-[24px] p-6 md:p-8"
          style={{
            background: "linear-gradient(180deg, rgba(233,230,223,0.96), rgba(217,212,204,0.9))",
            border: "1px solid rgba(47,47,47,0.1)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-medium"
                style={{
                  background: "rgba(255,255,255,0.45)",
                  border: "1px solid rgba(47,47,47,0.12)",
                  color: "var(--text)",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: "var(--accent)" }}
                />
                {t.seriesDetail}
              </span>

              {series.language && (
                <span
                  className="rounded-full px-3 py-1 text-[11px] font-medium"
                  style={{
                    background: "rgba(255,255,255,0.35)",
                    border: "1px solid rgba(47,47,47,0.12)",
                    color: "var(--muted)",
                  }}
                >
                  {series.language.toUpperCase()}
                </span>
              )}

              <span
                className="rounded-full px-3 py-1 text-[11px] font-medium"
                style={{
                  background: series.published
                    ? "rgba(94,99,87,0.12)"
                    : "rgba(255,255,255,0.35)",
                  border: "1px solid rgba(47,47,47,0.12)",
                  color: series.published ? "var(--accent)" : "var(--muted)",
                }}
                title={series.published_at ? `published_at: ${series.published_at}` : undefined}
              >
                {series.published ? t.published : t.draft}
              </span>
            </div>

            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
                  {series.title}
                </h1>

                {series.description && (
                  <p
                    className="mt-3 max-w-2xl text-sm leading-6"
                    style={{ color: "var(--muted)" }}
                  >
                    {series.description}
                  </p>
                )}

                <p className="mt-4 text-[11px]" style={{ color: "var(--muted)" }}>
                  {t.createdAt}:{" "}
                  {new Date(series.created_at).toLocaleString(localeForDate, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={currentLang}
                  onChange={(e) => updateLanguage(e.target.value as Lang)}
                  className="rounded-full px-4 py-2 text-xs outline-none"
                  style={{
                    background: "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(47,47,47,0.12)",
                    color: "var(--text)",
                  }}
                >
                  <option value="en">English</option>
                  <option value="mn">Монгол</option>
                  <option value="ko">한국어</option>
                  <option value="ja">日本語</option>
                </select>

                <button
                  type="button"
                  onClick={togglePublish}
                  disabled={togglingPublish}
                  className="rounded-full px-4 py-2 text-xs transition disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    background: series.published ? "rgba(94,99,87,0.12)" : "rgba(255,255,255,0.7)",
                    border: "1px solid rgba(47,47,47,0.12)",
                    color: series.published ? "var(--accent)" : "var(--text)",
                  }}
                  title={series.published ? t.unpublish : t.publish}
                >
                  {togglingPublish ? "..." : series.published ? t.unpublish : t.publish}
                </button>

                <button
                  type="button"
                  onClick={() => setEditingMeta((v) => !v)}
                  className="rounded-full px-4 py-2 text-xs transition hover:opacity-85"
                  style={{
                    background: "var(--accent)",
                    border: "1px solid rgba(47,47,47,0.12)",
                    color: "#f8f7f3",
                  }}
                >
                  {t.editSeries}
                </button>
              </div>
            </div>

            {(pageError || actionMsg) && (
              <div
                className="rounded-2xl p-4 text-xs"
                style={{
                  background: "rgba(255,255,255,0.45)",
                  border: "1px solid rgba(47,47,47,0.12)",
                }}
              >
                {pageError && (
                  <pre
                    className="whitespace-pre-wrap"
                    style={{ color: "var(--danger)" }}
                  >
                    {pageError}
                  </pre>
                )}
                {actionMsg && (
                  <pre
                    className="whitespace-pre-wrap"
                    style={{ color: "var(--accent)" }}
                  >
                    {actionMsg}
                  </pre>
                )}
              </div>
            )}

            {editingMeta && (
              <div
                className="rounded-[22px] p-5"
                style={{
                  background: "rgba(255,255,255,0.45)",
                  border: "1px solid rgba(47,47,47,0.12)",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-sm font-semibold">{t.editSeriesInfo}</h2>
                  <span className="text-[11px]" style={{ color: "var(--muted)" }}>
                    {t.idLabel}: {series.id.slice(0, 8)}…
                  </span>
                </div>

                <div className="mt-4 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs" style={{ color: "var(--muted)" }}>
                      {t.titleLabel}
                    </label>
                    <input
                      className="rounded-2xl px-4 py-3 text-sm outline-none"
                      style={{
                        background: "rgba(255,255,255,0.8)",
                        border: "1px solid rgba(47,47,47,0.12)",
                        color: "var(--text)",
                      }}
                      value={draftTitle}
                      onChange={(e) => setDraftTitle(e.target.value)}
                      placeholder={t.titlePlaceholder}
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs" style={{ color: "var(--muted)" }}>
                      {t.descriptionLabel}
                    </label>
                    <textarea
                      className="h-28 rounded-2xl px-4 py-3 text-sm outline-none"
                      style={{
                        background: "rgba(255,255,255,0.8)",
                        border: "1px solid rgba(47,47,47,0.12)",
                        color: "var(--text)",
                      }}
                      value={draftDescription}
                      onChange={(e) => setDraftDescription(e.target.value)}
                      placeholder={t.descriptionPlaceholder}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={saveMeta}
                      disabled={savingMeta}
                      className="rounded-full px-4 py-2 text-[11px] transition disabled:cursor-not-allowed disabled:opacity-60"
                      style={{
                        background: "var(--accent)",
                        border: "1px solid rgba(47,47,47,0.12)",
                        color: "#f8f7f3",
                      }}
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
                      className="rounded-full px-4 py-2 text-[11px] transition hover:opacity-85"
                      style={{
                        background: "rgba(255,255,255,0.75)",
                        border: "1px solid rgba(47,47,47,0.12)",
                        color: "var(--text)",
                      }}
                    >
                      {t.cancel}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-[300px_minmax(0,1fr)]">
          <div
            className="rounded-[24px] p-5"
            style={{
              background: "var(--panel)",
              border: "1px solid rgba(47,47,47,0.12)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <h2 className="mb-3 text-sm font-semibold">{t.seriesCover}</h2>
            <CoverImageUploader seriesId={series.id} initialUrl={series.cover_image_url} />
          </div>

          <div
            className="rounded-[24px] p-5 text-sm leading-6"
            style={{
              background: "rgba(233,230,223,0.72)",
              border: "1px solid rgba(47,47,47,0.12)",
              color: "var(--muted)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            {t.coverHelp}
          </div>
        </section>

        <section className="grid gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <div
            className="rounded-[24px] p-5"
            style={{
              background: "var(--panel)",
              border: "1px solid rgba(47,47,47,0.12)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <h2 className="text-sm font-semibold">{t.addChapter}</h2>

            <div className="mt-4 space-y-3">
              <input
                placeholder={t.chapterTitle}
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(47,47,47,0.12)",
                  color: "var(--text)",
                }}
              />

              <input
                placeholder={t.chapterNumber}
                value={chapterNumber}
                onChange={(e) => setChapterNumber(e.target.value)}
                className="w-full rounded-2xl px-4 py-3 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(47,47,47,0.12)",
                  color: "var(--text)",
                }}
              />

              <textarea
                placeholder={t.contentScript}
                value={chapterContent}
                onChange={(e) => setChapterContent(e.target.value)}
                className="h-36 w-full rounded-2xl px-4 py-3 text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.8)",
                  border: "1px solid rgba(47,47,47,0.12)",
                  color: "var(--text)",
                }}
              />

              {createError && (
                <p className="text-xs" style={{ color: "var(--danger)" }}>
                  ⚠️ {createError}
                </p>
              )}

              <button
                onClick={createChapter}
                disabled={creating}
                className="w-full rounded-full px-4 py-3 text-sm font-semibold transition disabled:opacity-60"
                style={{
                  background: "var(--accent)",
                  border: "1px solid rgba(47,47,47,0.12)",
                  color: "#f8f7f3",
                }}
                type="button"
              >
                {creating ? t.create : t.addChapter}
              </button>
            </div>
          </div>

          <div
            className="rounded-[24px] p-5"
            style={{
              background: "var(--panel)",
              border: "1px solid rgba(47,47,47,0.12)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">{t.chaptersTitle}</h2>
              <button
                onClick={reloadAll}
                className="rounded-full px-4 py-2 text-xs transition hover:opacity-85"
                style={{
                  background: "rgba(255,255,255,0.75)",
                  border: "1px solid rgba(47,47,47,0.12)",
                  color: "var(--text)",
                }}
                type="button"
              >
                {t.retry}
              </button>
            </div>

            {chapters.length === 0 && (
              <p className="mt-3 text-sm" style={{ color: "var(--muted)" }}>
                {t.noChapters}
              </p>
            )}

            <ul className="mt-4 flex flex-col gap-3">
              {chapters.map((c) => (
                <li
                  key={c.id}
                  className="rounded-[20px] transition"
                  style={{
                    background: "rgba(255,255,255,0.45)",
                    border: "1px solid rgba(47,47,47,0.12)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3 px-4 py-4">
                    <Link href={`/chapters/${c.id}`} className="block min-w-0 flex-1">
                      <p className="text-sm font-semibold text-[var(--text)]">
                        #{c.chapter_number} · {c.title}
                      </p>

                      {c.content?.trim() && (
                        <p
                          className="mt-1 line-clamp-2 text-[12px]"
                          style={{ color: "var(--muted)" }}
                        >
                          {c.content}
                        </p>
                      )}

                      <p className="mt-2 text-[10px]" style={{ color: "var(--muted)" }}>
                        {t.createdAt}:{" "}
                        {new Date(c.created_at).toLocaleString(localeForDate, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </Link>

                    <button
                      type="button"
                      onClick={() => deleteChapter(c.id)}
                      className="ml-3 text-[11px] transition hover:opacity-80"
                      style={{ color: "var(--danger)" }}
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