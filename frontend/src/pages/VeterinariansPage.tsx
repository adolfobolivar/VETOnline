import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient, UnauthorizedError } from "../lib/apiClient";
import type { VeterinarianOut } from "../types/api";

const PAGE_SIZE = 20;

function initials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

/** UC-002 main flow (BR-003: anonymous access — no RequireAuth). The only alternative flow is
 * the lazy-loading behavior itself (BR-001), covered here via the same infinite-scroll pattern
 * FindOwnersPage uses (UC-004). Specialty ordering (BR-002) and the comma-separated/"none"
 * description in the use case text are both satisfied by the backend's own ordering plus this
 * screen's pill-based rendering, per design-system.md's per-screen guidance for UC-002. */
export function VeterinariansPage() {
  const navigate = useNavigate();

  const [vets, setVets] = useState<VeterinarianOut[] | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const offsetRef = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  function handleApiError(err: unknown) {
    if (err instanceof UnauthorizedError) {
      navigate("/login", { state: { from: "/veterinarians" } });
    } else {
      navigate("/error");
    }
  }

  useEffect(() => {
    // cancelled guard: harmless here either way (this only ever replaces the list, never
    // clobbers user-editable state), but kept for consistency with every other fetch-in-effect
    // in this codebase — see architecture.md §2.1 / the implement-frontend skill's DO NOT list.
    let cancelled = false;
    apiClient
      .get<VeterinarianOut[]>(`/veterinarians?offset=0&limit=${PAGE_SIZE}`)
      .then((results) => {
        if (cancelled) return;
        setVets(results);
        setHasMore(results.length === PAGE_SIZE);
        offsetRef.current = results.length;
      })
      .catch((err) => {
        if (cancelled) return;
        handleApiError(err);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const results = await apiClient.get<VeterinarianOut[]>(
        `/veterinarians?offset=${offsetRef.current}&limit=${PAGE_SIZE}`,
      );
      setVets((prev) => [...(prev ?? []), ...results]);
      setHasMore(results.length === PAGE_SIZE);
      offsetRef.current += results.length;
    } catch (err) {
      handleApiError(err);
    } finally {
      setLoadingMore(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMore, hasMore]);

  // BR-001/A4-equivalent: fetch the next chunk as the sentinel row scrolls into view — no page
  // controls, no fixed page size beyond PAGE_SIZE's role as the fetch chunk.
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
        <span className="eyebrow">UC-002 &middot; Veterinarians</span>
        <h2>Our veterinarians</h2>
      </div>

      {vets && (
        <div className="grid-vets">
          {vets.map((vet) => (
            <article className="card vet-card" key={vet.id}>
              <div className="vet-avatar">{initials(vet.first_name, vet.last_name)}</div>
              <div className="vet-name">
                {vet.first_name} {vet.last_name}
              </div>
              <div className="pill-row">
                {vet.specialties.length === 0 ? (
                  <span className="pill">None</span>
                ) : (
                  vet.specialties.map((specialty) => (
                    <span className="pill pill-accent" key={specialty}>
                      {specialty}
                    </span>
                  ))
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {hasMore && (
        <div className="load-more-row" ref={sentinelRef}>
          <span className="spinner" aria-hidden="true" /> Loading more veterinarians&hellip;
        </div>
      )}
    </div>
  );
}
