<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { ApiError } from '@asset-manager/api-client';
import { NButton, NForm, NFormItem, NInput, useMessage } from 'naive-ui';
import { reactive, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();
const route = useRoute();
const message = useMessage();
const loading = ref(false);
const form = reactive({
  email: '',
  password: '',
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
    <section class="auth-panel">
      <div class="auth-card">
        <div class="auth-brand">ASSET MANAGER</div>
        <h1>欢迎回来</h1>
        <p>登录你的私人资产档案馆，继续追踪每一件重要物品的价值。</p>
        <NForm @submit.prevent="submit">
          <NFormItem label="邮箱">
            <NInput v-model:value="form.email" />
          </NFormItem>
          <NFormItem label="密码">
            <NInput
              v-model:value="form.password"
              type="password"
              show-password-on="click"
            />
          </NFormItem>
          <NButton type="primary" block attr-type="submit" :loading="loading">
            登录
          </NButton>
        </NForm>
        <div class="auth-footer">
          <span>还没有账号？</span>
          <RouterLink to="/register">立即注册</RouterLink>
        </div>
      </div>
    </section>
    <aside class="auth-visual">
      <div class="auth-visual__quote">
        <small>VALUE, PRESERVED.</small>
        <h2>看见拥有之物，<br />也看见时间留下的价值。</h2>
        <p>
          从购入、折旧到维护与流转，为你的个人资产建立清晰、克制且长久的数字档案。
        </p>
      </div>
    </aside>
    <footer class="auth-page__filing">
      <span>ICP 备案号：</span>
      <a
        class="auth-filing"
        href="https://beian.miit.gov.cn/"
        target="_blank"
        rel="noopener noreferrer"
      >
        皖ICP备2026020957号
      </a>
    </footer>
  </main>
</template>
