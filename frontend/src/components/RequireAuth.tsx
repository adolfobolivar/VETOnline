import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/** UC-011 BR-003 / NFR-002 equivalent on the frontend: clinic-management screens (UC-003
 * through UC-009) redirect to login rather than rendering when there's no session, preserving
 * the intended destination (UC-010 BR-004) so it can resume after sign-in. The API itself
 * still enforces this independently (Cognito Authorizer) — this is a UX nicety, not the
 * authorization boundary. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  return <>{children}</>;
}
