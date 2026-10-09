import { join } from "node:path";

import { openAccount, type Account } from "../account";
import { openNetworkSettings, type NetworkSettings } from "../api/settings";
import { openConfigStore, type ConfigStore } from "../config/store";
import { createLogger, type Logger } from "../logging";
import { resolvePaths, type AppPaths } from "../storage/paths";

export type Runtime = {
  paths: AppPaths;
  logger: Logger;
  config: ConfigStore;
  settings: NetworkSettings;
  account: Account;
  close: () => Promise<void>;
};

export async function openRuntime(
  debug: boolean,
  version: string,
): Promise<Runtime> {
  const paths = resolvePaths();
  const logger = createLogger(join(paths.data, "oxytype.log"), {
    debug,
    onFailure: () => console.error("Could not write diagnostic log"),
  });
  logger.write("info", "startup", {
    version,
    bun: Bun.version,
    platform: process.platform,
  });
  let config: ConfigStore | undefined;
  try {
    config = await openConfigStore(join(paths.config, "config.json"));
    logger.write("debug", "config.load", { status: config.status });
    const settings = await openNetworkSettings(
      join(paths.config, "network.json"),
    );
    const account = await openAccount({ paths, settings, config, logger });
    const store = config;
    return {
      paths,
      logger,
      config,
      settings,
      account,
      close: async () => {
        try {
          const writes = await Promise.allSettled([
            account.flush(),
            store.flush(),
          ]);
          for (const write of writes) {
            if (write.status === "rejected") {
              logger.error("storage.flush", write.reason);
              throw write.reason;
            }
          }
        } finally {
          account.stop();
          logger.write("info", "shutdown");
          await logger.flush().catch(() => undefined);
        }
      },
    };
  } catch (error) {
    logger.error("startup.failed", error);
    await config
      ?.flush()
      .catch((failure: unknown) => logger.error("storage.flush", failure));
    await logger.flush().catch(() => undefined);
    throw error;
  }
}
