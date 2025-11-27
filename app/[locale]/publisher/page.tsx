"use client";

import {
  useEffect,
  useState,
  type KeyboardEvent,
  type FormEvent,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
  subgenres: string[] | null;
  tags: string[] | null;
};

/**
 * ─────────────────────────────────────────────
 * UI TEXT BY LOCALE (en, mn, ko, ja)
 * ─────────────────────────────────────────────
 */
const UI_TEXT = {
  en: {
    chip: "Project Future · AI Manga Studio",
    heroTitlePrefix: "Build, publish & read",
    heroTitleHighlight: "AI-powered stories",
    heroBody:
      "This is your experimental lab. Create manga, web novels, scripts, moodboards and more. Supabase stores it, and we’ll keep layering AI tools on top.",
    supabaseStatus: "Supabase status",
    creatorDashboard: "Creator dashboard",
    creatorBody:
      "Later we’ll show stats, drafts, and analytics for your series here.",
    readerActivity: "Reader activity",
    readerBody:
      "Eventually this will display views, likes, and recent readers.",
    createTitle: "Create a new project",
    fieldTitle: "Title",
    fieldDescription: "Description",
    fieldProjectType: "Project type",
    fieldPrimaryLanguage: "Primary language",
    fieldMainGenre: "Main genre",
    fieldSubgenres: "Sub-genres (choose a few)",
    fieldTags: "Tags (press Enter to add)",
    tagsPlaceholder:
      "e.g. cyberpunk, Mongolia, mecha, school, dystopia...",
    createButton: "Create project",
    yourProjects: "Your projects",
    loadingSeries: "Loading your series…",
    noSeries:
      "You don’t have any series yet. Create your first one on the left.",
  },
  mn: {
    chip: "Project Future · AI манга студи",
    heroTitlePrefix: "Унш, бүтээ, нийтэл",
    heroTitleHighlight: "Хиймэл оюунд суурилсан түүхүүд",
    heroBody:
      "Энэ бол чиний туршилтын лаборатори. Манга, веб роман, сценар, моодны moodboard гээд хүссэнээ үүсгэ. Бүх өгөгдлийг Supabase хадгална, бид дээр нь AI хэрэгслүүдийг нэмнэ.",
    supabaseStatus: "Supabase төлөв",
    creatorDashboard: "Бүтээгчийн самбар",
    creatorBody:
      "Дараа нь энд цувралын статистик, ноорог, аналитик мэдээллийг харуулна.",
    readerActivity: "Уншигчдын идэвх",
    readerBody:
      "Цаашид энд уншилт, лайк, сүүлийн уншигчдыг харуулах болно.",
    createTitle: "Шинэ төсөл үүсгэх",
    fieldTitle: "Гарчиг",
    fieldDescription: "Тайлбар",
    fieldProjectType: "Төслийн төрөл",
    fieldPrimaryLanguage: "Үндсэн хэл",
    fieldMainGenre: "Үндсэн жанр",
    fieldSubgenres: "Дэд жанрууд (хэдийг сонгоно уу)",
    fieldTags: "Тагууд (Enter дарж нэмнэ)",
    tagsPlaceholder:
      "жишээ нь: cyberpunk, Mongolia, mecha, school, dystopia...",
    createButton: "Төсөл үүсгэх",
    yourProjects: "Төслүүд чинь",
    loadingSeries: "Төслүүдийг ачаалж байна…",
    noSeries:
      "Одоогоор нэг ч төсөл байхгүй байна. Зүүн талд анхны төслөө үүсгээрэй.",
  },
  ko: {
    chip: "Project Future · AI 만화 스튜디오",
    heroTitlePrefix: "만들고, 발행하고, 읽는",
    heroTitleHighlight: "AI 스토리",
    heroBody:
      "이곳은 당신의 실험실입니다. 만화, 웹소설, 스크립트, 무드보드 등을 만들고 Supabase에 저장하세요. 우리는 그 위에 AI 도구를 계속 얹을 거예요.",
    supabaseStatus: "Supabase 상태",
    creatorDashboard: "크리에이터 대시보드",
    creatorBody:
      "나중에는 여기에서 작품의 통계, 초안, 분석 데이터를 볼 수 있어요.",
    readerActivity: "독자 활동",
    readerBody: "나중에는 조회수, 좋아요, 최근 독자를 보여 줄 거예요.",
    createTitle: "새 프로젝트 만들기",
    fieldTitle: "제목",
    fieldDescription: "설명",
    fieldProjectType: "프로젝트 유형",
    fieldPrimaryLanguage: "기본 언어",
    fieldMainGenre: "메인 장르",
    fieldSubgenres: "서브 장르 (여러 개 선택 가능)",
    fieldTags: "태그 (Enter 키로 추가)",
    tagsPlaceholder:
      "예: cyberpunk, Mongolia, mecha, school, dystopia...",
    createButton: "프로젝트 생성",
    yourProjects: "내 프로젝트",
    loadingSeries: "프로젝트를 불러오는 중…",
    noSeries: "아직 프로젝트가 없습니다. 왼쪽에서 첫 작품을 만들어 보세요.",
  },
  ja: {
    chip: "Project Future · AIマンガスタジオ",
    heroTitlePrefix: "つくる・公開する・読める",
    heroTitleHighlight: "AIストーリー",
    heroBody:
      "ここはあなたの実験ラボです。マンガ、Web小説、脚本、ムードボードなどを作成し、Supabase が保存します。私たちはその上にAIツールを重ねていきます。",
    supabaseStatus: "Supabase ステータス",
    creatorDashboard: "クリエイターダッシュボード",
    creatorBody:
      "今後ここにシリーズの統計、ドラフト、分析などを表示します。",
    readerActivity: "読者のアクティビティ",
    readerBody: "将来的に閲覧数・いいね・最近の読者を表示します。",
    createTitle: "新しいプロジェクトを作成",
    fieldTitle: "タイトル",
    fieldDescription: "説明",
    fieldProjectType: "プロジェクトタイプ",
    fieldPrimaryLanguage: "メイン言語",
    fieldMainGenre: "メインジャンル",
    fieldSubgenres: "サブジャンル（複数選択可）",
    fieldTags: "タグ（Enterキーで追加）",
    tagsPlaceholder:
      "例: cyberpunk, Mongolia, mecha, school, dystopia...",
    createButton: "プロジェクト作成",
    yourProjects: "あなたのプロジェクト",
    loadingSeries: "シリーズを読み込み中…",
    noSeries:
      "まだシリーズがありません。左側で最初のプロジェクトを作成しましょう。",
  },
} as const;

