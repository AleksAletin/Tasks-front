import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';
import type { Role } from '../types/domain';

/** Query key for the roles collection. */
export const rolesQueryKey = ['roles'] as const;

async function fetchRoles(): Promise<Role[]> {
  const { data } = await apiClient.get<Role[]>('/roles');
  return data;
}

/**
 * React Query hook that loads the list of roles from `GET /roles`.
 * Example of the data-fetching pattern used across the app.
 */
export function useRoles() {
  return useQuery({
    queryKey: rolesQueryKey,
    queryFn: fetchRoles,
  });
}
