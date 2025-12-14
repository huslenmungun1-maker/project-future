"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";
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

export default function PublisherBooksPage() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<BookStatus>("draft");
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  // Load books from Supabase on mount
  useEffect(() => {
    async function loadBooks() {
      setLoading(true);
      setMessage(null);

      const { data, error } = await supabase
        .from("books")
        .select("*")
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

    if (!content.trim()) {
      setMessage("Please write some content for the book.");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      content: content.trim(),
      status,
    };

    const { data, error } = await supabase
      .from("books")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      const msg =
        typeof (error as any)?.message === "string"
          ? (error as any).message
          : "Unknown Supabase error";
      setMessage("Error saving book: " + msg);
      return;
    }

    const newBook = data as Book;

    setBooks((prev) => [newBook, ...prev]);

    setTitle("");
    setDescription("");
    setContent("");
    setStatus("draft");
    setMessage("Book saved to Supabase.");
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
            Create and manage your books. These entries are stored in Supabase
            so they persist and can be shown to readers. Click “Manage” on any
            book to edit it or add chapters.
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
              <label className="block text-slate-200">
                Book content (full text, optional if you plan to use chapters)
              </label>
              <textarea
                className="w-full rounded-lg border border-slate-700 bg-black px-3 py-2 text-sm outline-none focus:border-fuchsia-400"
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write or paste your story here... (You can still add chapters later.)"
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
              disabled={loading}
            >
              Save book
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
                        Created at:{" "}
                        {new Date(book.created_at).toLocaleString()}
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          book.status === "published"
                            ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                            : "bg-slate-700/40 text-slate-200 border border-slate-600/60"
                        }`}
                      >
                        {book.status === "published" ? "Published" : "Draft"}
                      </span>

                      <Link
                        href={`/en/publisher/books/${book.id}`}
                        className="mt-1 inline-flex items-center justify-center rounded-full border border-fuchsia-400 px-3 py-1 text-[11px] font-medium hover:bg-fuchsia-400 hover:text-black"
                      >
                        Manage
                      </Link>
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
