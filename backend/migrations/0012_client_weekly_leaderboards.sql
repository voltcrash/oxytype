PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_weekly_entries` (
	`period` integer NOT NULL,
	`uid` text NOT NULL,
	`client` text DEFAULT 'web' NOT NULL,
	`xp` integer NOT NULL,
	`time_typed_seconds` real NOT NULL,
	`expires_at` integer NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`client`, `period`, `uid`),
	FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_weekly_entries`("period", "uid", "client", "xp", "time_typed_seconds", "expires_at", "data") SELECT "period", "uid", 'web', "xp", "time_typed_seconds", "expires_at", "data" FROM `weekly_entries`;--> statement-breakpoint
DROP TABLE `weekly_entries`;--> statement-breakpoint
ALTER TABLE `__new_weekly_entries` RENAME TO `weekly_entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `weekly_entries_rank_idx` ON `weekly_entries` (`client`,`period`,`xp`,`uid`);--> statement-breakpoint
CREATE INDEX `weekly_entries_expiry_idx` ON `weekly_entries` (`expires_at`);--> statement-breakpoint
CREATE INDEX `weekly_entries_owner_idx` ON `weekly_entries` (`uid`);