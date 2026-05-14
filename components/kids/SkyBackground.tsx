"use client";
import { useEffect, useMemo, useRef } from "react";

interface Props {
  night?: boolean;
  scrollY?: number;
  slideY?: number; // vh — slides the whole sky down (used for page transitions)
}

function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

const DUR  = "2.6s";
const EASE = "cubic-bezier(0.4, 0, 0.2, 1)";

const SPACE_AT = 300; // px of scroll to reach full space

export default function SkyBackground({ night = false, scrollY = 0, slideY = 0 }: Props) {
  const earthRef = useRef<HTMLDivElement>(null);
  const spaceRef = useRef<HTMLDivElement>(null);
  const sunRef   = useRef<HTMLDivElement>(null);
  const moonRef  = useRef<HTMLDivElement>(null);

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
    const p = Math.min(1, scrollY / SPACE_AT);
    if (earthRef.current) {
      earthRef.current.style.transform = `translateY(${-p * 60}%)`;
      earthRef.current.style.opacity   = String(Math.max(0, 1 - p * 1.2));
    }
    if (spaceRef.current) {
      spaceRef.current.style.opacity = String(Math.min(1, p * 1.3));
    }
    if (sunRef.current) {
      sunRef.current.style.transform = `translateY(${-p * 40}px) translateX(${-p * 150}%)`;
    }
    if (moonRef.current) {
      moonRef.current.style.transform = `translateY(${-p * 40}px) translateX(${p * 150}%)`;
    }
  }, [scrollY]);


  return (
    <div
      className={`kids-sky-root${night ? " kids-sky--night" : ""}`}
      style={{
        position: "fixed", inset: 0, zIndex: 0,
        pointerEvents: "none", overflow: "hidden",
        background: "#020010",
        transform: `translateY(${slideY}vh)`,
        transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {/* ══ EARTH LAYER ══ */}
      <div ref={earthRef} style={{ position: "absolute", inset: 0, transition: "transform 0.6s ease, opacity 0.6s ease" }}>

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

        {/* Night stars */}
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

        {/* Sun — LEFT side, sinks behind hills at night */}
        <div style={{
          position: "absolute", left: "8%", top: "6%",
          transform: night ? "translateY(calc(100vh + 80px))" : "translateY(0px)",
          transition: "transform 2.4s ease-in",
        }}>
          <div ref={sunRef} style={{
            width: 72, height: 72, borderRadius: "50%",
            background: "radial-gradient(circle, #ffe97a 40%, #ffcf3a 100%)",
            boxShadow: night ? "none" : "0 0 48px 16px rgba(255,210,60,0.32)",
            transition: `box-shadow ${DUR} ${EASE}`,
          }} />
        </div>

        {/* Moon — RIGHT side, rises from behind hills at night */}
        <div style={{
          position: "absolute", right: "8%", top: "8%",
          transform: night ? "translateY(0px)" : "translateY(calc(100vh + 80px))",
          transition: "transform 2.4s ease-out",
        }}>
          <div ref={moonRef} style={{
            width: 64, height: 64, borderRadius: "50%",
            background: "#f7e8a0",
            boxShadow: night ? "0 0 40px 12px rgba(247,232,160,0.35)" : "none",
            transition: `box-shadow ${DUR} ${EASE}`,
          }} />
        </div>

        {/* Clouds */}
        <div className="kids-cloud kids-cloud--1" />
        <div className="kids-cloud kids-cloud--2" />
        <div className="kids-cloud kids-cloud--3" />

        {/* Ground & Nature — Day */}
        <svg
          style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 190, opacity: night ? 0 : 1, transition: night ? "opacity 0.8s ease 2.2s" : "opacity 0.6s ease 0s" }}
          viewBox="0 0 1440 190" preserveAspectRatio="none"
        >
          <ellipse cx="360"  cy="210" rx="520" ry="150" fill="#6bb87a" />
          <ellipse cx="1000" cy="215" rx="600" ry="155" fill="#52a868" />
          <ellipse cx="1390" cy="208" rx="390" ry="138" fill="#5fba74" />
          <rect x="0" y="158" width="1440" height="32" fill="#4a8a40" />
          {/* Tree 1 */}
          <rect x="144" y="118" width="12" height="42" fill="#7a4520" />
          <circle cx="150" cy="100" r="28" fill="#38835c" />
          <circle cx="133" cy="112" r="19" fill="#2d6a4f" />
          <circle cx="167" cy="109" r="21" fill="#34926a" />
          {/* Tree 2 */}
          <rect x="413" y="74" width="14" height="86" fill="#7a4520" />
          <circle cx="420" cy="56" r="36" fill="#2d6a4f" />
          <circle cx="397" cy="74" r="25" fill="#38835c" />
          <circle cx="443" cy="70" r="27" fill="#249058" />
          {/* Tree 3 */}
          <rect x="714" y="92" width="12" height="68" fill="#7a4520" />
          <circle cx="720" cy="76" r="32" fill="#38835c" />
          <circle cx="701" cy="90" r="23" fill="#2d6a4f" />
          <circle cx="740" cy="87" r="24" fill="#34926a" />
          {/* Tree 4 */}
          <rect x="1043" y="72" width="14" height="88" fill="#7a4520" />
          <circle cx="1050" cy="54" r="37" fill="#2d6a4f" />
          <circle cx="1027" cy="72" r="26" fill="#38835c" />
          <circle cx="1073" cy="68" r="28" fill="#249058" />
          {/* Tree 5 */}
          <rect x="1304" y="120" width="12" height="40" fill="#7a4520" />
          <circle cx="1310" cy="104" r="26" fill="#38835c" />
          <circle cx="1294" cy="116" r="18" fill="#2d6a4f" />
          <circle cx="1326" cy="113" r="19" fill="#34926a" />
          {/* Flowers */}
          <circle cx="240" cy="157" r="5" fill="#ff9eb5" /><circle cx="245" cy="152" r="3" fill="#ffb8c8" />
          <circle cx="600" cy="157" r="5" fill="#ffe066" /><circle cx="605" cy="152" r="3" fill="#fff0a0" />
          <circle cx="870" cy="157" r="5" fill="#ff9eb5" /><circle cx="875" cy="152" r="3" fill="#ffb8c8" />
          <circle cx="1200" cy="157" r="5" fill="#ffe066" /><circle cx="1205" cy="152" r="3" fill="#fff0a0" />
        </svg>

        {/* Ground & Nature — Night */}
        <svg
          style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 190, opacity: night ? 1 : 0, transition: night ? "opacity 0.8s ease 2.2s" : "opacity 0.4s ease 0s" }}
          viewBox="0 0 1440 190" preserveAspectRatio="none"
        >
          <ellipse cx="360"  cy="210" rx="520" ry="150" fill="#0d2218" />
          <ellipse cx="1000" cy="215" rx="600" ry="155" fill="#091c14" />
          <ellipse cx="1390" cy="208" rx="390" ry="138" fill="#0b2016" />
          <rect x="0" y="158" width="1440" height="32" fill="#071510" />
          {/* Tree silhouettes */}
          <rect x="144" y="118" width="12" height="42" fill="#040c07" />
          <circle cx="150" cy="100" r="28" fill="#0a1e14" /><circle cx="133" cy="112" r="19" fill="#071610" /><circle cx="167" cy="109" r="21" fill="#081810" />
          <rect x="413" y="74" width="14" height="86" fill="#040c07" />
          <circle cx="420" cy="56" r="36" fill="#07160f" /><circle cx="397" cy="74" r="25" fill="#0a1e14" /><circle cx="443" cy="70" r="27" fill="#061208" />
          <rect x="714" y="92" width="12" height="68" fill="#040c07" />
          <circle cx="720" cy="76" r="32" fill="#0a1e14" /><circle cx="701" cy="90" r="23" fill="#07160f" /><circle cx="740" cy="87" r="24" fill="#081810" />
          <rect x="1043" y="72" width="14" height="88" fill="#040c07" />
          <circle cx="1050" cy="54" r="37" fill="#07160f" /><circle cx="1027" cy="72" r="26" fill="#0a1e14" /><circle cx="1073" cy="68" r="28" fill="#061208" />
          <rect x="1304" y="120" width="12" height="40" fill="#040c07" />
          <circle cx="1310" cy="104" r="26" fill="#0a1e14" /><circle cx="1294" cy="116" r="18" fill="#07160f" /><circle cx="1326" cy="113" r="19" fill="#081810" />
          {/* Fireflies */}
          <circle cx="240" cy="148" r="3"   fill="rgba(180,255,160,0.75)" />
          <circle cx="600" cy="144" r="2.5" fill="rgba(180,255,160,0.65)" />
          <circle cx="870" cy="150" r="3"   fill="rgba(180,255,160,0.75)" />
          <circle cx="1200" cy="146" r="2.5" fill="rgba(180,255,160,0.65)" />
        </svg>
      </div>

      {/* ══ SPACE LAYER ══ */}
      <div ref={spaceRef} style={{ position: "absolute", inset: 0, opacity: 0, transition: "opacity 0.6s ease" }}>

        {/* Deep space background */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 50% 40%, #0d001e 0%, #050010 45%, #000008 100%)",
        }} />

        {/* Background stars — behind galaxy */}
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

        {/* ── SPIRAL GALAXY ── */}
        <div style={{ position: "absolute", top: "38%", left: "50%" }}>
          <div style={{ animation: "galaxy-drift 30s ease-in-out infinite alternate" }}>

            {/* Outer diffuse halo */}
            <div style={{
              position: "absolute",
              width: "92vmin", height: "44vmin",
              transform: "translate(-50%, -50%) rotate(-22deg)",
              borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(100,40,180,0.13) 0%, rgba(60,20,120,0.06) 55%, transparent 80%)",
              filter: "blur(55px)",
            }} />

            {/* Main galaxy disk */}
            <div style={{
              position: "absolute",
              width: "68vmin", height: "24vmin",
              transform: "translate(-50%, -50%) rotate(-22deg)",
              borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(220,130,255,0.22) 0%, rgba(140,80,255,0.16) 35%, rgba(80,100,220,0.10) 65%, transparent 85%)",
              filter: "blur(22px)",
            }} />

            {/* Spiral arm A — upper-left, pink/magenta */}
            <div style={{
              position: "absolute",
              width: "55vmin", height: "11vmin",
              transform: "translate(-50%, -50%) rotate(-22deg) translateX(-16vmin)",
              borderRadius: "50%",
              background: "radial-gradient(ellipse at 25% 50%, rgba(255,100,200,0.32) 0%, rgba(220,80,255,0.18) 45%, transparent 75%)",
              filter: "blur(16px)",
            }} />

            {/* Spiral arm B — lower-right, blue/cyan */}
            <div style={{
              position: "absolute",
              width: "55vmin", height: "11vmin",
              transform: "translate(-50%, -50%) rotate(-22deg) translateX(16vmin)",
              borderRadius: "50%",
              background: "radial-gradient(ellipse at 75% 50%, rgba(80,160,255,0.30) 0%, rgba(60,200,255,0.16) 45%, transparent 75%)",
              filter: "blur(16px)",
            }} />

            {/* Spiral arm C — perpendicular, warm pink */}
            <div style={{
              position: "absolute",
              width: "42vmin", height: "9vmin",
              transform: "translate(-50%, -50%) rotate(68deg) translateX(-12vmin)",
              borderRadius: "50%",
              background: "radial-gradient(ellipse at 25% 50%, rgba(255,140,180,0.24) 0%, rgba(200,80,220,0.12) 50%, transparent 75%)",
              filter: "blur(18px)",
            }} />

            {/* Spiral arm D — perpendicular, blue */}
            <div style={{
              position: "absolute",
              width: "38vmin", height: "8vmin",
              transform: "translate(-50%, -50%) rotate(68deg) translateX(12vmin)",
              borderRadius: "50%",
              background: "radial-gradient(ellipse at 75% 50%, rgba(60,180,255,0.22) 0%, rgba(100,220,255,0.10) 50%, transparent 75%)",
              filter: "blur(18px)",
            }} />

            {/* Inner galactic bulge */}
            <div style={{
              position: "absolute",
              width: "22vmin", height: "9vmin",
              transform: "translate(-50%, -50%) rotate(-22deg)",
              borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(255,210,160,0.38) 0%, rgba(255,140,200,0.22) 45%, transparent 80%)",
              filter: "blur(10px)",
            }} />

            {/* Core glow */}
            <div style={{
              position: "absolute",
              width: "9vmin", height: "6vmin",
              transform: "translate(-50%, -50%) rotate(-22deg)",
              borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(255,255,220,0.95) 0%, rgba(255,200,140,0.70) 35%, rgba(255,120,200,0.30) 65%, transparent 85%)",
              filter: "blur(5px)",
            }} />

            {/* Core nucleus */}
            <div style={{
              position: "absolute",
              width: "2.5vmin", height: "2.5vmin",
              transform: "translate(-50%, -50%)",
              borderRadius: "50%",
              background: "radial-gradient(circle, #ffffff 0%, rgba(255,240,200,0.9) 40%, transparent 75%)",
              filter: "blur(2px)",
              boxShadow: "0 0 18px 8px rgba(255,220,160,0.45)",
            }} />
          </div>
        </div>

        {/* Planets — all well away from the sky sun/moon area */}

        {/* Planet A — warm ringed giant */}
        <div style={{
          position: "absolute", top: "32%", left: "76%",
          width: 52, height: 52, borderRadius: "50%",
          background: "radial-gradient(circle at 35% 30%, #f2c882 0%, #c06828 52%, #7a3212 100%)",
          boxShadow: "inset -14px -10px 24px rgba(0,0,0,0.65), 0 0 28px rgba(220,150,60,0.2)",
        }} />
        <div style={{
          position: "absolute", top: "calc(32% + 22px)", left: "calc(76% - 18px)",
          width: 88, height: 16, borderRadius: "50%",
          border: "2px solid rgba(240,200,120,0.38)",
          transform: "rotate(-12deg)",
        }} />

        {/* Planet B — ice blue */}
        <div style={{
          position: "absolute", top: "62%", left: "5%",
          width: 40, height: 40, borderRadius: "50%",
          background: "radial-gradient(circle at 40% 32%, #a8e8f8 0%, #2268b0 55%, #102448 100%)",
          boxShadow: "inset -10px -7px 18px rgba(0,0,0,0.7), 0 0 20px rgba(60,160,220,0.16)",
        }} />

        {/* Planet C — small purple */}
        <div style={{
          position: "absolute", top: "74%", right: "17%",
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
        @keyframes galaxy-drift {
          from { transform: translateY(-20px); }
          to   { transform: translateY(20px);  }
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
