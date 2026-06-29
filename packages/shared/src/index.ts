import { AssetStatus } from '@asset-manager/domain';

export function formatMoney(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return '—';
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
  }).format(cents / 100);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export const ASSET_STATUS_META: Record<
  AssetStatus,
  { label: string; type: 'default' | 'success' | 'warning' | 'error' | 'info' }
> = {
  [AssetStatus.IN_USE]: { label: '使用中', type: 'success' },
  [AssetStatus.IDLE]: { label: '闲置', type: 'warning' },
  [AssetStatus.SOLD]: { label: '已出售', type: 'info' },
  [AssetStatus.SCRAPPED]: { label: '已报废', type: 'error' },
  [AssetStatus.LOST]: { label: '已丢失', type: 'error' },
  [AssetStatus.ARCHIVED]: { label: '已归档', type: 'default' },
};
