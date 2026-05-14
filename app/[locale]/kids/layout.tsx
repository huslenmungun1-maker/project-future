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

      {/* Ghost scroll container — transparent, drives the parallax via onScroll state */}
      <div
        onScroll={(e) => setScrollY((e.currentTarget as HTMLDivElement).scrollTop)}
        style={{ position: "absolute", inset: 0, overflowY: "scroll", zIndex: 1 }}
      >
        <div style={{ height: 700 }} />
      </div>

      {/* Content — pinned above ghost scroller */}
      <div style={{ position: "absolute", inset: 0, zIndex: 5, display: "flex", flexDirection: "column", justifyContent: "center", pointerEvents: "none" }}>
        <div
          style={{ pointerEvents: "auto", paddingBottom: "120px" }}
        >
          {children}
        </div>
      </div>

      <KidsNav locale={locale} night={night} onToggleNight={() => setNight(n => !n)} />
    </div>
  );
}
