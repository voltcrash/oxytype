import { Client } from "@oxytype/schemas/shared";
import { cleanup, fireEvent, render } from "@solidjs/testing-library";
import { createSignal } from "solid-js";
import { afterEach, expect, it } from "vite-plus/test";

import { ClientToggle } from "../../../src/ts/components/common/ClientToggle";

afterEach(cleanup);
it("exposes native radio choices and follows the selected client", () => {
  const [client, setClient] = createSignal<Client>("web");
  const screen = render(() => (
    <ClientToggle value={client()} onChange={setClient} />
  ));
  expect(screen.getByRole("group", { name: "typing client" })).toBeVisible();
  const web = screen.getByRole("radio", { name: "Web" });
  const tui = screen.getByRole("radio", { name: "TUI" });
  expect(web).toBeChecked();
  expect(tui).not.toBeChecked();
  fireEvent.click(tui);
  expect(client()).toBe("tui");
  expect(tui).toBeChecked();
  expect(web).not.toBeChecked();
  setClient("web");
  expect(web).toBeChecked();
});
it("keeps independently mounted radio groups separate", () => {
  const screen = render(() => (
    <>
      <ClientToggle value="web" onChange={() => undefined} />
      <ClientToggle value="tui" onChange={() => undefined} />
    </>
  ));
  const radios = screen.getAllByRole("radio") as HTMLInputElement[];
  expect(radios[0]?.name).toBe(radios[1]?.name);
  expect(radios[2]?.name).toBe(radios[3]?.name);
  expect(radios[0]?.name).not.toBe(radios[2]?.name);
});
