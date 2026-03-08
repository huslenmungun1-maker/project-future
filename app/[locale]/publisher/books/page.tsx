"use client";

import { useEffect, useState, FormEvent, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type BookStatus = "draft" | "published";
type SupportedLocale = "en" | "ko" | "mn" | "ja";

type Book = {
  id: string;
  title: string;
  description: string | null;
  status: BookStatus;
  created_at: string;
};

function normalizeLocale(raw: string): SupportedLocale {
  return (["en", "ko", "mn", "ja"].includes(raw) ? raw : "en") as SupportedLocale;
}

const UI_TEXT = {
  en: {
    pageTitle: "Publisher Studio · Books",
    pageTitleAccent: "Books",
    pageBody:
      "Create and manage your books. Books store metadata (title/description/status). Chapters store the actual writing. Click “Manage” to add chapters.",
    createTitle: "Create a new book",
    labelTitle: "Title",
    placeholderTitle: "e.g. The Future City of Ashes",
    labelDescription: "Short description (optional)",
    placeholderDescription:
      "e.g. A sci-fi story about a poet wandering in a megacity...",
    labelStatus: "Status",
    statusDraft: "Draft",
    statusPublished: "Published",
    statusHelp:
      "You can publish now or later — but readers should only see published books with chapters.",
    saving: "Saving…",
    createBook: "Create book",
    errorLoading: "Error loading books: ",
    errorSaving: "Error saving book: ",
    errorUpdating: "Error updating status: ",
    enterTitle: "Please enter a title.",
    createdMessage: "Book created. Now add chapters in Manage.",
    yourBooks: "Your books (from Supabase)",
    loadingBooks: "Loading books…",
    noBooks: "No books found yet. Create one using the form above.",
    createdAt: "Created at",
    idLabel: "ID",
    publish: "Publish",
    unpublish: "Unpublish",
    manage: "Manage",
  },
  ko: {
    pageTitle: "퍼블리셔 스튜디오 · 책",
    pageTitleAccent: "책",
    pageBody:
      "책을 만들고 관리하세요. 책은 메타데이터(제목/설명/상태)를 저장하고, 챕터는 실제 글을 저장합니다. 챕터를 추가하려면 “관리”를 누르세요.",
    createTitle: "새 책 만들기",
    labelTitle: "제목",
    placeholderTitle: "예: 재의 미래 도시",
    labelDescription: "짧은 설명 (선택)",
    placeholderDescription:
      "예: 거대 도시를 떠도는 시인에 대한 SF 이야기...",
    labelStatus: "상태",
    statusDraft: "초안",
    statusPublished: "게시됨",
    statusHelp:
      "지금 게시하거나 나중에 게시할 수 있습니다 — 하지만 리더에는 챕터가 있는 게시된 책만 보여야 합니다.",
    saving: "저장 중…",
    createBook: "책 만들기",
    errorLoading: "책 불러오기 오류: ",
    errorSaving: "책 저장 오류: ",
    errorUpdating: "상태 업데이트 오류: ",
    enterTitle: "제목을 입력하세요.",
    createdMessage: "책이 생성되었습니다. 이제 관리에서 챕터를 추가하세요.",
    yourBooks: "내 책들 (Supabase)",
    loadingBooks: "책 불러오는 중…",
    noBooks: "아직 책이 없습니다. 위 폼으로 하나 만들어 보세요.",
    createdAt: "생성일",
    idLabel: "ID",
    publish: "게시",
    unpublish: "게시 해제",
    manage: "관리",
  },
  mn: {
    pageTitle: "Нийтлэгч студи · Номууд",
    pageTitleAccent: "Номууд",
    pageBody:
      "Номоо үүсгэж, удирдаарай. Ном нь мета мэдээлэл (гарчиг/тайлбар/төлөв) хадгална. Бүлгүүд нь жинхэнэ бичвэрийг хадгална. Бүлэг нэмэх бол “Удирдах” дээр дар.",
    createTitle: "Шинэ ном үүсгэх",
    labelTitle: "Гарчиг",
    placeholderTitle: "ж. Ирээдүйн үнсний хот",
    labelDescription: "Богино тайлбар (сонголтоор)",
    placeholderDescription:
      "ж. Мегахотоор тэнүүчлэх яруу найрагчийн тухай шинжлэх ухааны уран зөгнөлт түүх...",
    labelStatus: "Төлөв",
    statusDraft: "Ноорог",
    statusPublished: "Нийтлэгдсэн",
    statusHelp:
      "Одоо нийтэлж болно эсвэл дараа нь — гэхдээ уншигчид зөвхөн бүлэгтэй нийтлэгдсэн номуудыг харах ёстой.",
    saving: "Хадгалж байна…",
    createBook: "Ном үүсгэх",
    errorLoading: "Ном ачаалах алдаа: ",
    errorSaving: "Ном хадгалах алдаа: ",
    errorUpdating: "Төлөв шинэчлэх алдаа: ",
    enterTitle: "Гарчиг оруулна уу.",
    createdMessage: "Ном үүслээ. Одоо Удирдах хэсэгт бүлэг нэмээрэй.",
    yourBooks: "Таны номууд (Supabase)",
    loadingBooks: "Ном ачаалж байна…",
    noBooks: "Одоогоор ном алга. Дээрх формоор нэгийг үүсгээрэй.",
    createdAt: "Үүсгэсэн",
    idLabel: "ID",
    publish: "Нийтлэх",
    unpublish: "Нууцлах",
    manage: "Удирдах",
  },
  ja: {
    pageTitle: "パブリッシャースタジオ · 本",
    pageTitleAccent: "本",
    pageBody:
      "本を作成して管理します。本はメタデータ（タイトル/説明/状態）を保存し、チャプターは実際の本文を保存します。チャプターを追加するには「管理」を押してください。",
    createTitle: "新しい本を作成",
    labelTitle: "タイトル",
    placeholderTitle: "例: 灰の未来都市",
    labelDescription: "短い説明（任意）",
    placeholderDescription:
      "例: 巨大都市をさまよう詩人のSFストーリー...",
    labelStatus: "ステータス",
    statusDraft: "下書き",
    statusPublished: "公開済み",
    statusHelp:
      "今すぐ公開しても後で公開しても大丈夫ですが、読者にはチャプターのある公開済みの本だけを見せるべきです。",
    saving: "保存中…",
    createBook: "本を作成",
    errorLoading: "本の読み込みエラー: ",
    errorSaving: "本の保存エラー: ",
    errorUpdating: "ステータス更新エラー: ",
    enterTitle: "タイトルを入力してください。",
    createdMessage: "本が作成されました。次は「管理」でチャプターを追加してください。",
    yourBooks: "あなたの本（Supabase）",
    loadingBooks: "本を読み込み中…",
    noBooks: "まだ本がありません。上のフォームから作成してください。",
    createdAt: "作成日時",
    idLabel: "ID",
    publish: "公開",
    unpublish: "非公開",
    manage: "管理",
  },
} as const;

export default function PublisherBooksPage() {
  const params = useParams();
  const locale = normalizeLocale((params?.locale as string) || "en");
  const t = UI_TEXT[locale];

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<BookStatus>("draft");

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    async function loadBooks() {
      setLoading(true);
      setMessage(null);

      const { data, error } = await supabase
        .from("books")
        .select("id, title, description, status, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        const msg =
          typeof (error as any)?.message === "string"
            ? (error as any).message
            : "Unknown Supabase error";
        setMessage(t.errorLoading + msg);
      } else {
        setBooks((data || []) as Book[]);
      }

      setLoading(false);
    }

    loadBooks();
  }, [t.errorLoading]);

  async function handleCreateBook(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    if (!title.trim()) {
      setMessage(t.enterTitle);
      return;
    }

    setSaving(true);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      status,
    };

    const { data, error } = await supabase
      .from("books")
      .insert(payload)
      .select("id, title, description, status, created_at")
      .single();

    if (error) {
      const msg =
        typeof (error as any)?.message === "string"
          ? (error as any).message
          : "Unknown Supabase error";
      setMessage(t.errorSaving + msg);
      setSaving(false);
      return;
    }

    const newBook = data as Book;
    setBooks((prev) => [newBook, ...prev]);

    setTitle("");
    setDescription("");
    setStatus("draft");
    setMessage(t.createdMessage);

    setSaving(false);
  }

  async function setBookStatus(bookId: string, nextStatus: BookStatus) {
    setMessage(null);

    const { error } = await supabase
      .from("books")
      .update({ status: nextStatus })
      .eq("id", bookId);

    if (error) {
      const msg =
        typeof (error as any)?.message === "string"
          ? (error as any).message
          : "Unknown Supabase error";
      setMessage(t.errorUpdating + msg);
      return;
    }

    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, status: nextStatus } : b))
    );
  }

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <main className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        <section>
          <h1 className="mb-2 text-3xl font-bold">
            {locale === "en" ? (
              <>
                Publisher Studio · <span className="text-fuchsia-400">{t.pageTitleAccent}</span>
              </>
            ) : (
              t.pageTitle
            )}
          </h1>
          <p className="max-w-2xl text-sm text-slate-300">{t.pageBody}</p>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <h2 className="text-lg font-semibold">{t.createTitle}</h2>

          <form onSubmit={handleCreateBook} className="space-y-3 text-sm">
            <div className="space-y-1">
              <label className="block text-slate-200">{t.labelTitle}</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t.placeholderTitle}
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-200">{t.labelDescription}</label>
              <textarea
                className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t.placeholderDescription}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-200">{t.labelStatus}</label>
              <select
                className="w-full max-w-xs rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                value={status}
                onChange={(e) => setStatus(e.target.value as BookStatus)}
              >
                <option value="draft">{t.statusDraft}</option>
                <option value="published">{t.statusPublished}</option>
              </select>

              <p className="text-[11px] text-slate-400 mt-1">{t.statusHelp}</p>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-black hover:bg-fuchsia-400 disabled:opacity-60"
              disabled={loading || saving}
            >
              {saving ? t.saving : t.createBook}
            </button>
          </form>

          {message && (
            <p className="text-xs text-slate-300 border border-slate-700 rounded-lg px-2 py-1 mt-2">
              {message}
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">{t.yourBooks}</h2>

          {loading ? (
            <p className="text-sm text-slate-400">{t.loadingBooks}</p>
          ) : books.length === 0 ? (
            <p className="text-sm text-slate-400">{t.noBooks}</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {books.map((book) => (
                <li
                  key={book.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{book.title}</p>

                      {book.description && (
                        <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                          {book.description}
                        </p>
                      )}

                      <p className="mt-1 text-[11px] text-slate-500">
                        {t.createdAt}:{" "}
                        {new Date(book.created_at).toLocaleString(localeForDate, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>

                      <p className="mt-1 text-[11px] text-slate-600">
                        {t.idLabel}: {book.id}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          book.status === "published"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-700/40 text-slate-200 border border-slate-600/60"
                        }`}
                      >
                        {book.status === "published" ? t.statusPublished : t.statusDraft}
                      </span>

                      <div className="flex items-center gap-2">
                        {book.status === "draft" ? (
                          <button
                            onClick={() => setBookStatus(book.id, "published")}
                            className="rounded-full border border-emerald-400 px-3 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-400 hover:text-black"
                          >
                            {t.publish}
                          </button>
                        ) : (
                          <button
                            onClick={() => setBookStatus(book.id, "draft")}
                            className="rounded-full border border-slate-500 px-3 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-200 hover:text-black"
                          >
                            {t.unpublish}
                          </button>
                        )}

                        <Link
                          href={`/${locale}/publisher/books/${book.id}`}
                          className="inline-flex items-center justify-center rounded-full border border-fuchsia-400 px-3 py-1 text-[11px] font-medium hover:bg-fuchsia-400 hover:text-black"
                        >
                          {t.manage}
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}