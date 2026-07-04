import { useContext } from "react";
import { WorkspaceContext, WorkspaceContextValue } from "../core/contexts/WorkspaceContext";

/**
 * Custom hook to consume the WorkspaceContext value.
 * Throws a descriptive error if accessed outside a valid WorkspaceProvider.
 *
 * @returns The active workspace state, switchers, and preferences.
 */
export function useWorkspace(): WorkspaceContextValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
