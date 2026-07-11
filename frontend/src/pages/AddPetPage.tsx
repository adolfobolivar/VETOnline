import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiClient, ApiError, UnauthorizedError } from "../lib/apiClient";
import { ConfirmBanner } from "../components/ConfirmBanner";
import type { PetCreate, PetOut, PetTypeOut } from "../types/api";

const emptyForm = { name: "", birth_date: "", pet_type_id: "" };

/** UC-007 main flow + A1 (duplicate name) + A2 (future birth date) + A3 (missing field). Owner
 * Details (UC-005) doesn't exist yet, so — like AddOwnerPage — the confirmation banner shows
 * on this same screen instead of navigating to a page that isn't built. */
export function AddPetPage() {
  const { ownerId } = useParams<{ ownerId: string }>();
  const navigate = useNavigate();

  const [petTypes, setPetTypes] = useState<PetTypeOut[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showAlert, setShowAlert] = useState(false);
  const [created, setCreated] = useState<PetOut | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient
      .get<PetTypeOut[]>("/pet-types")
      .then(setPetTypes)
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          navigate("/login", { state: { from: `/owners/${ownerId}/pets/new` } });
        } else {
          navigate("/error");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setShowAlert(false);

    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "This field is required.";
    if (!form.birth_date) errors.birth_date = "This field is required.";
    if (!form.pet_type_id) errors.pet_type_id = "This field is required.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitting(false);
      return;
    }

    const payload: PetCreate = {
      name: form.name,
      birth_date: form.birth_date,
      pet_type_id: Number(form.pet_type_id),
    };

    try {
      const pet = await apiClient.post<PetOut>(`/owners/${ownerId}/pets`, payload);
      setCreated(pet);
      setForm(emptyForm);
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        navigate("/login", { state: { from: `/owners/${ownerId}/pets/new` } });
        return;
      }
      if (err instanceof ApiError && err.status === 400) {
        // UC-007 A1: {"field": "name", "error": "already exists"}.
        const body = err.body as { field?: string; error?: string } | null;
        if (body?.field) {
          setFieldErrors({ [body.field]: body.error ?? "already exists" });
        }
      } else if (err instanceof ApiError && err.status === 422) {
        // UC-007 A2/A3: mirrors FastAPI's own shape ({"detail": [{"loc": [..., field], "msg"}]})
        // for both the service-layer future-birth-date rule and Pydantic's own required-field
        // checks — same parsing either way.
        const detail = (err.body as { detail?: Array<{ loc: string[]; msg: string }> } | null)
          ?.detail;
        const errors: Record<string, string> = {};
        for (const item of detail ?? []) {
          const field = item.loc[item.loc.length - 1];
          errors[field] =
            field === "birth_date" ? "Birth date must not be in the future." : item.msg;
        }
        setFieldErrors(errors);
      } else if (err instanceof ApiError && err.status === 404) {
        navigate("/error", { state: { variant: "not-found" } });
        return;
      } else {
        navigate("/error");
        return;
      }
      setShowAlert(true);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="screen-body">
      <div className="screen-head" style={{ padding: 0, marginBottom: "1.5rem" }}>
        <span className="eyebrow">UC-007 &middot; Add pet to owner</span>
        <h2>Add pet</h2>
      </div>

      <div className="form-shell">
        {created && <ConfirmBanner message="New Pet has been Added" />}
        {created && (
          <p style={{ marginTop: "-1rem", marginBottom: "1.5rem" }}>
            <Link to="/owners">Back to Find Owners</Link>
          </p>
        )}

        {showAlert && (
          <div className="form-alert">There was an error adding the pet.</div>
        )}

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="pet-name">Name</label>
            <input
              className={`input ${fieldErrors.name ? "input-error" : ""}`}
              id="pet-name"
              type="text"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
            />
            {fieldErrors.name && <span className="field-error">{fieldErrors.name}</span>}
          </div>

          <div className="two-col">
            <div className="field">
              <label htmlFor="birth-date">Birth date</label>
              <input
                className={`input ${fieldErrors.birth_date ? "input-error" : ""}`}
                id="birth-date"
                type="date"
                value={form.birth_date}
                onChange={(e) => updateField("birth_date", e.target.value)}
              />
              {fieldErrors.birth_date && (
                <span className="field-error">{fieldErrors.birth_date}</span>
              )}
            </div>
            <div className="field">
              <label htmlFor="pet-type">Type</label>
              <select
                className={`input ${fieldErrors.pet_type_id ? "input-error" : ""}`}
                id="pet-type"
                value={form.pet_type_id}
                onChange={(e) => updateField("pet_type_id", e.target.value)}
              >
                <option value="">Select a type&hellip;</option>
                {petTypes.map((pt) => (
                  <option key={pt.id} value={pt.id}>
                    {pt.name}
                  </option>
                ))}
              </select>
              {fieldErrors.pet_type_id && (
                <span className="field-error">{fieldErrors.pet_type_id}</span>
              )}
            </div>
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Add Pet"}
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
