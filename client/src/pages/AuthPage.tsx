import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  Code2,
  Eye,
  EyeOff,
  Gavel,
  GraduationCap,
  Loader2,
  Lock,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { RoleName } from "../lib/api";
import { getErrorMessage, userName } from "../core/utils/format";
import { useAuth } from "../core/contexts/AuthContext";
import { useToast } from "../core/contexts/ToastContext";

type AuthMode = "login" | "register";

const roleOptions: { value: RoleName; label: string; desc: string; icon: React.ReactNode }[] = [
  {
    value: "STUDENT",
    label: "Student",
    desc: "Currently enrolled in a college or university",
    icon: <GraduationCap size={18} />,
  },
  {
    value: "PROFESSOR",
    label: "Professor",
    desc: "Teaching or researching at an institution",
    icon: <Star size={18} />,
  },
  {
    value: "PROFESSIONAL",
    label: "Professional",
    desc: "Working in the tech industry",
    icon: <BriefcaseBusiness size={18} />,
  },
];

const features = [
  {
    icon: <Sparkles size={20} />,
    title: "AI-Ranked Feed",
    desc: "Personalized content based on your skills and interests",
  },
  {
    icon: <ShieldCheck size={20} />,
    title: "Trust Scores",
    desc: "Verified profiles with reputation-backed credibility",
  },
  {
    icon: <Users size={20} />,
    title: "Teams & Networks",
    desc: "Collaborate with engineers across colleges and companies",
  },
  {
    icon: <BriefcaseBusiness size={20} />,
    title: "Job Opportunities",
    desc: "Curated roles matched to your engineering profile",
  },
  {
    icon: <Gavel size={20} />,
    title: "Hackathons",
    desc: "Find and register for live competitions",
  },
  {
    icon: <MessageSquare size={20} />,
    title: "Real-time Chat",
    desc: "Connect and collaborate in instant messaging",
  },
];

const stats = [
  { value: "10K+", label: "Engineers" },
  { value: "500+", label: "Companies" },
  { value: "2K+", label: "Opportunities" },
];

