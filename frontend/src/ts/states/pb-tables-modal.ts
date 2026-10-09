import { createSignal } from "solid-js";
import { Client, Mode, PersonalBests } from "@oxytype/schemas/shared";

import { showModal } from "./modals";

const [pbTablesMode, setPbTablesMode] = createSignal<Mode>("time");
const [pbTablesBests, setPbTablesBests] =
  createSignal<Partial<PersonalBests>>();
const [pbTablesClient, setPbTablesClient] = createSignal<Client>("web");

export { pbTablesMode, pbTablesBests, pbTablesClient };

export function showPbTablesModal(
  mode: Mode,
  bests?: Partial<PersonalBests>,
  client: Client = "web",
): void {
  setPbTablesMode(mode);
  setPbTablesBests(bests);
  setPbTablesClient(client);
  showModal("PbTables");
}
