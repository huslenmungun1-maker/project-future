"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Status = "loading" | "ok" | "error";

type SeriesRow = {
  id: string;
  title: string;
  description: string | null;
  status: string | null;
  created_at: string;
  project_type: string | null;
  language: string | null;
  main_genre: string | null;
};

const UI_TEXT = {
  en: {
    chip: "Reader • Project Future",
    heroTitle: "Read experimental manga & stories",
    heroBody:
      "This is the reader side of your lab. Pick a series, then jump straight into Chapter 1.",
    supabaseOk: "Loaded series from Supabase.",
    supabaseEmpty: "Series table is empty. Create something in the studio first.",
    supabaseError: "Could not load series.",
    yourSeries: "Available series",
    startReading: "Start reading",
    createdAt: "Created",
    statusDraft: "draft",
  },
  mn: {
    chip: "Уншигч • Project Future",
    heroTitle: "Туршилтын манга, түүхүүдийг унш",
    heroBody:
      "Энэ бол уншигчийн тал. Цувралаа сонгоод шууд 1-р бүлгээс уншиж эхэл.",
    supabaseOk: "Supabase-ээс цувралууд амжилттай уншигдлаа.",
    supabaseEmpty:
      "Одоогоор цуврал байхгүй байна. Эхлээд студид нэг цуврал үүсгэ.",
    supabaseError: "Цувралын мэдээлэл ачаалахад алдаа гарлаа.",
    yourSeries: "Бэлэн цувралууд",
    startReading: "Уншиж эхлэх",
    createdAt: "Үүсгэсэн",
    statusDraft: "ноорог",
  },
  ko: {
    chip: "리더 • Project Future",
    heroTitle: "실험적인 만화와 스토리 읽기",
    heroBody:
      "여기는 리더 페이지입니다. 시리즈를 선택하고 1화부터 바로 읽어 보세요.",
    supabaseOk: "Supabase에서 시리즈를 불러왔습니다.",
    supabaseEmpty:
      "아직 시리즈가 없습니다. 먼저 스튜디오에서 작품을 만들어 주세요.",
    supabaseError: "시리즈를 불러오는 중 오류가 발생했습니다.",
    yourSeries: "읽을 수 있는 시리즈",
    startReading: "읽기 시작",
    createdAt: "생성일",
    statusDraft: "임시",
  },
  ja: {
    chip: "リーダー • Project Future",
    heroTitle: "実験的なマンガとストーリーを読む",
    heroBody:
      "ここは読者用ページです。シリーズを選んで、第1話から読み始めましょう。",
    supabaseOk: "Supabase からシリーズを読み込みました。",
    supabaseEmpty:
      "まだシリーズがありません。まずスタジオで作品を作成してください。",
    supabaseError: "シリーズの読み込み中にエラーが発生しました。",
    yourSeries: "読めるシリーズ",
    startReading: "読み始める",
    createdAt: "作成日",
    statusDraft: "ドラフト",
  },
} as const;

type SupportedLocale = keyof typeof UI_TEXT;

