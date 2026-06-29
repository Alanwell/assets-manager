<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { ApiError } from '@asset-manager/api-client';
import { NButton, NCard, NForm, NFormItem, NInput, useMessage } from 'naive-ui';
import { reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const message = useMessage();
const loading = ref(false);
const form = reactive({
  email: 'test@example.com',
  password: 'AssetManager123!',
});
async function submit(): Promise<void> {
  loading.value = true;
  try {
    await auth.login(form.email, form.password);
    await router.replace(
      typeof route.query.redirect === 'string'
        ? route.query.redirect
        : '/dashboard',
    );
  } catch (error) {
    message.error(
      error instanceof ApiError ? error.message : '登录失败，请稍后重试',
    );
  } finally {
    loading.value = false;
  }
}
</script>
<template>
  <main class="auth-page">
    <NCard class="auth-card"
      ><div class="auth-brand">ASSET MANAGER</div>
      <h1>欢迎回来</h1>
      <p>登录后继续管理你的每一件重要资产。</p>
      <NForm @submit.prevent="submit"
        ><NFormItem label="邮箱"
          ><NInput v-model:value="form.email" /></NFormItem
        ><NFormItem label="密码"
          ><NInput
            v-model:value="form.password"
            type="password"
            show-password-on="click" /></NFormItem
        ><NButton type="primary" block attr-type="submit" :loading="loading"
          >登录</NButton
        ></NForm
      >
      <div class="auth-footer">
        还没有账号？<RouterLink to="/register">立即注册</RouterLink>
      </div></NCard
    >
  </main>
</template>
