import { FormEvent, useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  Code2,
  Loader2,
  Lock,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { RoleName } from "../lib/api";
import { getErrorMessage, titleCase, userName } from "../lib/format";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../contexts/ToastContext";

type AuthMode = "login" | "register";

const roleOptions: RoleName[] = [
  "STUDENT",
  "PROFESSOR",
  "PROFESSIONAL",
];

export function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [form, setForm] = useState({
    email: "",
    username: "",
    fullName: "",
    password: "",
    role: "STUDENT" as RoleName,
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const { login, register, user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const redirectTarget =
    (location.state as { from?: { pathname?: string; search?: string } } | null)
      ?.from || { pathname: "/feed", search: "" };
  const redirectTo = `${redirectTarget.pathname || "/feed"}${redirectTarget.search || ""}`;

  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true });
    }
  }, [navigate, redirectTo, user]);

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

      showToast("success", `Welcome, ${userName({ username: form.username, email: form.email, id: "" })}`);
      navigate(redirectTo, { replace: true });
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-panel md:grid-cols-[0.9fr_1.1fr]">
        <section className="bg-[#18332d] p-8 text-white sm:p-10">
          <div className="flex h-full flex-col justify-between gap-12">
            <div>
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-emerald-400 text-emerald-950">
                <Code2 size={24} />
              </div>
              <h1 className="mt-6 max-w-sm text-3xl font-bold leading-tight sm:text-4xl">
                Engineering Platform
              </h1>
              <p className="mt-4 max-w-sm text-sm leading-6 text-emerald-50/80">
                Build your engineering profile, collaborate on projects, find
                communities, and keep your work visible to the right people.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="rounded-lg border border-white/10 bg-white/8 p-4">
                <Sparkles size={18} />
                <div className="mt-3 font-semibold">AI-ranked feed</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/8 p-4">
                <ShieldCheck size={18} />
                <div className="mt-3 font-semibold">Trust scores</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/8 p-4">
                <Users size={18} />
                <div className="mt-3 font-semibold">Teams</div>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/8 p-4">
                <BriefcaseBusiness size={18} />
                <div className="mt-3 font-semibold">Jobs</div>
              </div>
            </div>
          </div>
        </section>

        <section className="p-6 sm:p-10">
          <div className="mb-8 flex rounded-lg border border-slate-200 bg-slate-50 p-1">
            {(["login", "register"] as AuthMode[]).map((authMode) => (
              <button
                key={authMode}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold transition ${
                  mode === authMode
                    ? "bg-white text-emerald-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-900"
                }`}
                type="button"
                onClick={() => {
                  setMode(authMode);
                  setMessage(null);
                }}
              >
                {authMode === "login" ? "Login" : "Create account"}
              </button>
            ))}
          </div>

          <form className="space-y-4" onSubmit={submit}>
            {mode === "register" && (
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-slate-700">
                  Full name
                  <input
                    className="field mt-1.5"
                    value={form.fullName}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, fullName: event.target.value }))
                    }
                    minLength={2}
                    required
                  />
                </label>
                <label className="block text-sm font-medium text-slate-700">
                  Username
                  <input
                    className="field mt-1.5"
                    value={form.username}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, username: event.target.value }))
                    }
                    minLength={3}
                    required
                  />
                </label>
              </div>
            )}

            <label className="block text-sm font-medium text-slate-700">
              Email
              <input
                className="field mt-1.5"
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({ ...current, email: event.target.value }))
                }
                required
              />
            </label>

            <label className="block text-sm font-medium text-slate-700">
              Password
              <input
                className="field mt-1.5"
                type="password"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
                minLength={mode === "register" ? 8 : 1}
                required
              />
            </label>

            {mode === "register" && (
              <label className="block text-sm font-medium text-slate-700">
                Role
                <select
                  className="field mt-1.5"
                  value={form.role}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, role: event.target.value as RoleName }))
                  }
                >
                  {roleOptions.map((role) => (
                    <option key={role} value={role}>
                      {titleCase(role)}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {message && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 whitespace-pre-line">
                {message}
              </div>
            )}

            <button className="btn-primary w-full" disabled={loading} type="submit">
              {loading ? <Loader2 className="animate-spin" size={17} /> : <Lock size={17} />}
              {mode === "login" ? "Login" : "Create account"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
