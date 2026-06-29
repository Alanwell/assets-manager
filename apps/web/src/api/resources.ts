import type { AssetStatus } from '@asset-manager/domain';
import { api } from './client';
import type {
  AssetView,
  AttachmentView,
  CategoryView,
  DashboardOverview,
  MaintenanceView,
  PageResult,
  ProfileView,
  TagView,
} from '../types/api';

export const resourceApi = {
  categories: () => api.get<CategoryView[]>('/categories'),
  createCategory: (body: object) => api.post<CategoryView>('/categories', body),
  updateCategory: (id: string, body: object) =>
    api.patch<CategoryView>(`/categories/${id}`, body),
  deleteCategory: (id: string) => api.delete(`/categories/${id}`),
  tags: () => api.get<TagView[]>('/tags'),
  createTag: (body: object) => api.post<TagView>('/tags', body),
  updateTag: (id: string, body: object) =>
    api.patch<TagView>(`/tags/${id}`, body),
  deleteTag: (id: string) => api.delete(`/tags/${id}`),
  assets: (query: URLSearchParams) =>
    api.get<PageResult<AssetView>>(`/assets?${query}`),
  asset: (id: string) => api.get<AssetView>(`/assets/${id}`),
  createAsset: (body: object) => api.post<AssetView>('/assets', body),
  updateAsset: (id: string, body: object) =>
    api.patch<AssetView>(`/assets/${id}`, body),
  deleteAsset: (id: string) => api.delete(`/assets/${id}`),
  archiveAsset: (id: string) => api.post<AssetView>(`/assets/${id}/archive`),
  restoreAsset: (id: string) => api.post<AssetView>(`/assets/${id}/restore`),
  changeStatus: (
    id: string,
    body: {
      status: AssetStatus;
      note?: string;
      occurredAt?: string;
      disposalPriceCents?: number;
    },
  ) => api.post<AssetView>(`/assets/${id}/status`, body),
  timeline: (id: string) =>
    api.get<Array<{ type: string; occurredAt: string; data: unknown }>>(
      `/assets/${id}/timeline`,
    ),
  maintenance: (id: string) =>
    api.get<MaintenanceView[]>(`/assets/${id}/maintenance-records`),
  createMaintenance: (id: string, body: object) =>
    api.post<MaintenanceView>(`/assets/${id}/maintenance-records`, body),
  deleteMaintenance: (assetId: string, id: string) =>
    api.delete(`/assets/${assetId}/maintenance-records/${id}`),
  profiles: (id: string) =>
    api.get<ProfileView[]>(`/assets/${id}/depreciation-profiles`),
  createProfile: (id: string, body: object) =>
    api.post<ProfileView>(`/assets/${id}/depreciation-profiles`, body),
  attachments: (id: string) =>
    api.get<AttachmentView[]>(`/assets/${id}/attachments`),
  uploadAttachment: (id: string, form: FormData) =>
    api.post<AttachmentView>(`/assets/${id}/attachments`, form),
  deleteAttachment: (assetId: string, id: string) =>
    api.delete(`/assets/${assetId}/attachments/${id}`),
  overview: () => api.get<DashboardOverview>('/dashboard/overview'),
  categoryDistribution: () =>
    api.get<
      Array<{
        categoryId: string | null;
        name: string;
        valueCents: number;
        assetCount: number;
      }>
    >('/dashboard/category-distribution'),
  depreciationTrend: () =>
    api.get<Array<{ month: string; depreciationCents: number }>>(
      '/dashboard/depreciation-trend',
    ),
  statusDistribution: () =>
    api.get<Array<{ status: AssetStatus; assetCount: number }>>(
      '/dashboard/status-distribution',
    ),
  recentAssets: () => api.get<AssetView[]>('/dashboard/recent-assets'),
  exportAssets: () =>
    api.get<Blob>('/exports/assets.csv', { responseType: 'blob' }),
  createBackup: () =>
    api.post<{ name: string; size: number; createdAt: string }>(
      '/backups/create',
    ),
  backups: () =>
    api.get<Array<{ name: string; size: number; createdAt: string }>>(
      '/backups/list',
    ),
};
