import { useState } from "react";
import { GraduationCap, BriefcaseBusiness, CheckCircle2 } from "lucide-react";
import { useWorkspace } from "../hooks/useWorkspace";
import { useWorkspaceSwitcher } from "../hooks/useWorkspaceSwitcher";
import { useToast } from "../core/contexts/ToastContext";
import { Workspace } from "../core/contexts/WorkspaceContext";

/**
 * WorkspaceSelectorPage provides a premium user interface for selecting the initial workspace
 * context (Campus Workspace vs. Career Workspace) with support for persisting choices.
 */
export function WorkspaceSelectorPage() {
  const { activeWorkspace, rememberWorkspace, setRememberWorkspace } = useWorkspace();
  const { switchToCampus, switchToCareer } = useWorkspaceSwitcher();
  const { showToast } = useToast();

  const [selected, setSelected] = useState<Workspace>(activeWorkspace);
  const [remember, setRemember] = useState<boolean>(rememberWorkspace);

  const handleContinue = () => {
    // Persist choice and update preferences
    setRememberWorkspace(remember);
    if (selected === "CAMPUS") {
      switchToCampus();
    } else {
      switchToCareer();
    }

    showToast(
      "success",
      `Active workspace set to ${selected === "CAMPUS" ? "Campus" : "Career"} Workspace.`
    );
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "var(--bg-base)" }}
    >
      <div className="max-w-2xl w-full panel p-8 md:p-12 space-y-8 bg-surface shadow-panel">
        {/* Header Title Section */}
        <div className="text-center space-y-3">
          <div className="inline-flex p-3 bg-brand-light/10 text-brand rounded-full mb-2">
            <GraduationCap className="h-8 w-8 text-indigo-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            Welcome to Engineers Platform
          </h1>
          <p className="text-secondary max-w-md mx-auto">
            Choose your default workspace to customize your dashboard, resources, and workflows.
          </p>
        </div>

        {/* Workspace Card Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Campus Card Option */}
          <button
            onClick={() => setSelected("CAMPUS")}
            className={`text-left p-6 rounded-xl border-2 transition-all flex flex-col justify-between hover-lift relative ${
              selected === "CAMPUS"
                ? "border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10"
                : "border-base bg-surface-2 hover:bg-surface-3"
            }`}
            aria-selected={selected === "CAMPUS"}
            type="button"
          >
            {selected === "CAMPUS" && (
              <div className="absolute top-4 right-4 text-indigo-500">
                <CheckCircle2 className="h-5 w-5 fill-indigo-500 dark:fill-indigo-400 text-white" />
              </div>
            )}
            <div className="space-y-4">
              <div className="p-3 bg-indigo-500/10 rounded-lg inline-block text-indigo-500">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary">Campus Workspace</h3>
                <p className="text-sm text-secondary mt-1">
                  Focus on academic learning, building projects with peers, hackathons, and campus activities.
                </p>
              </div>
            </div>
          </button>

          {/* Career Card Option */}
          <button
            onClick={() => setSelected("CAREER")}
            className={`text-left p-6 rounded-xl border-2 transition-all flex flex-col justify-between hover-lift relative ${
              selected === "CAREER"
                ? "border-indigo-500 bg-indigo-500/5 dark:bg-indigo-500/10"
                : "border-base bg-surface-2 hover:bg-surface-3"
            }`}
            aria-selected={selected === "CAREER"}
            type="button"
          >
            {selected === "CAREER" && (
              <div className="absolute top-4 right-4 text-indigo-500">
                <CheckCircle2 className="h-5 w-5 fill-indigo-500 dark:fill-indigo-400 text-white" />
              </div>
            )}
            <div className="space-y-4">
              <div className="p-3 bg-indigo-500/10 rounded-lg inline-block text-indigo-500">
                <BriefcaseBusiness className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-primary">Career Workspace</h3>
                <p className="text-sm text-secondary mt-1">
                  Discover job openings, manage your placement drives, request referrals, and prepare for interviews.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Persistence Preference & Action Section */}
        <div className="space-y-6 pt-4 border-t border-base">
          <label className="flex items-center space-x-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="rounded border-gray-300 text-brand focus:ring-brand h-4 w-4"
            />
            <span className="text-sm text-secondary">
              Remember my workspace choice (you can switch anytime from the sidebar menu)
            </span>
          </label>

          <button
            onClick={handleContinue}
            className="w-full btn-primary py-3 flex items-center justify-center font-medium rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            type="button"
          >
            Continue to Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
