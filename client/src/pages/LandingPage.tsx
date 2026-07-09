import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  BriefcaseBusiness,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

export function LandingPage() {
  const navigate = useNavigate();
  const [slide, setSlide] = useState<0 | 1 | 2>(0);

  const handleNext = () => {
    if (slide < 2) {
      setSlide((s) => (s + 1) as 1 | 2);
    } else {
      navigate("/auth");
    }
  };

  const handleSkip = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex flex-col justify-between text-white" style={{ background: "var(--bg-base)" }}>
      {/* Dynamic glow orbs in corners */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Header Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 h-16 flex items-center justify-between border-b border-base relative z-10">
        <div className="inline-flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 overflow-hidden shadow-glow">
            <img src="/favicon.png" alt="Forge" className="w-full h-full object-contain p-1.5" draggable={false} />
          </div>
          <div>
            <div className="text-sm font-black tracking-tight leading-none text-primary">
              Forge
            </div>
            <div className="text-[9px] font-bold tracking-[0.15em] uppercase text-indigo-400/80 leading-none mt-0.5">
              Build. Ship. Get Hired.
            </div>
          </div>
        </div>
        <button
          onClick={handleSkip}
          className="text-xs font-semibold text-secondary hover:text-primary transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-3 border border-base"
        >
          Explore
        </button>
      </header>

      {/* Main Slide Carousel Panel */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-6 flex items-center justify-center relative z-10 py-12">
        {slide === 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center animate-fade-up w-full">
            <div className="lg:col-span-7 space-y-6 text-left">
              <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight text-primary">
                Your career starts with{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
                  what you build,
                </span>
                <br />not just your resume.
              </h1>
              <p className="text-secondary text-sm max-w-lg leading-relaxed">
                Build real projects. Collaborate with peers. Showcase verified contributions. Get noticed by the right opportunities.
              </p>
              <div className="flex items-center gap-4 pt-2">
                <button onClick={handleNext} className="btn-primary px-6 py-3 rounded-xl font-semibold flex items-center gap-2">
                  Get Started <ArrowRight size={16} />
                </button>
                <button onClick={() => navigate("/discover")} className="btn-secondary px-6 py-3 rounded-xl font-semibold">
                  Explore Platform
                </button>
              </div>
            </div>
            {/* Visual Milestones Deck */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="relative w-full max-w-xs aspect-square flex items-center justify-center border border-base rounded-2xl bg-surface-2/20 backdrop-blur-md p-6">
                <div className="space-y-4 w-full">
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-base bg-surface-2 shadow-card">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">1</div>
                    <div>
                      <h4 className="text-xs font-bold text-primary">Build a Project</h4>
                      <p className="text-[10px] text-muted-fg">Sync and audit Github repositories</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-base bg-surface-2 shadow-card translate-x-3">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">2</div>
                    <div>
                      <h4 className="text-xs font-bold text-primary">Assemble Teams</h4>
                      <p className="text-[10px] text-muted-fg">Form crew networks with peers</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-base bg-surface-2 shadow-card translate-x-6">
                    <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center font-bold">3</div>
                    <div>
                      <h4 className="text-xs font-bold text-primary">Hackathons & Placements</h4>
                      <p className="text-[10px] text-muted-fg">Compete and lock career offers</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {slide === 1 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center animate-fade-up w-full">
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-medium">
                <GraduationCap size={14} /> Campus Workspace
              </div>
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-primary">
                Your Academic & Learning Workspace
              </h2>
              <p className="text-secondary text-sm max-w-lg leading-relaxed">
                Connect with your college, verify your graduation batch, team up for coding hackathons, build portfolio repos, and track TPO placement drive eligibility.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 text-xs text-secondary">
                  <ShieldCheck className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span>College-verified academic timelines and CGPAs.</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-secondary">
                  <ShieldCheck className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span>Collaborative project showcase pages.</span>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <button onClick={handleNext} className="btn-primary px-6 py-3 rounded-xl font-semibold flex items-center gap-2">
                  Continue <ChevronRight size={16} />
                </button>
                <button onClick={handleSkip} className="text-xs text-secondary hover:text-primary transition-colors font-medium">
                  Skip Introduction
                </button>
              </div>
            </div>
            {/* Slide 2 Visual representation */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="panel p-6 w-full max-w-sm bg-surface space-y-4">
                <div className="flex items-center justify-between border-b border-base pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                      <GraduationCap size={14} />
                    </div>
                    <span className="text-xs font-bold text-primary">Campus Portal</span>
                  </div>
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full font-medium">Active</span>
                </div>
                <div className="space-y-2">
                  <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 rounded-full w-[78%]" />
                  </div>
                  <div className="flex justify-between text-[9px] text-muted-fg">
                    <span>Placement Ratio: 78%</span>
                    <span>14 Drives scheduled</span>
                  </div>
                </div>
                <div className="p-3 bg-surface-2 rounded-lg border border-base space-y-1">
                  <span className="text-[9px] text-muted-fg font-medium">ACTIVE INVITE</span>
                  <div className="flex justify-between items-center text-xs font-bold text-primary">
                    <span>Google Campus Drive</span>
                    <span className="text-indigo-400">Reviewing</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {slide === 2 && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center animate-fade-up w-full">
            <div className="lg:col-span-7 space-y-6 text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-medium">
                <BriefcaseBusiness size={14} /> Career Workspace
              </div>
              <h2 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-primary">
                Your Job Opportunities & Recruitment Portal
              </h2>
              <p className="text-secondary text-sm max-w-lg leading-relaxed">
                Unlock matching corporate job postings. Secure referrals from verified professionals. Coordinate recruiter interviews and manage your applicant pipeline slots.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 text-xs text-secondary">
                  <ShieldCheck className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span>Interactive Kanban applicant tracking pipeline.</span>
                </div>
                <div className="flex items-center gap-2.5 text-xs text-secondary">
                  <ShieldCheck className="h-4 w-4 text-indigo-500 shrink-0" />
                  <span>Sourcing Resdex search engine with verified stats.</span>
                </div>
              </div>
              <div className="flex items-center gap-4 pt-2">
                <button onClick={handleNext} className="btn-primary px-6 py-3 rounded-xl font-semibold flex items-center gap-2">
                  Launch Platform <ChevronRight size={16} />
                </button>
              </div>
            </div>
            {/* Slide 3 Visual representation */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="panel p-6 w-full max-w-sm bg-surface space-y-4">
                <div className="flex items-center justify-between border-b border-base pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-md bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                      <BriefcaseBusiness size={14} />
                    </div>
                    <span className="text-xs font-bold text-primary">Recruiter Pipeline</span>
                  </div>
                  <span className="text-[10px] text-muted-fg">Adobe</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-surface-2 p-2 rounded-lg border border-base text-center">
                    <span className="text-[9px] text-muted-fg font-medium">Applied</span>
                    <h5 className="text-sm font-bold text-primary mt-0.5">156</h5>
                  </div>
                  <div className="bg-surface-2 p-2 rounded-lg border border-base text-center">
                    <span className="text-[9px] text-muted-fg font-medium">Shortlist</span>
                    <h5 className="text-sm font-bold text-primary mt-0.5">34</h5>
                  </div>
                  <div className="bg-surface-2 p-2 rounded-lg border border-base text-center">
                    <span className="text-[9px] text-muted-fg font-medium">Interviews</span>
                    <h5 className="text-sm font-bold text-primary mt-0.5">8</h5>
                  </div>
                </div>
                <div className="p-3 bg-surface-2 rounded-lg border border-base space-y-1.5">
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-primary">Amit Mehta</span>
                    <span className="text-indigo-400 font-semibold">9.2 CGPA</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="px-1.5 py-0.5 text-[8px] bg-slate-800 text-slate-300 rounded">React</span>
                    <span className="px-1.5 py-0.5 text-[8px] bg-slate-800 text-slate-300 rounded">NodeJS</span>
                    <span className="px-1.5 py-0.5 text-[8px] bg-slate-800 text-slate-300 rounded">TypeScript</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Carousel Slide indicators & Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 h-16 flex items-center justify-between border-t border-base relative z-10">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSlide(0)}
            className={`h-2 rounded-full transition-all ${slide === 0 ? "w-6 bg-indigo-500" : "w-2 bg-slate-700 hover:bg-slate-600"}`}
            aria-label="Go to slide 1"
            type="button"
          />
          <button
            onClick={() => setSlide(1)}
            className={`h-2 rounded-full transition-all ${slide === 1 ? "w-6 bg-indigo-500" : "w-2 bg-slate-700 hover:bg-slate-600"}`}
            aria-label="Go to slide 2"
            type="button"
          />
          <button
            onClick={() => setSlide(2)}
            className={`h-2 rounded-full transition-all ${slide === 2 ? "w-6 bg-indigo-500" : "w-2 bg-slate-700 hover:bg-slate-600"}`}
            aria-label="Go to slide 3"
            type="button"
          />
        </div>
        <div className="text-[10px] text-muted-fg font-medium tracking-wider">
          FORGE © 2026 • DARK UI • REALTIME UPDATES • SECURE & SCALABLE
        </div>
      </footer>
    </div>
  );
}
export default LandingPage;