type SupportedLocale = keyof typeof UI_TEXT;

// Simple configs for selects & genre tree
const PROJECT_TYPES = [
  { value: "manga", label: "Manga" },
  { value: "comic", label: "Comic" },
  { value: "web_novel", label: "Web novel / light novel" },
  { value: "picture_book", label: "Kids picture book" },
  { value: "moodboard", label: "Moodboard / fashion / design" },
  { value: "script_or_lyrics", label: "Script / lyrics" },
  { value: "other", label: "Other / experimental" },
];

const LANGUAGE_OPTIONS = [
  { value: "mn", label: "Mongolian" },
  { value: "en", label: "English" },
  { value: "ko", label: "Korean" },
  { value: "ja", label: "Japanese" },
  { value: "other", label: "Other" },
];

const GENRE_TREE: Record<
  string,
  { label: string; subgenres: { id: string; label: string }[] }
> = {
  action: {
    label: "Action",
    subgenres: [
      { id: "martial-arts", label: "Martial arts" },
      { id: "military", label: "Military" },
      { id: "superhero", label: "Superhero" },
      { id: "historical-action", label: "Historical action" },
      { id: "sci-fi-action", label: "Sci-fi action" },
    ],
  },
  romance: {
    label: "Romance",
    subgenres: [
      { id: "school", label: "School romance" },
      { id: "office", label: "Office romance" },
      { id: "fantasy-romance", label: "Fantasy romance" },
      { id: "bl", label: "BL" },
      { id: "gl", label: "GL" },
    ],
  },
  horror: {
    label: "Horror",
    subgenres: [
      { id: "psychological", label: "Psychological horror" },
      { id: "supernatural", label: "Supernatural" },
      { id: "gore", label: "Gore" },
      { id: "monster", label: "Monster" },
    ],
  },
  comedy: {
    label: "Comedy",
    subgenres: [
      { id: "slice-of-life-comedy", label: "Slice of life comedy" },
      { id: "romcom", label: "Romantic comedy" },
      { id: "parody", label: "Parody / gag" },
    ],
  },
  fantasy: {
    label: "Fantasy",
    subgenres: [
      { id: "isekai", label: "Isekai" },
      { id: "high-fantasy", label: "High fantasy" },
      { id: "urban-fantasy", label: "Urban fantasy" },
      { id: "mythology", label: "Mythology" },
    ],
  },
  scifi: {
    label: "Sci-fi",
    subgenres: [
      { id: "cyberpunk", label: "Cyberpunk" },
      { id: "space-opera", label: "Space opera" },
      { id: "mecha", label: "Mecha" },
      { id: "time-travel", label: "Time travel" },
    ],
  },
  kids: {
    label: "Kids",
    subgenres: [
      { id: "bedtime", label: "Bedtime stories" },
      { id: "educational", label: "Educational" },
      { id: "picture-book", label: "Picture book" },
      { id: "funny-animals", label: "Funny animals" },
    ],
  },
};

