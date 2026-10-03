import { MonkeyMail } from "@oxytype/schemas/users";
import { newId } from "./id";

type MonkeyMailOptions = Partial<Omit<MonkeyMail, "id" | "read">>;

export function buildMonkeyMail(options: MonkeyMailOptions): MonkeyMail {
  return {
    id: newId(),
    subject: options.subject ?? "",
    body: options.body ?? "",
    timestamp: options.timestamp ?? Date.now(),
    read: false,
    rewards: options.rewards ?? [],
  };
}
