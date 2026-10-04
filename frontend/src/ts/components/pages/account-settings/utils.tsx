import { splitProps } from "solid-js";

import { cn } from "../../../utils/cn";
import { Button, ButtonProps } from "../../common/Button";
import {
  SearchableSetting,
  SearchableSettingProps,
} from "../settings/SearchableSetting";

export function Section(
  props: Omit<
    SearchableSettingProps,
    "breakpoints" | "inputs" | "key" | "showDeepLink"
  > & {
    key: string;
    button?: ButtonProps;
  },
) {
  const [local, settingsProps] = splitProps(props, ["button"]);
  return (
    <SearchableSetting
      {...(settingsProps as SearchableSettingProps)}
      resetKeys={[]}
      breakpoints="narrow"
      inputs={
        local.button !== undefined ? (
          <Button {...local.button} class={cn("w-full", local.button?.class)} />
        ) : undefined
      }
    />
  );
}
