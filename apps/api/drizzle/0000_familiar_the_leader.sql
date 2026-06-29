CREATE TABLE `asset_attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`asset_id` text NOT NULL,
	`file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`storage_path` text NOT NULL,
	`url` text,
	`type` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `asset_attachments_user_id_idx` ON `asset_attachments` (`user_id`);--> statement-breakpoint
CREATE INDEX `asset_attachments_asset_id_idx` ON `asset_attachments` (`asset_id`);--> statement-breakpoint
CREATE TABLE `asset_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `asset_categories_user_id_idx` ON `asset_categories` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `asset_categories_user_name_unique` ON `asset_categories` (`user_id`,`name`);--> statement-breakpoint
CREATE TABLE `asset_depreciation_profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`version` integer NOT NULL,
	`effective_from` text NOT NULL,
	`original_cost_cents` integer NOT NULL,
	`residual_value_cents` integer NOT NULL,
	`useful_life_months` integer,
	`depreciation_method` text NOT NULL,
	`custom_annual_depreciation_rate` real,
	`custom_schedule_json` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `asset_depreciation_profiles_asset_id_idx` ON `asset_depreciation_profiles` (`asset_id`);--> statement-breakpoint
CREATE INDEX `asset_depreciation_profiles_effective_from_idx` ON `asset_depreciation_profiles` (`effective_from`);--> statement-breakpoint
CREATE UNIQUE INDEX `asset_depreciation_profiles_asset_version_unique` ON `asset_depreciation_profiles` (`asset_id`,`version`);--> statement-breakpoint
CREATE TABLE `asset_maintenance_records` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`user_id` text NOT NULL,
	`maintenance_date` text NOT NULL,
	`type` text NOT NULL,
	`cost_cents` integer,
	`description` text,
	`service_provider` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `asset_maintenance_records_asset_id_idx` ON `asset_maintenance_records` (`asset_id`);--> statement-breakpoint
CREATE INDEX `asset_maintenance_records_user_id_idx` ON `asset_maintenance_records` (`user_id`);--> statement-breakpoint
CREATE INDEX `asset_maintenance_records_date_idx` ON `asset_maintenance_records` (`maintenance_date`);--> statement-breakpoint
CREATE TABLE `asset_status_history` (
	`id` text PRIMARY KEY NOT NULL,
	`asset_id` text NOT NULL,
	`from_status` text,
	`to_status` text NOT NULL,
	`note` text,
	`occurred_at` text NOT NULL,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `asset_status_history_asset_id_idx` ON `asset_status_history` (`asset_id`);--> statement-breakpoint
CREATE INDEX `asset_status_history_occurred_at_idx` ON `asset_status_history` (`occurred_at`);--> statement-breakpoint
CREATE TABLE `asset_tag_relations` (
	`asset_id` text NOT NULL,
	`tag_id` text NOT NULL,
	PRIMARY KEY(`asset_id`, `tag_id`),
	FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tag_id`) REFERENCES `asset_tags`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `asset_tag_relations_asset_id_idx` ON `asset_tag_relations` (`asset_id`);--> statement-breakpoint
CREATE INDEX `asset_tag_relations_tag_id_idx` ON `asset_tag_relations` (`tag_id`);--> statement-breakpoint
CREATE TABLE `asset_tags` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `asset_tags_user_id_idx` ON `asset_tags` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `asset_tags_user_name_unique` ON `asset_tags` (`user_id`,`name`);--> statement-breakpoint
CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`category_id` text,
	`name` text NOT NULL,
	`brand` text,
	`model` text,
	`serial_number` text,
	`description` text,
	`purchase_date` text,
	`purchase_price_cents` integer,
	`purchase_channel` text,
	`invoice_number` text,
	`residual_value_cents` integer,
	`useful_life_months` integer,
	`depreciation_method` text DEFAULT 'NONE' NOT NULL,
	`custom_annual_depreciation_rate` real,
	`depreciation_start_date` text,
	`current_market_value_cents` integer,
	`status` text DEFAULT 'IN_USE' NOT NULL,
	`disposed_at` text,
	`disposal_price_cents` integer,
	`disposal_note` text,
	`location` text,
	`owner_name` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`archived_at` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `asset_categories`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `assets_user_id_idx` ON `assets` (`user_id`);--> statement-breakpoint
CREATE INDEX `assets_category_id_idx` ON `assets` (`category_id`);--> statement-breakpoint
CREATE INDEX `assets_status_idx` ON `assets` (`status`);--> statement-breakpoint
CREATE INDEX `assets_purchase_date_idx` ON `assets` (`purchase_date`);--> statement-breakpoint
CREATE INDEX `assets_user_updated_at_idx` ON `assets` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `refresh_tokens` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `refresh_tokens_user_id_idx` ON `refresh_tokens` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `refresh_tokens_token_hash_unique` ON `refresh_tokens` (`token_hash`);--> statement-breakpoint
CREATE INDEX `refresh_tokens_expires_at_idx` ON `refresh_tokens` (`expires_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`display_name` text NOT NULL,
	`avatar_url` text,
	`created_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
	`updated_at` text DEFAULT (CURRENT_TIMESTAMP) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);