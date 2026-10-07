import { getSessionCookie } from "better-auth/cookies";
import { verifyApeKey, hashApeKey } from "../utils/ape-key-hash";
import { upgradeHash, getApeKey, updateLastUsedOn } from "../dal/ape-keys";
import MonkeyError from "../utils/error";
import { verifySession } from "../utils/auth";
import { base64UrlDecode, isDevEnvironment } from "../utils/misc";
import { ApiMiddleware } from "../api/http";
import statuses from "../constants/monkey-status-codes";
import {
  EndpointMetadata,
  RequestAuthenticationOptions,
} from "@oxytype/contracts/util/api";
import { Configuration } from "@oxytype/schemas/configuration";
import { getMetadata } from "./utility";

export type DecodedToken = {
  type: "Bearer" | "Session" | "ApeKey" | "None";
  uid: string;
  email: string;
};

const DEFAULT_OPTIONS: RequestAuthenticationOptions = {
  isPublic: false,
  acceptApeKeys: false,
  requireFreshToken: false,
  isPublicOnDev: false,
};

/**
 * Authenticate request based on the auth settings of the route.
 * By default a Bearer token with user authentication is required.
 * @returns
 */
export function authenticateTsRestRequest(): ApiMiddleware {
  return async (c, next): Promise<void> => {
    const req = c.get("request");
    const options = {
      ...DEFAULT_OPTIONS,
      ...((getMetadata(req).authenticationOptions ?? {}) as EndpointMetadata),
    };

    let token: DecodedToken;

    const isPublic =
      options.isPublic === true ||
      (options.isPublicOnDev && isDevEnvironment());

    const { authorization: authHeader } = req.headers;

    if (authHeader !== undefined && authHeader !== "") {
      token = await authenticateWithAuthHeader(
        authHeader,
        req.ctx.configuration,
        options,
      );
    } else if (
      typeof getSessionCookie(
        new Headers({ cookie: req.headers["cookie"] ?? "" }),
        { cookiePrefix: "oxytype" },
      ) === "string"
    ) {
      token = await authenticateWithSession(
        new Headers({ cookie: req.headers["cookie"] ?? "" }),
        options,
        "Session",
      );
    } else if (isPublic === true) {
      token = {
        type: "None",
        uid: "",
        email: "",
      };
    } else {
      throw new MonkeyError(
        401,
        "Unauthorized",
        `endpoint: ${req.path} no authorization header found`,
      );
    }

    req.ctx = {
      ...req.ctx,
      decodedToken: token,
    };

    await next();
  };
}

async function authenticateWithAuthHeader(
  authHeader: string,
  configuration: Configuration,
  options: RequestAuthenticationOptions,
): Promise<DecodedToken> {
  const [authScheme, token] = authHeader.split(" ");

  if (token === undefined) {
    throw new MonkeyError(
      401,
      "Missing authentication token",
      "authenticateWithAuthHeader",
    );
  }

  const normalizedAuthScheme = authScheme?.trim();

  switch (normalizedAuthScheme) {
    case "Bearer":
      return await authenticateWithBearerToken(token, options);
    case "ApeKey":
      return await authenticateWithApeKey(token, configuration, options);
    case "Uid":
      return await authenticateWithUid(token);
  }

  throw new MonkeyError(
    401,
    "Unknown authentication scheme",
    `The authentication scheme "${authScheme}" is not implemented`,
  );
}

async function authenticateWithBearerToken(
  token: string,
  options: RequestAuthenticationOptions,
): Promise<DecodedToken> {
  return authenticateWithSession(
    new Headers({ authorization: `Bearer ${token}` }),
    options,
    "Bearer",
  );
}

async function authenticateWithSession(
  headers: Headers,
  options: RequestAuthenticationOptions,
  type: "Bearer" | "Session",
): Promise<DecodedToken> {
  const session = await verifySession(headers);
  if (
    options.requireFreshToken &&
    Date.now() - session.createdAt.getTime() > 60 * 1000
  ) {
    throw new MonkeyError(
      401,
      "Unauthorized",
      "This endpoint requires a fresh token",
    );
  }
  return { type, uid: session.uid, email: session.email };
}

async function authenticateWithApeKey(
  key: string,
  configuration: Configuration,
  options: RequestAuthenticationOptions,
): Promise<DecodedToken> {
  const isPublic =
    options.isPublic === true || (options.isPublicOnDev && isDevEnvironment());

  if (!isPublic) {
    if (!configuration.apeKeys.acceptKeys) {
      throw new MonkeyError(503, "ApeKeys are not being accepted at this time");
    }

    if (!options.acceptApeKeys) {
      throw new MonkeyError(401, "This endpoint does not accept ApeKeys");
    }
  }

  try {
    const decodedKey = base64UrlDecode(key);
    const [keyId, apeKey] = decodedKey.split(".");

    if (
      keyId === undefined ||
      keyId === "" ||
      apeKey === undefined ||
      apeKey === ""
    ) {
      throw new MonkeyError(400, "Malformed ApeKey");
    }

    const targetApeKey = await getApeKey(keyId);
    if (!targetApeKey) {
      throw new MonkeyError(404, "ApeKey not found");
    }

    if (!targetApeKey.enabled) {
      const { code, message } = statuses.APE_KEY_INACTIVE;
      throw new MonkeyError(code, message);
    }

    const isKeyValid = await verifyApeKey(apeKey, targetApeKey.hash);
    if (!isKeyValid) {
      const { code, message } = statuses.APE_KEY_INVALID;
      throw new MonkeyError(code, message);
    }

    if (!targetApeKey.hash.startsWith("sha256:")) {
      await upgradeHash(targetApeKey.uid, keyId, hashApeKey(apeKey));
    }
    await updateLastUsedOn(targetApeKey.uid, keyId);

    return {
      type: "ApeKey",
      uid: targetApeKey.uid,
      email: "",
    };
  } catch (error) {
    if (!(error instanceof MonkeyError)) {
      const { code, message } = statuses.APE_KEY_MALFORMED;
      throw new MonkeyError(code, message);
    }

    throw error;
  }
}

async function authenticateWithUid(token: string): Promise<DecodedToken> {
  if (!isDevEnvironment()) {
    throw new MonkeyError(401, "Bearer type uid is not supported");
  }
  const [uid, email] = token.split("|");

  if (uid === undefined || uid === "") {
    throw new MonkeyError(401, "Missing uid");
  }

  return {
    type: "Bearer",
    uid: uid,
    email: email ?? "",
  };
}
