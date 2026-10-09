import { Client, ClientSchema } from "@oxytype/schemas/shared";
import { useLocation } from "@solidjs/router";
import { Accessor } from "solid-js";

import { replaceUrl } from "../navigation/navigation";

export function useClientSelection(): [
  Accessor<Client>,
  (client: Client) => void,
] {
  const location = useLocation();
  const client = (): Client => {
    const parsed = ClientSchema.safeParse(
      new URLSearchParams(location.search).get("client"),
    );
    return parsed.success ? parsed.data : "web";
  };
  const select = (value: Client): void => {
    const params = new URLSearchParams(location.search);
    params.set("client", value);
    void replaceUrl(
      `${location.pathname}?${params.toString()}${location.hash}`,
    );
  };
  return [client, select];
}
