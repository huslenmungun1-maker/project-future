"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import SkyBackground from "@/components/kids/SkyBackground";
import KidsNav from "@/components/kids/KidsNav";
import { use } from "react";

// DOM order in kids/page.tsx: [Page2][Home]
// pageIndex 0 = Page2 (top), 1 = Home (start)
const TOTAL_PAGES = 2;

export default function KidsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  const pathname = usePathname();
  const [night, setNight] = useState(false);
  const [pageIndex, setPageIndex] = useState(TOTAL_PAGES - 1); // start at Home
  const animating = useRef(false);

  // Only apply page-slide on the kids home page
  const isHomePage = /\/kids\/?$/.test(pathname ?? "");

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Reset to home when navigating to the home page
  useEffect(() => {
    if (isHomePage) setPageIndex(TOTAL_PAGES - 1);
  }, [isHomePage]);

  const changePage = (dir: -1 | 1) => {
    if (!isHomePage || animating.current) return;
    setPageIndex(prev => {
      const next = prev + dir;
      if (next < 0 || next >= TOTAL_PAGES) return prev;
      animating.current = true;
      setTimeout(() => { animating.current = false; }, 650);
      return next;
    });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) changePage(-1); // scroll up → reveal page above (slides down)
    else               changePage(+1); // scroll down → go back
  };

  // translateY: Home(idx 2)=-200vh, Space(idx 1)=-100vh, Page2(idx 0)=0
  const translateY = isHomePage ? -(pageIndex * 100) : 0;

  // Parallax: Home (idx 1) → sky (0), Page2 (idx 0) → space (300 = SPACE_AT)
  const parallaxScrollY = isHomePage && pageIndex === 0 ? 300 : 0;

  return (
    <div
      className={night ? "theme-kids-night" : "theme-kids"}
      style={{ height: "100vh", position: "relative", overflow: "hidden" }}
      onWheel={handleWheel}
    >
      <SkyBackground night={night} scrollY={parallaxScrollY} />

      {/* Page content — slides via translateY driven by pageIndex */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          transform: `translateY(${translateY}vh)`,
          transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          zIndex: 5,
        }}
      >
        {children}
      </div>

      <KidsNav locale={locale} night={night} onToggleNight={() => setNight(n => !n)} />
    </div>
  );
}
