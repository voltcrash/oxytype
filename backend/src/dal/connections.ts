import { and, eq, or, inArray } from "drizzle-orm";
import type {
  Connection,
  ConnectionStatus,
} from "@oxytype/schemas/connections";
import { database, statement, binding, isUniqueViolation } from "../db/client";
import { connections } from "../db/schema";
import { newId } from "../utils/id";
import MonkeyError from "../utils/error";
export type DBConnection = Connection & { key: string };
function unpack(row: typeof connections.$inferSelect): DBConnection {
  return { ...row, _id: row.id };
}
export async function getConnections(options: {
  initiatorUid?: string;
  receiverUid?: string;
  status?: ConnectionStatus[];
}): Promise<DBConnection[]> {
  if (options.initiatorUid === undefined && options.receiverUid === undefined) {
    throw new Error("Missing filter");
  }
  return (
    await database()
      .select()
      .from(connections)
      .where(
        and(
          or(
            options.initiatorUid === undefined
              ? undefined
              : eq(connections.initiatorUid, options.initiatorUid),
            options.receiverUid === undefined
              ? undefined
              : eq(connections.receiverUid, options.receiverUid),
          ),
          options.status === undefined
            ? undefined
            : inArray(connections.status, options.status),
        ),
      )
  ).map(unpack);
}
export async function create(
  initiator: { uid: string; name: string },
  receiver: { uid: string; name: string },
  maxPerUser: number,
): Promise<DBConnection> {
  const key = [initiator.uid, receiver.uid].sort().join("/");
  const created: DBConnection = {
    _id: newId(),
    key,
    initiatorUid: initiator.uid,
    initiatorName: initiator.name,
    receiverUid: receiver.uid,
    receiverName: receiver.name,
    lastModified: Date.now(),
    status: "pending",
  };
  try {
    const result = await statement(
      "INSERT INTO connections(id,key,initiator_uid,initiator_name,receiver_uid,receiver_name,last_modified,status) SELECT ?,?,?,?,?,?,?,'pending' WHERE (SELECT count(*) FROM connections WHERE initiator_uid=?) < ?",
      created._id,
      key,
      initiator.uid,
      initiator.name,
      receiver.uid,
      receiver.name,
      created.lastModified,
      initiator.uid,
      maxPerUser,
    ).run();
    if (!result.meta.changes) {
      throw new MonkeyError(
        409,
        "Maximum number of connections reached",
        "create connection request",
      );
    }
    return created;
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    const existing = await database()
      .select()
      .from(connections)
      .where(eq(connections.key, key))
      .get();
    const message =
      existing?.status === "accepted"
        ? "Connection already exists"
        : existing?.status === "pending"
          ? "Connection request already sent"
          : existing?.status === "blocked"
            ? existing.initiatorUid === initiator.uid
              ? "Connection blocked by initiator"
              : "Connection blocked by receiver"
            : "Duplicate connection";
    throw new MonkeyError(409, message);
  }
}
export async function updateStatus(
  receiverUid: string,
  id: string,
  status: ConnectionStatus,
): Promise<void> {
  const result = await database()
    .update(connections)
    .set({ status, lastModified: Date.now() })
    .where(
      and(eq(connections.id, id), eq(connections.receiverUid, receiverUid)),
    );
  if (!result.meta.changes) {
    throw new MonkeyError(404, "No permission or connection not found");
  }
}
export async function deleteById(uid: string, id: string): Promise<void> {
  const result = await statement(
    "DELETE FROM connections WHERE id=? AND (receiver_uid=? OR (initiator_uid=? AND status IN ('accepted','pending')))",
    id,
    uid,
    uid,
  ).run();
  if (!result.meta.changes) {
    throw new MonkeyError(404, "No permission or connection not found");
  }
}
export async function updateName(uid: string, name: string): Promise<void> {
  await binding().batch([
    statement(
      "UPDATE connections SET initiator_name=? WHERE initiator_uid=?",
      name,
      uid,
    ),
    statement(
      "UPDATE connections SET receiver_name=? WHERE receiver_uid=?",
      name,
      uid,
    ),
  ]);
}
export async function deleteByUid(uid: string): Promise<void> {
  await database()
    .delete(connections)
    .where(
      or(eq(connections.initiatorUid, uid), eq(connections.receiverUid, uid)),
    );
}
export async function getFriendsUids(uid: string): Promise<string[]> {
  return [
    ...new Set([
      uid,
      ...(
        await getConnections({
          initiatorUid: uid,
          receiverUid: uid,
          status: ["accepted"],
        })
      ).flatMap((row) => [row.initiatorUid, row.receiverUid]),
    ]),
  ];
}
export async function createIndicies(): Promise<void> {
  /* Applied by migrations. */
}
