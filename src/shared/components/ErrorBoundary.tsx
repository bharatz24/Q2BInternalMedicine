import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

import { reportError } from "@/shared/observability/reporter";

interface ErrorBoundaryProps {
  children: ReactNode;
  /**
   * `"root"` — the whole-app last resort (in `App.tsx`, outside the router).
   * `"route"` — wraps one routed page so a render crash there doesn't blank
   * the dashboard + wizard with it. Drives the fallback copy and actions.
   */
  level?: "root" | "route";
  /**
   * When any value here changes, a caught error is cleared and the children
   * re-render. `RouteErrorBoundary` passes the current pathname, so navigating
   * away from a broken page recovers automatically.
   */
  resetKeys?: readonly unknown[];
  /** Short label for the crash report (e.g. the route path). */
  name?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

const isDev = import.meta.env.DEV;

function changed(a: readonly unknown[] = [], b: readonly unknown[] = []): boolean {
  return a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const level = this.props.level ?? "route";
    reportError(error, {
      source: this.props.name ? `errorBoundary:${this.props.name}` : `errorBoundary:${level}`,
      level: level === "root" ? "fatal" : "error",
      componentStack: info?.componentStack ?? undefined,
    });
  }

  componentDidUpdate(prev: ErrorBoundaryProps) {
    if (this.state.hasError && changed(prev.resetKeys, this.props.resetKeys)) {
      this.reset();
    }
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    const isRoot = (this.props.level ?? "route") === "root";
    const title = isRoot ? "Something went wrong" : "This page didn't load";
    const body = isRoot
      ? "The app hit an unexpected error. Reloading the page usually fixes it — your progress is saved."
      : "Something went wrong while showing this page. You can try again, or head back to your dashboard.";

    return (
      <div className="error-boundary-fallback" role="alert">
        <h2 className="ui-heading error-boundary-title">{title}</h2>
        <p className="error-boundary-body">{body}</p>

        <div className="error-boundary-actions">
          {!isRoot && (
            <button
              type="button"
              className="error-boundary-btn error-boundary-btn--primary"
              onClick={this.reset}
            >
              Try again
            </button>
          )}
          <button
            type="button"
            className={`error-boundary-btn ${isRoot ? "error-boundary-btn--primary" : "error-boundary-btn--ghost"}`}
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
          {!isRoot && (
            <a href="/dashboard" className="error-boundary-btn error-boundary-btn--ghost">
              Back to dashboard
            </a>
          )}
        </div>

        {isDev && this.state.error && (
          <details className="error-boundary-detail">
            <summary>Error detail (dev only)</summary>
            <pre>{this.state.error.stack || this.state.error.message}</pre>
          </details>
        )}
      </div>
    );
  }
}
