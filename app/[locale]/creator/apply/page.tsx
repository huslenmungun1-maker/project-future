"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

// ─────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────

type ApplicationStatus = "pending" | "approved" | "rejected";

type ExistingApplication = {
  id: string;
  status: ApplicationStatus;
  display_name: string;
  created_at: string;
  review_notes: string | null;
};

type FormData = {
  display_name: string;
  bio: string;
  content_types: string[];
  content_description: string;
  portfolio_url: string;
  sample_work_url: string;
  motivation: string;
  agreed_to_terms: boolean;
};

// ─────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────

const BG      = "#0a0a0c";
const SURFACE = "#111116";
const BORDER  = "rgba(255,255,255,0.07)";
const TEXT    = "#eceae4";
const MUTED   = "#5e5e6e";
const ACCENT  = "#b6a07c";

const CONTENT_TYPE_OPTIONS = [
  { value: "manga",       label: "Manga" },
  { value: "webtoon",     label: "Webtoon" },
  { value: "illustration",label: "Illustration" },
  { value: "prose",       label: "Prose / Novel" },
  { value: "other",       label: "Other" },
];

const TOTAL_STEPS = 4;
const STEP_LABELS = ["About you", "Your content", "Portfolio", "Final step"];

const EMPTY_FORM: FormData = {
  display_name: "",
  bio: "",
  content_types: [],
  content_description: "",
  portfolio_url: "",
  sample_work_url: "",
  motivation: "",
  agreed_to_terms: false,
};

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

