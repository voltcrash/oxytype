import { and, eq, count } from "drizzle-orm";
import { database, statement } from "../db/client";
import { apeKeys } from "../db/schema";
import MonkeyError from "../utils/error";
import type { ApeKey } from "@oxytype/schemas/ape-keys";
import type { StoredId } from "../utils/id";
export type DBApeKey = ApeKey & {
  _id: StoredId;
  uid: string;
  hash: string;
  useCount: number;
};
function unpack(row: typeof apeKeys.$inferSelect): DBApeKey {
  return { ...row, _id: row.id, lastUsedOn: row.lastUsedOn ?? undefined };
}
export async function getApeKeys(uid: string): Promise<DBApeKey[]> {
  return (
    await database().select().from(apeKeys).where(eq(apeKeys.uid, uid))
  ).map(unpack);
}
export async function getApeKey(keyId: string): Promise<DBApeKey | null> {
  const row = await database()
    .select()
    .from(apeKeys)
    .where(eq(apeKeys.id, keyId))
    .get();
  return row ? unpack(row) : null;
}
export async function countApeKeysForUser(uid: string): Promise<number> {
  return (
    (
      await database()
        .select({ count: count() })
        .from(apeKeys)
        .where(eq(apeKeys.uid, uid))
        .get()
    )?.count ?? 0
  );
}
export async function addApeKey(key: DBApeKey): Promise<string> {
  await database().insert(apeKeys).values({
    id: key._id.toString(),
    uid: key.uid,
    name: key.name,
    enabled: key.enabled,
    hash: key.hash,
    createdOn: key.createdOn,
    modifiedOn: key.modifiedOn,
    lastUsedOn: key.lastUsedOn,
    useCount: key.useCount,
  });
  return key._id.toString();
}
export async function editApeKey(
  uid: string,
  keyId: string,
  name?: string,
  enabled?: boolean,
): Promise<void> {
  if (name === undefined && enabled === undefined) return;
  const result = await database()
    .update(apeKeys)
    .set({ name, enabled, modifiedOn: Date.now() })
    .where(and(eq(apeKeys.id, keyId), eq(apeKeys.uid, uid)));
  if (!result.meta.changes) throw new MonkeyError(404, "ApeKey not found");
}
export async function updateLastUsedOn(
  uid: string,
  keyId: string,
): Promise<void> {
  const result = await statement(
    "UPDATE ape_keys SET last_used_on=?,use_count=use_count+1 WHERE id=? AND uid=? AND enabled=1",
    Date.now(),
    keyId,
    uid,
  ).run();
  if (!result.meta.changes) throw new MonkeyError(404, "ApeKey not found");
}
export async function upgradeHash(
  uid: string,
  keyId: string,
  hash: string,
): Promise<void> {
  await database()
    .update(apeKeys)
    .set({ hash })
    .where(and(eq(apeKeys.id, keyId), eq(apeKeys.uid, uid)));
}
export async function deleteApeKey(uid: string, keyId: string): Promise<void> {
  const result = await database()
    .delete(apeKeys)
    .where(and(eq(apeKeys.id, keyId), eq(apeKeys.uid, uid)));
  if (!result.meta.changes) throw new MonkeyError(404, "ApeKey not found");
}
export async function deleteAllApeKeys(uid: string): Promise<void> {
  await database().delete(apeKeys).where(eq(apeKeys.uid, uid));
}
