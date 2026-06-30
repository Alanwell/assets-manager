<script setup lang="ts">
import { PackageOpen } from '@lucide/vue';
defineProps<{ title?: string; description?: string }>();
</script>

<template>
  <div class="empty-state">
    <span class="empty-state__icon"><PackageOpen :size="26" /></span>
    <strong>{{ title ?? '暂无内容' }}</strong>
    <p>{{ description ?? '这里还没有可以展示的数据。' }}</p>
    <slot />
  </div>
</template>
