import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  const darkMode = ref(localStorage.getItem('asset-manager.theme') === 'dark');
  syncTheme(darkMode.value);
  function toggleTheme(): void {
    darkMode.value = !darkMode.value;
    localStorage.setItem(
      'asset-manager.theme',
      darkMode.value ? 'dark' : 'light',
    );
    syncTheme(darkMode.value);
  }
  return { darkMode, toggleTheme };
});

function syncTheme(dark: boolean): void {
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
