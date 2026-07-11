import { Link } from "react-router-dom";

/** UC-001: static, no user input, no backend call. */
export function WelcomePage() {
  return (
    <div className="screen-body">
      <div className="hero">
        <div>
          <h1>Every patient, every visit, one record.</h1>
          <p className="lede">
            VETOnline keeps owner contacts, pet histories, and visit notes in one place, so the
            front desk can find what they need in seconds instead of digging through binders.
          </p>
          <div className="hero-actions">
            <Link className="btn btn-primary" to="/owners">
              Find an owner
            </Link>
            <Link className="btn btn-secondary" to="/veterinarians">
              Browse veterinarians
            </Link>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <svg width="58%" viewBox="0 0 100 100" fill="none">
            <circle cx="50" cy="38" r="15" fill="var(--gold)" opacity="0.92" />
            <circle cx="27" cy="24" r="7" fill="var(--gold)" opacity="0.75" />
            <circle cx="73" cy="24" r="7" fill="var(--gold)" opacity="0.75" />
            <circle cx="18" cy="42" r="6" fill="var(--gold)" opacity="0.6" />
            <circle cx="82" cy="42" r="6" fill="var(--gold)" opacity="0.6" />
            <path
              d="M32 66c0-11 8-18 18-18s18 7 18 18-9 20-18 20-18-9-18-20Z"
              fill="var(--teal)"
              opacity="0.9"
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
