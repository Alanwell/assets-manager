<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import { resourceApi } from '@/api/resources';
import { DepreciationMethod } from '@asset-manager/domain';
import {
  calculateDepreciation,
  type DepreciationResult,
} from '@asset-manager/depreciation';
import { formatMoney } from '@asset-manager/shared';
import {
  NAlert,
  NButton,
  NCard,
  NDatePicker,
  NForm,
  NFormItem,
  NGrid,
  NGridItem,
  NInput,
  NInputNumber,
  NSelect,
  NSpace,
  NTable,
  useMessage,
} from 'naive-ui';
import { computed, onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { CategoryView, TagView } from '@/types/api';
const route = useRoute();
const router = useRouter();
const message = useMessage();
const id = typeof route.params.id === 'string' ? route.params.id : undefined;
const editing = Boolean(id);
const saving = ref(false);
const categories = ref<CategoryView[]>([]);
const tags = ref<TagView[]>([]);
const file = ref<File>();
const form = reactive({
  name: '',
  categoryId: null as string | null,
  brand: '',
  model: '',
  serialNumber: '',
  description: '',
  purchaseDate: null as string | null,
  purchasePriceYuan: null as number | null,
  purchaseChannel: '',
  residualValueYuan: 0 as number | null,
  usefulLifeMonths: 36 as number | null,
  depreciationMethod: DepreciationMethod.STRAIGHT_LINE,
  customAnnualDepreciationRate: null as number | null,
  customScheduleText: '',
  depreciationStartDate: null as string | null,
  currentMarketValueYuan: null as number | null,
  location: '',
  ownerName: '',
  tagIds: [] as string[],
});
const methodLabels: Record<DepreciationMethod, string> = {
  NONE: '不折旧',
  STRAIGHT_LINE: '直线法',
  DOUBLE_DECLINING: '双倍余额递减法',
  CUSTOM_ANNUAL_RATE: '自定义年折旧率',
  CUSTOM_SCHEDULE: '自定义月度计划',
};
const methodOptions = Object.values(DepreciationMethod).map((value) => ({
  value,
  label: methodLabels[value],
}));
const preview = computed<DepreciationResult | null>(() => {
  if (!form.purchasePriceYuan || !form.depreciationStartDate) return null;
  try {
    return calculateDepreciation({
      originalCostCents: Math.round(form.purchasePriceYuan * 100),
      residualValueCents: Math.round((form.residualValueYuan ?? 0) * 100),
      startDate: form.depreciationStartDate,
      asOfDate: new Date().toISOString().slice(0, 10),
      method: form.depreciationMethod,
      ...(form.usefulLifeMonths
        ? { usefulLifeMonths: form.usefulLifeMonths }
        : {}),
      ...(form.customAnnualDepreciationRate
        ? { customAnnualDepreciationRate: form.customAnnualDepreciationRate }
        : {}),
      ...(form.depreciationMethod === DepreciationMethod.CUSTOM_SCHEDULE
        ? { customSchedule: parseCustomSchedule() }
        : {}),
    });
  } catch {
    return null;
  }
});
onMounted(async () => {
  [categories.value, tags.value] = await Promise.all([
    resourceApi.categories(),
    resourceApi.tags(),
  ]);
  if (id) {
    const a = await resourceApi.asset(id);
    Object.assign(form, {
      name: a.name,
      categoryId: a.categoryId,
      brand: a.brand ?? '',
      model: a.model ?? '',
      serialNumber: a.serialNumber ?? '',
      description: a.description ?? '',
      purchaseDate: a.purchaseDate,
      purchasePriceYuan:
        a.purchasePriceCents === null ? null : a.purchasePriceCents / 100,
      purchaseChannel: a.purchaseChannel ?? '',
      residualValueYuan:
        a.residualValueCents === null ? 0 : a.residualValueCents / 100,
      usefulLifeMonths: a.usefulLifeMonths,
      depreciationMethod: a.depreciationMethod,
      customAnnualDepreciationRate: a.customAnnualDepreciationRate,
      depreciationStartDate: a.depreciationStartDate,
      currentMarketValueYuan:
        a.currentMarketValueCents === null
          ? null
          : a.currentMarketValueCents / 100,
      location: a.location ?? '',
      ownerName: a.ownerName ?? '',
      tagIds: a.tags?.map((t) => t.id) ?? [],
    });
  }
});
async function submit(): Promise<void> {
  if (!form.name.trim()) {
    message.warning('请输入资产名称');
    return;
  }
  saving.value = true;
  try {
    const base = {
      name: form.name,
      categoryId: form.categoryId ?? undefined,
      brand: form.brand || undefined,
      model: form.model || undefined,
      serialNumber: form.serialNumber || undefined,
      description: form.description || undefined,
      purchaseDate: form.purchaseDate ?? undefined,
      purchaseChannel: form.purchaseChannel || undefined,
      currentMarketValueCents:
        form.currentMarketValueYuan === null
          ? undefined
          : Math.round(form.currentMarketValueYuan * 100),
      location: form.location || undefined,
      ownerName: form.ownerName || undefined,
      tagIds: form.tagIds,
    };
    let asset;
    if (id) asset = await resourceApi.updateAsset(id, base);
    else
      asset = await resourceApi.createAsset({
        ...base,
        purchasePriceCents:
          form.purchasePriceYuan === null
            ? undefined
            : Math.round(form.purchasePriceYuan * 100),
        residualValueCents: Math.round((form.residualValueYuan ?? 0) * 100),
        usefulLifeMonths: form.usefulLifeMonths ?? undefined,
        depreciationMethod: form.depreciationMethod,
        customAnnualDepreciationRate:
          form.customAnnualDepreciationRate ?? undefined,
        ...(form.depreciationMethod === DepreciationMethod.CUSTOM_SCHEDULE
          ? { customSchedule: parseCustomSchedule() }
          : {}),
        depreciationStartDate:
          form.depreciationStartDate ?? form.purchaseDate ?? undefined,
      });
    if (file.value) {
      const data = new FormData();
      data.append('type', 'IMAGE');
      data.append('file', file.value);
      await resourceApi.uploadAttachment(asset.id, data);
    }
    message.success(editing ? '资产已更新' : '资产已创建');
    await router.replace(`/assets/${asset.id}`);
  } catch (error) {
    message.error(error instanceof Error ? error.message : '保存失败');
  } finally {
    saving.value = false;
  }
}
function parseCustomSchedule(): Array<{
  month: string;
  depreciationCents: number;
}> {
  return form.customScheduleText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [month = '', amount = '0'] = line.split(/[,，\s]+/);
      return { month, depreciationCents: Math.round(Number(amount) * 100) };
    });
}
</script>
<template>
  <div>
    <PageHeader
      :title="editing ? '编辑资产' : '新增资产'"
      description="金额以元录入，系统统一按分存储。"
    /><NAlert v-if="editing" type="info" style="margin-bottom: 16px"
      >折旧规则请在资产详情中新增规则快照，以保留历史。</NAlert
    ><NForm label-placement="top"
      ><NGrid :cols="'1 l:2'" responsive="screen" :x-gap="16"
        ><NGridItem
          ><NCard title="基本信息"
            ><NFormItem label="名称" required
              ><NInput v-model:value="form.name" /></NFormItem
            ><NFormItem label="分类"
              ><NSelect
                v-model:value="form.categoryId"
                clearable
                :options="
                  categories.map((v) => ({ label: v.name, value: v.id }))
                " /></NFormItem
            ><NGrid :cols="2" :x-gap="12"
              ><NGridItem
                ><NFormItem label="品牌"
                  ><NInput v-model:value="form.brand" /></NFormItem></NGridItem
              ><NGridItem
                ><NFormItem label="型号"
                  ><NInput
                    v-model:value="form.model" /></NFormItem></NGridItem></NGrid
            ><NFormItem label="序列号"
              ><NInput v-model:value="form.serialNumber" /></NFormItem
            ><NFormItem label="描述"
              ><NInput
                v-model:value="form.description"
                type="textarea" /></NFormItem
            ><NFormItem label="标签"
              ><NSelect
                v-model:value="form.tagIds"
                multiple
                :options="
                  tags.map((v) => ({ label: v.name, value: v.id }))
                " /></NFormItem></NCard
          ><NCard title="位置与附件" style="margin-top: 16px"
            ><NFormItem label="位置"
              ><NInput v-model:value="form.location" /></NFormItem
            ><NFormItem label="归属人"
              ><NInput v-model:value="form.ownerName" /></NFormItem
            ><NFormItem label="附件"
              ><input
                type="file"
                @change="
                  file = ($event.target as HTMLInputElement).files?.[0]
                " /></NFormItem></NCard></NGridItem
        ><NGridItem
          ><NCard title="购置与估值"
            ><NFormItem label="购买日期"
              ><NDatePicker
                v-model:formatted-value="form.purchaseDate"
                value-format="yyyy-MM-dd"
                type="date"
                clearable /></NFormItem
            ><NFormItem label="购置价格（元）"
              ><NInputNumber
                v-model:value="form.purchasePriceYuan"
                :min="0" /></NFormItem
            ><NFormItem label="购买渠道"
              ><NInput v-model:value="form.purchaseChannel" /></NFormItem
            ><NFormItem label="当前市场估值（元）"
              ><NInputNumber
                v-model:value="form.currentMarketValueYuan"
                :min="0" /></NFormItem></NCard
          ><NCard title="折旧设置" style="margin-top: 16px"
            ><NFormItem label="折旧方式"
              ><NSelect
                v-model:value="form.depreciationMethod"
                :disabled="editing"
                :options="methodOptions" /></NFormItem
            ><template
              v-if="form.depreciationMethod !== DepreciationMethod.NONE"
              ><NFormItem label="残值（元）"
                ><NInputNumber
                  v-model:value="form.residualValueYuan"
                  :disabled="editing"
                  :min="0" /></NFormItem
              ><NFormItem
                v-if="
                  [
                    DepreciationMethod.STRAIGHT_LINE,
                    DepreciationMethod.DOUBLE_DECLINING,
                  ].includes(form.depreciationMethod)
                "
                label="使用年限（月）"
                ><NInputNumber
                  v-model:value="form.usefulLifeMonths"
                  :disabled="editing"
                  :min="1" /></NFormItem
              ><NFormItem
                v-else-if="
                  form.depreciationMethod ===
                  DepreciationMethod.CUSTOM_ANNUAL_RATE
                "
                label="年折旧率（%）"
                ><NInputNumber
                  v-model:value="form.customAnnualDepreciationRate"
                  :disabled="editing"
                  :min="0"
                  :max="100" /></NFormItem
              ><NFormItem v-else label="月度计划"
                ><NInput
                  v-model:value="form.customScheduleText"
                  type="textarea"
                  :rows="5"
                  placeholder="每行：YYYY-MM 金额（元）&#10;例如：2026-07 500.00" /></NFormItem
              ><NFormItem label="起算日"
                ><NDatePicker
                  v-model:formatted-value="form.depreciationStartDate"
                  :disabled="editing"
                  value-format="yyyy-MM-dd"
                  type="date" /></NFormItem
            ></template>
            <div v-if="preview" class="preview">
              <strong
                >预计当前账面价值：{{
                  formatMoney(preview.currentBookValueCents)
                }}</strong
              ><NTable size="small"
                ><thead>
                  <tr>
                    <th>月份</th>
                    <th>折旧</th>
                    <th>期末价值</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="row in preview.schedule.slice(-6)"
                    :key="row.month"
                  >
                    <td>{{ row.month }}</td>
                    <td>{{ formatMoney(row.depreciationCents) }}</td>
                    <td>{{ formatMoney(row.closingBookValueCents) }}</td>
                  </tr>
                </tbody></NTable
              >
            </div></NCard
          ></NGridItem
        ></NGrid
      ><NSpace justify="end" style="margin-top: 16px"
        ><NButton @click="router.back()">取消</NButton
        ><NButton type="primary" :loading="saving" @click="submit"
          >保存</NButton
        ></NSpace
      ></NForm
    >
  </div>
</template>
