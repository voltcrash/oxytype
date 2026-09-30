import { build, Plugin, ViteDevServer } from "vite";
import solidPlugin from "vite-plugin-solid";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

type Renderer = typeof import("../src/ts/standalone-renderer").renderStandalone;
const pages = new Set([
  "/email-handler.html",
  "/404.html",
  "/privacy-policy.html",
  "/terms-of-service.html",
  "/security-policy.html",
]);

export function standaloneHtml(): Plugin {
  let server: ViteDevServer | undefined;
  let renderer: Renderer | undefined;
  const frontend = fileURLToPath(new URL("..", import.meta.url));
  return {
    name: "standalone-solid-html",
    configureServer(devServer) {
      server = devServer;
    },
    async buildStart() {
      if (server !== undefined) return;
      const output = path.join(frontend, ".standalone-generated");
      await build({
        configFile: false,
        root: path.join(frontend, "src"),
        plugins: [solidPlugin({ ssr: true, hot: false })],
        build: {
          ssr: path.join(frontend, "src/ts/standalone-renderer.tsx"),
          outDir: output,
          emptyOutDir: true,
          rolldownOptions: { output: { entryFileNames: "renderer.mjs" } },
        },
      });
      const rendererUrl = pathToFileURL(path.join(output, "renderer.mjs"));
      rendererUrl.searchParams.set("t", Date.now().toString());
      const module = (await import(rendererUrl.href)) as {
        renderStandalone: Renderer;
      };
      renderer = module.renderStandalone;
    },
    transformIndexHtml: {
      order: "pre",
      async handler(html, context) {
        if (!pages.has(context.path)) return html;
        let render = renderer;
        if (server !== undefined) {
          const module = (await server.ssrLoadModule(
            "/ts/standalone-renderer.tsx",
          )) as { renderStandalone: Renderer };
          render = module.renderStandalone;
        }
        if (render === undefined) {
          throw new Error("Standalone renderer is not ready");
        }
        const rendered = render(context.path);
        return html
          .replace("</head>", `${rendered.hydrationScript}</head>`)
          .replace(/(<div id="app"[^>]*>)(<\/div>)/, `$1${rendered.html}$2`);
      },
    },
  };
}
