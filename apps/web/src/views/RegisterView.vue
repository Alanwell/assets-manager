<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { ApiError } from '@asset-manager/api-client';
import { NButton, NCard, NForm, NFormItem, NInput, useMessage } from 'naive-ui';
import { reactive, ref } from 'vue';
import { RouterLink, useRouter } from 'vue-router';
const auth = useAuthStore();
const router = useRouter();
const message = useMessage();
const loading = ref(false);
const form = reactive({ displayName: '', email: '', password: '' });
async function submit(): Promise<void> {
  loading.value = true;
  try {
    await auth.register(form.email, form.password, form.displayName);
    await router.replace('/dashboard');
  } catch (error) {
    message.error(error instanceof ApiError ? error.message : '注册失败');
  } finally {
    loading.value = false;
  }
}
</script>
<template>
  <main class="auth-page">
    <NCard class="auth-card"
      ><div class="auth-brand">ASSET MANAGER</div>
      <h1>创建账号</h1>
      <p>从今天开始，清楚掌握资产价值。</p>
      <NForm @submit.prevent="submit"
        ><NFormItem label="昵称"
          ><NInput v-model:value="form.displayName" /></NFormItem
        ><NFormItem label="邮箱"
          ><NInput v-model:value="form.email" /></NFormItem
        ><NFormItem label="密码"
          ><NInput
            v-model:value="form.password"
            type="password"
            show-password-on="click"
            placeholder="至少 8 位" /></NFormItem
        ><NButton type="primary" block attr-type="submit" :loading="loading"
          >注册</NButton
        ></NForm
      >
      <div class="auth-footer">
        已有账号？<RouterLink to="/login">返回登录</RouterLink>
      </div></NCard
    >
  </main>
</template>
