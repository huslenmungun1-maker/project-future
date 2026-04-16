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

const CONTENT_TYPE_OPTIONS = [
  { value: "manga", label: "Manga" },
  { value: "webtoon", label: "Webtoon" },
  { value: "illustration", label: "Illustration" },
  { value: "prose", label: "Prose / Novel" },
  { value: "other", label: "Other" },
];

const TOTAL_STEPS = 4;

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
//  Step labels
// ─────────────────────────────────────────────────────────────

const STEP_LABELS = ["About you", "Your content", "Portfolio", "Final step"];

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

function isValidUrl(val: string) {
  if (!val.trim()) return true; // optional fields
  try {
    new URL(val.trim());
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────
//  Page
// ─────────────────────────────────────────────────────────────

export default function CreatorApplyPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";
  const supabase = useMemo(() => createClientComponentClient(), []);

  // Auth state
  const [authChecked, setAuthChecked] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Existing application check
  const [existing, setExisting] = useState<ExistingApplication | null>(null);
  const [checkingExisting, setCheckingExisting] = useState(false);

  // Form
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // ── Auth check ────────────────────────────────────────────

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace(`/${locale}/login?redirect=/${locale}/creator/apply`);
        return;
      }
      setUserId(session.user.id);
      setAuthChecked(true);
    }
    checkAuth();
  }, [locale, router, supabase]);

  // ── Check for existing application ────────────────────────

  useEffect(() => {
    if (!userId) return;
    async function checkExisting() {
      setCheckingExisting(true);
      const { data } = await supabase
        .from("creator_applications")
        .select("id, status, display_name, created_at, review_notes")
        .eq("user_id", userId)
        .maybeSingle();

      if (data) setExisting(data as ExistingApplication);
      setCheckingExisting(false);
    }
    checkExisting();
  }, [userId, supabase]);

  // ── Field helpers ─────────────────────────────────────────

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

  // ── Validation per step ───────────────────────────────────

  function validateStep(s: number): boolean {
    const errors: Partial<Record<keyof FormData, string>> = {};

    if (s === 1) {
      if (!form.display_name.trim()) errors.display_name = "Display name is required.";
      if (!form.bio.trim()) errors.bio = "Bio is required.";
      else if (form.bio.trim().length < 30) errors.bio = "Bio must be at least 30 characters.";
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
      if (!form.motivation.trim()) errors.motivation = "Motivation is required.";
      else if (form.motivation.trim().length < 50)
        errors.motivation = "Please write at least 50 characters.";
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

  // ── Submit ────────────────────────────────────────────────

  async function handleSubmit() {
    if (!validateStep(4)) return;
    if (!userId) return;

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

  // ─────────────────────────────────────────────────────────
  //  Loading / redirect states
  // ─────────────────────────────────────────────────────────

  if (!authChecked || checkingExisting) {
    return (
      <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <div className="mx-auto max-w-xl px-6 py-16 text-sm" style={{ color: "var(--muted)" }}>
          Checking your account…
        </div>
      </main>
    );
  }

  // ── Already applied ───────────────────────────────────────

  if (existing && !submitted) {
    return (
      <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <div className="mx-auto max-w-xl px-6 py-16 space-y-6">
          <h1 className="text-2xl font-semibold tracking-tight">Creator application</h1>

          <div
            className="rounded-[24px] p-6 space-y-3"
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <StatusBadge status={existing.status} />

            <p className="text-sm" style={{ color: "var(--muted)" }}>
              You submitted an application as{" "}
              <span className="font-semibold" style={{ color: "var(--text)" }}>
                {existing.display_name}
              </span>{" "}
              on{" "}
              {new Date(existing.created_at).toLocaleDateString("en-GB", {
                dateStyle: "medium",
              })}
              .
            </p>

            {existing.status === "pending" && (
              <p className="text-sm" style={{ color: "var(--muted)" }}>
                We review applications manually. You'll hear back via email once a decision is made.
              </p>
            )}

            {existing.status === "approved" && (
              <p className="text-sm" style={{ color: "var(--accent)" }}>
                Your application was approved. Welcome to Enkhverse!
              </p>
            )}

            {existing.status === "rejected" && (
              <>
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  Your application wasn't accepted this time.
                </p>
                {existing.review_notes && (
                  <p
                    className="rounded-2xl px-4 py-3 text-sm"
                    style={{
                      background: "rgba(122,46,46,0.06)",
                      border: "1px solid rgba(122,46,46,0.15)",
                      color: "var(--danger)",
                    }}
                  >
                    {existing.review_notes}
                  </p>
                )}
              </>
            )}
          </div>

          <Link
            href={`/${locale}`}
            className="inline-block text-sm transition hover:opacity-70"
            style={{ color: "var(--muted)" }}
          >
            ← Back to home
          </Link>
        </div>
      </main>
    );
  }

  // ── Success ───────────────────────────────────────────────

  if (submitted) {
    return (
      <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
        <div className="mx-auto max-w-xl px-6 py-16 space-y-6">
          <div
            className="rounded-[24px] p-8 space-y-4 text-center"
            style={{
              background: "var(--panel)",
              border: "1px solid var(--border)",
              boxShadow: "var(--shadow-soft)",
            }}
          >
            <div
              className="mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl"
              style={{ background: "rgba(94,99,87,0.12)" }}
            >
              ✓
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Application submitted</h1>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Thanks, <strong>{form.display_name}</strong>. We review all applications manually and
              will email you once a decision is made.
            </p>
          </div>

          <Link
            href={`/${locale}`}
            className="inline-block text-sm transition hover:opacity-70"
            style={{ color: "var(--muted)" }}
          >
            ← Back to home
          </Link>
        </div>
      </main>
    );
  }

  // ─────────────────────────────────────────────────────────
  //  Main form
  // ─────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen" style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="mx-auto max-w-xl px-6 py-10 space-y-6">

        {/* Header */}
        <div className="space-y-1">
          <Link
            href={`/${locale}`}
            className="text-xs transition hover:opacity-70"
            style={{ color: "var(--muted)" }}
          >
            ← Back to home
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Become a creator</h1>
          <p className="text-sm" style={{ color: "var(--muted)" }}>
            Tell us about yourself and the work you want to bring to Enkhverse.
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} total={TOTAL_STEPS} labels={STEP_LABELS} />

        {/* Form card */}
        <div
          className="rounded-[24px] p-6 space-y-5"
          style={{
            background: "var(--panel)",
            border: "1px solid var(--border)",
            boxShadow: "var(--shadow-soft)",
          }}
        >
          <h2 className="text-base font-semibold">
            Step {step} — {STEP_LABELS[step - 1]}
          </h2>

          {step === 1 && (
            <Step1
              form={form}
              errors={fieldErrors}
              setField={setField}
            />
          )}

          {step === 2 && (
            <Step2
              form={form}
              errors={fieldErrors}
              toggleContentType={toggleContentType}
              setField={setField}
            />
          )}

          {step === 3 && (
            <Step3
              form={form}
              errors={fieldErrors}
              setField={setField}
            />
          )}

          {step === 4 && (
            <Step4
              form={form}
              errors={fieldErrors}
              setField={setField}
            />
          )}

          {submitError && (
            <p className="text-xs" style={{ color: "var(--danger)" }}>
              {submitError}
            </p>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between gap-3 pt-2">
            {step > 1 ? (
              <button
                type="button"
                onClick={handleBack}
                className="btn-ios-secondary text-sm"
              >
                Back
              </button>
            ) : (
              <span />
            )}

            {step < TOTAL_STEPS ? (
              <button
                type="button"
                onClick={handleNext}
                className="btn-ios text-sm"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-ios text-sm disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit application"}
              </button>
            )}
          </div>
        </div>

        {/* Summary sidebar — shown from step 2 onwards */}
        {step > 1 && (
          <ReviewSummary form={form} currentStep={step} />
        )}
      </div>
    </main>
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
    <div className="space-y-4">
      <Field label="Display name" error={errors.display_name} required>
        <input
          type="text"
          value={form.display_name}
          onChange={(e) => setField("display_name", e.target.value)}
          placeholder="The name readers will see"
          className="soft-input w-full"
        />
      </Field>

      <Field
        label="Bio"
        hint="Introduce yourself as a creator — your background, influences, what drives you."
        error={errors.bio}
        required
      >
        <textarea
          value={form.bio}
          onChange={(e) => setField("bio", e.target.value)}
          rows={4}
          placeholder="I'm a self-taught illustrator from…"
          className="soft-input w-full resize-none"
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
    <div className="space-y-4">
      <Field label="Content type" error={errors.content_types} required>
        <div className="flex flex-wrap gap-2 pt-1">
          {CONTENT_TYPE_OPTIONS.map((opt) => {
            const active = form.content_types.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleContentType(opt.value)}
                className="rounded-full px-4 py-2 text-xs font-medium transition"
                style={{
                  background: active ? "var(--accent)" : "rgba(255,255,255,0.7)",
                  border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                  color: active ? "#f8f7f3" : "var(--text)",
                  boxShadow: "var(--shadow-soft)",
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
        hint="What kind of stories or art do you want to create? Genre, style, themes."
        error={errors.content_description}
      >
        <textarea
          value={form.content_description}
          onChange={(e) => setField("content_description", e.target.value)}
          rows={3}
          placeholder="Dark fantasy manga with strong female protagonists…"
          className="soft-input w-full resize-none"
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
    <div className="space-y-4">
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Links are optional but help us evaluate your application faster.
      </p>

      <Field label="Portfolio URL" error={errors.portfolio_url}>
        <input
          type="url"
          value={form.portfolio_url}
          onChange={(e) => setField("portfolio_url", e.target.value)}
          placeholder="https://your-portfolio.com"
          className="soft-input w-full"
        />
      </Field>

      <Field
        label="Sample work URL"
        hint="A direct link to a piece of work — Pixiv, Twitter/X, ArtStation, Instagram, etc."
        error={errors.sample_work_url}
      >
        <input
          type="url"
          value={form.sample_work_url}
          onChange={(e) => setField("sample_work_url", e.target.value)}
          placeholder="https://pixiv.net/…"
          className="soft-input w-full"
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
    <div className="space-y-4">
      <Field
        label="Why Enkhverse?"
        hint="What do you want to build here? Why this platform over others?"
        error={errors.motivation}
        required
      >
        <textarea
          value={form.motivation}
          onChange={(e) => setField("motivation", e.target.value)}
          rows={5}
          placeholder="I want to reach readers who appreciate…"
          className="soft-input w-full resize-none"
        />
        <CharCount value={form.motivation} min={50} />
      </Field>

      <div className="space-y-1">
        <label
          className="flex cursor-pointer items-start gap-3 rounded-2xl px-4 py-3"
          style={{
            background: form.agreed_to_terms
              ? "rgba(94,99,87,0.08)"
              : "rgba(255,255,255,0.6)",
            border: `1px solid ${form.agreed_to_terms ? "rgba(94,99,87,0.3)" : "var(--border)"}`,
          }}
        >
          <input
            type="checkbox"
            checked={form.agreed_to_terms}
            onChange={(e) => setField("agreed_to_terms", e.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--accent)]"
          />
          <span className="text-sm leading-relaxed" style={{ color: "var(--text)" }}>
            I agree to Enkhverse's creator guidelines and understand that my application
            will be reviewed before I can publish content.
          </span>
        </label>
        {errors.agreed_to_terms && (
          <p className="pl-1 text-xs" style={{ color: "var(--danger)" }}>
            {errors.agreed_to_terms}
          </p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  Review summary (shown alongside steps 2–4)
// ─────────────────────────────────────────────────────────────

function ReviewSummary({ form, currentStep }: { form: FormData; currentStep: number }) {
  return (
    <div
      className="rounded-[20px] p-4 space-y-2 text-xs"
      style={{
        background: "rgba(233,230,223,0.6)",
        border: "1px solid var(--border)",
      }}
    >
      <p className="font-semibold text-[11px] uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        So far
      </p>

      {form.display_name && (
        <Row label="Name">{form.display_name}</Row>
      )}
      {currentStep >= 2 && form.content_types.length > 0 && (
        <Row label="Content">{form.content_types.join(", ")}</Row>
      )}
      {currentStep >= 3 && form.portfolio_url && (
        <Row label="Portfolio">{truncate(form.portfolio_url, 40)}</Row>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <span className="w-20 shrink-0 font-medium" style={{ color: "var(--muted)" }}>
        {label}
      </span>
      <span style={{ color: "var(--text)" }}>{children}</span>
    </div>
  );
}

function truncate(str: string, max: number) {
  return str.length > max ? str.slice(0, max) + "…" : str;
}

// ─────────────────────────────────────────────────────────────
//  Shared UI helpers
// ─────────────────────────────────────────────────────────────

function StepIndicator({
  current,
  total,
  labels,
}: {
  current: number;
  total: number;
  labels: string[];
}) {
  return (
    <div className="space-y-2">
      <div className="flex gap-1.5">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all"
            style={{
              background:
                i + 1 < current
                  ? "var(--accent)"
                  : i + 1 === current
                  ? "var(--accent)"
                  : "rgba(47,47,47,0.12)",
              opacity: i + 1 < current ? 0.5 : 1,
            }}
          />
        ))}
      </div>
      <p className="text-xs" style={{ color: "var(--muted)" }}>
        Step {current} of {total} — {labels[current - 1]}
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
    <div className="space-y-1.5">
      <label className="block text-xs font-medium uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        {label}
        {required && <span style={{ color: "var(--danger)" }}> *</span>}
      </label>
      {hint && (
        <p className="text-xs leading-relaxed" style={{ color: "var(--muted)", opacity: 0.8 }}>
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p className="text-xs" style={{ color: "var(--danger)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

function CharCount({ value, min }: { value: string; min: number }) {
  const len = value.trim().length;
  const ok = len >= min;
  return (
    <p
      className="text-right text-[11px]"
      style={{ color: ok ? "var(--accent)" : "var(--muted)" }}
    >
      {len} / {min} min
    </p>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const config = {
    pending: { label: "Under review", bg: "rgba(255,200,80,0.12)", border: "rgba(200,160,0,0.25)", color: "#7a6000" },
    approved: { label: "Approved", bg: "rgba(94,99,87,0.12)", border: "rgba(94,99,87,0.3)", color: "var(--accent)" },
    rejected: { label: "Not accepted", bg: "rgba(122,46,46,0.08)", border: "rgba(122,46,46,0.2)", color: "var(--danger)" },
  }[status];

  return (
    <span
      className="inline-block rounded-full px-3 py-1 text-xs font-semibold"
      style={{ background: config.bg, border: `1px solid ${config.border}`, color: config.color }}
    >
      {config.label}
    </span>
  );
}
