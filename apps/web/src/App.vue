<script setup lang="ts">
import { computed } from 'vue';
import {
  darkTheme,
  dateZhCN,
  NConfigProvider,
  NDialogProvider,
  NMessageProvider,
  NNotificationProvider,
  zhCN,
} from 'naive-ui';
import { useAppStore } from './stores/app';

const appStore = useAppStore();
const theme = computed(() => (appStore.darkMode ? darkTheme : null));
</script>

<template>
  <NConfigProvider :theme="theme" :locale="zhCN" :date-locale="dateZhCN">
    <NMessageProvider>
      <NDialogProvider>
        <NNotificationProvider>
          <RouterView />
        </NNotificationProvider>
      </NDialogProvider>
    </NMessageProvider>
  </NConfigProvider>
</template>
