import type { Config as ConfigSchema } from "@oxytype/schemas/configs";
import {
  migrateConfig,
  supportedConfigSchema,
} from "@oxytype/typing-core/config/migrate";
import { typedKeys } from "@oxytype/util/objects";
import { getDefaultConfig } from "../constants/default-config";
import { Config } from "./store";

export { migrateConfig };

export function exportConfigToJson(): string {
  return JSON.stringify(
    supportedConfigSchema.parse(migrateConfig(Config)),
    null,
    2,
  );
}

export function getConfigChanges(): Partial<ConfigSchema> {
  const configChanges: Partial<ConfigSchema> = {};
  typedKeys(Config)
    .filter((key) => {
      return Config[key] !== getDefaultConfig()[key];
    })
    .forEach((key) => {
      //@ts-expect-error this is fine
      configChanges[key] = Config[key];
    });
  return configChanges;
}
