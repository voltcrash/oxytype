DROP TABLE IF EXISTS `connections`;
--> statement-breakpoint
UPDATE configuration SET data = json_remove(data, '$.connections'), version = version + 1
WHERE json_type(data, '$.connections') IS NOT NULL;
