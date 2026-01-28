"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Props = {
  /** if you pass bookId => updates public.books */
  bookId?: string;
  /** if you pass seriesId => updates public.series */
  seriesId?: string;
  initialUrl: string | null;
  /** optional: override bucket name */
  bucket?: string;
};

export default function CoverImageUploader({
  bookId,
  seriesId,
  initialUrl,
  bucket = "covers",
}: Props) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(initialUrl);

  const target =
    bookId ? { table: "books", id: bookId, prefix: "books" } : seriesId
    ? { table: "series", id: seriesId, prefix: "series" }
    : null;

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (!file) return;

    if (!target) {
      setError("Missing bookId or seriesId");
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${target.prefix}/${target.id}/cover.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          upsert: true,
          cacheControl: "3600",
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: pub } = supabase.storage.from(bucket).getPublicUrl(path);
      const publicUrl = pub?.publicUrl ?? null;
      if (!publicUrl) throw new Error("Could not get public URL");

      const { error: updateError } = await supabase
        .from(target.table)
        .update({ cover_image_url: publicUrl })
        .eq("id", target.id);

      if (updateError) throw updateError;

      setUrl(publicUrl);
    } catch (err: any) {
      setError(err?.message || "Upload failed");
    } finally {
      setIsUploading(false);
      // allow re-upload same file
      e.target.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-800 bg-black/30 p-3">
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="cover" className="w-full rounded-lg object-cover" />
        ) : (
          <div className="aspect-[3/4] w-full rounded-lg bg-slate-900 grid place-items-center text-xs text-slate-400">
            No cover yet
          </div>
        )}
      </div>

      <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-slate-700 bg-black/40 px-4 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-400 hover:text-emerald-200">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={isUploading}
          onChange={handleFileChange}
        />
        {isUploading ? "Uploading…" : url ? "Change cover" : "Upload cover"}
      </label>

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
