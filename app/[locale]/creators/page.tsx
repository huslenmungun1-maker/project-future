"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BG      = "#0a0a0c";
const SURFACE = "rgba(255,255,255,0.03)";
const BORDER  = "rgba(255,255,255,0.08)";
const TEXT    = "#eceae4";
const MUTED   = "#7a7870";
const ACCENT  = "#b6a07c";

type CreatorCard = {
  id: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: string;
  seriesCount: number;
  content_types: string[];
};

export default function CreatorsPage() {
  const params = useParams() as Record<string, string>;
  const locale = params.locale || "en";

  const [creators, setCreators] = useState<CreatorCard[]>([]);
  const [status, setStatus] = useState<"loading" | "ok">("loading");

  useEffect(() => {
    async function load() {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, display_name, username, bio, avatar_url, role")
        .in("role", ["creator", "owner"])
        .not("username", "is", null)
        .order("display_name", { ascending: true });

      if (!profiles || profiles.length === 0) {
        setCreators([]);
        setStatus("ok");
        return;
      }

      const ids = (profiles as { id: string }[]).map((p) => p.id);

      const [seriesRes, creatorsRes] = await Promise.all([
        supabase
          .from("series")
          .select("user_id")
          .in("user_id", ids)
          .or("published.eq.true,published_at.not.is.null"),
        supabase
          .from("creators")
          .select("id, content_types")
          .in("id", ids),
      ]);

      const countMap: Record<string, number> = {};
      for (const s of (seriesRes.data || []) as { user_id: string }[]) {
        countMap[s.user_id] = (countMap[s.user_id] || 0) + 1;
      }

      const ctMap: Record<string, string[]> = {};
      for (const c of (creatorsRes.data || []) as { id: string; content_types: string[] }[]) {
        ctMap[c.id] = c.content_types || [];
      }

      setCreators(
        (profiles as { id: string; display_name: string | null; username: string | null; bio: string | null; avatar_url: string | null; role: string }[]).map((p) => ({
          id: p.id,
          display_name: p.display_name,
          username: p.username,
          bio: p.bio,
          avatar_url: p.avatar_url,
          role: p.role,
          seriesCount: countMap[p.id] || 0,
          content_types: ctMap[p.id] || [],
        }))
      );
      setStatus("ok");
    }

    load();
  }, []);

  if (status === "loading") {
    return (
      <div style={{ background: BG, minHeight: "100vh" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "52px 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="skeleton-dark rounded-[20px]"
                style={{ height: 160, animationDelay: `${i * 50}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "52px 24px 80px" }}>

        <Link
          href={`/${locale}/reader`}
          style={{ fontSize: 12, color: MUTED, textDecoration: "none", display: "inline-block", marginBottom: 40 }}
        >
          ← Browse
        </Link>

        <div style={{ marginBottom: 40 }}>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 8 }}>
            Discover
          </p>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: "-0.02em", color: TEXT, margin: 0 }}>
            Creators
          </h1>
        </div>

        {creators.length === 0 ? (
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 16, padding: "32px 24px", color: MUTED, fontSize: 14 }}>
            No creators yet.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 16 }}>
            {creators.map((c) => {
              const initials = (c.display_name || c.username || "?")[0].toUpperCase();
              return (
                <Link
                  key={c.id}
                  href={`/${locale}/creator/${c.username}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      border: `1px solid ${BORDER}`,
                      borderRadius: 20,
                      padding: "20px",
                      background: SURFACE,
                      transition: "border-color 150ms ease, background 150ms ease",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.16)";
                      (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.borderColor = BORDER;
                      (e.currentTarget as HTMLElement).style.background = SURFACE;
                    }}
                  >
                    {/* Avatar + name */}
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                        background: c.avatar_url ? "transparent" : "rgba(182,160,124,0.15)",
                        border: `1px solid ${BORDER}`,
                        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                      }}>
                        {c.avatar_url ? (
                          <img src={c.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: 18, fontWeight: 700, color: ACCENT }}>{initials}</span>
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: 700, color: TEXT, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                          {c.display_name || c.username}
                        </p>
                        {c.username && (
                          <p style={{ fontSize: 11, color: MUTED, marginTop: 2, margin: 0 }}>@{c.username}</p>
                        )}
                      </div>
                    </div>

                    {/* Bio */}
                    {c.bio && (
                      <p style={{
                        fontSize: 12, color: "#9e9b94", lineHeight: 1.55, marginBottom: 12,
                        display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
                        overflow: "hidden", margin: "0 0 12px",
                      }}>
                        {c.bio}
                      </p>
                    )}

                    {/* Content types */}
                    {c.content_types.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 12 }}>
                        {c.content_types.slice(0, 3).map((ct) => (
                          <span key={ct} style={{
                            fontSize: 10, padding: "2px 8px", borderRadius: 9999,
                            background: "rgba(182,160,124,0.08)", border: "1px solid rgba(182,160,124,0.16)",
                            color: ACCENT, textTransform: "capitalize",
                          }}>
                            {ct.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Series count */}
                    <p style={{ fontSize: 11, color: MUTED, margin: 0 }}>
                      {c.seriesCount} {c.seriesCount === 1 ? "series" : "series"} published
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
