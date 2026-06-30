<script setup lang="ts">
defineProps<{
  label: string;
  value: string;
  hint?: string;
  featured?: boolean;
  loading?: boolean;
}>();
</script>

<template>
  <article class="metric-card" :class="{ 'metric-card--featured': featured }">
    <div class="metric-card__top">
      <span class="metric-card__label">{{ label }}</span>
      <span v-if="$slots.icon" class="metric-card__icon"
        ><slot name="icon"
      /></span>
    </div>
    <div v-if="loading" class="skeleton-line skeleton-line--value" />
    <div v-else class="metric-card__value">{{ value }}</div>
    <p v-if="hint" class="metric-card__hint">{{ hint }}</p>
  </article>
</template>
