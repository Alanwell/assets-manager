import type { EChartsOption } from 'echarts';

export const chartColors: [string, string, string, string, string] = [
  '#ad8752',
  '#567565',
  '#788b91',
  '#c79b89',
  '#8d7c68',
];

export function baseChartOption(dark: boolean): EChartsOption {
  const text = dark ? '#aaa9a1' : '#73766f';
  const border = dark ? 'rgba(255,255,255,.08)' : 'rgba(40,42,38,.08)';
  return {
    color: chartColors,
    animationDuration: 700,
    animationEasing: 'cubicOut',
    textStyle: { color: text, fontFamily: 'Inter, PingFang SC, sans-serif' },
    tooltip: {
      backgroundColor: dark ? '#262925' : '#fffefa',
      borderColor: border,
      borderWidth: 1,
      padding: [10, 12],
      textStyle: { color: dark ? '#f1efe8' : '#20221f', fontSize: 12 },
      extraCssText:
        'border-radius:12px;box-shadow:0 12px 35px rgba(30,25,18,.12)',
    },
    grid: { left: 12, right: 16, top: 24, bottom: 8, containLabel: true },
  };
}

export function axisStyle(dark: boolean) {
  const text = dark ? '#777a73' : '#9a9d96';
  const line = dark ? 'rgba(255,255,255,.07)' : 'rgba(40,42,38,.07)';
  return {
    axisLine: { show: false },
    axisTick: { show: false },
    axisLabel: { color: text, fontSize: 11 },
    splitLine: { lineStyle: { color: line, type: 'dashed' as const } },
  };
}
