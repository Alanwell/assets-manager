import { tokenStorage } from '@/api/client';
import AppLayout from '@/layouts/AppLayout.vue';
import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      component: AppLayout,
      children: [
        { path: '', redirect: '/dashboard' },
        {
          path: 'dashboard',
          component: () => import('@/views/DashboardView.vue'),
        },
        {
          path: 'assets',
          component: () => import('@/views/AssetListView.vue'),
        },
        {
          path: 'assets/new',
          component: () => import('@/views/AssetFormView.vue'),
        },
        {
          path: 'assets/:id',
          component: () => import('@/views/AssetDetailView.vue'),
        },
        {
          path: 'assets/:id/edit',
          component: () => import('@/views/AssetFormView.vue'),
        },
        {
          path: 'categories',
          component: () => import('@/views/CategoriesView.vue'),
        },
        { path: 'tags', component: () => import('@/views/TagsView.vue') },
        {
          path: 'settings',
          component: () => import('@/views/SettingsView.vue'),
        },
      ],
    },
  ],
});

router.beforeEach((to) => {
  const authenticated = Boolean(tokenStorage.access());
  if (!to.meta.public && !authenticated)
    return `/login?redirect=${encodeURIComponent(to.fullPath)}`;
  if (to.meta.public && authenticated) return '/dashboard';
  return true;
});

window.addEventListener('asset-manager:unauthorized', () => {
  void router.replace('/login');
});

export default router;
