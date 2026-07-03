import { Link } from "react-router-dom";
import { PlusCircle, Search, Mail, Briefcase, Github, GraduationCap, MonitorPlay } from "lucide-react";
import { useAuth } from "../../core/contexts/AuthContext";
import { isRecruiter } from "../../core/utils/roles";
import { WidgetContainer } from "../ui/WidgetContainer";

export function QuickActionsWidget() {
  const { user } = useAuth();
  const recruiter = isRecruiter(user);

  if (recruiter) {
    const recruiterActions = [
      {
        label: "Post a Job",
        description: "Publish new opening",
        icon: PlusCircle,
        to: "/career/recruiter",
        colorClass: "text-brand bg-brand-light",
      },
      {
        label: "Search Resdex",
        description: "Filter verified portfolios",
        icon: Search,
        to: "/career/recruiter",
        colorClass: "text-blue-500 bg-blue-50 dark:bg-blue-950/20",
      },
      {
        label: "Invite College",
        description: "Initiate campus drive",
        icon: Mail,
        to: "/career/recruiter",
        colorClass: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20",
      },
    ];

    return (
      <WidgetContainer title="Recruiter Action Hub">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {recruiterActions.map((action, idx) => {
            const Icon = action.icon;
            return (
              <Link
                key={idx}
                to={action.to}
                className="flex items-center gap-3.5 p-3.5 rounded-xl border border-[color:var(--border)] hover:border-brand hover:bg-surface-2 transition-all duration-200 hover-lift"
              >
                <div className={`p-2.5 rounded-xl shrink-0 ${action.colorClass}`}>
                  <Icon size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-primary leading-none">
                    {action.label}
                  </p>
                  <p className="text-[9px] text-muted truncate mt-1">
                    {action.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </WidgetContainer>
    );
  }

  // Student Actions
  const studentActions = [
    {
      label: "Find Jobs",
      description: "Browse curated vacancies",
      icon: Briefcase,
      to: "/career/jobs",
      colorClass: "text-brand bg-brand-light",
    },
    {
      label: "Sync GitHub",
      description: "Verify your projects score",
      icon: Github,
      to: "/career/profile",
      colorClass: "text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-900/50",
    },
    {
      label: "Placement Board",
      description: "Track campus recruitment",
      icon: GraduationCap,
      to: "/campus/placements",
      colorClass: "text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20",
    },
    {
      label: "Prep Resources",
      description: "Mock test preparations",
      icon: MonitorPlay,
      to: "/career/interviews",
      colorClass: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20",
    },
  ];

  return (
    <WidgetContainer title="Career Navigation Hub">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {studentActions.map((action, idx) => {
          const Icon = action.icon;
          return (
            <Link
              key={idx}
              to={action.to}
              className="flex items-center gap-3 p-3 rounded-xl border border-[color:var(--border)] hover:border-brand hover:bg-surface-2 transition-all duration-200 hover-lift"
            >
              <div className={`p-2 rounded-lg shrink-0 ${action.colorClass}`}>
                <Icon size={14} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-black text-primary leading-none">
                  {action.label}
                </p>
                <p className="text-[8px] text-muted truncate mt-1">
                  {action.description}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </WidgetContainer>
  );
}
export default QuickActionsWidget;
