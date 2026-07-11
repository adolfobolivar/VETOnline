import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/** UC-011 main flow + A1 (invalid credentials). A2 (silent refresh) and A3 (logout) live in
 * the API client and Nav respectively, not here. */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // UC-010 BR-004: resume the originally intended destination after login, if there was one.
  const redirectTo =
    (location.state as { from?: string } | null)?.from ?? "/owners";

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(username, password);
      navigate(redirectTo, { replace: true });
    } catch {
      // UC-011 A1's exact text.
      setError("Incorrect username or password.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="screen-body"
      style={{
        minHeight: "70vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        className="form-shell"
        style={{
          background: "var(--navy)",
          color: "var(--navy-ink)",
          borderRadius: "var(--radius-l)",
          padding: "2.5rem",
          boxShadow: "var(--shadow-lg)",
        }}
      >
        <span className="eyebrow" style={{ color: "rgba(242,237,227,0.55)" }}>
          Clinic User Login
        </span>
        <h2 style={{ color: "var(--navy-ink)" }}>Sign in</h2>

        {error && <div className="form-alert">{error}</div>}

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="username" style={{ color: "rgba(242,237,227,0.7)" }}>
              Username or email
            </label>
            <input
              className="input"
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div className="field">
            <label htmlFor="password" style={{ color: "rgba(242,237,227,0.7)" }}>
              Password
            </label>
            <input
              className="input"
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
