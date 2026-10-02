// Drizzle's D1 driver refers to these global names. Keep DOM/Node types independent.
import type * as Cloudflare from "@cloudflare/workers-types";
declare global {
  type D1Database = Cloudflare.D1Database;
  type D1PreparedStatement = Cloudflare.D1PreparedStatement;
  type D1Result<T = unknown> = Cloudflare.D1Result<T>;
  type D1Response = Cloudflare.D1Response;
}
