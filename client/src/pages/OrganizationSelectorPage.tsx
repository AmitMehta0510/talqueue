import { Sparkles, GraduationCap, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function OrganizationSelectorPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface text-primary flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-950 rounded-full blur-[120px] opacity-40 pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-indigo-950 rounded-full blur-[120px] opacity-35 pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-4xl z-10 space-y-8 animate-in fade-in slide-in-from-bottom-3 duration-500">
        
        {/* Page Header */}
        <div className="text-center space-y-2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Sparkles size={12} /> B2B & Institutional Portal
          </span>
          <h1 className="text-4xl font-extrabold tracking-tight text-primary sm:text-5xl">
            Who are you representing?
          </h1>
          <p className="max-w-2xl mx-auto text-sm text-secondary">
            Choose the type of organization you want to onboard with Engineers Platform.
          </p>
        </div>

        {/* Funnel Selection Split Grid */}
        <div className="grid gap-6 md:grid-cols-2 mt-8 max-w-3xl mx-auto">
          
          {/* Option 1: College / Educational Institution */}
          <button
            onClick={() => navigate("/campus/onboarding")}
            className="group text-left p-6 rounded-2xl border border-base bg-surface-2/40 hover:border-indigo-500/50 hover:bg-[var(--brand-glow)] transition-all duration-500 relative overflow-hidden flex flex-col justify-between h-72 shadow-2xl"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <GraduationCap size={120} className="text-indigo-400" />
            </div>
            <div className="space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <GraduationCap size={24} />
              </div>
              <h3 className="text-xl font-bold text-primary group-hover:text-indigo-400 transition-colors">
                College / Educational Institution
              </h3>
              <p className="text-xs text-secondary leading-relaxed">
                Register your college to manage campus placements, student activities and institutional administration.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400 group-hover:translate-x-1 transition-transform">
              Institution Onboarding &rarr;
            </span>
          </button>

          {/* Option 2: Company / Employer */}
          <button
            onClick={() => navigate("/career/onboarding")}
            className="group text-left p-6 rounded-2xl border border-base bg-surface-2/40 hover:border-indigo-500/50 hover:bg-[var(--brand-glow)] transition-all duration-500 relative overflow-hidden flex flex-col justify-between h-72 shadow-2xl"
          >
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
              <UserCheck size={120} className="text-indigo-400" />
            </div>
            <div className="space-y-4">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <UserCheck size={24} />
              </div>
              <h3 className="text-xl font-bold text-primary group-hover:text-indigo-400 transition-colors">
                Company / Employer
              </h3>
              <p className="text-xs text-secondary leading-relaxed">
                Register your company to hire students, manage recruiters and participate in campus hiring.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-400 group-hover:translate-x-1 transition-transform">
              Enterprise Onboarding &rarr;
            </span>
          </button>

        </div>
      </div>
    </div>
  );
}
