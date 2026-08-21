import { Button } from '~/components/ui';

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
          <Button type="button" onClick={onRetry} className="mt-4">
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}
