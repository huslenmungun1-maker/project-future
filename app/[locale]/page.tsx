import Link from "next/link";

type Params = { locale: string };

type SupportedLocale = "en" | "ko" | "mn" | "ja";

function normalizeLocale(raw: string): SupportedLocale {
  return (["en", "ko", "mn", "ja"].includes(raw) ? raw : "en") as SupportedLocale;
}

const UI_TEXT = {
  en: {
    chip: "Enkhverse · Soft Editorial Build",
    heroTitle: "Don’t hide your creativity. Let the world see it.",
    heroBody:
      "Read, create, and manage manga / comics in one place. This is the early build — functional first, elegant later.",
    readChip: "Read",
    readTitle: "Reader",
    readBody: "Browse public series and start reading. No login required for now.",
    readButton: "Go to Reader",
    createChip: "Create",
    createTitle: "Publisher Studio",
    createBody:
      "Create series, upload chapters, and manage your projects in one place.",
    createButton: "Go to Publisher",
    ownerChip: "Owner",
    ownerTitle: "Head Page",
    ownerBody: "Owner-only dashboard for stats, revenue, and system controls.",
    ownerButton: "Go to Head Page",
    moreTitle: "More (future pages)",
    moreChip: "Early navigation",
    profile: "Profile",
    chat: "Chat (Core Assistant)",
    ai: "AI Tools",
    payments: "Payments",
    login: "Login (for owner / creators)",
    becomeCreatorChip: "Creators",
    becomeCreatorTitle: "Want to publish on Enkhverse?",
    becomeCreatorBody: "Apply to become a creator and share your manga, webtoons, or illustrations with readers worldwide.",
    becomeCreatorButton: "Become a creator",
    footerNote:
      "If some links give 404 now, that's fine. We'll build them one by one.",
  },
  ko: {
    chip: "Enkhverse · 소프트 에디토리얼 빌드",
    heroTitle: "당신의 창의성을 숨기지 마세요. 세상이 보게 하세요.",
    heroBody:
      "한 곳에서 만화 / 코믹스를 읽고, 만들고, 관리하세요. 지금은 초기 빌드이며 먼저 작동하고, 나중에 더 우아해집니다.",
    readChip: "읽기",
    readTitle: "리더",
    readBody: "공개된 시리즈를 둘러보고 바로 읽기 시작하세요. 지금은 로그인 없이도 됩니다.",
    readButton: "리더로 가기",
    createChip: "제작",
    createTitle: "퍼블리셔 스튜디오",
    createBody:
      "시리즈를 만들고, 챕터를 업로드하고, 프로젝트를 한 곳에서 관리하세요.",
    createButton: "퍼블리셔로 가기",
    ownerChip: "오너",
    ownerTitle: "헤드 페이지",
    ownerBody: "통계, 수익, 시스템 제어를 위한 오너 전용 대시보드입니다.",
    ownerButton: "헤드 페이지로 가기",
    moreTitle: "더 보기 (예정된 페이지)",
    moreChip: "초기 내비게이션",
    profile: "프로필",
    chat: "채팅 (코어 어시스턴트)",
    ai: "AI 도구",
    payments: "결제",
    login: "로그인 (오너 / 크리에이터용)",
    becomeCreatorChip: "크리에이터",
    becomeCreatorTitle: "Enkhverse에 작품을 올리고 싶으신가요?",
    becomeCreatorBody: "크리에이터 신청을 하고 전 세계 독자들에게 만화, 웹툰, 일러스트를 공유하세요.",
    becomeCreatorButton: "크리에이터 되기",
    footerNote:
      "일부 링크가 지금 404여도 괜찮습니다. 하나씩 만들어 갈게요.",
  },
  mn: {
    chip: "Enkhverse · Зөөлөн редакцийн хувилбар",
    heroTitle: "Бүтээлч байдлаа бүү нуу. Дэлхийд харуул.",
    heroBody:
      "Манга / комиксыг нэг дороос уншиж, бүтээж, удирдаарай. Энэ бол эхний хувилбар — эхлээд ажиллагаа, дараа нь илүү гоёмсог болно.",
    readChip: "Унших",
    readTitle: "Уншигч",
    readBody: "Нийтийн цувралуудыг үзээд шууд уншиж эхлээрэй. Одоохондоо нэвтрэх шаардлагагүй.",
    readButton: "Уншигч руу очих",
    createChip: "Бүтээх",
    createTitle: "Нийтлэгч студи",
    createBody:
      "Цуврал үүсгэж, бүлэг оруулж, төслүүдээ нэг дороос удирдаарай.",
    createButton: "Нийтлэгч рүү очих",
    ownerChip: "Эзэмшигч",
    ownerTitle: "Удирдлагын хуудас",
    ownerBody: "Статистик, орлого, системийн удирдлагад зориулсан эзэмшигчийн самбар.",
    ownerButton: "Удирдлагын хуудас руу очих",
    moreTitle: "Бусад (ирээдүйн хуудсууд)",
    moreChip: "Эрт навигаци",
    profile: "Профайл",
    chat: "Чат (Үндсэн туслах)",
    ai: "AI хэрэгслүүд",
    payments: "Төлбөр",
    login: "Нэвтрэх (эзэмшигч / бүтээгч)",
    becomeCreatorChip: "Бүтээгчид",
    becomeCreatorTitle: "Enkhverse дээр бүтээлээ нийтлэхийг хүсч байна уу?",
    becomeCreatorBody: "Бүтээгч болохын тулд өргөдлөө гаргаж, манга, вэбтун эсвэл зурагт бүтээлүүдээ дэлхийн уншигчидтай хуваалцаарай.",
    becomeCreatorButton: "Бүтээгч болох",
    footerNote:
      "Зарим холбоос одоохондоо 404 өгч байвал зүгээр. Бид нэг нэгээр нь бүтээнэ.",
  },
  ja: {
    chip: "Enkhverse · ソフトエディトリアルビルド",
    heroTitle: "あなたの創造性を隠さないで。世界に見せよう。",
    heroBody:
      "マンガ / コミックを一つの場所で読み、作り、管理できます。これは初期ビルドで、まずは機能、洗練はその後です。",
    readChip: "読む",
    readTitle: "リーダー",
    readBody: "公開されたシリーズを見て、すぐに読み始めましょう。今のところログインは不要です。",
    readButton: "リーダーへ",
    createChip: "制作",
    createTitle: "パブリッシャースタジオ",
    createBody:
      "シリーズを作成し、チャプターをアップロードし、プロジェクトを一か所で管理します。",
    createButton: "パブリッシャーへ",
    ownerChip: "オーナー",
    ownerTitle: "ヘッドページ",
    ownerBody: "統計、収益、システム管理のためのオーナー専用ダッシュボードです。",
    ownerButton: "ヘッドページへ",
    moreTitle: "その他（今後のページ）",
    moreChip: "初期ナビゲーション",
    profile: "プロフィール",
    chat: "チャット（コアアシスタント）",
    ai: "AIツール",
    payments: "支払い",
    login: "ログイン（オーナー / クリエイター用）",
    becomeCreatorChip: "クリエイター",
    becomeCreatorTitle: "Enkhverseで作品を公開しませんか？",
    becomeCreatorBody: "クリエイター申請をして、マンガ、ウェブトゥーン、イラストを世界中の読者と共有しましょう。",
    becomeCreatorButton: "クリエイターになる",
    footerNote:
      "一部のリンクが今は404でも大丈夫です。これから一つずつ作っていきます。",
  },
} as const;

