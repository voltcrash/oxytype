import { useConfig } from "../config/store";
import { useRouter } from "../router/router";
import { useScreenKeys } from "../shell/screen-keys";
import { Placeholder } from "./placeholder";

export function TestScreen() {
  const router = useRouter();
  const { config } = useConfig();
  const amount = (): string => {
    if (config.mode === "time") return `${config.time}s`;
    if (config.mode === "words") return `${config.words} words`;
    return config.mode;
  };

  useScreenKeys((event) => {
    if (event.name !== "return") return;
    event.preventDefault();
    router.push("result");
  });

  return (
    <Placeholder title="typing test">
      <text>
        {amount()} · {config.language}
      </text>
      <text>press enter to finish the placeholder test</text>
    </Placeholder>
  );
}