function isValidUrl(val: string) {
  if (!val.trim()) return true;
  try { new URL(val.trim()); return true; } catch { return false; }
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

// ─────────────────────────────────────────────────────────────
//  Page
// ─────────────────────────────────────────────────────────────

export default function CreatorApplyPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";
  const supabase = useMemo(() => createClientComponentClient(), []);

  const [initialized, setInitialized] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [existing, setExisting] = useState<ExistingApplication | null>(null);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace(`/${locale}/login?redirect=/${locale}/creator/apply`);
        return;
      }
      const uid = session.user.id;
      setUserId(uid);

      const { data } = await supabase
        .from("creator_applications")
        .select("id, status, display_name, created_at, review_notes")
        .eq("user_id", uid)
        .maybeSingle();

      if (data) setExisting(data as ExistingApplication);
      setInitialized(true);
    }
    init();
  }, [locale, router, supabase]);

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function toggleContentType(val: string) {
    setForm((prev) => {
      const next = prev.content_types.includes(val)
        ? prev.content_types.filter((v) => v !== val)
        : [...prev.content_types, val];
      return { ...prev, content_types: next };
    });
    setFieldErrors((prev) => ({ ...prev, content_types: undefined }));
  }

  function validateStep(s: number): boolean {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (s === 1) {
      if (!form.display_name.trim()) errors.display_name = "Display name is required.";
      if (!form.bio.trim()) errors.bio = "Bio is required.";
      else if (form.bio.trim().length < 30) errors.bio = "Must be at least 30 characters.";
    }
    if (s === 2) {
      if (form.content_types.length === 0)
        errors.content_types = "Select at least one content type.";
    }
    if (s === 3) {
      if (form.portfolio_url && !isValidUrl(form.portfolio_url))
        errors.portfolio_url = "Enter a valid URL (https://…)";
      if (form.sample_work_url && !isValidUrl(form.sample_work_url))
        errors.sample_work_url = "Enter a valid URL (https://…)";
    }
    if (s === 4) {
      if (!form.motivation.trim()) errors.motivation = "Required.";
      else if (form.motivation.trim().length < 50)
        errors.motivation = "Must be at least 50 characters.";
      if (!form.agreed_to_terms) errors.agreed_to_terms = "You must agree to continue.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNext() {
    if (!validateStep(step)) return;
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleBack() {
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    if (!validateStep(4) || !userId) return;

    setSubmitting(true);
    setSubmitError(null);

    const { error } = await supabase.from("creator_applications").insert({
      user_id: userId,
      display_name: form.display_name.trim(),
      bio: form.bio.trim(),
      content_types: form.content_types,
      content_description: form.content_description.trim() || null,
      portfolio_url: form.portfolio_url.trim() || null,
      sample_work_url: form.sample_work_url.trim() || null,
      motivation: form.motivation.trim(),
      agreed_to_terms: true,
      status: "pending",
    });

    if (error) {
      setSubmitError(error.message);
      setSubmitting(false);
      return;
    }

    setSubmitted(true);
    setSubmitting(false);
  }

  // ── Loading ───────────────────────────────────────────────

  if (!initialized) {
    return (
      <div style={{ background: BG }} className="min-h-screen flex items-center justify-center">
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, opacity: 0.4 }} />
      </div>
    );
  }

  // ── Already applied ───────────────────────────────────────

  if (existing && !submitted) {
    const statusCfg = {
      pending:  { label: "Under review", color: "#c8a840", bg: "rgba(200,168,64,0.1)",  border: "rgba(200,168,64,0.25)" },
      approved: { label: "Approved",     color: "#6ea880", bg: "rgba(110,168,128,0.1)", border: "rgba(110,168,128,0.25)" },
      rejected: { label: "Not accepted", color: "#c85252", bg: "rgba(200,82,82,0.1)",   border: "rgba(200,82,82,0.22)" },
    }[existing.status];

    return (
      <div style={{ background: BG }} className="min-h-screen">
        <main style={{ maxWidth: 480, margin: "0 auto", padding: "52px 24px 80px", color: TEXT }}>
          <Link href={`/${locale}/profile`} style={{ display: "inline-block", fontSize: 12, color: MUTED, textDecoration: "none", marginBottom: 44 }}>
            ← Profile
          </Link>

          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 24, color: TEXT }}>
            Creator application
          </h1>

          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px 20px" }}>
            <span
              style={{
                display: "inline-block",
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "4px 12px",
                borderRadius: 9999,
                background: statusCfg.bg,
                border: `1px solid ${statusCfg.border}`,
                color: statusCfg.color,
                marginBottom: 16,
              }}
            >
              {statusCfg.label}
            </span>

            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, marginBottom: 8 }}>
              Submitted as{" "}
              <span style={{ color: TEXT, fontWeight: 500 }}>{existing.display_name}</span>
              {" "}on{" "}
              {new Date(existing.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}.
            </p>

            {existing.status === "pending" && (
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65 }}>
                Applications are reviewed manually. You will be notified by email once a decision has been made.
              </p>
            )}

            {existing.status === "approved" && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, marginBottom: 16 }}>
                  Your application was approved. Welcome to Enkhverse.
                </p>
                <Link
                  href={`/${locale}/studio`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "9px 22px",
                    borderRadius: 9999,
                    background: ACCENT,
                    color: BG,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: "none",
                  }}
                >
                  Open Studio
                </Link>
              </div>
            )}

            {existing.status === "rejected" && (
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, marginBottom: existing.review_notes ? 14 : 0 }}>
                  Your application was not accepted at this time.
                </p>
                {existing.review_notes && (
                  <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(200,82,82,0.06)", border: "1px solid rgba(200,82,82,0.18)" }}>
                    <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#c85252", marginBottom: 6 }}>
                      Review notes
                    </p>
                    <p style={{ fontSize: 13, color: "#c8a0a0", lineHeight: 1.6 }}>{existing.review_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // ── Success ───────────────────────────────────────────────

  if (submitted) {
    return (
      <div style={{ background: BG }} className="min-h-screen">
        <main style={{ maxWidth: 480, margin: "0 auto", padding: "52px 24px 80px", color: TEXT }}>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "40px 24px", textAlign: "center" }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(110,168,128,0.12)",
                border: "1px solid rgba(110,168,128,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px",
                fontSize: 18,
                color: "#6ea880",
                fontWeight: 700,
              }}
            >
              ✓
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 10, color: TEXT }}>
              Application submitted
            </h1>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65 }}>
              Thank you, <span style={{ color: TEXT, fontWeight: 500 }}>{form.display_name}</span>.
              We review all applications manually and will email you once a decision is made.
            </p>
          </div>
          <div style={{ marginTop: 24 }}>
            <Link href={`/${locale}`} style={{ fontSize: 12, color: "#4a4a56", textDecoration: "none" }}>
              ← Back to home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────
  //  Main form
  // ─────────────────────────────────────────────────────────

  return (
    <div style={{ background: BG }} className="min-h-screen">
      <main style={{ maxWidth: 560, margin: "0 auto", padding: "52px 24px 80px" }}>

        {/* Header */}
        <div style={{ marginBottom: 36 }}>
          <Link href={`/${locale}`} style={{ display: "inline-block", fontSize: 12, color: MUTED, textDecoration: "none", marginBottom: 20 }}>
            ← Home
          </Link>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 8 }}>
            Creator Program
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", color: TEXT, marginBottom: 6 }}>
            Apply to publish
          </h1>
          <p style={{ fontSize: 13, color: MUTED }}>
            Tell us about yourself and what you want to build on Enkhverse.
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} total={TOTAL_STEPS} labels={STEP_LABELS} />

        {/* Layout: form + sidebar */}
        <div style={{ display: "grid", gridTemplateColumns: step > 1 ? "1fr 220px" : "1fr", gap: 12, marginTop: 24 }}>

          {/* Form card */}
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px 20px" }}>
            <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 20 }}>
              Step {step} — {STEP_LABELS[step - 1]}
            </p>

            {step === 1 && (
              <Step1 form={form} errors={fieldErrors} setField={setField} />
            )}
            {step === 2 && (
              <Step2 form={form} errors={fieldErrors} toggleContentType={toggleContentType} setField={setField} />
            )}
            {step === 3 && (
              <Step3 form={form} errors={fieldErrors} setField={setField} />
            )}
            {step === 4 && (
              <Step4 form={form} errors={fieldErrors} setField={setField} />
            )}

            {submitError && (
              <p style={{ fontSize: 12, color: "#c85252", marginTop: 12 }}>{submitError}</p>
            )}

            {/* Nav */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24, paddingTop: 20, borderTop: `1px solid ${BORDER}` }}>
              {step > 1 ? (
                <button type="button" onClick={handleBack} className="btn-dark-ghost text-sm">
                  Back
                </button>
              ) : (
                <span />
              )}
              {step < TOTAL_STEPS ? (
                <button type="button" onClick={handleNext} className="btn-dark text-sm">
                  Continue
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-dark text-sm"
                >
                  {submitting ? "Submitting…" : "Submit application"}
                </button>
              )}
            </div>
          </div>

          {/* Summary sidebar */}
          {step > 1 && (
            <ReviewSummary form={form} currentStep={step} />
          )}
        </div>

      </main>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Step components
