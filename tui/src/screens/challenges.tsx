import { useTerminalDimensions } from "@opentui/solid";
import { getChallenges } from "@oxytype/challenges";
import { createMemo } from "solid-js";

import { useRouter } from "../router/router";
import { useScreenKeys } from "../shell/screen-keys";
import { useTypingTest } from "../test/typing-test";
import { useTheme } from "../theme/theme";
import { createAction } from "../ui/actions";
import { KeyHints, parseHints } from "../ui/key-hints";
import { ListView } from "../ui/list-view";
import { createSelection } from "../ui/selection";
import { createTextField } from "../ui/text-field";
import { TextInput } from "../ui/text-input";

export function ChallengesScreen() {
  const test = useTypingTest();
  const router = useRouter();
  const theme = useTheme();
  const dimensions = useTerminalDimensions();
  const action = createAction();
  const search = createTextField();
  const items = createMemo(() =>
    getChallenges().filter((it) =>
      `${it.display} ${it.description} ${it.category}`
        .toLowerCase()
        .includes(search.value().toLowerCase()),
    ),
  );
  const selection = createSelection(() => items().length);
  const selected = () => items()[selection.index()];
  useScreenKeys((event) => {
    if (event.eventType === "release") return;
    if (event.name === "return" && selected() !== undefined) {
      event.preventDefault();
      const challenge = selected();
      if (challenge !== undefined) {
        void action.run(async () => {
          await test.loadChallenge(challenge.name);
          router.replace("test");
        });
      }
    } else if (event.name === "escape" && search.value() !== "") {
      event.preventDefault();
      search.set("");
      selection.set(0);
    } else if (!selection.handleKey(event) && search.handleKey(event)) {
      selection.set(0);
    }
  });
  return (
    <box flexDirection="column" gap={1}>
      <text fg={theme().colors.main}>
        challenges · {action.busy() ? "loading…" : "type to search"}
      </text>
      <TextInput field={search} placeholder="search challenges" />
      <ListView
        items={items()}
        selected={selection.index()}
        height={Math.max(1, dimensions().height - 16)}
        render={(challenge) => (
          <text fg={theme().colors.text}>
            {challenge.display} · {challenge.category}
          </text>
        )}
      />
      <text fg={theme().colors.sub} wrapMode="word" height={3}>
        {selected()?.description}
      </text>
      <text fg={theme().colors.sub}>
        scripts download once · Wingdings requires a browser
      </text>
      <KeyHints hints={parseHints("↑↓ select · enter start")} />
    </box>
  );
}
