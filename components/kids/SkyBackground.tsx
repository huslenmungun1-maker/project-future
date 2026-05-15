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

        {/* Clouds */}
        <div className="kids-cloud kids-cloud--1" />
        <div className="kids-cloud kids-cloud--2" />
        <div className="kids-cloud kids-cloud--3" />
        <div className="kids-cloud kids-cloud--4" />
        <div className="kids-cloud kids-cloud--5" />
        <div className="kids-cloud kids-cloud--6" />
        <div className="kids-cloud kids-cloud--7" />

        {/* Ground & Nature — Day (MLP/Disney cartoon style) */}
        <svg
          style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 220, opacity: night ? 0 : 1, transition: night ? "opacity 0.8s ease 2.2s" : "opacity 0.6s ease 0s" }}
          viewBox="0 0 1440 220" preserveAspectRatio="none"
        >
          {/* Far mountains — faded blue-grey */}
          <path d="M0,170 C120,110 240,55 380,95 C520,135 560,60 700,85 C820,106 860,45 1000,75 C1140,105 1200,50 1360,80 L1440,90 L1440,220 L0,220 Z" fill="#c2d4dc" stroke="#9ab5be" strokeWidth="1.5"/>
          {/* Closer mountains */}
          <path d="M0,180 C100,145 200,100 340,130 C460,155 500,95 650,120 C780,142 820,95 960,118 C1100,140 1160,95 1300,118 L1440,130 L1440,220 L0,220 Z" fill="#8faab5" stroke="#6b8e9c" strokeWidth="2"/>
          {/* Dark back hills */}
          <path d="M0,188 Q180,172 360,180 Q540,188 720,174 Q900,160 1080,176 Q1260,190 1440,182 L1440,220 L0,220 Z" fill="#2d7a2d" stroke="#1e5c1e" strokeWidth="2"/>
          {/* Mid hills */}
          <path d="M0,196 Q200,180 400,188 Q600,196 800,182 Q1000,168 1200,183 Q1360,194 1440,190 L1440,220 L0,220 Z" fill="#4a9e4a" stroke="#2d7a2d" strokeWidth="2"/>
          {/* Bright foreground hills */}
          <path d="M0,204 Q180,192 360,199 Q540,206 720,194 Q900,182 1080,196 Q1260,208 1440,203 L1440,220 L0,220 Z" fill="#5db85d" stroke="#3a9040" strokeWidth="2.5"/>
          {/* Ground strip */}
          <rect x="0" y="213" width="1440" height="7" fill="#4a8a40"/>
          {/* Dirt path */}
          <path d="M700,220 C680,208 658,198 638,188 C618,178 610,170 622,162 C634,154 658,150 666,142 C670,138 664,132 654,130" fill="none" stroke="#b8914a" strokeWidth="14" strokeLinecap="round"/>
          <path d="M700,220 C680,208 658,198 638,188 C618,178 610,170 622,162 C634,154 658,150 666,142 C670,138 664,132 654,130" fill="none" stroke="#d4a96e" strokeWidth="8"  strokeLinecap="round"/>
          {/* Pond */}
          <ellipse cx="840" cy="196" rx="52" ry="14" fill="#5bb8e0" stroke="#3a9abf" strokeWidth="2"/>
          <ellipse cx="840" cy="194" rx="32" ry="7"  fill="rgba(255,255,255,0.28)"/>
          {/* === LEFT BIG TREE === */}
          <path d="M100,218 C98,202 96,182 97,168 C98,155 103,146 106,136 L116,136 C119,146 122,155 123,168 C124,182 122,202 120,218 Z" fill="#5c3317" stroke="#3d1f0a" strokeWidth="1.5"/>
          <circle cx="108" cy="116" r="50" fill="#2d6a4f" stroke="#1e4d38" strokeWidth="2"/>
          <circle cx="76"  cy="132" r="35" fill="#2d6a4f" stroke="#1e4d38" strokeWidth="2"/>
          <circle cx="142" cy="130" r="38" fill="#2d6a4f" stroke="#1e4d38" strokeWidth="2"/>
          <circle cx="108" cy="110" r="48" fill="#38835c" stroke="#26613f" strokeWidth="2"/>
          <circle cx="76"  cy="126" r="33" fill="#38835c" stroke="#26613f" strokeWidth="2"/>
          <circle cx="142" cy="124" r="36" fill="#38835c" stroke="#26613f" strokeWidth="2"/>
          <circle cx="98"  cy="98"  r="30" fill="#5fba74" stroke="#3d9050" strokeWidth="1.5"/>
          <circle cx="122" cy="106" r="20" fill="#5fba74" stroke="#3d9050" strokeWidth="1.5"/>
          <circle cx="84"  cy="112" r="16" fill="#5fba74" stroke="#3d9050" strokeWidth="1.5"/>
          {/* === RIGHT TREE === */}
          <path d="M1322,218 C1320,202 1318,184 1319,170 C1320,158 1324,150 1326,140 L1336,140 C1338,150 1340,158 1341,170 C1342,184 1340,202 1338,218 Z" fill="#5c3317" stroke="#3d1f0a" strokeWidth="1.5"/>
          <circle cx="1329" cy="120" r="42" fill="#2d6a4f" stroke="#1e4d38" strokeWidth="2"/>
          <circle cx="1300" cy="135" r="30" fill="#2d6a4f" stroke="#1e4d38" strokeWidth="2"/>
          <circle cx="1358" cy="132" r="32" fill="#2d6a4f" stroke="#1e4d38" strokeWidth="2"/>
          <circle cx="1329" cy="114" r="40" fill="#38835c" stroke="#26613f" strokeWidth="2"/>
          <circle cx="1300" cy="128" r="28" fill="#38835c" stroke="#26613f" strokeWidth="2"/>
          <circle cx="1358" cy="125" r="30" fill="#38835c" stroke="#26613f" strokeWidth="2"/>
          <circle cx="1320" cy="103" r="24" fill="#5fba74" stroke="#3d9050" strokeWidth="1.5"/>
          <circle cx="1342" cy="110" r="16" fill="#5fba74" stroke="#3d9050" strokeWidth="1.5"/>
          {/* === SMALL BACKGROUND TREE === */}
          <rect x="424" y="178" width="8" height="28" fill="#5c3317" stroke="#3d1f0a" strokeWidth="1"/>
          <circle cx="428" cy="168" r="20" fill="#2d6a4f" stroke="#1e4d38" strokeWidth="1.5"/>
          <circle cx="412" cy="174" r="14" fill="#38835c" stroke="#26613f" strokeWidth="1.5"/>
          <circle cx="444" cy="172" r="16" fill="#38835c" stroke="#26613f" strokeWidth="1.5"/>
          <circle cx="426" cy="160" r="12" fill="#5fba74" stroke="#3d9050" strokeWidth="1"/>
          {/* === FLOWERS === */}
          <circle cx="190"  cy="210" r="4"   fill="#fff"    stroke="#ddd" strokeWidth="1"/>
          <circle cx="210"  cy="207" r="3"   fill="#fff"    stroke="#ddd" strokeWidth="1"/>
          <circle cx="370"  cy="209" r="4"   fill="#f0f8ff" stroke="#c8d8e0" strokeWidth="1"/>
          <circle cx="490"  cy="210" r="3.5" fill="#fff"    stroke="#ddd" strokeWidth="1"/>
          <circle cx="580"  cy="208" r="3"   fill="#fff"    stroke="#ddd" strokeWidth="1"/>
          <circle cx="765"  cy="209" r="4"   fill="#fff"    stroke="#ddd" strokeWidth="1"/>
          <circle cx="920"  cy="210" r="3.5" fill="#f0f8ff" stroke="#c8d8e0" strokeWidth="1"/>
          <circle cx="1060" cy="208" r="4"   fill="#fff"    stroke="#ddd" strokeWidth="1"/>
          <circle cx="1200" cy="209" r="3"   fill="#fff"    stroke="#ddd" strokeWidth="1"/>
          <circle cx="1290" cy="210" r="4"   fill="#fff"    stroke="#ddd" strokeWidth="1"/>
          <circle cx="250"  cy="209" r="3.5" fill="#8ec8f0" stroke="#5da0c8" strokeWidth="1"/>
          <circle cx="400"  cy="208" r="3"   fill="#7ab8e8" stroke="#4a90c0" strokeWidth="1"/>
          <circle cx="540"  cy="209" r="4"   fill="#8ec8f0" stroke="#5da0c8" strokeWidth="1"/>
          <circle cx="720"  cy="210" r="3"   fill="#7ab8e8" stroke="#4a90c0" strokeWidth="1"/>
          <circle cx="980"  cy="209" r="3.5" fill="#8ec8f0" stroke="#5da0c8" strokeWidth="1"/>
          <circle cx="1120" cy="210" r="4"   fill="#7ab8e8" stroke="#4a90c0" strokeWidth="1"/>
          <circle cx="1240" cy="208" r="3"   fill="#8ec8f0" stroke="#5da0c8" strokeWidth="1"/>
          <circle cx="320"  cy="209" r="3.5" fill="#ffe066" stroke="#c8a800" strokeWidth="1"/>
          <circle cx="660"  cy="209" r="3"   fill="#ffe066" stroke="#c8a800" strokeWidth="1"/>
          <circle cx="880"  cy="210" r="3.5" fill="#ffe066" stroke="#c8a800" strokeWidth="1"/>
          <circle cx="1160" cy="208" r="3"   fill="#ffe066" stroke="#c8a800" strokeWidth="1"/>
        </svg>

        {/* Ground & Nature — Night (dark MLP silhouettes) */}
        <svg
          style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 220, opacity: night ? 1 : 0, transition: night ? "opacity 0.8s ease 2.2s" : "opacity 0.4s ease 0s" }}
          viewBox="0 0 1440 220" preserveAspectRatio="none"
        >
          {/* Mountain silhouettes */}
          <path d="M0,170 C120,110 240,55 380,95 C520,135 560,60 700,85 C820,106 860,45 1000,75 C1140,105 1200,50 1360,80 L1440,90 L1440,220 L0,220 Z" fill="#060e12"/>
          <path d="M0,180 C100,145 200,100 340,130 C460,155 500,95 650,120 C780,142 820,95 960,118 C1100,140 1160,95 1300,118 L1440,130 L1440,220 L0,220 Z" fill="#0a1a20"/>
          {/* Hill silhouettes */}
          <path d="M0,188 Q180,172 360,180 Q540,188 720,174 Q900,160 1080,176 Q1260,190 1440,182 L1440,220 L0,220 Z" fill="#071510"/>
          <path d="M0,196 Q200,180 400,188 Q600,196 800,182 Q1000,168 1200,183 Q1360,194 1440,190 L1440,220 L0,220 Z" fill="#0a1c14"/>
          <path d="M0,204 Q180,192 360,199 Q540,206 720,194 Q900,182 1080,196 Q1260,208 1440,203 L1440,220 L0,220 Z" fill="#0d2218"/>
          <rect x="0" y="213" width="1440" height="7" fill="#071510"/>
          {/* Left tree silhouette */}
          <path d="M100,218 C98,202 96,182 97,168 C98,155 103,146 106,136 L116,136 C119,146 122,155 123,168 C124,182 122,202 120,218 Z" fill="#040c07"/>
          <circle cx="108" cy="116" r="50" fill="#040c07"/>
          <circle cx="76"  cy="132" r="35" fill="#061008"/>
          <circle cx="142" cy="130" r="38" fill="#040c07"/>
          <circle cx="98"  cy="98"  r="30" fill="#061008"/>
          <circle cx="122" cy="106" r="20" fill="#040c07"/>
          <circle cx="84"  cy="112" r="16" fill="#061008"/>
          {/* Right tree silhouette */}
          <path d="M1322,218 C1320,202 1318,184 1319,170 C1320,158 1324,150 1326,140 L1336,140 C1338,150 1340,158 1341,170 C1342,184 1340,202 1338,218 Z" fill="#040c07"/>
          <circle cx="1329" cy="120" r="42" fill="#040c07"/>
          <circle cx="1300" cy="135" r="30" fill="#061008"/>
          <circle cx="1358" cy="132" r="32" fill="#040c07"/>
          <circle cx="1320" cy="103" r="24" fill="#061008"/>
          <circle cx="1342" cy="110" r="16" fill="#040c07"/>
          {/* Small back tree silhouette */}
          <rect x="424" y="178" width="8" height="28" fill="#040c07"/>
          <circle cx="428" cy="168" r="20" fill="#040c07"/>
          <circle cx="412" cy="174" r="14" fill="#061008"/>
          <circle cx="444" cy="172" r="16" fill="#040c07"/>
          {/* Fireflies */}
          <circle cx="240"  cy="208" r="3"   fill="rgba(180,255,160,0.75)"/>
          <circle cx="440"  cy="205" r="2"   fill="rgba(180,255,160,0.55)"/>
          <circle cx="600"  cy="207" r="2.5" fill="rgba(180,255,160,0.65)"/>
          <circle cx="870"  cy="209" r="3"   fill="rgba(180,255,160,0.75)"/>
          <circle cx="1050" cy="206" r="2.5" fill="rgba(180,255,160,0.60)"/>
          <circle cx="1200" cy="208" r="2.5" fill="rgba(180,255,160,0.65)"/>
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
        .kids-cloud--4 { width: 200px; height: 58px; top: 20%; left: -200px; animation: float-cloud 44s linear infinite 15s; }
        .kids-cloud--4::before { width: 90px; height: 70px; top: -32px; left: 35px; }
        .kids-cloud--4::after  { width: 70px; height: 52px; top: -20px; left: 105px; }
        .kids-cloud--5 { width: 160px; height: 46px; top: 36%; left: -160px; animation: float-cloud 58s linear infinite 3s; }
        .kids-cloud--5::before { width: 72px; height: 54px; top: -24px; left: 28px; }
        .kids-cloud--5::after  { width: 54px; height: 40px; top: -16px; left: 82px; }
        .kids-cloud--6 { width: 110px; height: 34px; top: 5%; left: -110px; animation: float-cloud 72s linear infinite 30s; }
        .kids-cloud--6::before { width: 50px; height: 42px; top: -18px; left: 20px; }
        .kids-cloud--6::after  { width: 40px; height: 32px; top: -12px; left: 60px; }
        .kids-cloud--7 { width: 280px; height: 78px; top: 44%; left: -280px; animation: float-cloud 46s linear infinite 24s; }
        .kids-cloud--7::before { width: 120px; height: 92px; top: -40px; left: 50px; }
        .kids-cloud--7::after  { width: 90px;  height: 68px; top: -26px; left: 145px; }

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
