"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Status = "loading" | "ok" | "error";

type SeriesBaseRow = {
  id: string;
  created_at: string;
  cover_image_url: string | null;
  published?: boolean | null;
  published_at?: string | null;
  default_locale?: string | null; // optional (if you added it)
};

type SeriesTranslationRow = {
  series_id: string;
  locale: "en" | "mn" | "ko" | "ja";
  title: string;
  description: string | null;
};

type ChapterBaseRow = {
  id: string;
  series_id: string;
  chapter_number: number;
  created_at: string;
  content: string | null; // legacy fallback if you still have it
};

type ChapterTranslationRow = {
  chapter_id: string;
  locale: "en" | "mn" | "ko" | "ja";
  title: string;
  script: string | null;
};

const UI_TEXT = {
  en: {
    backToReader: "Back to Reader",
    backToProject: "Back to project",
    chip: "Reader • Project",
    loading: "Loading…",
    notFound: "Project or chapter not found.",
    supabaseError: "Could not load project/chapter.",
    chapter: "Chapter",
    next: "Next",
    prev: "Prev",
    createdAt: "Created",
    noContent: "No content yet for this chapter.",
  },
  mn: {
    backToReader: "Уншигч руу буцах",
    backToProject: "Төсөл рүү буцах",
    chip: "Уншигч • Төсөл",
    loading: "Ачаалж байна…",
    notFound: "Төсөл эсвэл бүлэг олдсонгүй.",
    supabaseError: "Төсөл/бүлгийг ачаалж чадсангүй.",
    chapter: "Бүлэг",
    next: "Дараах",
    prev: "Өмнөх",
    createdAt: "Үүсгэсэн",
    noContent: "Энэ бүлэгт одоогоор контент алга.",
  },
  ko: {
    backToReader: "리더로 돌아가기",
    backToProject: "프로젝트로 돌아가기",
    chip: "리더 • 프로젝트",
    loading: "불러오는 중…",
    notFound: "프로젝트 또는 챕터를 찾을 수 없습니다.",
    supabaseError: "프로젝트/챕터를 불러올 수 없습니다.",
    chapter: "챕터",
    next: "다음",
    prev: "이전",
    createdAt: "생성일",
    noContent: "이 챕터에는 아직 내용이 없습니다.",
  },
  ja: {
    backToReader: "リーダーへ戻る",
    backToProject: "プロジェクトへ戻る",
    chip: "リーダー • プロジェクト",
    loading: "読み込み中…",
    notFound: "プロジェクトまたはチャプターが見つかりません。",
    supabaseError: "プロジェクト/チャプターを読み込めません。",
    chapter: "チャプター",
    next: "次へ",
    prev: "前へ",
    createdAt: "作成日",
    noContent: "このチャプターにはまだ内容がありません。",
  },
} as const;

type SupportedLocale = keyof typeof UI_TEXT;

function normalizeLocale(raw: string): SupportedLocale {
  return (["en", "mn", "ko", "ja"].includes(raw) ? raw : "en") as SupportedLocale;
}

async function fetchSeriesTranslation(seriesId: string, locale: SupportedLocale) {
  // try requested locale
  const { data: tr1, error: e1 } = await supabase
    .from("series_translations")
    .select("series_id, locale, title, description")
    .eq("series_id", seriesId)
    .eq("locale", locale)
    .maybeSingle();

  if (!e1 && tr1) return tr1 as SeriesTranslationRow;

  // fallback to English
  const { data: tr2, error: e2 } = await supabase
    .from("series_translations")
    .select("series_id, locale, title, description")
    .eq("series_id", seriesId)
    .eq("locale", "en")
    .maybeSingle();

  if (!e2 && tr2) return tr2 as SeriesTranslationRow;

  return null;
}

async function fetchChapterTranslation(chapterId: string, locale: SupportedLocale) {
  // try requested locale
  const { data: tr1, error: e1 } = await supabase
    .from("chapter_translations")
    .select("chapter_id, locale, title, script")
    .eq("chapter_id", chapterId)
    .eq("locale", locale)
    .maybeSingle();

  if (!e1 && tr1) return tr1 as ChapterTranslationRow;

  // fallback to English
  const { data: tr2, error: e2 } = await supabase
    .from("chapter_translations")
    .select("chapter_id, locale, title, script")
    .eq("chapter_id", chapterId)
    .eq("locale", "en")
    .maybeSingle();

  if (!e2 && tr2) return tr2 as ChapterTranslationRow;

  return null;
}

