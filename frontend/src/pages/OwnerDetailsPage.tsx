import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { apiClient, ApiError, UnauthorizedError } from "../lib/apiClient";
import { ConfirmBanner } from "../components/ConfirmBanner";
import type { OwnerDetailOut } from "../types/api";

/** MM/DD/YYYY, matching design-mockup.html's "Born 09/04/2022" / visit-date formatting — the
 * backend's ISO (yyyy-mm-dd) is what <input type="date"> needs elsewhere, not what this
 * read-only view displays. */
function formatDate(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${month}/${day}/${year}`;
}

/** UC-005 main flow + A1 (not found). The confirmation banner for UC-003/UC-007 ("New Owner
 * Created" / "New Pet has been Added") is shown here, via `location.state.banner`, since both
 * of those use cases end by returning to this view. */
export function OwnerDetailsPage() {
  const { ownerId } = useParams<{ ownerId: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const [owner, setOwner] = useState<OwnerDetailOut | null>(null);
  const banner = (location.state as { banner?: string } | null)?.banner;

  useEffect(() => {
    apiClient
      .get<OwnerDetailOut>(`/owners/${ownerId}`)
      .then(setOwner)
      .catch((err) => {
        if (err instanceof UnauthorizedError) {
          navigate("/login", { state: { from: `/owners/${ownerId}` } });
        } else if (err instanceof ApiError && err.status === 404) {
          navigate("/error", { state: { variant: "not-found" } });
        } else {
          navigate("/error");
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerId]);

  if (!owner) {
    return null;
  }

  return (
    <div className="screen-body">
      <div className="screen-head" style={{ padding: 0, marginBottom: "1.5rem" }}>
        <span className="eyebrow">UC-005 &middot; Owner details</span>
      </div>

      {banner && <ConfirmBanner message={banner} />}

      <div className="owner-card">
        <div className="owner-card-head">
          <div>
            <span className="eyebrow" style={{ color: "rgba(242,237,227,0.55)" }}>
              Owner
            </span>
            <h2>
              {owner.first_name} {owner.last_name}
            </h2>
            <div className="owner-meta">
              {owner.address}, {owner.city}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <Link
              className="btn btn-secondary btn-sm"
              style={{
                borderColor: "rgba(242,237,227,0.4)",
                color: "var(--navy-ink)",
                background: "rgba(242,237,227,0.08)",
              }}
              to={`/owners/${owner.id}/edit`}
            >
              Edit Owner
            </Link>
            <Link className="btn btn-primary btn-sm" to={`/owners/${owner.id}/pets/new`}>
              Add New Pet
            </Link>
          </div>
          <dl className="detail-grid" style={{ flexBasis: "100%" }}>
            <div>
              <dt>City</dt>
              <dd>{owner.city}</dd>
            </div>
            <div>
              <dt>Telephone</dt>
              <dd>{owner.telephone}</dd>
            </div>
          </dl>
        </div>

        <div className="owner-card-body">
          <div className="pets-heading">
            <h3>Pets</h3>
          </div>

          {owner.pets.length === 0 && (
            <p style={{ color: "var(--text-muted)" }}>No pets yet.</p>
          )}

          {owner.pets.map((pet) => (
            <div className="pet-card" key={pet.id}>
              <div className="pet-card-top">
                <div>
                  <div className="pet-name">{pet.name}</div>
                  <div className="pet-meta">
                    {pet.pet_type} &middot; Born {formatDate(pet.birth_date)}
                  </div>
                </div>
                <div className="pet-actions">
                  <Link className="btn btn-ghost btn-sm" to={`/owners/${owner.id}/pets/${pet.id}/edit`}>
                    Edit Pet
                  </Link>
                  <Link
                    className="btn btn-secondary btn-sm"
                    to={`/owners/${owner.id}/pets/${pet.id}/visits/new`}
                  >
                    Add Visit
                  </Link>
                </div>
              </div>
              {pet.visits.length > 0 && (
                <ul className="visit-list">
                  {pet.visits.map((visit) => (
                    <li className="visit-row" key={visit.id}>
                      <span className="visit-date">{formatDate(visit.visit_date)}</span>
                      <span>{visit.description}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
