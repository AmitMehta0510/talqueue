import { useRouteError, isRouteErrorResponse, useNavigate } from "react-router-dom";

/**
 * Route-level error fallback rendered by React Router v6 errorElement.
 *
 * Unlike AppErrorBoundary (which unmounts the whole app), this only unmounts
 * the erroring subtree -- the rest of the workspace stays fully interactive.
 *
 * Usage:
 *   <Route path="/campus" element={<CampusLayout />} errorElement={<RouteErrorPage />}>
 */
export default function RouteErrorPage() {
  const error = useRouteError();
  const navigate = useNavigate();

  let title = "Something went wrong";
  let description = "An unexpected error occurred on this page.";
  let status: number | null = null;

  if (isRouteErrorResponse(error)) {
    status = error.status;
    if (error.status === 404) {
      title = "Page not found";
      description = "The page you are looking for does not exist or has been moved.";
    } else if (error.status === 403) {
      title = "Access denied";
      description = "You do not have permission to view this page.";
    } else {
      description = error.statusText || description;
    }
  } else if (error instanceof Error) {
    description = error.message;
  }

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "60vh",
      gap: "1rem",
      padding: "2rem",
      textAlign: "center",
      fontFamily: "inherit",
    }}>
      {status && (
        <span style={{ fontSize: "4rem", fontWeight: 800, opacity: 0.15 }}>
          {status}
        </span>
      )}

      <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>
        {title}
      </h1>

      <p style={{ margin: 0, opacity: 0.6, maxWidth: "36ch" }}>
        {description}
      </p>

      <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
        <button
          id="route-error-go-back"
          onClick={() => navigate(-1)}
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "0.5rem",
            border: "1px solid currentColor",
            background: "transparent",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "0.875rem",
          }}
        >
          Go back
        </button>
        <button
          id="route-error-reload"
          onClick={() => window.location.reload()}
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "var(--accent, #6366f1)",
            color: "#fff",
            cursor: "pointer",
            fontFamily: "inherit",
            fontSize: "0.875rem",
          }}
        >
          Reload page
        </button>
      </div>
    </div>
  );
}
