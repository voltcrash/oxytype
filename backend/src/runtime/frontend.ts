import type { WorkerEnv } from "./env";

// Build output names content-hashed files `name.<8 char hash>.ext`.
const HASHED_ASSET =
  /^\/(?:js|css|webfonts)\/[^/]+\.[\w-]{8}\.(?:js|css|woff2)$/;
// Language lists are requested as `/languages/name.json?v=<content hash>`.
const VERSIONED_LANGUAGE = /^\/languages\/[^/]+\.json$/;

/** Keep public frontend files separate from backend-only deployment assets. */
export async function serveFrontend(
  request: Request,
  assets: WorkerEnv["ASSETS"],
): Promise<Response> {
  if (assets === undefined) {
    return new Response("Frontend unavailable", { status: 503 });
  }
  if (!["GET", "HEAD"].includes(request.method)) {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD" },
    });
  }
  const url = new URL(request.url);
  const path = url.pathname;
  // Encoded separators/dot segments must not escape the public asset prefix.
  if (/%(?:2e|2f|5c)/i.test(path)) {
    return new Response("Not found", { status: 404 });
  }
  const fetchAsset = async (pathname: string): Promise<Response> => {
    url.pathname = `/site${pathname}`;
    return (await assets.fetch(url.toString(), {
      method: request.method,
      headers: Object.fromEntries(request.headers),
    })) as unknown as Response;
  };
  let response = await fetchAsset(path === "/" ? "/index.html" : path);
  if (response.status === 404 && !/\.[^/]+$/.test(path)) {
    response = await fetchAsset(`${path.replace(/\/$/, "")}.html`);
    if (
      response.status === 404 &&
      request.headers.get("accept")?.includes("text/html")
    ) {
      response = await fetchAsset("/index.html");
    }
  }
  if (response.headers.get("content-type")?.includes("text/html")) {
    response = new Response(response.body, response);
    response.headers.set("Cache-Control", "no-store");
  } else if (
    response.ok &&
    (HASHED_ASSET.test(path) ||
      (VERSIONED_LANGUAGE.test(path) && url.searchParams.has("v")))
  ) {
    response = new Response(response.body, response);
    response.headers.set(
      "Cache-Control",
      "public, max-age=31536000, immutable",
    );
  }
  return response;
}
