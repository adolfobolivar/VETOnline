import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { apiClient, ApiError, UnauthorizedError } from "../lib/apiClient";
import type { OwnerDetailOut, PetDetailOut, VisitCreate, VisitOut } from "../types/api";

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${month}/${day}/${year}`;
}

/** UC-009 main flow + A1 (missing description). A2 (pet not owned by given owner) and A3
 * (owner not found) both resolve through the same owner-detail fetch: a missing owner is a
 * plain 404 from the API, while a pet id that exists but belongs to someone else simply never
 * appears in this owner's `pets` list — both are treated as the not-found error view. */
export function AddVisitPage() {
  const { ownerId, petId } = useParams<{ ownerId: string; petId: string }>();
  const navigate = useNavigate();

  const [pet, setPet] = useState<PetDetailOut | null>(null);
  const [visitDate, setVisitDate] = useState(today());
  const [description, setDescription] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showAlert, setShowAlert] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiClient
      .get<OwnerDetailOut>(`/owners/${ownerId}`)
      .then((owner) => {
        const found = owner.pets.find((p) => String(p.id) === petId);
        if (!found) {
          navigate("/error", { state: { variant: "not-found" } });
          return;
        }
        setPet(found);
      })
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          navigate("/login", { state: { from: `/owners/${ownerId}/pets/${petId}/visits/new` } });
        } else if (err instanceof ApiError && err.status === 404) {
          navigate("/error", { state: { variant: "not-found" } });
        } else {
          navigate("/error");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId, petId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setShowAlert(false);

    // A1: client-side required-field check, mirroring the other forms.
    if (!description.trim()) {
      setFieldErrors({ description: "This field is required." });
      setSubmitting(false);
      return;
    }

    const payload: VisitCreate = { visit_date: visitDate, description };

    try {
      await apiClient.post<VisitOut>(`/owners/${ownerId}/pets/${petId}/visits`, payload);
      navigate(`/owners/${ownerId}`, { state: { banner: "Your visit has been booked" } });
      return;
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        navigate("/login", { state: { from: `/owners/${ownerId}/pets/${petId}/visits/new` } });
        return;
      }
      if (err instanceof ApiError && err.status === 422) {
        const detail = (err.body as { detail?: Array<{ loc: string[]; msg: string }> } | null)
          ?.detail;
        const errors: Record<string, string> = {};
        for (const item of detail ?? []) {
          const field = item.loc[item.loc.length - 1];
          errors[field] = "This field is required.";
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

  if (!pet) {
    return null;
  }

  return (
    <div className="screen-body">
      <div className="screen-head" style={{ padding: 0, marginBottom: "1.5rem" }}>
        <span className="eyebrow">UC-009 &middot; Book visit for pet</span>
        <h2>Add visit for {pet.name}</h2>
      </div>

      <div className="form-shell">
        {showAlert && <div className="form-alert">There was an error booking the visit.</div>}

        <form className="form-grid" onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="visit-date">Date</label>
            <input
              className="input"
              id="visit-date"
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="description">Description</label>
            <textarea
              className={`input ${fieldErrors.description ? "input-error" : ""}`}
              id="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            {fieldErrors.description && (
              <span className="field-error">{fieldErrors.description}</span>
            )}
          </div>

          <div className="form-actions">
            <button className="btn btn-primary" type="submit" disabled={submitting}>
              {submitting ? "Saving…" : "Book Visit"}
            </button>
            <Link className="btn btn-ghost" to={`/owners/${ownerId}`}>
              Cancel
            </Link>
          </div>
        </form>

        {pet.visits.length > 0 && (
          <>
            <h3 style={{ marginTop: "2rem" }}>Previous visits</h3>
            <ul className="visit-list">
              {pet.visits.map((visit) => (
                <li className="visit-row" key={visit.id}>
                  <span className="visit-date">{formatDate(visit.visit_date)}</span>
                  <span>{visit.description}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
