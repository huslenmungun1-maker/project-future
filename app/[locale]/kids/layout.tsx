"use client";
import { useState, useRef, useEffect } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className={night ? "theme-kids-night" : "theme-kids"}
      style={{ height: "100vh", position: "relative", overflow: "hidden" }}
    >
      <SkyBackground night={night} scrollEl={scrollRef} />

      {/* Ghost scroll container — transparent, drives the parallax */}
      <div
        ref={scrollRef}
        style={{ position: "absolute", inset: 0, overflowY: "scroll", zIndex: 1 }}
      >
        <div style={{ height: 700 }} />
      </div>

      {/* Content — pinned above ghost scroller, wheel events forwarded so parallax still triggers */}
      <div style={{ position: "absolute", inset: 0, zIndex: 5, display: "flex", flexDirection: "column", justifyContent: "flex-end", pointerEvents: "none" }}>
        <div
          style={{ pointerEvents: "auto" }}
          onWheel={(e) => { scrollRef.current?.scrollBy({ top: e.deltaY }); }}
        >
          {children}
        </div>
      </div>

      <KidsNav locale={locale} night={night} onToggleNight={() => setNight(n => !n)} />
    </div>
  );
}