export default function ReaderSeriesChapterPage() {
  const params = useParams();

  const locale = normalizeLocale((params?.locale as string) || "en");
  const seriesId = (params?.seriesId as string) || "";
  const chapterParam = (params?.chapterNumber as string) || "1";
  const chapterNumber = Number(chapterParam) || 1;

  const t = UI_TEXT[locale];

  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState("");

  const [seriesBase, setSeriesBase] = useState<SeriesBaseRow | null>(null);
  const [seriesTr, setSeriesTr] = useState<SeriesTranslationRow | null>(null);

  const [chapterBase, setChapterBase] = useState<ChapterBaseRow | null>(null);
  const [chapterTr, setChapterTr] = useState<ChapterTranslationRow | null>(null);

  const localeForDate = useMemo(() => {
    return locale === "mn"
      ? "mn-MN"
      : locale === "ko"
      ? "ko-KR"
      : locale === "ja"
      ? "ja-JP"
      : "en-GB";
  }, [locale]);

  useEffect(() => {
    const load = async () => {
      setStatus("loading");
      setMessage("");
      setSeriesBase(null);
      setSeriesTr(null);
      setChapterBase(null);
      setChapterTr(null);

      if (!seriesId) {
        setStatus("error");
        setMessage(t.notFound);
        return;
      }

      // 1) Load series base (publishing gate)
      const { data: s, error: sErr } = await supabase
        .from("series")
        .select("id, created_at, cover_image_url, published, published_at, default_locale")
        .eq("id", seriesId)
        .maybeSingle();

      if (sErr || !s) {
        setStatus("error");
        setMessage(t.supabaseError);
        return;
      }

      // Gate: only allow published projects in reader
      const isPublished = Boolean(s.published) || Boolean(s.published_at);
      if (!isPublished) {
        setStatus("error");
        setMessage(t.notFound);
        return;
      }

      setSeriesBase(s as SeriesBaseRow);

      // 2) Load series translation (locale -> fallback en)
      const sTr = await fetchSeriesTranslation(seriesId, locale);
      if (!sTr) {
        setStatus("error");
        setMessage(t.notFound);
        return;
      }
      setSeriesTr(sTr);

      // 3) Load chapter base (by series + chapter number)
      const { data: c, error: cErr } = await supabase
        .from("chapters")
        .select("id, series_id, chapter_number, created_at, content")
        .eq("series_id", seriesId)
        .eq("chapter_number", chapterNumber)
        .maybeSingle();

      if (cErr || !c) {
        setStatus("error");
        setMessage(t.notFound);
        return;
      }

      const cBase = c as ChapterBaseRow;
      setChapterBase(cBase);

      // 4) Load chapter translation (locale -> fallback en)
      const cTr = await fetchChapterTranslation(cBase.id, locale);
      if (!cTr) {
        setStatus("error");
        setMessage(t.notFound);
        return;
      }
      setChapterTr(cTr);

      setStatus("ok");
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seriesId, chapterNumber, locale]);

  const prevHref = `/${locale}/reader/series/${seriesId}/${Math.max(1, chapterNumber - 1)}`;
  const nextHref = `/${locale}/reader/series/${seriesId}/${chapterNumber + 1}`;

  if (status === "loading") {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-slate-900 text-slate-100">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <p className="text-sm text-slate-300">{t.loading}</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !seriesBase || !seriesTr || !chapterBase || !chapterTr) {
    return (
      <main className="min-h-screen bg-black text-slate-100">
        <div className="mx-auto max-w-4xl px-6 py-12 space-y-4">
          <Link href={`/${locale}/reader`} className="text-xs text-slate-400 hover:text-emerald-300">
            ← {t.backToReader}
          </Link>
          <p className="text-sm text-rose-300">{message || t.notFound}</p>
        </div>
      </main>
    );
  }

  const chapterText =
    (chapterTr.script && chapterTr.script.trim()) ||
    (chapterBase.content && chapterBase.content.trim()) ||
    "";

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto max-w-4xl px-6 py-10 space-y-6">
        <div className="flex items-center justify-between text-xs text-slate-400">
          <Link
            href={`/${locale}/reader`}
            className="inline-flex items-center gap-1 hover:text-slate-100"
          >
            <span className="text-lg">←</span>
            {t.backToReader}
          </Link>

          <Link href={`/${locale}/studio/series/${seriesBase.id}`} className="hover:text-slate-100">
            {t.backToProject}
          </Link>
        </div>

        <header className="space-y-2">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-700 bg-black/40 px-3 py-1 text-[11px] font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {t.chip}
          </span>

          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{seriesTr.title}</h1>

          {seriesTr.description && (
            <p className="text-sm text-slate-300 max-w-2xl">{seriesTr.description}</p>
          )}
        </header>

        <section className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-50">
                {t.chapter} {chapterBase.chapter_number}: {chapterTr.title}
              </h2>
              <p className="text-[11px] text-slate-500">
                {t.createdAt}:{" "}
                {new Date(chapterBase.created_at).toLocaleString(localeForDate, {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>

            <div className="flex gap-2">
              <Link
                href={prevHref}
                className="rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-xs text-slate-200 hover:border-emerald-400 hover:text-emerald-200"
              >
                {t.prev}
              </Link>
              <Link
                href={nextHref}
                className="rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-xs text-slate-200 hover:border-emerald-400 hover:text-emerald-200"
              >
                {t.next}
              </Link>
            </div>
          </div>

          <article className="whitespace-pre-wrap text-sm leading-6 text-slate-200">
            {chapterText ? chapterText : t.noContent}
          </article>
        </section>
      </div>
    </main>
  );
}
