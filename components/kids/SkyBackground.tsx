"use client";
import { useEffect, useMemo, useRef } from "react";

interface Props { night?: boolean; }

function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const DUR      = "2.6s";
const EASE     = "cubic-bezier(0.4, 0, 0.2, 1)";
const SPACE_AT = 500; // scrollY px where space is fully visible

export default function SkyBackground({ night = false }: Props) {
  const spaceRef = useRef<HTMLDivElement>(null);

  const skyStars = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      top:          seededRand(i * 4 + 1) * 72,
      left:         seededRand(i * 4 + 2) * 100,
      opacity:      0.4 + seededRand(i * 4) * 0.5,
      twinkleDur:   2 + seededRand(i * 4 + 3) * 3,
      twinkleDelay: seededRand(i * 4 + 4) * 4,
      fadeDelay:    seededRand(i * 4 + 5) * 1.8,
      big:          i % 5 === 0,
    })), []);

  const spaceStars = useMemo(() =>
    Array.from({ length: 130 }, (_, i) => ({
      top:          seededRand(i * 7 + 200) * 95,
      left:         seededRand(i * 7 + 201) * 100,
      size:         i % 7 === 0 ? 3 : i % 3 === 0 ? 2 : 1.5,
      opacity:      0.5 + seededRand(i * 7 + 202) * 0.5,
      twinkleDur:   1.5 + seededRand(i * 7 + 203) * 4,
      twinkleDelay: seededRand(i * 7 + 204) * 8,
      glow:         i % 12 === 0,
    })), []);

  useEffect(() => {
    let raf: number;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const p = Math.min(1, window.scrollY / SPACE_AT);
        if (spaceRef.current) spaceRef.current.style.opacity = String(p);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => { window.removeEventListener("scroll", onScroll); cancelAnimationFrame(raf); };
  }, []);

  return (
    <div
      className={`kids-sky-root${night ? " kids-sky--night" : ""}`}
      style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}
    >
      {/* Day sky */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, #b8dff8 0%, #d4ecff 50%, #e8f6ff 100%)",
        opacity: night ? 0 : 1,
        transition: `opacity ${DUR} ${EASE}`,
      }} />

      {/* Night sky */}
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(180deg, #1a1040 0%, #2e1c6a 60%, #3d1a5a 100%)",
        opacity: night ? 1 : 0,
        transition: `opacity ${DUR} ${EASE}`,
      }} />

      {/* Night stars — nested divs: outer fades, inner twinkles */}
      {skyStars.map((s, i) => (
        <div key={i} style={{
          position: "absolute",
          top: `${s.top}%`, left: `${s.left}%`,
          opacity: night ? 1 : 0,
          transition: night ? `opacity 1.4s ease ${s.fadeDelay.toFixed(2)}s` : "opacity 0.7s ease",
        }}>
          <div style={{
            width: s.big ? 3 : 2, height: s.big ? 3 : 2,
            borderRadius: "50%", background: "#fff", opacity: s.opacity,
            animation: `twinkle ${s.twinkleDur.toFixed(1)}s ease-in-out infinite ${s.twinkleDelay.toFixed(2)}s`,
          }} />
        </div>
      ))}

      {/* Sun */}
      <div style={{
        position: "absolute", right: "10%",
        width: 72, height: 72, borderRadius: "50%",
        background: "radial-gradient(circle, #ffe97a 40%, #ffcf3a 100%)",
        boxShadow: night ? "none" : "0 0 48px 16px rgba(255,210,60,0.32)",
        top: night ? "110%" : "6%", opacity: night ? 0 : 1,
        transition: `top ${DUR} ${EASE}, opacity ${DUR} ${EASE}, box-shadow ${DUR} ${EASE}`,
      }} />

      {/* Moon */}
      <div style={{
        position: "absolute", right: "12%",
        width: 64, height: 64, borderRadius: "50%",
        background: "#f7e8a0",
        boxShadow: night ? "0 0 40px 12px rgba(247,232,160,0.35)" : "none",
        top: night ? "8%" : "110%", opacity: night ? 1 : 0,
        transition: `top ${DUR} ${EASE}, opacity ${DUR} ${EASE}, box-shadow ${DUR} ${EASE}`,
      }} />

      {/* Clouds */}
      <div className="kids-cloud kids-cloud--1" />
      <div className="kids-cloud kids-cloud--2" />
      <div className="kids-cloud kids-cloud--3" />

      {/* Hills */}
      <svg
        style={{
          position: "absolute", bottom: 0, left: 0, width: "100%", height: 120,
          opacity: night ? 0 : 1,
          transition: `opacity ${DUR} ${EASE}`,
        }}
        viewBox="0 0 1440 120" preserveAspectRatio="none"
      >
        <ellipse cx="300"  cy="140" rx="400" ry="120" fill="rgba(126,200,164,0.45)" />
        <ellipse cx="900"  cy="150" rx="500" ry="130" fill="rgba(126,200,164,0.35)" />
        <ellipse cx="1300" cy="145" rx="320" ry="115" fill="rgba(126,200,164,0.5)"  />
      </svg>

      {/* ── SPACE LAYER (fades in as user scrolls down) ── */}
      <div ref={spaceRef} style={{ position: "absolute", inset: 0, opacity: 0 }}>

        {/* Deep space gradient */}
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(180deg, #020010 0%, #0a001e 30%, #12003a 60%, #1a0635 100%)",
        }} />

        {/* Nebulae */}
        <div style={{ position: "absolute", top: "8%",    left: "4%",   width: "58%", height: "44%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(190,80,255,0.18) 0%, transparent 70%)",  filter: "blur(70px)" }} />
        <div style={{ position: "absolute", top: "32%",   right: "4%",  width: "50%", height: "40%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(70,120,255,0.22) 0%, transparent 70%)",   filter: "blur(60px)" }} />
        <div style={{ position: "absolute", top: "4%",    right: "18%", width: "34%", height: "28%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(255,80,160,0.13) 0%, transparent 70%)",  filter: "blur(50px)" }} />
        <div style={{ position: "absolute", bottom: "12%", left: "22%", width: "44%", height: "34%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(40,60,200,0.22) 0%, transparent 70%)",   filter: "blur(65px)" }} />
        <div style={{ position: "absolute", top: "52%",   left: "48%",  width: "32%", height: "26%", borderRadius: "50%", background: "radial-gradient(ellipse, rgba(180,100,255,0.16) 0%, transparent 70%)", filter: "blur(45px)" }} />

        {/* Space stars */}
        {spaceStars.map((s, i) => (
          <div key={i} style={{
            position: "absolute",
            top: `${s.top}%`, left: `${s.left}%`,
            width: s.size, height: s.size, borderRadius: "50%",
            background: "#fff",
            boxShadow: s.glow ? `0 0 ${Math.round(s.size * 3)}px ${Math.round(s.size)}px rgba(200,210,255,0.5)` : undefined,
            opacity: s.opacity,
            animation: `space-twinkle ${s.twinkleDur.toFixed(1)}s ease-in-out infinite ${s.twinkleDelay.toFixed(2)}s`,
          }} />
        ))}

        {/* Planet A — warm giant with ring */}
        <div style={{
          position: "absolute", top: "11%", right: "8%",
          width: 52, height: 52, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 30%, #f2c882 0%, #c06828 52%, #7a3212 100%)",
          boxShadow: "inset -14px -10px 24px rgba(0,0,0,0.65), 0 0 28px rgba(220,150,60,0.2)",
        }} />
        <div style={{
          position: "absolute", top: "calc(11% + 22px)", right: "calc(8% - 18px)",
          width: 88, height: 16, borderRadius: "50%",
          border: "2px solid rgba(240,200,120,0.38)",
          transform: "rotate(-12deg)",
        }} />

        {/* Planet B — ice blue */}
        <div style={{
          position: "absolute", top: "43%", left: "5%",
          width: 40, height: 40, borderRadius: "50%",
          background: "radial-gradient(circle at 40% 32%, #a8e8f8 0%, #2268b0 55%, #102448 100%)",
          boxShadow: "inset -10px -7px 18px rgba(0,0,0,0.7), 0 0 20px rgba(60,160,220,0.16)",
        }} />

        {/* Planet C — small purple */}
        <div style={{
          position: "absolute", top: "67%", right: "17%",
          width: 26, height: 26, borderRadius: "50%",
          background: "radial-gradient(circle at 38% 32%, #e4b4ff 0%, #6428a8 60%, #320068 100%)",
          boxShadow: "inset -7px -5px 12px rgba(0,0,0,0.65)",
        }} />

        {/* Shooting stars */}
        <div className="shooting-star shooting-star--1" />
        <div className="shooting-star shooting-star--2" />
        <div className="shooting-star shooting-star--3" />
        <div className="shooting-star shooting-star--4" />
        <div className="shooting-star shooting-star--5" />
      </div>

      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 0.9; }
        }
        @keyframes space-twinkle {
          0%, 100% { opacity: 0.3; }
          50%       { opacity: 1;   }
        }
        @keyframes float-cloud {
          from { transform: translateX(-300px); }
          to   { transform: translateX(calc(100vw + 300px)); }
        }
        @keyframes shoot {
          0%   { transform: rotate(30deg) translateX(0);                   opacity: 0; }
          8%   {                                                             opacity: 1; }
          70%  {                                                             opacity: 0.6; }
          100% { transform: rotate(30deg) translateX(calc(100vw + 500px)); opacity: 0; }
        }

        .kids-cloud {
          position: absolute;
          border-radius: 999px;
          background: rgba(255,255,255,0.88);
          box-shadow: 0 8px 24px rgba(180,220,255,0.18);
          transition: background ${DUR} ${EASE}, box-shadow ${DUR} ${EASE}, opacity ${DUR} ${EASE};
        }
        .kids-cloud::before, .kids-cloud::after {
          content: "";
          position: absolute;
          border-radius: 999px;
          background: inherit;
        }
        .kids-sky--night .kids-cloud {
          background: rgba(72,48,168,0.5);
          box-shadow: 0 8px 24px rgba(40,20,100,0.12);
          opacity: 0.65;
        }
        .kids-cloud--1 { width: 240px; height: 68px; top: 14%; left: -240px; animation: float-cloud 38s linear infinite; }
        .kids-cloud--1::before { width: 110px; height: 80px; top: -36px; left: 40px;  }
        .kids-cloud--1::after  { width: 80px;  height: 60px; top: -22px; left: 120px; }
        .kids-cloud--2 { width: 180px; height: 52px; top: 28%; left: -180px; animation: float-cloud 52s linear infinite 8s; }
        .kids-cloud--2::before { width: 80px; height: 60px; top: -28px; left: 30px; }
        .kids-cloud--2::after  { width: 60px; height: 44px; top: -18px; left: 90px; }
        .kids-cloud--3 { width: 140px; height: 42px; top: 8%; left: -140px; animation: float-cloud 66s linear infinite 20s; }
        .kids-cloud--3::before { width: 65px; height: 50px; top: -22px; left: 28px; }

        .shooting-star {
          position: absolute;
          height: 1.5px;
          border-radius: 999px;
          background: linear-gradient(90deg, transparent 0%, rgba(200,220,255,0.6) 40%, rgba(255,255,255,0.95) 100%);
          opacity: 0;
        }
        .shooting-star--1 { width: 140px; top:  8%; left:  5%; animation: shoot 3.5s ease-in  5s infinite; }
        .shooting-star--2 { width: 110px; top: 18%; left: 48%; animation: shoot 3s   ease-in 14s infinite; }
        .shooting-star--3 { width: 160px; top:  3%; left: 22%; animation: shoot 4s   ease-in 23s infinite; }
        .shooting-star--4 { width: 120px; top: 25%; left: 68%; animation: shoot 3s   ease-in 34s infinite; }
        .shooting-star--5 { width: 100px; top: 12%; left: 38%; animation: shoot 3.5s ease-in 44s infinite; }
      `}</style>
    </div>
  );
}
