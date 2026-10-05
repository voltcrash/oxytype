UPDATE configs SET data = json_remove(data, '$.ads', '$.enableAds')
WHERE json_type(data, '$.ads') IS NOT NULL OR json_type(data, '$.enableAds') IS NOT NULL;
--> statement-breakpoint
UPDATE presets SET data = json_remove(data, '$.config.ads', '$.config.enableAds')
WHERE json_type(data, '$.config.ads') IS NOT NULL OR json_type(data, '$.config.enableAds') IS NOT NULL;
--> statement-breakpoint
-- Presets containing only the removed group have no remaining purpose.
DELETE FROM presets
WHERE json_type(data, '$.settingGroups') = 'array'
  AND EXISTS (SELECT 1 FROM json_each(presets.data, '$.settingGroups') WHERE value = 'ads')
  AND NOT EXISTS (SELECT 1 FROM json_each(presets.data, '$.settingGroups') WHERE value != 'ads');
--> statement-breakpoint
UPDATE presets SET data = json_set(data, '$.settingGroups', (
  SELECT json_group_array(value) FROM (
    SELECT value FROM json_each(presets.data, '$.settingGroups')
    WHERE value != 'ads' ORDER BY key
  )
))
WHERE json_type(data, '$.settingGroups') = 'array'
  AND EXISTS (SELECT 1 FROM json_each(presets.data, '$.settingGroups') WHERE value = 'ads');
