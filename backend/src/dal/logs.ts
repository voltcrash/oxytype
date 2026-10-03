import { eq } from "drizzle-orm";
import { database, encode, statement } from "../db/client";
import { logs } from "../db/schema";
import { stage } from "../db/mutation";
import { newId } from "../utils/id";
async function insert(
  event: string,
  message: string | Record<string, unknown>,
  uid: string,
  important: boolean,
): Promise<void> {
  console.info(JSON.stringify({ event, uid, message }));
  await stage(
    statement(
      "INSERT INTO audit_logs(id,uid,event,timestamp,important,data) VALUES(?,?,?,?,?,?)",
      newId(),
      uid,
      event,
      Date.now(),
      Number(important),
      encode({ message }),
    ),
  );
}
export async function addLog(
  event: string,
  message: string | Record<string, unknown>,
  uid = "",
): Promise<void> {
  await insert(event, message, uid, false);
}
export async function addImportantLog(
  event: string,
  message: string | Record<string, unknown>,
  uid = "",
): Promise<void> {
  await insert(event, message, uid, true);
}
export async function deleteUserLogs(uid: string): Promise<void> {
  await database().delete(logs).where(eq(logs.uid, uid));
}
