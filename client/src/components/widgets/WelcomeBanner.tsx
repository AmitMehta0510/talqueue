import { useAuth } from "../../core/contexts/AuthContext";
import { Sparkles } from "lucide-react";

export function WelcomeBanner() {
  const { user } = useAuth();
  const name = user?.profile?.fullName || user?.username || "Developer";

  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-gradient-to-r from-[color:var(--bg-surface)] to-[color:var(--bg-surface-2)] border-[color:var(--border)] shadow-sm"
    >
      {/* Background visual glow */}
      <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-brand/5 blur-3xl" />

      <div className="space-y-1 z-10">
        <h2 className="text-xl font-black text-primary flex items-center gap-2">
          Welcome back, {name}!
          <Sparkles className="text-brand animate-pulse" size={18} />
        </h2>
        <p className="text-xs text-secondary max-w-xl leading-relaxed">
          Ready to build, collaborate, and showcase your verified accomplishments today? Monitor active campus recruitment drives, team coding sessions, and upcoming hackathons here.
        </p>
      </div>
    </div>
  );
}
