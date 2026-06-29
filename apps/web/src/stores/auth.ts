import { api, tokenStorage } from '@/api/client';
import type { AuthResponse, UserView } from '@/types/api';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserView | null>(readStoredUser());
  const isAuthenticated = computed(() => Boolean(tokenStorage.access()));

  async function login(email: string, password: string): Promise<void> {
    const result = await api.post<AuthResponse>(
      '/auth/login',
      { email, password },
      { auth: false },
    );
    applyAuth(result);
  }

  async function register(
    email: string,
    password: string,
    displayName: string,
  ): Promise<void> {
    const result = await api.post<AuthResponse>(
      '/auth/register',
      { email, password, displayName },
      { auth: false },
    );
    applyAuth(result);
  }

  async function loadMe(): Promise<void> {
    if (!tokenStorage.access()) return;
    user.value = await api.get<UserView>('/auth/me');
    persistUser();
  }

  async function logout(): Promise<void> {
    const refreshToken = tokenStorage.refresh();
    try {
      if (refreshToken) await api.post('/auth/logout', { refreshToken });
    } finally {
      clear();
    }
  }

  function applyAuth(result: AuthResponse): void {
    tokenStorage.save(result);
    user.value = result.user;
    persistUser();
  }

  function clear(): void {
    tokenStorage.clear();
    user.value = null;
    localStorage.removeItem('asset-manager.user');
  }

  function persistUser(): void {
    if (user.value)
      localStorage.setItem('asset-manager.user', JSON.stringify(user.value));
  }

  return { user, isAuthenticated, login, register, loadMe, logout, clear };
});

function readStoredUser(): UserView | null {
  const value = localStorage.getItem('asset-manager.user');
  if (!value) return null;
  try {
    return JSON.parse(value) as UserView;
  } catch {
    return null;
  }
}
