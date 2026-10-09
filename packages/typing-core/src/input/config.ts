import { Config } from "@oxytype/schemas/configs";
export type InputConfig = Pick<
  Config,
  | "mode"
  | "language"
  | "strictSpace"
  | "difficulty"
  | "stopOnError"
  | "deleteOnError"
  | "quickEnd"
  | "minBurst"
  | "minBurstCustomSpeed"
  | "freedomMode"
  | "confidenceMode"
  | "blindMode"
  | "codeUnindentOnBackspace"
>;
