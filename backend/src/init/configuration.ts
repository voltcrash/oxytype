import { eq } from "drizzle-orm";
import { database, encode, statement } from "../db/client";
import { configuration as configurationTable } from "../db/schema";
import { runtime } from "../runtime/env";
import { identity, isPlainObject } from "../utils/misc";
import { BASE_CONFIGURATION } from "../constants/base-configuration";
import type { Configuration } from "@oxytype/schemas/configuration";
import type { PartialConfiguration } from "@oxytype/contracts/configuration";
import { intersect } from "@oxytype/util/arrays";

function mergeConfigurations(
  baseConfiguration: Configuration,
  liveConfiguration: PartialConfiguration,
): void {
  if (!isPlainObject(baseConfiguration) || !isPlainObject(liveConfiguration)) {
    return;
  }

  function merge(base: object, source: object): void {
    const commonKeys = intersect(Object.keys(base), Object.keys(source), true);

    commonKeys.forEach((key) => {
      const baseValue = base[key] as object;
      const sourceValue = source[key] as object;

      const isBaseValueObject = isPlainObject(baseValue);
      const isSourceValueObject = isPlainObject(sourceValue);

      if (isBaseValueObject && isSourceValueObject) {
        merge(baseValue, sourceValue);
      } else if (identity(baseValue) === identity(sourceValue)) {
        base[key] = sourceValue;
      }
    });
  }

  merge(baseConfiguration, liveConfiguration);
}

export async function getCachedConfiguration(
  _attemptCacheUpdate = false,
): Promise<Configuration> {
  return runtime().configuration ?? (await getLiveConfiguration());
}
export async function getLiveConfiguration(): Promise<Configuration> {
  const row = await database()
    .select()
    .from(configurationTable)
    .where(eq(configurationTable.id, "main"))
    .get();
  const configuration = structuredClone(BASE_CONFIGURATION);
  if (row) {
    mergeConfigurations(configuration, row.data);
  } else {
    await database()
      .insert(configurationTable)
      .values({ id: "main", data: configuration })
      .onConflictDoNothing();
  }
  runtime().configuration = configuration;
  return configuration;
}
export async function patchConfiguration(
  updates: PartialConfiguration,
): Promise<boolean> {
  await getCachedConfiguration();
  await statement(
    "UPDATE configuration SET data=json_patch(data,?),version=version+1 WHERE id='main'",
    encode(updates),
  ).run();
  await getLiveConfiguration();
  return true;
}
export async function updateFromConfigurationFile(): Promise<void> {
  /* Seed and patch D1 explicitly using Wrangler; Workers have no mutable configuration file. */
}
export const __testing = { mergeConfigurations };
