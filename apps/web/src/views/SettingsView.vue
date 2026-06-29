<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import { resourceApi } from '@/api/resources';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { formatDate } from '@asset-manager/shared';
import {
  NButton,
  NCard,
  NDescriptions,
  NDescriptionsItem,
  NList,
  NListItem,
  NSpace,
  NSwitch,
  useMessage,
} from 'naive-ui';
import { onMounted, ref } from 'vue';
const app = useAppStore();
const auth = useAuthStore();
const message = useMessage();
const backups = ref<Awaited<ReturnType<typeof resourceApi.backups>>>([]);
onMounted(() => void resourceApi.backups().then((v) => (backups.value = v)));
async function backup() {
  await resourceApi.createBackup();
  backups.value = await resourceApi.backups();
  message.success('备份已创建');
}
async function exportCsv() {
  const blob = await resourceApi.exportAssets();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'assets.csv';
  a.click();
  URL.revokeObjectURL(url);
}
</script>
<template>
  <div>
    <PageHeader title="系统设置" description="管理个人偏好、导出和数据备份。" />
    <div class="settings-grid">
      <NCard title="个人资料"
        ><NDescriptions label-placement="left"
          ><NDescriptionsItem label="昵称">{{
            auth.user?.displayName
          }}</NDescriptionsItem
          ><NDescriptionsItem label="邮箱">{{
            auth.user?.email
          }}</NDescriptionsItem></NDescriptions
        ></NCard
      ><NCard title="外观"
        ><NSpace justify="space-between"
          ><span>深色主题</span
          ><NSwitch
            :value="app.darkMode"
            @update:value="app.toggleTheme" /></NSpace></NCard
      ><NCard title="数据工具"
        ><NSpace
          ><NButton @click="exportCsv">导出资产 CSV</NButton
          ><NButton type="primary" @click="backup">立即备份</NButton></NSpace
        ><NList style="margin-top: 12px"
          ><NListItem v-for="item in backups" :key="item.name"
            >{{ item.name }} · {{ formatDate(item.createdAt) }} ·
            {{ (item.size / 1024).toFixed(1) }} KB</NListItem
          ></NList
        ></NCard
      ><NCard title="关于系统"
        ><p>Asset Manager 个人资产管理系统</p>
        <p class="muted">
          当前版本包含资产生命周期、可追溯折旧、统计、导出和备份能力。
        </p></NCard
      >
    </div>
  </div>
</template>
