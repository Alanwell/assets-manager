<script setup lang="ts">
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import { useBreakpoints, breakpointsTailwind } from '@vueuse/core';
import {
  Archive,
  ChevronDown,
  FolderTree,
  LayoutDashboard,
  Menu,
  Moon,
  Search,
  Settings,
  Sun,
  Tags,
} from '@lucide/vue';
import { NAvatar, NDrawer, NDrawerContent, NDropdown } from 'naive-ui';
import { computed, onMounted, ref, type Component } from 'vue';
import { RouterLink, useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const auth = useAuthStore();
const app = useAppStore();
const mobile = useBreakpoints(breakpointsTailwind).smaller('md');
const drawer = ref(false);

const menuEntries: Array<{ path: string; label: string; icon: Component }> = [
  { path: '/dashboard', label: '资产概览', icon: LayoutDashboard },
  { path: '/assets', label: '资产档案', icon: Archive },
  { path: '/categories', label: '分类管理', icon: FolderTree },
  { path: '/tags', label: '标签管理', icon: Tags },
  { path: '/settings', label: '偏好设置', icon: Settings },
];

const selected = computed(() =>
  route.path.startsWith('/assets') ? '/assets' : route.path,
);
const currentTitle = computed(
  () =>
    menuEntries.find((item) => item.path === selected.value)?.label ??
    '资产管家',
);

onMounted(() => void auth.loadMe().catch(() => undefined));

async function handleUser(key: string): Promise<void> {
  if (key === 'logout') {
    await auth.logout();
    await router.replace('/login');
  } else if (key === 'settings') {
    await router.push('/settings');
  }
}
</script>

<template>
  <div class="app-shell">
    <aside class="app-sidebar">
      <div class="brand">
        <span class="brand-mark">AM</span>
        <div class="brand-copy">
          <strong>资产管家</strong><span>PRIVATE ARCHIVE</span>
        </div>
      </div>
      <div class="nav-label">管理空间</div>
      <nav class="side-nav">
        <RouterLink
          v-for="item in menuEntries"
          :key="item.path"
          :to="item.path"
          class="side-nav__item"
          :class="{ active: selected === item.path }"
        >
          <component :is="item.icon" :size="17" :stroke-width="1.8" />
          <span>{{ item.label }}</span>
        </RouterLink>
      </nav>
      <div class="sidebar-footer">
        让每一件重要资产<br />都有清晰可追溯的价值档案
      </div>
    </aside>

    <NDrawer v-model:show="drawer" placement="left" :width="280">
      <NDrawerContent title="资产管家" closable>
        <nav class="side-nav">
          <RouterLink
            v-for="item in menuEntries"
            :key="item.path"
            :to="item.path"
            class="side-nav__item"
            :class="{ active: selected === item.path }"
            @click="drawer = false"
          >
            <component :is="item.icon" :size="17" />{{ item.label }}
          </RouterLink>
        </nav>
      </NDrawerContent>
    </NDrawer>

    <main class="app-main">
      <header class="topbar">
        <button
          v-if="mobile"
          class="icon-button"
          aria-label="打开菜单"
          @click="drawer = true"
        >
          <Menu :size="18" />
        </button>
        <div class="topbar__context">
          <small>Personal wealth</small><strong>{{ currentTitle }}</strong>
        </div>
        <div class="topbar-spacer" />
        <button
          class="icon-button"
          aria-label="搜索资产"
          @click="router.push('/assets')"
        >
          <Search :size="17" />
        </button>
        <button
          class="icon-button"
          aria-label="切换主题"
          @click="app.toggleTheme"
        >
          <Sun v-if="app.darkMode" :size="17" /><Moon v-else :size="17" />
        </button>
        <NDropdown
          :options="[
            { label: '偏好设置', key: 'settings' },
            { label: '退出登录', key: 'logout' },
          ]"
          @select="handleUser"
        >
          <button
            class="user-trigger icon-button"
            style="width: auto; padding: 0 9px 0 5px"
          >
            <NAvatar round :size="29">{{
              auth.user?.displayName?.slice(0, 1) ?? 'U'
            }}</NAvatar>
            <span class="user-copy"
              ><strong>{{ auth.user?.displayName ?? '用户' }}</strong
              ><span>个人空间</span></span
            >
            <ChevronDown :size="13" />
          </button>
        </NDropdown>
      </header>
      <div class="page-content"><RouterView /></div>
      <footer class="site-filing">
      <span>ICP 备案号：</span>
        <a
          href="https://beian.miit.gov.cn/"
          target="_blank"
          rel="noopener noreferrer"
        >
          皖ICP备2026020957号
        </a>
      </footer>
    </main>
  </div>
</template>
