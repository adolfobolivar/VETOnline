import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiClient, UnauthorizedError } from "../lib/apiClient";
import type { OwnerListOut } from "../types/api";

const PAGE_SIZE = 20;

/** UC-004 main flow + A1 (empty search) + A2 (single-match redirect) + A3 (not found) + A4
 * (infinite scroll, BR-002). No results section is shown until the first search is submitted —
 * the use case's main flow has the user fill in the form and submit before any list appears. */
export function FindOwnersPage() {
  const navigate = useNavigate();

  const [lastName, setLastName] = useState("");
  const [owners, setOwners] = useState<OwnerListOut[] | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [searchedLastName, setSearchedLastName] = useState("");
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  function handleApiError(err: unknown) {
    if (err instanceof UnauthorizedError) {
      navigate("/login", { state: { from: "/owners" } });
    } else {
      navigate("/error");
    }
  }

  async function runSearch(event: FormEvent) {
    event.preventDefault();
    setNotFound(false);
    offsetRef.current = 0;

    try {
      const results = await apiClient.get<OwnerListOut[]>(
        `/owners?last_name=${encodeURIComponent(lastName)}&offset=0&limit=${PAGE_SIZE}`,
      );
      // A2: exactly one match (the whole result set fits in one page under the size), skip the
      // list entirely and go straight to that owner's details.
      if (results.length === 1 && results.length < PAGE_SIZE) {
        navigate(`/owners/${results[0].id}`);
        return;
      }
      // A3: no match.
      if (results.length === 0) {
        setOwners(null);
        setNotFound(true);
        return;
      }
      setSearchedLastName(lastName);
      setOwners(results);
      setHasMore(results.length === PAGE_SIZE);
      offsetRef.current = results.length;
    } catch (err) {
      handleApiError(err);
    }
  }

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const results = await apiClient.get<OwnerListOut[]>(
        `/owners?last_name=${encodeURIComponent(searchedLastName)}&offset=${offsetRef.current}&limit=${PAGE_SIZE}`,
      );
      setOwners((prev) => [...(prev ?? []), ...results]);
      setHasMore(results.length === PAGE_SIZE);
      offsetRef.current += results.length;
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, hasMore, searchedLastName]);

  // A4: fetch the next chunk as the sentinel row scrolls into view — no page-number controls,
  // no fixed page size beyond PAGE_SIZE's role as the fetch chunk (BR-002).
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  return (
    <div className="screen-body">
      <div className="screen-head" style={{ padding: 0, marginBottom: "1.5rem" }}>
        <span className="eyebrow">UC-004 &middot; Find owners by last name</span>
        <h2>Find owners</h2>
      </div>

      <form className="search-row" onSubmit={runSearch}>
        <div className="field" style={{ flex: 1 }}>
          <label htmlFor="lastname">Last name</label>
          <input
            className={`input ${notFound ? "input-error" : ""}`}
            id="lastname"
            type="text"
            placeholder="e.g. Davis"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
          />
          {notFound && <span className="field-error">not found</span>}
        </div>
        <button className="btn btn-primary" type="submit">
          Search
        </button>
        <Link className="btn btn-secondary" to="/owners/new">
          Add Owner
        </Link>
      </form>

      {owners && (
        <div className="owner-list">
          {owners.map((owner) => (
            <Link className="owner-row" key={owner.id} to={`/owners/${owner.id}`}>
              <span className="owner-name">
                {owner.first_name} {owner.last_name}
              </span>
              <span className="owner-meta">
                {owner.address}, {owner.city}
              </span>
              <span className="owner-phone">{owner.telephone}</span>
              <span className="pet-count-chip">
                {owner.pets.length} pet{owner.pets.length === 1 ? "" : "s"}
              </span>
            </Link>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="load-more-row" ref={sentinelRef}>
          <span className="spinner" aria-hidden="true" /> Loading more owners&hellip;
        </div>
      )}
    </div>
  );
}
