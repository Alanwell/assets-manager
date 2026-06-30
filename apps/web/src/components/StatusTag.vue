<script setup lang="ts">
import type { AssetStatus } from '@asset-manager/domain';
import { ASSET_STATUS_META } from '@asset-manager/shared';
defineProps<{ status: AssetStatus }>();
</script>

<template>
  <span class="status-badge" :class="`status-badge--${status.toLowerCase()}`">
    <i />{{ ASSET_STATUS_META[status].label }}
  </span>
</template>
