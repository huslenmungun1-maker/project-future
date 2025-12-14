"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type Book = {
  id: string;
  title: string;
};

type Chapter = {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
  content: string;
  created_at: string;
};

export default function ReaderChapterPage() {
  const params = useParams() as { id?: string; chapterNumber?: string };
  const bookId = params?.id;
  const chapterNumberParam = params?.chapterNumber;

  const [book, setBook] = useState<Book | null>(null);
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!bookId || !chapterNumberParam) return;

    const chapterNumber = Number(chapterNumberParam);
    if (!Number.isFinite(chapterNumber)) return;

    async function loadData() {
      setLoading(true);
      setMessage(null);

      const [{ data: bookData }, { data: chapterData, error: chapterError }] =
        await Promise.all([
          supabase
            .from("books")
            .select("id, title")
            .eq("id", bookId)
            .single(),
          supabase
            .from("chapters")
            .select("*")
            .eq("book_id", bookId)
            .eq("chapter_number", chapterNumber)
            .single(),
        ]);

      if (!bookData) {
        setMessage("Book not found.");
        setLoading(false);
        return;
      }

      setBook(bookData as Book);

      if (chapterError || !chapterData) {
        const msg =
          typeof (chapterError as any)?.message === "string"
            ? (chapterError as any).message
            : "Chapter not found";
        setMessage("Error loading chapter: " + msg);
        setLoading(false);
        return;
      }

      setChapter(chapterData as Chapter);
      setLoading(false);
    }

    loadData();
  }, [bookId, chapterNumberParam]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading chapter…</p>
      </div>
    );
  }

  if (message || !book || !chapter) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex items-center justify-center">
        <p className="text-sm text-red-400">
          {message ?? "Chapter not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <main className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <div className="text-xs text-slate-400">
          <Link
            href={`/en/reader/books/${book.id}`}
            className="hover:underline"
          >
            ← Back to book
          </Link>
        </div>

        <header className="space-y-1">
          <p className="text-sm text-slate-400">{book.title}</p>
          <h1 className="text-2xl font-bold">
            Chapter {chapter.chapter_number}. {chapter.title}
          </h1>
          <p className="text-[11px] text-slate-500">
            {new Date(chapter.created_at).toLocaleString()}
          </p>
        </header>

        <article className="whitespace-pre-wrap text-sm leading-relaxed text-slate-100 bg-slate-900/60 border border-slate-800 rounded-2xl px-4 py-3">
          {chapter.content}
        </article>
      </main>
    </div>
  );
}
