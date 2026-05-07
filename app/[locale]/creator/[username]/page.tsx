"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const BG = "#0a0a0c";
const SURFACE = "rgba(255,255,255,0.03)";
const BORDER = "rgba(255,255,255,0.08)";
const TEXT = "#eceae4";
const MUTED = "#7a7870";
const ACCENT = "#b6a07c";

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  role: string;
};

type SeriesRow = {
  id: string;
  title: string | null;
  description: string | null;
  cover_image_url: string | null;
  cover_url: string | null;
  project_type: string | null;
  published_at: string | null;
  views: number | null;
};

export default function CreatorPublicProfilePage() {
  const params = useParams() as Record<string, string>;
  const locale = params.locale || "en";
  const username = params.username || "";

  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [series, setSeries] = useState<SeriesRow[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!username) { if (alive) setStatus("error"); return; }

      const { data: p } = await supabase
        .from("profiles")
        .select("id,display_name,username,bio,avatar_url,role")
        .eq("username", username)
        .maybeSingle();

      if (!alive) return;
      if (!p || (p.role !== "creator" && p.role !== "owner")) {
        setStatus("error");
        return;
      }
      setProfile(p as ProfileRow);

      const { data: s } = await supabase
        .from("series")
        .select("id,title,description,cover_image_url,cover_url,project_type,published_at,views")
        .eq("user_id", p.id)
        .or("published.eq.true,published_at.not.is.null")
        .order("published_at", { ascending: false });

      if (alive) setSeries((s as SeriesRow[]) || []);

      const { count: fc } = await supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("followed_id", p.id);
      if (alive) setFollowerCount(fc ?? 0);

      const { data: { session } } = await supabase.auth.getSession();
      if (alive && session?.user) {
        setCurrentUserId(session.user.id);
        if (session.user.id !== p.id) {
          const { data: followRow } = await supabase
            .from("follows")
            .select("follower_id")
            .eq("follower_id", session.user.id)
            .eq("followed_id", p.id)
            .maybeSingle();
          if (alive) setIsFollowing(!!followRow);
        }
      }

      if (alive) setStatus("ok");
    }
    load();
    return () => { alive = false; };
  }, [username]);

  async function toggleFollow() {
    if (!profile || !currentUserId || currentUserId === profile.id) return;
    setFollowLoading(true);

    if (isFollowing) {
      await supabase.from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("followed_id", profile.id);
      setIsFollowing(false);
      setFollowerCount(c => Math.max(0, c - 1));
    } else {
      await supabase.from("follows")
        .insert({ follower_id: currentUserId, followed_id: profile.id });
      setIsFollowing(true);
      setFollowerCount(c => c + 1);
    }

    setFollowLoading(false);
  }

  if (status === "loading") {
    return (
      <main style={{ background: BG, minHeight: "100vh", color: TEXT }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
          <p style={{ color: MUTED, fontSize: 13 }}>Loading…</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !profile) {
    return (
      <main style={{ background: BG, minHeight: "100vh", color: TEXT }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "40px 24px" }}>
          <Link href={`/${locale}/reader`}
            style={{ color: MUTED, fontSize: 12, textDecoration: "none" }}
          >
            ← Browse
          </Link>
          <p style={{ color: "#c97a6a", fontSize: 14, marginTop: 16 }}>Creator not found.</p>
        </div>
      </main>
    );
  }

  const isSelf = currentUserId === profile.id;
  const initials = (profile.display_name || profile.username || "?")[0].toUpperCase();

  return (
    <main style={{ background: BG, minHeight: "100vh", color: TEXT }}>
      <div style={{ maxWidth: 960, margin: "0 auto", padding: "36px 24px" }}>

        <Link href={`/${locale}/reader`}
          style={{ color: MUTED, fontSize: 12, textDecoration: "none", display: "inline-block", marginBottom: 28 }}
        >
          ← Browse
        </Link>

        {/* Profile card */}
        <div style={{
          background: SURFACE, border: `1px solid ${BORDER}`,
          borderRadius: 24, padding: "32px", marginBottom: 32,
          display: "flex", alignItems: "flex-start", gap: 24, flexWrap: "wrap",
        }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72, borderRadius: "50%", flexShrink: 0,
            background: profile.avatar_url ? "transparent" : "rgba(182,160,124,0.15)",
            border: `2px solid rgba(182,160,124,0.2)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            overflow: "hidden",
          }}>
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 26, fontWeight: 700, color: ACCENT }}>{initials}</span>
            )}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: TEXT, margin: 0 }}>
                {profile.display_name || profile.username}
              </h1>
              {profile.role === "owner" && (
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 9999,
                  background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.2)",
                  color: "#c9a84c",
                }}>
                  Owner
                </span>
              )}
            </div>

            {profile.username && (
              <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>@{profile.username}</p>
            )}

            {profile.bio && (
              <p style={{ fontSize: 14, color: TEXT, lineHeight: 1.6, marginTop: 10, maxWidth: 500 }}>
                {profile.bio}
              </p>
            )}

            <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 14 }}>
              <div>
                <span style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>{followerCount.toLocaleString()}</span>
                <span style={{ fontSize: 12, color: MUTED, marginLeft: 5 }}>followers</span>
              </div>
              <div>
                <span style={{ fontSize: 18, fontWeight: 700, color: TEXT }}>{series.length}</span>
                <span style={{ fontSize: 12, color: MUTED, marginLeft: 5 }}>series</span>
              </div>
            </div>
          </div>

          {/* Follow button */}
          {!isSelf && currentUserId && (
            <button
              onClick={toggleFollow}
              disabled={followLoading}
              style={{
                padding: "10px 24px", borderRadius: 9999, fontWeight: 700,
                fontSize: 13, cursor: followLoading ? "not-allowed" : "pointer",
                opacity: followLoading ? 0.6 : 1,
                background: isFollowing ? SURFACE : ACCENT,
                color: isFollowing ? TEXT : "#0a0a0c",
                border: isFollowing ? `1px solid ${BORDER}` : "none",
                transition: "all 0.2s",
              }}
            >
              {followLoading ? "…" : isFollowing ? "Following" : "Follow"}
            </button>
          )}
        </div>

        {/* Published series */}
        <h2 style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 16 }}>
          Published Series
        </h2>

        {series.length === 0 ? (
          <div style={{
            background: SURFACE, border: `1px solid ${BORDER}`,
            borderRadius: 16, padding: "20px 24px",
            color: MUTED, fontSize: 13,
          }}>
            No published series yet.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 20 }}>
            {series.map(s => {
              const cover = s.cover_image_url || s.cover_url || "";
              return (
                <Link
                  key={s.id}
                  href={`/${locale}/reader/series/${s.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div style={{
                    borderRadius: 16, overflow: "hidden",
                    border: `1px solid ${BORDER}`,
                    background: SURFACE,
                    aspectRatio: "2/3",
                    position: "relative",
                    transition: "transform 0.2s",
                  }}
                    onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
                    onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
                  >
                    {cover ? (
                      <img src={cover} alt={s.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: TEXT, textAlign: "center", lineHeight: 1.3 }}>
                          {s.title}
                        </span>
                      </div>
                    )}
                    {s.project_type && (
                      <div style={{
                        position: "absolute", bottom: 8, left: 8,
                        fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 9999,
                        background: "rgba(10,10,12,0.75)", color: ACCENT,
                        backdropFilter: "blur(4px)",
                      }}>
                        {s.project_type}
                      </div>
                    )}
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: TEXT, lineHeight: 1.3 }}>
                      {s.title || "Untitled"}
                    </p>
                    <p style={{ fontSize: 11, color: MUTED, marginTop: 2 }}>
                      {(s.views ?? 0).toLocaleString()} views
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
