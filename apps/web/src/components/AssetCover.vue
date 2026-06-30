<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{
  name: string;
  category?: string | null | undefined;
  compact?: boolean;
}>();
const initials = computed(() => props.name.trim().slice(0, 2).toUpperCase());
const variant = computed(() => {
  const code = [...props.name].reduce(
    (sum, char) => sum + char.charCodeAt(0),
    0,
  );
  return code % 5;
});
</script>

<template>
  <div
    class="asset-cover"
    :class="[`asset-cover--${variant}`, { 'asset-cover--compact': compact }]"
  >
    <span class="asset-cover__glow" />
    <span class="asset-cover__initials">{{ initials }}</span>
    <small v-if="!compact">{{ category ?? '个人资产' }}</small>
  </div>
</template>
