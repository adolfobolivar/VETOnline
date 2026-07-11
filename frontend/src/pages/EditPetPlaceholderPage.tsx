import { Link, useParams } from "react-router-dom";

/** UC-008 isn't implemented yet — honest placeholder, not a stubbed fake form. UC-005 still
 * needs a working "Edit Pet" link per pet to render (its own main-flow step 4), so this exists
 * to be that link's real destination rather than a dead `href="#"`. */
export function EditPetPlaceholderPage() {
  const { ownerId } = useParams<{ ownerId: string }>();

  return (
    <div className="screen-body">
      <div className="screen-head" style={{ padding: 0, marginBottom: "1.5rem" }}>
        <span className="eyebrow">UC-008 &middot; Update pet</span>
        <h2>Edit pet</h2>
      </div>
      <p style={{ color: "var(--text-muted)" }}>
        This screen isn't built yet — only Register New Owner (UC-003), Find Owners (UC-004),
        View Owner Details (UC-005), and Add Pet to Owner (UC-007) are implemented so far.
      </p>
      <div className="form-actions">
        <Link className="btn btn-secondary" to={`/owners/${ownerId}`}>
          Back to Owner Details
        </Link>
      </div>
    </div>
  );
}
