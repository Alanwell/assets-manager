<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import { resourceApi } from '@/api/resources';
import {
  CATEGORY_ICON_OPTIONS,
  getCategoryIcon,
  getCategoryIconLabel,
  hasCategoryIcon,
} from '@/config/category-icons';
import type { CategoryView } from '@/types/api';
import { ArrowDown, ArrowUp } from '@lucide/vue';
import {
  NButton,
  NCard,
  NDataTable,
  NInput,
  NModal,
  NSelect,
  NSpace,
  type SelectOption,
  useDialog,
  useMessage,
} from 'naive-ui';
import { computed, h, onMounted, reactive, ref, type VNodeChild } from 'vue';
const rows = ref<CategoryView[]>([]);
const loading = ref(false);
const saving = ref(false);
const pagination = { pageSize: 10 };
const show = ref(false);
const editing = ref<CategoryView>();
const message = useMessage();
const dialog = useDialog();
const form = reactive({ name: '', icon: 'package', sortOrder: 0 });
const iconOptions = computed<SelectOption[]>(() => {
  const options = CATEGORY_ICON_OPTIONS.map(({ label, value }) => ({
    label,
    value,
  }));
  return form.icon && !hasCategoryIcon(form.icon)
    ? [{ label: `现有自定义标识：${form.icon}`, value: form.icon }, ...options]
    : options;
});
async function load() {
  loading.value = true;
  try {
    rows.value = await resourceApi.categories();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '分类加载失败');
  } finally {
    loading.value = false;
  }
}
onMounted(() => void load());
function open(row?: CategoryView) {
  editing.value = row;
  Object.assign(form, {
    name: row?.name ?? '',
    icon: row ? (row.icon ?? '') : 'package',
    sortOrder:
      row?.sortOrder ??
      Math.max(-1, ...rows.value.map((category) => category.sortOrder)) + 1,
  });
  show.value = true;
}
async function move(row: CategoryView, offset: -1 | 1): Promise<void> {
  const currentIndex = rows.value.findIndex(
    (category) => category.id === row.id,
  );
  const targetIndex = currentIndex + offset;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= rows.value.length)
    return;
  const ordered = [...rows.value];
  [ordered[currentIndex], ordered[targetIndex]] = [
    ordered[targetIndex]!,
    ordered[currentIndex]!,
  ];
  rows.value = ordered.map((category, index) => ({
    ...category,
    sortOrder: index,
  }));
  try {
    await Promise.all(
      rows.value.map((category) =>
        resourceApi.updateCategory(category.id, {
          sortOrder: category.sortOrder,
        }),
      ),
    );
  } catch (error) {
    message.error(error instanceof Error ? error.message : '排序更新失败');
    await load();
  }
}
async function save() {
  if (saving.value) return;
  const payload = {
    name: form.name,
    sortOrder: form.sortOrder,
    ...(form.icon ? { icon: form.icon } : {}),
  };
  saving.value = true;
  try {
    if (editing.value)
      await resourceApi.updateCategory(editing.value.id, payload);
    else await resourceApi.createCategory(payload);
    show.value = false;
    message.success('已保存');
    await load();
  } catch (error) {
    message.error(error instanceof Error ? error.message : '分类保存失败');
  } finally {
    saving.value = false;
  }
}
function remove(row: CategoryView) {
  dialog.warning({
    title: '删除分类',
    content: '有关联资产时系统会阻止删除。确认继续？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await resourceApi.deleteCategory(row.id);
        await load();
      } catch (e) {
        message.error(e instanceof Error ? e.message : '删除失败');
      }
    },
  });
}
const columns = [
  { title: '名称', key: 'name' },
  {
    title: '图标',
    key: 'icon',
    render: (row: CategoryView) =>
      h('span', { class: 'category-icon-cell' }, [
        h(getCategoryIcon(row.icon), { size: 16 }),
        h('span', getCategoryIconLabel(row.icon)),
      ]),
  },
  {
    title: '显示顺序',
    key: 'sortOrder',
    width: 120,
    render: (row: CategoryView) => {
      const index = rows.value.findIndex((category) => category.id === row.id);
      return h(NSpace, { size: 4 }, () => [
        h(
          NButton,
          {
            quaternary: true,
            circle: true,
            size: 'small',
            title: '上移',
            disabled: index <= 0,
            onClick: () => move(row, -1),
          },
          { icon: () => h(ArrowUp, { size: 15 }) },
        ),
        h(
          NButton,
          {
            quaternary: true,
            circle: true,
            size: 'small',
            title: '下移',
            disabled: index < 0 || index >= rows.value.length - 1,
            onClick: () => move(row, 1),
          },
          { icon: () => h(ArrowDown, { size: 15 }) },
        ),
      ]);
    },
  },
  {
    title: '操作',
    key: 'actions',
    render: (r: CategoryView) =>
      h(NSpace, null, () => [
        h(NButton, { text: true, onClick: () => open(r) }, () => '编辑'),
        h(
          NButton,
          { text: true, type: 'error', onClick: () => remove(r) },
          () => '删除',
        ),
      ]),
  },
];

function renderIconLabel(option: SelectOption): VNodeChild {
  const value = String(option.value ?? '');
  return h('span', { class: 'category-icon-option' }, [
    h(getCategoryIcon(value), { size: 17 }),
    h('span', String(option.label ?? value)),
  ]);
}
</script>
<template>
  <div>
    <PageHeader title="分类管理" description="建立清晰、稳定的资产分类体系。"
      ><NButton type="primary" :disabled="loading" @click="open()"
        >新增分类</NButton
      ></PageHeader
    ><NCard
      ><NDataTable
        :columns="columns"
        :data="rows"
        :loading="loading"
        :pagination="pagination" /></NCard
    ><NModal
      v-model:show="show"
      preset="card"
      :title="editing ? '编辑分类' : '新增分类'"
      style="width: min(480px, 90vw)"
      ><NInput v-model:value="form.name" placeholder="分类名称" /><NSelect
        v-model:value="form.icon"
        :options="iconOptions"
        :render-label="renderIconLabel"
        filterable
        placeholder="选择分类图标"
        style="margin-top: 12px"
      /><NButton
        block
        type="primary"
        style="margin-top: 16px"
        :loading="saving"
        :disabled="saving"
        @click="save"
        >保存</NButton
      ></NModal
    >
  </div>
</template>
