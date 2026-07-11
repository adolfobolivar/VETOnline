import { Link } from "react-router-dom";

interface ErrorPageProps {
  variant?: "not-found" | "unexpected";
}

/** UC-010: the same error-shell shape for both variants (BR-002 keeps the nav shell around
 * this, since ErrorPage renders inside MainLayout's <Outlet/> like any other route) — only the
 * heading/body text changes, per design-system.md. BR-003: message only, no stack trace; the
 * real error detail stays in the browser console / CloudWatch, never in this UI. */
export function ErrorPage({ variant = "unexpected" }: ErrorPageProps) {
  const isNotFound = variant === "not-found";

  return (
    <div className="screen-body">
      <div className="error-shell">
        <span className="eyebrow">
          {isNotFound ? "Not found" : "Unexpected error"}
        </span>
        <h2>Something happened&hellip;</h2>
        <p>
          {isNotFound
            ? "We couldn't find what you were looking for. It may have been removed, or the link may be incorrect."
            : "We couldn't complete that request. Nothing was saved. Try again, or head back to the welcome page."}
        </p>
        <Link className="btn btn-primary" to="/">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
