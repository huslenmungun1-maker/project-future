"use client";
import { useState, useEffect, useRef } from "react";
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
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Start at home (bottom), space is above
  useEffect(() => {
    const el = contentRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  return (
    <div
      className={night ? "theme-kids-night" : "theme-kids"}
      style={{ height: "100vh", position: "relative", overflow: "hidden" }}
    >
      <SkyBackground night={night} scrollY={scrollY} />

      {/* Scrollable content — scroll UP reveals space, drives inverted parallax */}
      <div
        ref={contentRef}
        onScroll={(e) => {
          const el = e.currentTarget;
          const max = el.scrollHeight - el.clientHeight;
          setScrollY(max > 0 ? max - el.scrollTop : 0);
        }}
        style={{ position: "absolute", inset: 0, overflowY: "scroll", zIndex: 5 }}
      >
        {children}
      </div>

      <KidsNav locale={locale} night={night} onToggleNight={() => setNight(n => !n)} />
    </div>
  );
}
