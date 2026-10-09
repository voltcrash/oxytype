import { useRouter } from "../router/router";
import { useScreenKeys } from "../shell/screen-keys";
import { Placeholder } from "./placeholder";

export function TestScreen() {
  const router = useRouter();

  useScreenKeys((event) => {
    if (event.name !== "return") return;
    event.preventDefault();
    router.push("result");
  });

  return (
    <Placeholder title="typing test">
      <text>press enter to finish the placeholder test</text>
    </Placeholder>
  );
}
