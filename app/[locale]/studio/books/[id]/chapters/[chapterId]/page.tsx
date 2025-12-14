"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type LoadStatus = "loading" | "ok" | "error";
type SaveStatus = "idle" | "saving";

type ChapterRow = {
  id: string;
  book_id: string;
  title: string;
  chapter_number: number;
  is_published: boolean;
  content: string | null;
  created_at: string;
};

type BookRow = {
  id: string;
  title: string;
};

export default function ChapterEditorPage() {
  const params = useParams();
  const router = useRouter();

  const locale = (params?.locale as string) || "en";
  const bookId = params?.id as string;
  const chapterId = params?.chapterId as string;

  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [book, setBook] = useState<BookRow | null>(null);
  const [chapter, setChapter] = useState<ChapterRow | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  const baseLocale = locale ? `/${locale}` : "";
  const backHref = `${baseLocale}/studio/books/${bookId}`;

  function formatDate(stamp: string | undefined) {
    if (!stamp) return "";
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

  useEffect(() => {
    async function loadData() {
      if (!bookId || !chapterId) return;
      setLoadStatus("loading");
      setErrorMessage(null);

      // Ensure auth
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        setErrorMessage(
          userError?.message || "You must be logged in to edit this chapter."
        );
        setLoadStatus("error");
        return;
      }

      // Load book (for title)
      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .select("id, title")
        .eq("id", bookId)
        .single();

      if (bookError || !bookData) {
        setErrorMessage(
          bookError?.message || "Book not found or no permission."
        );
        setLoadStatus("error");
        return;
      }

      // Load chapter
      const { data: chapterData, error: chapterError } = await supabase
        .from("book_chapters")
        .select(
          "id, book_id, title, chapter_number, is_published, content, created_at"
        )
        .eq("id", chapterId)
        .single();

      if (chapterError || !chapterData) {
        setErrorMessage(
          chapterError?.message || "Chapter not found or no permission."
        );
        setLoadStatus("error");
        return;
      }

      setBook(bookData);
      setChapter(chapterData);
      setTitle(chapterData.title || "");
      setContent(chapterData.content || "");
      setIsPublished(!!chapterData.is_published);
      setLoadStatus("ok");
    }

    loadData();
  }, [bookId, chapterId]);

  async function handleSave() {
    if (!chapter) return;
    setSaveStatus("saving");
    setErrorMessage(null);

    const { error, data } = await supabase
      .from("book_chapters")
      .update({
        title: title.trim() || "Untitled chapter",
        content: content.trim() || null,
        is_published: isPublished,
      })
      .eq("id", chapter.id)
      .select(
        "id, book_id, title, chapter_number, is_published, content, created_at"
      )
      .single();

    if (error) {
      console.error("Error saving chapter:", error);
      setErrorMessage(error.message);
      setSaveStatus("idle");
      return;
    }

    setChapter(data);
    setSaveStatus("idle");
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
              <span className="text-xs text-slate-400">
                Book:{" "}
                <span className="font-medium text-slate-100">
                  {book.title}
                </span>
              </span>
            )}
          </div>

          {chapter && (
            <span className="text-[11px] text-slate-500">
              Chapter ID:{" "}
              <code className="rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px]">
                {chapter.id}
              </code>
            </span>
          )}
        </div>

        {/* Content */}
        {loadStatus === "loading" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-6 py-8 text-sm text-slate-300">
            Loading chapter…
          </div>
        )}

        {loadStatus === "error" && (
          <div className="rounded-2xl border border-red-500/40 bg-red-900/30 px-6 py-8 text-sm text-red-200">
            <div className="text-base font-semibold">
              Couldn&apos;t load chapter
            </div>
            <p className="mt-2 text-xs opacity-80">
              {errorMessage || "Unknown error."}
            </p>
          </div>
        )}

        {loadStatus === "ok" && chapter && (
          <div className="grid gap-6 md:grid-cols-[minmax(0,3fr),minmax(0,2fr)]">
            {/* Editor */}
            <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6">
              <header className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    Chapter {chapter.chapter_number}
                  </h1>
                  <p className="mt-1 text-xs text-slate-400">
                    Created {formatDate(chapter.created_at)}
                  </p>
                </div>
              </header>

              <div className="space-y-4 text-sm">
                {/* Title */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Chapter title
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Chapter title"
                  />
                </div>

                {/* Content */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Content
                  </label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    rows={18}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Write your story here..."
                  />
                </div>

                {/* Publish toggle */}
                <div className="flex items-center justify-between gap-3 border-t border-slate-800 pt-4">
                  <label className="flex items-center gap-2 text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-500"
                    />
                    Mark this chapter as <span className="font-medium">published</span>
                  </label>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saveStatus === "saving"}
                    className="inline-flex items-center justify-center rounded-xl border border-indigo-500/60 bg-indigo-600/90 px-4 py-2 text-xs font-medium shadow-sm transition hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saveStatus === "saving" ? "Saving…" : "Save chapter"}
                  </button>
                </div>

                {errorMessage && (
                  <p className="text-[11px] text-red-300">{errorMessage}</p>
                )}
              </div>
            </section>

            {/* Sidebar info */}
            <aside className="flex flex-col gap-4">
              <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5 text-xs text-slate-300">
                <h2 className="text-sm font-semibold text-slate-50">
                  Writing tips
                </h2>
                <ul className="mt-2 space-y-1.5">
                  <li>• You can save as draft first, publish later.</li>
                  <li>
                    • Published chapters are what readers will see in the future
                    reader view.
                  </li>
                  <li>• We can hook AI tools into this editor later.</li>
                </ul>
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
