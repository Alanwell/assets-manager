import type {
  AssetStatus,
  AttachmentType,
  DepreciationMethod,
  MaintenanceType,
} from '@asset-manager/domain';
import type { DepreciationResult } from '@asset-manager/depreciation';

export interface UserView {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserView;
}

export interface CategoryView {
  id: string;
  userId: string;
  name: string;
  icon: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface TagView {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  createdAt: string;
}

export interface AssetView {
  id: string;
  userId: string;
  categoryId: string | null;
  name: string;
  brand: string | null;
  model: string | null;
  serialNumber: string | null;
  description: string | null;
  purchaseDate: string | null;
  purchasePriceCents: number | null;
  purchaseChannel: string | null;
  invoiceNumber: string | null;
  residualValueCents: number | null;
  usefulLifeMonths: number | null;
  depreciationMethod: DepreciationMethod;
  customAnnualDepreciationRate: number | null;
  depreciationStartDate: string | null;
  currentMarketValueCents: number | null;
  currentBookValueCents?: number;
  status: AssetStatus;
  disposedAt: string | null;
  disposalPriceCents: number | null;
  disposalNote: string | null;
  location: string | null;
  ownerName: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  category?: CategoryView | null;
  tags?: TagView[];
  depreciation?: DepreciationResult;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AttachmentView {
  id: string;
  assetId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  type: AttachmentType;
  createdAt: string;
}

export interface MaintenanceView {
  id: string;
  assetId: string;
  maintenanceDate: string;
  type: MaintenanceType;
  costCents: number | null;
  description: string | null;
  serviceProvider: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileView {
  id: string;
  version: number;
  effectiveFrom: string;
  originalCostCents: number;
  residualValueCents: number;
  usefulLifeMonths: number | null;
  depreciationMethod: DepreciationMethod;
  customAnnualDepreciationRate: number | null;
}

export interface DashboardOverview {
  totalPurchaseCostCents: number;
  currentBookValueCents: number;
  accumulatedDepreciationCents: number;
  currentMarketValueCents: number;
  assetCount: number;
  currentMonthDepreciationCents: number;
}
