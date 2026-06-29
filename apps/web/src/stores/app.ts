import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useAppStore = defineStore('app', () => {
  const darkMode = ref(localStorage.getItem('asset-manager.theme') === 'dark');
  function toggleTheme(): void {
    darkMode.value = !darkMode.value;
    localStorage.setItem(
      'asset-manager.theme',
      darkMode.value ? 'dark' : 'light',
    );
  }
  return { darkMode, toggleTheme };
});
