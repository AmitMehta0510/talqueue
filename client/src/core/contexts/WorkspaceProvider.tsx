import { useState, useEffect, ReactNode, useMemo, useCallback } from "react";
import { Workspace, WorkspaceContext, WorkspaceContextValue } from "./WorkspaceContext";

const ACTIVE_WORKSPACE_KEY = "engineers_platform_active_workspace";
const REMEMBER_WORKSPACE_KEY = "engineers_platform_remember_workspace";

/**
 * Helper to synchronously fetch and parse active workspace from localStorage.
 * Defaults to "CAMPUS" in case of missing, invalid, or unparseable values.
 */
function getStoredWorkspace(): Workspace {
  try {
    const val = localStorage.getItem(ACTIVE_WORKSPACE_KEY);
    if (val === "CAMPUS" || val === "CAREER") {
      return val;
    }
  } catch {
    // Fail-safe fallback on storage access errors
  }
  return "CAMPUS";
}

/**
 * Helper to synchronously fetch and parse the remember workspace setting from localStorage.
 * Defaults to false.
 */
function getStoredRemember(): boolean {
  try {
    const val = localStorage.getItem(REMEMBER_WORKSPACE_KEY);
    return val === "true";
  } catch {
    // Fail-safe fallback on storage access errors
  }
  return false;
}

/**
 * Provider component for managing active workspace context, state persistence,
 * and cross-tab synchronization.
 */
export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [activeWorkspace, setActiveWorkspaceState] = useState<Workspace>(getStoredWorkspace);
  const [rememberWorkspace, setRememberWorkspaceState] = useState<boolean>(getStoredRemember);
  const [hasSelectedThisSession, setHasSelectedThisSession] = useState<boolean>(getStoredRemember);

  const setWorkspace = useCallback((workspace: Workspace) => {
    setActiveWorkspaceState(workspace);
    setHasSelectedThisSession(true);
    try {
      localStorage.setItem(ACTIVE_WORKSPACE_KEY, workspace);
    } catch {
      // Fail-safe in restricted environments
    }
  }, []);

  const setRememberWorkspace = useCallback((remember: boolean) => {
    setRememberWorkspaceState(remember);
    setHasSelectedThisSession(true);
    try {
      localStorage.setItem(REMEMBER_WORKSPACE_KEY, String(remember));
    } catch {
      // Fail-safe in restricted environments
    }
  }, []);

  // Listen to storage events to keep workspace choice in sync across open tabs
  useEffect(() => {
    const handleStorageEvent = (event: StorageEvent) => {
      if (event.key === ACTIVE_WORKSPACE_KEY) {
        const nextWorkspace = event.newValue;
        if (nextWorkspace === "CAMPUS" || nextWorkspace === "CAREER") {
          setActiveWorkspaceState(nextWorkspace);
          setHasSelectedThisSession(true);
        }
      } else if (event.key === REMEMBER_WORKSPACE_KEY) {
        const isRemembered = event.newValue === "true";
        setRememberWorkspaceState(isRemembered);
        setHasSelectedThisSession(true);
      }
    };

    window.addEventListener("storage", handleStorageEvent);
    return () => {
      window.removeEventListener("storage", handleStorageEvent);
    };
  }, []);

  const value = useMemo<WorkspaceContextValue>(() => ({
    activeWorkspace,
    setWorkspace,
    rememberWorkspace,
    setRememberWorkspace,
    hasSelectedThisSession,
  }), [activeWorkspace, setWorkspace, rememberWorkspace, setRememberWorkspace, hasSelectedThisSession]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}
