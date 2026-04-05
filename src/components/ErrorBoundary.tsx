// ============================================================
// CloudPos — Error Boundary
// Phase 11: Catches render errors per-section so a crash in one
// area doesn't take down the whole app.
// Last modified: V0.8.0.0 — see VERSION_LOG.md
// ============================================================

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  /** Friendly name shown in the error card (e.g. "Kitchen Display") */
  section?: string;
  /** If true, render a compact inline error instead of a full-page card */
  inline?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console in dev; swap for a real error reporting service in prod
    console.error(`[ErrorBoundary${this.props.section ? ` — ${this.props.section}` : ''}]`, error, info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { section = 'This section', inline = false } = this.props;
    const message = this.state.error?.message ?? 'An unexpected error occurred.';

    if (inline) {
      return (
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-destructive">{section} failed to load</p>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{message}</p>
            <Button
              size="sm"
              variant="outline"
              className="mt-2 h-7 text-xs"
              onClick={this.handleReset}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[60vh]">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-destructive/10 mb-4">
            <AlertTriangle className="h-7 w-7 text-destructive" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-1">{section} crashed</h2>
          <p className="text-sm text-muted-foreground mb-2">
            Something went wrong in this section. The rest of the app is still working.
          </p>
          <p className="text-xs font-mono text-muted-foreground bg-muted rounded-lg px-3 py-2 mb-5 text-left break-all">
            {message}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={this.handleReset} className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              Try again
            </Button>
            <Button
              variant="default"
              onClick={() => {
                this.handleReset();
                window.location.href = '/dashboard';
              }}
              className="gap-1.5"
            >
              <LayoutDashboard className="h-4 w-4" />
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
