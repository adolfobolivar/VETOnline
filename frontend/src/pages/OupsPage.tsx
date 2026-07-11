import { useEffect, useState } from "react";
import { apiClient } from "../lib/apiClient";
import { ErrorPage } from "./ErrorPage";

/** UC-010 BR-005: the "Error" nav link calls the backend's /oups demo endpoint (a real HTTP
 * 500), then renders the same shared error-shell BR-005 requires — not a raw browser
 * navigation to the API's own origin, which would strand the user outside MainLayout (BR-002)
 * and violate BR-003 (the backend's plain-text response isn't a sanitized UI message). */
export function OupsPage() {
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    apiClient
      .get("/oups")
      .catch(() => {
        // Expected — /oups always fails. The error itself is irrelevant here; only reaching
        // this catch (i.e. the demo actually fired) matters.
      })
      .finally(() => setTriggered(true));
  }, []);

  if (!triggered) {
    return null;
  }

  return <ErrorPage variant="unexpected" />;
}
