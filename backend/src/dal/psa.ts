import type { PSA } from "@oxytype/schemas/psas";
import { database } from "../db/client";
import { psas } from "../db/schema";
import type { WithObjectId } from "../utils/misc";
export type DBPSA = WithObjectId<PSA>;
export async function get(): Promise<DBPSA[]> {
  return (await database().select().from(psas)).map(
    (row) => ({ ...row.data, _id: row.id }) as unknown as DBPSA,
  );
}
