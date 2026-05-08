import Link from "next/link";
import { supabaseServer } from "@/lib/supabaseServer";

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
    readButton: "Browse Reader",
    createButton: "Go to Studio",
    becomeCreatorTitle: "Publish on Enkhverse",
    becomeCreatorBody: "Apply to become a creator and share your work with readers worldwide.",
    becomeCreatorButton: "Apply now",
    featuredTitle: "Featured",
    newTitle: "New Releases",
    comingSoon: "Content is on its way. Check back soon.",
    footerEmail: "enkhverseglobal@gmail.com",
  },
  ko: {
    heroTitle: "당신의 창의성을 숨기지 마세요.",
    heroTitleAccent: "세상이 보게 하세요.",
    heroBody: "만화, 웹툰, 코믹스를 한 곳에서 읽고, 만들고, 출판하세요.",
    readButton: "리더 보기",
    createButton: "스튜디오 가기",
    becomeCreatorTitle: "Enkhverse에서 출판하기",
    becomeCreatorBody: "크리에이터 신청을 통해 전 세계 독자들에게 작품을 공유하세요.",
    becomeCreatorButton: "지금 신청",
    featuredTitle: "추천",
    newTitle: "신규 출시",
    comingSoon: "콘텐츠가 곧 추가됩니다.",
    footerEmail: "enkhverseglobal@gmail.com",
  },
  mn: {
    heroTitle: "Бүтээлч байдлаа бүү нуу.",
    heroTitleAccent: "Дэлхийд харуул.",
    heroBody: "Манга, вэбтун, комикс — нэг дороос уншиж, бүтээж, нийтлээрэй.",
    readButton: "Уншигч руу очих",
    createButton: "Студи руу очих",
    becomeCreatorTitle: "Enkhverse дээр нийтлэх",
    becomeCreatorBody: "Бүтээгч болохын тулд өргөдлөө гаргаж, дэлхийн уншигчидтай бүтээлээ хуваалцаарай.",
    becomeCreatorButton: "Өргөдөл гаргах",
    featuredTitle: "Онцлох",
    newTitle: "Шинэ гарсан",
    comingSoon: "Контент удахгүй нэмэгдэнэ.",
    footerEmail: "enkhverseglobal@gmail.com",
  },
  ja: {
    heroTitle: "あなたの創造性を隠さないで。",
    heroTitleAccent: "世界に見せよう。",
    heroBody: "マンガ、ウェブトゥーン、コミックを一つの場所で読み、作り、出版できます。",
    readButton: "リーダーへ",
    createButton: "スタジオへ",
    becomeCreatorTitle: "Enkhverseで出版する",
    becomeCreatorBody: "クリエイター申請をして、世界中の読者に作品を届けましょう。",
    becomeCreatorButton: "今すぐ申請",
    featuredTitle: "おすすめ",
    newTitle: "新着",
    comingSoon: "コンテンツは近日公開予定です。",
    footerEmail: "enkhverseglobal@gmail.com",
  },
} as const;

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

  return (
    <div className="min-h-screen theme-soft">
      <main className="mx-auto max-w-4xl px-6 py-8 md:px-10">

          {/* Hero */}
          <section
            className="relative mb-10 overflow-hidden rounded-[28px] p-8 md:p-12"
            style={{
              background: "linear-gradient(135deg, rgba(94,99,87,0.13) 0%, rgba(233,230,223,0.88) 60%, rgba(255,255,255,0.6) 100%)",
              border: "1px solid rgba(94,99,87,0.15)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <div className="max-w-xl space-y-5">
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
            </div>
          </section>

          {/* Featured section (placeholder) */}
          <section className="mb-10 space-y-4">
            <h2
              className="text-sm font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--muted)" }}
            >
              {t.featuredTitle}
            </h2>
            <div
              className="rounded-[24px] border px-6 py-10 text-center"
              style={{
                borderColor: "var(--border)",
                background: "rgba(233,230,223,0.55)",
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--muted)" }}>{t.comingSoon}</p>
              <Link
                href={`/${l}/reader`}
                className="mt-4 inline-block text-xs font-medium transition hover:opacity-70"
                style={{ color: "var(--accent)" }}
              >
                {t.readButton} →
              </Link>
            </div>
          </section>

          {/* New Releases section (placeholder) */}
          <section className="mb-10 space-y-4">
            <h2
              className="text-sm font-semibold uppercase tracking-[0.18em]"
              style={{ color: "var(--muted)" }}
            >
              {t.newTitle}
            </h2>
            <div
              className="rounded-[24px] border px-6 py-10 text-center"
              style={{
                borderColor: "var(--border)",
                background: "rgba(233,230,223,0.55)",
                boxShadow: "var(--shadow-soft)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--muted)" }}>{t.comingSoon}</p>
            </div>
          </section>

          {/* Become a Creator CTA — readers only */}
          {!isCreator && <section
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
          </section>}

          <footer className="mt-16 text-center text-sm" style={{ color: "var(--muted)" }}>
            <a href={`mailto:${t.footerEmail}`} className="hover:underline">
              {t.footerEmail}
            </a>
          </footer>
      </main>
    </div>
  );
}
