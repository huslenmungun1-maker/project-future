"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import BookCoverUploader from "@/components/studio/BookCoverUploader";

type BookRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  cover_image_url: string | null;
  language: string | null;
};

type ChapterRow = {
  id: string;
  book_id: string;
  title: string;
  chapter_number: number;
  created_at: string;
  content: string | null;
};

const UI_TEXT = {
  en: {
    backToAll: "Back to all books",
    detail: "Book detail",
    edit: "Edit book",
    editInfo: "Edit book info",
    idLabel: "ID",
    createdAt: "Created at",
    cover: "Book cover",
    coverHelp:
      "Upload a cover image for this book. It will be used on listings and reader pages.",
    addChapter: "Add a new chapter",
    chapterTitle: "Chapter title",
    chapterNumber: "Chapter number",
    contentScript: "Content / script",
    chaptersTitle: "Chapters",
    noChapters: "No chapters yet. Create your first chapter on the left.",
    saving: "Saving…",
    save: "Save",
    cancel: "Cancel",
    creating: "Creating…",
    createChapter: "Create chapter",
  },
  mn: {
    backToAll: "Бүх номууд руу буцах",
    detail: "Номын дэлгэрэнгүй",
    edit: "Ном засах",
    editInfo: "Номын мэдээлэл засах",
    idLabel: "ID",
    createdAt: "Үүсгэсэн",
    cover: "Номын нүүр",
    coverHelp:
      "Энэ номын нүүр зургийг байршуулна уу. Жагсаалт болон уншигч дээр ашиглагдана.",
    addChapter: "Шинэ бүлэг нэмэх",
    chapterTitle: "Бүлгийн гарчиг",
    chapterNumber: "Бүлгийн дугаар",
    contentScript: "Агуулга / скрипт",
    chaptersTitle: "Бүлгүүд",
    noChapters: "Одоогоор бүлэг алга. Зүүн талаас анхны бүлгээ үүсгээрэй.",
    saving: "Хадгалж байна…",
    save: "Хадгалах",
    cancel: "Цуцлах",
    creating: "Үүсгэж байна…",
    createChapter: "Бүлэг үүсгэх",
  },
  ko: {
    backToAll: "모든 책으로 돌아가기",
    detail: "책 상세",
    edit: "책 편집",
    editInfo: "책 정보 편집",
    idLabel: "ID",
    createdAt: "생성일",
    cover: "표지 이미지",
    coverHelp:
      "이 책의 표지 이미지를 업로드하세요. 목록과 리더 페이지에서 사용됩니다.",
    addChapter: "새 챕터 추가",
    chapterTitle: "챕터 제목",
    chapterNumber: "챕터 번호",
    contentScript: "내용 / 스크립트",
    chaptersTitle: "챕터",
    noChapters: "아직 챕터가 없습니다. 왼쪽에서 첫 챕터를 만들어 보세요.",
    saving: "저장 중…",
    save: "저장",
    cancel: "취소",
    creating: "생성 중…",
    createChapter: "챕터 생성",
  },
  ja: {
    backToAll: "すべての本に戻る",
    detail: "本の詳細",
    edit: "本を編集",
    editInfo: "本の情報を編集",
    idLabel: "ID",
    createdAt: "作成日時",
    cover: "表紙画像",
    coverHelp:
      "この本の表紙画像をアップロードしてください。 一覧やリーダーページで使われます。",
    addChapter: "新しいチャプターを追加",
    chapterTitle: "チャプタータイトル",
    chapterNumber: "チャプター番号",
    contentScript: "内容 / スクリプト",
    chaptersTitle: "チャプター",
    noChapters: "まだチャプターがありません。左側で最初のチャプターを作成してください。",
    saving: "保存中…",
    save: "保存",
    cancel: "キャンセル",
    creating: "作成中…",
    createChapter: "チャプター作成",
  },
} as const;

type SupportedLang = keyof typeof UI_TEXT;

