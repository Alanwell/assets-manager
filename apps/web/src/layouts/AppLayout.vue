<script setup lang="ts">
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core';
import {
  NAvatar,
  NButton,
  NDrawer,
  NDrawerContent,
  NDropdown,
  NIcon,
  NLayout,
  NLayoutContent,
  NLayoutHeader,
  NLayoutSider,
  NMenu,
  type MenuOption,
} from 'naive-ui';
import { MoonOutline, SunnyOutline } from '@vicons/ionicons5';
import { computed, h, onMounted, ref } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const app = useAppStore();
const mobile = useBreakpoints(breakpointsTailwind).smaller('md');
const drawer = ref(false);
const menuEntries: Array<[string, string]> = [
  ['/dashboard', '仪表盘'],
  ['/assets', '资产管理'],
  ['/categories', '分类管理'],
  ['/tags', '标签管理'],
  ['/settings', '系统设置'],
];
const menuOptions: MenuOption[] = menuEntries.map(([key, label]) => ({
  key,
  label: () => h(RouterLink, { to: key }, { default: () => label }),
}));
const selected = computed(() =>
  route.path.startsWith('/assets') ? '/assets' : route.path,
);

onMounted(() => void auth.loadMe().catch(() => undefined));

async function handleUser(key: string): Promise<void> {
  if (key === 'logout') {
    await auth.logout();
    await router.replace('/login');
  } else if (key === 'settings') await router.push('/settings');
}
</script>

<template>
  <NLayout has-sider class="app-shell">
    <NLayoutSider
      v-if="!mobile"
      bordered
      :width="224"
      content-style="padding: 18px 10px"
    >
      <div class="brand">
        <span class="brand-mark">AM</span><strong>资产管家</strong>
      </div>
      <NMenu :value="selected" :options="menuOptions" />
    </NLayoutSider>
    <NDrawer v-model:show="drawer" placement="left" :width="260">
      <NDrawerContent title="资产管家" closable>
        <NMenu
          :value="selected"
          :options="menuOptions"
          @update:value="drawer = false"
        />
      </NDrawerContent>
    </NDrawer>
    <NLayout>
      <NLayoutHeader bordered class="topbar">
        <NButton v-if="mobile" quaternary @click="drawer = true">菜单</NButton>
        <div class="topbar-spacer" />
        <NButton quaternary circle @click="app.toggleTheme">
          <template #icon
            ><NIcon :component="app.darkMode ? SunnyOutline : MoonOutline"
          /></template>
        </NButton>
        <NDropdown
          :options="[
            { label: '设置', key: 'settings' },
            { label: '退出登录', key: 'logout' },
          ]"
          @select="handleUser"
        >
          <NButton text
            ><NAvatar round size="small">{{
              auth.user?.displayName?.slice(0, 1) ?? 'U'
            }}</NAvatar
            ><span class="user-name">{{
              auth.user?.displayName ?? '用户'
            }}</span></NButton
          >
        </NDropdown>
      </NLayoutHeader>
      <NLayoutContent class="page-content"><RouterView /></NLayoutContent>
    </NLayout>
  </NLayout>
</template>
