/** design-system.md's signature element: reused as-is by every mutating use case (UC-003,
 * UC-006 through UC-009) — only the `message` text changes, never the markup/animation. */
export function ConfirmBanner({ message }: { message: string }) {
  return (
    <div className="confirm-banner" role="status">
      <span className="confirm-icon" aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <path
            d="M3 8.5l3.2 3.2L13 4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <div>
        <span className="confirm-label">Saved</span>
        <div className="confirm-text">{message}</div>
      </div>
    </div>
  );
}
