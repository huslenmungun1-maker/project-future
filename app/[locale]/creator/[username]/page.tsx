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

type ProfileRow = {
  id: string;
  display_name: string | null;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  youtube_url: string | null;
  role: string;
};

type CreatorRow = {
  portfolio_url: string | null;
  content_types: string[];
};

type SeriesRow = {
  id: string;
  title: string | null;
  cover_image_url: string | null;
  cover_url: string | null;
  project_type: string | null;
  published_at: string | null;
  views: number | null;
};

function SocialLink({ href, label }: { href: string; label: string }) {
  const url = href.startsWith("http") ? href : `https://${href}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      style={{
        fontSize: 12,
        color: MUTED,
        textDecoration: "none",
        padding: "4px 12px",
        borderRadius: 9999,
        border: `1px solid ${BORDER}`,
        background: "rgba(255,255,255,0.03)",
        transition: "color 120ms ease, border-color 120ms ease",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.color = TEXT;
        (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.18)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.color = MUTED;
        (e.currentTarget as HTMLElement).style.borderColor = BORDER;
      }}
    >
      {label}
    </a>
  );
}

export default function CreatorPublicProfilePage() {
  const params      = useParams() as Record<string, string>;
  const locale      = params.locale  || "en";
  const username    = params.username || "";

  const [profile,       setProfile]       = useState<ProfileRow | null>(null);
  const [creator,       setCreator]       = useState<CreatorRow | null>(null);
  const [series,        setSeries]        = useState<SeriesRow[]>([]);
  const [followerCount, setFollowerCount] = useState(0);
  const [isFollowing,   setIsFollowing]   = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [followLoading, setFollowLoading] = useState(false);
  const [status,        setStatus]        = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    let alive = true;
    async function load() {
      if (!username) { if (alive) setStatus("error"); return; }

      const { data: p } = await supabase
        .from("profiles")
        .select("id,display_name,username,bio,avatar_url,banner_url,instagram_url,twitter_url,youtube_url,role")
        .eq("username", username)
        .maybeSingle();

      if (!alive) return;
      if (!p || (p.role !== "creator" && p.role !== "owner")) {
        setStatus("error");
        return;
      }
      setProfile(p as ProfileRow);

      const [seriesRes, followsRes, creatorsRes, sessionRes] = await Promise.all([
        supabase
          .from("series")
          .select("id,title,cover_image_url,cover_url,project_type,published_at,views")
          .eq("user_id", p.id)
          .or("published.eq.true,published_at.not.is.null")
          .order("published_at", { ascending: false }),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("followed_id", p.id),
        supabase
          .from("creators")
          .select("portfolio_url,content_types")
          .eq("id", p.id)
          .maybeSingle(),
        supabase.auth.getSession(),
      ]);

      if (!alive) return;
      if (seriesRes.data)   setSeries(seriesRes.data as SeriesRow[]);
      if (followsRes.count) setFollowerCount(followsRes.count);
      if (creatorsRes.data) setCreator(creatorsRes.data as CreatorRow);

      const session = sessionRes.data.session;
      if (session?.user) {
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
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
          <p style={{ color: MUTED, fontSize: 13 }}>Loading…</p>
        </div>
      </main>
    );
  }

  if (status === "error" || !profile) {
    return (
      <main style={{ background: BG, minHeight: "100vh", color: TEXT }}>
        <div style={{ maxWidth: 860, margin: "0 auto", padding: "40px 24px" }}>
          <Link href={`/${locale}/reader`} style={{ color: MUTED, fontSize: 12, textDecoration: "none" }}>
            ← Browse
          </Link>
          <p style={{ color: "#c97a6a", fontSize: 14, marginTop: 16 }}>Creator not found.</p>
        </div>
      </main>
    );
  }

  const isSelf   = currentUserId === profile.id;
  const initials = (profile.display_name || profile.username || "?")[0].toUpperCase();
  const contentTypes: string[] = creator?.content_types ?? [];
  const socialLinks = [
    { href: creator?.portfolio_url,    label: "Portfolio"   },
    { href: profile.instagram_url,     label: "Instagram"   },
    { href: profile.twitter_url,       label: "X / Twitter" },
    { href: profile.youtube_url,       label: "YouTube"     },
  ].filter((s): s is { href: string; label: string } => !!s.href);

  return (
    <main style={{ background: BG, minHeight: "100vh", color: TEXT }}>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px 80px" }}>

        <Link
          href={`/${locale}/reader`}
          style={{ color: MUTED, fontSize: 12, textDecoration: "none", display: "inline-block", marginBottom: 24 }}
        >
          ← Browse
        </Link>

        {/* Profile card */}
        <div style={{
          border: `1px solid ${BORDER}`,
          borderRadius: 20,
          overflow: "hidden",
          marginBottom: 32,
          background: SURFACE,
        }}>

          {/* Banner */}
          <div style={{
            height: 190,
            background: profile.banner_url
              ? `url(${profile.banner_url}) center/cover no-repeat`
              : "linear-gradient(135deg, rgba(182,160,124,0.06) 0%, rgba(40,30,60,0.14) 100%)",
            position: "relative",
          }}>
            {/* Avatar — overlaps bottom of banner */}
            <div style={{
              position: "absolute",
              bottom: -40,
              left: 28,
              width: 80,
              height: 80,
              borderRadius: "50%",
              border: "3px solid #0a0a0c",
              background: profile.avatar_url ? "transparent" : "rgba(182,160,124,0.15)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              flexShrink: 0,
            }}>
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <span style={{ fontSize: 28, fontWeight: 700, color: ACCENT }}>{initials}</span>
              )}
            </div>
          </div>

          {/* Info section */}
          <div style={{ padding: "52px 28px 28px" }}>

            {/* Name row */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 }}>
              <div>
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
                  <p style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>@{profile.username}</p>
                )}
              </div>

              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                {isSelf && (
                  <Link
                    href={`/${locale}/creator/${profile.username}/edit`}
                    style={{
                      padding: "8px 20px",
                      borderRadius: 9999,
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: "none",
                      background: "rgba(255,255,255,0.07)",
                      border: `1px solid ${BORDER}`,
                      color: TEXT,
                    }}
                  >
                    Edit Profile
                  </Link>
                )}
                {!isSelf && currentUserId && (
                  <button
                    onClick={toggleFollow}
                    disabled={followLoading}
                    style={{
                      padding: "8px 20px",
                      borderRadius: 9999,
                      fontWeight: 700,
                      fontSize: 13,
                      cursor: followLoading ? "not-allowed" : "pointer",
                      opacity: followLoading ? 0.6 : 1,
                      background: isFollowing ? SURFACE : ACCENT,
                      color: isFollowing ? TEXT : "#0a0a0c",
                      border: isFollowing ? `1px solid ${BORDER}` : "none",
                      transition: "all 0.18s",
                    }}
                  >
                    {followLoading ? "…" : isFollowing ? "Following" : "Follow"}
                  </button>
                )}
              </div>
            </div>

            {/* Bio */}
            {profile.bio && (
              <p style={{ fontSize: 14, color: "#c8c5be", lineHeight: 1.65, marginBottom: 16, maxWidth: 560 }}>
                {profile.bio}
              </p>
            )}

            {/* Content types */}
            {contentTypes.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
                {contentTypes.map(ct => (
                  <span key={ct} style={{
                    fontSize: 11,
                    padding: "3px 10px",
                    borderRadius: 9999,
                    background: "rgba(182,160,124,0.08)",
                    border: "1px solid rgba(182,160,124,0.18)",
                    color: ACCENT,
                    textTransform: "capitalize",
                  }}>
                    {ct.replace(/_/g, " ")}
                  </span>
                ))}
              </div>
            )}

            {/* Social / portfolio links */}
            {socialLinks.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                {socialLinks.map(s => (
                  <SocialLink key={s.label} href={s.href} label={s.label} />
                ))}
              </div>
            )}

            {/* Stats */}
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
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
        </div>

        {/* Published series */}
        <h2 style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.14em", marginBottom: 16 }}>
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
                <Link key={s.id} href={`/${locale}/reader/series/${s.id}`} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      borderRadius: 14, overflow: "hidden",
                      border: `1px solid ${BORDER}`,
                      background: SURFACE,
                      aspectRatio: "2/3",
                      position: "relative",
                      transition: "transform 0.18s ease",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.transform = "translateY(-4px)")}
                    onMouseLeave={e => (e.currentTarget.style.transform = "translateY(0)")}
                  >
                    {cover ? (
                      <img src={cover} alt={s.title || ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: TEXT, textAlign: "center", lineHeight: 1.3 }}>{s.title}</span>
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
