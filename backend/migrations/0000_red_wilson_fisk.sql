CREATE TABLE `admin_uids` (
	`uid` text PRIMARY KEY NOT NULL
);
--> statement-breakpoint
CREATE TABLE `ape_keys` (
	`id` text PRIMARY KEY NOT NULL,
	`uid` text NOT NULL,
	`name` text NOT NULL,
	`enabled` integer NOT NULL,
	`hash` text NOT NULL,
	`created_on` integer NOT NULL,
	`modified_on` integer NOT NULL,
	`last_used_on` integer NOT NULL,
	`use_count` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ape_keys_owner_idx` ON `ape_keys` (`uid`);--> statement-breakpoint
CREATE TABLE `auth_accounts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` integer,
	`refresh_token_expires_at` integer,
	`scope` text,
	`password` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_accounts_provider_idx` ON `auth_accounts` (`provider_id`,`account_id`);--> statement-breakpoint
CREATE INDEX `auth_accounts_user_idx` ON `auth_accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `auth_rate_limits` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`count` integer NOT NULL,
	`last_request` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_rate_limits_key_unique` ON `auth_rate_limits` (`key`);--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`user_id` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`ip_address` text,
	`user_agent` text,
	FOREIGN KEY (`user_id`) REFERENCES `auth_users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_sessions_token_unique` ON `auth_sessions` (`token`);--> statement-breakpoint
CREATE INDEX `auth_sessions_user_idx` ON `auth_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `auth_sessions_expiry_idx` ON `auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `auth_users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`disabled` integer DEFAULT false NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `auth_users_email_unique` ON `auth_users` (`email`);--> statement-breakpoint
CREATE TABLE `auth_verifications` (
	`id` text PRIMARY KEY NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_verifications_identifier_idx` ON `auth_verifications` (`identifier`);--> statement-breakpoint
CREATE INDEX `auth_verifications_expiry_idx` ON `auth_verifications` (`expires_at`);--> statement-breakpoint
CREATE TABLE `blocklist` (
	`kind` text NOT NULL,
	`hash` text NOT NULL,
	`timestamp` integer NOT NULL,
	PRIMARY KEY(`kind`, `hash`)
);
--> statement-breakpoint
CREATE TABLE `configs` (
	`uid` text PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `configuration` (
	`id` text PRIMARY KEY NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `connections` (
	`id` text PRIMARY KEY NOT NULL,
	`key` text NOT NULL,
	`initiator_uid` text NOT NULL,
	`receiver_uid` text NOT NULL,
	`initiator_name` text NOT NULL,
	`receiver_name` text NOT NULL,
	`status` text NOT NULL,
	`last_modified` integer NOT NULL,
	FOREIGN KEY (`initiator_uid`) REFERENCES `users`(`uid`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`receiver_uid`) REFERENCES `users`(`uid`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "connections_status" CHECK("connections"."status" IN ('pending','accepted','blocked'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `connections_key_unique` ON `connections` (`key`);--> statement-breakpoint
CREATE INDEX `connections_initiator_idx` ON `connections` (`initiator_uid`,`status`);--> statement-breakpoint
CREATE INDEX `connections_receiver_idx` ON `connections` (`receiver_uid`,`status`);--> statement-breakpoint
CREATE TABLE `daily_entries` (
	`board` text NOT NULL,
	`period` integer NOT NULL,
	`uid` text NOT NULL,
	`score` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`board`, `period`, `uid`),
	FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `daily_entries_rank_idx` ON `daily_entries` (`board`,`period`,`score`,`uid`);--> statement-breakpoint
CREATE INDEX `daily_entries_expiry_idx` ON `daily_entries` (`expires_at`);--> statement-breakpoint
CREATE INDEX `daily_entries_owner_idx` ON `daily_entries` (`uid`);--> statement-breakpoint
CREATE TABLE `inbox` (
	`id` text PRIMARY KEY NOT NULL,
	`uid` text NOT NULL,
	`timestamp` integer NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `inbox_owner_idx` ON `inbox` (`uid`,`timestamp`);--> statement-breakpoint
CREATE TABLE `leaderboard_bests` (
	`uid` text NOT NULL,
	`board` text NOT NULL,
	`wpm` real NOT NULL,
	`acc` real NOT NULL,
	`timestamp` integer NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`board`, `uid`),
	FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `leaderboard_bests_score_idx` ON `leaderboard_bests` (`board`,`wpm`,`acc`,`timestamp`);--> statement-breakpoint
CREATE TABLE `leaderboard_generations` (
	`board` text PRIMARY KEY NOT NULL,
	`generation` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leaderboard_snapshots` (
	`generation` text NOT NULL,
	`board` text NOT NULL,
	`uid` text NOT NULL,
	`rank` integer NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`generation`, `board`, `uid`),
	FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leaderboard_snapshots_rank_idx` ON `leaderboard_snapshots` (`generation`,`board`,`rank`);--> statement-breakpoint
CREATE INDEX `leaderboard_snapshots_owner_idx` ON `leaderboard_snapshots` (`uid`);--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`uid` text NOT NULL,
	`event` text NOT NULL,
	`timestamp` integer NOT NULL,
	`important` integer DEFAULT false NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `audit_logs_owner_idx` ON `audit_logs` (`uid`,`timestamp`);--> statement-breakpoint
CREATE INDEX `audit_logs_retention_idx` ON `audit_logs` (`important`,`timestamp`);--> statement-breakpoint
CREATE TABLE `mutation_guards` (
	`id` text PRIMARY KEY NOT NULL,
	`valid` integer NOT NULL,
	CONSTRAINT "mutation_version" CHECK("mutation_guards"."valid" = 1)
);
--> statement-breakpoint
CREATE TABLE `oauth_states` (
	`uid` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `oauth_states_expiry_idx` ON `oauth_states` (`expires_at`);--> statement-breakpoint
CREATE TABLE `outbox` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`uid` text,
	`created_at` integer NOT NULL,
	`sent_at` integer,
	`completed_at` integer,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `outbox_pending_idx` ON `outbox` (`sent_at`,`created_at`);--> statement-breakpoint
CREATE INDEX `outbox_owner_idx` ON `outbox` (`uid`);--> statement-breakpoint
CREATE TABLE `presets` (
	`id` text PRIMARY KEY NOT NULL,
	`uid` text NOT NULL,
	`timestamp` integer NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `presets_owner_idx` ON `presets` (`uid`,`timestamp`);--> statement-breakpoint
CREATE TABLE `psas` (
	`id` text PRIMARY KEY NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `public_stats` (
	`id` text PRIMARY KEY NOT NULL,
	`tests_completed` integer DEFAULT 0 NOT NULL,
	`tests_started` integer DEFAULT 0 NOT NULL,
	`time_typing` real DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quote_ratings` (
	`id` text NOT NULL,
	`language` text NOT NULL,
	`quote_id` integer NOT NULL,
	`ratings` integer DEFAULT 0 NOT NULL,
	`total_rating` real DEFAULT 0 NOT NULL,
	PRIMARY KEY(`language`, `quote_id`)
);
--> statement-breakpoint
CREATE TABLE `quote_submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`language` text NOT NULL,
	`submitted_by` text NOT NULL,
	`timestamp` integer NOT NULL,
	`approved` integer DEFAULT false NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `quote_submissions_review_idx` ON `quote_submissions` (`approved`,`language`,`timestamp`);--> statement-breakpoint
CREATE TABLE `rate_counters` (
	`key` text PRIMARY KEY NOT NULL,
	`points` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_counters_expiry_idx` ON `rate_counters` (`expires_at`);--> statement-breakpoint
CREATE TABLE `reports` (
	`id` text PRIMARY KEY NOT NULL,
	`report_id` text NOT NULL,
	`uid` text NOT NULL,
	`content_id` text NOT NULL,
	`type` text NOT NULL,
	`timestamp` integer NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reports_report_id_unique` ON `reports` (`report_id`);--> statement-breakpoint
CREATE INDEX `reports_content_idx` ON `reports` (`content_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `reports_reporter_idx` ON `reports` (`content_id`,`uid`);--> statement-breakpoint
CREATE TABLE `results` (
	`id` text PRIMARY KEY NOT NULL,
	`uid` text NOT NULL,
	`timestamp` integer NOT NULL,
	`mode` text NOT NULL,
	`mode2` text NOT NULL,
	`language` text NOT NULL,
	`wpm` real NOT NULL,
	`acc` real NOT NULL,
	`submission_hash` text,
	`data` text NOT NULL,
	FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `results_owner_time_idx` ON `results` (`uid`,`timestamp`,`id`);--> statement-breakpoint
CREATE INDEX `results_mode_idx` ON `results` (`uid`,`mode`,`mode2`,`language`);--> statement-breakpoint
CREATE UNIQUE INDEX `results_submission_idx` ON `results` (`uid`,`submission_hash`);--> statement-breakpoint
CREATE TABLE `reward_grants` (
	`id` text PRIMARY KEY NOT NULL,
	`uid` text NOT NULL,
	`origin` text NOT NULL,
	`claimed` integer DEFAULT false NOT NULL,
	`data` text NOT NULL,
	FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reward_grants_origin_idx` ON `reward_grants` (`origin`,`uid`);--> statement-breakpoint
CREATE INDEX `reward_grants_owner_idx` ON `reward_grants` (`uid`);--> statement-breakpoint
CREATE TABLE `scheduled_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`due_at` integer NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `scheduled_jobs_due_idx` ON `scheduled_jobs` (`status`,`due_at`);--> statement-breakpoint
CREATE INDEX `scheduled_jobs_lease_idx` ON `scheduled_jobs` (`status`,`lease_until`);--> statement-breakpoint
CREATE TABLE `speed_histograms` (
	`board` text NOT NULL,
	`bucket` text NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`board`, `bucket`)
);
--> statement-breakpoint
CREATE TABLE `user_activity` (
	`uid` text NOT NULL,
	`day` integer NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`uid`, `day`),
	FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `user_quote_ratings` (
	`uid` text NOT NULL,
	`language` text NOT NULL,
	`quote_id` integer NOT NULL,
	`rating` real NOT NULL,
	PRIMARY KEY(`uid`, `language`, `quote_id`),
	FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`uid` text PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`name` text NOT NULL,
	`name_key` text NOT NULL,
	`email` text NOT NULL,
	`discord_id` text,
	`added_at` integer NOT NULL,
	`xp` integer DEFAULT 0 NOT NULL,
	`time_typing` real DEFAULT 0 NOT NULL,
	`completed_tests` integer DEFAULT 0 NOT NULL,
	`started_tests` integer DEFAULT 0 NOT NULL,
	`banned` integer DEFAULT false NOT NULL,
	`lb_opt_out` integer DEFAULT false NOT NULL,
	`needs_to_change_name` integer DEFAULT false NOT NULL,
	`version` integer DEFAULT 0 NOT NULL,
	`data` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_id_unique` ON `users` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_name_key_unique` ON `users` (`name_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_discord_id_unique` ON `users` (`discord_id`);--> statement-breakpoint
CREATE TABLE `weekly_entries` (
	`period` integer NOT NULL,
	`uid` text NOT NULL,
	`xp` integer NOT NULL,
	`time_typed_seconds` real NOT NULL,
	`expires_at` integer NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`period`, `uid`),
	FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `weekly_entries_rank_idx` ON `weekly_entries` (`period`,`xp`,`uid`);--> statement-breakpoint
CREATE INDEX `weekly_entries_expiry_idx` ON `weekly_entries` (`expires_at`);--> statement-breakpoint
CREATE INDEX `weekly_entries_owner_idx` ON `weekly_entries` (`uid`);