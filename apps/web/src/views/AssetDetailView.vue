<script setup lang="ts">
import { resourceApi } from '@/api/resources';
import { axisStyle, baseChartOption, chartColors } from '@/charts/theme';
import AssetCover from '@/components/AssetCover.vue';
import EChart from '@/components/EChart.vue';
import EmptyState from '@/components/EmptyState.vue';
import SectionCard from '@/components/SectionCard.vue';
import StatusTag from '@/components/StatusTag.vue';
import { useAppStore } from '@/stores/app';
import type {
  AssetView,
  AttachmentView,
  MaintenanceView,
  ProfileView,
} from '@/types/api';
import { AssetStatus, MaintenanceType } from '@asset-manager/domain';
import {
  ASSET_STATUS_META,
  formatDate,
  formatMoney,
} from '@asset-manager/shared';
import { Archive, Edit3, FileText, Plus, RefreshCw, Wrench } from '@lucide/vue';
import type { EChartsOption } from 'echarts';
import {
  NAlert,
  NButton,
  NDataTable,
  NInput,
  NInputNumber,
  NModal,
  NSelect,
  NSpace,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();
const dialog = useDialog();
const message = useMessage();
const app = useAppStore();
const id = String(route.params.id);
const asset = ref<AssetView>();
const timeline = ref<
  Array<{ type: string; occurredAt: string; data: unknown }>
>([]);
const maintenance = ref<MaintenanceView[]>([]);
const attachments = ref<AttachmentView[]>([]);
const profiles = ref<ProfileView[]>([]);
const loading = ref(true);
const error = ref('');
const statusModal = ref(false);
const maintenanceModal = ref(false);
const statusForm = reactive({
  status: AssetStatus.IDLE,
  note: '',
  disposalPriceYuan: null as number | null,
});
const maintenanceForm = reactive({
  maintenanceDate: new Date().toISOString().slice(0, 10),
  type: MaintenanceType.MAINTENANCE,
  costYuan: null as number | null,
  description: '',
});

async function load(): Promise<void> {
  loading.value = true;
  error.value = '';
  try {
    [
      asset.value,
      timeline.value,
      maintenance.value,
      attachments.value,
      profiles.value,
    ] = await Promise.all([
      resourceApi.asset(id),
      resourceApi.timeline(id),
      resourceApi.maintenance(id),
      resourceApi.attachments(id),
      resourceApi.profiles(id),
    ]);
  } catch (loadError) {
    error.value =
      loadError instanceof Error ? loadError.message : '资产详情加载失败';
  } finally {
    loading.value = false;
  }
}

onMounted(() => void load());

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
    data: asset.value?.depreciation?.schedule.map((item) => item.month) ?? [],
    ...axisStyle(app.darkMode),
    splitLine: { show: false },
  },
  yAxis: { type: 'value', ...axisStyle(app.darkMode) },
  series: [
    {
      name: '账面价值',
      type: 'line',
      smooth: 0.42,
      showSymbol: false,
      lineStyle: { width: 2.5, color: chartColors[0] },
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(173,135,82,.25)' },
            { offset: 1, color: 'rgba(173,135,82,.01)' },
          ],
        },
      },
      data:
        asset.value?.depreciation?.schedule.map(
          (item) => item.closingBookValueCents / 100,
        ) ?? [],
    },
  ],
}));

const latestProfile = computed(() => profiles.value.at(-1));

async function changeStatus(): Promise<void> {
  await resourceApi.changeStatus(id, {
    status: statusForm.status,
    ...(statusForm.note ? { note: statusForm.note } : {}),
    ...(statusForm.disposalPriceYuan === null
      ? {}
      : { disposalPriceCents: Math.round(statusForm.disposalPriceYuan * 100) }),
  });
  statusModal.value = false;
  message.success('状态已更新');
  await load();
}

async function addMaintenance(): Promise<void> {
  await resourceApi.createMaintenance(id, {
    maintenanceDate: maintenanceForm.maintenanceDate,
    type: maintenanceForm.type,
    ...(maintenanceForm.costYuan === null
      ? {}
      : { costCents: Math.round(maintenanceForm.costYuan * 100) }),
    ...(maintenanceForm.description
      ? { description: maintenanceForm.description }
      : {}),
  });
  maintenanceModal.value = false;
  message.success('维护记录已保存');
  await load();
}

