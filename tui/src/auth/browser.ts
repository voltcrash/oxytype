import { spawn } from "node:child_process";

/** No shell interpolation; failures leave the displayed link available. */
export async function openBrowser(
  url: string,
  platform = process.platform,
): Promise<void> {
  const parsed = new URL(url);
  if (!["https:", "http:"].includes(parsed.protocol)) {
    throw new Error("Invalid browser URL");
  }
  const command =
    platform === "darwin"
      ? "open"
      : platform === "win32"
        ? "rundll32"
        : "xdg-open";
  const args =
    platform === "win32"
      ? ["url.dll,FileProtocolHandler", parsed.href]
      : [parsed.href];
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: "ignore" });
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0 ? resolve() : reject(new Error("Could not open browser")),
    );
  });
}
