import { useCallback } from "react";
import { useWorkspace } from "./useWorkspace";
import { useNavigate } from "react-router-dom";

/**
 * Custom hook providing actions to switch between Campus and Career workspaces.
 */
export function useWorkspaceSwitcher() {
  const { activeWorkspace, setWorkspace } = useWorkspace();
  const navigate = useNavigate();

  /** Switches the active workspace to CAMPUS */
  const switchToCampus = useCallback(() => {
    setWorkspace("CAMPUS");
    navigate("/campus");
  }, [setWorkspace, navigate]);

  /** Switches the active workspace to CAREER */
  const switchToCareer = useCallback(() => {
    setWorkspace("CAREER");
    navigate("/career");
  }, [setWorkspace, navigate]);

  /** Toggles the active workspace context to the other workspace */
  const toggleWorkspace = useCallback(() => {
    const target = activeWorkspace === "CAMPUS" ? "CAREER" : "CAMPUS";
    setWorkspace(target);
    navigate(target === "CAMPUS" ? "/campus" : "/career");
  }, [activeWorkspace, setWorkspace, navigate]);

  return {
    switchToCampus,
    switchToCareer,
    toggleWorkspace,
  };
}
