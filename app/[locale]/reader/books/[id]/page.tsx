"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type LoadStatus = "loading" | "ok" | "error";

type BookRow = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  created_at: string;
  content: string | null;
};

export default function ReaderBookPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const bookId = params?.id as string;

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [book, setBook] = useState<BookRow | null>(null);

  useEffect(() => {
    async function loadBook() {
      if (!bookId) return;
      setStatus("loading");
      setErrorMessage(null);

      const { data, error } = await supabase
        .from("books")
        .select("id, title, description, status, created_at, content")
        .eq("id", bookId)
        .single();

      if (error || !data) {
        console.error("Error loading book for reader:", error);
        setErrorMessage(
          error?.message || "Book not found or not available."
        );
        setStatus("error");
        return;
      }

      if (data.status !== "published") {
        setErrorMessage("This book is not published yet.");
        setStatus("error");
        return;
      }

      setBook(data);
      setStatus("ok");
    }

    loadBook();
  }, [bookId]);

  const baseLocale = locale ? `/${locale}` : "";
  const backHref = `${baseLocale}/reader/books`;

  function formatDate(stamp?: string) {
    if (!stamp) return "";
    try {
      const d = new Date(stamp);
      return d.toLocaleString();
    } catch {
      return stamp;
    }
  }

  return (
    <div className="min-h-screen bg-[#020417] text-slate-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Link
            href={backHref}
            className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            ◂ Back to library
          </Link>
          {book && (
            <span className="text-[11px] text-slate-500">
              Created {formatDate(book.created_at)}
            </span>
          )}
        </div>

        {status === "loading" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-6 py-8 text-sm text-slate-300">
            Loading book…
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl border border-red-500/40 bg-red-900/30 px-6 py-8 text-sm text-red-200">
            <div className="text-base font-semibold">
              Book not available to read
            </div>
            <p className="mt-2 text-xs opacity-80">
              {errorMessage || "Unknown error."}
            </p>
          </div>
        )}

        {status === "ok" && book && (
          <article className="rounded-2xl border border-slate-800 bg-slate-950/80 px-6 py-8 text-sm leading-relaxed text-slate-100">
            <h1 className="text-2xl font-semibold tracking-tight">
              {book.title || "Untitled book"}
            </h1>

            {book.description && (
              <p className="mt-2 text-xs text-slate-400">
                {book.description}
              </p>
            )}

            <div className="mt-6 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

            <div className="mt-6 whitespace-pre-wrap text-[15px] leading-7">
              {book.content
                ? book.content
                : "This book doesn’t have any content yet."}
            </div>
          </article>
        )}
      </div>
    </div>
  );
}
