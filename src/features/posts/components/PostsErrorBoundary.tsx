import { Component, type ReactNode } from 'react';

import { ServiceUnavailableError } from '~/features/posts/api/errors';

import { MaintenancePage } from './MaintenancePage';

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

export class PostsErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error instanceof ServiceUnavailableError) return <MaintenancePage />;
    if (error) {
      return (
        <div className="flex min-h-[200px] items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium">Something went wrong</p>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
            >
              Try again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
