"use client";
import { useState } from "react";
import SkyBackground from "@/components/kids/SkyBackground";
import KidsNav from "@/components/kids/KidsNav";
import { use } from "react";

export default function KidsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const [night, setNight] = useState(false);

  return (
    <div className={night ? "theme-kids-night" : "theme-kids"} style={{ minHeight: "100vh", position: "relative" }}>
      <SkyBackground night={night} />
      <div style={{ position: "relative", zIndex: 1, paddingBottom: 100 }}>
        {children}
      </div>
      <KidsNav locale={locale} night={night} onToggleNight={() => setNight(n => !n)} />
    </div>
  );
}
