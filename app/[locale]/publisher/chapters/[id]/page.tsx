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
    deleting: "Deleting...",
    deleteConfirm: "Delete this chapter? This cannot be undone.",
    deleteError: "Error deleting chapter: ",
    saveError: "Error saving chapter: ",
    loadError: "Error loading chapter: ",
    chapterNumber: "Chapter number",
    title: "Title",
    content: "Content",
    createdAt: "Created",
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
        .select("id, book_id, chapter_number, title, content, created_at, status")
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
  }, [chapterId, t.loadError, t.notFound]);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!chapterId || chapterNumber === "") return;

    setSaving(true);
    setMessage(null);

    const payload = {
      chapter_number: Number(chapterNumber),
      title: title.trim(),
      content: content.trim(),
    };

    const { data, error } = await supabase
      .from("chapters")
      .update(payload)
      .eq("id", chapterId)
      .select("id, book_id, chapter_number, title, content, created_at, status")
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
    setMessage(null);

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
        <main className="mx-auto w-full max-w-5xl px-6 py-10 md:px-8 md:py-12">
          <div
            className="rounded-3xl border p-8 shadow-sm"
            style={{
              borderColor: "rgba(47,47,47,0.10)",
              background: "rgba(255,255,255,0.72)",
            }}
          >
            <p className="text-sm text-stone-600">{t.loading}</p>
          </div>
        </main>
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="min-h-screen theme-soft">
        <main className="mx-auto w-full max-w-5xl px-6 py-10 md:px-8 md:py-12">
          <div
            className="rounded-3xl border p-8 shadow-sm"
            style={{
              borderColor: "rgba(47,47,47,0.10)",
              background: "rgba(255,255,255,0.72)",
            }}
          >
            <p className="text-sm text-red-600">{message ?? t.notFound}</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen theme-soft">
      <main className="mx-auto w-full max-w-5xl px-6 py-10 md:px-8 md:py-12">
        <div className="mb-6">
          <Link
            href={`/${locale}/publisher/books/${chapter.book_id}`}
            className="inline-flex items-center text-sm font-medium text-stone-700 hover:text-stone-950"
          >
            ← {t.backToBook}
          </Link>
        </div>

        <section className="mb-8 space-y-3">
          <div
            className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide text-stone-700"
            style={{
              borderColor: "rgba(47,47,47,0.10)",
              background: "rgba(255,255,255,0.70)",
            }}
          >
            {t.eyebrow}
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-stone-900 md:text-4xl">
              {title.trim() || t.untitled}
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-stone-600 md:text-base">
              {t.pageSubtitle}
            </p>
          </div>
        </section>

        {message && (
          <div
            className="mb-6 rounded-2xl border px-4 py-3 text-sm"
            style={{
              borderColor: message === t.saved ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.20)",
              background:
                message === t.saved ? "rgba(240,253,244,0.90)" : "rgba(254,242,242,0.90)",
              color: message === t.saved ? "rgb(21,128,61)" : "rgb(185,28,28)",
            }}
          >
            {message}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <section
            className="rounded-3xl border p-6 shadow-sm md:p-8"
            style={{
              borderColor: "rgba(47,47,47,0.10)",
              background: "rgba(255,255,255,0.78)",
            }}
          >
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid gap-6 md:grid-cols-[180px_minmax(0,1fr)]">
                <div className="space-y-2">
                  <label
                    htmlFor="chapterNumber"
                    className="block text-sm font-medium text-stone-700"
                  >
                    {t.chapterNumber}
                  </label>
                  <input
                    id="chapterNumber"
                    type="number"
                    min={1}
                    value={chapterNumber}
                    onChange={(e) =>
                      setChapterNumber(
                        e.target.value === "" ? "" : Number(e.target.value)
                      )
                    }
                    className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
                    style={{
                      borderColor: "rgba(47,47,47,0.12)",
                      background: "rgba(255,255,255,0.94)",
                    }}
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-stone-700"
                  >
                    {t.title}
                  </label>
                  <input
                    id="title"
                    type="text"
                    value={title}
                    placeholder={t.titlePlaceholder}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-2xl border px-4 py-3 text-sm outline-none transition focus:ring-2"
                    style={{
                      borderColor: "rgba(47,47,47,0.12)",
                      background: "rgba(255,255,255,0.94)",
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="content"
                  className="block text-sm font-medium text-stone-700"
                >
                  {t.content}
                </label>
                <textarea
                  id="content"
                  rows={18}
                  value={content}
                  placeholder={t.contentPlaceholder}
                  onChange={(e) => setContent(e.target.value)}
                  className="min-h-[420px] w-full resize-y rounded-2xl border px-4 py-3 text-sm leading-7 outline-none transition focus:ring-2"
                  style={{
                    borderColor: "rgba(47,47,47,0.12)",
                    background: "rgba(255,255,255,0.94)",
                  }}
                />
              </div>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button
                  type="submit"
                  disabled={saving || deleting}
                  className="inline-flex items-center justify-center rounded-2xl px-5 py-3 text-sm font-medium text-white transition disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    background: "rgb(41,37,36)",
                  }}
                >
                  {saving ? t.saving : t.save}
                </button>

                <button
                  type="button"
                  disabled={saving || deleting}
                  onClick={handleDelete}
                  className="inline-flex items-center justify-center rounded-2xl border px-5 py-3 text-sm font-medium text-red-700 transition disabled:cursor-not-allowed disabled:opacity-60"
                  style={{
                    borderColor: "rgba(239,68,68,0.25)",
                    background: "rgba(254,242,242,0.96)",
                  }}
                >
                  {deleting ? t.deleting : t.delete}
                </button>
              </div>
            </form>
          </section>

          <aside
            className="rounded-3xl border p-6 shadow-sm"
            style={{
              borderColor: "rgba(47,47,47,0.10)",
              background: "rgba(255,255,255,0.78)",
            }}
          >
            <div className="space-y-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  {t.parentBook}
                </p>
                <p className="mt-2 text-base font-medium text-stone-900">
                  {book?.title || "—"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  {t.createdAt}
                </p>
                <p className="mt-2 text-sm text-stone-700">
                  {formatDate(chapter.created_at, localeForDate)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Status
                </p>
                <p className="mt-2 text-sm text-stone-700">
                  {chapter.status || "draft"}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                  Chapter ID
                </p>
                <p className="mt-2 break-all text-xs leading-6 text-stone-500">
                  {chapter.id}
                </p>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}