export function AuthPage() {
  const [mode, setMode]       = useState<AuthMode>("login");
  const [showPass, setShowPass] = useState(false);
  const [form, setForm]       = useState({
    email:    "",
    username: "",
    fullName: "",
    password: "",
    role:     "STUDENT" as RoleName,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { login, register, user } = useAuth();
  const { showToast }             = useToast();
  const navigate                  = useNavigate();
  const location                  = useLocation();

  const redirectTarget =
    (location.state as { from?: { pathname?: string; search?: string } } | null)
      ?.from || { pathname: "/feed", search: "" };
  const redirectTo = `${redirectTarget.pathname || "/feed"}${redirectTarget.search || ""}`;

  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
  }, [navigate, redirectTo, user]);

  const patch = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setMessage(null);
    setShowPass(false);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (mode === "login") {
        await login({ email: form.email, password: form.password });
      } else {
        await register(form);
      }
      showToast(
        "success",
        `Welcome, ${userName({ username: form.username, email: form.email, id: "" })} 🎉`
      );
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      className="min-h-screen flex items-stretch page-enter"
      style={{ background: "var(--bg-base)" }}
    >
      {/* ============================================================
          LEFT — Branding panel (hidden on small screens, shown md+)
          ============================================================ */}
      <aside className="hidden md:flex md:w-[48%] xl:w-[45%] relative flex-col overflow-hidden">
        {/* Dark indigo gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d0c2e] via-[#1e1a6e] to-[#120e4a]" />

        {/* Animated glow orbs */}
        <div className="absolute top-[-80px] left-[-60px] h-72 w-72 rounded-full opacity-25 blur-3xl bg-indigo-400" />
        <div className="absolute bottom-[-60px] right-[-40px] h-64 w-64 rounded-full opacity-20 blur-3xl bg-indigo-600" />
        <div className="absolute top-[40%] right-[10%] h-48 w-48 rounded-full opacity-10 blur-2xl bg-indigo-300" />

        {/* Content */}
        <div className="relative z-10 flex h-full flex-col justify-between p-8 xl:p-12 text-white">
          {/* Logo */}
          <div>
            <div className="inline-flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-400 text-indigo-950 shadow-glow">
                <Code2 size={22} />
              </div>
              <div>
                <div className="text-base font-black tracking-tight leading-none">
                  Engineering
                </div>
                <div className="text-[10px] font-bold tracking-[0.15em] uppercase text-indigo-300/80 leading-none mt-0.5">
                  Hub
                </div>
              </div>
            </div>

            <h1 className="mt-8 text-3xl xl:text-4xl font-bold leading-tight tracking-tight">
              Build your engineering{" "}
              <span className="text-indigo-400">legacy</span>
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-indigo-50/70 max-w-xs">
              The professional network built exclusively for engineers — from
              college to career and beyond.
            </p>

            {/* Stats bar */}
            <div className="mt-6 flex items-center gap-6">
              {stats.map((s) => (
                <div key={s.label}>
                  <div className="text-lg font-black text-indigo-400 leading-none">
                    {s.value}
                  </div>
                  <div className="text-[10px] font-semibold text-indigo-100/60 uppercase tracking-wider mt-0.5">
                    {s.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-3 my-6">
            {features.map((f) => (
              <div
                key={f.title}
                className="rounded-xl border border-white/8 p-3.5 transition-all duration-200 hover:border-indigo-400/30 hover:bg-white/5 group"
                style={{ background: "rgba(255,255,255,0.04)" }}
              >
                <div className="text-indigo-400 group-hover:scale-110 transition-transform duration-200 inline-block">
                  {f.icon}
                </div>
                <div className="mt-2 text-xs font-bold text-white/90 leading-tight">
                  {f.title}
                </div>
                <div className="mt-0.5 text-[10px] text-indigo-100/50 leading-snug">
                  {f.desc}
                </div>
              </div>
            ))}
          </div>

          {/* Social proof */}
          <div
            className="flex items-center gap-3 rounded-xl border border-white/10 px-4 py-3"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            {/* Stacked avatar circles */}
            <div className="flex -space-x-2">
              {["bg-indigo-400", "bg-indigo-500", "bg-indigo-650", "bg-indigo-800"].map((bgClass, i) => (
                <div
                  key={i}
                  className={`h-7 w-7 rounded-full border-2 border-[#1e1a6e] flex items-center justify-center text-[9px] font-black text-white ${bgClass}`}
                >
                  {["AK", "SR", "PM", "NK"][i]}
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Trophy key={i} size={10} className="text-amber-400 fill-amber-400" />
                ))}
              </div>
              <div className="text-[10px] text-indigo-100/60 mt-0.5">
                Trusted by engineers at IITs, NITs & top companies
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ============================================================
          RIGHT — Auth form panel
          ============================================================ */}
      <section
        className="flex flex-1 items-center justify-center px-4 py-10 sm:px-8"
        style={{ background: "var(--bg-base)" }}
      >
        <div className="w-full max-w-md">
          {/* Mobile-only logo */}
          <div className="md:hidden flex items-center gap-2.5 mb-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-700 text-white shadow-glow-sm">
              <Code2 size={20} />
            </div>
            <div>
              <div className="text-sm font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                Engineering Hub
              </div>
              <div className="text-[10px] font-semibold" style={{ color: "var(--text-muted)" }}>
                Professional Network
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="mb-7">
            <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              {mode === "login" ? "Welcome back" : "Create your account"}
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-muted)" }}>
              {mode === "login"
                ? "Sign in to continue to your engineering profile"
                : "Join thousands of engineers building their careers"}
            </p>
          </div>

          {/* Mode switcher — pill tabs */}
          <div
            className="flex p-1 rounded-xl mb-7 border"
            style={{
              background: "var(--bg-surface-2)",
              borderColor: "var(--border)",
            }}
          >
            {(["login", "register"] as AuthMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => switchMode(m)}
                className="flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200"
                style={
                  mode === m
                    ? {
                        background: "var(--bg-surface)",
                        color: "var(--brand)",
                        boxShadow: "var(--glass-shadow)",
                        border: "1px solid var(--border)",
                      }
                    : { color: "var(--text-muted)", border: "1px solid transparent" }
                }
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form className="space-y-4" onSubmit={submit}>
            {/* Register-only: name + username */}
            {mode === "register" && (
              <div className="grid grid-cols-2 gap-3 animate-fade-up">
                <div>
                  <label
                    className="block text-xs font-semibold mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Full Name
                  </label>
                  <input
                    className="field"
                    placeholder="John Doe"
                    value={form.fullName}
                    onChange={(e) => patch("fullName", e.target.value)}
                    minLength={2}
                    required
                  />
                </div>
                <div>
                  <label
                    className="block text-xs font-semibold mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Username
                  </label>
                  <input
                    className="field"
                    placeholder="johndoe"
                    value={form.username}
                    onChange={(e) => patch("username", e.target.value)}
                    minLength={3}
                    required
                  />
                </div>
              </div>
            )}

            {/* Email */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Email Address
              </label>
              <input
                className="field"
                type="email"
                placeholder="you@college.edu"
                value={form.email}
                onChange={(e) => patch("email", e.target.value)}
                required
              />
            </div>

            {/* Password with show/hide toggle */}
            <div>
              <label
                className="block text-xs font-semibold mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Password
              </label>
              <div className="relative">
                <input
                  className="field pr-10"
                  type={showPass ? "text" : "password"}
                  placeholder={mode === "register" ? "Min 8 characters" : "Your password"}
                  value={form.password}
                  onChange={(e) => patch("password", e.target.value)}
                  minLength={mode === "register" ? 8 : 1}
                  required
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors duration-150"
                  style={{ color: "var(--text-muted)" }}
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Role selector — card grid (register only) */}
            {mode === "register" && (
              <div className="animate-fade-up">
                <label
                  className="block text-xs font-semibold mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  I am a…
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {roleOptions.map((opt) => {
                    const active = form.role === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => patch("role", opt.value)}
                        className="flex flex-col items-center text-center gap-1.5 rounded-xl border p-3 transition-all duration-200 hover:scale-[1.02]"
                        style={{
                          borderColor: active ? "var(--brand)" : "var(--border-strong)",
                          background: active ? "var(--brand-light)" : "var(--bg-surface-2)",
                          color: active ? "var(--brand)" : "var(--text-secondary)",
                          boxShadow: active ? "0 0 0 2px var(--brand-glow)" : "none",
                        }}
                      >
                        <span className="opacity-80">{opt.icon}</span>
                        <span className="text-[11px] font-bold leading-tight">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Role description */}
                <p className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
                  <Zap size={10} className="inline mr-1" />
                  {roleOptions.find((o) => o.value === form.role)?.desc}
                </p>
              </div>
            )}

            {/* Error message */}
            {message && (
              <div className="flex items-start gap-2 rounded-xl border border-rose-500/25 bg-rose-500/10 text-rose-500 px-3.5 py-3 text-sm animate-fade-up">
                <ShieldCheck size={15} className="mt-0.5 shrink-0 opacity-80" />
                <span className="whitespace-pre-line">{message}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              className="btn-primary w-full py-2.5 text-sm font-bold mt-2 shadow-glow-sm"
              disabled={loading}
              type="submit"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={17} />
              ) : (
                <Lock size={17} />
              )}
              {loading
                ? mode === "login" ? "Signing in…" : "Creating account…"
                : mode === "login" ? "Sign In" : "Create Account"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="h-px flex-1 bg-border" style={{ backgroundColor: "var(--border)" }} />
              <span className="text-[10px] text-muted-fg uppercase tracking-wider">or continue with</span>
              <div className="h-px flex-1 bg-border" style={{ backgroundColor: "var(--border)" }} />
            </div>

            {/* GitHub OAuth Button */}
            <button
              type="button"
              onClick={() => {
                window.location.href = `${import.meta.env.VITE_API_URL || "/api/v1"}/auth/github`;
              }}
              className="w-full btn-secondary py-2.5 flex items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all hover:bg-slate-100 dark:hover:bg-slate-800 border-base"
            >
              <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              GitHub
            </button>

            {/* Mode switch hint */}
            <p className="text-center text-xs pt-4" style={{ color: "var(--text-muted)" }}>
              {mode === "login" ? (
                <>
                  Don't have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="font-semibold hover:underline"
                    style={{ color: "var(--brand)" }}
                  >
                    Sign up free
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="font-semibold hover:underline"
                    style={{ color: "var(--brand)" }}
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
