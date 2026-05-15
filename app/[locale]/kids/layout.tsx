"use client";
import { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import SkyBackground from "@/components/kids/SkyBackground";
import KidsNav from "@/components/kids/KidsNav";
import { use } from "react";

// DOM order in kids/page.tsx: [Page4][Page3][Page2][Home]
// pageIndex 0 = Page4 (top), 1 = Page3, 2 = Page2, 3 = Home (start)
const TOTAL_PAGES = 4;

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

  // translateY: Home(idx 1)=-100vh, Page2(idx 0)=0
  const translateY = isHomePage ? -(pageIndex * 100) : 0;

  // Sky slides down WITH Page 1 when Page 2, 3, or 4 is revealed, or on setup page
  const isSetupPage = /\/kids\/setup/.test(pathname ?? "");
  const skySlideY = (isHomePage && pageIndex <= 2) || isSetupPage ? 100 : 0;

  return (
    <div
      className={`${night ? "theme-kids-night" : "theme-kids"} kids-page-${pageIndex}`}
      style={{ height: "100vh", position: "relative", overflow: "hidden" }}
      onWheel={handleWheel}
    >
      {/* Seamless sky-to-space gradient */}
      <div style={{
        position: "fixed", inset: 0, zIndex: -1,
        backgroundImage: "linear-gradient(180deg, #000000 0%, #0a0a2e 8%, #1a1a4e 20%, #2d3a6e 40%, #4a6fa5 65%, #87ceeb 100%)",
        backgroundSize: "100% 400vh",
        backgroundPosition: isHomePage ? `0 ${pageIndex * 100}vh` : "0 300vh",
        transition: "background-position 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
      }} />
      {/* Space — setup page only */}
      <div style={{
        position: "fixed", inset: 0, zIndex: -1,
        background: "radial-gradient(ellipse at 50% 35%, #0d001e 0%, #080018 50%, #000008 100%)",
        opacity: isSetupPage ? 1 : 0,
        transition: "opacity 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
      }} />

      {/* Global sun — visible pages 1+2, exits left on pages 3+4 */}
      {isHomePage && (
        <div className="g-sun" style={{
          transform: pageIndex <= 1 ? "translateX(calc(-100vw - 150px))" : night ? "translateY(calc(100vh + 80px))" : "translateY(0px)",
          transition: "transform 0.55s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "radial-gradient(circle, #ffe97a 40%, #ffcf3a 100%)", boxShadow: (!night && pageIndex > 1) ? "0 0 48px 16px rgba(255,210,60,0.32)" : "none", transition: "box-shadow 2.6s cubic-bezier(0.4,0,0.2,1)" }} />
        </div>
      )}
      {/* Global moon — visible pages 1+2 at night, exits right on pages 3+4 */}
      {isHomePage && (
        <div className="g-moon" style={{
          transform: pageIndex <= 1 ? "translateX(calc(100vw + 150px))" : night ? "translateY(0px)" : "translateY(calc(100vh + 80px))",
          transition: "transform 0.55s cubic-bezier(0.4,0,0.2,1)",
        }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#f7e8a0", boxShadow: (night && pageIndex > 1) ? "0 0 40px 12px rgba(247,232,160,0.35)" : "none", transition: "box-shadow 2.6s cubic-bezier(0.4,0,0.2,1)" }} />
        </div>
      )}

      <SkyBackground night={night} scrollY={0} slideY={skySlideY} />

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
