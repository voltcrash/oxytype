import { RequireConfiguration } from "@oxytype/contracts/require-configuration/index";
import { Configuration } from "@oxytype/schemas/configuration";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { HttpRequest } from "../../src/api/http";
import { invokeMiddleware } from "../__testData__/middleware";
import { verifyRequiredConfiguration } from "../../src/middlewares/configuration";
import MonkeyError from "../../src/utils/error";
import { enableMonkeyErrorExpects } from "../__testData__/monkey-error";

enableMonkeyErrorExpects();
describe("configuration middleware", async () => {
  const handler = verifyRequiredConfiguration();
  const next = vi.fn();

  beforeEach(() => {
    next.mockClear();
  });
  afterEach(() => {
    //next function must only be called once
    expect(next).toHaveBeenCalledOnce();
  });

  it("should pass without requireConfiguration", async () => {
    //GIVEN
    const req = { tsRestRoute: { metadata: {} } } as any;

    //WHEN
    await invokeMiddleware(handler, req, next);

    //THEN
    expect(next).toHaveBeenCalledWith();
  });
  it("should pass for enabled configuration", async () => {
    //GIVEN
    const req = givenRequest({ path: "maintenance" }, { maintenance: true });

    //WHEN
    await invokeMiddleware(handler, req, next);

    //THEN
    expect(next).toHaveBeenCalledWith();
  });
  it("should pass for enabled configuration with complex path", async () => {
    //GIVEN
    const req = givenRequest(
      { path: "users.xp.streak.enabled" },
      { users: { xp: { streak: { enabled: true } as any } as any } as any },
    );

    //WHEN
    await invokeMiddleware(handler, req, next);

    //THEN
    expect(next).toHaveBeenCalledWith();
  });
  it("should fail for disabled configuration", async () => {
    //GIVEN
    const req = givenRequest({ path: "maintenance" }, { maintenance: false });

    //WHEN
    await invokeMiddleware(handler, req, next);

    //THEN
    expect(next).toHaveBeenCalledWith(
      expect.toMatchMonkeyError(
        new MonkeyError(503, "This endpoint is currently unavailable."),
      ),
    );
  });
  it("should fail for disabled configuration and custom message", async () => {
    //GIVEN
    const req = givenRequest(
      { path: "maintenance", invalidMessage: "Feature not enabled." },
      { maintenance: false },
    );

    //WHEN
    await invokeMiddleware(handler, req, next);

    //THEN
    expect(next).toHaveBeenCalledWith(
      expect.toMatchMonkeyError(new MonkeyError(503, "Feature not enabled.")),
    );
  });
  it("should fail for invalid path", async () => {
    //GIVEN
    const req = givenRequest({ path: "invalid.path" as any }, {});

    //WHEN
    await invokeMiddleware(handler, req, next);

    //THEN
    expect(next).toHaveBeenCalledWith(
      expect.toMatchMonkeyError(
        new MonkeyError(500, 'Invalid configuration path: "invalid.path"'),
      ),
    );
  });
  it("should fail for undefined value", async () => {
    //GIVEN
    const req = givenRequest(
      { path: "admin.endpointsEnabled" },
      { admin: {} as any },
    );

    //WHEN
    await invokeMiddleware(handler, req, next);

    //THEN
    expect(next).toHaveBeenCalledWith(
      expect.toMatchMonkeyError(
        new MonkeyError(
          500,
          'Required configuration doesnt exist: "admin.endpointsEnabled"',
        ),
      ),
    );
  });
  it("should fail for null value", async () => {
    //GIVEN
    const req = givenRequest(
      { path: "admin.endpointsEnabled" },
      { admin: { endpointsEnabled: null as any } },
    );

    //WHEN
    await invokeMiddleware(handler, req, next);

    //THEN
    expect(next).toHaveBeenCalledWith(
      expect.toMatchMonkeyError(
        new MonkeyError(
          500,
          'Required configuration doesnt exist: "admin.endpointsEnabled"',
        ),
      ),
    );
  });
  it("should fail for non booean value", async () => {
    //GIVEN
    const req = givenRequest(
      { path: "admin.endpointsEnabled" },
      { admin: { endpointsEnabled: "disabled" as any } },
    );

    //WHEN
    await invokeMiddleware(handler, req, next);

    //THEN
    expect(next).toHaveBeenCalledWith(
      expect.toMatchMonkeyError(
        new MonkeyError(
          500,
          'Required configuration is not a boolean: "admin.endpointsEnabled"',
        ),
      ),
    );
  });
  it("should pass for multiple configurations", async () => {
    //GIVEN
    const req = givenRequest(
      [{ path: "maintenance" }, { path: "admin.endpointsEnabled" }],
      { maintenance: true, admin: { endpointsEnabled: true } },
    );

    //WHEN
    await invokeMiddleware(handler, req, next);

    //THEN
    expect(next).toHaveBeenCalledWith();
  });
  it("should fail for multiple configurations", async () => {
    //GIVEN
    const req = givenRequest(
      [
        { path: "maintenance", invalidMessage: "maintenance mode" },
        { path: "admin.endpointsEnabled", invalidMessage: "admin disabled" },
      ],
      { maintenance: true, admin: { endpointsEnabled: false } },
    );

    //WHEN
    await invokeMiddleware(handler, req, next);

    //THEN
    expect(next).toHaveBeenCalledWith(
      expect.toMatchMonkeyError(new MonkeyError(503, "admin disabled")),
    );
  });
});

function givenRequest(
  requireConfiguration: RequireConfiguration | RequireConfiguration[],
  configuration: Partial<Configuration>,
): HttpRequest {
  return {
    tsRestRoute: { metadata: { requireConfiguration } },
    ctx: { configuration: configuration },
  } as HttpRequest;
}
