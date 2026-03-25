"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type SeriesRow = {
  id: string;
  title: string;
  description: string | null;
  created_at: string;
  cover_image_url: string | null;
  language: string | null;
  user_id?: string | null;
};

const OWNER_EMAIL = "huslen.mungun1@gmail.com";

const UI_TEXT = {
  en: {
    chip: "Studio",
    title: "Studio",
    subtitle:
      "Owner-only studio. Manage your series, chapters, covers, and languages.",
    checkingAccess: "Checking access…",
    retry: "Retry",
    createNew: "+ Create new series",
    errorTitle: "Error",
    permissionHint:
      "If this says “permission denied” → session or RLS still needs fixing.",
    loading: "Loading…",
    emptyTitle: "No series yet.",
    emptyBody: "Click “Create new series” to start.",
    untitled: "Untitled series",
    delete: "Delete",
    deleting: "Deleting…",
    deleteTitle: "Delete series (cascade)",
    backHome: "Back to home",
    languageFallback: "en",
    confirmDelete:
      "Fresh start delete?\n\nThis will delete:\n- Series\n- Books\n- Chapters\n- Translations\n\n{titleBlock}This cannot be undone.",
  },
  mn: {
    chip: "Studio",
    title: "Studio",
    subtitle:
      "Зөвхөн эзэмшигчийн studio. Цуврал, бүлэг, ковер, хэлээ удирдана.",
    checkingAccess: "Хандах эрхийг шалгаж байна…",
    retry: "Дахин оролдох",
    createNew: "+ Шинэ цуврал үүсгэх",
    errorTitle: "Алдаа",
    permissionHint:
      "Хэрэв “permission denied” гэж байвал session эсвэл RLS-г засах хэрэгтэй.",
    loading: "Ачаалж байна…",
    emptyTitle: "Одоогоор цуврал алга.",
    emptyBody: "Эхлэхийн тулд “Шинэ цуврал үүсгэх” дээр дарна уу.",
    untitled: "Нэргүй цуврал",
    delete: "Устгах",
    deleting: "Устгаж байна…",
    deleteTitle: "Цуврал устгах (cascade)",
    backHome: "Нүүр рүү буцах",
    languageFallback: "mn",
    confirmDelete:
      "Шинээр эхлэх устгал уу?\n\nДараах зүйлс устна:\n- Цуврал\n- Номууд\n- Бүлгүүд\n- Орчуулгууд\n\n{titleBlock}Үүнийг буцаах боломжгүй.",
  },
  ko: {
    chip: "스튜디오",
    title: "Studio",
    subtitle:
      "오너 전용 스튜디오입니다. 시리즈, 챕터, 표지, 언어를 관리합니다.",
    checkingAccess: "접근 권한 확인 중…",
    retry: "다시 시도",
    createNew: "+ 새 시리즈 만들기",
    errorTitle: "오류",
    permissionHint:
      "“permission denied”가 보이면 session 또는 RLS를 아직 수정해야 합니다.",
    loading: "불러오는 중…",
    emptyTitle: "아직 시리즈가 없습니다.",
    emptyBody: "시작하려면 “새 시리즈 만들기”를 누르세요.",
    untitled: "제목 없는 시리즈",
    delete: "삭제",
    deleting: "삭제 중…",
    deleteTitle: "시리즈 삭제 (cascade)",
    backHome: "홈으로",
    languageFallback: "ko",
    confirmDelete:
      "초기화 삭제를 진행할까요?\n\n다음 항목이 삭제됩니다:\n- 시리즈\n- 책\n- 챕터\n- 번역\n\n{titleBlock}이 작업은 되돌릴 수 없습니다.",
  },
  ja: {
    chip: "スタジオ",
    title: "Studio",
    subtitle:
      "オーナー専用スタジオです。シリーズ、チャプター、表紙、言語を管理します。",
    checkingAccess: "アクセスを確認中…",
    retry: "再試行",
    createNew: "+ 新しいシリーズを作成",
    errorTitle: "エラー",
    permissionHint:
      "“permission denied” と表示される場合は、session または RLS の修正が必要です。",
    loading: "読み込み中…",
    emptyTitle: "まだシリーズがありません。",
    emptyBody: "開始するには「新しいシリーズを作成」を押してください。",
    untitled: "無題のシリーズ",
    delete: "削除",
    deleting: "削除中…",
    deleteTitle: "シリーズを削除 (cascade)",
    backHome: "ホームへ戻る",
    languageFallback: "ja",
    confirmDelete:
      "初期化削除を実行しますか？\n\n次の内容が削除されます:\n- シリーズ\n- 本\n- チャプター\n- 翻訳\n\n{titleBlock}この操作は元に戻せません。",
  },
} as const;

