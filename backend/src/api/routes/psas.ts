import { psasContract } from "@oxytype/contracts/psas";
import { initServer } from "../hono-adapter";
import * as PsaController from "../controllers/psa";
import { callController } from "../ts-rest-adapter";
import { recordClientVersion } from "../../middlewares/utility";

const s = initServer();
export default s.router(psasContract, {
  get: {
    middleware: [recordClientVersion()],
    handler: async (r) => callController(PsaController.getPsas)(r),
  },
});
