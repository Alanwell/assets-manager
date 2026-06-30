import { randomUUID } from 'node:crypto';

export const DEFAULT_ASSET_CATEGORIES = [
  { name: '手机', icon: 'smartphone' },
  { name: '电脑', icon: 'laptop' },
  { name: '平板', icon: 'tablet' },
  { name: '家具家电', icon: 'house-plug' },
  { name: '摄影器材', icon: 'camera' },
  { name: '房产', icon: 'building-2' },
  { name: '车辆', icon: 'car' },
  { name: '收藏品', icon: 'gem' },
  { name: '运动户外', icon: 'tent-tree' },
  { name: '工具设备', icon: 'wrench' },
  { name: '其他', icon: 'package' },
] as const;

export const DEFAULT_ASSET_TAGS = [
  { name: '重要', color: '#B8675C' },
  { name: '常用', color: '#AD8752' },
  { name: '保修中', color: '#507563' },
  { name: '待维护', color: '#A8793E' },
  { name: '收藏', color: '#788B91' },
  { name: '投资', color: '#806B91' },
] as const;

export function createDefaultCategoryRows(
  userId: string,
  timestamp = new Date().toISOString(),
) {
  return DEFAULT_ASSET_CATEGORIES.map((category, index) => ({
    id: randomUUID(),
    userId,
    name: category.name,
    icon: category.icon,
    sortOrder: index,
    createdAt: timestamp,
    updatedAt: timestamp,
  }));
}

export function createDefaultTagRows(
  userId: string,
  timestamp = new Date().toISOString(),
) {
  return DEFAULT_ASSET_TAGS.map((tag) => ({
    id: randomUUID(),
    userId,
    name: tag.name,
    color: tag.color,
    createdAt: timestamp,
  }));
}
