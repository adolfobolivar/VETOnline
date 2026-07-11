import { useLocation } from "react-router-dom";
import { ErrorPage } from "./ErrorPage";

/** The /error route: variant comes from navigation state (set by whichever page's catch block
 * routed here), defaulting to "unexpected" for a bare, no-state visit. */
export function ErrorRoute() {
  const location = useLocation();
  const variant =
    (location.state as { variant?: "not-found" | "unexpected" } | null)?.variant ??
    "unexpected";
  return <ErrorPage variant={variant} />;
}
