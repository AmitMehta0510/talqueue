import { Outlet } from "react-router-dom";

/**
 * CampusLayout is a thin structural wrapper for the Campus Workspace.
 * Serving as a mounting point for routing in future phases.
 */
export function CampusLayout() {
  return (
    <div className="workspace-campus-shell w-full min-h-screen">
      <Outlet />
    </div>
  );
}
