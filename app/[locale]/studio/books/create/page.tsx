"use client";

import { useState, FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type CreateStatus = "idle" | "creating";

export default function CreateBookPage() {
  const params = useParams();
  const router = useRouter();

  const locale = (params?.locale as string) || "en";
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [status, setStatus] = useState<CreateStatus>("idle");

  const baseLocale = locale ? `/${locale}` : "";
  const backHref = `${baseLocale}/studio/books`;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("creating");
    setErrorMsg(null);
    setStatusMsg("Creating book…");

    // 1) Get logged-in user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      setErrorMsg(userError?.message || "You must be logged in.");
      setStatus("idle");
      setStatusMsg(null);
      return;
    }
    const user = userData.user;

    // 2) Insert book
    const { data, error } = await supabase
      .from("books")
      .insert({
        title: title.trim() || "Untitled book",
        description: description.trim() || null,
        status: "draft",       // ✅ matches your CHECK constraint
        creator_id: user.id,   // ✅ avoids creator_id null error
      })
      .select("id")
      .single();

    if (error) {
      console.error("Error creating book:", error);
      setErrorMsg(error.message);
      setStatus("idle");
      setStatusMsg(null);
      return;
    }

    setStatusMsg("Book created!");
    // 3) Go to the new book's detail page
    const newId = data.id;
    router.push(`${baseLocale}/studio/books/${newId}`);
  }

  return (
    <div className="min-h-screen bg-[#050614] text-slate-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-8">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <a
            href={backHref}
            className="inline-flex items-center rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-800"
          >
            ◂ Back to books
          </a>
          <span className="text-xs text-slate-500">
            New book • status: draft
          </span>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-6">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
            Create a new book
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            This will be your main container for chapters, images and AI magic.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-5 text-sm">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-slate-400">
                Title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="My first cosmic apocalyptic manga"
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
                rows={4}
                className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2 text-sm text-slate-50 outline-none ring-0 placeholder:text-slate-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                placeholder="Short summary, hook, or world description."
              />
            </div>

            {/* Status */}
            <p className="text-[11px] text-slate-500">
              New books start as <span className="font-semibold">draft</span>.
              You can publish them later in the book panel.
            </p>

            {/* Buttons + messages */}
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="submit"
                disabled={status === "creating"}
                className="inline-flex items-center justify-center rounded-xl border border-indigo-500/60 bg-indigo-600/90 px-4 py-2 text-xs font-medium shadow-sm transition hover:bg-indigo-500 hover:shadow-lg hover:shadow-indigo-500/40 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "creating" ? "Creating…" : "Create book"}
              </button>

              <div className="text-[11px] text-slate-400">
                {statusMsg && <span className="text-indigo-300">{statusMsg}</span>}
                {errorMsg && <span className="text-red-300">{errorMsg}</span>}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
