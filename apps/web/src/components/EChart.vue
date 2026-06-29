<script setup lang="ts">
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useResizeObserver } from '@vueuse/core';

const props = defineProps<{ option: EChartsOption }>();
const element = ref<HTMLElement>();
let chart: echarts.ECharts | undefined;
onMounted(() => {
  if (element.value) {
    chart = echarts.init(element.value);
    chart.setOption(props.option);
  }
});
watch(
  () => props.option,
  (option) => chart?.setOption(option, true),
  { deep: true },
);
useResizeObserver(element, () => chart?.resize());
onBeforeUnmount(() => chart?.dispose());
</script>
<template><div ref="element" class="chart" /></template>