export default function ReaderPage() {
  const params = useParams();
  const rawLocale = (params?.locale as string) || "en";
  const locale = (["en", "mn", "ko", "ja"].includes(rawLocale)
    ? rawLocale
    : "en") as SupportedLocale;
  const t = UI_TEXT[locale];

  const [status, setStatus] = useState<Status>("loading");
  const [statusMessage, setStatusMessage] = useState("");
  const [series, setSeries] = useState<SeriesRow[]>([]);

  useEffect(() => {
    const fetchSeries = async () => {
      setStatus("loading");
      const { data, error } = await supabase
        .from("series")
        .select(
          "id, title, description, status, created_at, project_type, language, main_genre"
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading series for reader:", error);
        setStatus("error");
        setStatusMessage(t.supabaseError);
        setSeries([]);
        return;
      }

      if (!data || data.length === 0) {
        setStatus("ok");
        setStatusMessage(t.supabaseEmpty);
        setSeries([]);
        return;
      }

      setStatus("ok");
      setStatusMessage(t.supabaseOk);
      setSeries(data as SeriesRow[]);
    };

    fetchSeries();
    // eslint-disable-next-line react-hooks-exhaustive-deps
  }, [locale]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-slate-950 to-slate-900 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-12">
        {/* Top bar */}
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-700 bg-black/40 px-3 py-1 text-[11px] font-medium text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {t.chip}
            </span>
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t.heroTitle}
            </h1>
            <p className="max-w-xl text-sm text-slate-300">{t.heroBody}</p>
          </div>

          <Link
            href={`/${locale}`}
            className="mt-2 inline-flex items-center justify-center rounded-full border border-slate-700 bg-black/40 px-4 py-2 text-xs font-medium text-slate-200 hover:border-emerald-400 hover:text-emerald-200 sm:mt-0"
          >
            ← Back to studio
          </Link>
        </header>

        {/* Status card */}
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300">
            <p className="mb-1 font-semibold">Supabase</p>
            {status === "loading" && <p>Loading series…</p>}
            {status === "ok" && <p>{statusMessage}</p>}
            {status === "error" && (
              <p className="text-rose-300">{statusMessage}</p>
            )}
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300">
            <p className="mb-1 font-semibold">How it works</p>
            <p>
              Choose a series below. We&apos;ll send you to{" "}
              <code className="rounded bg-slate-900 px-1 py-0.5 text-[10px]">
                /reader/[seriesId]/1
              </code>{" "}
              to start from Chapter 1.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-xs text-slate-300">
            <p className="mb-1 font-semibold">Tip</p>
            <p>
              Create dummy chapters in the Publisher page, then test them here
              before you add real page images.
            </p>
          </div>
        </section>

        {/* Series list */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-slate-100">
            {t.yourSeries}
          </h2>

          {status === "loading" && (
            <p className="text-xs text-slate-400">Loading…</p>
          )}

          {status === "ok" && series.length === 0 && (
            <p className="text-xs text-slate-400">{statusMessage}</p>
          )}

          {status !== "loading" && series.length > 0 && (
            <ul className="flex flex-col gap-3">
              {series.map((s) => (
                <li
                  key={s.id}
                  className="rounded-xl border border-slate-800 bg-black/40 p-4 transition hover:border-emerald-400/70"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-1">
                      <h3 className="text-sm font-semibold text-slate-50">
                        {s.title}
                      </h3>
                      {s.description && (
                        <p className="line-clamp-2 text-xs text-slate-300">
                          {s.description}
                        </p>
                      )}
                      <p className="text-[10px] text-slate-500">
                        {t.createdAt}:{" "}
                        {new Date(s.created_at).toLocaleString("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>

                    <div className="flex flex-col items-start gap-2 sm:items-end">
                      <div className="flex flex-wrap gap-2 text-[10px] text-slate-300">
                        <span className="rounded-full border border-slate-700 px-2 py-0.5 uppercase tracking-wide">
                          {s.status || t.statusDraft}
                        </span>
                        {s.project_type && (
                          <span className="rounded-full border border-slate-700 px-2 py-0.5 uppercase tracking-wide text-slate-400">
                            {s.project_type.replace("_", " ")}
                          </span>
                        )}
                        {s.language && (
                          <span className="rounded-full border border-slate-700 px-2 py-0.5">
                            {s.language.toUpperCase()}
                          </span>
                        )}
                        {s.main_genre && (
                          <span className="rounded-full border border-slate-700 px-2 py-0.5">
                            {s.main_genre}
                          </span>
                        )}
                      </div>

                      <Link
                        href={`/${locale}/reader/${s.id}/1`}
                        className="inline-flex items-center justify-center rounded-lg bg-indigo-500 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-400"
                      >
                        {t.startReading}
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
