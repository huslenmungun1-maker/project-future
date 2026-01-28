"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

type BookStatus = "draft" | "published";

type Book = {
  id: string;
  title: string;
  description: string | null;
  status: BookStatus;
  created_at: string;
};

export default function PublisherBooksPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<BookStatus>("draft");

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadBooks() {
      setLoading(true);
      setMessage(null);

      const { data, error } = await supabase
        .from("books")
        .select("id, title, description, status, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        const msg =
          typeof (error as any)?.message === "string"
            ? (error as any).message
            : "Unknown Supabase error";
        setMessage("Error loading books: " + msg);
      } else {
        setBooks((data || []) as Book[]);
      }

      setLoading(false);
    }

    loadBooks();
  }, []);

  async function handleCreateBook(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage(null);

    if (!title.trim()) {
      setMessage("Please enter a title.");
      return;
    }

    setSaving(true);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      status,
    };

    const { data, error } = await supabase
      .from("books")
      .insert(payload)
      .select("id, title, description, status, created_at")
      .single();

    if (error) {
      const msg =
        typeof (error as any)?.message === "string"
          ? (error as any).message
          : "Unknown Supabase error";
      setMessage("Error saving book: " + msg);
      setSaving(false);
      return;
    }

    const newBook = data as Book;
    setBooks((prev) => [newBook, ...prev]);

    setTitle("");
    setDescription("");
    setStatus("draft");
    setMessage("Book created. Now add chapters in Manage.");

    setSaving(false);
  }

  async function setBookStatus(bookId: string, nextStatus: BookStatus) {
    setMessage(null);

    const { error } = await supabase
      .from("books")
      .update({ status: nextStatus })
      .eq("id", bookId);

    if (error) {
      const msg =
        typeof (error as any)?.message === "string"
          ? (error as any).message
          : "Unknown Supabase error";
      setMessage("Error updating status: " + msg);
      return;
    }

    setBooks((prev) =>
      prev.map((b) => (b.id === bookId ? { ...b, status: nextStatus } : b))
    );
  }

  return (
    <div className="min-h-screen bg-black text-slate-100">
      <main className="mx-auto max-w-4xl px-4 py-10 space-y-8">
        {/* Header */}
        <section>
          <h1 className="mb-2 text-3xl font-bold">
            Publisher Studio · <span className="text-fuchsia-400">Books</span>
          </h1>
          <p className="max-w-2xl text-sm text-slate-300">
            Create and manage your books. Books store metadata (title/description/status).
            Chapters store the actual writing. Click “Manage” to add chapters.
          </p>
        </section>

        {/* Create Book Form */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 space-y-4">
          <h2 className="text-lg font-semibold">Create a new book</h2>

          <form onSubmit={handleCreateBook} className="space-y-3 text-sm">
            <div className="space-y-1">
              <label className="block text-slate-200">Title</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. The Future City of Ashes"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-200">
                Short description (optional)
              </label>
              <textarea
                className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. A sci-fi story about a poet wandering in a megacity..."
              />
            </div>

            <div className="space-y-1">
              <label className="block text-slate-200">Status</label>
              <select
                className="w-full max-w-xs rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                value={status}
                onChange={(e) => setStatus(e.target.value as BookStatus)}
              >
                <option value="draft">Draft</option>
                <option value="published">Published</option>
              </select>

              <p className="text-[11px] text-slate-400 mt-1">
                You can publish now or later — but readers should only see published books with chapters.
              </p>
            </div>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-full bg-fuchsia-500 px-4 py-2 text-sm font-semibold text-black hover:bg-fuchsia-400 disabled:opacity-60"
              disabled={loading || saving}
            >
              {saving ? "Saving…" : "Create book"}
            </button>
          </form>

          {message && (
            <p className="text-xs text-slate-300 border border-slate-700 rounded-lg px-2 py-1 mt-2">
              {message}
            </p>
          )}
        </section>

        {/* Your Books */}
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Your books (from Supabase)</h2>

          {loading ? (
            <p className="text-sm text-slate-400">Loading books…</p>
          ) : books.length === 0 ? (
            <p className="text-sm text-slate-400">
              No books found yet. Create one using the form above.
            </p>
          ) : (
            <ul className="space-y-2 text-sm">
              {books.map((book) => (
                <li
                  key={book.id}
                  className="rounded-xl border border-slate-800 bg-slate-900/60 p-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{book.title}</p>

                      {book.description && (
                        <p className="text-xs text-slate-300 mt-1 line-clamp-2">
                          {book.description}
                        </p>
                      )}

                      <p className="mt-1 text-[11px] text-slate-500">
                        Created at: {new Date(book.created_at).toLocaleString()}
                      </p>

                      <p className="mt-1 text-[11px] text-slate-600">
                        ID: {book.id}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          book.status === "published"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-700/40 text-slate-200 border border-slate-600/60"
                        }`}
                      >
                        {book.status === "published" ? "Published" : "Draft"}
                      </span>

                      <div className="flex items-center gap-2">
                        {book.status === "draft" ? (
                          <button
                            onClick={() => setBookStatus(book.id, "published")}
                            className="rounded-full border border-emerald-400 px-3 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-400 hover:text-black"
                          >
                            Publish
                          </button>
                        ) : (
                          <button
                            onClick={() => setBookStatus(book.id, "draft")}
                            className="rounded-full border border-slate-500 px-3 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-200 hover:text-black"
                          >
                            Unpublish
                          </button>
                        )}

                        <Link
                          href={`/en/publisher/books/${book.id}`}
                          className="inline-flex items-center justify-center rounded-full border border-fuchsia-400 px-3 py-1 text-[11px] font-medium hover:bg-fuchsia-400 hover:text-black"
                        >
                          Manage
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
