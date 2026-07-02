import { Outlet } from "react-router-dom";

/**
 * SharedLayout is a thin structural wrapper for the Shared Workspace services.
 * Serving as a mounting point for routing in future phases.
 */
export function SharedLayout() {
  return (
    <div className="workspace-shared-shell w-full min-h-screen">
      <Outlet />
    </div>
  );
}
