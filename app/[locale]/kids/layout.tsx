"use client";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import SkyBackground from "@/components/kids/SkyBackground";
import KidsNav from "@/components/kids/KidsNav";
import { use } from "react";

// Height of the invisible "space zone" above the content.
// Page loads scrolled to this position (sky shown).
// Scrolling UP into [0, SPACE_ZONE] reveals the galaxy.
const SPACE_ZONE = 400;

export default function KidsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const [night, setNight] = useState(false);
  const pathname = usePathname();

  // Every time the route changes within /kids/*, snap back to sky position
  // (double-RAF ensures Next.js scroll restoration fires first)
  useEffect(() => {
    let r1: number, r2: number;
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => {
        window.scrollTo({ top: SPACE_ZONE, behavior: "instant" });
      });
    });
    return () => { cancelAnimationFrame(r1); cancelAnimationFrame(r2); };
  }, [pathname]);

  return (
    <div
      className={night ? "theme-kids-night" : "theme-kids"}
      style={{ minHeight: "100vh", position: "relative" }}
    >
      <SkyBackground night={night} spaceZone={SPACE_ZONE} />

      {/* Invisible space zone — scrolling into this reveals the galaxy */}
      <div style={{ height: SPACE_ZONE, pointerEvents: "none" }} />

      {/* Page content — starts at SPACE_ZONE offset */}
      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", paddingBottom: 100 }}>
        {children}
      </div>

      <KidsNav locale={locale} night={night} onToggleNight={() => setNight(n => !n)} />
    </div>
  );
}
