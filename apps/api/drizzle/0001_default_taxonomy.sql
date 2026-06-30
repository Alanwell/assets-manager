WITH `default_categories` (`name`, `icon`, `sort_order`) AS (
	VALUES
		('手机', 'smartphone', 0),
		('电脑', 'laptop', 1),
		('平板', 'tablet', 2),
		('家具家电', 'house-plug', 3),
		('摄影器材', 'camera', 4),
		('房产', 'building-2', 5),
		('车辆', 'car', 6),
		('收藏品', 'gem', 7),
		('运动户外', 'tent-tree', 8),
		('工具设备', 'wrench', 9),
		('其他', 'package', 10)
),
`users_without_categories` AS (
	SELECT `users`.`id`
	FROM `users`
	WHERE NOT EXISTS (
		SELECT 1 FROM `asset_categories`
		WHERE `asset_categories`.`user_id` = `users`.`id`
	)
)
INSERT INTO `asset_categories` (
	`id`, `user_id`, `name`, `icon`, `sort_order`, `created_at`, `updated_at`
)
SELECT
	lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
		substr(lower(hex(randomblob(2))), 2) || '-' ||
		substr('89ab', abs(random() % 4) + 1, 1) ||
		substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
	`users_without_categories`.`id`,
	`default_categories`.`name`,
	`default_categories`.`icon`,
	`default_categories`.`sort_order`,
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM `users_without_categories`
CROSS JOIN `default_categories`;
--> statement-breakpoint
WITH `default_tags` (`name`, `color`) AS (
	VALUES
		('重要', '#B8675C'),
		('常用', '#AD8752'),
		('保修中', '#507563'),
		('待维护', '#A8793E'),
		('收藏', '#788B91'),
		('投资', '#806B91')
),
`users_without_tags` AS (
	SELECT `users`.`id`
	FROM `users`
	WHERE NOT EXISTS (
		SELECT 1 FROM `asset_tags`
		WHERE `asset_tags`.`user_id` = `users`.`id`
	)
)
INSERT INTO `asset_tags` (`id`, `user_id`, `name`, `color`, `created_at`)
SELECT
	lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' ||
		substr(lower(hex(randomblob(2))), 2) || '-' ||
		substr('89ab', abs(random() % 4) + 1, 1) ||
		substr(lower(hex(randomblob(2))), 2) || '-' || lower(hex(randomblob(6))),
	`users_without_tags`.`id`,
	`default_tags`.`name`,
	`default_tags`.`color`,
	strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
FROM `users_without_tags`
CROSS JOIN `default_tags`;
