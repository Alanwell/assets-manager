import {
  AssetStatus,
  AttachmentType,
  DepreciationMethod,
  MaintenanceType,
} from '@asset-manager/domain';
import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

const assetStatuses = [
  AssetStatus.IN_USE,
  AssetStatus.IDLE,
  AssetStatus.SOLD,
  AssetStatus.SCRAPPED,
  AssetStatus.LOST,
  AssetStatus.ARCHIVED,
] as const;

const depreciationMethods = [
  DepreciationMethod.NONE,
  DepreciationMethod.STRAIGHT_LINE,
  DepreciationMethod.DOUBLE_DECLINING,
  DepreciationMethod.CUSTOM_ANNUAL_RATE,
  DepreciationMethod.CUSTOM_SCHEDULE,
] as const;

const attachmentTypes = [
  AttachmentType.IMAGE,
  AttachmentType.INVOICE,
  AttachmentType.WARRANTY,
  AttachmentType.MANUAL,
  AttachmentType.OTHER,
] as const;

const maintenanceTypes = [
  MaintenanceType.REPAIR,
  MaintenanceType.MAINTENANCE,
  MaintenanceType.CLEANING,
  MaintenanceType.INSPECTION,
  MaintenanceType.UPGRADE,
  MaintenanceType.OTHER,
] as const;

const createdAt = () =>
  text('created_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`);
const updatedAt = () =>
  text('updated_at')
    .notNull()
    .default(sql`(CURRENT_TIMESTAMP)`);

export const users = sqliteTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    displayName: text('display_name').notNull(),
    avatarUrl: text('avatar_url'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [uniqueIndex('users_email_unique').on(table.email)],
);

export const refreshTokens = sqliteTable(
  'refresh_tokens',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: text('expires_at').notNull(),
    revokedAt: text('revoked_at'),
    createdAt: createdAt(),
  },
  (table) => [
    index('refresh_tokens_user_id_idx').on(table.userId),
    uniqueIndex('refresh_tokens_token_hash_unique').on(table.tokenHash),
    index('refresh_tokens_expires_at_idx').on(table.expiresAt),
  ],
);

export const assetCategories = sqliteTable(
  'asset_categories',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    icon: text('icon'),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('asset_categories_user_id_idx').on(table.userId),
    uniqueIndex('asset_categories_user_name_unique').on(
      table.userId,
      table.name,
    ),
  ],
);

export const assetTags = sqliteTable(
  'asset_tags',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    color: text('color'),
    createdAt: createdAt(),
  },
  (table) => [
    index('asset_tags_user_id_idx').on(table.userId),
    uniqueIndex('asset_tags_user_name_unique').on(table.userId, table.name),
  ],
);

export const assets = sqliteTable(
  'assets',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    categoryId: text('category_id').references(() => assetCategories.id, {
      onDelete: 'set null',
    }),
    name: text('name').notNull(),
    brand: text('brand'),
    model: text('model'),
    serialNumber: text('serial_number'),
    description: text('description'),
    purchaseDate: text('purchase_date'),
    purchasePriceCents: integer('purchase_price_cents'),
    purchaseChannel: text('purchase_channel'),
    invoiceNumber: text('invoice_number'),
    residualValueCents: integer('residual_value_cents'),
    usefulLifeMonths: integer('useful_life_months'),
    depreciationMethod: text('depreciation_method', {
      enum: depreciationMethods,
    })
      .notNull()
      .default(DepreciationMethod.NONE),
    customAnnualDepreciationRate: real('custom_annual_depreciation_rate'),
    depreciationStartDate: text('depreciation_start_date'),
    currentMarketValueCents: integer('current_market_value_cents'),
    status: text('status', { enum: assetStatuses })
      .notNull()
      .default(AssetStatus.IN_USE),
    disposedAt: text('disposed_at'),
    disposalPriceCents: integer('disposal_price_cents'),
    disposalNote: text('disposal_note'),
    location: text('location'),
    ownerName: text('owner_name'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    archivedAt: text('archived_at'),
  },
  (table) => [
    index('assets_user_id_idx').on(table.userId),
    index('assets_category_id_idx').on(table.categoryId),
    index('assets_status_idx').on(table.status),
    index('assets_purchase_date_idx').on(table.purchaseDate),
    index('assets_user_updated_at_idx').on(table.userId, table.updatedAt),
  ],
);

export const assetTagRelations = sqliteTable(
  'asset_tag_relations',
  {
    assetId: text('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => assetTags.id, { onDelete: 'cascade' }),
  },
  (table) => [
    primaryKey({ columns: [table.assetId, table.tagId] }),
    index('asset_tag_relations_asset_id_idx').on(table.assetId),
    index('asset_tag_relations_tag_id_idx').on(table.tagId),
  ],
);

export const assetAttachments = sqliteTable(
  'asset_attachments',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    assetId: text('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    fileName: text('file_name').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSize: integer('file_size').notNull(),
    storagePath: text('storage_path').notNull(),
    url: text('url'),
    type: text('type', { enum: attachmentTypes }).notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('asset_attachments_user_id_idx').on(table.userId),
    index('asset_attachments_asset_id_idx').on(table.assetId),
  ],
);

export const assetMaintenanceRecords = sqliteTable(
  'asset_maintenance_records',
  {
    id: text('id').primaryKey(),
    assetId: text('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    maintenanceDate: text('maintenance_date').notNull(),
    type: text('type', { enum: maintenanceTypes }).notNull(),
    costCents: integer('cost_cents'),
    description: text('description'),
    serviceProvider: text('service_provider'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (table) => [
    index('asset_maintenance_records_asset_id_idx').on(table.assetId),
    index('asset_maintenance_records_user_id_idx').on(table.userId),
    index('asset_maintenance_records_date_idx').on(table.maintenanceDate),
  ],
);

export const assetDepreciationProfiles = sqliteTable(
  'asset_depreciation_profiles',
  {
    id: text('id').primaryKey(),
    assetId: text('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    version: integer('version').notNull(),
    effectiveFrom: text('effective_from').notNull(),
    originalCostCents: integer('original_cost_cents').notNull(),
    residualValueCents: integer('residual_value_cents').notNull(),
    usefulLifeMonths: integer('useful_life_months'),
    depreciationMethod: text('depreciation_method', {
      enum: depreciationMethods,
    }).notNull(),
    customAnnualDepreciationRate: real('custom_annual_depreciation_rate'),
    customScheduleJson: text('custom_schedule_json'),
    createdAt: createdAt(),
  },
  (table) => [
    index('asset_depreciation_profiles_asset_id_idx').on(table.assetId),
    index('asset_depreciation_profiles_effective_from_idx').on(
      table.effectiveFrom,
    ),
    uniqueIndex('asset_depreciation_profiles_asset_version_unique').on(
      table.assetId,
      table.version,
    ),
  ],
);

export const assetStatusHistory = sqliteTable(
  'asset_status_history',
  {
    id: text('id').primaryKey(),
    assetId: text('asset_id')
      .notNull()
      .references(() => assets.id, { onDelete: 'cascade' }),
    fromStatus: text('from_status', { enum: assetStatuses }),
    toStatus: text('to_status', { enum: assetStatuses }).notNull(),
    note: text('note'),
    occurredAt: text('occurred_at').notNull(),
    createdAt: createdAt(),
  },
  (table) => [
    index('asset_status_history_asset_id_idx').on(table.assetId),
    index('asset_status_history_occurred_at_idx').on(table.occurredAt),
  ],
);
