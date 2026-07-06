import { fetchApi, fetchApiRoot, mutateApi } from './http';
import type { ApiConfig, ApiSession, ApiUserProfile } from './types';

const CONFIGS_STALE_MS = 15 * 60 * 1000;
const EMPTY_CONFIG: ApiConfig = { flags: {}, configs: {} };

let configsPromise: Promise<ApiConfig> | null = null;
let configsLoadedAt = 0;

export function getConfigs(): Promise<ApiConfig> {
  const now = Date.now();
  if (!configsPromise || now - configsLoadedAt > CONFIGS_STALE_MS) {
    configsLoadedAt = now;
    configsPromise = fetchApiRoot<ApiConfig>('/configs').catch(() => {
      configsLoadedAt = 0;
      configsPromise = null;
      return EMPTY_CONFIG;
    });
  }
  return configsPromise;
}

export function resetConfigsCache(): void {
  configsPromise = null;
  configsLoadedAt = 0;
}

export function fetchSession(): Promise<ApiSession> {
  return fetchApi('/session/current');
}

export function fetchUserProfile(): Promise<ApiUserProfile> {
  return fetchApi('/users/me');
}

export function updateDisplayName(staffId: number, displayName: string): Promise<void> {
  return mutateApi('PUT', `/${staffId}/updateDisplayName`, { displayName });
}

export function updateDisplayEmail(staffId: number, displayEmail: string): Promise<void> {
  return mutateApi('PUT', `/${staffId}/updateDisplayEmail`, { displayEmail });
}
