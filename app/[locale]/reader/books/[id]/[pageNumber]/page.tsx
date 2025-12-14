"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type LoadStatus = "loading" | "ok" | "error";

type BookRow = {
  id: string;
  title: string;
};

type PageRow = {
  id: string;
  book_id: string;
  page_number: number;
  title: string | null;
  subtitle: string | null;
  content: string | null;
  image_url: string | null;
  created_at: string;
};

export default function ReaderBookPageView() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";
  const bookId = params?.id as string;
  const pageParam = params?.pageNumber as string;
  const pageNumber = Number(pageParam) || 1;

  const [status, setStatus] = useState<LoadStatus>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [book, setBook] = useState<BookRow | null>(null);
  const [page, setPage] = useState<PageRow | null>(null);
  const [allPages, setAllPages] = useState<PageRow[]>([]);

  const baseLocale = locale ? `/${locale}` : "";
  const backHref = `${baseLocale}/reader/books`;
  const bookHref = `${baseLocale}/reader/books/${bookId}`;

  function formatDate(stamp?: string) {
    if (!stamp) return "";
    try {
      const d = new Date(stamp);
      return d.toLocaleString();
    } catch {
      return stamp || "";
    }
  }

  useEffect(() => {
    async function loadData() {
      if (!bookId) return;
      setStatus("loading");
      setErrorMessage(null);

      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .select("id, title")
        .eq("id", bookId)
        .single();

      if (bookError || !bookData) {
        setStatus("error");
        setErrorMessage(
          bookError?.message || "Book not found or not available."
        );
        return;
      }

      const { data: pagesData, error: pagesError } = await supabase
        .from("book_pages")
        .select(
          "id, book_id, page_number, title, subtitle, content, image_url, created_at"
        )
        .eq("book_id", bookId)
        .order("page_number", { ascending: true });

      if (pagesError) {
        setStatus("error");
        setErrorMessage(pagesError.message);
        return;
      }

      if (!pagesData || pagesData.length === 0) {
        setStatus("error");
        setErrorMessage("This book has no pages yet.");
        return;
      }

      const current = pagesData.find((p) => p.page_number === pageNumber);

      if (!current) {
        setStatus("error");
        setErrorMessage("This page does not exist.");
        setBook(bookData);
        setAllPages(pagesData);
        return;
      }

      setBook(bookData);
      setAllPages(pagesData);
      setPage(current);
      setStatus("ok");
    }

    loadData();
  }, [bookId, pageNumber]);

  let prevPageNumber: number | null = null;
  let nextPageNumber: number | null = null;
  if (allPages.length > 0 && page) {
    const idx = allPages.findIndex((p) => p.page_number === page.page_number);
    if (idx > 0) prevPageNumber = allPages[idx - 1].page_number;
    if (idx < allPages.length - 1) nextPageNumber = allPages[idx + 1].page_number;
  }

  return (
    <div className="min-h-screen bg-[#020417] text-slate-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs">
            <Link
              href={backHref}
              className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              ◂ Library
            </Link>
            <span className="text-slate-600">/</span>
            <Link
              href={bookHref}
              className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Book
            </Link>
          </div>

          {page && (
            <span className="text-[11px] text-slate-500">
              Page {page.page_number} • {formatDate(page.created_at)}
            </span>
          )}
        </div>

        {status === "loading" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-6 py-8 text-sm text-slate-300">
            Loading page…
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl border border-red-500/40 bg-red-900/30 px-6 py-8 text-sm text-red-200">
            <div className="text-base font-semibold">Page not available</div>
            <p className="mt-2 text-xs opacity-80">
              {errorMessage || "Unknown error."}
            </p>
          </div>
        )}

        {status === "ok" && book && page && (
          <article className="rounded-2xl border border-slate-800 bg-slate-950/80 px-6 py-8 text-sm leading-relaxed text-slate-100">
            <header className="mb-6">
              <h1 className="text-xl font-semibold tracking-tight">
                {book.title || "Untitled book"}
              </h1>
              <p className="mt-1 text-xs text-slate-400">
                Page {page.page_number}
              </p>
              {page.title && (
                <h2 className="mt-3 text-lg font-semibold text-slate-50">
                  {page.title}
                </h2>
              )}
              {page.subtitle && (
                <p className="mt-1 text-xs text-slate-400">{page.subtitle}</p>
              )}
            </header>

            {page.image_url && (
              <div className="mb-6 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={page.image_url}
                  alt={page.title || "Page image"}
                  className="max-h-[420px] w-full object-cover"
                />
              </div>
            )}

            <div className="whitespace-pre-wrap text-[15px] leading-7">
              {page.content || "This page has no text yet."}
            </div>
          </article>
        )}

        {/* Navigation between pages */}
        {status === "ok" && page && (
          <div className="flex items-center justify-between gap-3 text-xs">
            <div>
              {prevPageNumber !== null ? (
                <Link
                  href={`${baseLocale}/reader/books/${bookId}/${prevPageNumber}`}
                  className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  ◂ Previous page
                </Link>
              ) : (
                <span className="text-slate-600">Beginning of book</span>
              )}
            </div>
            <div>
              {nextPageNumber !== null ? (
                <Link
                  href={`${baseLocale}/reader/books/${bookId}/${nextPageNumber}`}
                  className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
                >
                  Next page ▸
                </Link>
              ) : (
                <span className="text-slate-600">End of book</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
