<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import { resourceApi } from '@/api/resources';
import type { CategoryView } from '@/types/api';
import {
  NButton,
  NCard,
  NDataTable,
  NInput,
  NInputNumber,
  NModal,
  NSpace,
  useDialog,
  useMessage,
} from 'naive-ui';
import { h, onMounted, reactive, ref } from 'vue';
const rows = ref<CategoryView[]>([]);
const show = ref(false);
const editing = ref<CategoryView>();
const message = useMessage();
const dialog = useDialog();
const form = reactive({ name: '', icon: '', sortOrder: 0 });
async function load() {
  rows.value = await resourceApi.categories();
}
onMounted(() => void load());
function open(row?: CategoryView) {
  editing.value = row;
  Object.assign(form, {
    name: row?.name ?? '',
    icon: row?.icon ?? '',
    sortOrder: row?.sortOrder ?? 0,
  });
  show.value = true;
}
async function save() {
  if (editing.value) await resourceApi.updateCategory(editing.value.id, form);
  else await resourceApi.createCategory(form);
  show.value = false;
  message.success('已保存');
  await load();
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
  { title: '图标', key: 'icon' },
  { title: '排序', key: 'sortOrder' },
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
</script>
<template>
  <div>
    <PageHeader title="分类管理" description="建立清晰、稳定的资产分类体系。"
      ><NButton type="primary" @click="open()">新增分类</NButton></PageHeader
    ><NCard><NDataTable :columns="columns" :data="rows" /></NCard
    ><NModal
      v-model:show="show"
      preset="card"
      :title="editing ? '编辑分类' : '新增分类'"
      style="width: min(480px, 90vw)"
      ><NInput v-model:value="form.name" placeholder="分类名称" /><NInput
        v-model:value="form.icon"
        placeholder="图标标识"
        style="margin-top: 12px"
      /><NInputNumber
        v-model:value="form.sortOrder"
        placeholder="排序"
        style="margin-top: 12px"
      /><NButton block type="primary" style="margin-top: 16px" @click="save"
        >保存</NButton
      ></NModal
    >
  </div>
</template>
