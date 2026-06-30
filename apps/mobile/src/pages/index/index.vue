<script setup lang="ts">
import { computed } from 'vue';
import { createDepreciationPreview } from '../../services/depreciation-example';

const preview = createDepreciationPreview(
  new Date().toISOString().slice(0, 10),
);
const bookValue = computed(() =>
  (preview.currentBookValueCents / 100).toFixed(2),
);
</script>

<template>
  <view class="page">
    <view class="card">
      <view class="title">资产管家</view>
      <view class="muted"
        >移动端骨架已连接共享领域模型、API Client 与折旧引擎。</view
      >
    </view>
    <view class="card">
      <view>折旧预览示例</view>
      <view class="title">¥{{ bookValue }}</view>
      <view class="muted">基于共享 depreciation 包实时计算</view>
    </view>
    <button
      type="primary"
      @click="uni.navigateTo({ url: '/pages/login/index' })"
    >
      前往登录
    </button>
  </view>
</template>
