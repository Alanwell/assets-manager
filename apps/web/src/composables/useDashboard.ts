import { resourceApi } from '@/api/resources';
import type { AssetView, DashboardOverview } from '@/types/api';
import { onMounted, ref } from 'vue';

export function useDashboard() {
  const loading = ref(true);
  const error = ref('');
  const overview = ref<DashboardOverview>();
  const categories = ref<
    Awaited<ReturnType<typeof resourceApi.categoryDistribution>>
  >([]);
  const trend = ref<Awaited<ReturnType<typeof resourceApi.depreciationTrend>>>(
    [],
  );
  const statuses = ref<
    Awaited<ReturnType<typeof resourceApi.statusDistribution>>
  >([]);
  const recent = ref<AssetView[]>([]);
  async function load(): Promise<void> {
    loading.value = true;
    error.value = '';
    try {
      [
        overview.value,
        categories.value,
        trend.value,
        statuses.value,
        recent.value,
      ] = await Promise.all([
        resourceApi.overview(),
        resourceApi.categoryDistribution(),
        resourceApi.depreciationTrend(),
        resourceApi.statusDistribution(),
        resourceApi.recentAssets(),
      ]);
    } catch {
      error.value = '统计数据加载失败';
    } finally {
      loading.value = false;
    }
  }
  onMounted(() => void load());
  return {
    loading,
    error,
    overview,
    categories,
    trend,
    statuses,
    recent,
    load,
  };
}
