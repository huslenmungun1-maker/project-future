"use client";
import { useState, useEffect } from "react";
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
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className={night ? "theme-kids-night" : "theme-kids"}
      style={{ height: "100vh", position: "relative", overflow: "hidden" }}
    >
      <SkyBackground night={night} scrollY={scrollY} />

      {/* Scrollable content — drives both page and parallax */}
      <div
        onScroll={(e) => setScrollY(e.currentTarget.scrollTop)}
        style={{ position: "absolute", inset: 0, overflowY: "scroll", zIndex: 5 }}
      >
        {children}
      </div>

      <KidsNav locale={locale} night={night} onToggleNight={() => setNight(n => !n)} />
    </div>
  );
}
