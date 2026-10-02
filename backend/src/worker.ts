import { Hono } from "hono";
import type { ExecutionContext } from "@cloudflare/workers-types";
import { withRuntime, type WorkerEnv } from "./runtime/env";

// Foundation health endpoint; the existing contract router is attached in Part 3.
const app = new Hono<{ Bindings: WorkerEnv }>();
app.get("/", (c) =>
  c.json({
    message: "ok",
    data: { version: c.env.VERSION ?? "DEVELOPMENT-VERSION" },
  }),
);
app.get("/api/", (c) =>
  c.json({
    message: "ok",
    data: { version: c.env.VERSION ?? "DEVELOPMENT-VERSION" },
  }),
);

export default {
  async fetch(
    request: Request,
    env: WorkerEnv,
    ctx: ExecutionContext,
  ): Promise<Response> {
    return await withRuntime(
      env,
      async () => await app.fetch(request, env),
      ctx,
    );
  },
};
