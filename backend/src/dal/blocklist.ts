import { createHash } from "node:crypto";
import { and, eq, or } from "drizzle-orm";
import type { User } from "@oxytype/schemas/users";
import { binding, database, statement } from "../db/client";
import { blocklist } from "../db/schema";
type Properties = Pick<User, "name" | "email">;
function entries(user: Partial<Properties>): { kind: string; hash: string }[] {
  return Object.entries(user)
    .filter(([, value]) => value !== undefined)
    .map(([kind, value]) => ({ kind, hash: hash(value) }));
}
export function hash(value: string): string {
  return createHash("sha256").update(value.toLocaleLowerCase()).digest("hex");
}
export async function add(user: Properties): Promise<void> {
  await binding().batch(
    entries(user).map((entry) =>
      statement(
        "INSERT INTO blocklist(kind,hash,timestamp) VALUES(?,?,?) ON CONFLICT(kind,hash) DO UPDATE SET timestamp=excluded.timestamp",
        entry.kind,
        entry.hash,
        Date.now(),
      ),
    ),
  );
}
export async function remove(user: Partial<Properties>): Promise<void> {
  const filter = entries(user);
  if (!filter.length) return;
  await database()
    .delete(blocklist)
    .where(
      or(
        ...filter.map((entry) =>
          and(eq(blocklist.kind, entry.kind), eq(blocklist.hash, entry.hash)),
        ),
      ),
    );
}
export async function contains(user: Partial<Properties>): Promise<boolean> {
  const filter = entries(user);
  if (!filter.length) return false;
  return (
    (
      await database()
        .select()
        .from(blocklist)
        .where(
          or(
            ...filter.map((entry) =>
              and(
                eq(blocklist.kind, entry.kind),
                eq(blocklist.hash, entry.hash),
              ),
            ),
          ),
        )
        .limit(1)
    ).length > 0
  );
}
export async function createIndicies(): Promise<void> {
  /* Applied by D1 migrations. */
}
