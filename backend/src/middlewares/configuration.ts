import { ApiMiddleware } from "../api/http";
import { EndpointMetadata } from "@oxytype/contracts/util/api";
import MonkeyError from "../utils/error";
import { Configuration } from "@oxytype/schemas/configuration";
import {
  ConfigurationPath,
  RequireConfiguration,
} from "@oxytype/contracts/require-configuration/index";
import { getMetadata } from "./utility";

export function verifyRequiredConfiguration(): ApiMiddleware {
  return async (c, next): Promise<void> => {
    const req = c.get("request");
    const requiredConfigurations = getRequireConfigurations(getMetadata(req));

    if (requiredConfigurations === undefined) {
      await next();
      return;
    }
    for (const requireConfiguration of requiredConfigurations) {
      const value = getValue(req.ctx.configuration, requireConfiguration.path);
      if (!value) {
        throw new MonkeyError(
          503,
          requireConfiguration.invalidMessage ??
            "This endpoint is currently unavailable.",
        );
      }
    }
    await next();
  };
}

function getValue(
  configuration: Configuration,
  path: ConfigurationPath,
): boolean {
  const keys = (path as string).split(".");
  let result: unknown = configuration;

  for (const key of keys) {
    if (result === undefined || result === null) {
      throw new MonkeyError(500, `Invalid configuration path: "${path}"`);
    }
    result = result[key];
  }

  if (result === undefined || result === null) {
    throw new MonkeyError(
      500,
      `Required configuration doesnt exist: "${path}"`,
    );
  }
  if (typeof result !== "boolean") {
    throw new MonkeyError(
      500,
      `Required configuration is not a boolean: "${path}"`,
    );
  }
  return result;
}

function getRequireConfigurations(
  metadata: EndpointMetadata | undefined,
): RequireConfiguration[] | undefined {
  if (metadata?.requireConfiguration === undefined) {
    return undefined;
  }

  if (Array.isArray(metadata.requireConfiguration)) {
    return metadata.requireConfiguration;
  }
  return [metadata.requireConfiguration];
}
