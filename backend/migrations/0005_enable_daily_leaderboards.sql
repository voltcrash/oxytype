UPDATE configuration SET data = json_set(data, '$.dailyLeaderboards', json('{"enabled":true,"maxResults":1000,"leaderboardExpirationTimeInDays":2,"validModeRules":[{"language":"english","mode":"time","mode2":"(15|60)"}],"scheduleRewardsModeRules":[{"language":"english","mode":"time","mode2":"(15|60)"}],"xpRewardBrackets":[{"minRank":1,"maxRank":1,"minReward":5000,"maxReward":5000},{"minRank":2,"maxRank":10,"minReward":1000,"maxReward":2500},{"minRank":11,"maxRank":100,"minReward":100,"maxReward":900}]}')), version = version + 1
WHERE json_extract(data, '$.dailyLeaderboards.enabled') = 0
  AND json_extract(data, '$.dailyLeaderboards.maxResults') = 0
  AND json_extract(data, '$.dailyLeaderboards.leaderboardExpirationTimeInDays') = 0
  AND json_array_length(data, '$.dailyLeaderboards.validModeRules') = 0
  AND json_array_length(data, '$.dailyLeaderboards.scheduleRewardsModeRules') = 0
  AND json_array_length(data, '$.dailyLeaderboards.xpRewardBrackets') = 0;
