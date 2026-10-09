CREATE TABLE `auth_device_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`device_code` text NOT NULL,
	`user_code` text NOT NULL,
	`user_id` text,
	`expires_at` integer NOT NULL,
	`status` text NOT NULL,
	`last_polled_at` integer,
	`polling_interval` integer,
	`client_id` text,
	`scope` text,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_device_codes_device_code_unique` ON `auth_device_codes` (`device_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `auth_device_codes_user_code_unique` ON `auth_device_codes` (`user_code`);--> statement-breakpoint
CREATE INDEX `auth_device_codes_expiry_idx` ON `auth_device_codes` (`expires_at`);