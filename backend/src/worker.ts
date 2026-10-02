import { consumeBatch, scheduled } from "./runtime/tasks";
import type {
  ExecutionContext,
  MessageBatch,
  ScheduledController,
} from "@cloudflare/workers-types";
import { withRuntime, type WorkerEnv } from "./runtime/env";
import { buildApp } from "./app";
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
    return await withRuntime(
      env,
      async () => {
        const url = new URL(request.url);
        if (url.pathname === "/api" || url.pathname.startsWith("/api/")) {
          url.pathname = url.pathname.slice(4) || "/";
        }
        return await buildApp().fetch(new Request(url, request), env);
      },
      ctx,
    );
  },
};
