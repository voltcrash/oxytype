import { join } from "node:path";

import metadata from "../../package.json";
import { resolvePaths } from "../storage/paths";
import { help, parseCliOptions } from "./options";

export async function main(args: string[]): Promise<number> {
  let options;
  try {
    options = parseCliOptions(args);
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid arguments");
    console.error("Run oxytype --help for usage.");
    return 2;
  }
  if (options.help) {
    console.log(help);
    return 0;
  }
  if (options.version) {
    console.log(`@voltcrash/oxytype ${metadata.version}`);
    return 0;
  }
  if (
    options.command === "play" &&
    (!process.stdin.isTTY || !process.stdout.isTTY)
  ) {
    console.error(
      "Interactive play requires a terminal. Run oxytype --help for usage.",
    );
    return 2;
  }
  try {
    const { openRuntime } = await import("./runtime");
    const runtime = await openRuntime(options.debug, metadata.version);
    try {
      if (options.command !== "play") {
        const { runAuthCommand } = await import("./auth");
        return await runAuthCommand(options.command, runtime.account.auth);
      }
      if (Object.keys(options.config).length > 0) {
        await runtime.account.auth.check();
        runtime.config.apply({ ...runtime.config.config, ...options.config });
      }
      const { runUi } = await import("./ui");
      await runUi(runtime);
      return 0;
    } catch (error) {
      runtime.logger.error("runtime.failed", error);
      throw error;
    } finally {
      await runtime.close();
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Oxytype failed");
    console.error(
      `Diagnostic log: ${join(resolvePaths().data, "oxytype.log")}`,
    );
    return 1;
  }
}
