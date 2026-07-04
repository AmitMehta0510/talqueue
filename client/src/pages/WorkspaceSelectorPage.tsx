import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  BriefcaseBusiness,
  Users,
  MessageSquare,
  Trophy,
  School,
  Target,
  UserPlus,
  Briefcase,
  Activity,
  Send,
  Zap,
} from "lucide-react";
import { useWorkspace } from "../hooks/useWorkspace";
import { useWorkspaceSwitcher } from "../hooks/useWorkspaceSwitcher";
import { useToast } from "../core/contexts/ToastContext";
import { useAuth } from "../core/contexts/AuthContext";

/**
 * WorkspaceSelectorPage provides a premium user interface for selecting the initial workspace
 * context (Campus Workspace vs. Career Workspace) with support for persisting choices.
 */
export function WorkspaceSelectorPage() {
  const { rememberWorkspace, setRememberWorkspace } = useWorkspace();
  const { switchToCampus, switchToCareer } = useWorkspaceSwitcher();
  const { showToast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [remember, setRemember] = useState<boolean>(rememberWorkspace);

  const firstName = user?.profile?.fullName?.split(" ")[0] || user?.username || "Developer";

  const handleEnterCampus = () => {
    setRememberWorkspace(remember);
    switchToCampus();
    showToast(
      "success",
      "Active workspace set to Campus Workspace."
    );
    navigate("/campus");
  };

  const handleEnterCareer = () => {
    setRememberWorkspace(remember);
    switchToCareer();
    showToast(
      "success",
      "Active workspace set to Career Workspace."
    );
    navigate("/career");
  };

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center p-6 md:p-12 relative overflow-hidden"
      style={{ background: "#080b11" }}
    >
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-indigo-500/5 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-cyan-500/5 blur-3xl pointer-events-none" />

      <div className="max-w-4xl w-full flex flex-col items-center space-y-10 z-10">
        {/* Header Title Section */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Welcome, {firstName}!
          </h1>
          <p className="text-gray-400 text-sm md:text-base font-normal">
            Choose your workspace to continue
          </p>
        </div>

        {/* Workspace Card Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-3xl">
          {/* Campus Card Option */}
          <div
            className="flex flex-col justify-between p-8 rounded-2xl border bg-[#0d111d]/90 backdrop-blur-md transition-all duration-300 shadow-[0_0_40px_0_rgba(99,102,241,0.03)] border-indigo-500/20 hover:border-indigo-500/60 hover:shadow-[0_0_40px_rgba(99,102,241,0.12)] group hover:-translate-y-1"
          >
            <div className="flex flex-col items-center">
              {/* Main Icon */}
              <div className="flex justify-center mb-6">
                <GraduationCap className="h-16 w-16 text-indigo-400 transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_12px_rgba(99,102,241,0.4)]" />
              </div>

              {/* Title & Desc */}
              <h3 className="text-2xl font-bold text-white text-center">Campus Workspace</h3>
              <p className="text-sm text-gray-400 text-center mt-3 leading-relaxed max-w-xs">
                Develop Skills. Build Engineering Identity. Get Placed.
              </p>

              {/* Bullet Features List */}
              <div className="space-y-4 my-8 w-full max-w-[240px] text-left">
                <div className="flex items-center space-x-3.5 text-sm text-gray-300 transition-colors duration-200 hover:text-white">
                  <School className="h-4.5 w-4.5 text-indigo-400 flex-shrink-0" />
                  <span className="font-medium">College & Departments</span>
                </div>
                <div className="flex items-center space-x-3.5 text-sm text-gray-300 transition-colors duration-200 hover:text-white">
                  <Users className="h-4.5 w-4.5 text-indigo-400 flex-shrink-0" />
                  <span className="font-medium">Projects & Teams</span>
                </div>
                <div className="flex items-center space-x-3.5 text-sm text-gray-300 transition-colors duration-200 hover:text-white">
                  <MessageSquare className="h-4.5 w-4.5 text-indigo-400 flex-shrink-0" />
                  <span className="font-medium">College Communities</span>
                </div>
                <div className="flex items-center space-x-3.5 text-sm text-gray-300 transition-colors duration-200 hover:text-white">
                  <Trophy className="h-4.5 w-4.5 text-indigo-400 flex-shrink-0" />
                  <span className="font-medium">Hackathons & Events</span>
                </div>
                <div className="flex items-center space-x-3.5 text-sm text-gray-300 transition-colors duration-200 hover:text-white">
                  <Target className="h-4.5 w-4.5 text-indigo-400 flex-shrink-0" />
                  <span className="font-medium">Placement Drives</span>
                </div>
              </div>
            </div>

            {/* Enter Button */}
            <button
              onClick={handleEnterCampus}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-600 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 shadow-[0_4px_20px_rgba(99,102,241,0.25)] hover:shadow-[0_4px_25px_rgba(99,102,241,0.45)] active:scale-[0.98] cursor-pointer text-center text-sm"
              type="button"
            >
              Enter Your Campus
            </button>
          </div>

          {/* Career Card Option */}
          <div
            className="flex flex-col justify-between p-8 rounded-2xl border bg-[#0c141d]/90 backdrop-blur-md transition-all duration-300 shadow-[0_0_40px_0_rgba(6,182,212,0.03)] border-cyan-500/20 hover:border-cyan-500/60 hover:shadow-[0_0_40px_rgba(6,182,212,0.12)] group hover:-translate-y-1"
          >
            <div className="flex flex-col items-center">
              {/* Main Icon */}
              <div className="flex justify-center mb-6">
                <BriefcaseBusiness className="h-16 w-16 text-cyan-400 transition-transform duration-300 group-hover:scale-110 drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]" />
              </div>

              {/* Title & Desc */}
              <h3 className="text-2xl font-bold text-white text-center">Career Workspace</h3>
              <p className="text-sm text-gray-400 text-center mt-3 leading-relaxed max-w-xs">
                Don't just apply. Get referred. Get hired.
              </p>

              {/* Bullet Features List */}
              <div className="space-y-4 my-8 w-full max-w-[240px] text-left">
                <div className="flex items-center space-x-3.5 text-sm text-gray-300 transition-colors duration-200 hover:text-white">
                  <Briefcase className="h-4.5 w-4.5 text-cyan-400 flex-shrink-0" />
                  <span className="font-medium">Fresh Jobs & Internships</span>
                </div>
                <div className="flex items-center space-x-3.5 text-sm text-gray-300 transition-colors duration-200 hover:text-white">
                  <UserPlus className="h-4.5 w-4.5 text-cyan-400 flex-shrink-0" />
                  <span className="font-medium">Direct Team Referrals</span>
                </div>
                <div className="flex items-center space-x-3.5 text-sm text-gray-300 transition-colors duration-200 hover:text-white">
                  <Activity className="h-4.5 w-4.5 text-cyan-400 flex-shrink-0" />
                  <span className="font-medium">Real-Time Application Tracking</span>
                </div>
                <div className="flex items-center space-x-3.5 text-sm text-gray-300 transition-colors duration-200 hover:text-white">
                  <Send className="h-4.5 w-4.5 text-cyan-400 flex-shrink-0" />
                  <span className="font-medium">Direct Recruiter Access</span>
                </div>
                <div className="flex items-center space-x-3.5 text-sm text-gray-300 transition-colors duration-200 hover:text-white">
                  <Zap className="h-4.5 w-4.5 text-cyan-400 flex-shrink-0" />
                  <span className="font-medium">Skill-Based Job Matching</span>
                </div>
              </div>
            </div>

            {/* Enter Button */}
            <button
              onClick={handleEnterCareer}
              className="w-full bg-gradient-to-r from-cyan-600 to-cyan-500 hover:from-cyan-500 hover:to-cyan-600 text-white font-semibold py-3.5 rounded-xl transition-all duration-300 shadow-[0_4px_20px_rgba(6,182,212,0.25)] hover:shadow-[0_4px_25px_rgba(6,182,212,0.45)] active:scale-[0.98] cursor-pointer text-center text-sm"
              type="button"
            >
              Get Started
            </button>
          </div>
        </div>

        {/* Persistence Preference Toggle Switch */}
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-400">Remember my choice</span>
          <button
            onClick={() => setRemember(!remember)}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 focus:outline-none ${remember ? "bg-indigo-500" : "bg-gray-700"
              }`}
            type="button"
            role="switch"
            aria-checked={remember}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${remember ? "translate-x-5" : "translate-x-0"
                }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
