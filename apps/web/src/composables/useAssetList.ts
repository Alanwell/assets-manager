import { resourceApi } from '@/api/resources';
import type { AssetStatus } from '@asset-manager/domain';
import type { AssetView, CategoryView, TagView } from '@/types/api';
import { onMounted, reactive, ref, watch } from 'vue';
export function useAssetList() {
  const loading = ref(false);
  const items = ref<AssetView[]>([]);
  const total = ref(0);
  const categories = ref<CategoryView[]>([]);
  const tags = ref<TagView[]>([]);
  const query = reactive<{
    page: number;
    pageSize: number;
    keyword: string;
    categoryId: string | null;
    tagIds: string[];
    status: AssetStatus | null;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
  }>({
    page: 1,
    pageSize: 20,
    keyword: '',
    categoryId: null,
    tagIds: [],
    status: null,
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });
  async function load(): Promise<void> {
    loading.value = true;
    try {
      const p = new URLSearchParams({
        page: String(query.page),
        pageSize: String(query.pageSize),
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
      });
      if (query.keyword) p.set('keyword', query.keyword);
      if (query.categoryId) p.set('categoryId', query.categoryId);
      if (query.tagIds.length) p.set('tagIds', query.tagIds.join(','));
      if (query.status) p.set('status', query.status);
      const result = await resourceApi.assets(p);
      items.value = result.items;
      total.value = result.total;
    } finally {
      loading.value = false;
    }
  }
  let timer: number | undefined;
  watch(
    () => [
      query.page,
      query.pageSize,
      query.categoryId,
      query.status,
      query.tagIds.join(','),
      query.sortBy,
      query.sortOrder,
    ],
    () => void load(),
  );
  watch(
    () => query.keyword,
    () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        query.page = 1;
        void load();
      }, 300);
    },
  );
  onMounted(async () => {
    [categories.value, tags.value] = await Promise.all([
      resourceApi.categories(),
      resourceApi.tags(),
    ]);
    await load();
  });
  return { loading, items, total, categories, tags, query, load };
}
