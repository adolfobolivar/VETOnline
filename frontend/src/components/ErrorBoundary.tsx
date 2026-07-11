import { Component, type ErrorInfo, type ReactNode } from "react";
import { ErrorPage } from "../pages/ErrorPage";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/** The one deliberate exception to "functional components and hooks only" (CLAUDE.md): React
 * has no hooks-based equivalent to getDerivedStateFromError/componentDidCatch as of React 19 —
 * an Error Boundary is only expressible as a class component.
 *
 * Catches render-time crashes only (React's own limitation, not a gap in this implementation) —
 * async failures from event handlers/effects (API calls) are handled explicitly by each page
 * via apiClient's thrown errors instead, not by this boundary. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // UC-010 BR-003: raw detail stays in the console, never in the rendered UI.
    console.error("Unhandled render error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return <ErrorPage variant="unexpected" />;
    }
    return this.props.children;
  }
}
