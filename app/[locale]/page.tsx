import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";
import HomeSearch from "@/components/HomeSearch";

type Params = { locale: string };
type SupportedLocale = "en" | "ko" | "mn" | "ja";

function normalizeLocale(raw: string): SupportedLocale {
  return (["en", "ko", "mn", "ja"].includes(raw) ? raw : "en") as SupportedLocale;
}

const UI_TEXT = {
  en: {
    heroTitle: "Don't hide your creativity.",
    heroTitleAccent: "Let the world see it.",
    heroBody: "Read, create, and publish manga, webtoons, and comics — all in one place.",
    readButton: "Browse Library",
    createButton: "Go to Studio",
    becomeCreatorTitle: "Publish on Enkhverse",
    becomeCreatorBody: "Apply to become a creator and share your work with readers worldwide.",
    becomeCreatorButton: "Apply now",
    featuredTitle: "Featured Series",
    newTitle: "Latest Books",
    browseAll: "Browse all",
    footerEmail: "enkhverseglobal@gmail.com",
    startReading: "Read",
    noContent: "Content coming soon",
  },
  ko: {
    heroTitle: "당신의 창의성을 숨기지 마세요.",
    heroTitleAccent: "세상이 보게 하세요.",
    heroBody: "만화, 웹툰, 코믹스를 한 곳에서 읽고, 만들고, 출판하세요.",
    readButton: "라이브러리 보기",
    createButton: "스튜디오 가기",
    becomeCreatorTitle: "Enkhverse에서 출판하기",
    becomeCreatorBody: "크리에이터 신청을 통해 전 세계 독자들에게 작품을 공유하세요.",
    becomeCreatorButton: "지금 신청",
    featuredTitle: "추천 시리즈",
    newTitle: "최신 도서",
    browseAll: "전체 보기",
    footerEmail: "enkhverseglobal@gmail.com",
    startReading: "읽기",
    noContent: "콘텐츠 준비 중",
  },
  mn: {
    heroTitle: "Бүтээлч байдлаа бүү нуу.",
    heroTitleAccent: "Дэлхийд харуул.",
    heroBody: "Манга, вэбтун, комикс — нэг дороос уншиж, бүтээж, нийтлээрэй.",
    readButton: "Номын сан",
    createButton: "Студи руу очих",
    becomeCreatorTitle: "Enkhverse дээр нийтлэх",
    becomeCreatorBody: "Бүтээгч болохын тулд өргөдлөө гаргаж, дэлхийн уншигчидтай бүтээлээ хуваалцаарай.",
    becomeCreatorButton: "Өргөдөл гаргах",
    featuredTitle: "Онцлох цувралууд",
    newTitle: "Шинэ номууд",
    browseAll: "Бүгдийг үзэх",
    footerEmail: "enkhverseglobal@gmail.com",
    startReading: "Унших",
    noContent: "Контент удахгүй нэмэгдэнэ",
  },
  ja: {
    heroTitle: "あなたの創造性を隠さないで。",
    heroTitleAccent: "世界に見せよう。",
    heroBody: "マンガ、ウェブトゥーン、コミックを一つの場所で読み、作り、出版できます。",
    readButton: "ライブラリへ",
    createButton: "スタジオへ",
    becomeCreatorTitle: "Enkhverseで出版する",
    becomeCreatorBody: "クリエイター申請をして、世界中の読者に作品を届けましょう。",
    becomeCreatorButton: "今すぐ申請",
    featuredTitle: "おすすめシリーズ",
    newTitle: "最新書籍",
    browseAll: "すべて見る",
    footerEmail: "enkhverseglobal@gmail.com",
    startReading: "読む",
    noContent: "コンテンツは近日公開予定",
  },
} as const;

type SeriesCard = {
  id: string;
  title: string;
  cover_image_url: string | null;
  language: string | null;
  project_type: string | null;
};

type BookCard = {
  id: string;
  title: string;
  cover_url: string | null;
};

