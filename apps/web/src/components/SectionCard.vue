<script setup lang="ts">
defineProps<{ title: string; description?: string; flush?: boolean }>();
</script>

<template>
  <section class="section-card" :class="{ 'section-card--flush': flush }">
    <header class="section-card__header">
      <div>
        <h2>{{ title }}</h2>
        <p v-if="description">{{ description }}</p>
      </div>
      <div v-if="$slots.action" class="section-card__action">
        <slot name="action" />
      </div>
    </header>
    <div class="section-card__body"><slot /></div>
  </section>
</template>
