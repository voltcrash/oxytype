PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_inbox` (
	`id` text NOT NULL,
	`uid` text NOT NULL,
	`timestamp` integer NOT NULL,
	`read` integer DEFAULT false NOT NULL,
	`deleted` integer DEFAULT false NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`uid`, `id`),
	FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_inbox`("id", "uid", "timestamp", "read", "deleted", "data") SELECT "id", "uid", "timestamp", "read", "deleted", "data" FROM `inbox`;--> statement-breakpoint
DROP TABLE `inbox`;--> statement-breakpoint
ALTER TABLE `__new_inbox` RENAME TO `inbox`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `inbox_owner_idx` ON `inbox` (`uid`,`timestamp`);