// ─────────────────────────────────────────────────────────────

function Step1({
  form,
  errors,
  setField,
}: {
  form: FormData;
  errors: Partial<Record<keyof FormData, string>>;
  setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Field label="Display name" error={errors.display_name} required>
        <input
          type="text"
          value={form.display_name}
          onChange={(e) => setField("display_name", e.target.value)}
          placeholder="The name readers will see"
          className="dark-input"
        />
      </Field>

      <Field
        label="Bio"
        hint="Your background, influences, and what drives you as a creator."
        error={errors.bio}
        required
      >
        <textarea
          value={form.bio}
          onChange={(e) => setField("bio", e.target.value)}
          rows={4}
          placeholder="I'm a self-taught illustrator from…"
          className="dark-input"
          style={{ resize: "none" }}
        />
        <CharCount value={form.bio} min={30} />
      </Field>
    </div>
  );
}

function Step2({
  form,
  errors,
  toggleContentType,
  setField,
}: {
  form: FormData;
  errors: Partial<Record<keyof FormData, string>>;
  toggleContentType: (v: string) => void;
  setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Field label="Content type" error={errors.content_types} required>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>
          {CONTENT_TYPE_OPTIONS.map((opt) => {
            const active = form.content_types.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleContentType(opt.value)}
                style={{
                  padding: "6px 16px",
                  borderRadius: 9999,
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: "pointer",
                  transition: "all 120ms ease",
                  background: active ? ACCENT : "rgba(255,255,255,0.05)",
                  border: `1px solid ${active ? ACCENT : "rgba(255,255,255,0.1)"}`,
                  color: active ? "#0a0a0c" : "#eceae4",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </Field>

      <Field
        label="Describe your content"
        hint="Genre, style, themes — what kind of work do you want to create?"
        error={errors.content_description}
      >
        <textarea
          value={form.content_description}
          onChange={(e) => setField("content_description", e.target.value)}
          rows={3}
          placeholder="Dark fantasy manga with complex world-building…"
          className="dark-input"
          style={{ resize: "none" }}
        />
      </Field>
    </div>
  );
}

function Step3({
  form,
  errors,
  setField,
}: {
  form: FormData;
  errors: Partial<Record<keyof FormData, string>>;
  setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6 }}>
        Both fields are optional, but help us evaluate your application faster.
      </p>

      <Field label="Portfolio URL" error={errors.portfolio_url}>
        <input
          type="url"
          value={form.portfolio_url}
          onChange={(e) => setField("portfolio_url", e.target.value)}
          placeholder="https://your-portfolio.com"
          className="dark-input"
        />
      </Field>

      <Field
        label="Sample work URL"
        hint="A direct link to a piece of work — Pixiv, ArtStation, X, Instagram, etc."
        error={errors.sample_work_url}
      >
        <input
          type="url"
          value={form.sample_work_url}
          onChange={(e) => setField("sample_work_url", e.target.value)}
          placeholder="https://pixiv.net/…"
          className="dark-input"
        />
      </Field>
    </div>
  );
}

function Step4({
  form,
  errors,
  setField,
}: {
  form: FormData;
  errors: Partial<Record<keyof FormData, string>>;
  setField: <K extends keyof FormData>(k: K, v: FormData[K]) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <Field
        label="Why Enkhverse?"
        hint="What do you want to build here? Why this platform?"
        error={errors.motivation}
        required
      >
        <textarea
          value={form.motivation}
          onChange={(e) => setField("motivation", e.target.value)}
          rows={5}
          placeholder="I want to reach readers who appreciate…"
          className="dark-input"
          style={{ resize: "none" }}
        />
        <CharCount value={form.motivation} min={50} />
      </Field>

      <div>
        <label
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            padding: "14px 16px",
            borderRadius: 10,
            cursor: "pointer",
            background: form.agreed_to_terms ? "rgba(182,160,124,0.07)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${form.agreed_to_terms ? "rgba(182,160,124,0.25)" : "rgba(255,255,255,0.08)"}`,
            transition: "all 120ms ease",
          }}
        >
          <input
            type="checkbox"
            checked={form.agreed_to_terms}
            onChange={(e) => setField("agreed_to_terms", e.target.checked)}
            style={{ marginTop: 2, width: 14, height: 14, flexShrink: 0, accentColor: ACCENT, cursor: "pointer" }}
          />
          <span style={{ fontSize: 13, color: "#a8a8b4", lineHeight: 1.65 }}>
            I agree to Enkhverse creator guidelines and understand that my application will be
            reviewed before I can publish content.
          </span>
        </label>
        {errors.agreed_to_terms && (
          <p style={{ fontSize: 12, color: "#c85252", marginTop: 6 }}>{errors.agreed_to_terms}</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Review summary sidebar
// ─────────────────────────────────────────────────────────────

function ReviewSummary({ form, currentStep }: { form: FormData; currentStep: number }) {
  return (
    <div
      style={{
        background: SURFACE,
        border: `1px solid ${BORDER}`,
        borderRadius: 16,
        padding: "20px 16px",
        alignSelf: "flex-start",
      }}
    >
      <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 16 }}>
        So far
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {form.display_name && (
          <SummaryRow label="Name">{form.display_name}</SummaryRow>
        )}
        {currentStep >= 2 && form.content_types.length > 0 && (
          <SummaryRow label="Content">{form.content_types.join(", ")}</SummaryRow>
        )}
        {currentStep >= 3 && form.portfolio_url && (
          <SummaryRow label="Portfolio">{truncate(form.portfolio_url, 32)}</SummaryRow>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: MUTED }}>{label}</span>
      <span style={{ fontSize: 12, color: "#a8a8b4", lineHeight: 1.5 }}>{children}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Shared UI helpers
// ─────────────────────────────────────────────────────────────

function StepIndicator({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {Array.from({ length: total }).map((_, i) => {
          const done    = i + 1 < current;
          const active  = i + 1 === current;
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: 2,
                borderRadius: 9999,
                background: done
                  ? "rgba(182,160,124,0.5)"
                  : active
                  ? ACCENT
                  : "rgba(255,255,255,0.08)",
                transition: "all 300ms ease",
              }}
            />
          );
        })}
      </div>
      <p style={{ fontSize: 11, color: MUTED }}>
        Step {current} of {total}
        <span style={{ color: "#4a4a56" }}> — {labels[current - 1]}</span>
      </p>
    </div>
  );
}

function Field({
  label,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED }}>
        {label}
        {required && <span style={{ color: "#c85252", marginLeft: 3 }}>*</span>}
      </label>
      {hint && (
        <p style={{ fontSize: 12, color: "#4a4a56", lineHeight: 1.5, marginBottom: 2 }}>{hint}</p>
      )}
      {children}
      {error && (
        <p style={{ fontSize: 12, color: "#c85252" }}>{error}</p>
      )}
    </div>
  );
}

function CharCount({ value, min }: { value: string; min: number }) {
  const len = value.trim().length;
  const ok  = len >= min;
  return (
    <p style={{ textAlign: "right", fontSize: 11, color: ok ? ACCENT : MUTED, marginTop: 4 }}>
      {len} / {min} min
    </p>
  );
}
