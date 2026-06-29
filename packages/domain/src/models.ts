import type {
  AssetStatus,
  AttachmentType,
  DepreciationMethod,
  MaintenanceType,
} from './enums.js';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetCategory {
  id: string;
  userId: string;
  name: string;
  icon?: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AssetTag {
  id: string;
  userId: string;
  name: string;
  color?: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  userId: string;
  categoryId?: string;
  name: string;
  brand?: string;
  model?: string;
  serialNumber?: string;
  description?: string;
  purchaseDate?: string;
  purchasePriceCents?: number;
  purchaseChannel?: string;
  invoiceNumber?: string;
  residualValueCents?: number;
  usefulLifeMonths?: number;
  depreciationMethod: DepreciationMethod;
  customAnnualDepreciationRate?: number;
  depreciationStartDate?: string;
  currentMarketValueCents?: number;
  status: AssetStatus;
  disposedAt?: string;
  disposalPriceCents?: number;
  disposalNote?: string;
  location?: string;
  ownerName?: string;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export interface AssetAttachment {
  id: string;
  userId: string;
  assetId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  storagePath: string;
  url?: string;
  type: AttachmentType;
  createdAt: string;
}

export interface AssetMaintenanceRecord {
  id: string;
  assetId: string;
  userId: string;
  maintenanceDate: string;
  type: MaintenanceType;
  costCents?: number;
  description?: string;
  serviceProvider?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssetDepreciationProfile {
  id: string;
  assetId: string;
  version: number;
  effectiveFrom: string;
  originalCostCents: number;
  residualValueCents: number;
  usefulLifeMonths?: number;
  depreciationMethod: DepreciationMethod;
  customAnnualDepreciationRate?: number;
  customScheduleJson?: string;
  createdAt: string;
}

export interface AssetStatusHistory {
  id: string;
  assetId: string;
  fromStatus?: AssetStatus;
  toStatus: AssetStatus;
  note?: string;
  occurredAt: string;
  createdAt: string;
}
