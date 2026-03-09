"use client";

import { useEffect, useMemo, useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import OptionSearchSelect from "@/components/publisher/OptionSearchSelect";
import {
  CONTENT_TYPES,
  MAIN_GENRES,
  AUDIENCES,
  READING_FORMATS,
  SUBGENRES,
  getLocalizedLabel,
  getRecommendedGenresFromContentType,
  type Locale as PublisherLocale,
} from "@/lib/publisher-options";

type BookStatus = "draft" | "published";
type Locale = "en" | "ko" | "mn" | "ja";

type Book = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  status: BookStatus;
  created_at: string;
  updated_at?: string | null;
  content_type: string | null;
  main_genre: string | null;
  subgenre: string[] | null;
  audience: string | null;
  reading_format: string | null;
};

type Chapter = {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
  content: string;
  created_at: string;
  status?: string | null;
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
    back: "Back to Books",
    pageEyebrow: "Publisher · Manage Book",
    pageTitle: "Manage book",
    pageSubtitle:
      "Edit metadata, manage chapters, and prepare this book for the reader structure.",
    createdAt: "Created",
    updatedAt: "Updated",
    deleteBook: "Delete book",
    deleteConfirm:
      "Delete this book and all its chapters? This cannot be undone.",
    bookDetails: "Book details",
    readerPrep: "Reader preparation",
    readerPrepText:
      "This page keeps metadata, chapter order, and core structure clean before deeper reader work.",
    openReader: "Open reader",
    title: "Title",
    description: "Description",
    bookContentOptional: "Book content (optional if you use chapters)",
    status: "Status",
    contentType: "Content type",
    mainGenre: "Main genre",
    subgenre: "Subgenre",
    audience: "Audience",
    readingFormat: "Reading format",
    draft: "Draft",
    published: "Published",
    save: "Save changes",
    saving: "Saving...",
    chapters: "Chapters",
    addNewChapter: "Add new chapter",
    chapterNumber: "Chapter number",
    chapterTitle: "Title",
    chapterContent: "Content",
    addChapter: "Add chapter",
    noChapters: "No chapters yet. Create the first chapter below.",
    delete: "Delete",
    editChapter: "Edit",
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
    errDeleteChapter: "Error deleting chapter: ",
    chapterTitlePlaceholder: "Chapter title",
    chapterContentPlaceholder: "Write the chapter content here...",
    untitledChapter: "Untitled chapter",
  },
  ko: {
    back: "도서 목록으로 돌아가기",
    pageEyebrow: "퍼블리셔 · 도서 관리",
    pageTitle: "책 관리",
    pageSubtitle:
      "메타데이터를 수정하고, 챕터를 관리하고, 리더 구조를 준비합니다.",
    createdAt: "생성일",
    updatedAt: "수정일",
    deleteBook: "책 삭제",
    deleteConfirm: "이 책과 모든 챕터를 삭제할까요? 되돌릴 수 없습니다.",
    bookDetails: "책 정보",
    readerPrep: "리더 준비",
    readerPrepText:
      "이 페이지는 본격적인 리더 작업 전에 메타데이터, 챕터 순서, 기본 구조를 정리합니다.",
    openReader: "리더 열기",
    title: "제목",
    description: "설명",
    bookContentOptional: "책 내용 (챕터를 쓰면 선택)",
    status: "상태",
    contentType: "콘텐츠 유형",
    mainGenre: "메인 장르",
    subgenre: "서브 장르",
    audience: "대상 독자",
    readingFormat: "읽기 형식",
    draft: "초안",
    published: "게시됨",
    save: "저장",
    saving: "저장 중...",
    chapters: "챕터",
    addNewChapter: "새 챕터 추가",
    chapterNumber: "챕터 번호",
    chapterTitle: "제목",
    chapterContent: "내용",
    addChapter: "챕터 추가",
    noChapters: "아직 챕터가 없습니다. 아래에서 첫 챕터를 만들어주세요.",
    delete: "삭제",
    editChapter: "수정",
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
    errDeleteChapter: "챕터 삭제 오류: ",
    chapterTitlePlaceholder: "챕터 제목",
    chapterContentPlaceholder: "여기에 챕터 내용을 작성하세요...",
    untitledChapter: "제목 없는 챕터",
  },
  mn: {
    back: "Номын жагсаалт руу буцах",
    pageEyebrow: "Нийтлэгч · Ном удирдах",
    pageTitle: "Ном удирдах",
    pageSubtitle:
      "Мета өгөгдөл засах, бүлэг удирдах, уншигчийн бүтцийг бэлтгэх.",
    createdAt: "Үүсгэсэн",
    updatedAt: "Шинэчилсэн",
    deleteBook: "Ном устгах",
    deleteConfirm:
      "Энэ ном болон бүх бүлгийг устгах уу? Буцаах боломжгүй.",
    bookDetails: "Номын мэдээлэл",
    readerPrep: "Уншигчийн бэлтгэл",
    readerPrepText:
      "Энэ хуудас дараагийн reader ажлын өмнө мета өгөгдөл, бүлгийн дараалал, үндсэн бүтцийг цэвэр байлгана.",
    openReader: "Reader нээх",
    title: "Гарчиг",
    description: "Тайлбар",
    bookContentOptional: "Номын агуулга (бүлэг ашиглавал заавал биш)",
    status: "Төлөв",
    contentType: "Агуулгын төрөл",
    mainGenre: "Үндсэн төрөл",
    subgenre: "Дэд төрөл",
    audience: "Уншигчдын ангилал",
    readingFormat: "Унших формат",
    draft: "Ноорог",
    published: "Нийтэлсэн",
    save: "Хадгалах",
    saving: "Хадгалж байна...",
    chapters: "Бүлгүүд",
    addNewChapter: "Шинэ бүлэг нэмэх",
    chapterNumber: "Бүлгийн дугаар",
    chapterTitle: "Гарчиг",
    chapterContent: "Агуулга",
    addChapter: "Бүлэг нэмэх",
    noChapters: "Одоогоор бүлэг алга. Доороос эхний бүлгийг үүсгээрэй.",
    delete: "Устгах",
    editChapter: "Засах",
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
    errDeleteChapter: "Бүлэг устгах алдаа: ",
    chapterTitlePlaceholder: "Бүлгийн гарчиг",
    chapterContentPlaceholder: "Бүлгийн агуулгаа энд бичнэ үү...",
    untitledChapter: "Нэргүй бүлэг",
  },
  ja: {
    back: "本一覧に戻る",
    pageEyebrow: "出版社 · 本の管理",
    pageTitle: "本を管理",
    pageSubtitle:
      "メタデータを編集し、チャプターを管理し、リーダー構造を準備します。",
    createdAt: "作成日",
    updatedAt: "更新日",
    deleteBook: "本を削除",
    deleteConfirm: "この本と全チャプターを削除しますか？元に戻せません。",
    bookDetails: "本の詳細",
    readerPrep: "リーダー準備",
    readerPrepText:
      "このページでは、本格的なリーダー作業の前にメタデータ、チャプター順、基本構造を整えます。",
    openReader: "リーダーを開く",
    title: "タイトル",
    description: "説明",
    bookContentOptional: "本文（チャプターを使う場合は任意）",
    status: "ステータス",
    contentType: "コンテンツ種別",
    mainGenre: "メインジャンル",
    subgenre: "サブジャンル",
    audience: "対象読者",
    readingFormat: "読書形式",
    draft: "下書き",
    published: "公開済み",
    save: "保存",
    saving: "保存中...",
    chapters: "チャプター",
    addNewChapter: "新しいチャプターを追加",
    chapterNumber: "番号",
    chapterTitle: "タイトル",
    chapterContent: "内容",
    addChapter: "追加",
    noChapters: "まだチャプターがありません。下で最初のチャプターを作成してください。",
    delete: "削除",
    editChapter: "編集",
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
    errDeleteChapter: "チャプター削除エラー: ",
    chapterTitlePlaceholder: "チャプタータイトル",
    chapterContentPlaceholder: "ここにチャプター内容を書いてください...",
    untitledChapter: "無題のチャプター",
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

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<BookStatus>("draft");

  const [contentType, setContentType] = useState("");
  const [mainGenre, setMainGenre] = useState("");
  const [subgenre, setSubgenre] = useState<string[]>([]);
  const [audience, setAudience] = useState("");
  const [readingFormat, setReadingFormat] = useState("");

  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterNumber, setChapterNumber] = useState<number | "">("");
  const [chapterContent, setChapterContent] = useState("");
  const [chapterSaving, setChapterSaving] = useState(false);

  const [displayBook, setDisplayBook] = useState<Book | null>(null);
  const [displayChapters, setDisplayChapters] = useState<Chapter[]>([]);

  const localeForDate = useMemo(() => {
    return locale === "mn"
      ? "mn-MN"
      : locale === "ko"
      ? "ko-KR"
      : locale === "ja"
      ? "ja-JP"
      : "en-GB";
  }, [locale]);

  const recommendedGenres = useMemo(() => {
    return getRecommendedGenresFromContentType(contentType);
  }, [contentType]);

  useEffect(() => {
    if (!bookId) return;

    async function loadData() {
      setLoading(true);
      setMessage(null);

      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .select(
          "id, title, description, content, status, created_at, updated_at, content_type, main_genre, subgenre, audience, reading_format"
        )
        .eq("id", bookId)
        .maybeSingle();

      if (bookError || !bookData) {
        const errorMessage =
          bookError && typeof bookError.message === "string"
            ? bookError.message
            : t.notFound;

        setMessage(t.errLoadBook + errorMessage);
        setLoading(false);
        return;
      }

      const b = bookData as Book;
      setBook(b);
      setTitle(b.title ?? "");
      setDescription(b.description ?? "");
      setContent(b.content ?? "");
      setStatus(b.status ?? "draft");
      setContentType(b.content_type ?? "");
      setMainGenre(b.main_genre ?? "");
      setSubgenre(Array.isArray(b.subgenre) ? b.subgenre : []);
      setAudience(b.audience ?? "");
      setReadingFormat(b.reading_format ?? "");

      const { data: chapterData, error: chapterError } = await supabase
        .from("chapters")
        .select("id, book_id, chapter_number, title, content, created_at, status")
        .eq("book_id", bookId)
        .order("chapter_number", { ascending: true });

      if (chapterError) {
        const msg =
          typeof (chapterError as { message?: unknown })?.message === "string"
            ? chapterError.message
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

  useEffect(() => {
    if (!bookId) return;

    async function loadTranslations() {
      setDisplayBook(book);
      setDisplayChapters(chapters);

      try {
        const bookTrRes = await supabase
          .from("content_translations")
          .select("content_type, content_id, locale, title, description, body")
          .eq("content_type", "book")
          .eq("content_id", bookId)
          .eq("locale", locale)
          .maybeSingle();

        const chapterIds = chapters.map((c) => c.id);
        const chTrRes =
          chapterIds.length > 0
            ? await supabase
                .from("content_translations")
                .select("content_type, content_id, locale, title, description, body")
                .eq("content_type", "chapter")
                .eq("locale", locale)
                .in("content_id", chapterIds)
            : { data: [], error: null };

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
            content: tr?.body?.trim() ? tr.body : ch.content,
          };
        });

        setDisplayBook(mergedBook);
        setDisplayChapters(mergedChapters);
      } catch {
        setDisplayBook(book);
        setDisplayChapters(chapters);
      }
    }

    loadTranslations();
  }, [bookId, locale, book, chapters]);

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
      content_type: contentType || null,
      main_genre: mainGenre || null,
      subgenre,
      audience: audience || null,
      reading_format: readingFormat || null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("books")
      .update(payload)
      .eq("id", bookId)
      .select(
        "id, title, description, content, status, created_at, updated_at, content_type, main_genre, subgenre, audience, reading_format"
      )
      .maybeSingle();

    if (error) {
      const msg =
        typeof (error as { message?: unknown })?.message === "string"
          ? error.message
          : "Unknown Supabase error";
      setMessage(t.errSaveBook + msg);
    } else if (data) {
      const updatedBook = data as Book;
      setBook(updatedBook);
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
        typeof (error as { message?: unknown })?.message === "string"
          ? error.message
          : "Unknown Supabase error";
      setMessage(t.errDeleteBook + msg);
      setSaving(false);
      return;
    }

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
      .select("id, book_id, chapter_number, title, content, created_at, status")
      .maybeSingle();

    if (error) {
      const msg =
        typeof (error as { message?: unknown })?.message === "string"
          ? error.message
          : "Unknown Supabase error";
      setMessage(t.errCreateChapter + msg);
    } else if (data) {
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
        typeof (error as { message?: unknown })?.message === "string"
          ? error.message
          : "Unknown Supabase error";
      setMessage(t.errDeleteChapter + msg);
      return;
    }

    setChapters((prev) => prev.filter((c) => c.id !== chapterId));
  }

  async function moveChapter(chapterId: string, direction: "up" | "down") {
    const sorted = [...chapters].sort(
      (a, b) => a.chapter_number - b.chapter_number
    );

    const index = sorted.findIndex((c) => c.id === chapterId);
    if (index === -1) return;

    const current = sorted[index];
    const target = direction === "up" ? sorted[index - 1] : sorted[index + 1];
    if (!target) return;

    const currentNumber = current.chapter_number;
    const targetNumber = target.chapter_number;

    const { error: errorA } = await supabase
      .from("chapters")
      .update({ chapter_number: targetNumber })
      .eq("id", current.id);

    if (errorA) {
      const msg =
        typeof (errorA as { message?: unknown })?.message === "string"
          ? errorA.message
          : "Unknown Supabase error";
      setMessage(t.errLoadChapters + msg);
      return;
    }

    const { error: errorB } = await supabase
      .from("chapters")
      .update({ chapter_number: currentNumber })
      .eq("id", target.id);

    if (errorB) {
      const msg =
        typeof (errorB as { message?: unknown })?.message === "string"
          ? errorB.message
          : "Unknown Supabase error";
      setMessage(t.errLoadChapters + msg);
      return;
    }

    setChapters((prev) =>
      prev
        .map((c) => {
          if (c.id === current.id) return { ...c, chapter_number: targetNumber };
          if (c.id === target.id) return { ...c, chapter_number: currentNumber };
          return c;
        })
        .sort((a, b) => a.chapter_number - b.chapter_number)
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen theme-soft">
        <main className="mx-auto w-full max-w-6xl px-6 py-10 md:px-8 md:py-12">
          <div className="rounded-[28px] border border-black/5 bg-[rgba(255,255,255,0.72)] p-8 shadow-sm backdrop-blur-sm">
            <p className="text-sm text-stone-600">{t.loading}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen theme-soft">
        <main className="mx-auto w-full max-w-6xl px-6 py-10 md:px-8 md:py-12">
          <div className="rounded-[28px] border border-black/5 bg-[rgba(255,255,255,0.72)] p-8 shadow-sm backdrop-blur-sm">
            <p className="text-sm text-rose-700">{message ?? t.notFound}</p>
          </div>
        </main>
      </div>
    );
  }

  const shownBook = displayBook ?? book;
  const shownChapters = [...displayChapters].sort(
    (a, b) => a.chapter_number - b.chapter_number
  );

  return (
    <div className="min-h-screen theme-soft">
      <main className="mx-auto w-full max-w-6xl px-6 py-10 md:px-8 md:py-12">
        <section className="mb-8 rounded-[28px] border border-black/5 bg-[rgba(255,255,255,0.72)] p-6 shadow-sm backdrop-blur-sm md:p-8">
          <Link
            href={`/${locale}/publisher/books`}
            className="inline-flex text-sm font-medium text-stone-700 hover:text-stone-950"
          >
            ← {t.back}
          </Link>

          <div className="mt-5 space-y-3">
            <div
              className="inline-flex rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.16em] text-stone-600"
              style={{
                borderColor: "rgba(47,47,47,0.08)",
                background: "rgba(245,241,235,0.9)",
              }}
            >
              {t.pageEyebrow}
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-stone-900 md:text-4xl">
                {t.pageTitle}
              </h1>
              <p className="text-base text-stone-700">{shownBook.title}</p>
              <p className="max-w-3xl text-sm leading-6 text-stone-600 md:text-base">
                {t.pageSubtitle}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 pt-1 text-xs text-stone-500">
              <span>
                {t.createdAt}: {formatDate(book.created_at, localeForDate)}
              </span>
              <span>•</span>
              <span>
                {t.updatedAt}: {formatDate(book.updated_at, localeForDate)}
              </span>
            </div>
          </div>
        </section>

        {message && (
          <div className="mb-6 rounded-2xl border border-black/5 bg-[rgba(255,255,255,0.72)] px-4 py-3 text-sm text-stone-700 shadow-sm backdrop-blur-sm">
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <div className="space-y-6">
            <section className="rounded-[28px] border border-black/5 bg-[rgba(255,255,255,0.72)] p-6 shadow-sm backdrop-blur-sm md:p-8">
              <h2 className="mb-5 text-xl font-semibold text-stone-900">
                {t.bookDetails}
              </h2>

              <form onSubmit={handleSaveBook} className="space-y-5">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-stone-700">
                    {t.title}
                  </label>
                  <input
                    type="text"
                    className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-black/20"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-stone-700">
                    {t.description}
                  </label>
                  <textarea
                    className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-black/20"
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-stone-700">
                    {t.bookContentOptional}
                  </label>
                  <textarea
                    className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-black/20"
                    rows={6}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                  />
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-stone-700">
                      {t.status}
                    </label>
                    <select
                      className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-black/20"
                      value={status}
                      onChange={(e) => setStatus(e.target.value as BookStatus)}
                    >
                      <option value="draft">{t.draft}</option>
                      <option value="published">{t.published}</option>
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-stone-700">
                      {t.contentType}
                    </label>
                    <select
                      className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-black/20"
                      value={contentType}
                      onChange={(e) => {
                        const next = e.target.value;
                        setContentType(next);

                        const recommended = getRecommendedGenresFromContentType(next);
                        if (recommended.length > 0 && !recommended.includes(mainGenre)) {
                          setMainGenre(recommended[0]);
                        }
                      }}
                    >
                      <option value=""></option>
                      {CONTENT_TYPES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {getLocalizedLabel(item, locale as PublisherLocale)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-stone-700">
                      {t.mainGenre}
                    </label>
                    <OptionSearchSelect
                      options={MAIN_GENRES}
                      value={mainGenre}
                      onChange={setMainGenre}
                      locale={locale as PublisherLocale}
                      recommendations={recommendedGenres}
                    />
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-stone-700">
                      {t.subgenre}
                    </label>
                    <OptionSearchSelect
                      options={SUBGENRES}
                      value={subgenre}
                      onChange={setSubgenre}
                      locale={locale as PublisherLocale}
                      multiple
                    />
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-stone-700">
                      {t.audience}
                    </label>
                    <select
                      className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-black/20"
                      value={audience}
                      onChange={(e) => setAudience(e.target.value)}
                    >
                      <option value=""></option>
                      {AUDIENCES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {getLocalizedLabel(item, locale as PublisherLocale)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-stone-700">
                      {t.readingFormat}
                    </label>
                    <select
                      className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-black/20"
                      value={readingFormat}
                      onChange={(e) => setReadingFormat(e.target.value)}
                    >
                      <option value=""></option>
                      {READING_FORMATS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {getLocalizedLabel(item, locale as PublisherLocale)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="submit"
                    className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-60"
                    disabled={saving}
                  >
                    {saving ? t.saving : t.save}
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteBook}
                    className="inline-flex items-center justify-center rounded-full border border-red-300 bg-white/80 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60"
                    disabled={saving}
                  >
                    {t.deleteBook}
                  </button>
                </div>
              </form>
            </section>

            <section className="rounded-[28px] border border-black/5 bg-[rgba(255,255,255,0.72)] p-6 shadow-sm backdrop-blur-sm md:p-8">
              <h2 className="mb-5 text-xl font-semibold text-stone-900">
                {t.chapters}
              </h2>

              <form onSubmit={handleCreateChapter} className="space-y-4">
                <p className="text-sm font-medium text-stone-700">
                  {t.addNewChapter}
                </p>

                <div className="grid gap-4 md:grid-cols-[160px_1fr]">
                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-stone-700">
                      {t.chapterNumber}
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-black/20"
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

                  <div className="grid gap-2">
                    <label className="text-sm font-medium text-stone-700">
                      {t.chapterTitle}
                    </label>
                    <input
                      type="text"
                      className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-black/20"
                      value={chapterTitle}
                      onChange={(e) => setChapterTitle(e.target.value)}
                      placeholder={t.chapterTitlePlaceholder}
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-stone-700">
                    {t.chapterContent}
                  </label>
                  <textarea
                    className="w-full rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-black/20"
                    rows={6}
                    value={chapterContent}
                    onChange={(e) => setChapterContent(e.target.value)}
                    placeholder={t.chapterContentPlaceholder}
                  />
                </div>

                <button
                  type="submit"
                  className="inline-flex items-center justify-center rounded-full border border-black/10 bg-[rgba(245,241,235,0.9)] px-5 py-3 text-sm font-semibold text-stone-900 transition hover:bg-white disabled:opacity-60"
                  disabled={chapterSaving}
                >
                  {t.addChapter}
                </button>
              </form>

              <div className="mt-6 space-y-3">
                {shownChapters.length === 0 ? (
                  <p className="text-sm text-stone-500">{t.noChapters}</p>
                ) : (
                  shownChapters.map((ch) => (
                    <div
                      key={ch.id}
                      className="rounded-2xl border border-black/5 bg-[rgba(245,241,235,0.65)] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.14em] text-stone-500">
                            {t.chapterNumber} {ch.chapter_number}
                          </p>
                          <p className="mt-1 truncate text-sm font-semibold text-stone-900">
                            {ch.title?.trim() || t.untitledChapter}
                          </p>
                          <p className="mt-1 text-[11px] text-stone-500">
                            {t.createdAt}: {formatDate(ch.created_at, localeForDate)}
                          </p>
                          <p className="mt-2 text-[12px] leading-5 text-stone-600 line-clamp-2">
                            {(ch.content || "").slice(0, 160)}
                            {(ch.content || "").length > 160 ? "…" : ""}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => moveChapter(ch.id, "up")}
                            className="rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-white/80"
                          >
                            ↑
                          </button>

                          <button
                            type="button"
                            onClick={() => moveChapter(ch.id, "down")}
                            className="rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-white/80"
                          >
                            ↓
                          </button>

                          <Link
                            href={`/${locale}/publisher/chapters/${ch.id}`}
                            className="rounded-full border border-black/10 px-3 py-1.5 text-[11px] font-medium text-stone-700 hover:bg-white/80"
                          >
                            {t.editChapter}
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleDeleteChapter(ch.id)}
                            className="rounded-full border border-red-300 px-3 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-50"
                          >
                            {t.delete}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-[28px] border border-black/5 bg-[rgba(255,255,255,0.72)] p-6 shadow-sm backdrop-blur-sm md:p-8">
              <h2 className="mb-4 text-xl font-semibold text-stone-900">
                {t.readerPrep}
              </h2>
              <div className="rounded-2xl border border-black/5 bg-[rgba(245,241,235,0.7)] p-4">
                <p className="text-sm leading-6 text-stone-600">{t.readerPrepText}</p>
              </div>

              <div className="mt-4">
                <Link
                  href={`/${locale}/reader/${book.id}`}
                  className="inline-flex rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-stone-800 transition hover:bg-white/80"
                >
                  {t.openReader}
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}