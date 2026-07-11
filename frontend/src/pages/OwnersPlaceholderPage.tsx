import { Link } from "react-router-dom";

/** UC-004 (Find Owners) isn't implemented yet — this is an honest placeholder, not a stubbed
 * fake response, so the nav's "Find Owners" link (UC-001) has somewhere real to go and the
 * natural "Add Owner" entry point (UC-004 -> UC-003) still works. */
export function OwnersPlaceholderPage() {
  return (
    <div className="screen-body">
      <div className="screen-head" style={{ padding: 0, marginBottom: "1.5rem" }}>
        <span className="eyebrow">UC-004 &middot; Find owners by last name</span>
        <h2>Find owners</h2>
      </div>
      <p style={{ color: "var(--text-muted)" }}>
        This screen isn't built yet — only Register New Owner (UC-003) and Add Pet to Owner
        (UC-007) are implemented so far.
      </p>
      <div className="form-actions">
        <Link className="btn btn-secondary" to="/owners/new">
          Add Owner
        </Link>
      </div>
    </div>
  );
}
