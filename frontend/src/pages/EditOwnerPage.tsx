import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiClient, ApiError, UnauthorizedError } from "../lib/apiClient";
import { parseFieldErrors } from "../lib/fieldErrors";
import type { OwnerCreate, OwnerDetailOut, OwnerOut } from "../types/api";

/** UC-006 main flow + A1 (validation errors). Reuses OwnerCreate's shape for the PUT body —
 * the backend's update endpoint takes the same five fields as create. */
export function EditOwnerPage() {
  const { ownerId } = useParams<{ ownerId: string }>();
  const navigate = useNavigate();

  const [form, setForm] = useState<OwnerCreate | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showAlert, setShowAlert] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // `cancelled` guards against StrictMode's dev-mode double-invocation of this effect (or a
    // fast ownerId change): without it, a second, redundant fetch resolving after the user has
    // already started editing the pre-filled form would silently clobber their in-progress
    // edit by resetting `form` back to the freshly-fetched (but now stale) server values.
    let cancelled = false;
    apiClient
      .get<OwnerDetailOut>(`/owners/${ownerId}`)
      .then((owner) => {
        if (cancelled) return;
        setForm({
          first_name: owner.first_name,
          last_name: owner.last_name,
          address: owner.address,
          city: owner.city,
          telephone: owner.telephone,
        });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof UnauthorizedError) {
          navigate("/login", { state: { from: `/owners/${ownerId}/edit` } });
        } else if (err instanceof ApiError && err.status === 404) {
          navigate("/error", { state: { variant: "not-found" } });
        } else {
          navigate("/error");
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  function updateField(field: keyof OwnerCreate, value: string) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSubmitting(true);
    setFieldErrors({});
    setShowAlert(false);
    try {
      await apiClient.put<OwnerOut>(`/owners/${ownerId}`, form);
      navigate(`/owners/${ownerId}`, { state: { banner: "Owner Values Updated" } });
      return;
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        navigate("/login", { state: { from: `/owners/${ownerId}/edit` } });
        return;
      }
      if (err instanceof ApiError && err.status === 422) {
        setFieldErrors(parseFieldErrors(err.body));
        setShowAlert(true);
      } else if (err instanceof ApiError && err.status === 404) {
        navigate("/error", { state: { variant: "not-found" } });
        return;
      } else {
        navigate("/error");
        return;
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (!form) {
    return null;
  }

  return (
    <div className="screen-body">
      <div className="screen-head" style={{ padding: 0, marginBottom: "1.5rem" }}>
        <span className="eyebrow">UC-006 &middot; Update owner</span>
        <h2>Edit owner</h2>
      </div>

      <div className="form-shell">
        {showAlert && (
          <div className="form-alert">There was an error in updating the owner.</div>
        )}

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="two-col">
            <div className="field">
              <label htmlFor="fname">First name</label>
              <input
                className={`input ${fieldErrors.first_name ? "input-error" : ""}`}
                id="fname"
                type="text"
                value={form.first_name}
                onChange={(e) => updateField("first_name", e.target.value)}
              />
              {fieldErrors.first_name && (
                <span className="field-error">{fieldErrors.first_name}</span>
              )}
            </div>
            <div className="field">
              <label htmlFor="lname">Last name</label>
              <input
                className={`input ${fieldErrors.last_name ? "input-error" : ""}`}
                id="lname"
                type="text"
                value={form.last_name}
                onChange={(e) => updateField("last_name", e.target.value)}
              />
              {fieldErrors.last_name && (
                <span className="field-error">{fieldErrors.last_name}</span>
              )}
            </div>
          </div>

          <div className="field">
            <label htmlFor="addr">Address</label>
            <input
              className={`input ${fieldErrors.address ? "input-error" : ""}`}
              id="addr"
              type="text"
              value={form.address}
              onChange={(e) => updateField("address", e.target.value)}
            />
            {fieldErrors.address && <span className="field-error">{fieldErrors.address}</span>}
          </div>

          <div className="two-col">
            <div className="field">
              <label htmlFor="city">City</label>
              <input
                className={`input ${fieldErrors.city ? "input-error" : ""}`}
                id="city"
                type="text"
                value={form.city}
                onChange={(e) => updateField("city", e.target.value)}
              />
              {fieldErrors.city && <span className="field-error">{fieldErrors.city}</span>}
            </div>
            <div className="field">
              <label htmlFor="tel">Telephone</label>
              <input
                className={`input ${fieldErrors.telephone ? "input-error" : ""}`}
                id="tel"
                type="text"
                value={form.telephone}
                onChange={(e) => updateField("telephone", e.target.value)}
              />
              {fieldErrors.telephone && (
                <span className="field-error">{fieldErrors.telephone}</span>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Save Changes"}
            </button>
            <Link className="btn btn-ghost" to={`/owners/${ownerId}`}>
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
