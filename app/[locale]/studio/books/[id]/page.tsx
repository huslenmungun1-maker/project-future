"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type LoadStatus = "loading" | "ok" | "error";
type SaveStatus = "idle" | "saving" | "deleting";

type BookRow = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  created_at: string;
  content: string | null;
};

type ChapterRow = {
  id: string;
  book_id: string;
  title: string;
  chapter_number: number;
  is_published: boolean;
  created_at: string;
};

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();

  const locale = (params?.locale as string) || "en";
  const bookId = params?.id as string;

  const [loadStatus, setLoadStatus] = useState<LoadStatus>("loading");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [book, setBook] = useState<BookRow | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState<string>("");
  const [status, setStatus] = useState<string>("draft");
  const [bookContent, setBookContent] = useState<string>("");

  // Chapters (optional, for other creators)
  const [chapters, setChapters] = useState<ChapterRow[]>([]);
  const [chaptersStatus, setChaptersStatus] = useState<LoadStatus>("loading");
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [creatingChapter, setCreatingChapter] = useState(false);

  function getStatusLabel(s: string | null) {
    if (!s) return "Unknown";
    switch (s) {
      case "draft":
        return "Draft";
      case "published":
        return "Published";
      case "archived":
        return "Archived";
      default:
        return s;
    }
  }

  function getStatusBadgeClass(s: string | null) {
    switch (s) {
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

  const baseLocale = locale ? `/${locale}` : "";
  const backHref = `${baseLocale}/studio/books`;

  // -------- Load book --------
  useEffect(() => {
    async function loadBook() {
      if (!bookId) return;
      setLoadStatus("loading");
      setErrorMessage(null);

      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData?.user) {
        setLoadStatus("error");
        setErrorMessage(
          userError?.message || "You must be logged in to view this book."
        );
        return;
      }

      const { data, error } = await supabase
        .from("books")
        .select("id, title, description, status, created_at, content")
        .eq("id", bookId)
        .single();

      if (error || !data) {
        console.error("Error loading book:", error);
        setLoadStatus("error");
        setErrorMessage(
          error?.message || "Book not found or you don’t have permission."
        );
        return;
      }

      setBook(data);
      setTitle(data.title || "");
      setDescription(data.description || "");
      setStatus(data.status || "draft");
      setBookContent(data.content || "");
      setLoadStatus("ok");
    }

    loadBook();
  }, [bookId]);

  // -------- Load chapters (optional) --------
  useEffect(() => {
    async function loadChapters() {
      if (!bookId) return;
      setChaptersStatus("loading");
      setChapterError(null);

      const { data, error } = await supabase
        .from("book_chapters")
        .select(
          "id, book_id, title, chapter_number, is_published, created_at"
        )
        .eq("book_id", bookId)
        .order("chapter_number", { ascending: true });

      if (error) {
        console.error("Error loading chapters:", error);
        setChaptersStatus("error");
        setChapterError(error.message);
        return;
      }

      setChapters(data || []);
      setChaptersStatus("ok");
    }

    loadChapters();
  }, [bookId]);

  // -------- Save / delete book --------
  async function handleSave() {
    if (!book) return;
    setSaveStatus("saving");
    setErrorMessage(null);

    const { error } = await supabase
      .from("books")
      .update({
        title: title.trim() || "Untitled book",
        description: description.trim() || null,
        status: status || "draft",
        content: bookContent.trim() || null,
      })
      .eq("id", book.id);

    if (error) {
      console.error("Error updating book:", error);
      setErrorMessage(error.message);
      setSaveStatus("idle");
      return;
    }

    setSaveStatus("idle");
  }

  async function handleDelete() {
    if (!book) return;
    const ok = window.confirm(
      "Delete this book? This cannot be undone and all its chapters will be deleted."
    );
    if (!ok) return;

    setSaveStatus("deleting");
    setErrorMessage(null);

    const { error } = await supabase.from("books").delete().eq("id", book.id);

    if (error) {
      console.error("Error deleting book:", error);
      setErrorMessage(error.message);
      setSaveStatus("idle");
      return;
    }

    router.push(backHref);
  }

  // -------- Chapters actions (for others / future) --------
  async function handleCreateChapter() {
    if (!book || !bookId) return;
    const trimmed = newChapterTitle.trim();
    if (!trimmed) {
      setChapterError("Chapter title cannot be empty.");
      return;
    }

    setCreatingChapter(true);
    setChapterError(null);

    const currentMax =
      chapters.length > 0
        ? Math.max(...chapters.map((c) => c.chapter_number || 0))
        : 0;
    const nextNumber = currentMax + 1;

    const { data, error } = await supabase
      .from("book_chapters")
      .insert({
        book_id: bookId,
        title: trimmed,
        chapter_number: nextNumber,
        is_published: false,
      })
      .select(
        "id, book_id, title, chapter_number, is_published, created_at"
      )
      .single();

    if (error) {
      console.error("Error creating chapter:", error);
      setChapterError(error.message);
      setCreatingChapter(false);
      return;
    }

    setChapters((prev) =>
      [...prev, data].sort((a, b) => a.chapter_number - b.chapter_number)
    );
    setNewChapterTitle("");
    setCreatingChapter(false);
  }

  async function toggleChapterPublished(chapter: ChapterRow) {
    const { error, data } = await supabase
      .from("book_chapters")
      .update({ is_published: !chapter.is_published })
      .eq("id", chapter.id)
      .select(
        "id, book_id, title, chapter_number, is_published, created_at"
      )
      .single();

    if (error) {
      console.error("Error updating chapter:", error);
      setChapterError(error.message);
      return;
    }

    setChapters((prev) =>
      prev.map((c) => (c.id === chapter.id ? data : c))
    );
  }

  async function deleteChapter(chapter: ChapterRow) {
    const ok = window.confirm(
      `Delete chapter ${chapter.chapter_number}: "${chapter.title}"?`
    );
    if (!ok) return;

    const { error } = await supabase
      .from("book_chapters")
      .delete()
      .eq("id", chapter.id);

    if (error) {
      console.error("Error deleting chapter:", error);
      setChapterError(error.message);
      return;
    }

    setChapters((prev) => prev.filter((c) => c.id !== chapter.id));
  }

  // ----------------------------------------------------------------

  return (
    <div className="min-h-screen bg-[#050614] text-slate-50">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-8">
        {/* Top nav */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={backHref}
              className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              ◂ Back to books
            </Link>
            <span className="text-xs text-slate-500">
              Book ID:{" "}
              <code className="rounded bg-slate-900/80 px-1.5 py-0.5 text-[10px]">
                {bookId}
              </code>
            </span>
          </div>

          {book && (
            <span className={getStatusBadgeClass(status)}>
              {getStatusLabel(status)}
            </span>
          )}
        </div>

        {/* Main content */}
        {loadStatus === "loading" && (
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 px-6 py-8 text-sm text-slate-300">
            Loading book…
          </div>
        )}

        {loadStatus === "error" && (
          <div className="rounded-2xl border border-red-500/40 bg-red-900/30 px-6 py-8 text-sm text-red-200">
            <div className="text-base font-semibold">Couldn&apos;t load book</div>
            <p className="mt-2 text-xs opacity-80">
              {errorMessage || "Unknown error."}
            </p>
          </div>
        )}

        {loadStatus === "ok" && book && (
          <div className="grid gap-6 md:grid-cols-[minmax(0,3fr),minmax(0,2fr)]">
            {/* Left: Book details form */}
            <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 sm:p-6">
              <header className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                    {book.title || "Untitled book"}
                  </h1>
                  <p className="mt-1 text-xs text-slate-400">
                    Created {formatDate(book.created_at)}
                  </p>
                </div>
              </header>

              <div className="mt-5 space-y-5 text-sm">
                {/* Title */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Title
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="My cosmic apocalypse book"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Short pitch, world description, or whatever makes your readers curious."
                  />
                </div>

                {/* BOOK CONTENT – whole story */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Book content (full story, no chapters)
                  </label>
                  <textarea
                    value={bookContent}
                    onChange={(e) => setBookContent(e.target.value)}
                    rows={14}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Write the whole story here if you don't want chapters..."
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    If this field is filled, the reader page will show this as a
                    single continuous book. Chapters are optional.
                  </p>
                </div>

                {/* Status */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                    Status
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {["draft", "published", "archived"].map((s) => {
                      const active = status === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStatus(s)}
                          className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                            active
                              ? "border-indigo-400 bg-indigo-600/80 text-white shadow shadow-indigo-500/50"
                              : "border-slate-700 bg-slate-900/80 text-slate-300 hover:border-indigo-400/60 hover:text-indigo-200"
                          }`}
                        >
                          {getStatusLabel(s)}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Draft: private to you • Published: visible in reader pages •
                    Archived: hidden but kept.
                  </p>
                </div>

                {/* Save / Delete */}
                <div className="mt-4 flex flex-col gap-3 border-t border-slate-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={saveStatus === "saving" || saveStatus === "deleting"}
                      className="inline-flex items-center justify-center rounded-xl border border-indigo-500/60 bg-indigo-600/90 px-4 py-2 text-xs font-medium shadow-sm transition hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saveStatus === "saving" ? "Saving…" : "Save changes"}
                    </button>

                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={saveStatus === "deleting" || saveStatus === "saving"}
                      className="inline-flex items-center justify-center rounded-xl border border-red-500/50 bg-red-900/40 px-4 py-2 text-xs font-medium text-red-100 shadow-sm transition hover:bg-red-800/70 hover:shadow-lg hover:shadow-red-900/60 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {saveStatus === "deleting" ? "Deleting…" : "Delete book"}
                    </button>
                  </div>

                  {errorMessage && (
                    <p className="text-[11px] text-red-300">{errorMessage}</p>
                  )}
                </div>
              </div>
            </section>

            {/* Right: Chapters & tools (optional) */}
            <aside className="flex flex-col gap-4">
              <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5">
                <h2 className="text-sm font-semibold text-slate-50">
                  Chapters & Content (optional)
                </h2>
                <p className="mt-1 text-xs text-slate-400">
                  Use this only if you want to split the book into chapters.
                  For simple books, you can ignore this section.
                </p>

                {/* New chapter form */}
                <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/90 p-3">
                  <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    New chapter title
                  </label>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                      value={newChapterTitle}
                      onChange={(e) => setNewChapterTitle(e.target.value)}
                      className="flex-1 rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-1.5 text-xs text-slate-50 outline-none ring-0 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      placeholder="Chapter 1: The world cracks open"
                    />
                    <button
                      type="button"
                      onClick={handleCreateChapter}
                      disabled={creatingChapter}
                      className="inline-flex items-center justify-center rounded-xl border border-indigo-500/60 bg-indigo-600/90 px-3 py-1.5 text-[11px] font-medium shadow-sm transition hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {creatingChapter ? "Creating…" : "Add chapter"}
                    </button>
                  </div>
                  {chapterError && (
                    <p className="mt-1 text-[11px] text-red-300">
                      {chapterError}
                    </p>
                  )}
                </div>

                {/* Chapters list */}
                <div className="mt-4">
                  {chaptersStatus === "loading" && (
                    <p className="text-xs text-slate-400">Loading chapters…</p>
                  )}

                  {chaptersStatus === "error" && (
                    <p className="text-xs text-red-300">
                      {chapterError || "Error loading chapters."}
                    </p>
                  )}

                  {chaptersStatus === "ok" && chapters.length === 0 && (
                    <p className="text-xs text-slate-500">
                      No chapters yet. For simple books, you don&apos;t need any.
                    </p>
                  )}

                  {chaptersStatus === "ok" && chapters.length > 0 && (
                    <ul className="mt-1 space-y-2">
                      {chapters.map((ch) => (
                        <li
                          key={ch.id}
                          className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-xs"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium text-slate-50">
                              {ch.chapter_number}. {ch.title}
                            </span>
                            <span className="mt-0.5 text-[11px] text-slate-500">
                              Created {formatDate(ch.created_at)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => toggleChapterPublished(ch)}
                              className={`rounded-full border px-2.5 py-1 text-[10px] font-medium ${
                                ch.is_published
                                  ? "border-emerald-400 bg-emerald-500/15 text-emerald-200"
                                  : "border-slate-600 bg-slate-900/80 text-slate-300"
                              }`}
                            >
                              {ch.is_published ? "Published" : "Draft"}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteChapter(ch)}
                              className="rounded-full border border-red-500/60 bg-red-900/40 px-2.5 py-1 text-[10px] font-medium text-red-100 hover:bg-red-800/70"
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>

              <section className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950/80 via-slate-950/40 to-indigo-900/40 p-4 sm:p-5">
                <h2 className="text-sm font-semibold text-slate-50">
                  Studio notes
                </h2>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-300">
                  <li>• For your style, just write everything in “Book content”.</li>
                  <li>• Set status to <b>Published</b> when ready.</li>
                  <li>• Reader pages will show only published books.</li>
                </ul>
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
