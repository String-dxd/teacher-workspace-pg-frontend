import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./http', () => ({
  fetchApi: vi.fn(),
  fetchApiRoot: vi.fn(),
  mutateApi: vi.fn(),
}));

import { fetchApi, fetchApiRoot, mutateApi } from './http';
import {
  fetchSession,
  fetchUserProfile,
  getConfigs,
  resetConfigsCache,
  updateDisplayEmail,
  updateDisplayName,
} from './session';

describe('api/session', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetConfigsCache();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('fetchSession calls GET /session/current', async () => {
    vi.mocked(fetchApi).mockResolvedValue({ staffId: 1 });
    const result = await fetchSession();
    expect(fetchApi).toHaveBeenCalledWith('/session/current');
    expect(result).toEqual({ staffId: 1 });
  });

  it('fetchUserProfile calls GET /users/me', async () => {
    vi.mocked(fetchApi).mockResolvedValue({ name: 'Test' });
    const result = await fetchUserProfile();
    expect(fetchApi).toHaveBeenCalledWith('/users/me');
    expect(result).toEqual({ name: 'Test' });
  });

  it('getConfigs calls fetchApiRoot /configs', async () => {
    vi.mocked(fetchApiRoot).mockResolvedValue({ flags: { featureX: true }, configs: {} });
    const result = await getConfigs();
    expect(fetchApiRoot).toHaveBeenCalledWith('/configs');
    expect(result).toEqual({ flags: { featureX: true }, configs: {} });
  });

  it('getConfigs returns cached value within TTL', async () => {
    vi.mocked(fetchApiRoot).mockResolvedValue({ flags: {}, configs: {} });
    await getConfigs();
    await getConfigs();
    expect(fetchApiRoot).toHaveBeenCalledTimes(1);
  });

  it('getConfigs refetches after TTL expires', async () => {
    vi.useFakeTimers();
    vi.mocked(fetchApiRoot).mockResolvedValue({ flags: {}, configs: {} });
    await getConfigs();
    vi.advanceTimersByTime(16 * 60 * 1000);
    await getConfigs();
    expect(fetchApiRoot).toHaveBeenCalledTimes(2);
  });

  it('getConfigs returns fallback on failure and clears cache', async () => {
    vi.mocked(fetchApiRoot).mockRejectedValue(new Error('network'));
    const result = await getConfigs();
    expect(result).toEqual({ flags: {}, configs: {} });

    vi.mocked(fetchApiRoot).mockResolvedValue({ flags: { ok: true }, configs: {} });
    const second = await getConfigs();
    expect(second).toEqual({ flags: { ok: true }, configs: {} });
  });

  it('updateDisplayName PUTs to /:staffId/updateDisplayName', async () => {
    vi.mocked(mutateApi).mockResolvedValue(undefined);
    await updateDisplayName(42, 'New Name');
    expect(mutateApi).toHaveBeenCalledWith('PUT', '/42/updateDisplayName', {
      displayName: 'New Name',
    });
  });

  it('updateDisplayEmail PUTs to /:staffId/updateDisplayEmail', async () => {
    vi.mocked(mutateApi).mockResolvedValue(undefined);
    await updateDisplayEmail(42, 'new@email.com');
    expect(mutateApi).toHaveBeenCalledWith('PUT', '/42/updateDisplayEmail', {
      displayEmail: 'new@email.com',
    });
  });
});
