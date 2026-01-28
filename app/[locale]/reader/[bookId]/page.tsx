"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Status = "loading" | "ok" | "error";
type Locale = "en" | "ko" | "mn" | "ja";

type BookRow = {
  id: string;
  title: string;
  description: string | null;
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
  },
} as const;

function safeLocale(raw: string): Locale {
  return (["en", "ko", "mn", "ja"].includes(raw) ? raw : "en") as Locale;
}

export default function ReaderBooksPage() {
  const params = useParams();
  const locale = safeLocale((params?.locale as string) || "en");
  const t = UI[locale];

  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [books, setBooks] = useState<BookRow[]>([]);

  useEffect(() => {
    async function loadBooks() {
      setStatus("loading");
      setErrorMessage(null);

      const { data, error } = await supabase
        .from("books")
        .select("id, title, description, created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading published books:", error);
        setErrorMessage(error.message);
        setStatus("error");
        return;
      }

      const baseBooks = (data || []) as BookRow[];

      // --- translations (title/description) ---
      let finalBooks = baseBooks;

      try {
        const ids = baseBooks.map((b) => b.id);
        if (ids.length > 0) {
          const trRes = await supabase
            .from("content_translations")
            .select("content_type, content_id, locale, title, description, body")
            .eq("content_type", "book")
            .eq("locale", locale)
            .in("content_id", ids);

          if (trRes.error) {
            console.warn("Book translations not loaded:", trRes.error);
          } else {
            const rows = ((trRes.data as TranslationRow[]) || []).filter(
              (r) => r && r.content_id
            );
            const map = new Map<string, TranslationRow>();
            for (const r of rows) map.set(r.content_id, r);

            finalBooks = baseBooks.map((b) => {
              const tr = map.get(b.id);
              return {
                ...b,
                title: (tr?.title?.trim() ? tr.title : b.title) as string,
                description:
                  tr?.description?.trim() ? tr.description : b.description,
              };
            });
          }
        }
      } catch (e) {
        // table missing -> fallback
        console.warn("Translation lookup skipped (fallback).", e);
      }

      setBooks(finalBooks);
      setStatus("ok");
    }

    loadBooks();
  }, [locale]);

  const baseLocale = locale ? `/${locale}` : "";

  return (
    <div className="min-h-screen bg-[#020417] text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{t.title}</h1>
            <p className="mt-1 text-xs text-slate-400">
              {t.subtitleA}
              <span className="font-semibold text-indigo-200">{t.subtitleB}</span>.
            </p>
          </div>
        </header>

        {status === "loading" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-6 py-8 text-sm text-slate-300">
            {t.loading}
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl border border-red-500/40 bg-red-900/30 px-6 py-8 text-sm text-red-200">
            <div className="text-base font-semibold">{t.errTitle}</div>
            <p className="mt-2 text-xs opacity-80">
              {errorMessage || "Unknown error."}
            </p>
          </div>
        )}

        {status === "ok" && books.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-6 py-8 text-sm text-slate-300">
            {t.empty}
          </div>
        )}

        {status === "ok" && books.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {books.map((book) => {
              // keep your existing route style
              const href = `${baseLocale}/reader/books/${book.id}`;
              return (
                <li
                  key={book.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm shadow-sm hover:border-indigo-500/70 hover:shadow-lg hover:shadow-indigo-500/20"
                >
                  <Link href={href}>
                    <div className="flex flex-col gap-2">
                      <h2 className="line-clamp-2 text-sm font-semibold text-slate-50">
                        {book.title || t.untitled}
                      </h2>
                      <p className="line-clamp-3 text-xs text-slate-400">
                        {book.description || t.noDesc}
                      </p>
                      <span className="mt-1 text-[11px] text-slate-500">
                        {t.created}{" "}
                        {new Date(book.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
