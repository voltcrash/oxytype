DROP TABLE `oauth_states`;--> statement-breakpoint
DROP INDEX `users_discord_id_unique`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `discord_id`;
--> statement-breakpoint
DELETE FROM outbox WHERE type = 'george-tasks';
--> statement-breakpoint
DELETE FROM blocklist WHERE kind = 'discordId';
--> statement-breakpoint
UPDATE users SET data = json_remove(data, '$.discordId', '$.discordAvatar'), version = version + 1
WHERE json_type(data, '$.discordId') IS NOT NULL OR json_type(data, '$.discordAvatar') IS NOT NULL;
--> statement-breakpoint
UPDATE leaderboard_bests SET data = json_remove(data, '$.discordId', '$.discordAvatar')
WHERE json_type(data, '$.discordId') IS NOT NULL OR json_type(data, '$.discordAvatar') IS NOT NULL;
--> statement-breakpoint
UPDATE leaderboard_snapshots SET data = json_remove(data, '$.discordId', '$.discordAvatar')
WHERE json_type(data, '$.discordId') IS NOT NULL OR json_type(data, '$.discordAvatar') IS NOT NULL;
--> statement-breakpoint
UPDATE daily_entries SET data = json_remove(data, '$.discordId', '$.discordAvatar')
WHERE json_type(data, '$.discordId') IS NOT NULL OR json_type(data, '$.discordAvatar') IS NOT NULL;
--> statement-breakpoint
UPDATE weekly_entries SET data = json_remove(data, '$.discordId', '$.discordAvatar')
WHERE json_type(data, '$.discordId') IS NOT NULL OR json_type(data, '$.discordAvatar') IS NOT NULL;
--> statement-breakpoint
UPDATE configuration SET data = json_remove(data, '$.users.discordIntegration', '$.dailyLeaderboards.topResultsToAnnounce');
--> statement-breakpoint
UPDATE configs SET data = json_remove(data, '$.showDiscordDot') WHERE json_type(data, '$.showDiscordDot') IS NOT NULL;
--> statement-breakpoint
UPDATE presets SET data = json_remove(data, '$.config.showDiscordDot') WHERE json_type(data, '$.config.showDiscordDot') IS NOT NULL;
