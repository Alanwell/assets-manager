import {
  Bike,
  BookOpen,
  Briefcase,
  Building2,
  Camera,
  Car,
  Cpu,
  Dumbbell,
  Gamepad2,
  Gem,
  Headphones,
  HousePlug,
  Laptop,
  Monitor,
  Package,
  Plane,
  Printer,
  Refrigerator,
  Shapes,
  Shirt,
  Ship,
  Smartphone,
  Sofa,
  Tablet,
  TentTree,
  Tv,
  WalletCards,
  Watch,
  Wrench,
} from '@lucide/vue';
import type { Component } from 'vue';

export interface CategoryIconOption {
  value: string;
  label: string;
  component: Component;
}

export const CATEGORY_ICON_OPTIONS: CategoryIconOption[] = [
  { value: 'smartphone', label: '手机', component: Smartphone },
  { value: 'laptop', label: '笔记本电脑', component: Laptop },
  { value: 'monitor', label: '台式电脑 / 显示器', component: Monitor },
  { value: 'tablet', label: '平板设备', component: Tablet },
  { value: 'cpu', label: '电脑配件', component: Cpu },
  { value: 'house-plug', label: '家具家电', component: HousePlug },
  { value: 'sofa', label: '家具', component: Sofa },
  { value: 'refrigerator', label: '家用电器', component: Refrigerator },
  { value: 'tv', label: '影音设备', component: Tv },
  { value: 'camera', label: '摄影器材', component: Camera },
  { value: 'headphones', label: '音频设备', component: Headphones },
  { value: 'gamepad-2', label: '游戏设备', component: Gamepad2 },
  { value: 'building-2', label: '房产', component: Building2 },
  { value: 'car', label: '汽车', component: Car },
  { value: 'bike', label: '自行车', component: Bike },
  { value: 'plane', label: '航空出行', component: Plane },
  { value: 'ship', label: '船舶', component: Ship },
  { value: 'gem', label: '收藏品', component: Gem },
  { value: 'watch', label: '腕表首饰', component: Watch },
  { value: 'shirt', label: '服饰箱包', component: Shirt },
  { value: 'tent-tree', label: '户外装备', component: TentTree },
  { value: 'dumbbell', label: '运动器材', component: Dumbbell },
  { value: 'wrench', label: '工具设备', component: Wrench },
  { value: 'printer', label: '办公设备', component: Printer },
  { value: 'briefcase', label: '办公用品', component: Briefcase },
  { value: 'book-open', label: '书籍资料', component: BookOpen },
  { value: 'wallet-cards', label: '金融资产', component: WalletCards },
  { value: 'package', label: '其他', component: Package },
];

const categoryIconMap = Object.fromEntries(
  CATEGORY_ICON_OPTIONS.map((option) => [option.value, option]),
) as Record<string, CategoryIconOption>;

export function getCategoryIcon(value: string | null | undefined): Component {
  return (value && categoryIconMap[value]?.component) || Shapes;
}

export function getCategoryIconLabel(value: string | null | undefined): string {
  return (value && categoryIconMap[value]?.label) || value || '未设置';
}

export function hasCategoryIcon(value: string): boolean {
  return value in categoryIconMap;
}
