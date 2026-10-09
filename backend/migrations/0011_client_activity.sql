PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_user_activity` (
	`uid` text NOT NULL,
	`client` text DEFAULT 'web' NOT NULL,
	`day` integer NOT NULL,
	`count` integer NOT NULL,
	PRIMARY KEY(`uid`, `client`, `day`),
	FOREIGN KEY (`uid`) REFERENCES `users`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_user_activity`("uid", "client", "day", "count") SELECT "uid", 'web', "day", "count" FROM `user_activity`;--> statement-breakpoint
DROP TABLE `user_activity`;--> statement-breakpoint
ALTER TABLE `__new_user_activity` RENAME TO `user_activity`;--> statement-breakpoint
PRAGMA foreign_keys=ON;