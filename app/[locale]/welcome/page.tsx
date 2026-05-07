"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

const UI_TEXT = {
  en: {
    title: "Welcome to Enkhverse",
    subtitle: "Your account is confirmed and ready.",
    body: "You're all set. Explore published stories, apply to become a creator, or head to your profile.",
    reader: "Browse Reader",
    profile: "Go to Profile",
    apply: "Become a Creator",
  },
  ko: {
    title: "Enkhverse에 오신 것을 환영합니다",
    subtitle: "계정이 확인되었습니다.",
    body: "준비가 완료되었습니다. 게시된 이야기를 탐색하거나, 크리에이터 신청을 하거나, 프로필로 이동하세요.",
    reader: "리더 보기",
    profile: "프로필로 이동",
    apply: "크리에이터 되기",
  },
  mn: {
    title: "Enkhverse-д тавтай морил",
    subtitle: "Таны бүртгэл баталгаажлаа.",
    body: "Бэлэн боллоо. Нийтлэгдсэн үлгэрүүдийг үзэж болно, бүтээгч болохын тулд өргөдөл гаргаж болно, эсвэл профайл руугаа очно уу.",
    reader: "Уншигч руу очих",
    profile: "Профайл руу очих",
    apply: "Бүтээгч болох",
  },
  ja: {
    title: "Enkhverseへようこそ",
    subtitle: "アカウントが確認されました。",
    body: "準備完了です。公開されたストーリーを閲覧したり、クリエイターに申請したり、プロフィールに移動しましょう。",
    reader: "リーダーを見る",
    profile: "プロフィールへ",
    apply: "クリエイターになる",
  },
} as const;

type SupportedLocale = keyof typeof UI_TEXT;

function safeLocale(raw: unknown): SupportedLocale {
  return (["en", "ko", "mn", "ja"].includes(raw as string) ? raw : "en") as SupportedLocale;
}

export default function WelcomePage() {
  const params = useParams();
  const router = useRouter();
  const locale = safeLocale(params?.locale);
  const t = UI_TEXT[locale];
  const supabase = useMemo(() => createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!), []);

  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user?.email) {
        setEmail(data.session.user.email);
      }
    });
  }, [supabase]);

  return (
    <main className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm space-y-6 text-center">
        {/* Icon */}
        <div
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-full text-4xl"
          style={{
            background: "linear-gradient(145deg, rgba(94,99,87,0.15), rgba(233,230,223,0.9))",
            border: "1px solid rgba(94,99,87,0.2)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          ✓
        </div>

        {/* Card */}
        <div
          className="rounded-[28px] p-8 space-y-4"
          style={{
            background: "rgba(255,255,255,0.6)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-soft)",
            backdropFilter: "blur(12px)",
          }}
        >
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text)" }}>
              {t.title}
            </h1>
            <p className="text-sm font-medium" style={{ color: "var(--accent)" }}>
              {t.subtitle}
            </p>
            {email && (
              <p className="text-xs" style={{ color: "var(--muted)" }}>
                {email}
              </p>
            )}
          </div>

          <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>
            {t.body}
          </p>

          <div className="space-y-2 pt-2">
            <Link href={`/${locale}/profile`} className="btn-ios w-full text-sm">
              {t.profile}
            </Link>
            <Link href={`/${locale}/reader`} className="btn-ios-secondary w-full text-sm">
              {t.reader}
            </Link>
            <Link
              href={`/${locale}/creator/apply`}
              className="block text-xs transition hover:opacity-70"
              style={{ color: "var(--muted)" }}
            >
              {t.apply} →
            </Link>
          </div>
        </div>

        <Link
          href={`/${locale}`}
          className="inline-block text-xs transition hover:opacity-70"
          style={{ color: "var(--muted)" }}
        >
          ← Home
        </Link>
      </div>
    </main>
  );
}
