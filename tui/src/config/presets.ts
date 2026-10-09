import type {
  Config,
  ConfigGroupName,
  PartialConfig,
} from "@oxytype/schemas/configs";
import { sharedConfigMetadata } from "@oxytype/typing-core/config/metadata";

export function presetConfig(
  config: Readonly<Config>,
  groups?: ConfigGroupName[] | null,
): PartialConfig {
  return Object.fromEntries(
    Object.entries(config).filter(
      ([key]) =>
        groups === undefined ||
        groups === null ||
        groups.includes(sharedConfigMetadata[key as keyof Config]?.group),
    ),
  );
}
export function presetIncludesTags(groups?: ConfigGroupName[] | null): boolean {
  return groups === undefined || groups === null || groups.includes("behavior");
}
export function presetSnapshot(
  config: Readonly<Config>,
  tags: string[],
  groups?: ConfigGroupName[] | null,
): PartialConfig & { tags?: string[] } {
  return {
    ...presetConfig(config, groups),
    ...(presetIncludesTags(groups) ? { tags } : {}),
  };
}
