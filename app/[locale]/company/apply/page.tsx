"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

const BG      = "#0a0a0c";
const SURFACE = "#111116";
const BORDER  = "rgba(255,255,255,0.07)";
const TEXT    = "#eceae4";
const MUTED   = "#5e5e6e";
const ACCENT  = "#b6a07c";

type AppStatus = "pending" | "approved" | "rejected";

type ExistingApp = {
  id: string;
  status: AppStatus;
  company_name: string;
  created_at: string;
  review_notes: string | null;
};

type FormData = {
  company_name:  string;
  website:       string;
  industry:      string;
  description:   string;
  motivation:    string;
  agreed_to_terms: boolean;
};

const INDUSTRY_OPTIONS = [
  "Publishing", "Entertainment", "Gaming", "Education",
  "Technology", "Fashion", "Food & Beverage", "Other",
];

const TOTAL_STEPS = 3;
const STEP_LABELS = ["Company info", "What you do", "Final step"];

const EMPTY: FormData = {
  company_name: "",
  website: "",
  industry: "",
  description: "",
  motivation: "",
  agreed_to_terms: false,
};

function isValidUrl(v: string) {
  if (!v.trim()) return true;
  try { new URL(v.startsWith("http") ? v : `https://${v}`); return true; } catch { return false; }
}

function CharCount({ value, min }: { value: string; min: number }) {
  const len = value.trim().length;
  return (
    <p style={{ textAlign: "right", fontSize: 11, color: len >= min ? ACCENT : MUTED, marginTop: 4 }}>
      {len} / {min} min
    </p>
  );
}

function Field({ label, hint, error, required, children }: {
  label: string; hint?: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: MUTED }}>
        {label}{required && <span style={{ color: "#c85252", marginLeft: 3 }}>*</span>}
      </label>
      {hint && <p style={{ fontSize: 12, color: "#4a4a56", lineHeight: 1.5, marginBottom: 2 }}>{hint}</p>}
      {children}
      {error && <p style={{ fontSize: 12, color: "#c85252" }}>{error}</p>}
    </div>
  );
}

function StepIndicator({ current, total, labels }: { current: number; total: number; labels: string[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 6 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 2, borderRadius: 9999,
            background: i + 1 < current ? "rgba(182,160,124,0.5)" : i + 1 === current ? ACCENT : "rgba(255,255,255,0.08)",
            transition: "all 300ms ease",
          }} />
        ))}
      </div>
      <p style={{ fontSize: 11, color: MUTED }}>
        Step {current} of {total}<span style={{ color: "#4a4a56" }}> — {labels[current - 1]}</span>
      </p>
    </div>
  );
}

