import type { ClientQuery } from "@oxytype/schemas/shared";
import {
  GetSpeedHistogramQuery,
  GetSpeedHistogramResponse,
  GetTypingStatsResponse,
} from "@oxytype/contracts/public";
import * as PublicDAL from "../../dal/public";
import { MonkeyResponse } from "../../utils/monkey-response";
import { MonkeyRequest } from "../types";

export async function getSpeedHistogram(
  req: MonkeyRequest<GetSpeedHistogramQuery>,
): Promise<GetSpeedHistogramResponse> {
  const { language, mode, mode2 } = req.query;
  const data = await PublicDAL.getSpeedHistogram(
    language,
    mode,
    mode2,
    req.query.client,
  );
  return new MonkeyResponse("Public speed histogram retrieved", data);
}

export async function getTypingStats(
  req: MonkeyRequest<ClientQuery>,
): Promise<GetTypingStatsResponse> {
  const data = await PublicDAL.getTypingStats(req.query?.client);
  return new MonkeyResponse("Public typing stats retrieved", data);
}
