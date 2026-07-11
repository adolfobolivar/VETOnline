import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiClient, ApiError, UnauthorizedError } from "../lib/apiClient";
import type { OwnerDetailOut, PetOut, PetTypeOut, PetUpdate } from "../types/api";

const emptyForm = { name: "", birth_date: "", pet_type_id: "" };

/** UC-008 main flow + A1 (duplicate name) + A2 (future birth date) + A3 (missing field). There
 * is no standalone "get one pet" endpoint, so the pet's current values (including its type,
 * which the owner-detail response resolves to a name rather than an id) come from the owner
 * detail response plus a reverse lookup against /pet-types by name. */
export function EditPetPage() {
  const { ownerId, petId } = useParams<{ ownerId: string; petId: string }>();
  const navigate = useNavigate();

  const [petTypes, setPetTypes] = useState<PetTypeOut[]>([]);
  const [form, setForm] = useState<typeof emptyForm | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showAlert, setShowAlert] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // `cancelled` guards against StrictMode's dev-mode double-invocation of this effect (or a
    // fast ownerId/petId change): without it, a second, redundant fetch resolving after the
    // user has already started editing the pre-filled form would silently clobber their
    // in-progress edit by resetting `form` back to the freshly-fetched (but now stale) values.
    let cancelled = false;
    Promise.all([
      apiClient.get<OwnerDetailOut>(`/owners/${ownerId}`),
      apiClient.get<PetTypeOut[]>("/pet-types"),
    ])
      .then(([owner, types]) => {
        if (cancelled) return;
        const pet = owner.pets.find((p) => String(p.id) === petId);
        if (!pet) {
          navigate("/error", { state: { variant: "not-found" } });
          return;
        }
        const petTypeId = types.find((t) => t.name === pet.pet_type)?.id;
        setPetTypes(types);
        setForm({
          name: pet.name,
          birth_date: pet.birth_date,
          pet_type_id: petTypeId !== undefined ? String(petTypeId) : "",
        });
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof UnauthorizedError) {
          navigate("/login", { state: { from: `/owners/${ownerId}/pets/${petId}/edit` } });
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
  }, [ownerId, petId]);

  function updateField(field: keyof typeof emptyForm, value: string) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form) return;
    setSubmitting(true);
    setFieldErrors({});
    setShowAlert(false);

    // A3: client-side required-field check, mirroring AddPetPage — UC-008's own A3 only lists
    // name/birth date (BR-003: type may be left unchanged, so it's never blank here anyway).
    const errors: Record<string, string> = {};
    if (!form.name.trim()) errors.name = "This field is required.";
    if (!form.birth_date) errors.birth_date = "This field is required.";
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitting(false);
      return;
    }

    const payload: PetUpdate = {
      name: form.name,
      birth_date: form.birth_date,
      pet_type_id: form.pet_type_id ? Number(form.pet_type_id) : undefined,
    };

    try {
      await apiClient.put<PetOut>(`/owners/${ownerId}/pets/${petId}`, payload);
      navigate(`/owners/${ownerId}`, { state: { banner: "Pet details has been edited" } });
      return;
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        navigate("/login", { state: { from: `/owners/${ownerId}/pets/${petId}/edit` } });
        return;
      }
      if (err instanceof ApiError && err.status === 400) {
        // UC-008 A1: {"field": "name", "error": "already exists"}.
        const body = err.body as { field?: string; error?: string } | null;
        if (body?.field) {
          setFieldErrors({ [body.field]: body.error ?? "already exists" });
        }
      } else if (err instanceof ApiError && err.status === 422) {
        // UC-008 A2: mirrors FastAPI's own shape for the service-layer future-birth-date rule.
        const detail = (err.body as { detail?: Array<{ loc: string[]; msg: string }> } | null)
          ?.detail;
        const errors2: Record<string, string> = {};
        for (const item of detail ?? []) {
          const field = item.loc[item.loc.length - 1];
          errors2[field] =
            field === "birth_date" ? "Birth date must not be in the future." : item.msg;
        }
        setFieldErrors(errors2);
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

  if (!form) {
    return null;
  }

  return (
    <div className="screen-body">
      <div className="screen-head" style={{ padding: 0, marginBottom: "1.5rem" }}>
        <span className="eyebrow">UC-008 &middot; Update pet</span>
        <h2>Edit pet</h2>
      </div>

      <div className="form-shell">
        {showAlert && <div className="form-alert">There was an error updating the pet.</div>}

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
