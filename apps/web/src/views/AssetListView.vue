<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import StatusTag from '@/components/StatusTag.vue';
import { resourceApi } from '@/api/resources';
import { useAssetList } from '@/composables/useAssetList';
import { AssetStatus } from '@asset-manager/domain';
import {
  formatDate,
  formatMoney,
  ASSET_STATUS_META,
} from '@asset-manager/shared';
import {
  NButton,
  NCard,
  NDataTable,
  NInput,
  NSelect,
  NSpace,
  NTag,
  useDialog,
  useMessage,
  type DataTableColumns,
} from 'naive-ui';
import { h, ref } from 'vue';
import { useRouter } from 'vue-router';
import type { AssetView } from '@/types/api';
const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const { loading, items, total, categories, tags, query, load } = useAssetList();
const checked = ref<Array<string | number>>([]);
const columns: DataTableColumns<AssetView> = [
  { type: 'selection' },
  { title: '名称', key: 'name', sorter: true },
  {
    title: '分类',
    key: 'category',
    render: (r) => r.category?.name ?? '未分类',
  },
  {
    title: '品牌 / 型号',
    key: 'brand',
    render: (r) => [r.brand, r.model].filter(Boolean).join(' / ') || '—',
  },
  {
    title: '购买日期',
    key: 'purchaseDate',
    render: (r) => formatDate(r.purchaseDate),
  },
  {
    title: '购置成本',
    key: 'purchasePriceCents',
    render: (r) => formatMoney(r.purchasePriceCents),
  },
  {
    title: '账面价值',
    key: 'currentBookValueCents',
    render: (r) => formatMoney(r.currentBookValueCents),
  },
  {
    title: '市场估值',
    key: 'currentMarketValueCents',
    render: (r) => formatMoney(r.currentMarketValueCents),
  },
  {
    title: '状态',
    key: 'status',
    render: (r) => h(StatusTag, { status: r.status }),
  },
  {
    title: '标签',
    key: 'tags',
    render: (r) =>
      h(NSpace, { size: 4 }, () =>
        r.tags?.map((tag) =>
          h(
            NTag,
            {
              size: 'small',
              ...(tag.color
                ? {
                    color: {
                      color: tag.color,
                      textColor: '#fff',
                      borderColor: tag.color,
                    },
                  }
                : {}),
            },
            { default: () => tag.name },
          ),
        ),
      ),
  },
  {
    title: '操作',
    key: 'actions',
    render: (r) =>
      h(
        NButton,
        {
          text: true,
          type: 'primary',
          onClick: (e: Event) => {
            e.stopPropagation();
            void router.push(`/assets/${r.id}`);
          },
        },
        { default: () => '查看' },
      ),
  },
];
function handleSorter(sorter: {
  columnKey?: string;
  order?: 'ascend' | 'descend' | false;
}): void {
  if (sorter.columnKey && sorter.order) {
    query.sortBy = String(sorter.columnKey);
    query.sortOrder = sorter.order === 'ascend' ? 'asc' : 'desc';
  }
}
async function exportCsv(): Promise<void> {
  const blob = await resourceApi.exportAssets();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `assets-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
function archiveSelected(): void {
  dialog.warning({
    title: '批量归档',
    content: `确认归档选中的 ${checked.value.length} 项资产？`,
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: async () => {
      await Promise.all(
        checked.value.map((id) => resourceApi.archiveAsset(String(id))),
      );
      checked.value = [];
      message.success('归档完成');
      await load();
    },
  });
}
</script>
<template>
  <div>
    <PageHeader title="资产管理" description="搜索、筛选并维护全部资产。"
      ><NSpace
        ><NButton :disabled="!checked.length" @click="archiveSelected"
          >批量归档</NButton
        ><NButton @click="exportCsv">导出 CSV</NButton
        ><NButton type="primary" @click="router.push('/assets/new')"
          >新增资产</NButton
        ></NSpace
      ></PageHeader
    ><NCard
      ><div class="filter-bar">
        <NInput
          v-model:value="query.keyword"
          clearable
          placeholder="搜索名称、品牌、型号或序列号"
        /><NSelect
          v-model:value="query.categoryId"
          clearable
          placeholder="全部分类"
          :options="categories.map((v) => ({ label: v.name, value: v.id }))"
        /><NSelect
          v-model:value="query.tagIds"
          multiple
          clearable
          placeholder="标签"
          :options="tags.map((v) => ({ label: v.name, value: v.id }))"
        /><NSelect
          v-model:value="query.status"
          clearable
          placeholder="全部状态"
          :options="
            Object.values(AssetStatus).map((v) => ({
              label: ASSET_STATUS_META[v].label,
              value: v,
            }))
          "
        />
      </div>
      <NDataTable
        remote
        :loading="loading"
        :columns="columns"
        :data="items"
        :row-key="(row) => row.id"
        v-model:checked-row-keys="checked"
        :pagination="{
          page: query.page,
          pageSize: query.pageSize,
          itemCount: total,
          showSizePicker: true,
          pageSizes: [10, 20, 50],
        }"
        @update:page="query.page = $event"
        @update:page-size="query.pageSize = $event"
        @update:sorter="handleSorter"
        :row-props="
          (row) => ({
            onClick: () => router.push(`/assets/${row.id}`),
            style: 'cursor:pointer',
          })
        "
    /></NCard>
  </div>
</template>
