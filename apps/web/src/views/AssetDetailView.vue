<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import StatusTag from '@/components/StatusTag.vue';
import EChart from '@/components/EChart.vue';
import { resourceApi } from '@/api/resources';
import { AssetStatus, MaintenanceType } from '@asset-manager/domain';
import {
  formatDate,
  formatMoney,
  ASSET_STATUS_META,
} from '@asset-manager/shared';
import type {
  AssetView,
  AttachmentView,
  MaintenanceView,
  ProfileView,
} from '@/types/api';
import {
  NButton,
  NCard,
  NDataTable,
  NDescriptions,
  NDescriptionsItem,
  NEmpty,
  NGrid,
  NGridItem,
  NModal,
  NSelect,
  NInput,
  NInputNumber,
  NSpace,
  NTag,
  NTimeline,
  NTimelineItem,
  useDialog,
  useMessage,
} from 'naive-ui';
import { computed, onMounted, reactive, ref } from 'vue';
import type { EChartsOption } from 'echarts';
import { useRoute, useRouter } from 'vue-router';
const route = useRoute();
const router = useRouter();
const dialog = useDialog();
const message = useMessage();
const id = String(route.params.id);
const asset = ref<AssetView>();
const timeline = ref<
  Array<{ type: string; occurredAt: string; data: unknown }>
