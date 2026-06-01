"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

const BG     = "#0a0a0c";
const TEXT   = "#eceae4";
const MUTED  = "#5e5e6e";
const BORDER = "rgba(255,255,255,0.07)";
const ACCENT = "#b6a07c";

export default function ContractsPage() {
  const params = useParams();
  const locale = (params?.locale as string) || "en";

  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "52px 24px 80px" }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 16, marginBottom: 40 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 6 }}>
              Company
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: TEXT }}>
              Contracts
            </h1>
          </div>
          <Link href={`/${locale}`} style={{ fontSize: 12, color: MUTED, textDecoration: "none" }}>
            ← Home
          </Link>
        </div>

        <div style={{
          padding: "56px 24px", textAlign: "center",
          background: "#111116", border: `1px solid ${BORDER}`, borderRadius: 18,
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%", margin: "0 auto 20px",
            background: `${ACCENT}18`, border: `1px solid ${ACCENT}33`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20,
          }}>
            📋
          </div>
          <p style={{ fontSize: 15, fontWeight: 600, color: TEXT, marginBottom: 8 }}>
            Contract management coming soon
          </p>
          <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, maxWidth: 380, margin: "0 auto" }}>
            This is where you&apos;ll create and manage contracts with creators.
            Check back soon.
          </p>
        </div>
      </div>
    </div>
  );
}
