"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Status = "loading" | "ok" | "error";
type Locale = "en" | "ko" | "mn" | "ja";

type BookRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  status?: "draft" | "published" | null;
};

type ChapterRow = {
  id: string;
  book_id: string;
  chapter_number: number | null;
  title: string | null;
  content: string | null;
  created_at: string;
  status?: string | null;
  is_published?: boolean | null;
  published_at?: string | null;
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
    title: "Library – Published books",
    subtitleA: "All books that creators marked as ",
    subtitleB: "published",
    loading: "Loading books…",
    errTitle: "Couldn't load books",
    empty:
      "No published books yet. Once you publish one from the studio, it will appear here.",
    untitled: "Untitled book",
    noDesc: "No description yet.",
    created: "Created",
    open: "Open",
  },
  ko: {
    title: "라이브러리 – 게시된 책",
    subtitleA: "크리에이터가 ",
    subtitleB: "게시됨",
    loading: "책 불러오는 중…",
    errTitle: "책을 불러올 수 없습니다",
    empty: "아직 게시된 책이 없습니다. 스튜디오에서 게시하면 여기에 표시됩니다.",
    untitled: "제목 없음",
    noDesc: "설명이 없습니다.",
    created: "생성일",
    open: "열기",
  },
  mn: {
    title: "Номын сан – Нийтлэгдсэн номууд",
    subtitleA: "Бүтээгчид ",
    subtitleB: "нийтэлсэн",
    loading: "Номууд ачаалж байна…",
    errTitle: "Ном ачаалж чадсангүй",
    empty:
      "Одоогоор нийтлэгдсэн ном алга. Студиогоос нийтэлбэл энд гарч ирнэ.",
    untitled: "Гарчиггүй ном",
    noDesc: "Тайлбар алга.",
    created: "Үүсгэсэн",
    open: "Нээх",
  },
  ja: {
    title: "ライブラリ – 公開された本",
    subtitleA: "クリエイターが ",
    subtitleB: "公開",
    loading: "読み込み中…",
    errTitle: "本を読み込めませんでした",
    empty: "公開された本はまだありません。スタジオで公開するとここに表示されます。",
    untitled: "無題の本",
    noDesc: "説明はまだありません。",
    created: "作成日",
    open: "開く",
  },
} as const;

function safeLocale(raw: string): Locale {
  return (["en", "ko", "mn", "ja"].includes(raw) ? raw : "en") as Locale;
}

function isPublishedChapter(chapter: ChapterRow) {
  return (
    chapter.status === "published" ||
    chapter.is_published === true ||
    Boolean(chapter.published_at)
  );
}

export default function ReaderBooksPage() {
  const params = useParams();
  const router = useRouter();

  const locale = safeLocale((params?.locale as string) || "en");
  const bookId = (params?.bookId as string) || "";
  const t = UI[locale];

  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [book, setBook] = useState<BookRow | null>(null);
  const [description, setDescription] = useState<string>("");
  const [firstChapterNumber, setFirstChapterNumber] = useState<number | null>(null);

  useEffect(() => {
    async function loadBookPage() {
      if (!bookId) {
        setErrorMessage("Missing book id.");
        setStatus("error");
        return;
      }

      setStatus("loading");
      setErrorMessage(null);
      setBook(null);
      setDescription("");
      setFirstChapterNumber(null);

      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .select("id, title, description, created_at, status")
        .eq("id", bookId)
        .eq("status", "published")
        .maybeSingle();

      if (bookError || !bookData) {
        setErrorMessage(bookError?.message || "Book not found.");
        setStatus("error");
        return;
      }

      const baseBook = bookData as BookRow;

      let finalBook = baseBook;
      let finalDescription = baseBook.description ?? "";

      try {
        const trRes = await supabase
          .from("content_translations")
          .select("content_type, content_id, locale, title, description, body")
          .eq("content_type", "book")
          .eq("content_id", bookId)
          .eq("locale", locale)
          .maybeSingle();

        const tr = (trRes?.data as TranslationRow | null) ?? null;

        finalBook = {
          ...baseBook,
          title: tr?.title?.trim() ? tr.title : baseBook.title,
          description: tr?.description?.trim() ? tr.description : baseBook.description,
        };

        finalDescription = finalBook.description ?? "";
      } catch {
        finalBook = baseBook;
        finalDescription = baseBook.description ?? "";
      }

      const { data: chapterData, error: chapterError } = await supabase
        .from("chapters")
        .select(
          "id, book_id, chapter_number, title, content, created_at, status, is_published, published_at"
        )
        .eq("book_id", bookId)
        .order("chapter_number", { ascending: true });

      if (chapterError) {
        setErrorMessage(chapterError.message);
        setStatus("error");
        return;
      }

      const publishedChapters = ((chapterData || []) as ChapterRow[])
        .filter(isPublishedChapter)
        .filter((chapter) => typeof chapter.chapter_number === "number");

      const firstPublishedChapter = publishedChapters[0] ?? null;

      setBook(finalBook);
      setDescription(finalDescription);
      setFirstChapterNumber(firstPublishedChapter?.chapter_number ?? null);
      setStatus("ok");
    }

    loadBookPage();
  }, [bookId, locale]);

  useEffect(() => {
    if (status !== "ok") return;
    if (!bookId) return;
    if (firstChapterNumber == null) return;

    router.replace(`/${locale}/reader/${bookId}/${firstChapterNumber}`);
  }, [status, bookId, locale, firstChapterNumber, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#020417] text-slate-50">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-6 py-8 text-sm text-slate-300">
            {t.loading}
          </div>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="min-h-screen bg-[#020417] text-slate-50">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
          <div className="rounded-2xl border border-red-500/40 bg-red-900/30 px-6 py-8 text-sm text-red-200">
            <div className="text-base font-semibold">{t.errTitle}</div>
            <p className="mt-2 text-xs opacity-80">{errorMessage || "Unknown error."}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-[#020417] text-slate-50">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
          <div className="rounded-2xl border border-red-500/40 bg-red-900/30 px-6 py-8 text-sm text-red-200">
            <div className="text-base font-semibold">{t.errTitle}</div>
          </div>
        </div>
      </div>
    );
  }

  if (firstChapterNumber == null) {
    return (
      <div className="min-h-screen bg-[#020417] text-slate-50">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
            <h1 className="text-2xl font-semibold tracking-tight">{book.title || t.untitled}</h1>
            <p className="mt-3 text-sm text-slate-400">{description || t.noDesc}</p>
            <p className="mt-4 text-xs text-slate-500">
              {t.created} {new Date(book.created_at).toLocaleDateString()}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-6 py-8 text-sm text-slate-300">
            {t.empty}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020417] text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
        <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-6">
          <h1 className="text-2xl font-semibold tracking-tight">{book.title || t.untitled}</h1>
          <p className="mt-3 text-sm text-slate-400">{description || t.noDesc}</p>
          <p className="mt-4 text-xs text-slate-500">
            {t.created} {new Date(book.created_at).toLocaleDateString()}
          </p>

          <div className="mt-6">
            <Link
              href={`/${locale}/reader/${bookId}/${firstChapterNumber}`}
              className="inline-flex rounded-full border border-slate-700 px-4 py-2 text-sm font-medium text-slate-100 transition hover:border-indigo-500/70 hover:bg-slate-900"
            >
              {t.open}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}