export default async function LocaleHomePage({
  params,
}: {
  params: Params | Promise<Params>;
}) {
  const { locale } = await Promise.resolve(params);
  const currentLocale = normalizeLocale(locale);
  const t = UI_TEXT[currentLocale];

  return (
    <div className="min-h-screen theme-soft">
      <main className="mx-auto w-full max-w-5xl px-6 py-12 md:px-8 md:py-16">
        <section className="mb-10 space-y-4">
          <div
            className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide text-stone-700"
            style={{
              borderColor: "rgba(47,47,47,0.12)",
              background: "rgba(233,230,223,0.72)",
            }}
          >
            {t.chip}
          </div>

          <div className="space-y-3">
            <h1 className="max-w-4xl text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              {t.heroTitle}
            </h1>

            <p
              className="max-w-3xl text-base leading-7"
              style={{ color: "var(--muted)" }}
            >
              {t.heroBody}
            </p>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-3">
          <div className="soft-card flex min-h-[240px] flex-col justify-between p-6">
            <div className="space-y-3">
              <div
                className="inline-flex rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  background: "rgba(233,230,223,0.9)",
                  border: "1px solid rgba(47,47,47,0.12)",
                }}
              >
                {t.readChip}
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">{t.readTitle}</h2>
                <p className="text-sm leading-6" style={{ color: "var(--muted)" }}>
                  {t.readBody}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href={`/${currentLocale}/reader`}
                className="btn-ios-secondary w-full"
              >
                {t.readButton}
              </Link>
            </div>
          </div>

          <div className="soft-card flex min-h-[240px] flex-col justify-between p-6">
            <div className="space-y-3">
              <div
                className="inline-flex rounded-full px-3 py-1 text-xs font-medium text-white"
                style={{
                  background: "var(--accent)",
                  border: "1px solid rgba(47,47,47,0.08)",
                }}
              >
                {t.createChip}
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">
                  {t.createTitle}
                </h2>
                <p className="text-sm leading-6" style={{ color: "var(--muted)" }}>
                  {t.createBody}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href={`/${currentLocale}/publisher`}
                className="btn-ios w-full"
              >
                {t.createButton}
              </Link>
            </div>
          </div>

          <div className="soft-card flex min-h-[240px] flex-col justify-between p-6">
            <div className="space-y-3">
              <div
                className="inline-flex rounded-full px-3 py-1 text-xs font-medium"
                style={{
                  background: "rgba(233,230,223,0.9)",
                  border: "1px solid rgba(47,47,47,0.12)",
                }}
              >
                {t.ownerChip}
              </div>

              <div className="space-y-2">
                <h2 className="text-2xl font-semibold tracking-tight">{t.ownerTitle}</h2>
                <p className="text-sm leading-6" style={{ color: "var(--muted)" }}>
                  {t.ownerBody}
                </p>
              </div>
            </div>

            <div className="mt-6">
              <Link
                href={`/${currentLocale}/head`}
                className="btn-ios-secondary w-full"
              >
                {t.ownerButton}
              </Link>
            </div>
          </div>
        </section>

        <section
          className="mt-8 flex flex-col gap-4 rounded-[24px] p-6 sm:flex-row sm:items-center sm:justify-between"
          style={{
            background: "linear-gradient(135deg, rgba(94,99,87,0.10), rgba(233,230,223,0.80))",
            border: "1px solid rgba(94,99,87,0.18)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <div className="space-y-2">
            <div
              className="inline-flex rounded-full px-3 py-1 text-xs font-medium"
              style={{
                background: "var(--accent)",
                color: "#f8f7f3",
              }}
            >
              {t.becomeCreatorChip}
            </div>
            <h2 className="text-lg font-semibold tracking-tight">{t.becomeCreatorTitle}</h2>
            <p className="max-w-md text-sm leading-6" style={{ color: "var(--muted)" }}>
              {t.becomeCreatorBody}
            </p>
          </div>

          <div className="shrink-0">
            <Link
              href={`/${currentLocale}/creator/apply`}
              className="btn-ios text-sm"
            >
              {t.becomeCreatorButton}
            </Link>
          </div>
        </section>

        <section className="soft-card mt-8 p-6">
          <div className="mb-4 flex items-center justify-between gap-4">
            <h3 className="text-lg font-semibold tracking-tight">
              {t.moreTitle}
            </h3>

            <div
              className="rounded-full px-3 py-1 text-xs font-medium"
              style={{
                background: "rgba(233,230,223,0.9)",
                border: "1px solid rgba(47,47,47,0.12)",
              }}
            >
              {t.moreChip}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {[
              { href: `/${currentLocale}/profile`, label: t.profile },
              { href: `/${currentLocale}/chat`, label: t.chat },
              { href: `/${currentLocale}/ai`, label: t.ai },
              { href: `/${currentLocale}/payments`, label: t.payments },
              { href: `/${currentLocale}/login`, label: t.login },
            ].map((x) => (
              <Link
                key={x.href}
                href={x.href}
                className="rounded-2xl border px-4 py-3 text-sm transition hover:opacity-90"
                style={{
                  borderColor: "rgba(47,47,47,0.12)",
                  background: "rgba(255,255,255,0.28)",
                  color: "var(--text)",
                }}
              >
                {x.label}
              </Link>
            ))}
          </div>

          <p className="mt-4 text-[11px]" style={{ color: "var(--muted)" }}>
            {t.footerNote}
          </p>
        </section>

        <footer className="mt-16 text-center text-sm text-stone-600">
          <a
            href="mailto:enkhverseglobal@gmail.com"
            className="hover:underline"
          >
            enkhverseglobal@gmail.com
          </a>
        </footer>
      </main>
    </div>
  );
}