>([]);
const maintenance = ref<MaintenanceView[]>([]);
const attachments = ref<AttachmentView[]>([]);
const profiles = ref<ProfileView[]>([]);
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
async function load() {
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
}
onMounted(() => void load());
const trendOption = computed<EChartsOption>(() => ({
  tooltip: { trigger: 'axis' },
  xAxis: {
    type: 'category',
    data: asset.value?.depreciation?.schedule.map((v) => v.month) ?? [],
  },
  yAxis: { type: 'value' },
  series: [
    {
      type: 'line',
      data:
        asset.value?.depreciation?.schedule.map(
          (v) => v.closingBookValueCents / 100,
        ) ?? [],
    },
  ],
}));
async function changeStatus() {
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
async function addMaintenance() {
  await resourceApi.createMaintenance(id, {
    maintenanceDate: maintenanceForm.maintenanceDate,
    type: maintenanceForm.type,
    costCents:
      maintenanceForm.costYuan === null
        ? undefined
        : Math.round(maintenanceForm.costYuan * 100),
    description: maintenanceForm.description || undefined,
  });
  maintenanceModal.value = false;
  await load();
}
function archive() {
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
  <div v-if="asset">
    <PageHeader
      :title="asset.name"
      :description="
        [asset.brand, asset.model].filter(Boolean).join(' · ') || '资产详情'
      "
      ><NSpace
        ><NButton @click="router.push(`/assets/${id}/edit`)">编辑</NButton
        ><NButton @click="statusModal = true">变更状态</NButton
        ><NButton v-if="asset.status !== AssetStatus.ARCHIVED" @click="archive"
          >归档</NButton
        ><NButton v-else @click="resourceApi.restoreAsset(id).then(load)"
          >恢复</NButton
        ></NSpace
      ></PageHeader
    ><NGrid :cols="'1 m:3'" responsive="screen" :x-gap="16" :y-gap="16"
      ><NGridItem
        ><NCard
          ><div class="metric-label">当前账面价值</div>
          <div class="metric-value">
            {{ formatMoney(asset.depreciation?.currentBookValueCents) }}
          </div></NCard
        ></NGridItem
      ><NGridItem
        ><NCard
          ><div class="metric-label">累计折旧</div>
          <div class="metric-value">
            {{ formatMoney(asset.depreciation?.accumulatedDepreciationCents) }}
          </div></NCard
        ></NGridItem
      ><NGridItem
        ><NCard
          ><div class="metric-label">当前状态</div>
          <div class="metric-value">
            <StatusTag :status="asset.status" /></div></NCard></NGridItem
    ></NGrid>
    <div class="detail-grid">
      <NCard title="基本资料"
        ><NDescriptions label-placement="left" :column="2"
          ><NDescriptionsItem label="分类">{{
            asset.category?.name ?? '未分类'
          }}</NDescriptionsItem
          ><NDescriptionsItem label="购买日期">{{
            formatDate(asset.purchaseDate)
          }}</NDescriptionsItem
          ><NDescriptionsItem label="购置成本">{{
            formatMoney(asset.purchasePriceCents)
          }}</NDescriptionsItem
          ><NDescriptionsItem label="市场估值">{{
            formatMoney(asset.currentMarketValueCents)
          }}</NDescriptionsItem
          ><NDescriptionsItem label="位置">{{
            asset.location ?? '—'
          }}</NDescriptionsItem
          ><NDescriptionsItem label="归属">{{
            asset.ownerName ?? '—'
          }}</NDescriptionsItem></NDescriptions
        ><NSpace style="margin-top: 12px"
          ><NTag v-for="tag in asset.tags" :key="tag.id">{{
            tag.name
          }}</NTag></NSpace
        ></NCard
      ><NCard title="账面价值趋势"><EChart :option="trendOption" /></NCard
      ><NCard title="折旧计划"
        ><NDataTable
          :columns="[
            { title: '月份', key: 'month' },
            {
              title: '折旧',
              key: 'depreciationCents',
              render: (r) => formatMoney(r.depreciationCents),
            },
            {
              title: '期末价值',
              key: 'closingBookValueCents',
              render: (r) => formatMoney(r.closingBookValueCents),
            },
          ]"
          :data="asset.depreciation?.schedule ?? []"
          :max-height="320" /></NCard
      ><NCard title="维修保养"
        ><template #header-extra
          ><NButton text type="primary" @click="maintenanceModal = true"
            >新增</NButton
          ></template
        ><NEmpty v-if="!maintenance.length" /><NDataTable
          v-else
          :columns="[
            { title: '日期', key: 'maintenanceDate' },
            { title: '类型', key: 'type' },
            {
              title: '费用',
              key: 'costCents',
              render: (r) => formatMoney(r.costCents),
            },
          ]"
          :data="maintenance" /></NCard
      ><NCard title="附件"
        ><NEmpty v-if="!attachments.length" />
        <div v-for="item in attachments" :key="item.id" class="file-row">
          <span>{{ item.fileName }}</span
          ><NButton
            text
            type="error"
            @click="resourceApi.deleteAttachment(id, item.id).then(load)"
            >删除</NButton
          >
        </div></NCard
      ><NCard title="生命周期时间线"
        ><NTimeline
          ><NTimelineItem
            v-for="item in timeline"
            :key="`${item.type}-${item.occurredAt}`"
            :title="item.type"
            :time="formatDate(item.occurredAt)" /></NTimeline
      ></NCard>
    </div>
    <NModal
      v-model:show="statusModal"
      preset="card"
      title="变更资产状态"
      style="width: min(520px, 90vw)"
      ><NSelect
        v-model:value="statusForm.status"
        :options="
          Object.values(AssetStatus)
            .filter((v) => v !== asset?.status)
            .map((v) => ({ label: ASSET_STATUS_META[v].label, value: v }))
        "
      /><NInput
        v-model:value="statusForm.note"
        type="textarea"
        placeholder="备注"
        style="margin-top: 12px"
      /><NInputNumber
        v-if="statusForm.status === AssetStatus.SOLD"
        v-model:value="statusForm.disposalPriceYuan"
        placeholder="出售价格（元）"
        style="margin-top: 12px"
      /><NButton
        type="primary"
        block
        style="margin-top: 16px"
        @click="changeStatus"
        >确认</NButton
      ></NModal
    ><NModal
      v-model:show="maintenanceModal"
      preset="card"
      title="新增维修保养记录"
      style="width: min(520px, 90vw)"
      ><NInput
        v-model:value="maintenanceForm.maintenanceDate"
        placeholder="YYYY-MM-DD"
      /><NSelect
        v-model:value="maintenanceForm.type"
        :options="
          Object.values(MaintenanceType).map((v) => ({ label: v, value: v }))
        "
        style="margin-top: 12px"
      /><NInputNumber
        v-model:value="maintenanceForm.costYuan"
        placeholder="费用（元）"
        style="margin-top: 12px"
      /><NInput
        v-model:value="maintenanceForm.description"
        type="textarea"
        placeholder="说明"
        style="margin-top: 12px"
      /><NButton
        type="primary"
        block
        style="margin-top: 16px"
        @click="addMaintenance"
        >保存</NButton
      ></NModal
    >
  </div>
</template>