export default function CompanyApplyPage() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) || "en";
  const supabase = useMemo(() => createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  ), []);

  const [initialized, setInitialized] = useState(false);
  const [userId, setUserId]           = useState<string | null>(null);
  const [userEmail, setUserEmail]     = useState("");
  const [existing, setExisting]       = useState<ExistingApp | null>(null);

  const [step, setStep]             = useState(1);
  const [form, setForm]             = useState<FormData>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormData, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted]   = useState(false);

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        router.replace(`/${locale}/login?redirect=/${locale}/company/apply`);
        return;
      }
      setUserId(session.user.id);
      setUserEmail(session.user.email ?? "");

      const { data } = await supabase
        .from("company_applications")
        .select("id, status, company_name, created_at, review_notes")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (data) setExisting(data as ExistingApp);
      setInitialized(true);
    }
    init();
  }, [locale, router, supabase]);

  function setField<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setFieldErrors(prev => ({ ...prev, [key]: undefined }));
  }

  function validate(s: number): boolean {
    const errors: Partial<Record<keyof FormData, string>> = {};
    if (s === 1) {
      if (!form.company_name.trim()) errors.company_name = "Company name is required.";
      if (form.website && !isValidUrl(form.website)) errors.website = "Enter a valid URL.";
    }
    if (s === 2) {
      if (!form.description.trim()) errors.description = "Description is required.";
      else if (form.description.trim().length < 30) errors.description = "Must be at least 30 characters.";
    }
    if (s === 3) {
      if (!form.motivation.trim()) errors.motivation = "Required.";
      else if (form.motivation.trim().length < 50) errors.motivation = "Must be at least 50 characters.";
      if (!form.agreed_to_terms) errors.agreed_to_terms = "You must agree to continue.";
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleNext() {
    if (!validate(step)) return;
    setStep(s => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit() {
    if (!validate(3) || !userId) return;
    setSubmitting(true);
    setSubmitError(null);

    const { error } = await supabase.from("company_applications").insert({
      user_id:         userId,
      applicant_email: userEmail,
      company_name:    form.company_name.trim(),
      website:         form.website.trim() || null,
      industry:        form.industry || null,
      description:     form.description.trim(),
      motivation:      form.motivation.trim(),
      agreed_to_terms: true,
      status:          "pending",
    });

    if (error) { setSubmitError(error.message); setSubmitting(false); return; }
    setSubmitted(true);
    setSubmitting(false);
  }

  if (!initialized) {
    return (
      <div style={{ background: BG }} className="min-h-screen flex items-center justify-center">
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT, opacity: 0.4 }} />
      </div>
    );
  }

  // ── Already applied ──────────────────────────────────────────

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
            Company application
          </h1>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px 20px" }}>
            <span style={{
              display: "inline-block", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em",
              textTransform: "uppercase", padding: "4px 12px", borderRadius: 9999, marginBottom: 16,
              background: statusCfg.bg, border: `1px solid ${statusCfg.border}`, color: statusCfg.color,
            }}>
              {statusCfg.label}
            </span>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, marginBottom: 8 }}>
              Submitted as <span style={{ color: TEXT, fontWeight: 500 }}>{existing.company_name}</span> on{" "}
              {new Date(existing.created_at).toLocaleDateString("en-GB", { dateStyle: "medium" })}.
            </p>
            {existing.status === "pending" && (
              <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65 }}>
                Applications are reviewed manually. You&apos;ll be notified once a decision has been made.
              </p>
            )}
            {existing.status === "approved" && (
              <div style={{ marginTop: 16 }}>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65, marginBottom: 16 }}>
                  Your application was approved. You can now manage contracts.
                </p>
                <Link href={`/${locale}/contracts`} style={{
                  display: "inline-flex", alignItems: "center", padding: "9px 22px",
                  borderRadius: 9999, background: ACCENT, color: BG,
                  fontSize: 13, fontWeight: 600, textDecoration: "none",
                }}>
                  Open Contracts
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

  // ── Success ──────────────────────────────────────────────────

  if (submitted) {
    return (
      <div style={{ background: BG }} className="min-h-screen">
        <main style={{ maxWidth: 480, margin: "0 auto", padding: "52px 24px 80px", color: TEXT }}>
          <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "40px 24px", textAlign: "center" }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", background: "rgba(110,168,128,0.12)",
              border: "1px solid rgba(110,168,128,0.25)", display: "flex", alignItems: "center",
              justifyContent: "center", margin: "0 auto 20px", fontSize: 18, color: "#6ea880", fontWeight: 700,
            }}>✓</div>
            <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 10, color: TEXT }}>
              Application submitted
            </h1>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.65 }}>
              Thank you, <span style={{ color: TEXT, fontWeight: 500 }}>{form.company_name}</span>.
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

  // ── Form ─────────────────────────────────────────────────────

  return (
    <div style={{ background: BG }} className="min-h-screen">
      <main style={{ maxWidth: 520, margin: "0 auto", padding: "52px 24px 80px" }}>
        <div style={{ marginBottom: 36 }}>
          <Link href={`/${locale}`} style={{ display: "inline-block", fontSize: 12, color: MUTED, textDecoration: "none", marginBottom: 20 }}>
            ← Home
          </Link>
          <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 8 }}>
            Company Program
          </p>
          <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: "-0.025em", color: TEXT, marginBottom: 6 }}>
            Apply to collaborate
          </h1>
          <p style={{ fontSize: 13, color: MUTED }}>
            Tell us about your company and what you&apos;re looking to commission.
          </p>
        </div>

        <StepIndicator current={step} total={TOTAL_STEPS} labels={STEP_LABELS} />

        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "24px 20px", marginTop: 24 }}>
          <p style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, marginBottom: 20 }}>
            Step {step} — {STEP_LABELS[step - 1]}
          </p>

          {step === 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Field label="Company name" error={fieldErrors.company_name} required>
                <input
                  type="text" value={form.company_name}
                  onChange={e => setField("company_name", e.target.value)}
                  placeholder="Acme Studios" className="dark-input"
                />
              </Field>
              <Field label="Website" error={fieldErrors.website}>
                <input
                  type="url" value={form.website}
                  onChange={e => setField("website", e.target.value)}
                  placeholder="https://yourcompany.com" className="dark-input"
                />
              </Field>
              <Field label="Industry">
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, paddingTop: 4 }}>
                  {INDUSTRY_OPTIONS.map(opt => {
                    const active = form.industry === opt;
                    return (
                      <button key={opt} type="button" onClick={() => setField("industry", active ? "" : opt)}
                        style={{
                          padding: "6px 14px", borderRadius: 9999, fontSize: 12, fontWeight: 500, cursor: "pointer",
                          transition: "all 120ms ease",
                          background: active ? ACCENT : "rgba(255,255,255,0.05)",
                          border: `1px solid ${active ? ACCENT : "rgba(255,255,255,0.1)"}`,
                          color: active ? "#0a0a0c" : "#eceae4",
                        }}>
                        {opt}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Field label="What does your company do?" error={fieldErrors.description} required
                hint="Describe your business, the type of content you produce or license, and who your audience is.">
                <textarea
                  value={form.description} onChange={e => setField("description", e.target.value)}
                  rows={5} placeholder="We publish illustrated children's books and license manga-style content…"
                  className="dark-input" style={{ resize: "none" }}
                />
                <CharCount value={form.description} min={30} />
              </Field>
            </div>
          )}

          {step === 3 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <Field label="Why Enkhverse?" error={fieldErrors.motivation} required
                hint="What are you looking to commission? What kind of creators are you seeking?">
                <textarea
                  value={form.motivation} onChange={e => setField("motivation", e.target.value)}
                  rows={5} placeholder="We're looking for manga artists to create a 6-chapter series for our platform…"
                  className="dark-input" style={{ resize: "none" }}
                />
                <CharCount value={form.motivation} min={50} />
              </Field>
              <div>
                <label style={{
                  display: "flex", alignItems: "flex-start", gap: 12, padding: "14px 16px",
                  borderRadius: 10, cursor: "pointer",
                  background: form.agreed_to_terms ? "rgba(182,160,124,0.07)" : "rgba(255,255,255,0.03)",
                  border: `1px solid ${form.agreed_to_terms ? "rgba(182,160,124,0.25)" : "rgba(255,255,255,0.08)"}`,
                  transition: "all 120ms ease",
                }}>
                  <input
                    type="checkbox" checked={form.agreed_to_terms}
                    onChange={e => setField("agreed_to_terms", e.target.checked)}
                    style={{ marginTop: 2, width: 14, height: 14, flexShrink: 0, accentColor: ACCENT, cursor: "pointer" }}
                  />
                  <span style={{ fontSize: 13, color: "#a8a8b4", lineHeight: 1.65 }}>
                    I agree to Enkhverse company guidelines and understand that my application will be
                    reviewed before I can commission creators.
                  </span>
                </label>
                {fieldErrors.agreed_to_terms && (
                  <p style={{ fontSize: 12, color: "#c85252", marginTop: 6 }}>{fieldErrors.agreed_to_terms}</p>
                )}
              </div>
            </div>
          )}

          {submitError && <p style={{ fontSize: 12, color: "#c85252", marginTop: 12 }}>{submitError}</p>}

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24, paddingTop: 20, borderTop: `1px solid ${BORDER}` }}>
            {step > 1 ? (
              <button type="button" onClick={() => setStep(s => s - 1)} className="btn-dark-ghost text-sm">Back</button>
            ) : <span />}
            {step < TOTAL_STEPS ? (
              <button type="button" onClick={handleNext} className="btn-dark text-sm">Continue</button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-dark text-sm">
                {submitting ? "Submitting…" : "Submit application"}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
