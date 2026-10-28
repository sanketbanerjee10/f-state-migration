import { useQuery, queryOptions } from '@tanstack/react-query';
import type { AdminApplication } from '@/lib/api-client';

export const APPLICATION_DETAILS_STALE_TIME = 30_000;

export class ApplicationDeletedError extends Error {
  constructor() {
    super('This application has been deleted.');
    this.name = 'ApplicationDeletedError';
  }
}

export function isApplicationDeletedError(error: unknown): error is ApplicationDeletedError {
  return error instanceof ApplicationDeletedError;
}

export function getApplicationDetailsQueryOptions(id: string) {
  const normalizedId = id.trim();

  return queryOptions({
    queryKey: ['application', normalizedId] as const,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/applications/${encodeURIComponent(normalizedId)}`, { signal });
      if (!response.ok) {
        if (response.status === 404) throw new ApplicationDeletedError();
        throw new Error('Could not load application details. Please try again.');
      }
      return response.json() as Promise<AdminApplication>;
    },
    staleTime: APPLICATION_DETAILS_STALE_TIME,
    gcTime: 24 * 60 * 60 * 1000,
    retry: (failureCount, error) =>
      !isApplicationDeletedError(error) && failureCount < 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useApplicationDetails(id: string, enabled = true) {
  return useQuery({
    ...getApplicationDetailsQueryOptions(id),
    enabled: enabled && id.trim().length > 0,
  });
}
