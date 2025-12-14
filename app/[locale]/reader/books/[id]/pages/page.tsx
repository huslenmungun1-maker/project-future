"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type LoadStatus = "loading" | "ok" | "error";
type SaveStatus = "idle" | "saving";

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

export default function BookPagesManagerPage() {
  const params = useParams();
  const router = useRouter();

  const locale = (params?.locale as string) || "en";
  const bookId = params?.id as string;

  const [book, setBook] = useState<BookRow | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [pages, setPages] = useState<PageRow[]>([]);

  // new page form
  const [newTitle, setNewTitle] = useState("");
  const [newSubtitle, setNewSubtitle] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newContent, setNewContent] = useState("");

  const baseLocale = locale ? `/${locale}` : "";
  const backHref = `${baseLocale}/studio/books/${bookId}`;

  function formatDate(stamp?: string) {
    if (!stamp) return "";
    try {
      const d = new Date(stamp);
      return d.toLocaleString();
    } catch {
      return stamp || "";
    }
  }

  // Load book + pages
  useEffect(() => {
    async function loadAll() {
      if (!bookId) return;
      setStatus("loading");
      setErrorMessage(null);

      // auth check
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        setStatus("error");
        setErrorMessage(
          userError?.message || "You must be logged in to manage pages."
        );
        return;
      }

      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .select("id, title")
        .eq("id", bookId)
        .single();

      if (bookError || !bookData) {
        setStatus("error");
        setErrorMessage(
          bookError?.message || "Book not found or you don't have permission."
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

      setBook(bookData);
      setPages(pagesData || []);
      setStatus("ok");
    }

    loadAll();
  }, [bookId]);

  async function handleCreatePage() {
    if (!bookId) return;
    const trimmedContent = newContent.trim();
    if (!trimmedContent && !newTitle.trim() && !newImageUrl.trim()) {
      setErrorMessage("At least title, content, or image must be filled.");
      return;
    }

    setSaveStatus("saving");
    setErrorMessage(null);

    const currentMax =
      pages.length > 0
        ? Math.max(...pages.map((p) => p.page_number || 0))
        : 0;
    const nextNumber = currentMax + 1;

    const { data, error } = await supabase
      .from("book_pages")
      .insert({
        book_id: bookId,
        page_number: nextNumber,
        title: newTitle.trim() || null,
        subtitle: newSubtitle.trim() || null,
        content: trimmedContent || null,
        image_url: newImageUrl.trim() || null,
      })
      .select(
        "id, book_id, page_number, title, subtitle, content, image_url, created_at"
      )
      .single();

    if (error) {
      console.error("Error creating page:", error);
      setErrorMessage(error.message);
      setSaveStatus("idle");
      return;
    }

    setPages((prev) =>
      [...prev, data].sort((a, b) => a.page_number - b.page_number)
    );
    setNewTitle("");
    setNewSubtitle("");
    setNewImageUrl("");
    setNewContent("");
    setSaveStatus("idle");
  }

  async function handleDeletePage(page: PageRow) {
    const ok = window.confirm(
      `Delete page ${page.page_number}? This cannot be undone.`
    );
    if (!ok) return;

    const { error } = await supabase
      .from("book_pages")
      .delete()
      .eq("id", page.id);

    if (error) {
      console.error("Error deleting page:", error);
      setErrorMessage(error.message);
      return;
    }

    setPages((prev) => prev.filter((p) => p.id !== page.id));
  }

  return (
    <div className="min-h-screen bg-[#050614] text-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={backHref}
              className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              ◂ Back to book
            </Link>
            {book && (
              <div className="text-xs text-slate-400">
                Pages for:{" "}
                <span className="font-semibold text-slate-100">
                  {book.title || "Untitled book"}
                </span>
              </div>
            )}
          </div>
        </div>

        {status === "loading" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-6 py-8 text-sm text-slate-300">
            Loading pages…
          </div>
        )}

        {status === "error" && (
          <div className="rounded-2xl border border-red-500/40 bg-red-900/30 px-6 py-8 text-sm text-red-200">
            <div className="text-base font-semibold">Couldn&apos;t load pages</div>
            <p className="mt-2 text-xs opacity-80">
              {errorMessage || "Unknown error."}
            </p>
          </div>
        )}

        {status === "ok" && (
          <div className="grid gap-6 md:grid-cols-[minmax(0,3fr),minmax(0,2fr)]">
            {/* Left: existing pages */}
            <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6">
              <h2 className="text-sm font-semibold text-slate-50">
                Existing pages
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                Each page is like a flexible canvas: title, subtitle, image, and
                body text. Readers will see them one by one.
              </p>

              <div className="mt-4 space-y-2 text-xs">
                {pages.length === 0 && (
                  <p className="text-slate-500">
                    No pages yet. Create the first one on the right.
                  </p>
                )}

                {pages.length > 0 && (
                  <ul className="space-y-2">
                    {pages.map((p) => {
                      const readerHref = `${baseLocale}/reader/books/${bookId}/${p.page_number}`;
                      return (
                        <li
                          key={p.id}
                          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/90 px-3 py-2"
                        >
                          <div className="flex flex-col gap-0.5">
                            <span className="font-medium text-slate-50">
                              Page {p.page_number}
                              {p.title ? ` — ${p.title}` : ""}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              {formatDate(p.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Link
                              href={readerHref}
                              className="rounded-full border border-indigo-400/70 bg-indigo-600/80 px-2.5 py-1 text-[10px] font-medium text-slate-50 hover:bg-indigo-500"
                            >
                              View as reader
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleDeletePage(p)}
                              className="rounded-full border border-red-500/60 bg-red-900/40 px-2.5 py-1 text-[10px] font-medium text-red-100 hover:bg-red-800/70"
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </section>

            {/* Right: create new page */}
            <aside className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6 text-xs">
              <h2 className="text-sm font-semibold text-slate-50">
                Add a new page
              </h2>
              <p className="mt-1 text-xs text-slate-400">
                This will automatically become the next page (1, 2, 3, …) of
                this book.
              </p>

              <div className="mt-3 space-y-3">
                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Page title (optional)
                  </label>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-50 outline-none ring-0 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="For example: A lesson I learned too late"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Subtitle (optional)
                  </label>
                  <input
                    value={newSubtitle}
                    onChange={(e) => setNewSubtitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-50 outline-none ring-0 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="A short description or mood line"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Image URL (optional)
                  </label>
                  <input
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-50 outline-none ring-0 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="https://…"
                  />
                  <p className="mt-1 text-[10px] text-slate-500">
                    Later we can hook this to a real uploader. For now, you can
                    paste an image link if you have one.
                  </p>
                </div>

                <div>
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    Body content
                  </label>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={10}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-xs text-slate-50 outline-none ring-0 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Write the main text of this page here…"
                  />
                </div>

                {errorMessage && (
                  <p className="text-[11px] text-red-300">{errorMessage}</p>
                )}

                <button
                  type="button"
                  onClick={handleCreatePage}
                  disabled={saveStatus === "saving"}
                  className="mt-2 inline-flex items-center justify-center rounded-xl border border-indigo-500/60 bg-indigo-600/90 px-4 py-2 text-xs font-medium shadow-sm transition hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saveStatus === "saving" ? "Creating…" : "Add page"}
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
