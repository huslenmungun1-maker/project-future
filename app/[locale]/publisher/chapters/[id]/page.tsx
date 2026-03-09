"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Locale = "en" | "ko" | "mn" | "ja";

type Chapter = {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
  content: string;
  created_at: string;
  updated_at?: string | null;
  status?: string | null;
};

type BookLite = {
  id: string;
  title: string;
};

const UI = {
  en: {
    backToBook: "Back to Book",
    eyebrow: "Publisher · Chapter Editor",
    pageTitle: "Edit chapter",
    pageSubtitle:
      "Update chapter order and content cleanly for the reader structure.",
    loading: "Loading chapter...",
    notFound: "Chapter not found.",
    save: "Save changes",
    saving: "Saving...",
    saved: "Chapter updated.",
    delete: "Delete chapter",
    deleteConfirm: "Delete this chapter? This cannot be undone.",
    deleteError: "Error deleting chapter: ",
    saveError: "Error saving chapter: ",
    loadError: "Error loading chapter: ",
    chapterNumber: "Chapter number",
    title: "Title",
    content: "Content",
    createdAt: "Created",
    updatedAt: "Updated",
    parentBook: "Parent book",
    untitled: "Untitled chapter",
    titlePlaceholder: "Chapter title",
    contentPlaceholder: "Write the chapter content here...",
  },
  ko: {
    backToBook: "도서로 돌아가기",
    eyebrow: "퍼블리셔 · 챕터 편집기",
    pageTitle: "챕터 수정",
    pageSubtitle:
      "리더 구조에 맞게 챕터 순서와 내용을 깔끔하게 수정합니다.",
    loading: "챕터 불러오는 중...",
    notFound: "챕터를 찾을 수 없습니다.",
    save: "저장",
    saving: "저장 중...",
    saved: "챕터가 수정되었습니다.",
    delete: "챕터 삭제",
    deleteConfirm: "이 챕터를 삭제할까요? 되돌릴 수 없습니다.",
    deleteError: "챕터 삭제 오류: ",
    saveError: "챕터 저장 오류: ",
    loadError: "챕터 로드 오류: ",
    chapterNumber: "챕터 번호",
    title: "제목",
    content: "내용",
    createdAt: "생성일",
    updatedAt: "수정일",
    parentBook: "상위 도서",
    untitled: "제목 없는 챕터",
    titlePlaceholder: "챕터 제목",
    contentPlaceholder: "여기에 챕터 내용을 작성하세요...",
  },
  mn: {
    backToBook: "Ном руу буцах",
    eyebrow: "Нийтлэгч · Бүлэг засварлагч",
    pageTitle: "Бүлэг засах",
    pageSubtitle:
      "Reader бүтэцтэй нийцүүлэн бүлгийн дараалал болон агуулгыг цэвэрхэн засна.",
    loading: "Бүлэг ачаалж байна...",
    notFound: "Бүлэг олдсонгүй.",
    save: "Хадгалах",
    saving: "Хадгалж байна...",
    saved: "Бүлэг шинэчлэгдлээ.",
    delete: "Бүлэг устгах",
    deleteConfirm: "Энэ бүлгийг устгах уу? Буцаах боломжгүй.",
    deleteError: "Бүлэг устгах алдаа: ",
    saveError: "Бүлэг хадгалах алдаа: ",
    loadError: "Бүлэг ачаалах алдаа: ",
    chapterNumber: "Бүлгийн дугаар",
    title: "Гарчиг",
    content: "Агуулга",
    createdAt: "Үүсгэсэн",
    updatedAt: "Шинэчилсэн",
    parentBook: "Хамаарах ном",
    untitled: "Нэргүй бүлэг",
    titlePlaceholder: "Бүлгийн гарчиг",
    contentPlaceholder: "Бүлгийн агуулгаа энд бичнэ үү...",
  },
  ja: {
    backToBook: "本に戻る",
    eyebrow: "出版社 · チャプター編集",
    pageTitle: "チャプターを編集",
    pageSubtitle:
      "リーダー構造に合わせてチャプター順序と内容を整えます。",
    loading: "チャプターを読み込み中...",
    notFound: "チャプターが見つかりません。",
    save: "保存",
    saving: "保存中...",
    saved: "チャプターを更新しました。",
    delete: "チャプターを削除",
    deleteConfirm: "このチャプターを削除しますか？元に戻せません。",
    deleteError: "チャプター削除エラー: ",
    saveError: "チャプター保存エラー: ",
    loadError: "チャプター読み込みエラー: ",
    chapterNumber: "チャプター番号",
    title: "タイトル",
    content: "内容",
    createdAt: "作成日",
    updatedAt: "更新日",
    parentBook: "親の本",
    untitled: "無題のチャプター",
    titlePlaceholder: "チャプタータイトル",
    contentPlaceholder: "ここにチャプター内容を書いてください...",
  },
} as const;

