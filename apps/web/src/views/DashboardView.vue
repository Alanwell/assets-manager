<script setup lang="ts">
import EChart from '@/components/EChart.vue';
import PageHeader from '@/components/PageHeader.vue';
import StatusTag from '@/components/StatusTag.vue';
import { useDashboard } from '@/composables/useDashboard';
import { formatDate, formatMoney } from '@asset-manager/shared';
import type { EChartsOption } from 'echarts';
import {
  NAlert,
  NButton,
  NCard,
  NDataTable,
  NEmpty,
  NGrid,
  NGridItem,
  NSkeleton,
} from 'naive-ui';
import { computed, h } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();
const { loading, error, overview, categories, trend, statuses, recent, load } =
  useDashboard();
const cards = computed<Array<[string, string]>>(() => [
  ['总购置成本', formatMoney(overview.value?.totalPurchaseCostCents)],
  ['当前账面价值', formatMoney(overview.value?.currentBookValueCents)],
  ['累计折旧', formatMoney(overview.value?.accumulatedDepreciationCents)],
  ['市场估值', formatMoney(overview.value?.currentMarketValueCents)],
  ['本月折旧', formatMoney(overview.value?.currentMonthDepreciationCents)],
  ['资产数量', `${overview.value?.assetCount ?? 0} 件`],
]);
const categoryOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'item' },
  series: [
    {
      type: 'pie',
      radius: ['45%', '72%'],
      data: categories.value.map((v) => ({
        name: v.name,
        value: v.valueCents,
      })),
    },
  ],
}));
const trendOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  xAxis: { type: 'category', data: trend.value.map((v) => v.month) },
  yAxis: { type: 'value' },
  series: [
    {
      type: 'line',
      smooth: true,
      areaStyle: {},
      data: trend.value.map((v) => v.depreciationCents / 100),
    },
  ],
}));
const statusOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'item' },
  series: [
    {
      type: 'pie',
      radius: '65%',
      data: statuses.value.map((v) => ({
        name: v.status,
        value: v.assetCount,
      })),
    },
  ],
}));
const columns = [
  { title: '名称', key: 'name' },
  {
    title: '购买日期',
    key: 'purchaseDate',
    render: (row: (typeof recent.value)[number]) =>
      formatDate(row.purchaseDate),
  },
  {
    title: '购置成本',
    key: 'purchasePriceCents',
    render: (row: (typeof recent.value)[number]) =>
      formatMoney(row.purchasePriceCents),
  },
  {
    title: '状态',
    key: 'status',
    render: (row: (typeof recent.value)[number]) =>
      h(StatusTag, { status: row.status }),
  },
];
</script>
<template>
  <div>
    <PageHeader title="仪表盘" description="今天也把资产看得明明白白。"
      ><NButton type="primary" @click="router.push('/assets/new')"
        >新增资产</NButton
      ></PageHeader
    ><NAlert v-if="error" type="error" closable
      >{{ error }} <NButton text @click="load">重试</NButton></NAlert
    ><NGrid :cols="'1 s:2 l:3'" responsive="screen" :x-gap="16" :y-gap="16"
      ><NGridItem v-for="card in cards" :key="card[0]"
        ><NCard
          ><NSkeleton v-if="loading" text :repeat="2" /><template v-else
            ><div class="metric-label">{{ card[0] }}</div>
            <div class="metric-value">{{ card[1] }}</div></template
          ></NCard
        ></NGridItem
      ></NGrid
    >
    <div class="dashboard-grid">
      <NCard title="分类价值占比"><EChart :option="categoryOption" /></NCard
      ><NCard title="状态分布"><EChart :option="statusOption" /></NCard
      ><NCard title="近 12 个月折旧趋势" class="wide"
        ><EChart :option="trendOption" /></NCard
      ><NCard title="最近新增资产" class="wide"
        ><NEmpty
          v-if="!loading && !recent.length"
          description="还没有资产" /><NDataTable
          v-else
          :loading="loading"
          :columns="columns"
          :data="recent"
          :row-props="
            (row) => ({
              onClick: () => router.push(`/assets/${row.id}`),
              style: 'cursor:pointer',
            })
          "
      /></NCard>
    </div>
  </div>
</template>
