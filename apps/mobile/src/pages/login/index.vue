<script setup lang="ts">
import { ref } from 'vue';
import type { TokenPair } from '@asset-manager/api-client';
import { apiClient, saveTokens } from '../../services/api';

const email = ref('test@example.com');
const password = ref('AssetManager123!');
const submitting = ref(false);

async function login(): Promise<void> {
  submitting.value = true;
  try {
    const tokens = await apiClient.post<TokenPair>(
      '/auth/login',
      { email: email.value, password: password.value },
      { auth: false },
    );
    saveTokens(tokens);
    await uni.switchTab({ url: '/pages/assets/index' });
  } catch (error) {
    await uni.showToast({
      title: error instanceof Error ? error.message : '登录失败',
      icon: 'none',
    });
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <view class="page">
    <view class="card">
      <view class="title">登录</view>
      <input v-model="email" placeholder="邮箱" />
      <input v-model="password" type="password" placeholder="密码" />
    </view>
    <button type="primary" :loading="submitting" @click="login">登录</button>
  </view>
</template>
