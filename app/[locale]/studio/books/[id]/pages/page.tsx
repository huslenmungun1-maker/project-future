"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
  page_name: string | null;
  image_url: string | null;
  created_at: string;
};

export default function BookPagesManagerPage() {
  const params = useParams();

  const locale = (params?.locale as string) || "en";
  const bookId = params?.id as string;

  const [book, setBook] = useState<BookRow | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pages, setPages] = useState<PageRow[]>([]);

  const [newPageName, setNewPageName] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");

  const baseLocale = locale ? `/${locale}` : "";
  const backHref = `${baseLocale}/studio/books/${bookId}`;

  function formatDate(stamp?: string) {
    if (!stamp) return "";
    try {
      return new Date(stamp).toLocaleString();
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

      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setStatus("error");
        setErrorMessage("You must be logged in.");
        return;
      }

      const { data: bookData, error: bookError } = await supabase
        .from("books")
        .select("id, title")
        .eq("id", bookId)
        .single();

      if (bookError || !bookData) {
        setStatus("error");
        setErrorMessage("Book not found.");
        return;
      }

      const { data: pagesData, error: pagesError } = await supabase
        .from("pages")
        .select("id, book_id, page_number, page_name, image_url, created_at")
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

    const name = newPageName.trim();
    const image = newImageUrl.trim();

    if (!name && !image) {
      setErrorMessage("Enter page name or image URL.");
      return;
    }

    setSaveStatus("saving");
    setErrorMessage(null);

    const nextNumber =
      pages.length > 0
        ? Math.max(...pages.map((p) => p.page_number)) + 1
        : 1;

    const { error } = await supabase.from("pages").insert({
      book_id: bookId,
      page_number: nextNumber,
      page_name: name || null,
      image_url: image || null,
      visible: true,
      is_published: true,
      published_at: new Date().toISOString(),
    });

    if (error) {
      setErrorMessage(error.message);
      setSaveStatus("idle");
      return;
    }

    setNewPageName("");
    setNewImageUrl("");
    setSaveStatus("idle");

    const { data } = await supabase
      .from("pages")
      .select("id, book_id, page_number, page_name, image_url, created_at")
      .eq("book_id", bookId)
      .order("page_number", { ascending: true });

    setPages(data || []);
  }

  async function handleDeletePage(page: PageRow) {
    if (!confirm(`Delete page ${page.page_number}?`)) return;

    const { error } = await supabase.from("pages").delete().eq("id", page.id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }

   setPages((prev: PageRow[]) => prev.filter((p: PageRow) => p.id !== page.id));


  }

  return (
    <div className="min-h-screen bg-[#050614] text-slate-50">
      <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <Link
            href={backHref}
            className="rounded-full border border-slate-700 px-3 py-1.5 text-xs"
          >
            ◂ Back to book
          </Link>
          {book && <span className="text-xs text-slate-300">Pages for: <b>{book.title}</b></span>}
        </div>

        {status === "loading" && <p>Loading…</p>}
        {status === "error" && <p className="text-red-400">{errorMessage}</p>}

        {status === "ok" && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="border border-slate-800 rounded-xl p-4">
              <h2 className="text-sm font-semibold">Existing pages</h2>

              {pages.length === 0 && (
                <p className="text-xs text-slate-500 mt-2">No pages yet.</p>
              )}

              <ul className="mt-3 space-y-2">
                {pages.map((p) => (
                  <li key={p.id} className="flex justify-between text-xs">
                    <span>
                      Page {p.page_number}
                      {p.page_name ? ` — ${p.page_name}` : ""}
                    </span>
                    <button
                      onClick={() => handleDeletePage(p)}
                      className="text-red-400"
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border border-slate-800 rounded-xl p-4 text-xs space-y-3">
              <h2 className="font-semibold">Add page</h2>

              <input
                value={newPageName}
                onChange={(e) => setNewPageName(e.target.value)}
                placeholder="Page name"
                className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1"
              />

              <input
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Image URL"
                className="w-full rounded bg-slate-900 border border-slate-700 px-2 py-1"
              />

              {errorMessage && (
                <p className="text-red-400">{errorMessage}</p>
              )}

              <button
                onClick={handleCreatePage}
                disabled={saveStatus === "saving"}
                className="w-full bg-indigo-600 rounded py-1.5"
              >
                {saveStatus === "saving" ? "Creating…" : "Add page"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
