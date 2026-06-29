import { ApiClient, type TokenPair } from '@asset-manager/api-client';

const ACCESS_KEY = 'asset-manager.access-token';
const REFRESH_KEY = 'asset-manager.refresh-token';

export const tokenStorage = {
  access: (): string | null => localStorage.getItem(ACCESS_KEY),
  refresh: (): string | null => localStorage.getItem(REFRESH_KEY),
  save(tokens: TokenPair): void {
    localStorage.setItem(ACCESS_KEY, tokens.accessToken);
    localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export const api = new ApiClient({
  baseUrl: '/api',
  getAccessToken: tokenStorage.access,
  getRefreshToken: tokenStorage.refresh,
  onTokens: tokenStorage.save,
  onUnauthorized: () => {
    tokenStorage.clear();
    window.dispatchEvent(new Event('asset-manager:unauthorized'));
  },
});
