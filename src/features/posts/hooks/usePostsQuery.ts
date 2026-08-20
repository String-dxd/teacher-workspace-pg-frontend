import { ServiceUnavailableError } from '~/features/posts/api/errors';
import { useQuery, type UseQueryResult } from '~/hooks/useQuery';

export function usePostsQuery<T>(fetcher: () => Promise<T>, deps: unknown[]): UseQueryResult<T> {
  const result = useQuery(fetcher, deps);
  if (result.error instanceof ServiceUnavailableError) throw result.error;
  return result;
}
