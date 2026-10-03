import { consumeBatch, scheduled } from "./runtime/tasks";
import type {
  ExecutionContext,
  MessageBatch,
  ScheduledController,
} from "@cloudflare/workers-types";
import { withRuntime, type WorkerEnv } from "./runtime/env";
import { buildApp } from "./app";
import { serveFrontend } from "./runtime/frontend";
export default {
  async queue(
    batch: MessageBatch,
    env: WorkerEnv,
    ctx: ExecutionContext,
  ): Promise<void> {
    await withRuntime(env, async () => await consumeBatch(batch), ctx);
  },
  async scheduled(
    controller: ScheduledController,
    env: WorkerEnv,
    ctx: ExecutionContext,
  ): Promise<void> {
    await withRuntime(
      env,
      async () => await scheduled(controller.scheduledTime),
      ctx,
    );
  },
  async fetch(
    request: Request,
    env: WorkerEnv,
    ctx: ExecutionContext,
  ): Promise<Response> {
    const url = new URL(request.url);
    const isApi = url.pathname === "/api" || url.pathname.startsWith("/api/");
    if (env.SERVE_FRONTEND === "true" && !isApi) {
      return await serveFrontend(request, env.ASSETS);
    }
    return await withRuntime(
      env,
      async () => {
        if (isApi) {
          url.pathname = url.pathname.slice(4) || "/";
        }
        return await buildApp().fetch(new Request(url, request), env);
      },
      ctx,
    );
  },
};
