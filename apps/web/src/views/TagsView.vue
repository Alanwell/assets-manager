<script setup lang="ts">
import PageHeader from '@/components/PageHeader.vue';
import { resourceApi } from '@/api/resources';
import type { TagView } from '@/types/api';
import {
  NButton,
  NCard,
  NColorPicker,
  NDataTable,
  NInput,
  NModal,
  NSpace,
  NTag,
  useDialog,
  useMessage,
} from 'naive-ui';
import { h, onMounted, reactive, ref } from 'vue';
const rows = ref<TagView[]>([]);
const show = ref(false);
const editing = ref<TagView>();
const form = reactive({ name: '', color: '#3b82f6' });
const dialog = useDialog();
const message = useMessage();
async function load() {
  rows.value = await resourceApi.tags();
}
onMounted(() => void load());
function open(row?: TagView) {
  editing.value = row;
  form.name = row?.name ?? '';
  form.color = row?.color ?? '#3b82f6';
  show.value = true;
}
async function save() {
  if (editing.value) await resourceApi.updateTag(editing.value.id, form);
  else await resourceApi.createTag(form);
  show.value = false;
  await load();
}
function remove(row: TagView) {
  dialog.warning({
    title: '删除标签',
    content: '有关联资产时系统会阻止删除。',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await resourceApi.deleteTag(row.id);
        await load();
      } catch (e) {
        message.error(e instanceof Error ? e.message : '删除失败');
      }
    },
  });
}
const columns = [
  {
    title: '标签',
    key: 'name',
    render: (r: TagView) =>
      h(
        NTag,
        {
          ...(r.color
            ? {
                color: {
                  color: r.color,
                  textColor: '#fff',
                  borderColor: r.color,
                },
              }
            : {}),
        },
        () => r.name,
      ),
  },
  { title: '颜色', key: 'color' },
  {
    title: '操作',
    key: 'actions',
    render: (r: TagView) =>
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
    <PageHeader title="标签管理" description="用颜色和标签建立灵活的资产视角。"
      ><NButton type="primary" @click="open()">新增标签</NButton></PageHeader
    ><NCard><NDataTable :columns="columns" :data="rows" /></NCard
    ><NModal
      v-model:show="show"
      preset="card"
      :title="editing ? '编辑标签' : '新增标签'"
      style="width: min(480px, 90vw)"
      ><NInput v-model:value="form.name" placeholder="标签名称" /><NColorPicker
        v-model:value="form.color"
        style="margin-top: 12px"
      /><NButton block type="primary" style="margin-top: 16px" @click="save"
        >保存</NButton
      ></NModal
    >
  </div>
</template>