type SupportedLocale = keyof typeof UI_TEXT;

function normalizeLocale(raw: string): SupportedLocale {
  return (["en", "mn", "ko", "ja"].includes(raw) ? raw : "en") as SupportedLocale;
}

export default function StudioHomePage() {
  const params = useParams();
  const router = useRouter();
  const locale = normalizeLocale((params?.locale as string) || "en");
  const t = UI_TEXT[locale];

  const supabase = useMemo(() => createClientComponentClient(), []);

  const [checkingAccess, setCheckingAccess] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [seriesList, setSeriesList] = useState<SeriesRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const localeForDate = useMemo(() => {
    return locale === "mn"
      ? "mn-MN"
      : locale === "ko"
      ? "ko-KR"
      : locale === "ja"
      ? "ja-JP"
      : "en-GB";
  }, [locale]);

  const loadSeries = useCallback(async () => {
    if (!ownerUserId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("series")
        .select("id, title, description, created_at, cover_image_url, language, user_id")
        .eq("user_id", ownerUserId)
        .order("created_at", { ascending: false });

      if (error) {
        setError(
          `${error.message}${
            (error as { hint?: string | null })?.hint
              ? ` — ${(error as { hint?: string | null }).hint}`
              : ""
          }`
        );
        setSeriesList([]);
        setLoading(false);
        return;
      }

      setSeriesList((data as SeriesRow[]) || []);
      setLoading(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error while loading series.");
      setSeriesList([]);
      setLoading(false);
    }
  }, [supabase, ownerUserId]);

  const deleteSeries = useCallback(
    async (seriesId: string, title?: string | null) => {
      const titleBlock = title ? `"${title}"\n\n` : "";
      const ok = confirm(t.confirmDelete.replace("{titleBlock}", titleBlock));
      if (!ok) return;

      setDeletingId(seriesId);
      setError(null);

      try {
        const { error } = await supabase.rpc("delete_series_cascade", {
          p_series_id: seriesId,
        });

        if (error) {
          setError(
            `Delete failed: ${error.message}${
              (error as { hint?: string | null })?.hint
                ? ` — ${(error as { hint?: string | null }).hint}`
                : ""
            }`
          );
          setDeletingId(null);
          return;
        }

        setSeriesList((prev) => prev.filter((s) => s.id !== seriesId));
        setDeletingId(null);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Unknown error while deleting series.");
        setDeletingId(null);
      }
    },
    [supabase, t.confirmDelete]
  );

  useEffect(() => {
    let alive = true;

    async function checkAccess() {
      setCheckingAccess(true);
      setAllowed(false);
      setOwnerUserId(null);
      setError(null);

      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (!alive) return;

      if (error) {
        setError(error.message);
        setCheckingAccess(false);
        router.replace(`/${locale}/login`);
        return;
      }

      const user = session?.user;

      if (!user) {
        setCheckingAccess(false);
        router.replace(`/${locale}/login`);
        return;
      }

      const email = user.email?.toLowerCase() ?? "";

      if (email !== OWNER_EMAIL.toLowerCase()) {
        setCheckingAccess(false);
        router.replace(`/${locale}`);
        return;
      }

      setOwnerUserId(user.id);
      setAllowed(true);
      setCheckingAccess(false);
    }

    checkAccess();

    return () => {
      alive = false;
    };
  }, [locale, router, supabase]);

  useEffect(() => {
    if (!allowed || !ownerUserId) return;

    let alive = true;

    (async () => {
      if (!alive) return;
      await loadSeries();
    })();

    return () => {
      alive = false;
    };
  }, [allowed, ownerUserId, loadSeries]);

  if (checkingAccess) {
    return (
      <main className="min-h-screen theme-soft">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            {t.checkingAccess}
          </p>
        </div>
      </main>
    );
  }

  if (!allowed) {
    return null;
  }

  return (
    <main className="min-h-screen theme-soft">
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-3">
            <span
              className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium"
              style={{
                borderColor: "var(--border)",
                background: "rgba(233,230,223,0.72)",
                color: "var(--muted)",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: "var(--accent)" }}
              />
              {t.chip}
            </span>

            <div className="space-y-2">
              <h1
                className="text-3xl font-bold tracking-tight sm:text-4xl"
                style={{ color: "var(--text)" }}
              >
                {t.title}
              </h1>
              <p className="max-w-2xl text-sm" style={{ color: "var(--muted)" }}>
                {t.subtitle}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/${locale}`}
              className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-medium transition"
              style={{
                borderColor: "var(--border)",
                background: "rgba(255,255,255,0.55)",
                color: "var(--text)",
              }}
            >
              ← {t.backHome}
            </Link>

            <button
              onClick={loadSeries}
              className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-medium transition"
              style={{
                borderColor: "var(--border)",
                background: "rgba(255,255,255,0.55)",
                color: "var(--text)",
              }}
              type="button"
            >
              {t.retry}
            </button>

            <Link
              href={`/${locale}/studio/series/new`}
              className="inline-flex items-center justify-center rounded-full border px-4 py-2 text-xs font-semibold transition"
              style={{
                borderColor: "rgba(94,99,87,0.28)",
                background: "rgba(94,99,87,0.14)",
                color: "var(--text)",
              }}
            >
              {t.createNew}
            </Link>
          </div>
        </header>

        {error && (
          <div
            className="rounded-[24px] border p-5"
            style={{
              borderColor: "rgba(122,46,46,0.2)",
              background: "rgba(233,230,223,0.72)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <div
              className="mb-1 text-sm font-semibold"
              style={{ color: "var(--danger)" }}
            >
              {t.errorTitle}
            </div>
            <div className="text-xs" style={{ color: "var(--muted)" }}>
              {error}
            </div>
            <div className="mt-2 text-xs" style={{ color: "var(--muted)" }}>
              {t.permissionHint}
            </div>
          </div>
        )}

        {loading ? (
          <div
            className="rounded-[24px] border p-5"
            style={{
              borderColor: "var(--border)",
              background: "rgba(233,230,223,0.72)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              {t.loading}
            </p>
          </div>
        ) : seriesList.length === 0 ? (
          <div
            className="rounded-[24px] border p-6"
            style={{
              borderColor: "var(--border)",
              background: "rgba(233,230,223,0.72)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <p className="text-sm font-semibold" style={{ color: "var(--text)" }}>
              {t.emptyTitle}
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              {t.emptyBody}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4 xl:grid-cols-5">
            {seriesList.map((s) => (
              <article key={s.id} className="group">
                <Link href={`/${locale}/studio/series/${s.id}`} className="block">
                  <div
                    className="relative overflow-hidden rounded-[24px] border transition duration-300 group-hover:-translate-y-1"
                    style={{
                      aspectRatio: "2 / 3",
                      borderColor: "var(--border)",
                      background:
                        "linear-gradient(145deg, rgba(233,230,223,0.94), rgba(217,212,204,0.88))",
                      boxShadow: "var(--shadow-soft)",
                    }}
                  >
                    {s.cover_image_url ? (
                      <>
                        <img
                          src={s.cover_image_url}
                          alt={s.title || t.untitled}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/36 via-transparent to-white/10" />
                        <div className="absolute inset-y-0 right-0 w-[10px] bg-gradient-to-l from-white/30 to-transparent" />
                      </>
                    ) : (
                      <>
                        <div className="absolute inset-0 bg-[linear-gradient(145deg,rgba(94,99,87,0.24),rgba(217,212,204,0.9))]" />
                        <div className="absolute inset-y-0 right-0 w-[12px] bg-gradient-to-l from-white/35 to-transparent" />
                        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
                          <div className="space-y-3">
                            <div
                              className="text-[10px] uppercase tracking-[0.28em]"
                              style={{ color: "var(--muted)" }}
                            >
                              Enkhverse
                            </div>
                            <div
                              className="text-lg font-bold leading-tight"
                              style={{ color: "var(--text)" }}
                            >
                              {s.title || t.untitled}
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="mt-3 space-y-2">
                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <h2
                          className="line-clamp-1 text-sm font-semibold"
                          style={{ color: "var(--text)" }}
                        >
                          {s.title || t.untitled}
                        </h2>
                        <span
                          className="shrink-0 rounded-full border px-2 py-0.5 text-[10px]"
                          style={{
                            borderColor: "var(--border)",
                            background: "rgba(255,255,255,0.5)",
                            color: "var(--muted)",
                          }}
                        >
                          {(s.language || t.languageFallback).toUpperCase()}
                        </span>
                      </div>

                      {s.description ? (
                        <p className="line-clamp-2 text-[11px]" style={{ color: "var(--muted)" }}>
                          {s.description}
                        </p>
                      ) : null}
                    </div>

                    <p className="text-[10px]" style={{ color: "var(--muted)" }}>
                      {new Date(s.created_at).toLocaleString(localeForDate, {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>

                    <div className="flex items-center justify-end pt-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (deletingId) return;
                          deleteSeries(s.id, s.title);
                        }}
                        className="inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px] font-semibold transition"
                        style={{
                          borderColor: "rgba(122,46,46,0.22)",
                          background: "rgba(122,46,46,0.08)",
                          color: "var(--danger)",
                        }}
                        disabled={!!deletingId}
                        aria-disabled={!!deletingId}
                        title={t.deleteTitle}
                      >
                        {deletingId === s.id ? t.deleting : t.delete}
                      </button>
                    </div>
                  </div>
                </Link>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}