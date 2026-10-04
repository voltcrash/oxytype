UPDATE configuration SET data = json_set(data, '$.users.xp', json('{"enabled":true,"funboxBonus":0.1,"gainMultiplier":1,"maxDailyBonus":1000,"minDailyBonus":100,"streak":{"enabled":true,"maxStreakDays":100,"maxStreakMultiplier":2}}')), version = version + 1
WHERE json_extract(data, '$.users.xp.enabled') = 0 AND json_extract(data, '$.users.xp.gainMultiplier') = 0;
--> statement-breakpoint
UPDATE configuration SET data = json_set(data, '$.leaderboards.weeklyXp.enabled', json('true'), '$.leaderboards.weeklyXp.expirationTimeInDays', 15), version = version + 1
WHERE json_extract(data, '$.leaderboards.weeklyXp.enabled') = 0 AND json_extract(data, '$.leaderboards.weeklyXp.expirationTimeInDays') = 0;
