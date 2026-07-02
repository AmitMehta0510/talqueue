import { Outlet } from "react-router-dom";

/**
 * CareerLayout is a thin structural wrapper for the Career Workspace.
 * Serving as a mounting point for routing in future phases.
 */
export function CareerLayout() {
  return (
    <div className="workspace-career-shell w-full min-h-screen">
      <Outlet />
    </div>
  );
}
