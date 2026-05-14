"use client";
import { use, useState } from "react";
import Link from "next/link";

function UsersIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function TeacherIcon({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5" />
    </svg>
  );
}

function CheckCircleIcon({ size = 52 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}

const LABELS: Record<string, Record<string, string>> = {
  en: {
    title: "Set Up a Child Account",
    subtitle: "Create a safe space for your child to read and create.",
    stepOf: "Step {n} of 4",
    step1Title: "Who are you?",
    step1Sub: "We need to verify your relationship with the child.",
    roleParent: "Parent / Guardian",
    roleParentDesc: "I am the parent or legal guardian of this child.",
    roleTeacher: "Teacher / Educator",
    roleTeacherDesc: "I am a teacher or educator responsible for this child.",
    step2Title: "Please read and agree",
    consent1: "I confirm I am an adult (18+) responsible for this child.",
    consent2: "I understand this platform monitors all content for child safety.",
    consent3: "I agree that the child's activity, reading history, and messages may be reviewed by me and platform moderators.",
    consent4: "I understand AI features require approval from both parent AND teacher before they are enabled for the child.",
    step3Title: "Child's Information",
    nameLabel: "Child's Name *",
    namePlaceholder: "First name or nickname",
    ageLabel: "Age *",
    agePlaceholder: "e.g. 9",
    emailLabel: "Login Email for Child *",
    emailPlaceholder: "a separate email for the child",
    passwordLabel: "Password *",
    passwordPlaceholder: "Min 8 characters",
    familyLabel: "Family Name (optional)",
    schoolLabel: "School Name (optional)",
    earningsLabel: "Earnings go to",
    earningsParent: "My wallet",
    earningsKid: "Child's wallet",
    step4Title: "Almost done!",
    step4Sub: "Review the information and create the account.",
    relationship: "Relationship",
    name: "Name",
    age: "Age",
    email: "Email",
    earnings: "Earnings",
    next: "Next",
    back: "Back",
    create: "Create Account",
    creating: "Creating...",
    success: "Account created! {name} can now log in.",
    viewDashboard: "Go to Dashboard",
    selectRole: "Please select your role.",
    agreeAll: "Please agree to all items.",
    missingFields: "Please fill in all required fields.",
    ageRange: "Age must be between 3 and 17.",
    passwordMin: "Password must be at least 8 characters.",
  },
  mn: {
    title: "Хүүхдийн Бүртгэл Үүсгэх",
    subtitle: "Хүүхдийнхаа уншиж, бүтээх аюулгүй орчныг бий болго.",
    stepOf: "{n}/4 алхам",
    step1Title: "Та хэн бэ?",
    step1Sub: "Хүүхэдтэй харилцааг баталгаажуулах шаардлагатай.",
    roleParent: "Эцэг эх / Асран хамгаалагч",
    roleParentDesc: "Би энэ хүүхдийн эцэг эх буюу хууль ёсны асран хамгаалагч.",
    roleTeacher: "Багш / Боловсролын ажилтан",
    roleTeacherDesc: "Би энэ хүүхдийг хариуцаж буй багш буюу боловсролын ажилтан.",
    step2Title: "Уншиж, зөвшөөрнө үү",
    consent1: "Би энэ хүүхдийг хариуцаж буй насанд хүрсэн (18+) хүн гэдгээ баталж байна.",
    consent2: "Энэ платформ хүүхдийн аюулгүй байдлын үүднээс бүх контентыг хянадаг гэдгийг ойлгож байна.",
    consent3: "Хүүхдийн идэвх, уншилтын түүх, мессежийг надаас болон платформын модераторуудаас харах боломжтой гэдгийг зөвшөөрч байна.",
    consent4: "AI функц идэвхжүүлэхийн тулд эцэг эх БА багш хоёулаа зөвшөөрөх ёстойг ойлгож байна.",
    step3Title: "Хүүхдийн мэдээлэл",
    nameLabel: "Хүүхдийн нэр *",
    namePlaceholder: "Нэр эсвэл хочноо",
    ageLabel: "Нас *",
    agePlaceholder: "Жишээ: 9",
    emailLabel: "Хүүхдэд зориулсан нэвтрэх имэйл *",
    emailPlaceholder: "Хүүхдийн тусдаа имэйл",
    passwordLabel: "Нууц үг *",
    passwordPlaceholder: "Хамгийн багадаа 8 тэмдэгт",
    familyLabel: "Овог (заавал биш)",
    schoolLabel: "Сургуулийн нэр (заавал биш)",
    earningsLabel: "Орлого хаашаа орох вэ",
    earningsParent: "Миний хэтэвч",
    earningsKid: "Хүүхдийн хэтэвч",
    step4Title: "Бараг болсон!",
    step4Sub: "Мэдээллийг хянаад бүртгэлийг үүсгэнэ үү.",
    relationship: "Харилцаа",
    name: "Нэр",
    age: "Нас",
    email: "Имэйл",
    earnings: "Орлого",
    next: "Дараах",
    back: "Буцах",
    create: "Бүртгэл үүсгэх",
    creating: "Үүсгэж байна...",
    success: "{name}-ийн бүртгэл үүслээ! Одоо нэвтрэх боломжтой.",
    viewDashboard: "Хяналтын самбар руу орох",
    selectRole: "Үүргээ сонгоно уу.",
    agreeAll: "Бүгдтэй зөвшөөрнө үү.",
    missingFields: "Шаардлагатай талбаруудыг бөглөнө үү.",
    ageRange: "Нас 3-17 хооронд байх ёстой.",
    passwordMin: "Нууц үг хамгийн багадаа 8 тэмдэгт байх ёстой.",
  },
  ko: {
    title: "아이 계정 만들기",
    subtitle: "아이가 읽고 창작할 수 있는 안전한 공간을 만들어요.",
    stepOf: "4단계 중 {n}단계",
    step1Title: "누구신가요?",
    step1Sub: "아이와의 관계를 확인해야 해요.",
    roleParent: "부모 / 보호자",
    roleParentDesc: "저는 이 아이의 부모 또는 법적 보호자입니다.",
    roleTeacher: "교사 / 교육자",
    roleTeacherDesc: "저는 이 아이를 담당하는 교사 또는 교육자입니다.",
    step2Title: "읽고 동의해주세요",
    consent1: "저는 이 아이를 책임지는 성인(18+)임을 확인합니다.",
    consent2: "이 플랫폼은 아동 안전을 위해 모든 콘텐츠를 모니터링한다는 것을 이해합니다.",
    consent3: "아이의 활동, 읽기 기록, 메시지를 저와 플랫폼 관리자가 검토할 수 있다는 것에 동의합니다.",
    consent4: "AI 기능은 부모와 교사 모두의 승인이 있어야만 활성화된다는 것을 이해합니다.",
    step3Title: "아이의 정보",
    nameLabel: "아이의 이름 *",
    namePlaceholder: "이름 또는 별명",
    ageLabel: "나이 *",
    agePlaceholder: "예: 9",
    emailLabel: "아이의 로그인 이메일 *",
    emailPlaceholder: "아이 전용 이메일",
    passwordLabel: "비밀번호 *",
    passwordPlaceholder: "최소 8자",
    familyLabel: "가족 이름 (선택)",
    schoolLabel: "학교 이름 (선택)",
    earningsLabel: "수익을 받을 곳",
    earningsParent: "내 지갑",
    earningsKid: "아이의 지갑",
    step4Title: "거의 다 됐어요!",
    step4Sub: "정보를 검토하고 계정을 만들어요.",
    relationship: "관계",
    name: "이름",
    age: "나이",
    email: "이메일",
    earnings: "수익",
    next: "다음",
    back: "뒤로",
    create: "계정 만들기",
    creating: "만드는 중...",
    success: "{name}의 계정이 만들어졌어요! 이제 로그인할 수 있어요.",
    viewDashboard: "대시보드로 이동",
    selectRole: "역할을 선택해주세요.",
    agreeAll: "모든 항목에 동의해주세요.",
    missingFields: "필수 항목을 모두 입력해주세요.",
    ageRange: "나이는 3에서 17 사이여야 해요.",
    passwordMin: "비밀번호는 최소 8자 이상이어야 해요.",
  },
  ja: {
    title: "子どものアカウントを作成",
    subtitle: "子どもが読んだり創作したりできる安全な場所を作ろう。",
    stepOf: "ステップ {n} / 4",
    step1Title: "あなたは誰ですか？",
    step1Sub: "子どもとの関係を確認する必要があります。",
    roleParent: "保護者",
    roleParentDesc: "私はこの子の親または法的保護者です。",
    roleTeacher: "先生 / 教育者",
    roleTeacherDesc: "私はこの子を担当する先生または教育者です。",
    step2Title: "お読みになり、同意してください",
    consent1: "私はこの子を責任する成人(18+)であることを確認します。",
    consent2: "このプラットフォームは子どもの安全のためにすべてのコンテンツを監視することを理解しています。",
    consent3: "子どもの活動、閲覧履歴、メッセージは私とプラットフォームのモデレーターが確認できることに同意します。",
    consent4: "AI機能は保護者と先生の両方の承認がなければ有効にならないことを理解しています。",
    step3Title: "子どもの情報",
    nameLabel: "子どもの名前 *",
    namePlaceholder: "名前またはニックネーム",
    ageLabel: "年齢 *",
    agePlaceholder: "例：9",
    emailLabel: "子ども用のログインメール *",
    emailPlaceholder: "子ども専用のメール",
    passwordLabel: "パスワード *",
    passwordPlaceholder: "最低8文字",
    familyLabel: "家族名（任意）",
    schoolLabel: "学校名（任意）",
    earningsLabel: "収益の行き先",
    earningsParent: "私のウォレット",
    earningsKid: "子どものウォレット",
    step4Title: "もう少し！",
    step4Sub: "情報を確認してアカウントを作成しましょう。",
    relationship: "関係",
    name: "名前",
    age: "年齢",
    email: "メール",
    earnings: "収益",
    next: "次へ",
    back: "戻る",
    create: "アカウントを作成",
    creating: "作成中...",
    success: "{name}のアカウントが作成されました！ログインできます。",
    viewDashboard: "ダッシュボードへ",
    selectRole: "役割を選択してください。",
    agreeAll: "すべての項目に同意してください。",
    missingFields: "必須項目をすべて入力してください。",
    ageRange: "年齢は3から17の間でなければなりません。",
    passwordMin: "パスワードは最低8文字以上が必要です。",
  },
};

export default function KidsSetupPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const t = LABELS[locale] ?? LABELS.en;

  const [step, setStep] = useState(1);
  const [role, setRole] = useState<"parent_guardian" | "teacher" | "">("");
  const [consents, setConsents] = useState([false, false, false, false]);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [earningsReceiver, setEarningsReceiver] = useState<"parent" | "kid">("parent");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createdKidId, setCreatedKidId] = useState<string | null>(null);

  const stepLabel = t.stepOf.replace("{n}", String(step));

  function nextStep() {
    setError("");
    if (step === 1) {
      if (!role) return setError(t.selectRole);
      setStep(2);
    } else if (step === 2) {
      if (consents.some(c => !c)) return setError(t.agreeAll);
      setStep(3);
    } else if (step === 3) {
      if (!name.trim() || !age || !email.trim() || !password) return setError(t.missingFields);
      const ageNum = parseInt(age, 10);
      if (isNaN(ageNum) || ageNum < 3 || ageNum > 17) return setError(t.ageRange);
      if (password.length < 8) return setError(t.passwordMin);
      setStep(4);
    }
  }

  async function handleCreate() {
    setError("");
    setCreating(true);
    const res = await fetch("/api/kids/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: name.trim(),
        age: parseInt(age, 10),
        email: email.trim(),
        password,
        relationship: role,
        family_name: familyName.trim() || null,
        school_name: schoolName.trim() || null,
        earnings_receiver_type: earningsReceiver,
      }),
    });
    setCreating(false);
    if (res.ok) {
      const d = await res.json();
      setCreatedKidId(d.kid_user_id);
    } else {
      const d = await res.json();
      setError(d.error ?? "Error creating account.");
    }
  }

  const cardStyle: React.CSSProperties = {
    background: "var(--kids-panel, rgba(255,255,255,0.85))",
    border: "2px solid var(--kids-border, rgba(100,160,220,0.22))",
    borderRadius: 24,
    padding: "28px 24px",
    boxShadow: "var(--kids-shadow, 0 4px 20px rgba(100,160,220,0.15))",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 16px",
    borderRadius: 16,
    border: "2px solid var(--kids-border, rgba(100,160,220,0.22))",
    background: "rgba(255,255,255,0.7)",
    color: "var(--kids-text, #2a3a52)",
    fontSize: "0.95rem",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: "0.85rem",
    fontWeight: 600,
    color: "var(--kids-muted, #7a9ab8)",
    marginBottom: 6,
    display: "block",
  };

  if (createdKidId) {
    return (
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "60px 20px", textAlign: "center" }}>
        <div style={{ color: "#7ec8a4", display: "flex", justifyContent: "center", marginBottom: 16 }}>
          <CheckCircleIcon size={52} />
        </div>
        <div style={{ fontWeight: 800, fontSize: "1.4rem", color: "var(--kids-text, #2a3a52)", marginBottom: 8 }}>
          {t.success.replace("{name}", name)}
        </div>
        <Link
          href={`/${locale}/kids/dashboard/${createdKidId}`}
          className="btn-kids"
          style={{ display: "inline-flex", marginTop: 24 }}
        >
          {t.viewDashboard}
        </Link>
      </div>
    );
  }

  const roleOptions: { val: "parent_guardian" | "teacher"; label: string; desc: string; icon: React.ReactNode }[] = [
    { val: "parent_guardian", label: t.roleParent,  desc: t.roleParentDesc,  icon: <UsersIcon   size={26} /> },
    { val: "teacher",         label: t.roleTeacher, desc: t.roleTeacherDesc, icon: <TeacherIcon size={26} /> },
  ];

  return (
    <div style={{ maxWidth: 520, margin: "0 auto", padding: "40px 20px 40px", marginBottom: "80px" }}>
      {/* Header */}
      <Link href={`/${locale}/profile`} style={{ color: "var(--kids-muted, #7a9ab8)", fontSize: "0.875rem", textDecoration: "none", marginBottom: 20, display: "inline-block" }}>
        ← Back
      </Link>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "var(--kids-text, #2a3a52)" }}>{t.title}</div>
        <div style={{ fontSize: "0.875rem", color: "var(--kids-muted, #7a9ab8)", marginTop: 4 }}>{t.subtitle}</div>
      </div>

      {/* Progress */}
      <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
        {[1, 2, 3, 4].map(s => (
          <div
            key={s}
            style={{
              flex: 1, height: 6, borderRadius: 999,
              background: s <= step
                ? "var(--kids-accent, #f7a84a)"
                : "var(--kids-border, rgba(100,160,220,0.22))",
              transition: "background 300ms ease",
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: "0.8rem", color: "var(--kids-muted, #7a9ab8)", marginBottom: 20 }}>{stepLabel}</div>

      {error && (
        <div style={{
          background: "rgba(220,80,80,0.1)",
          border: "2px solid rgba(220,80,80,0.28)",
          borderRadius: 14,
          padding: "12px 16px",
          color: "#aa4444",
          marginBottom: 20,
          fontSize: "0.875rem",
        }}>
          {error}
        </div>
      )}

      {/* Step 1 — Role */}
      {step === 1 && (
        <div style={cardStyle}>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--kids-text, #2a3a52)", marginBottom: 6 }}>{t.step1Title}</div>
          <div style={{ fontSize: "0.875rem", color: "var(--kids-muted, #7a9ab8)", marginBottom: 20 }}>{t.step1Sub}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {roleOptions.map(opt => (
              <button
                key={opt.val}
                onClick={() => setRole(opt.val)}
                style={{
                  padding: "16px 18px",
                  borderRadius: 18,
                  border: "2.5px solid",
                  borderColor: role === opt.val ? "var(--kids-accent, #f7a84a)" : "var(--kids-border, rgba(100,160,220,0.22))",
                  background: role === opt.val ? "rgba(247,168,74,0.08)" : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 140ms ease",
                }}
              >
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                    background: role === opt.val ? "rgba(247,168,74,0.15)" : "rgba(100,160,220,0.1)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: role === opt.val ? "var(--kids-accent, #f7a84a)" : "var(--kids-muted, #7a9ab8)",
                    transition: "all 140ms ease",
                  }}>
                    {opt.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--kids-text, #2a3a52)" }}>{opt.label}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--kids-muted, #7a9ab8)", marginTop: 2 }}>{opt.desc}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 2 — Consent */}
      {step === 2 && (
        <div style={cardStyle}>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--kids-text, #2a3a52)", marginBottom: 20 }}>{t.step2Title}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[t.consent1, t.consent2, t.consent3, t.consent4].map((text, i) => (
              <label
                key={i}
                style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }}
              >
                <input
                  type="checkbox"
                  checked={consents[i]}
                  onChange={e => {
                    const next = [...consents];
                    next[i] = e.target.checked;
                    setConsents(next);
                  }}
                  style={{ width: 20, height: 20, marginTop: 2, accentColor: "var(--kids-accent, #f7a84a)", flexShrink: 0 }}
                />
                <span style={{ fontSize: "0.875rem", color: "var(--kids-text, #2a3a52)", lineHeight: 1.5 }}>{text}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Step 3 — Child info */}
      {step === 3 && (
        <div style={cardStyle}>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--kids-text, #2a3a52)", marginBottom: 20 }}>{t.step3Title}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={labelStyle}>{t.nameLabel}</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder={t.namePlaceholder} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t.ageLabel}</label>
              <input value={age} onChange={e => setAge(e.target.value)} placeholder={t.agePlaceholder} type="number" min={3} max={17} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t.emailLabel}</label>
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder={t.emailPlaceholder} type="email" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t.passwordLabel}</label>
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder={t.passwordPlaceholder} type="password" style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t.familyLabel}</label>
              <input value={familyName} onChange={e => setFamilyName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t.schoolLabel}</label>
              <input value={schoolName} onChange={e => setSchoolName(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>{t.earningsLabel}</label>
              <div style={{ display: "flex", gap: 10 }}>
                {[{ val: "parent" as const, label: t.earningsParent }, { val: "kid" as const, label: t.earningsKid }].map(opt => (
                  <button
                    key={opt.val}
                    onClick={() => setEarningsReceiver(opt.val)}
                    style={{
                      flex: 1,
                      padding: "10px 14px",
                      borderRadius: 14,
                      border: "2px solid",
                      borderColor: earningsReceiver === opt.val ? "var(--kids-accent, #f7a84a)" : "var(--kids-border, rgba(100,160,220,0.22))",
                      background: earningsReceiver === opt.val ? "rgba(247,168,74,0.1)" : "transparent",
                      color: "var(--kids-text, #2a3a52)",
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 4 — Confirm */}
      {step === 4 && (
        <div style={cardStyle}>
          <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "var(--kids-text, #2a3a52)", marginBottom: 6 }}>{t.step4Title}</div>
          <div style={{ fontSize: "0.875rem", color: "var(--kids-muted, #7a9ab8)", marginBottom: 20 }}>{t.step4Sub}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { label: t.relationship, value: role === "parent_guardian" ? t.roleParent : t.roleTeacher },
              { label: t.name,         value: name },
              { label: t.age,          value: age },
              { label: t.email,        value: email },
              { label: t.earnings,     value: earningsReceiver === "parent" ? t.earningsParent : t.earningsKid },
            ].map(row => (
              <div key={row.label} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--kids-border, rgba(100,160,220,0.15))" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--kids-muted, #7a9ab8)" }}>{row.label}</span>
                <span style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--kids-text, #2a3a52)" }}>{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation buttons */}
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24, gap: 12 }}>
        {step > 1 && (
          <button
            onClick={() => { setError(""); setStep(s => s - 1); }}
            className="btn-kids-secondary"
            style={{ flex: 1 }}
          >
            {t.back}
          </button>
        )}
        {step < 4 ? (
          <button onClick={nextStep} className="btn-kids" style={{ flex: 1 }}>
            {t.next}
          </button>
        ) : (
          <button onClick={handleCreate} disabled={creating} className="btn-kids" style={{ flex: 1 }}>
            {creating ? t.creating : t.create}
          </button>
        )}
      </div>
    </div>
  );
}
