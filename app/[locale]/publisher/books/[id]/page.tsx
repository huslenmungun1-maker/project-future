"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type BookStatus = "draft" | "published";
type Locale = "en" | "ko" | "mn" | "ja";

type Book = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  status: BookStatus;
  created_at: string;
};

type Chapter = {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
  content: string;
  created_at: string;
};

type TranslationRow = {
  content_type: "series" | "book" | "chapter";
  content_id: string;
  locale: Locale;
  title: string | null;
  description: string | null;
  body: string | null;
};

const UI = {
  en: {
    pageTitle: "Manage book",
    createdAt: "Created at",
    deleteBook: "Delete book",
    deleteConfirm:
      "Delete this book and all its chapters? This cannot be undone.",
    bookDetails: "Book details",
    title: "Title",
    description: "Description",
    bookContentOptional: "Book content (optional if you use chapters)",
    status: "Status",
    draft: "Draft (not visible to readers)",
    published: "Published (visible in reader/books)",
    save: "Save changes",
    chapters: "Chapters",
    addNewChapter: "Add new chapter",
    chapterNumber: "Chapter number",
    chapterTitle: "Title",
    chapterContent: "Content",
    addChapter: "Add chapter",
    noChapters: "No chapters yet. Create the first chapter above.",
    delete: "Delete",
    deleteChapterConfirm: "Delete this chapter?",
    loading: "Loading book…",
    notFound: "Book not found.",
    fillAll: "Please fill in all chapter fields.",
    updated: "Book updated.",
    createdChapter: "Chapter created.",
    errLoadBook: "Error loading book: ",
    errLoadChapters: "Error loading chapters: ",
    errSaveBook: "Error saving book: ",
    errDeleteBook: "Error deleting book: ",
    errCreateChapter: "Error creating chapter: ",
  },
  ko: {
    pageTitle: "책 관리",
    createdAt: "생성일",
    deleteBook: "책 삭제",
    deleteConfirm: "이 책과 모든 챕터를 삭제할까요? 되돌릴 수 없습니다.",
    bookDetails: "책 정보",
    title: "제목",
    description: "설명",
    bookContentOptional: "책 내용 (챕터를 쓰면 선택)",
    status: "상태",
    draft: "초안 (리더에 보이지 않음)",
    published: "게시됨 (리더/책에 표시됨)",
    save: "저장",
    chapters: "챕터",
    addNewChapter: "새 챕터 추가",
    chapterNumber: "챕터 번호",
    chapterTitle: "제목",
    chapterContent: "내용",
    addChapter: "챕터 추가",
    noChapters: "아직 챕터가 없습니다. 위에서 첫 챕터를 만들어주세요.",
    delete: "삭제",
    deleteChapterConfirm: "이 챕터를 삭제할까요?",
    loading: "책 불러오는 중…",
    notFound: "책을 찾을 수 없습니다.",
    fillAll: "챕터 입력을 모두 채워주세요.",
    updated: "책이 업데이트되었습니다.",
    createdChapter: "챕터가 생성되었습니다.",
    errLoadBook: "책 로드 오류: ",
    errLoadChapters: "챕터 로드 오류: ",
    errSaveBook: "책 저장 오류: ",
    errDeleteBook: "책 삭제 오류: ",
    errCreateChapter: "챕터 생성 오류: ",
  },
  mn: {
    pageTitle: "Ном удирдах",
    createdAt: "Үүсгэсэн",
    deleteBook: "Ном устгах",
    deleteConfirm:
      "Энэ ном болон бүх бүлгийг устгах уу? Буцаах боломжгүй.",
    bookDetails: "Номын мэдээлэл",
    title: "Гарчиг",
    description: "Тайлбар",
    bookContentOptional: "Номын агуулга (бүлэг ашиглавал заавал биш)",
    status: "Төлөв",
    draft: "Ноорог (уншигчид харагдахгүй)",
    published: "Нийтэлсэн (уншигч/номд харагдана)",
    save: "Хадгалах",
    chapters: "Бүлгүүд",
    addNewChapter: "Шинэ бүлэг нэмэх",
    chapterNumber: "Бүлгийн дугаар",
    chapterTitle: "Гарчиг",
    chapterContent: "Агуулга",
    addChapter: "Бүлэг нэмэх",
    noChapters: "Одоогоор бүлэг алга. Дээрээс эхний бүлгийг үүсгээрэй.",
    delete: "Устгах",
    deleteChapterConfirm: "Энэ бүлгийг устгах уу?",
    loading: "Ном ачаалж байна…",
    notFound: "Ном олдсонгүй.",
    fillAll: "Бүлгийн бүх талбарыг бөглөнө үү.",
    updated: "Ном шинэчлэгдлээ.",
    createdChapter: "Бүлэг үүсгэгдлээ.",
    errLoadBook: "Ном ачаалах алдаа: ",
    errLoadChapters: "Бүлэг ачаалах алдаа: ",
    errSaveBook: "Ном хадгалах алдаа: ",
    errDeleteBook: "Ном устгах алдаа: ",
    errCreateChapter: "Бүлэг үүсгэх алдаа: ",
  },
  ja: {
    pageTitle: "本を管理",
    createdAt: "作成日",
    deleteBook: "本を削除",
    deleteConfirm: "この本と全チャプターを削除しますか？元に戻せません。",
    bookDetails: "本の詳細",
    title: "タイトル",
    description: "説明",
    bookContentOptional: "本文（チャプターを使う場合は任意）",
    status: "ステータス",
    draft: "下書き（読者に表示されません）",
    published: "公開（reader/books に表示）",
    save: "保存",
    chapters: "チャプター",
    addNewChapter: "新しいチャプターを追加",
    chapterNumber: "番号",
    chapterTitle: "タイトル",
    chapterContent: "内容",
    addChapter: "追加",
    noChapters: "まだチャプターがありません。上で最初のチャプターを作成してください。",
    delete: "削除",
    deleteChapterConfirm: "このチャプターを削除しますか？",
    loading: "読み込み中…",
    notFound: "本が見つかりません。",
    fillAll: "チャプターの項目をすべて入力してください。",
    updated: "本を更新しました。",
    createdChapter: "チャプターを作成しました。",
    errLoadBook: "本の読み込みエラー: ",
    errLoadChapters: "チャプターの読み込みエラー: ",
    errSaveBook: "本の保存エラー: ",
    errDeleteBook: "本の削除エラー: ",
    errCreateChapter: "チャプター作成エラー: ",
  },
} as const;