export default function BookDetailPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const bookId = (params as any)?.id as string;

  const [book, setBook] = useState<BookRow | null>(null);
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editingMeta, setEditingMeta] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);

  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterNumber, setChapterNumber] = useState("");
  const [chapterContent, setChapterContent] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchData = async () => {
    if (!bookId) return;
    setLoading(true);
    setError(null);

    const [
      { data: bookData, error: bookError },
      { data: chaptersData, error: chaptersError },
    ] = await Promise.all([
      supabase.from("books").select("*").eq("id", bookId).single(),
      supabase
        .from("chapters")
        .select("*")
        .eq("book_id", bookId)
        .order("chapter_number", { ascending: true }),
    ]);

    if (bookError) {
      setError(bookError.message);
      setBook(null);
    } else {
      setBook(bookData as BookRow);
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
  }, [bookId]);

  useEffect(() => {
    if (book) {
      setDraftTitle(book.title);
      setDraftDescription(book.description ?? "");
    }
  }, [book]);

  const handleSaveMeta = async () => {
    if (!book || savingMeta) return;

    const trimmedTitle = draftTitle.trim();
    const trimmedDesc = draftDescription.trim();

    if (!trimmedTitle) {
      alert("Title cannot be empty.");
      return;
    }

    setSavingMeta(true);

    const { data, error } = await supabase
      .from("books")
      .update({
        title: trimmedTitle,
        description: trimmedDesc || null,
      })
      .eq("id", book.id)
      .select("*");

    if (error) {
      alert("Failed to update book: " + error.message);
      setSavingMeta(false);
      return;
    }

    setBook((data?.[0] as BookRow) ?? book);
    setEditingMeta(false);
    setSavingMeta(false);
  };

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
        book_id: bookId,
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

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-800 text-slate-100">
        <div className="mx-auto max-w-5xl px-6 py-10">
          <p className="text-sm text-slate-300">Loading book…</p>
        </div>
      </main>
    );
  }

  if (error || !book) {
    return (
      <main className="min-h-screen bg-slate-950 text-slate-100 p-8">
        <Link
          href={`/${locale}/studio/books`}
          className="mb-4 inline-block text-xs text-slate-400 hover:text-emerald-300"
        >
          ← Back
        </Link>
        <p className="text-sm text-rose-300">
          Book not found{error ? `: ${error}` : ""}.
        </p>
      </main>
    );
  }

  const langCode: SupportedLang =
    (book.language as SupportedLang) && UI_TEXT[book.language as SupportedLang]
      ? (book.language as SupportedLang)
      : (["en", "mn", "ko", "ja"].includes(locale) ? (locale as SupportedLang) : "en");

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
            href={`/${locale}/studio/books`}
            className="inline-flex items-center gap-1 hover:text-slate-100"
          >
            <span className="text-lg">←</span>
            {t.backToAll}
          </Link>
        </div>

        {/* HEADER + EDIT META */}
        <section className="space-y-3">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-700 bg-black/40 px-3 py-1 text-[11px] font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {t.detail}
          </span>

          {!editingMeta ? (
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                  {book.title}
                </h1>
                {book.description && (
                  <p className="max-w-xl text-sm text-slate-300">
                    {book.description}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setEditingMeta(true)}
                className="mt-1 text-[11px] px-3 py-1 rounded-md border border-slate-600
                           text-slate-200 hover:border-emerald-400 hover:text-emerald-300 transition"
              >
                {t.edit}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-100">
                  {t.editInfo}
                </h2>
                <span className="text-[11px] text-slate-400">
                  {t.idLabel}: {book.id.slice(0, 8)}…
                </span>
              </div>

              <div className="flex flex-col gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-300">Title</label>
                  <input
                    className="rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    placeholder="Book title"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs text-slate-300">Description</label>
                  <textarea
                    className="h-24 rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                    value={draftDescription}
                    onChange={(e) => setDraftDescription(e.target.value)}
                    placeholder="Short summary…"
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
                      setDraftTitle(book.title);
                      setDraftDescription(book.description ?? "");
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
            {new Date(book.created_at).toLocaleString(localeForDate, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </section>

        {/* COVER */}
        <section className="grid gap-6 md:grid-cols-[260px_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <h2 className="mb-2 text-sm font-semibold text-slate-100">
              {t.cover}
            </h2>
            <BookCoverUploader bookId={book.id} initialUrl={book.cover_image_url} />
          </div>
          <div className="self-center text-xs text-slate-400">
            <p>{t.coverHelp}</p>
          </div>
        </section>

        {/* CREATE CHAPTER + LIST */}
        <section className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)]">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-100">
              {t.addChapter}
            </h2>
            <form className="flex flex-col gap-3" onSubmit={handleCreateChapter}>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">{t.chapterTitle}</label>
                <input
                  className="rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                  placeholder="e.g. Episode 1"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">{t.chapterNumber}</label>
                <input
                  className="rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                  placeholder="e.g. 1"
                  value={chapterNumber}
                  onChange={(e) => setChapterNumber(e.target.value)}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">{t.contentScript}</label>
                <textarea
                  className="h-32 rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                  placeholder="Write the script or notes…"
                  value={chapterContent}
                  onChange={(e) => setChapterContent(e.target.value)}
                />
              </div>

              {createError && <p className="text-xs text-rose-300">⚠️ {createError}</p>}

              <button
                type="submit"
                disabled={creating}
                className="mt-1 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {creating ? t.creating : t.createChapter}
              </button>
            </form>
          </div>

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
                    <Link href={`/${locale}/publisher/books`} className="block px-4 py-3">
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
