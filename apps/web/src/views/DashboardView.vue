<script setup lang="ts">
import AssetCover from '@/components/AssetCover.vue';
import EChart from '@/components/EChart.vue';
import EmptyState from '@/components/EmptyState.vue';
import MetricCard from '@/components/MetricCard.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusTag from '@/components/StatusTag.vue';
import { axisStyle, baseChartOption, chartColors } from '@/charts/theme';
import { useDashboard } from '@/composables/useDashboard';
import { useAppStore } from '@/stores/app';
import { AssetStatus } from '@asset-manager/domain';
import {
  ASSET_STATUS_META,
  formatDate,
  formatMoney,
} from '@asset-manager/shared';
import {
  Activity,
  ArrowRight,
  CircleDollarSign,
  Gem,
  PackageCheck,
  Plus,
  ShieldCheck,
  TrendingDown,
} from '@lucide/vue';
import type { EChartsOption } from 'echarts';
import { NAlert, NButton } from 'naive-ui';
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const app = useAppStore();
const { loading, error, overview, categories, trend, statuses, recent, load } =
  useDashboard();

const healthScore = computed(() => {
  const total = overview.value?.totalPurchaseCostCents ?? 0;
  const market = overview.value?.currentMarketValueCents ?? 0;
  return total
    ? Math.max(0, Math.min(100, Math.round((market / total) * 100)))
    : 100;
});
const idleCount = computed(() =>
  statuses.value
    .filter((item) =>
      [AssetStatus.IDLE, AssetStatus.LOST].includes(item.status),
    )
    .reduce((sum, item) => sum + item.assetCount, 0),
);
const marketGap = computed(
  () =>
    (overview.value?.currentMarketValueCents ?? 0) -
    (overview.value?.currentBookValueCents ?? 0),
);

const trendOption = computed<EChartsOption>(() => ({
  ...baseChartOption(app.darkMode),
  tooltip: {
    ...(baseChartOption(app.darkMode).tooltip as object),
    trigger: 'axis',
    valueFormatter: (value) => formatMoney(Number(value) * 100),
  },
  xAxis: {
    type: 'category',
    boundaryGap: false,
    data: trend.value.map((item) => item.month.slice(5) + '月'),
    ...axisStyle(app.darkMode),
    splitLine: { show: false },
  },
  yAxis: {
    type: 'value',
    ...axisStyle(app.darkMode),
    axisLabel: {
      ...axisStyle(app.darkMode).axisLabel,
      formatter: (value: number) => `${Math.round(value / 1000)}k`,
    },
  },
  series: [
    {
      name: '月度折旧',
      type: 'line',
      smooth: 0.45,
      symbol: 'circle',
      symbolSize: 7,
      showSymbol: false,
      lineStyle: { width: 2.5, color: chartColors[0] },
      itemStyle: {
        color: chartColors[0],
        borderWidth: 3,
        borderColor: '#fffefa',
      },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(173,135,82,.28)' },
            { offset: 1, color: 'rgba(173,135,82,.01)' },
          ],
        },
      },
      data: trend.value.map((item) => item.depreciationCents / 100),
    },
  ],
}));

const categoryOption = computed<EChartsOption>(() => ({
  ...baseChartOption(app.darkMode),
  grid: { left: 0, right: 12, top: 5, bottom: 0, containLabel: true },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  xAxis: { type: 'value', show: false },
  yAxis: {
    type: 'category',
    inverse: true,
    data: categories.value.slice(0, 6).map((item) => item.name),
    ...axisStyle(app.darkMode),
    splitLine: { show: false },
  },
  series: [
    {
      type: 'bar',
      barWidth: 9,
      itemStyle: { color: chartColors[1], borderRadius: 8 },
      data: categories.value.slice(0, 6).map((item) => item.valueCents / 100),
    },
  ],
}));

const statusOption = computed<EChartsOption>(() => ({
  ...baseChartOption(app.darkMode),
  tooltip: { trigger: 'item' },
  legend: {
    bottom: 0,
    icon: 'circle',
    itemWidth: 7,
    textStyle: { color: app.darkMode ? '#aaa9a1' : '#73766f' },
  },
  series: [
    {
      type: 'pie',
      radius: ['54%', '72%'],
      center: ['50%', '43%'],
      padAngle: 3,
      itemStyle: { borderRadius: 6 },
      label: { show: false },
      data: statuses.value.map((item) => ({
        name: ASSET_STATUS_META[item.status].label,
        value: item.assetCount,
      })),
    },
  ],
}));
</script>

