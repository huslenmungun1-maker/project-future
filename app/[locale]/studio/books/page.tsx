"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type LoadStatus = "loading" | "ok" | "error";

type BookRow = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  created_at: string;
};

export default function BooksListPage() {
  const params = useParams();
  const router = useRouter();

  // If you don't use locale segments, this will just default to "en"
  const locale = (params?.locale as string) || "en";

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [books, setBooks] = useState<BookRow[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadBooks() {
      setStatus("loading");
      setErrorMessage(null);

      // 1) Get current logged-in user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        setStatus("error");
        setErrorMessage(
          userError?.message || "You must be logged in to see your books."
        );
        return;
      }

      const user = userData.user;

      // 2) Load books where creator_id = auth.uid()
      const { data, error } = await supabase
        .from("books")
        .select("id, title, description, status, created_at")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading books:", error);
        setStatus("error");
        setErrorMessage(error.message);
        return;
      }

      setBooks(data || []);
      setStatus("ok");
    }

    loadBooks();
  }, []);

  function getBookStatusLabel(status: string | null) {
    if (!status) return "unknown";
    switch (status) {
      case "draft":
        return "Draft";
      case "published":
        return "Published";
      case "archived":
        return "Archived";
      default:
        return status;
    }
  }

  function getBookStatusStyle(status: string | null) {
    switch (status) {
      case "draft":
        return "inline-flex items-center rounded-full border border-yellow-400/50 bg-yellow-500/10 px-2.5 py-0.5 text-xs font-medium text-yellow-300";
      case "published":
        return "inline-flex items-center rounded-full border border-emerald-400/50 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300";
      case "archived":
        return "inline-flex items-center rounded-full border border-slate-500/60 bg-slate-800/60 px-2.5 py-0.5 text-xs font-medium text-slate-300";
      default:
        return "inline-flex items-center rounded-full border border-slate-500/40 bg-slate-800/40 px-2.5 py-0.5 text-xs font-medium text-slate-300";
    }
  }

  function formatDate(stamp: string) {
    try {
      const d = new Date(stamp);
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return stamp;
    }
  }

  function openBook(id: string) {
    const base = locale ? `/${locale}` : "";
    router.push(`${base}/studio/books/${id}`);
  }

  const newBookHref = `${locale ? `/${locale}` : ""}/studio/books/create`;

  return (
    <div className="min-h-screen bg-[#050614] text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
        {/* Header */}
        <header className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Your Bookshelf
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              All books you&apos;ve created in the studio. Click a book to manage
              chapters, edit details, or publish.
            </p>
          </div>

          <Link
            href={newBookHref}
            className="inline-flex items-center justify-center rounded-xl border border-indigo-500/60 bg-indigo-600/90 px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/40"
          >
            + New Book
          </Link>
        </header>

        {/* Status bar */}
        {status === "loading" && (
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-3 text-sm text-slate-300">
            Loading your books…
          </div>
        )}

        {status === "error" && (
          <div className="rounded-xl border border-red-500/40 bg-red-900/30 px-4 py-3 text-sm text-red-200">
            <div className="font-medium">Something went wrong.</div>
            <div className="mt-1 text-xs opacity-80">
              {errorMessage || "Unknown error while loading books."}
            </div>
          </div>
        )}

        {/* Empty state */}
        {status === "ok" && books.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-6 py-8 text-center">
            <div className="text-lg font-medium">No books yet</div>
            <p className="mt-2 text-sm text-slate-400">
              Start your universe, darling. Create your first book and the studio
              will come alive.
            </p>
            <div className="mt-4 flex justify-center">
              <Link
                href={newBookHref}
                className="inline-flex items-center justify-center rounded-xl border border-indigo-500/60 bg-indigo-600/90 px-4 py-2 text-sm font-medium shadow-sm transition hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/40"
              >
                Create a book
              </Link>
            </div>
          </div>
        )}

        {/* Books list */}
        {status === "ok" && books.length > 0 && (
          <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950/60">
            <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-3 text-xs font-medium uppercase tracking-wide text-slate-400">
              Books ({books.length})
            </div>

            <ul className="divide-y divide-slate-800">
              {books.map((book) => (
                <li key={book.id}>
                  <button
                    type="button"
                    onClick={() => openBook(book.id)}
                    className="flex w-full items-stretch gap-3 px-4 py-3 text-left transition hover:bg-slate-900/60"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold sm:text-base">
                          {book.title || "Untitled book"}
                        </span>
                        <span className={getBookStatusStyle(book.status)}>
                          {getBookStatusLabel(book.status)}
                        </span>
                      </div>
                      {book.description && (
                        <p className="mt-1 line-clamp-2 text-xs text-slate-400 sm:text-sm">
                          {book.description}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end justify-between text-right">
                      <span className="text-xs text-slate-500">
                        {formatDate(book.created_at)}
                      </span>
                      <span className="mt-2 text-[11px] font-medium text-indigo-300">
                        Open ▸
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="mt-4 text-xs text-slate-500">
          Tip: You can change routing later. Just keep the logic:
          <code className="ml-1 rounded bg-slate-900 px-1.5 py-0.5 text-[10px]">
            /[locale]/studio/books/[id]
          </code>
        </p>
      </div>
    </div>
  );
}
