import { createContext } from "react";

/**
 * Supported Workspace contexts in the Engineers Platform.
 * CAMPUS: Academic, student learning, and college placement cell context.
 * CAREER: Professional timeline, search boards, applications, and corporate recruiter context.
 */
export type Workspace = "CAMPUS" | "CAREER";

/**
 * Data shape exposed by the WorkspaceContext provider.
 */
export type WorkspaceContextValue = {
  /** The currently active workspace context */
  activeWorkspace: Workspace;
  /** Sets the active workspace context and triggers persistence */
  setWorkspace: (workspace: Workspace) => void;
  /** Whether the user's workspace choice should be remembered across sessions */
  rememberWorkspace: boolean;
  /** Updates the remember workspace preference */
  setRememberWorkspace: (remember: boolean) => void;
  /** Tracks if a workspace selection has been committed during the current browser session */
  hasSelectedThisSession: boolean;
};

/**
 * React context for managing active workspace selection and preferences.
 */
export const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);
