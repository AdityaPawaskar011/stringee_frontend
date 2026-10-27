import { Component } from 'react';
import { useLocation } from 'react-router-dom';
import { AlertTriangle, RotateCw } from 'lucide-react';
import { logError } from '@/shared/lib/errorLogger';

class Boundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    logError({
      type: 'render',
      message: error?.message || String(error),
      stack: error?.stack,
      detail: info?.componentStack,
    });
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl border border-border bg-card/60 p-6 text-center space-y-4">
          <AlertTriangle className="mx-auto h-10 w-10 text-destructive" />
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-foreground">Something went wrong on this page</h2>
            <p className="text-sm text-muted-foreground">
              The error has been logged. Reload the page, or pick another page from the menu.
            </p>
          </div>
          <p className="bg-destructive/10 text-destructive border border-destructive/20 p-2.5 rounded-md text-xs break-words">
            {this.state.error?.message || String(this.state.error)}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <RotateCw className="h-4 w-4" />
            Reload page
          </button>
        </div>
      </div>
    );
  }
}

// Keyed by path, so navigating away from a crashed page clears the error.
export default function ErrorBoundary({ children }) {
  const { pathname } = useLocation();
  return <Boundary key={pathname}>{children}</Boundary>;
}
