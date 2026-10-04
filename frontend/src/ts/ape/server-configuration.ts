import { Configuration } from "@oxytype/schemas/configuration";
import { promiseWithResolvers } from "../utils/misc";
import { queryClient } from "../queries";
import { getServerConfigurationQueryOptions } from "../queries/server-configuration";

const {
  promise: configurationPromise,
  resolve,
  reject,
} = promiseWithResolvers<boolean>();

// Startup can fail before any page starts awaiting server configuration.
void configurationPromise.catch((error: unknown) => {
  console.error("Failed to synchronize server configuration", error);
});

export { configurationPromise };

export function get(): Configuration | undefined {
  return queryClient.getQueryData(
    getServerConfigurationQueryOptions().queryKey,
  );
}

export async function sync(): Promise<void> {
  try {
    await queryClient.query(getServerConfigurationQueryOptions());
    resolve(true);
  } catch (e) {
    reject(e);
  }
}