function archive(): void {
  dialog.warning({
    title: '归档资产',
    content: '归档后默认不在资产列表中显示，确认继续？',
    positiveText: '归档',
    negativeText: '取消',
    onPositiveClick: async () => {
      await resourceApi.archiveAsset(id);
      await load();
    },
  });
}
</script>

<template>
  <div>
    <NAlert v-if="error" type="error" style="margin-bottom: 16px"
      >{{ error }} <NButton text @click="load">重试</NButton></NAlert
    >
    <div v-if="loading" class="detail-hero" style="padding: 30px">
      <div class="skeleton-line" style="height: 250px" />
    </div>

    <template v-else-if="asset">
      <section class="detail-hero">
        <AssetCover :name="asset.name" :category="asset.category?.name" />
        <div class="detail-hero__content">
          <div class="detail-hero__top">
            <div>
              <StatusTag :status="asset.status" />
              <h1>{{ asset.name }}</h1>
              <div class="detail-hero__sub">
                {{
                  [asset.brand, asset.model].filter(Boolean).join(' · ') ||
                  '私人资产档案'
                }}
              </div>
            </div>
            <NSpace>
              <NButton secondary @click="router.push(`/assets/${id}/edit`)"
                ><template #icon><Edit3 :size="15" /></template>编辑</NButton
              >
              <NButton secondary @click="statusModal = true"
                ><template #icon><RefreshCw :size="15" /></template
                >变更状态</NButton
              >
              <NButton
                v-if="asset.status !== AssetStatus.ARCHIVED"
                secondary
                @click="archive"
                ><template #icon><Archive :size="15" /></template>归档</NButton
              >
              <NButton
                v-else
                secondary
                @click="resourceApi.restoreAsset(id).then(load)"
                >恢复</NButton
              >
            </NSpace>
          </div>
          <div class="detail-values">
            <div class="detail-value">
              <span>当前账面价值</span
              ><strong>{{
                formatMoney(asset.depreciation?.currentBookValueCents)
              }}</strong>
            </div>
            <div class="detail-value">
              <span>当前市场估值</span
              ><strong>{{ formatMoney(asset.currentMarketValueCents) }}</strong>
            </div>
            <div class="detail-value">
              <span>累计折旧</span
              ><strong>{{
                formatMoney(asset.depreciation?.accumulatedDepreciationCents)
              }}</strong>
            </div>
          </div>
        </div>
      </section>

      <div class="detail-grid">
        <SectionCard
          title="价值趋势"
          description="按当前折旧规则生成的月度账面价值"
        >
          <EChart :option="trendOption" />
        </SectionCard>

        <SectionCard title="资产档案" description="购置、归属与折旧基础信息">
          <div class="archive-grid">
            <div class="archive-field">
              <span>分类</span
              ><strong>{{ asset.category?.name ?? '未分类' }}</strong>
            </div>
            <div class="archive-field">
              <span>购买日期</span
              ><strong>{{ formatDate(asset.purchaseDate) }}</strong>
            </div>
            <div class="archive-field">
              <span>购置成本</span
              ><strong>{{ formatMoney(asset.purchasePriceCents) }}</strong>
            </div>
            <div class="archive-field">
              <span>存放位置</span
              ><strong>{{ asset.location ?? '未记录' }}</strong>
            </div>
            <div class="archive-field">
              <span>归属人</span
              ><strong>{{ asset.ownerName ?? '未记录' }}</strong>
            </div>
            <div class="archive-field">
              <span>折旧版本</span
              ><strong>v{{ latestProfile?.version ?? 1 }}</strong>
            </div>
          </div>
          <NSpace style="margin-top: 14px"
            ><NTag v-for="tag in asset.tags" :key="tag.id" :bordered="false">{{
              tag.name
            }}</NTag></NSpace
          >
        </SectionCard>

        <SectionCard
          class="wide"
          title="折旧计划"
          description="每月折旧额与期末账面价值，可追溯到规则快照"
          flush
        >
          <NDataTable
            :columns="[
              { title: '月份', key: 'month' },
              {
                title: '期初价值',
                key: 'openingBookValueCents',
                render: (row) => formatMoney(row.openingBookValueCents),
              },
              {
                title: '本月折旧',
                key: 'depreciationCents',
                render: (row) => formatMoney(row.depreciationCents),
              },
              {
                title: '累计折旧',
                key: 'accumulatedDepreciationCents',
                render: (row) => formatMoney(row.accumulatedDepreciationCents),
              },
              {
                title: '期末价值',
                key: 'closingBookValueCents',
                render: (row) => formatMoney(row.closingBookValueCents),
              },
            ]"
            :data="asset.depreciation?.schedule ?? []"
            :max-height="340"
          />
        </SectionCard>

        <SectionCard title="维修与保养" description="维护成本与服务历史">
          <template #action
            ><NButton text @click="maintenanceModal = true"
              ><Plus :size="14" />新增记录</NButton
            ></template
          >
          <EmptyState
            v-if="!maintenance.length"
            title="暂无维护记录"
            description="定期记录维修与保养，有助于保持资产状态。"
          />
          <div v-else class="timeline-list">
            <div
              v-for="item in maintenance"
              :key="item.id"
              class="timeline-entry"
            >
              <strong
                >{{ formatDate(item.maintenanceDate) }} ·
                {{ item.type }}</strong
              >
              <span
                >{{ item.description || '无说明' }} ·
                {{ formatMoney(item.costCents) }}</span
              >
            </div>
          </div>
        </SectionCard>

        <SectionCard title="附件画廊" description="发票、保修凭证与说明资料">
          <EmptyState
            v-if="!attachments.length"
            title="暂无附件"
            description="可在编辑页面上传图片、发票或保修资料。"
          />
          <div v-else>
            <div v-for="item in attachments" :key="item.id" class="file-row">
              <span style="display: flex; align-items: center; gap: 9px"
                ><FileText :size="16" />{{ item.fileName }}</span
              >
              <NButton
                text
                type="error"
                @click="resourceApi.deleteAttachment(id, item.id).then(load)"
                >删除</NButton
              >
            </div>
          </div>
        </SectionCard>

        <SectionCard
          class="wide"
          title="生命周期"
          description="从录入到状态变化的完整轨迹"
        >
          <EmptyState v-if="!timeline.length" title="暂无生命周期事件" />
          <div v-else class="timeline-list">
            <div
              v-for="item in timeline"
              :key="`${item.type}-${item.occurredAt}`"
              class="timeline-entry"
            >
              <strong>{{ item.type }}</strong
              ><span>{{ formatDate(item.occurredAt) }}</span>
            </div>
          </div>
        </SectionCard>
      </div>

      <NModal
        v-model:show="statusModal"
        preset="card"
        title="变更资产状态"
        style="width: min(520px, 90vw)"
      >
        <NSelect
          v-model:value="statusForm.status"
          :options="
            Object.values(AssetStatus)
              .filter((status) => status !== asset?.status)
              .map((status) => ({
                label: ASSET_STATUS_META[status].label,
                value: status,
              }))
          "
        />
        <NInput
          v-model:value="statusForm.note"
          type="textarea"
          placeholder="填写状态变更备注"
          style="margin-top: 12px"
        />
        <NInputNumber
          v-if="statusForm.status === AssetStatus.SOLD"
          v-model:value="statusForm.disposalPriceYuan"
          placeholder="出售价格（元）"
          style="margin-top: 12px"
        />
        <NButton
          type="primary"
          block
          style="margin-top: 16px"
          @click="changeStatus"
          >确认变更</NButton
        >
      </NModal>

      <NModal
        v-model:show="maintenanceModal"
        preset="card"
        title="新增维修保养记录"
        style="width: min(520px, 90vw)"
      >
        <NInput
          v-model:value="maintenanceForm.maintenanceDate"
          placeholder="YYYY-MM-DD"
        />
        <NSelect
          v-model:value="maintenanceForm.type"
          :options="
            Object.values(MaintenanceType).map((type) => ({
              label: type,
              value: type,
            }))
          "
          style="margin-top: 12px"
        />
        <NInputNumber
          v-model:value="maintenanceForm.costYuan"
          placeholder="费用（元）"
          style="margin-top: 12px"
        />
        <NInput
          v-model:value="maintenanceForm.description"
          type="textarea"
          placeholder="维护内容与服务商说明"
          style="margin-top: 12px"
        />
        <NButton
          type="primary"
          block
          style="margin-top: 16px"
          @click="addMaintenance"
          ><template #icon><Wrench :size="15" /></template>保存记录</NButton
        >
      </NModal>
    </template>
  </div>
</template>
