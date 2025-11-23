"use client";

import { useState } from "react";
import Image from "next/image";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Props = {
  seriesId: string;
  initialUrl?: string | null;
};

export default function CoverImageUploader({ seriesId, initialUrl }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialUrl || null
  );
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClientComponentClient();

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${seriesId}-${Date.now()}.${fileExt}`;
      const filePath = `${seriesId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("series-covers")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("series-covers").getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("series")
        .update({ cover_image_url: publicUrl })
        .eq("id", seriesId);

      if (updateError) throw updateError;

      setPreviewUrl(publicUrl);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-3 text-sm">
      {previewUrl ? (
        <div className="relative w-full aspect-[3/4] overflow-hidden rounded-xl border">
          <Image
            src={previewUrl}
            alt="Series cover"
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="w-full aspect-[3/4] rounded-xl border border-dashed flex items-center justify-center text-xs text-neutral-500">
          No cover yet
        </div>
      )}

      <label className="inline-flex items-center justify-center px-3 py-2 rounded-xl border cursor-pointer text-xs">
        <span>{isUploading ? "Uploading..." : "Change cover"}</span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          disabled={isUploading}
        />
      </label>

      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
