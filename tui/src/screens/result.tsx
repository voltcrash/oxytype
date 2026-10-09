import { useRouter } from "../router/router";
import { useScreenKeys } from "../shell/screen-keys";
import { Placeholder } from "./placeholder";

export function ResultScreen() {
  const router = useRouter();

  useScreenKeys((event) => {
    if (event.name !== "return") return;
    event.preventDefault();
    router.replace("test");
  });

  return (
    <Placeholder title="result">
      <text>press enter to start the next test</text>
    </Placeholder>
  );
}
