interface QueryErrorProps {
  onRetry?: () => void;
}

export function QueryError({ onRetry }: QueryErrorProps) {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="text-center">
        <p className="text-lg font-medium">Failed to load page data</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Please check your connection and try again.
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
