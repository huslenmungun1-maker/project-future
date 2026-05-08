"use client";
import { useMemo } from "react";

interface Props {
  night?: boolean;
}

// Seeded pseudo-random to keep stars stable across renders
function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

export default function SkyBackground({ night = false }: Props) {
  const stars = useMemo(() =>
    Array.from({ length: 60 }, (_, i) => ({
      opacity: 0.4 + seededRand(i * 4) * 0.5,
      top: seededRand(i * 4 + 1) * 70,
      left: seededRand(i * 4 + 2) * 100,
      duration: 2 + seededRand(i * 4 + 3) * 3,
      delay: seededRand(i * 4 + 4) * 4,
    })), []);

  if (night) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          pointerEvents: "none",
          overflow: "hidden",
          background: "linear-gradient(180deg, #1a1040 0%, #2e1c6a 60%, #3d1a5a 100%)",
        }}
      >
        {/* Stars */}
        {stars.map((star, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              width: i % 5 === 0 ? 3 : 2,
              height: i % 5 === 0 ? 3 : 2,
              borderRadius: "50%",
              background: "#fff",
              opacity: star.opacity,
              top: `${star.top}%`,
              left: `${star.left}%`,
              animation: `twinkle ${star.duration}s ease-in-out infinite`,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
        {/* Moon */}
        <div
          style={{
            position: "absolute",
            top: "8%",
            right: "12%",
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "#f7e8a0",
            boxShadow: "0 0 40px 12px rgba(247,232,160,0.35)",
          }}
        />
        {/* Night clouds */}
        <div className="kids-cloud kids-cloud--1" style={{ opacity: 0.18 }} />
        <div className="kids-cloud kids-cloud--2" style={{ opacity: 0.14 }} />
        <style>{`
          @keyframes twinkle {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.9; }
          }
          @keyframes float-cloud {
            0%   { transform: translateX(-120px); }
            100% { transform: translateX(calc(100vw + 120px)); }
          }
          .kids-cloud {
            position: absolute;
            border-radius: 999px;
            background: #fff;
          }
          .kids-cloud--1 {
            width: 220px; height: 60px;
            top: 18%;
            left: -220px;
            animation: float-cloud 40s linear infinite;
          }
          .kids-cloud--2 {
            width: 160px; height: 44px;
            top: 32%;
            left: -160px;
            animation: float-cloud 55s linear infinite 15s;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        background: "linear-gradient(180deg, #b8dff8 0%, #d4ecff 50%, #e8f6ff 100%)",
      }}
    >
      {/* Sun */}
      <div
        style={{
          position: "absolute",
          top: "6%",
          right: "10%",
          width: 72,
          height: 72,
          borderRadius: "50%",
          background: "radial-gradient(circle, #ffe97a 40%, #ffcf3a 100%)",
          boxShadow: "0 0 48px 16px rgba(255,210,60,0.32)",
        }}
      />
      {/* Floating clouds */}
      <div className="kids-cloud kids-cloud--1" />
      <div className="kids-cloud kids-cloud--2" />
      <div className="kids-cloud kids-cloud--3" />
      {/* Hills at bottom */}
      <svg
        style={{ position: "absolute", bottom: 0, left: 0, width: "100%", height: 120 }}
        viewBox="0 0 1440 120"
        preserveAspectRatio="none"
      >
        <ellipse cx="300" cy="140" rx="400" ry="120" fill="rgba(126,200,164,0.45)" />
        <ellipse cx="900" cy="150" rx="500" ry="130" fill="rgba(126,200,164,0.35)" />
        <ellipse cx="1300" cy="145" rx="320" ry="115" fill="rgba(126,200,164,0.5)" />
      </svg>
      <style>{`
        @keyframes float-cloud {
          0%   { transform: translateX(-300px); }
          100% { transform: translateX(calc(100vw + 300px)); }
        }
        .kids-cloud {
          position: absolute;
          border-radius: 999px;
          background: rgba(255,255,255,0.88);
          box-shadow: 0 8px 24px rgba(180,220,255,0.18);
        }
        .kids-cloud::before, .kids-cloud::after {
          content: "";
          position: absolute;
          border-radius: 999px;
          background: inherit;
        }
        .kids-cloud--1 {
          width: 240px; height: 68px;
          top: 14%;
          left: -240px;
          animation: float-cloud 38s linear infinite;
        }
        .kids-cloud--1::before {
          width: 110px; height: 80px;
          top: -36px; left: 40px;
        }
        .kids-cloud--1::after {
          width: 80px; height: 60px;
          top: -22px; left: 120px;
        }
        .kids-cloud--2 {
          width: 180px; height: 52px;
          top: 28%;
          left: -180px;
          animation: float-cloud 52s linear infinite 8s;
        }
        .kids-cloud--2::before {
          width: 80px; height: 60px;
          top: -28px; left: 30px;
        }
        .kids-cloud--2::after {
          width: 60px; height: 44px;
          top: -18px; left: 90px;
        }
        .kids-cloud--3 {
          width: 140px; height: 42px;
          top: 8%;
          left: -140px;
          animation: float-cloud 66s linear infinite 20s;
        }
        .kids-cloud--3::before {
          width: 65px; height: 50px;
          top: -22px; left: 28px;
        }
      `}</style>
    </div>
  );
}