function safeLocale(raw: string): Locale {
  return (["en", "ko", "mn", "ja"].includes(raw) ? raw : "en") as Locale;
}

export default function PublisherBookManagePage() {
  const router = useRouter();
  const params = useParams() as { id?: string; locale?: string };
  const bookId = params?.id;
  const locale = safeLocale(params?.locale || "en");
  const t = UI[locale];

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Form state for book
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<BookStatus>("draft");

  // Form state for new chapter
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterNumber, setChapterNumber] = useState<number | "">("");
  const [chapterContent, setChapterContent] = useState("");
  const [chapterSaving, setChapterSaving] = useState(false);

  // Content translations display mode (does NOT change DB, only preview)
  // This solves your "language dropdown kinda works but not translating" problem:
  // it will fetch translated text from content_translations and display it.
  const [contentLocale, setContentLocale] = useState<Locale>(locale);

  // A merged view of book/chapters (original + translation fallback)
  const [displayBook, setDisplayBook] = useState<Book | null>(null);
  const [displayChapters, setDisplayChapters] = useState<Chapter[]>([]);

  useEffect(() => {
    // keep contentLocale in sync with route locale by default
    setContentLocale(locale);
  }, [locale]);

  const localeOptions = useMemo(
    () => [
      { value: "en" as const, label: "English" },
      { value: "mn" as const, label: "Монгол" },
      { value: "ko" as const, label: "한국어" },
      { value: "ja" as const, label: "日本語" },
    ],
    []
  );

  useEffect(() => {
    if (!bookId) return;

    async function loadData() {
      setLoading(true);
      setMessage(null);

      // Load book
      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .select("*")
        .eq("id", bookId)
        .single();

      if (bookError || !bookData) {
        const msg =
          typeof (bookError as any)?.message === "string"
            ? (bookError as any).message
            : t.notFound;
        setMessage(t.errLoadBook + msg);
        setLoading(false);
        return;
      }

      const b = bookData as Book;
      setBook(b);
      setTitle(b.title);
      setDescription(b.description ?? "");
      setContent(b.content ?? "");
      setStatus(b.status);

      // Load chapters
      const { data: chapterData, error: chapterError } = await supabase
        .from("chapters")
        .select("*")
        .eq("book_id", bookId)
        .order("chapter_number", { ascending: true });

      if (chapterError) {
        const msg =
          typeof (chapterError as any)?.message === "string"
            ? (chapterError as any).message
            : "Unknown error";
        setMessage(t.errLoadChapters + msg);
        setChapters([]);
      } else {
        setChapters((chapterData || []) as Chapter[]);
      }

      setLoading(false);
    }

    loadData();
  }, [bookId, t.errLoadBook, t.errLoadChapters, t.notFound]);

  // Load translations for preview display (book + chapters)
  useEffect(() => {
    if (!bookId) return;

    async function loadTranslations() {
      // Default: show original
      setDisplayBook(book);
      setDisplayChapters(chapters);

      if (!book || chapters.length === 0) {
        // still try to translate book even if no chapters
      }

      try {
        // book translation
        const bookTrRes = await supabase
          .from("content_translations")
          .select("content_type, content_id, locale, title, description, body")
          .eq("content_type", "book")
          .eq("content_id", bookId)
          .eq("locale", contentLocale)
          .maybeSingle();

        // chapter translations (map)
        const chapterIds = chapters.map((c) => c.id);
        const chTrRes =
          chapterIds.length > 0
            ? await supabase
                .from("content_translations")
                .select("content_type, content_id, locale, title, description, body")
                .eq("content_type", "chapter")
                .eq("locale", contentLocale)
                .in("content_id", chapterIds)
            : { data: [], error: null };

        if (bookTrRes?.error) {
          console.warn("Book translation load error:", bookTrRes.error);
        }
        if (chTrRes?.error) {
          console.warn("Chapter translations load error:", chTrRes.error);
        }

        const bookTr = (bookTrRes?.data as TranslationRow | null) ?? null;

        const chRows = ((chTrRes?.data as TranslationRow[]) || []).filter(
          (r) => r && r.content_id
        );
        const chMap = new Map<string, TranslationRow>();
        for (const r of chRows) chMap.set(r.content_id, r);

        const mergedBook: Book | null = book
          ? {
              ...book,
              title: bookTr?.title?.trim() ? bookTr.title : book.title,
              description: bookTr?.description?.trim()
                ? bookTr.description
                : book.description,
              content: bookTr?.body?.trim() ? bookTr.body : book.content,
            }
          : null;

        const mergedChapters: Chapter[] = chapters.map((ch) => {
          const tr = chMap.get(ch.id);
          return {
            ...ch,
            title: tr?.title?.trim() ? tr.title : ch.title,
            // chapters table uses `content` for body, map translation.body -> content
            content: tr?.body?.trim() ? tr.body : ch.content,
          };
        });

        setDisplayBook(mergedBook);
        setDisplayChapters(mergedChapters);
      } catch (e) {
        // table missing => fallback to originals
        console.warn("Translation preview skipped (fallback).", e);
        setDisplayBook(book);
        setDisplayChapters(chapters);
      }
    }

    loadTranslations();
  }, [bookId, contentLocale, book, chapters]);

  async function handleSaveBook(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!bookId) return;

    setSaving(true);
    setMessage(null);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      content: content.trim() || null,
      status,
    };

    const { data, error } = await supabase
      .from("books")
      .update(payload)
      .eq("id", bookId)
      .select("*")
      .single();

    if (error) {
      const msg =
        typeof (error as any)?.message === "string"
          ? (error as any).message
          : "Unknown Supabase error";
      setMessage(t.errSaveBook + msg);
    } else {
      setBook(data as Book);
      setMessage(t.updated);
    }

    setSaving(false);
  }

  async function handleDeleteBook() {
    if (!bookId) return;
    const ok = window.confirm(t.deleteConfirm);
    if (!ok) return;

    setSaving(true);
    setMessage(null);

    const { error } = await supabase.from("books").delete().eq("id", bookId);

    if (error) {
      const msg =
        typeof (error as any)?.message === "string"
          ? (error as any).message
          : "Unknown Supabase error";
      setMessage(t.errDeleteBook + msg);
      setSaving(false);
      return;
    }

    // ✅ keep locale, do NOT force /en
    router.push(`/${locale}/publisher/books`);
  }

  async function handleCreateChapter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!bookId) return;

    if (!chapterTitle.trim() || chapterNumber === "" || !chapterContent.trim()) {
      setMessage(t.fillAll);
      return;
    }

    setChapterSaving(true);
    setMessage(null);

    const payload = {
      book_id: bookId,
      chapter_number: Number(chapterNumber),
      title: chapterTitle.trim(),
      content: chapterContent.trim(),
    };

    const { data, error } = await supabase
      .from("chapters")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      const msg =
        typeof (error as any)?.message === "string"
          ? (error as any).message
          : "Unknown Supabase error";
      setMessage(t.errCreateChapter + msg);
    } else {
      setChapters((prev) =>
        [...prev, data as Chapter].sort(
          (a, b) => a.chapter_number - b.chapter_number
        )
      );
      setChapterTitle("");
      setChapterNumber("");
      setChapterContent("");
      setMessage(t.createdChapter);
    }

    setChapterSaving(false);
  }

  async function handleDeleteChapter(chapterId: string) {
    const ok = window.confirm(t.deleteChapterConfirm);
    if (!ok) return;

    const { error } = await supabase.from("chapters").delete().eq("id", chapterId);

    if (error) {
      const msg =
        typeof (error as any)?.message === "string"
          ? (error as any).message
          : "Unknown Supabase error";
      setMessage("Error deleting chapter: " + msg);
      return;
    }

    setChapters((prev) => prev.filter((c) => c.id !== chapterId));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-400">{t.loading}</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex items-center justify-center">
        <p className="text-sm text-red-400">{message ?? t.notFound}</p>
      </div>
    );
  }

  const shownBook = displayBook ?? book;
  const shownChapters = displayChapters;

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <main className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        <section className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{t.pageTitle}</h1>
            <p className="text-sm text-slate-300">{shownBook.title}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              {t.createdAt}: {new Date(book.created_at).toLocaleString()}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Content preview language dropdown */}
            <select
              className="rounded-full border border-slate-700 bg-black px-3 py-1 text-xs text-slate-200 outline-none focus:border-emerald-400"
              value={contentLocale}
              onChange={(e) => setContentLocale(e.target.value as Locale)}
              title="Preview content language"
            >
              {localeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>

            <button
              onClick={handleDeleteBook}
              className="text-xs rounded-full border border-red-500 px-3 py-1 text-red-300 hover:bg-red-500 hover:text-black disabled:opacity-60"
              disabled={saving}
            >
              {t.deleteBook}
            </button>
          </div>
        </section>

        {message && (
          <p className="text-xs text-slate-200 border border-slate-700 rounded-lg px-2 py-1">
            {message}
          </p>
        )}

        {/* Edit book form (edits ORIGINAL book text) */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <h2 className="text-lg font-semibold">{t.bookDetails}</h2>

          <form onSubmit={handleSaveBook} className="space-y-3 text-sm">
            <div className="space-y-1">
              <label className="block text-slate-200">{t.title}</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-200">{t.description}</label>
              <textarea
                className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-200">{t.bookContentOptional}</label>
              <textarea
                className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-200">{t.status}</label>
              <select
                className="w-full max-w-xs rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                value={status}
                onChange={(e) => setStatus(e.target.value as BookStatus)}
              >
                <option value="draft">{t.draft}</option>
                <option value="published">{t.published}</option>
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-black hover:bg-fuchsia-400 disabled:opacity-60"
              disabled={saving}
            >
              {t.save}
            </button>
          </form>
        </section>

        {/* Chapters */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">{t.chapters}</h2>

          {/* New chapter form (creates ORIGINAL chapter text) */}
          <form
            onSubmit={handleCreateChapter}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 text-sm"
          >
            <p className="font-medium text-slate-200">{t.addNewChapter}</p>

            <div className="flex flex-wrap gap-3">
              <div className="space-y-1 flex-1 min-w-[140px]">
                <label className="block text-slate-200">{t.chapterNumber}</label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                  value={chapterNumber}
                  onChange={(e) =>
                    setChapterNumber(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  placeholder="1"
                  min={1}
                />
              </div>

              <div className="space-y-1 flex-[2] min-w-[200px]">
                <label className="block text-slate-200">{t.chapterTitle}</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="Chapter title"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-200">{t.chapterContent}</label>
              <textarea
                className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                rows={6}
                value={chapterContent}
                onChange={(e) => setChapterContent(e.target.value)}
                placeholder="Write the chapter content here..."
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
              disabled={chapterSaving}
            >
              {t.addChapter}
            </button>
          </form>

          {/* Chapter list (PREVIEW translated titles/content snippet) */}
          <div className="space-y-2 text-sm">
            {shownChapters.length === 0 ? (
              <p className="text-slate-400">{t.noChapters}</p>
            ) : (
              shownChapters.map((ch) => (
                <div
                  key={ch.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {ch.chapter_number}. {ch.title}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {t.createdAt}: {new Date(ch.created_at).toLocaleString()}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">
                      {(ch.content || "").slice(0, 140)}…
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteChapter(ch.id)}
                    className="text-[11px] rounded-full border border-red-500 px-2 py-1 text-red-300 hover:bg-red-500 hover:text-black"
                  >
                    {t.delete}
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
