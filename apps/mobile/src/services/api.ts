import { ApiClient, type TokenPair } from '@asset-manager/api-client';

const ACCESS_TOKEN_KEY = 'asset-manager-access-token';
const REFRESH_TOKEN_KEY = 'asset-manager-refresh-token';

export const apiClient = new ApiClient({
  baseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  getAccessToken: () => uni.getStorageSync<string>(ACCESS_TOKEN_KEY) || null,
  getRefreshToken: () => uni.getStorageSync<string>(REFRESH_TOKEN_KEY) || null,
  onTokens: saveTokens,
  onUnauthorized: () => {
    uni.removeStorageSync(ACCESS_TOKEN_KEY);
    uni.removeStorageSync(REFRESH_TOKEN_KEY);
    void uni.navigateTo({ url: '/pages/login/index' });
  },
});

export function saveTokens(tokens: TokenPair): void {
  uni.setStorageSync(ACCESS_TOKEN_KEY, tokens.accessToken);
  uni.setStorageSync(REFRESH_TOKEN_KEY, tokens.refreshToken);
}