function safeLocale(raw: string): Locale {
  return (["en", "ko", "mn", "ja"].includes(raw) ? raw : "en") as Locale;
}

function formatDate(value: string | null | undefined, localeCode: string) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString(localeCode, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function PublisherChapterEditorPage() {
  const router = useRouter();
  const params = useParams() as { id?: string; locale?: string };

  const chapterId = params?.id;
  const locale = safeLocale(params?.locale || "en");
  const t = UI[locale];

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [book, setBook] = useState<BookLite | null>(null);

  const [chapterNumber, setChapterNumber] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

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
    if (!chapterId) return;

    async function loadChapter() {
      setLoading(true);
      setMessage(null);

      const { data, error } = await supabase
        .from("chapters")
        .select("id, book_id, chapter_number, title, content, created_at, updated_at, status")
        .eq("id", chapterId)
        .maybeSingle();

      if (error || !data) {
        const msg =
          typeof (error as { message?: unknown })?.message === "string"
            ? error.message
            : t.notFound;

        setMessage(t.loadError + msg);
        setLoading(false);
        return;
      }

      const chapterRow = data as Chapter;
      setChapter(chapterRow);
      setChapterNumber(chapterRow.chapter_number);
      setTitle(chapterRow.title ?? "");
      setContent(chapterRow.content ?? "");

      const { data: bookData } = await supabase
        .from("books")
        .select("id, title")
        .eq("id", chapterRow.book_id)
        .maybeSingle();

      if (bookData) {
        setBook(bookData as BookLite);
      }

      setLoading(false);
    }

    loadChapter();
  }, [chapterId, t.loadError, t.notFound]);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!chapterId || chapterNumber === "") return;

    setSaving(true);
    setMessage(null);

    const payload = {
      chapter_number: Number(chapterNumber),
      title: title.trim(),
      content: content.trim(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("chapters")
      .update(payload)
      .eq("id", chapterId)
      .select("id, book_id, chapter_number, title, content, created_at, updated_at, status")
      .maybeSingle();

    if (error || !data) {
      const msg =
        typeof (error as { message?: unknown })?.message === "string"
          ? error.message
          : "Unknown Supabase error";

      setMessage(t.saveError + msg);
      setSaving(false);
      return;
    }

    const updatedChapter = data as Chapter;
    setChapter(updatedChapter);
    setChapterNumber(updatedChapter.chapter_number);
    setTitle(updatedChapter.title ?? "");
    setContent(updatedChapter.content ?? "");
    setMessage(t.saved);
    setSaving(false);
  }

  async function handleDelete() {
    if (!chapter) return;

    const ok = window.confirm(t.deleteConfirm);
    if (!ok) return;

    setDeleting(true);
    setMessage(null);

    const parentBookId = chapter.book_id;

    const { error } = await supabase.from("chapters").delete().eq("id", chapter.id);

    if (error) {
      const msg =
        typeof (error as { message?: unknown })?.message === "string"
          ? error.message
          : "Unknown Supabase error";

      setMessage(t.deleteError + msg);
      setDeleting(false);
      return;
    }

    router.push(`/${locale}/publisher/books/${parentBookId}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen theme-soft">
        <main className="mx-auto w-full max-w-4xl px-6 py-10 md:px-8 md:py-12">
          <div className="rounded-[28px] border border-black/5 bg-[rgba(255,255,255,0.72)] p-8 shadow-sm backdrop-blur-sm">
            <p className="text-sm text-stone-600">{t.loading}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="min-h-screen theme-soft">
        <main className="mx-auto w-full max-w-4xl px-6 py-10 md:px-8 md:py-12">
          <div className="rounded-[28px] border border-black/5 bg-[rgba(255,255,255,0.72)] p-8 shadow-sm backdrop-blur-sm">
            <p className="text-sm text-rose-700">{message ?? t.notFound}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-soft">
      <main className="mx-auto w-full max-w-4xl px-6 py-10 md:px-8 md:py-12">
        <section className="mb-8 rounded-[28px] border border-black/5 bg-[rgba(255,255,255,0.72)] p-6 shadow-sm backdrop-blur-sm md:p-8">
          <Link
            href={`/${locale}/publisher/books/${chapter.book_id}`}
            className="inline-flex text-sm font-medium text-stone-700 hover:text-stone-950"
          >
            ← {t.backToBook}
          </Link>

          <div className="mt-5 space-y-3">
            <div
              className="inline-flex rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-stone-600"
              style={{
                borderColor: "rgba(47,47,47,0.08)",
                background: "rgba(245,241,235,0.9)",
              }}
            >
              {t.eyebrow}
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-stone-900 md:text-4xl">
                {t.pageTitle}
              </h1>
              <p className="text-base text-stone-700">
                {title.trim() || t.untitled}
              </p>
              <p className="max-w-3xl text-sm leading-6 text-stone-600 md:text-base">
                {t.pageSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-1 text-xs text-stone-500">
              <span>
                {t.createdAt}: {formatDate(chapter.created_at, localeForDate)}
              </span>
              <span>•</span>
              <span>
                {t.updatedAt}: {formatDate(chapter.updated_at, localeForDate)}
              </span>
            </div>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-black/5 bg-[rgba(255,255,255,0.72)] px-4 py-3 text-sm text-stone-700 shadow-sm backdrop-blur-sm">
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[28px] border border-black/5 bg-[rgba(255,255,255,0.72)] p-6 shadow-sm backdrop-blur-sm md:p-8">
            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid gap-2">
                <label className="text-sm font-medium text-stone-700">
                  {t.chapterNumber}
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-black/20"
                  value={chapterNumber}
                  onChange={(e) =>
                    setChapterNumber(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-stone-700">
                  {t.title}
                </label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-black/20"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.titlePlaceholder}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium text-stone-700">
                  {t.content}
                </label>
                <textarea
                  rows={14}
                  className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-black/20"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={t.contentPlaceholder}
                />
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving || deleting}
                  className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {saving ? t.saving : t.save}
                </button>

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={saving || deleting}
                  className="inline-flex items-center justify-center rounded-full border border-red-300 bg-white/80 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                >
                  {t.delete}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-[28px] border border-black/5 bg-[rgba(255,255,255,0.72)] p-6 shadow-sm backdrop-blur-sm md:p-8">
            <h2 className="mb-4 text-xl font-semibold text-stone-900">
              {t.parentBook}
            </h2>

            <div className="rounded-2xl border border-black/5 bg-[rgba(245,241,235,0.7)] p-4">
              <p className="text-sm font-medium text-stone-800">
                {book?.title || "—"}
              </p>

              <div className="mt-4">
                <Link
                  href={`/${locale}/publisher/books/${chapter.book_id}`}
                  className="inline-flex rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-white/80"
                >
                  {t.backToBook}
                </Link>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}