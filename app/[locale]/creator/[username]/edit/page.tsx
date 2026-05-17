"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";
import { CONTENT_TYPES } from "@/lib/publisher-options";

const BG      = "#0a0a0c";
const SURFACE = "#111116";
const SURFACE2= "#18181f";
const BORDER  = "rgba(255,255,255,0.07)";
const TEXT    = "#eceae4";
const MUTED   = "#5e5e6e";
const ACCENT  = "#b6a07c";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "20px", marginBottom: 12 }}>
      <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: MUTED, marginBottom: 16 }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text", rows,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  rows?: number;
}) {
  const base: React.CSSProperties = {
    width: "100%",
    background: SURFACE2,
    border: `1px solid ${BORDER}`,
    borderRadius: 10,
    padding: "9px 12px",
    fontSize: 13,
    color: TEXT,
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
    resize: rows ? "vertical" : undefined,
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
      <label style={{ fontSize: 11, fontWeight: 600, color: MUTED }}>{label}</label>
      {rows ? (
        <textarea
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          style={base}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          style={base}
        />
      )}
    </div>
  );
}

export default function EditCreatorProfilePage() {
  const params   = useParams();
  const router   = useRouter();
  const locale   = (params?.locale   as string) || "en";
  const username = (params?.username as string) || "";

  const supabase = useMemo(() =>
    createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    ), []);

  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [saved,     setSaved]     = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Form fields
  const [displayName,   setDisplayName]   = useState("");
  const [usernameVal,   setUsernameVal]   = useState("");
  const [bio,           setBio]           = useState("");
  const [avatarUrl,     setAvatarUrl]     = useState("");
  const [bannerUrl,     setBannerUrl]     = useState("");
  const [portfolioUrl,  setPortfolioUrl]  = useState("");
  const [instagramUrl,  setInstagramUrl]  = useState("");
  const [twitterUrl,    setTwitterUrl]    = useState("");
  const [youtubeUrl,    setYoutubeUrl]    = useState("");
  const [contentTypes,  setContentTypes]  = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace(`/${locale}/login?redirect=/${locale}/creator/${username}/edit`);
        return;
      }

      const { data: p } = await supabase
        .from("profiles")
        .select("id,display_name,username,bio,avatar_url,banner_url,instagram_url,twitter_url,youtube_url,role")
        .eq("username", username)
        .maybeSingle();

      if (!p || p.id !== session.user.id) {
        router.replace(`/${locale}/creator/${username}`);
        return;
      }

      setProfileId(p.id);
      setDisplayName(p.display_name  || "");
      setUsernameVal(p.username      || "");
      setBio(p.bio                   || "");
      setAvatarUrl(p.avatar_url      || "");
      setBannerUrl(p.banner_url      || "");
      setInstagramUrl(p.instagram_url || "");
      setTwitterUrl(p.twitter_url    || "");
      setYoutubeUrl(p.youtube_url    || "");

      const { data: cr } = await supabase
        .from("creators")
        .select("portfolio_url,content_types")
        .eq("id", p.id)
        .maybeSingle();

      if (cr) {
        setPortfolioUrl(cr.portfolio_url || "");
        setContentTypes(cr.content_types || []);
      }

      setLoading(false);
    }
    load();
  }, [username, supabase, locale, router]);

  function toggleContentType(val: string) {
    setContentTypes(prev =>
      prev.includes(val) ? prev.filter(v => v !== val) : [...prev, val]
    );
  }

  async function handleSave() {
    if (!profileId) return;
    setSaving(true);
    setError(null);

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        display_name:  displayName.trim()   || null,
        username:      usernameVal.trim()   || null,
        bio:           bio.trim()           || null,
        avatar_url:    avatarUrl.trim()     || null,
        banner_url:    bannerUrl.trim()     || null,
        instagram_url: instagramUrl.trim()  || null,
        twitter_url:   twitterUrl.trim()    || null,
        youtube_url:   youtubeUrl.trim()    || null,
      })
      .eq("id", profileId);

    if (profileError) {
      setError(
        profileError.code === "23505"
          ? "That username is already taken."
          : profileError.message
      );
      setSaving(false);
      return;
    }

    // Update creators row — errors silently ignored for owners without one
    await supabase
      .from("creators")
      .update({
        display_name:  displayName.trim() || "",
        bio:           bio.trim()         || null,
        portfolio_url: portfolioUrl.trim() || null,
        content_types: contentTypes,
      })
      .eq("id", profileId);

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);

    const newUsername = usernameVal.trim();
    if (newUsername && newUsername !== username) {
      router.replace(`/${locale}/creator/${newUsername}/edit`);
    }
  }

  if (loading) {
    return (
      <div style={{ background: BG }} className="min-h-screen flex items-center justify-center">
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, opacity: 0.5 }} />
      </div>
    );
  }

  return (
    <div style={{ background: BG }} className="min-h-screen">
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "52px 24px 80px", color: TEXT }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 36 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 6 }}>
              Creator
            </p>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: TEXT }}>
              Edit Profile
            </h1>
          </div>
          <Link
            href={`/${locale}/creator/${username}`}
            style={{ fontSize: 12, color: MUTED, textDecoration: "none" }}
          >
            ← View profile
          </Link>
        </div>

        {/* Identity */}
        <Section title="Identity">
          <Field
            label="Display name"
            value={displayName}
            onChange={setDisplayName}
            placeholder="Your public name"
          />
          <Field
            label="Username"
            value={usernameVal}
            onChange={setUsernameVal}
            placeholder="your_handle"
          />
        </Section>

        {/* About */}
        <Section title="About">
          <Field
            label="Bio"
            value={bio}
            onChange={setBio}
            placeholder="Tell readers about yourself…"
            rows={4}
          />
        </Section>

        {/* Images */}
        <Section title="Images">
          <Field
            label="Avatar URL"
            value={avatarUrl}
            onChange={setAvatarUrl}
            placeholder="https://…"
          />
          {avatarUrl && (
            <div style={{ marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
              <img
                src={avatarUrl}
                alt="Avatar preview"
                style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", border: `1px solid ${BORDER}` }}
                onError={e => (e.currentTarget.style.display = "none")}
              />
              <span style={{ fontSize: 11, color: MUTED }}>Avatar preview</span>
            </div>
          )}
          <Field
            label="Banner URL"
            value={bannerUrl}
            onChange={setBannerUrl}
            placeholder="https://…"
          />
          {bannerUrl && (
            <div style={{ marginBottom: 14 }}>
              <img
                src={bannerUrl}
                alt="Banner preview"
                style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 10, border: `1px solid ${BORDER}` }}
                onError={e => (e.currentTarget.style.display = "none")}
              />
            </div>
          )}
        </Section>

        {/* Links */}
        <Section title="Links">
          <Field
            label="Portfolio"
            value={portfolioUrl}
            onChange={setPortfolioUrl}
            placeholder="https://yoursite.com"
          />
          <Field
            label="Instagram"
            value={instagramUrl}
            onChange={setInstagramUrl}
            placeholder="https://instagram.com/yourhandle"
          />
          <Field
            label="X / Twitter"
            value={twitterUrl}
            onChange={setTwitterUrl}
            placeholder="https://x.com/yourhandle"
          />
          <Field
            label="YouTube"
            value={youtubeUrl}
            onChange={setYoutubeUrl}
            placeholder="https://youtube.com/@yourchannel"
          />
        </Section>

        {/* Content types */}
        <Section title="Content Types">
          <p style={{ fontSize: 12, color: MUTED, marginBottom: 14 }}>
            Select the types of content you create.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {CONTENT_TYPES.map(ct => {
              const active = contentTypes.includes(ct.value);
              return (
                <button
                  key={ct.value}
                  onClick={() => toggleContentType(ct.value)}
                  style={{
                    padding: "5px 14px",
                    borderRadius: 9999,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: "pointer",
                    border: active
                      ? "1px solid rgba(182,160,124,0.45)"
                      : `1px solid ${BORDER}`,
                    background: active
                      ? "rgba(182,160,124,0.1)"
                      : "transparent",
                    color: active ? ACCENT : MUTED,
                    transition: "all 120ms ease",
                  }}
                >
                  {ct.label.en}
                </button>
              );
            })}
          </div>
        </Section>

        {/* Error */}
        {error && (
          <div style={{
            padding: "12px 16px", borderRadius: 12, marginBottom: 12,
            background: "rgba(200,82,82,0.08)", border: "1px solid rgba(200,82,82,0.22)",
            color: "#c85252", fontSize: 13,
          }}>
            {error}
          </div>
        )}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: 12,
            background: saved ? "rgba(110,168,128,0.15)" : ACCENT,
            border: saved ? "1px solid rgba(110,168,128,0.35)" : "none",
            color: saved ? "#6ea880" : "#0a0a0c",
            fontSize: 14,
            fontWeight: 700,
            cursor: saving ? "not-allowed" : "pointer",
            opacity: saving ? 0.7 : 1,
            transition: "all 160ms ease",
          }}
        >
          {saving ? "Saving…" : saved ? "Saved" : "Save Changes"}
        </button>

      </main>
    </div>
  );
}
