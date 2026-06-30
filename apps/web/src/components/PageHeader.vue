<script setup lang="ts">
defineProps<{ title: string; description?: string; eyebrow?: string }>();
</script>
<template>
  <header class="page-header">
    <div>
      <span class="page-header__eyebrow">{{ eyebrow ?? 'Asset archive' }}</span>
      <h1>{{ title }}</h1>
      <p v-if="description">{{ description }}</p>
    </div>
    <div class="page-actions"><slot /></div>
  </header>
</template>
