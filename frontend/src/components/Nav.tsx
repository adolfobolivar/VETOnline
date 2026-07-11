import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export function Nav() {
  const { isAuthenticated, username, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    // UC-011 A3.
    await logout();
    navigate("/");
  }

  return (
    <nav className="nav">
      <div className="nav-inner">
        <div className="brand">
          <svg
            className="brand-mark"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
          >
            <path
              d="M16 3 L27 9 V17 C27 24 22 28.5 16 30 C10 28.5 5 24 5 17 V9 Z"
              fill="var(--gold)"
            />
            <path
              d="M16 12v10M11 17h10"
              stroke="var(--navy)"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
          VETOnline
        </div>
        <ul className="nav-links">
          <li>
            <NavLink to="/" end>
              Home
            </NavLink>
          </li>
          <li>
            <NavLink to="/owners">Find Owners</NavLink>
          </li>
          <li>
            <NavLink to="/veterinarians">Veterinarians</NavLink>
          </li>
          <li>
            <NavLink to="/oups">Error</NavLink>
          </li>
        </ul>
        {isAuthenticated ? (
          <button className="nav-user" onClick={handleLogout} type="button">
            Signed in as <strong>{username}</strong> &middot; Logout
          </button>
        ) : (
          <NavLink className="nav-user" to="/login">
            Login
          </NavLink>
        )}
      </div>
    </nav>
  );
}
