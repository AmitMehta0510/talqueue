import { Outlet } from "react-router-dom";

/**
 * WorkspaceSelectorLayout is a thin structural wrapper for the Workspace selection views.
 * Serving as a mounting point for routing in future phases.
 */
export function WorkspaceSelectorLayout() {
  return (
    <div className="workspace-selector-shell w-full min-h-screen flex flex-col" style={{ background: "#080b11" }}>
      <Outlet />
    </div>
  );
}
