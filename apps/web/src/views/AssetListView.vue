<script setup lang="ts">
import AssetCover from '@/components/AssetCover.vue';
import EmptyState from '@/components/EmptyState.vue';
import PageHeader from '@/components/PageHeader.vue';
import StatusTag from '@/components/StatusTag.vue';
import { resourceApi } from '@/api/resources';
import { useAssetList } from '@/composables/useAssetList';
import type { AssetView } from '@/types/api';
import { AssetStatus } from '@asset-manager/domain';
import {
  ASSET_STATUS_META,
  formatDate,
  formatMoney,
} from '@asset-manager/shared';
import { Archive, Download, Grid3X3, List, Plus, Search } from '@lucide/vue';
import {
  NButton,
  NDataTable,
  NInput,
  NPagination,
  NSelect,
  NSpace,
  NTag,
  useDialog,
  useMessage,
  type DataTableColumns,
} from 'naive-ui';
import { computed, h, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const { loading, items, total, categories, tags, query, load } = useAssetList();
const checked = ref<Array<string | number>>([]);
const viewMode = ref<'card' | 'table'>('card');
const pageCount = computed(() =>
  Math.max(1, Math.ceil(total.value / query.pageSize)),
);

const columns: DataTableColumns<AssetView> = [
  { type: 'selection' },
  { title: '名称', key: 'name', sorter: true, minWidth: 180 },
  {
    title: '分类',
    key: 'category',
    render: (row) => row.category?.name ?? '未分类',
  },
  {
    title: '品牌 / 型号',
    key: 'brand',
    render: (row) => [row.brand, row.model].filter(Boolean).join(' / ') || '—',
  },
  {
    title: '购买日期',
    key: 'purchaseDate',
    render: (row) => formatDate(row.purchaseDate),
  },
  {
    title: '账面价值',
    key: 'currentBookValueCents',
    render: (row) => formatMoney(row.currentBookValueCents),
  },
  {
    title: '市场估值',
    key: 'currentMarketValueCents',
    render: (row) => formatMoney(row.currentMarketValueCents),
  },
  {
    title: '状态',
    key: 'status',
    render: (row) => h(StatusTag, { status: row.status }),
  },
  {
    title: '标签',
    key: 'tags',
    render: (row) =>
      h(NSpace, { size: 4 }, () =>
        row.tags
          ?.slice(0, 2)
          .map((tag) =>
            h(
              NTag,
              { size: 'small', bordered: false },
              { default: () => tag.name },
            ),
          ),
      ),
  },
];

function depreciationProgress(asset: AssetView): number {
  const cost = asset.purchasePriceCents ?? 0;
  const residual = asset.residualValueCents ?? 0;
  const depreciable = cost - residual;
  if (depreciable <= 0) return 0;
  const used = cost - (asset.currentBookValueCents ?? cost);
  return Math.max(0, Math.min(100, Math.round((used / depreciable) * 100)));
}

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
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `assets-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function archiveSelected(): void {
  dialog.warning({
    title: '批量归档',
    content: `确认归档选中的 ${checked.value.length} 项资产？`,
    positiveText: '确认归档',
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
    <PageHeader
      title="资产档案"
      eyebrow="Private collection"
      description="浏览、筛选并维护每一件重要资产的价值档案。"
    >
      <NButton :disabled="!checked.length" secondary @click="archiveSelected">
        <template #icon><Archive :size="16" /></template>批量归档
      </NButton>
      <NButton secondary @click="exportCsv"
        ><template #icon><Download :size="16" /></template>导出 CSV</NButton
      >
      <NButton type="primary" @click="router.push('/assets/new')"
        ><template #icon><Plus :size="16" /></template>新增资产</NButton
      >
    </PageHeader>

    <div class="filter-surface">
      <div class="filter-bar">
        <NInput
          v-model:value="query.keyword"
          clearable
          placeholder="搜索名称、品牌、型号或序列号"
        >
          <template #prefix><Search :size="15" /></template>
        </NInput>
        <NSelect
          v-model:value="query.categoryId"
          clearable
          placeholder="全部分类"
          :options="
            categories.map((item) => ({ label: item.name, value: item.id }))
          "
        />
        <NSelect
          v-model:value="query.tagIds"
          multiple
          clearable
          placeholder="全部标签"
          :options="tags.map((item) => ({ label: item.name, value: item.id }))"
        />
        <NSelect
          v-model:value="query.status"
          clearable
          placeholder="全部状态"
          :options="
            Object.values(AssetStatus).map((status) => ({
              label: ASSET_STATUS_META[status].label,
              value: status,
            }))
          "
        />
      </div>
      <div class="view-toolbar">
        <span class="result-count"
          >共收录 {{ total }} 件资产 · 第 {{ query.page }} 页</span
        >
        <div class="view-switch" aria-label="切换视图">
          <button
            :class="{ active: viewMode === 'card' }"
            title="卡片视图"
            @click="viewMode = 'card'"
          >
            <Grid3X3 :size="15" />
          </button>
          <button
            :class="{ active: viewMode === 'table' }"
            title="表格视图"
            @click="viewMode = 'table'"
          >
            <List :size="16" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="viewMode === 'card'">
      <div v-if="loading" class="asset-card-grid">
        <article
          v-for="index in 6"
          :key="index"
          class="asset-card"
          style="padding: 22px"
        >
          <div class="skeleton-line" style="height: 150px" />
          <div class="skeleton-line" style="margin-top: 20px" />
        </article>
      </div>
      <EmptyState
        v-else-if="!items.length"
        title="档案馆还是空的"
        description="新增第一件资产，开始记录它的购置、折旧与维护历史。"
      >
        <NButton type="primary" @click="router.push('/assets/new')"
          >新增资产</NButton
        >
      </EmptyState>
      <div v-else class="asset-card-grid">
        <article
          v-for="asset in items"
          :key="asset.id"
          class="asset-card"
          @click="router.push(`/assets/${asset.id}`)"
        >
          <AssetCover :name="asset.name" :category="asset.category?.name" />
          <div class="asset-card__body">
            <div class="asset-card__heading">
              <h3>{{ asset.name }}</h3>
              <StatusTag :status="asset.status" />
            </div>
            <p class="asset-card__meta">
              {{
                [asset.brand, asset.model].filter(Boolean).join(' · ') ||
                asset.category?.name ||
                '未分类资产'
              }}
            </p>
            <div class="asset-values">
              <div class="asset-value">
                <span>当前账面价值</span
                ><strong>{{ formatMoney(asset.currentBookValueCents) }}</strong>
              </div>
              <div class="asset-value">
                <span>市场估值</span
                ><strong>{{
                  formatMoney(asset.currentMarketValueCents)
                }}</strong>
              </div>
            </div>
            <div class="progress-line">
              <i :style="{ width: `${depreciationProgress(asset)}%` }" />
            </div>
            <div class="progress-caption">
              <span>折旧进度</span
              ><span>{{ depreciationProgress(asset) }}%</span>
            </div>
            <footer class="asset-card__footer">
              <span>{{ formatDate(asset.purchaseDate) }} 购入</span
              ><span>{{ asset.location || '位置未记录' }}</span>
            </footer>
          </div>
        </article>
      </div>
    </div>

    <div v-else class="table-surface">
      <NDataTable
        remote
        :loading="loading"
        :columns="columns"
        :data="items"
        :row-key="(row) => row.id"
        v-model:checked-row-keys="checked"
        :pagination="false"
        @update:sorter="handleSorter"
        :row-props="
          (row) => ({
            onClick: () => router.push(`/assets/${row.id}`),
            style: 'cursor:pointer',
          })
        "
      />
    </div>

    <div class="pagination-row">
      <NPagination
        v-model:page="query.page"
        :page-count="pageCount"
        :page-slot="7"
      />
    </div>
  </div>
</template>
