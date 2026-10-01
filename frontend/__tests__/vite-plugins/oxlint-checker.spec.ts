import { EventEmitter } from "node:events";
import { afterEach, expect, it, vi } from "vite-plus/test";
import type { ViteDevServer } from "vite";

vi.mock("child_process", async (importOriginal) => {
  const actual = await importOriginal<typeof import("child_process")>();
  const spawn = vi.fn();
  return { ...actual, spawn, execSync: vi.fn(), default: { ...actual, spawn } };
});

import { spawn } from "child_process";
import { oxlintChecker } from "../../vite-plugins/oxlint-checker";

afterEach(() => vi.restoreAllMocks());

it("counts agent diagnostics and passes the required output format to both lint passes", async () => {
  const children: (EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    kill: ReturnType<typeof vi.fn>;
  })[] = [];
  vi.mocked(spawn).mockImplementation(() => {
    const child = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
      kill: vi.fn(),
    });
    children.push(child);
    return child as unknown as ReturnType<typeof spawn>;
  });
  const send = vi.fn();
  const plugin = oxlintChecker();
  const configure = plugin.configureServer;
  if (typeof configure !== "function") throw new Error("Missing server hook");
  await configure.call(
    {} as never,
    {
      ws: { send, on: vi.fn() },
      watcher: { on: vi.fn() },
    } as unknown as ViteDevServer,
  );
  expect(spawn).toHaveBeenLastCalledWith(
    "pnpm",
    ["exec", "vp", "lint", ".", "--format", "agent"],
    expect.any(Object),
  );
  children[0]?.emit("close", 0);
  await vi.waitFor(() => expect(children).toHaveLength(2));
  expect(spawn).toHaveBeenLastCalledWith(
    "pnpm",
    [
      "exec",
      "vp",
      "lint",
      ".",
      "--format",
      "agent",
      "--type-check",
      "--type-aware",
    ],
    expect.any(Object),
  );
  children[1]?.stdout.emit(
    "data",
    Buffer.from(
      "src/file.ts:3:4: error TS0001: example\nsrc/file.ts:5:6: warning rule: example\n",
    ),
  );
  children[1]?.emit("close", 1);
  await vi.waitFor(() =>
    expect(send).toHaveBeenLastCalledWith(
      "vite-plugin-oxlint",
      expect.objectContaining({
        errorCount: 1,
        warningCount: 1,
        running: false,
      }),
    ),
  );
});
