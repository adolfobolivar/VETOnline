import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient, ApiError, UnauthorizedError } from "../lib/apiClient";
import { parseFieldErrors } from "../lib/fieldErrors";
import type { OwnerCreate, OwnerOut } from "../types/api";

const emptyForm: OwnerCreate = {
  first_name: "",
  last_name: "",
  address: "",
  city: "",
  telephone: "",
};

/** UC-003 main flow + A1 (validation errors). Step 6: navigates to the Owner Details view
 * (UC-005) with the confirmation banner's message passed via navigation state, rendered there
 * — not on this page, per the use case's literal text. */
export function AddOwnerPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState<OwnerCreate>(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showAlert, setShowAlert] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function updateField(field: keyof OwnerCreate, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setShowAlert(false);
    try {
      const owner = await apiClient.post<OwnerOut>("/owners", form);
      navigate(`/owners/${owner.id}`, { state: { banner: "New Owner Created" } });
      return;
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        navigate("/login", { state: { from: "/owners/new" } });
        return;
      }
      if (err instanceof ApiError && err.status === 422) {
        setFieldErrors(parseFieldErrors(err.body));
        setShowAlert(true);
      } else {
        navigate("/error");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="screen-body">
      <div className="screen-head" style={{ padding: 0, marginBottom: "1.5rem" }}>
        <span className="eyebrow">UC-003 &middot; Register new owner</span>
        <h2>Add owner</h2>
      </div>

      <div className="form-shell">
        {showAlert && (
          <div className="form-alert">There was an error in creating the owner.</div>
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
              {submitting ? "Saving…" : "Add Owner"}
            </button>
            <Link className="btn btn-ghost" to="/owners">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
