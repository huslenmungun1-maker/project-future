"use client";

import { useEffect, useState, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type BookStatus = "draft" | "published";

type Book = {
  id: string;
  title: string;
  description: string | null;
  content: string | null;
  status: BookStatus;
  created_at: string;
};

type Chapter = {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
  content: string;
  created_at: string;
};

export default function PublisherBookManagePage() {
  const router = useRouter();
  const params = useParams() as { id?: string };
  const bookId = params?.id;

  const [book, setBook] = useState<Book | null>(null);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Form state for book
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<BookStatus>("draft");

  // Form state for new chapter
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterNumber, setChapterNumber] = useState<number | "">("");
  const [chapterContent, setChapterContent] = useState("");
  const [chapterSaving, setChapterSaving] = useState(false);

  useEffect(() => {
    if (!bookId) return;

    async function loadData() {
      setLoading(true);
      setMessage(null);

      // Load book
      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .select("*")
        .eq("id", bookId)
        .single();

      if (bookError || !bookData) {
        const msg =
          typeof (bookError as any)?.message === "string"
            ? (bookError as any).message
            : "Book not found";
        setMessage("Error loading book: " + msg);
        setLoading(false);
        return;
      }

      const b = bookData as Book;
      setBook(b);
      setTitle(b.title);
      setDescription(b.description ?? "");
      setContent(b.content ?? "");
      setStatus(b.status);

      // Load chapters
      const { data: chapterData, error: chapterError } = await supabase
        .from("chapters")
        .select("*")
        .eq("book_id", bookId)
        .order("chapter_number", { ascending: true });

      if (chapterError) {
        const msg =
          typeof (chapterError as any)?.message === "string"
            ? (chapterError as any).message
            : "Unknown error";
        setMessage("Error loading chapters: " + msg);
      } else {
        setChapters((chapterData || []) as Chapter[]);
      }

      setLoading(false);
    }

    loadData();
  }, [bookId]);

  async function handleSaveBook(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!bookId) return;

    setSaving(true);
    setMessage(null);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      content: content.trim() || null,
      status,
    };

    const { data, error } = await supabase
      .from("books")
      .update(payload)
      .eq("id", bookId)
      .select("*")
      .single();

    if (error) {
      const msg =
        typeof (error as any)?.message === "string"
          ? (error as any).message
          : "Unknown Supabase error";
      setMessage("Error saving book: " + msg);
    } else {
      setBook(data as Book);
      setMessage("Book updated.");
    }

    setSaving(false);
  }

  async function handleDeleteBook() {
    if (!bookId) return;
    const ok = window.confirm(
      "Delete this book and all its chapters? This cannot be undone."
    );
    if (!ok) return;

    setSaving(true);
    setMessage(null);

    const { error } = await supabase.from("books").delete().eq("id", bookId);

    if (error) {
      const msg =
        typeof (error as any)?.message === "string"
          ? (error as any).message
          : "Unknown Supabase error";
      setMessage("Error deleting book: " + msg);
      setSaving(false);
      return;
    }

    router.push("/en/publisher/books");
  }

  async function handleCreateChapter(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!bookId) return;

    if (!chapterTitle.trim() || chapterNumber === "" || !chapterContent.trim()) {
      setMessage("Please fill in all chapter fields.");
      return;
    }

    setChapterSaving(true);
    setMessage(null);

    const payload = {
      book_id: bookId,
      chapter_number: Number(chapterNumber),
      title: chapterTitle.trim(),
      content: chapterContent.trim(),
    };

    const { data, error } = await supabase
      .from("chapters")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      const msg =
        typeof (error as any)?.message === "string"
          ? (error as any).message
          : "Unknown Supabase error";
      setMessage("Error creating chapter: " + msg);
    } else {
      setChapters((prev) => [...prev, data as Chapter].sort((a, b) => a.chapter_number - b.chapter_number));
      setChapterTitle("");
      setChapterNumber("");
      setChapterContent("");
      setMessage("Chapter created.");
    }

    setChapterSaving(false);
  }

  async function handleDeleteChapter(chapterId: string) {
    const ok = window.confirm("Delete this chapter?");
    if (!ok) return;

    const { error } = await supabase
      .from("chapters")
      .delete()
      .eq("id", chapterId);

    if (error) {
      const msg =
        typeof (error as any)?.message === "string"
          ? (error as any).message
          : "Unknown Supabase error";
      setMessage("Error deleting chapter: " + msg);
      return;
    }

    setChapters((prev) => prev.filter((c) => c.id !== chapterId));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex items-center justify-center">
        <p className="text-sm text-slate-400">Loading book…</p>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="min-h-screen bg-black text-slate-100 flex items-center justify-center">
        <p className="text-sm text-red-400">
          {message ?? "Book not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <main className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        <section className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Manage book</h1>
            <p className="text-sm text-slate-300">{book.title}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Created at: {new Date(book.created_at).toLocaleString()}
            </p>
          </div>
          <button
            onClick={handleDeleteBook}
            className="text-xs rounded-full border border-red-500 px-3 py-1 text-red-300 hover:bg-red-500 hover:text-black"
            disabled={saving}
          >
            Delete book
          </button>
        </section>

        {message && (
          <p className="text-xs text-slate-200 border border-slate-700 rounded-lg px-2 py-1">
            {message}
          </p>
        )}

        {/* Edit book form */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <h2 className="text-lg font-semibold">Book details</h2>

          <form onSubmit={handleSaveBook} className="space-y-3 text-sm">
            <div className="space-y-1">
              <label className="block text-slate-200">Title</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-200">Description</label>
              <textarea
                className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-200">
                Book content (optional if you use chapters)
              </label>
              <textarea
                className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-200">Status</label>
              <select
                className="w-full max-w-xs rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                value={status}
                onChange={(e) => setStatus(e.target.value as BookStatus)}
              >
                <option value="draft">Draft (not visible to readers)</option>
                <option value="published">
                  Published (visible in reader/books)
                </option>
              </select>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-black hover:bg-fuchsia-400 disabled:opacity-60"
              disabled={saving}
            >
              Save changes
            </button>
          </form>
        </section>

        {/* Chapters */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Chapters</h2>

          {/* New chapter form */}
          <form
            onSubmit={handleCreateChapter}
            className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-3 text-sm"
          >
            <p className="font-medium text-slate-200">Add new chapter</p>

            <div className="flex flex-wrap gap-3">
              <div className="space-y-1 flex-1 min-w-[140px]">
                <label className="block text-slate-200">Chapter number</label>
                <input
                  type="number"
                  className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                  value={chapterNumber}
                  onChange={(e) =>
                    setChapterNumber(
                      e.target.value === "" ? "" : Number(e.target.value)
                    )
                  }
                  placeholder="1"
                  min={1}
                />
              </div>

              <div className="space-y-1 flex-[2] min-w-[200px]">
                <label className="block text-slate-200">Title</label>
                <input
                  type="text"
                  className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                  value={chapterTitle}
                  onChange={(e) => setChapterTitle(e.target.value)}
                  placeholder="Chapter title"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-slate-200">Content</label>
              <textarea
                className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                rows={6}
                value={chapterContent}
                onChange={(e) => setChapterContent(e.target.value)}
                placeholder="Write the chapter content here..."
              />
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-black hover:bg-emerald-400 disabled:opacity-60"
              disabled={chapterSaving}
            >
              Add chapter
            </button>
          </form>

          {/* Chapter list */}
          <div className="space-y-2 text-sm">
            {chapters.length === 0 ? (
              <p className="text-slate-400">
                No chapters yet. Create the first chapter above.
              </p>
            ) : (
              chapters.map((ch) => (
                <div
                  key={ch.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-semibold">
                      {ch.chapter_number}. {ch.title}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      Created at:{" "}
                      {new Date(ch.created_at).toLocaleString()}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400 line-clamp-2">
                      {ch.content.slice(0, 140)}…
                    </p>
                  </div>
                  <button
                    onClick={() => handleDeleteChapter(ch.id)}
                    className="text-[11px] rounded-full border border-red-500 px-2 py-1 text-red-300 hover:bg-red-500 hover:text-black"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}
