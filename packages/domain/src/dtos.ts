import type {
  AssetStatus,
  AttachmentType,
  DepreciationMethod,
  MaintenanceType,
} from './enums.js';

export interface RegisterDto {
  email: string;
  password: string;
  displayName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface CreateAssetCategoryDto {
  name: string;
  icon?: string;
  sortOrder?: number;
}

export type UpdateAssetCategoryDto = Partial<CreateAssetCategoryDto>;

export interface CreateAssetTagDto {
  name: string;
  color?: string;
}

export type UpdateAssetTagDto = Partial<CreateAssetTagDto>;

export interface CreateAssetDto {
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
  depreciationMethod?: DepreciationMethod;
  customAnnualDepreciationRate?: number;
  depreciationStartDate?: string;
  currentMarketValueCents?: number;
  status?: AssetStatus;
  location?: string;
  ownerName?: string;
  tagIds?: string[];
}

export type UpdateAssetDto = Partial<CreateAssetDto>;

export interface AssetListQueryDto {
  page?: number;
  pageSize?: number;
  keyword?: string;
  categoryId?: string;
  tagIds?: string[];
  status?: AssetStatus;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  minPurchasePriceCents?: number;
  maxPurchasePriceCents?: number;
  purchaseDateFrom?: string;
  purchaseDateTo?: string;
  includeArchived?: boolean;
}

export interface ChangeAssetStatusDto {
  status: AssetStatus;
  note?: string;
  occurredAt?: string;
  disposalPriceCents?: number;
}

export interface CreateAssetAttachmentDto {
  fileName: string;
  mimeType: string;
  fileSize: number;
  type: AttachmentType;
}

export interface CreateAssetMaintenanceRecordDto {
  maintenanceDate: string;
  type: MaintenanceType;
  costCents?: number;
  description?: string;
  serviceProvider?: string;
}

export type UpdateAssetMaintenanceRecordDto =
  Partial<CreateAssetMaintenanceRecordDto>;

export interface CreateAssetDepreciationProfileDto {
  effectiveFrom: string;
  originalCostCents: number;
  residualValueCents: number;
  usefulLifeMonths?: number;
  depreciationMethod: DepreciationMethod;
  customAnnualDepreciationRate?: number;
  customScheduleJson?: string;
}

export interface PageResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ApiErrorResponse {
  statusCode: number;
  code: string;
  message: string;
  details?: unknown;
  timestamp: string;
  path: string;
}