const MAIN_GENRE_OPTIONS = Object.entries(GENRE_TREE).map(
  ([value, { label }]) => ({ value, label })
);

export default function Home() {
  const params = useParams();
  const router = useRouter();

  const rawLocale = (params?.locale as string) || "en";
  const locale: SupportedLocale = (["en", "mn", "ko", "ja"].includes(rawLocale)
    ? rawLocale
    : "en") as SupportedLocale;
  const t = UI_TEXT[locale];

  const [status, setStatus] = useState<Status>("loading");
  const [statusMessage, setStatusMessage] = useState("");

  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [loadingSeries, setLoadingSeries] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("manga");
  const [language, setLanguage] = useState("mn"); // default to Mongolian for you :)
  const [mainGenre, setMainGenre] = useState("action");
  const [subgenres, setSubgenres] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const fetchSeries = async () => {
    setLoadingSeries(true);

    const { data, error } = await supabase
      .from("series")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setStatus("error");
      setStatusMessage(error.message);
      setSeries([]);
    } else {
      setStatus("ok");
      if (!data || data.length === 0) {
        setStatusMessage("series table is empty (this is fine for now).");
      } else {
        setStatusMessage(`Loaded ${data.length} series from Supabase.`);
      }
      setSeries((data as SeriesRow[]) || []);
    }

    setLoadingSeries(false);
  };

  useEffect(() => {
    fetchSeries();
  }, []);

  const handleToggleSubgenre = (id: string) => {
    setSubgenres((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleTagKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const value = tagInput.trim();
      if (!value) return;
      if (!tags.includes(value)) {
        setTags((prev) => [...prev, value]);
      }
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setCreateError("Title is required.");
      return;
    }

    setCreating(true);
    setCreateError(null);

    const { error } = await supabase.from("series").insert([
      {
        title: title.trim(),
        description: description.trim() || null,
        project_type: projectType,
        language,
        main_genre: mainGenre,
        subgenres,
        tags,
      },
    ]);

    if (error) {
      setCreateError(error.message);
    } else {
      setTitle("");
      setDescription("");
      setProjectType("manga");
      setLanguage("mn");
      setMainGenre("action");
      setSubgenres([]);
      setTags([]);
      setTagInput("");
      await fetchSeries();
    }

    setCreating(false);
  };

  // Delete series (client-side)
  const handleDeleteSeries = async (id: string) => {
    const { error } = await supabase.from("series").delete().eq("id", id);

    if (error) {
      console.error("Delete series error:", error);
      alert("Failed to delete series: " + error.message);
      return;
    }

    setSeries((prev) => prev.filter((s) => s.id !== id));
  };

  // Current subgenre options based on selected main genre
  const currentSubgenreOptions = GENRE_TREE[mainGenre]?.subgenres ?? [];

  const changeLocale = (next: SupportedLocale) => {
    if (next === locale) return;
    router.push(`/${next}`);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-black via-slate-900 to-slate-800 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 px-6 py-16">
        {/* TOP BAR: LOCALE SWITCHER */}
        <div className="flex items-center justify-end gap-2 text-[11px] text-slate-400">
          {(["en", "mn", "ko", "ja"] as SupportedLocale[]).map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => changeLocale(code)}
              className={`px-2 py-0.5 rounded-full border ${
                locale === code
                  ? "border-emerald-400 text-emerald-200"
                  : "border-slate-700 hover:border-emerald-400 hover:text-emerald-200"
              }`}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>

        {/* HERO */}
        <header className="flex flex-col gap-4">
          <span className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-700 bg-black/40 px-3 py-1 text-xs font-medium text-slate-300">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            {t.chip}
          </span>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            {t.heroTitlePrefix}{" "}
            <span className="bg-gradient-to-r from-emerald-300 via-sky-300 to-purple-300 bg-clip-text text-transparent">
              {t.heroTitleHighlight}
            </span>
            .
          </h1>

          <p className="max-w-xl text-sm sm:text-base text-slate-300">
            {t.heroBody}
          </p>
        </header>

        {/* TOP GRID */}
        <section className="grid gap-5 md:grid-cols-3">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <h2 className="mb-1 text-sm font-semibold text-slate-100">
              {t.supabaseStatus}
            </h2>
            {status === "loading" && (
              <p className="text-xs text-slate-400">Checking connection…</p>
            )}
            {status === "ok" && (
              <p className="text-xs text-emerald-300">
                ✅ Connected to Supabase.
                <br />
                {statusMessage}
              </p>
            )}
            {status === "error" && (
              <p className="text-xs text-rose-300">
                ⚠️ Supabase error:
                <br />
                {statusMessage}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <h2 className="mb-1 text-sm font-semibold text-slate-100">
              {t.creatorDashboard}
            </h2>
            <p className="text-xs text-slate-400">{t.creatorBody}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
            <h2 className="mb-1 text-sm font-semibold text-slate-100">
              {t.readerActivity}
            </h2>
            <p className="text-xs text-slate-400">{t.readerBody}</p>
          </div>
        </section>

        {/* CREATE + LIST */}
        <section className="grid gap-8 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.3fr)]">
          {/* Create series form */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-100">
              {t.createTitle}
            </h2>
            <form className="flex flex-col gap-3" onSubmit={handleCreate}>
              {/* Title */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">
                  {t.fieldTitle}
                </label>
                <input
                  className="rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                  placeholder="e.g. Neon Sky Warriors"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">
                  {t.fieldDescription}
                </label>
                <textarea
                  className="h-24 rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                  placeholder="Short summary of your world, vibe or story..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              {/* Project type */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">
                  {t.fieldProjectType}
                </label>
                <select
                  className="rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                >
                  {PROJECT_TYPES.map((pt) => (
                    <option key={pt.value} value={pt.value}>
                      {pt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Language */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">
                  {t.fieldPrimaryLanguage}
                </label>
                <select
                  className="rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {LANGUAGE_OPTIONS.map((lng) => (
                    <option key={lng.value} value={lng.value}>
                      {lng.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Main genre */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">
                  {t.fieldMainGenre}
                </label>
                <select
                  className="rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                  value={mainGenre}
                  onChange={(e) => {
                    setMainGenre(e.target.value);
                    setSubgenres([]); // reset subs when main genre changes
                  }}
                >
                  {MAIN_GENRE_OPTIONS.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subgenres */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">
                  {t.fieldSubgenres}
                </label>
                {currentSubgenreOptions.length === 0 ? (
                  <p className="text-[11px] text-slate-500">
                    Choose a main genre first.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {currentSubgenreOptions.map((sg) => (
                      <label
                        key={sg.id}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-full border border-slate-700 bg-black/40 px-2 py-1 text-[11px] text-slate-200"
                      >
                        <input
                          type="checkbox"
                          className="h-3 w-3 accent-emerald-400"
                          checked={subgenres.includes(sg.id)}
                          onChange={() => handleToggleSubgenre(sg.id)}
                        />
                        <span>{sg.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Tags input */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-slate-300">
                  {t.fieldTags}
                </label>
                <input
                  className="rounded-xl border border-slate-700 bg-black/40 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-400"
                  placeholder={t.tagsPlaceholder}
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                />
                {tags.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-100"
                      >
                        {tag}
                        <button
                          type="button"
                          className="text-slate-400 hover:text-rose-300"
                          onClick={() => handleRemoveTag(tag)}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {createError && (
                <p className="text-xs text-rose-300">⚠️ {createError}</p>
              )}

              <button
                type="submit"
                disabled={creating}
                className="mt-1 inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-black shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {creating ? "Creating…" : t.createButton}
              </button>
            </form>
          </div>

          {/* Series list */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-100">
              {t.yourProjects}
            </h2>

            {loadingSeries && (
              <p className="text-xs text-slate-400">{t.loadingSeries}</p>
            )}

            {!loadingSeries && series.length === 0 && (
              <p className="text-xs text-slate-400">{t.noSeries}</p>
            )}

            {!loadingSeries && series.length > 0 && (
              <ul className="flex flex-col gap-3">
                {series.map((s) => (
                  <li
                    key={s.id}
                    className="rounded-xl border border-slate-800 bg-black/40 hover:border-emerald-400/70"
                  >
                    <div className="flex items-stretch justify-between">
                      {/* For now, send every series to the demo reader view */}
                      <Link
                        href={`/${locale}/reader/demo-series/1`}
                        className="flex-1 px-4 py-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold text-slate-50">
                            {s.title}
                          </h3>
                          <div className="flex flex-wrap items-center justify-end gap-2">
                            <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
                              {s.status || "draft"}
                            </span>
                            {s.project_type && (
                              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-400">
                                {s.project_type.replace("_", " ")}
                              </span>
                            )}
                            {s.language && (
                              <span className="rounded-full border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">
                                {s.language.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>
                        {s.main_genre && (
                          <p className="mt-1 text-[11px] text-slate-400">
                            Genre:{" "}
                            {GENRE_TREE[s.main_genre]?.label || s.main_genre}
                            {s.subgenres && s.subgenres.length > 0 && (
                              <>
                                {" · "}
                                {s.subgenres.slice(0, 3).join(", ")}
                                {s.subgenres.length > 3 && "…"}
                              </>
                            )}
                          </p>
                        )}
                        {s.tags && s.tags.length > 0 && (
                          <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
                            Tags: {s.tags.join(", ")}
                          </p>
                        )}
                        {s.description && (
                          <p className="mt-1 text-xs text-slate-300">
                            {s.description}
                          </p>
                        )}
                        <p className="mt-1 text-[10px] text-slate-500">
                          Created at:{" "}
                          {new Date(s.created_at).toLocaleString("en-GB", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </Link>

                      <button
                        onClick={async (e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          await handleDeleteSeries(s.id);
                        }}
                        className="m-3 h-fit rounded-lg border border-red-500 px-3 py-1 text-[11px] text-red-400 transition hover:bg-red-500 hover:text-white"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* AI Assistant Panel (future) */}
        <div className="mt-8">
          {/* <CoreAssistantPanel />  AI COMING LATER */}
        </div>
      </div>
    </main>
  );
}
