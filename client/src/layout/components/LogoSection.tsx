import { Link } from "react-router-dom";
import { Code2 } from "lucide-react";

/**
 * Renders the canonical Engineering Hub logo and title section.
 */
export function LogoSection() {
  return (
    <Link to="/feed" className="flex items-center gap-2 shrink-0">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-700 text-white shadow-glow-sm hover:bg-indigo-600 transition-all duration-200 hover:scale-105">
        <Code2 size={20} />
      </div>
      <div className="hidden sm:block">
        <span className="text-sm font-black tracking-tight block leading-none" style={{ color: "var(--text-primary)" }}>
          Engineering
        </span>
        <span className="text-[10px] font-bold block mt-0.5 uppercase tracking-wider leading-none" style={{ color: "var(--text-muted)" }}>
          Hub
        </span>
      </div>
    </Link>
  );
}
