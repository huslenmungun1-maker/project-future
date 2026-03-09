"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Locale = "en" | "ko" | "mn" | "ja";

type Chapter = {
  id: string;
  book_id: string;
  chapter_number: number;
  title: string;
  content: string;
  created_at: string;
  updated_at?: string | null;
  status?: string | null;
};

type BookLite = {
  id: string;
  title: string;
};

const UI = {
  en: {
    backToBook: "Back to Book",
    eyebrow: "Publisher · Chapter Editor",
    pageTitle: "Edit chapter",
    pageSubtitle:
      "Update chapter order and content cleanly for the reader structure.",
    loading: "Loading chapter...",
    notFound: "Chapter not found.",
    save: "Save changes",
    saving: "Saving...",
    saved: "Chapter updated.",
    delete: "Delete chapter",
    deleteConfirm: "Delete this chapter? This cannot be undone.",
    deleteError: "Error deleting chapter: ",
    saveError: "Error saving chapter: ",
    loadError: "Error loading chapter: ",
    chapterNumber: "Chapter number",
    title: "Title",
    content: "Content",
    createdAt: "Created",
    updatedAt: "Updated",
    parentBook: "Parent book",
    untitled: "Untitled chapter",
    titlePlaceholder: "Chapter title",
    contentPlaceholder: "Write the chapter content here...",
  },
} as const;

function safeLocale(raw: string): Locale {
  return (["en", "ko", "mn", "ja"].includes(raw) ? raw : "en") as Locale;
}

function formatDate(value: string | null | undefined, localeCode: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString(localeCode, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function PublisherChapterEditorPage() {
  const router = useRouter();
  const params = useParams() as { id?: string; locale?: string };

  const chapterId = params?.id;
  const locale = safeLocale(params?.locale || "en");
  const t = UI.en;

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [book, setBook] = useState<BookLite | null>(null);

  const [chapterNumber, setChapterNumber] = useState<number | "">("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const localeForDate = useMemo(() => "en-GB", []);

  useEffect(() => {
    if (!chapterId) return;

    async function loadChapter() {
      setLoading(true);
      setMessage(null);

      const { data, error } = await supabase
        .from("chapters")
        .select(
          "id, book_id, chapter_number, title, content, created_at, updated_at, status"
        )
        .eq("id", chapterId)
        .maybeSingle();

      if (error || !data) {
        const msg =
          error && typeof error.message === "string"
            ? error.message
            : t.notFound;

        setMessage(t.loadError + msg);
        setLoading(false);
        return;
      }

      const chapterRow = data as Chapter;

      setChapter(chapterRow);
      setChapterNumber(chapterRow.chapter_number);
      setTitle(chapterRow.title ?? "");
      setContent(chapterRow.content ?? "");

      const { data: bookData } = await supabase
        .from("books")
        .select("id, title")
        .eq("id", chapterRow.book_id)
        .maybeSingle();

      if (bookData) setBook(bookData as BookLite);

      setLoading(false);
    }

    loadChapter();
  }, [chapterId]);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!chapterId || chapterNumber === "") return;

    setSaving(true);
    setMessage(null);

    const payload = {
      chapter_number: Number(chapterNumber),
      title: title.trim(),
      content: content.trim(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("chapters")
      .update(payload)
      .eq("id", chapterId)
      .select(
        "id, book_id, chapter_number, title, content, created_at, updated_at, status"
      )
      .maybeSingle();

    if (error || !data) {
      const msg =
        error && typeof error.message === "string"
          ? error.message
          : "Unknown Supabase error";

      setMessage(t.saveError + msg);
      setSaving(false);
      return;
    }

    const updated = data as Chapter;

    setChapter(updated);
    setChapterNumber(updated.chapter_number);
    setTitle(updated.title ?? "");
    setContent(updated.content ?? "");
    setMessage(t.saved);
    setSaving(false);
  }

  async function handleDelete() {
    if (!chapter) return;

    const ok = window.confirm(t.deleteConfirm);
    if (!ok) return;

    setDeleting(true);

    const { error } = await supabase
      .from("chapters")
      .delete()
      .eq("id", chapter.id);

    if (error) {
      const msg =
        error && typeof error.message === "string"
          ? error.message
          : "Unknown Supabase error";

      setMessage(t.deleteError + msg);
      setDeleting(false);
      return;
    }

    router.push(`/${locale}/publisher/books/${chapter.book_id}`);
  }

  if (loading) {
    return (
      <div className="min-h-screen theme-soft">
        <main className="mx-auto max-w-4xl px-6 py-10">
          <p>{t.loading}</p>
        </main>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="min-h-screen theme-soft">
        <main className="mx-auto max-w-4xl px-6 py-10">
          <p>{message ?? t.notFound}</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-soft">
      <main className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        <Link
          href={`/${locale}/publisher/books/${chapter.book_id}`}
          className="text-sm"
        >
          ← {t.backToBook}
        </Link>

        {message && <p>{message}</p>}

        <form onSubmit={handleSave} className="space-y-4">
          <input
            type="number"
            value={chapterNumber}
            onChange={(e) =>
              setChapterNumber(
                e.target.value === "" ? "" : Number(e.target.value)
              )
            }
          />

          <input
            type="text"
            value={title}
            placeholder={t.titlePlaceholder}
            onChange={(e) => setTitle(e.target.value)}
          />

          <textarea
            rows={12}
            value={content}
            placeholder={t.contentPlaceholder}
            onChange={(e) => setContent(e.target.value)}
          />

          <button disabled={saving}>{saving ? t.saving : t.save}</button>

          <button
            type="button"
            disabled={saving || deleting}
            onClick={handleDelete}
          >
            {t.delete}
          </button>
        </form>

        <div>
          <p>{t.parentBook}</p>
          <p>{book?.title}</p>
        </div>
      </main>
    </div>
  );
}