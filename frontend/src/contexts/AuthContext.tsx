import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  fetchAuthSession,
  fetchUserAttributes,
  signIn as amplifySignIn,
  signOut as amplifySignOut,
} from "aws-amplify/auth";

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  username: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    // Restores the session on a hard refresh — Amplify persists tokens itself, this just
    // reflects that state into React so the app doesn't flash "logged out" on every reload.
    // fetchUserAttributes (not getCurrentUser().username) for display: this pool's
    // username_attributes = ["email"] means Cognito's internal "username" is an opaque
    // generated sub, not the email — the email lives in the attributes instead.
    fetchUserAttributes()
      .then((attributes) => {
        setUsername(attributes.email ?? null);
        setIsAuthenticated(true);
      })
      .catch(() => {
        setIsAuthenticated(false);
      })
      .finally(() => setIsLoading(false));
  }, []);

  async function login(usernameInput: string, password: string): Promise<void> {
    const { isSignedIn } = await amplifySignIn({
      username: usernameInput,
      password,
    });
    if (isSignedIn) {
      setUsername(usernameInput);
      setIsAuthenticated(true);
    }
  }

  async function logout(): Promise<void> {
    await amplifySignOut();
    setIsAuthenticated(false);
    setUsername(null);
  }

  return (
    <AuthContext.Provider
      value={{ isLoading, isAuthenticated, username, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

/** Used by the API client (UC-011 A2 silent refresh) — Amplify's fetchAuthSession refreshes
 * both tokens itself if they're expired but the refresh token is still valid, so callers just
 * need the current token, not to manage the refresh flow by hand.
 *
 * Returns the ID token, not the access token: empirically, this API Gateway COGNITO_USER_POOLS
 * authorizer rejects a genuinely valid, unexpired access token with a bare 401 (confirmed via
 * curl with both token types — same request, only the token differs) but accepts the ID token
 * correctly. Keeping this despite most AWS examples defaulting to the access token, since that
 * default doesn't actually work against this authorizer. */
export async function getAuthToken(): Promise<string | null> {
  try {
    const session = await fetchAuthSession();
    return session.tokens?.idToken?.toString() ?? null;
  } catch {
    return null;
  }
}