<template>
  <div>
    <NAlert v-if="error" type="error" closable style="margin-bottom: 16px">
      {{ error }} <NButton text @click="load">重试</NButton>
    </NAlert>

    <section class="dashboard-hero">
      <div>
        <span class="dashboard-hero__eyebrow">YOUR ASSET PORTFOLIO</span>
        <h1>{{ formatMoney(overview?.currentBookValueCents) }}</h1>
        <p>
          这是你当前资产组合的账面净值。持续记录、定期维护，让每一件物品的价值变化都有迹可循。
        </p>
        <div class="hero-stats">
          <div class="hero-stat">
            <span>本月价值消耗</span
            ><strong
              >-{{
                formatMoney(overview?.currentMonthDepreciationCents)
              }}</strong
            >
          </div>
          <div class="hero-stat">
            <span>资产健康度</span><strong>{{ healthScore }} / 100</strong>
          </div>
          <div class="hero-stat">
            <span>在管资产</span
            ><strong>{{ overview?.assetCount ?? 0 }} 件在管</strong>
          </div>
        </div>
      </div>
      <div class="dashboard-hero__action">
        <NButton
          type="primary"
          size="large"
          @click="router.push('/assets/new')"
        >
          <template #icon><Plus :size="17" /></template>新增资产
        </NButton>
      </div>
    </section>

    <div class="metrics-grid">
      <MetricCard
        label="购置总成本"
        :value="formatMoney(overview?.totalPurchaseCostCents)"
        hint="全部在管资产原始成本"
        :loading="loading"
      >
        <template #icon><CircleDollarSign :size="17" /></template>
      </MetricCard>
      <MetricCard
        label="当前市场估值"
        :value="formatMoney(overview?.currentMarketValueCents)"
        :hint="`较账面价值 ${marketGap >= 0 ? '+' : ''}${formatMoney(marketGap)}`"
        :loading="loading"
      >
        <template #icon><Gem :size="17" /></template>
      </MetricCard>
      <MetricCard
        label="累计折旧"
        :value="formatMoney(overview?.accumulatedDepreciationCents)"
        hint="基于生效中的折旧规则"
        :loading="loading"
      >
        <template #icon><TrendingDown :size="17" /></template>
      </MetricCard>
      <MetricCard
        label="资产数量"
        :value="`${overview?.assetCount ?? 0} 件`"
        hint="不包含已归档资产"
        :loading="loading"
      >
        <template #icon><PackageCheck :size="17" /></template>
      </MetricCard>
    </div>

    <div class="dashboard-grid">
      <SectionCard
        title="月度折旧趋势"
        description="最近 12 个月的价值消耗节奏"
      >
        <EChart class="chart--large" :option="trendOption" />
      </SectionCard>
      <div class="dashboard-stack">
        <SectionCard title="本月关注" description="根据当前真实资产状态汇总">
          <div class="attention-list">
            <div class="attention-item">
              <span class="attention-item__icon"><Activity :size="17" /></span>
              <div>
                <strong>本月预计折旧</strong
                ><span>{{
                  formatMoney(overview?.currentMonthDepreciationCents)
                }}</span>
              </div>
            </div>
            <div class="attention-item">
              <span class="attention-item__icon"
                ><ShieldCheck :size="17"
              /></span>
              <div>
                <strong>闲置或异常资产</strong
                ><span>{{ idleCount }} 件需要确认状态</span>
              </div>
            </div>
            <div class="attention-item">
              <span class="attention-item__icon"><Gem :size="17" /></span>
              <div>
                <strong>估值与账面差额</strong
                ><span>{{ formatMoney(marketGap) }}</span>
              </div>
            </div>
          </div>
        </SectionCard>
        <SectionCard title="资产状态" description="当前组合的使用状态分布">
          <EChart :option="statusOption" style="height: 240px" />
        </SectionCard>
      </div>
    </div>

    <div class="dashboard-grid">
      <SectionCard
        title="分类价值结构"
        description="按账面价值排列的主要资产分类"
      >
        <EChart :option="categoryOption" style="height: 280px" />
      </SectionCard>
      <SectionCard title="最近录入" description="最近加入私人档案馆的资产">
        <template #action
          ><NButton text @click="router.push('/assets')"
            >查看全部 <ArrowRight :size="14" /></NButton
        ></template>
        <EmptyState
          v-if="!loading && !recent.length"
          title="还没有资产"
          description="录入第一件资产后，它会出现在这里。"
        />
        <div v-else class="recent-list">
          <div
            v-for="item in recent.slice(0, 5)"
            :key="item.id"
            class="recent-row"
            @click="router.push(`/assets/${item.id}`)"
          >
            <AssetCover :name="item.name" compact />
            <div class="recent-row__copy">
              <strong>{{ item.name }}</strong
              ><span>{{ formatDate(item.purchaseDate) }}</span>
            </div>
            <div class="recent-row__value">
              {{ formatMoney(item.purchasePriceCents) }}
            </div>
            <StatusTag :status="item.status" />
          </div>
        </div>
      </SectionCard>
    </div>
  </div>
</template>
