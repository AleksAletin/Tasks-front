import { QueryClient } from '@tanstack/react-query';

/**
 * Application-wide QueryClient with sensible defaults:
 * - data considered fresh for 30s (fewer refetches during navigation)
 * - one retry on failure
 * - no refetch on window focus (internal tool, avoids surprise loads)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
