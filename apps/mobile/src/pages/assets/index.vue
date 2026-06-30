<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { Asset, PageResult } from '@asset-manager/domain';
import { apiClient } from '../../services/api';

const assets = ref<Asset[]>([]);
const loading = ref(false);
const errorMessage = ref('');

async function loadAssets(): Promise<void> {
  loading.value = true;
  errorMessage.value = '';
  try {
    const result = await apiClient.get<PageResult<Asset>>(
      '/assets?page=1&pageSize=20',
    );
    assets.value = result.items;
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '加载失败';
  } finally {
    loading.value = false;
  }
}

onMounted(() => void loadAssets());
</script>

<template>
  <view class="page">
    <view v-if="loading" class="muted">正在加载资产…</view>
    <view v-else-if="errorMessage" class="card">{{ errorMessage }}</view>
    <view v-else-if="assets.length === 0" class="card muted">暂无资产</view>
    <view v-for="asset in assets" :key="asset.id" class="card">
      <view>{{ asset.name }}</view>
      <view class="muted"
        >{{ asset.brand || '未填写品牌' }} · {{ asset.status }}</view
      >
    </view>
  </view>
</template>
