import * as db from "../init/db";
import { v4 as uuidv4 } from "uuid";
import Logger from "../utils/logger";
import MonkeyError, { getErrorMessage } from "../utils/error";
import { incrementBadAuth } from "./rate-limit";
import { ApiContext } from "../api/http";
import { isCustomCode } from "../constants/monkey-status-codes";

import {
  recordClientErrorByVersion,
  recordServerErrorByVersion,
} from "../utils/prometheus";
import { isDevEnvironment } from "../utils/misc";
import { version } from "../version";
import { addLog } from "../dal/logs";

type DBError = {
  _id: string; //we are using uuid here, not objectIds
  timestamp: number;
  status: number;
  uid: string;
  message: string;
  stack?: string;
  endpoint: string;
  method: string;
  url: string;
};

type ErrorData = {
  errorId?: string;
  uid: string;
};

async function errorHandlingMiddleware(
  error: Error,
  c: ApiContext,
): Promise<Response> {
  const req = c.get("request");
  try {
    const monkeyError = error as MonkeyError;
    let status = 500;
    const data: { errorId?: string; uid: string } = {
      errorId: monkeyError.errorId ?? uuidv4(),
      uid: monkeyError.uid ?? req?.ctx.decodedToken.uid ?? "",
    };
    let message = "Unknown error";

    if (/ECONNREFUSED.*27017/i.test(error.message)) {
      message = "Could not connect to the database. It may be down.";
    } else if (error instanceof URIError || error instanceof SyntaxError) {
      status = 400;
      message = "Unprocessable request";
    } else if (error instanceof MonkeyError) {
      message = error.message;
      status = error.status;
    } else {
      message = `Oops! Our monkeys dropped their bananas. Please try again later. - ${data.errorId}`;
    }

    await incrementBadAuth(req, status);

    if (status >= 400 && status < 500) {
      recordClientErrorByVersion(c.req.header("x-client-version") ?? "unknown");
    }

    if (!isDevEnvironment() && status >= 500 && status !== 503) {
      recordServerErrorByVersion(version);

      const { uid, errorId } = data as {
        uid: string;
        errorId: string;
      };

      try {
        await addLog(
          "system_error",
          `${status} ${errorId} ${error.message} ${error.stack}`,
          uid,
        );
        await db.collection<DBError>("errors").insertOne({
          _id: errorId,
          timestamp: Date.now(),
          status: status,
          uid,
          message: error.message,
          stack: error.stack,
          endpoint: req?.originalUrl ?? c.req.path,
          method: c.req.method,
          url: c.req.url,
        });
      } catch (e) {
        Logger.error("Logging to db failed.");
        Logger.error(getErrorMessage(e) ?? "Unknown error");
        console.error(e);
      }
    } else {
      Logger.error(`Error: ${error.message} Stack: ${error.stack}`);
    }

    if (status < 500) {
      delete data.errorId;
    }

    return handleErrorResponse(c, status, message, data);
  } catch (e) {
    Logger.error("Error handling middleware failed.");
    Logger.error(getErrorMessage(e) ?? "Unknown error");
    console.error(e);
  }

  return handleErrorResponse(
    c,
    500,
    "Something went really wrong, please contact support.",
  );
}

function handleErrorResponse(
  c: ApiContext,
  status: number,
  message: string,
  data?: ErrorData,
): Response {
  if (isCustomCode(status) && c.env.outgoing !== undefined) {
    c.env.outgoing.statusMessage = message;
  }
  return c.newResponse(JSON.stringify({ message, data: data ?? null }), {
    status: status as import("hono/utils/http-status").StatusCode,
    statusText: isCustomCode(status) ? message : undefined,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export default errorHandlingMiddleware;