export default async function LocaleHomePage({
  params,
}: {
  params: Params | Promise<Params>;
}) {
  const { locale } = await Promise.resolve(params);
  const l = normalizeLocale(locale);
  const t = UI_TEXT[l];

  const supabase = await supabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  let isCreator = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle();
    const r = profile?.role;
    isCreator = r === "creator" || r === "owner";
  }

  const [{ data: featuredSeries }, { data: latestBooks }] = await Promise.all([
    supabase
      .from("series")
      .select("id, title, cover_image_url, language, project_type")
      .or("published.eq.true,published_at.not.is.null")
      .order("views", { ascending: false })
      .limit(4),
    supabase
      .from("books")
      .select("id, title, cover_url")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(4),
  ]);

  const series = (featuredSeries as SeriesCard[] | null) ?? [];
  const books = (latestBooks as BookCard[] | null) ?? [];

  return (
    <div className="min-h-screen theme-soft">
      <main className="mx-auto max-w-4xl px-6 py-8 md:px-10">

        {/* Hero */}
        <section
          className="relative mb-10 overflow-hidden rounded-[28px] p-8 md:p-12"
          style={{
            background: "linear-gradient(135deg, rgba(94,99,87,0.13) 0%, rgba(233,230,223,0.92) 55%, rgba(255,255,255,0.65) 100%)",
            border: "1px solid rgba(94,99,87,0.15)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          {/* Decorative glow */}
          <div
            className="pointer-events-none absolute right-0 top-0 h-80 w-80 opacity-25"
            style={{
              background: "radial-gradient(circle, rgba(94,99,87,0.45) 0%, transparent 70%)",
              transform: "translate(35%, -35%)",
            }}
          />
          {/* Decorative dots */}
          <div
            className="pointer-events-none absolute bottom-4 right-8 hidden md:block"
            style={{ opacity: 0.12 }}
          >
            {[0,1,2,3].map(row => (
              <div key={row} style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                {[0,1,2,3,4].map(col => (
                  <div key={col} style={{ width: 3, height: 3, borderRadius: "50%", background: "var(--accent)" }} />
                ))}
              </div>
            ))}
          </div>

          <div className="relative max-w-xl space-y-5">
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium"
              style={{ borderColor: "rgba(94,99,87,0.25)", background: "rgba(255,255,255,0.6)", color: "var(--muted)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--accent)" }} />
              Enkhverse
            </div>
            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl" style={{ color: "var(--text)" }}>
              {t.heroTitle}{" "}
              <span style={{ color: "var(--accent)" }}>{t.heroTitleAccent}</span>
            </h1>
            <p className="text-base leading-7" style={{ color: "var(--muted)" }}>
              {t.heroBody}
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href={`/${l}/reader`} className="btn-ios text-sm">
                {t.readButton}
              </Link>
              <Link href={`/${l}/studio`} className="btn-ios-secondary text-sm">
                {t.createButton}
              </Link>
            </div>
            <HomeSearch />
          </div>
        </section>

        {/* Featured Series */}
        <section className="mb-10 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2
              className="text-sm font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--muted)" }}
            >
              {t.featuredTitle}
            </h2>
            <Link
              href={`/${l}/reader`}
              className="text-xs font-medium transition hover:opacity-70"
              style={{ color: "var(--accent)" }}
            >
              {t.browseAll} →
            </Link>
          </div>

          {series.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {series.map(s => (
                <Link key={s.id} href={`/${l}/reader/series/${s.id}`} className="group">
                  <div
                    className="relative overflow-hidden rounded-[20px] border transition duration-300 group-hover:-translate-y-1"
                    style={{
                      aspectRatio: "2/3",
                      borderColor: "var(--border)",
                      background: "linear-gradient(145deg, rgba(233,230,223,0.94), rgba(217,212,204,0.88))",
                      boxShadow: "var(--shadow-soft)",
                    }}
                  >
                    {s.cover_image_url ? (
                      <>
                        <img
                          src={s.cover_image_url}
                          alt={s.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                        <span className="text-sm font-semibold leading-tight" style={{ color: "var(--text)" }}>{s.title}</span>
                      </div>
                    )}
                    {s.project_type && (
                      <div className="absolute bottom-2 left-2">
                        <span
                          className="rounded-full px-2 py-0.5 text-[9px] font-semibold capitalize"
                          style={{ background: "rgba(0,0,0,0.5)", color: "#fff", backdropFilter: "blur(4px)" }}
                        >
                          {s.project_type}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-1 text-[12px] font-semibold" style={{ color: "var(--text)" }}>
                    {s.title}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div
              className="rounded-[20px] border px-6 py-8 text-center"
              style={{ borderColor: "var(--border)", background: "rgba(233,230,223,0.55)", boxShadow: "var(--shadow-soft)" }}
            >
              <p className="text-sm" style={{ color: "var(--muted)" }}>{t.noContent}</p>
            </div>
          )}
        </section>

        {/* Latest Books */}
        {books.length > 0 && (
          <section className="mb-10 space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h2
                className="text-sm font-semibold uppercase tracking-[0.18em]"
                style={{ color: "var(--muted)" }}
              >
                {t.newTitle}
              </h2>
              <Link
                href={`/${l}/reader`}
                className="text-xs font-medium transition hover:opacity-70"
                style={{ color: "var(--accent)" }}
              >
                {t.browseAll} →
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {books.map(b => (
                <Link key={b.id} href={`/${l}/reader/${b.id}/1`} className="group">
                  <div
                    className="relative overflow-hidden rounded-[20px] border transition duration-300 group-hover:-translate-y-1"
                    style={{
                      aspectRatio: "2/3",
                      borderColor: "var(--border)",
                      background: "linear-gradient(145deg, rgba(233,230,223,0.94), rgba(217,212,204,0.88))",
                      boxShadow: "var(--shadow-soft)",
                    }}
                  >
                    {b.cover_url ? (
                      <>
                        <img
                          src={b.cover_url}
                          alt={b.title}
                          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                      </>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center p-4 text-center">
                        <span className="text-sm font-semibold leading-tight" style={{ color: "var(--text)" }}>{b.title}</span>
                      </div>
                    )}
                  </div>
                  <p className="mt-2 line-clamp-1 text-[12px] font-semibold" style={{ color: "var(--text)" }}>
                    {b.title}
                  </p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Become a Creator CTA — readers only */}
        {!isCreator && (
          <section
            className="flex flex-col gap-5 rounded-[24px] p-7 sm:flex-row sm:items-center sm:justify-between"
            style={{
              background: "linear-gradient(135deg, rgba(94,99,87,0.12), rgba(233,230,223,0.82))",
              border: "1px solid rgba(94,99,87,0.18)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <div className="space-y-2">
              <div
                className="inline-flex rounded-full px-3 py-1 text-xs font-medium"
                style={{ background: "var(--accent)", color: "#f8f7f3" }}
              >
                Creators
              </div>
              <h2 className="text-lg font-semibold tracking-tight" style={{ color: "var(--text)" }}>
                {t.becomeCreatorTitle}
              </h2>
              <p className="max-w-md text-sm leading-6" style={{ color: "var(--muted)" }}>
                {t.becomeCreatorBody}
              </p>
            </div>
            <div className="shrink-0">
              <Link href={`/${l}/creator/apply`} className="btn-ios text-sm">
                {t.becomeCreatorButton}
              </Link>
            </div>
          </section>
        )}

        <footer className="mt-16 text-center text-sm" style={{ color: "var(--muted)" }}>
          <a href={`mailto:${t.footerEmail}`} className="hover:underline">
            {t.footerEmail}
          </a>
        </footer>
      </main>
    </div>
  );
}
