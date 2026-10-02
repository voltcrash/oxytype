// import joi from "joi";

import * as AdminController from "../controllers/admin";
import { adminContract } from "@oxytype/contracts/admin";
import { initServer } from "../hono-adapter";
import { callController } from "../ts-rest-adapter";

const s = initServer();
export default s.router(adminContract, {
  test: {
    handler: async (r) => callController(AdminController.test)(r),
  },
  toggleBan: {
    handler: async (r) => callController(AdminController.toggleBan)(r),
  },
  clearStreakHourOffset: {
    handler: async (r) =>
      callController(AdminController.clearStreakHourOffset)(r),
  },
  deleteUser: {
    handler: async (r) => callController(AdminController.deleteUser)(r),
  },
  acceptReports: {
    handler: async (r) => callController(AdminController.acceptReports)(r),
  },
  rejectReports: {
    handler: async (r) => callController(AdminController.rejectReports)(r),
  },
});
