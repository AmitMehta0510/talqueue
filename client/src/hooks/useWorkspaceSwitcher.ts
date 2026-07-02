import { useCallback } from "react";
import { useWorkspace } from "./useWorkspace";

/**
 * Custom hook providing actions to switch between Campus and Career workspaces.
 * Note: Actual route navigation triggers are deferred to Phase 3.
 */
export function useWorkspaceSwitcher() {
  const { activeWorkspace, setWorkspace } = useWorkspace();

  /** Switches the active workspace to CAMPUS */
  const switchToCampus = useCallback(() => {
    setWorkspace("CAMPUS");
  }, [setWorkspace]);

  /** Switches the active workspace to CAREER */
  const switchToCareer = useCallback(() => {
    setWorkspace("CAREER");
  }, [setWorkspace]);

  /** Toggles the active workspace context to the other workspace */
  const toggleWorkspace = useCallback(() => {
    setWorkspace(activeWorkspace === "CAMPUS" ? "CAREER" : "CAMPUS");
  }, [activeWorkspace, setWorkspace]);

  return {
    switchToCampus,
    switchToCareer,
    toggleWorkspace,
  };
}
