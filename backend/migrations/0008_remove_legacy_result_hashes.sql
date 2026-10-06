UPDATE configuration SET data = json_remove(data, '$.users.lastHashesCheck'), version = version + 1
WHERE json_type(data, '$.users.lastHashesCheck') IS NOT NULL;
--> statement-breakpoint
UPDATE users SET data = json_remove(data, '$.lastReultHashes'), version = version + 1
WHERE json_type(data, '$.lastReultHashes') IS NOT NULL;
