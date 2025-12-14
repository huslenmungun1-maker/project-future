"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Status = "loading" | "ok" | "error";

type BookRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
};

export default function ReaderBooksPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";

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

      setBooks(data || []);
      setStatus("ok");
    }

    loadBooks();
  }, []);

  const baseLocale = locale ? `/${locale}` : "";

  return (
    <div className="min-h-screen bg-[#020417] text-slate-50">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
        <header className="flex flex-col gap-2 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Library – Published books
            </h1>
            <p className="mt-1 text-xs text-slate-400">
              All books that creators marked as{" "}
              <span className="font-semibold text-indigo-200">published</span>.
            </p>
          </div>
        </header>

        {status === "loading" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-6 py-8 text-sm text-slate-300">
            Loading books…
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl border border-red-500/40 bg-red-900/30 px-6 py-8 text-sm text-red-200">
            <div className="text-base font-semibold">Couldn&apos;t load books</div>
            <p className="mt-2 text-xs opacity-80">
              {errorMessage || "Unknown error."}
            </p>
          </div>
        )}

        {status === "ok" && books.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-6 py-8 text-sm text-slate-300">
            No published books yet. Once you publish one from the studio, it
            will appear here.
          </div>
        )}

        {status === "ok" && books.length > 0 && (
          <ul className="grid gap-4 sm:grid-cols-2">
            {books.map((book) => {
              const href = `${baseLocale}/reader/books/${book.id}`;
              return (
                <li
                  key={book.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-sm shadow-sm hover:border-indigo-500/70 hover:shadow-lg hover:shadow-indigo-500/20"
                >
                  <Link href={href}>
                    <div className="flex flex-col gap-2">
                      <h2 className="line-clamp-2 text-sm font-semibold text-slate-50">
                        {book.title || "Untitled book"}
                      </h2>
                      <p className="line-clamp-3 text-xs text-slate-400">
                        {book.description || "No description yet."}
                      </p>
                      <span className="mt-1 text-[11px] text-slate-500">
                        Created{" "}
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
