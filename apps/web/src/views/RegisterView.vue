<script setup lang="ts">
import { useAuthStore } from '@/stores/auth';
import { ApiError } from '@asset-manager/api-client';
import { NButton, NForm, NFormItem, NInput, useMessage } from 'naive-ui';
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
    <section class="auth-panel">
      <div class="auth-card">
        <div class="auth-brand">ASSET MANAGER</div>
        <h1>创建账号</h1>
        <p>创建你的私人资产空间，从今天开始清楚掌握拥有之物。</p>
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
        </div>
      </div>
    </section>
    <aside class="auth-visual">
      <div class="auth-visual__quote">
        <small>YOUR PRIVATE ARCHIVE</small>
        <h2>重要的不只是价格，<br />还有每件物品的来处。</h2>
        <p>
          统一记录购置、保修、维护、折旧和状态变化，让资产管理成为一种轻松的长期习惯。
        </p>
      </div>
    </aside>
  </main>
</template>
