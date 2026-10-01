import { HttpRequest } from "./http";
import { Context } from "../middlewares/context";

export type MonkeyRequest<
  TQuery = undefined,
  TBody = undefined,
  TParams = undefined,
> = {
  query: Readonly<TQuery>;
  body: Readonly<TBody>;
  params: Readonly<TParams>;
  ctx: Readonly<Context>;
  raw: Readonly<HttpRequest>;
};
