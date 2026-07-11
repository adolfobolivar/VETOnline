import { getAuthToken } from "../contexts/AuthContext";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

/** Expected, spec'd error responses (validation errors, "already exists", 404 not-found) —
 * callers inspect `status`/`body` and handle these inline (field errors, form-alert text),
 * per each use case's alternative flows. Not routed to the generic error view. */
export class ApiError extends Error {
  status: number;
  body: unknown;
  constructor(status: number, body: unknown) {
    super(`API error ${status}`);
    this.status = status;
    this.body = body;
  }
}

/** Unrecoverable 401 — silent refresh (below) already failed. Callers route this to the login
 * screen (UC-011 A2 step 4), not the generic error view. */
export class UnauthorizedError extends Error {}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getAuthToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });

  if (response.status === 401) {
    // UC-011 A2: fetchAuthSession (inside getAuthToken) refreshes an expired token using the
    // stored refresh token automatically — this is the "silent refresh", not something this
    // client re-implements. If the refresh token has also expired, it returns null and this
    // retry is skipped, falling through to UnauthorizedError below.
    const refreshedToken = await getAuthToken();
    if (refreshedToken && refreshedToken !== token) {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: { ...headers, Authorization: `Bearer ${refreshedToken}` },
      });
    }
    if (response.status === 401) {
      throw new UnauthorizedError();
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new ApiError(response.status, body);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const apiClient = {
  get: <T>(path: string): Promise<T> => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: unknown): Promise<T> =>
    request<T>(path, { method: "POST", body: JSON.stringify(body) }),
  put: <T>(path: string, body: unknown): Promise<T> =>
    request<T>(path, { method: "PUT", body: JSON.stringify(body) }),
};
