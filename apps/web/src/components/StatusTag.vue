<script setup lang="ts">
import type { AssetStatus } from '@asset-manager/domain';
import { ASSET_STATUS_META } from '@asset-manager/shared';
import { NTag } from 'naive-ui';
const props = defineProps<{ status: AssetStatus }>();
</script>
<template>
  <NTag :type="ASSET_STATUS_META[props.status].type" size="small">{{
    ASSET_STATUS_META[props.status].label
  }}</NTag>
</template>
