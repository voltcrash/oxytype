import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
} from "vite-plus/test";
import * as AuthUtils from "../../src/utils/auth";
import * as Auth from "../../src/middlewares/auth";
import { AuthenticatedSession } from "../../src/utils/auth";
import { HttpRequest } from "../../src/api/http";
import { invokeMiddleware } from "../__testData__/middleware";
import { getCachedConfiguration } from "../../src/init/configuration";
import * as ApeKeys from "../../src/dal/ape-keys";
import { newId } from "../../src/utils/id";
import { hashApeKey } from "../../src/utils/ape-key-hash";
import MonkeyError from "../../src/utils/error";
import * as Misc from "../../src/utils/misc";
import {
  EndpointMetadata,
  RequestAuthenticationOptions,
} from "@oxytype/contracts/util/api";
import * as Prometheus from "../../src/utils/prometheus";
import { enableMonkeyErrorExpects } from "../__testData__/monkey-error";
import { Context } from "../../src/middlewares/context";

enableMonkeyErrorExpects();
const mockDecodedToken: AuthenticatedSession = {
  uid: "123456789",
  email: "newuser@mail.com",
  createdAt: new Date(0),
};

vi.spyOn(AuthUtils, "verifySession").mockResolvedValue(mockDecodedToken);

const mockApeKey = {
  _id: newId(),
  uid: "123",
  name: "test",
  hash: hashApeKey("key"),
  createdOn: Date.now(),
  modifiedOn: Date.now(),
  lastUsedOn: Date.now(),
  useCount: 0,
  enabled: true,
};
vi.spyOn(ApeKeys, "getApeKey").mockResolvedValue(mockApeKey);
vi.spyOn(ApeKeys, "updateLastUsedOn").mockResolvedValue();
const isDevModeMock = vi.spyOn(Misc, "isDevEnvironment");
let mockRequest: Partial<HttpRequest>;
let nextFunction: ReturnType<typeof vi.fn<(error?: unknown) => unknown>>;

describe("middlewares/auth", () => {
  beforeEach(async () => {
    isDevModeMock.mockReturnValue(true);
    let config = await getCachedConfiguration(true);
    config.apeKeys.acceptKeys = true;

    mockRequest = {
      path: "/api/v1",
      headers: {
        authorization: "Bearer 123456789",
      },
      ctx: {
        configuration: config,
        decodedToken: {
          type: "None",
          uid: "",
          email: "",
        },
      },
    };
    nextFunction = vi.fn((error) => {
      if (error instanceof Error) {
        throw error;
      }
      return "Next function called";
    });
  });

  afterEach(() => {
    isDevModeMock.mockClear();
  });

  describe("authenticateTsRestRequest", () => {
    const prometheusRecordAuthTimeMock = vi.spyOn(Prometheus, "recordAuthTime");
    const prometheusIncrementAuthMock = vi.spyOn(Prometheus, "incrementAuth");

    beforeEach(() => {
      [prometheusIncrementAuthMock, prometheusRecordAuthTimeMock].forEach(
        (it) => it.mockClear(),
      );
    });

    it("should fail if token is not fresh", async () => {
      //GIVEN
      Date.now = vi.fn(() => 60001);
      const expectedError = new MonkeyError(
        401,
        "Unauthorized\nStack: This endpoint requires a fresh token",
      );

      //WHEN
      await expect(async () =>
        authenticate({}, { requireFreshToken: true }),
      ).rejects.toMatchMonkeyError(expectedError);

      //THEN

      expect(nextFunction).toHaveBeenLastCalledWith(
        expect.toMatchMonkeyError(expectedError),
      );
      expect(prometheusIncrementAuthMock).not.toHaveBeenCalled();
      expect(prometheusRecordAuthTimeMock).toHaveBeenCalledOnce();
    });
    it("should allow the request if token is fresh", async () => {
      //GIVEN
      Date.now = vi.fn(() => 10000);

      //WHEN
      const result = await authenticate({}, { requireFreshToken: true });

      //THEN
      const decodedToken = result.decodedToken;
      expect(decodedToken?.type).toBe("Bearer");
      expect(decodedToken?.email).toBe(mockDecodedToken.email);
      expect(decodedToken?.uid).toBe(mockDecodedToken.uid);
      expect(nextFunction).toHaveBeenCalledOnce();

      expect(prometheusIncrementAuthMock).toHaveBeenCalledWith("Bearer");
      expect(prometheusRecordAuthTimeMock).toHaveBeenCalledOnce();
    });
    it("should allow the request if apeKey is supported", async () => {
      //WHEN
      const result = await authenticate(
        { headers: { authorization: "ApeKey aWQua2V5" } },
        { acceptApeKeys: true },
      );

      //THEN
      const decodedToken = result.decodedToken;
      expect(decodedToken?.type).toBe("ApeKey");
      expect(decodedToken?.email).toBe("");
      expect(decodedToken?.uid).toBe("123");
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });
    it("should fail with apeKey if apeKey is not supported", async () => {
      //WHEN
      await expect(async () =>
        authenticate(
          { headers: { authorization: "ApeKey aWQua2V5" } },
          { acceptApeKeys: false },
        ),
      ).rejects.toThrow("This endpoint does not accept ApeKeys");

      //THEN
    });
    it("should fail with apeKey if apeKeys are disabled", async () => {
      //GIVEN

      (mockRequest.ctx as Context).configuration.apeKeys.acceptKeys = false;

      //WHEN
      await expect(async () =>
        authenticate(
          { headers: { authorization: "ApeKey aWQua2V5" } },
          { acceptApeKeys: false },
        ),
      ).rejects.toThrow("ApeKeys are not being accepted at this time");

      //THEN
    });
    it("should allow the request with authentation on public endpoint", async () => {
      //WHEN
      const result = await authenticate({}, { isPublic: true });

      //THEN
      const decodedToken = result.decodedToken;
      expect(decodedToken?.type).toBe("Bearer");
      expect(decodedToken?.email).toBe(mockDecodedToken.email);
      expect(decodedToken?.uid).toBe(mockDecodedToken.uid);
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });
    it("authenticates browser session cookies", async () => {
      const result = await authenticate(
        { headers: { cookie: "oxytype.session_token=signed-token" } },
        {},
      );
      expect(result.decodedToken).toMatchObject({
        type: "Session",
        uid: mockDecodedToken.uid,
      });
    });
    it("ignores unrelated cookies on public endpoints", async () => {
      const result = await authenticate(
        { headers: { cookie: "theme=dark" } },
        { isPublic: true },
      );
      expect(result.decodedToken?.type).toBe("None");
    });
    it("rejects stale sessions on sensitive cookie endpoints", async () => {
      vi.spyOn(AuthUtils, "verifySession").mockResolvedValueOnce({
        ...mockDecodedToken,
        createdAt: new Date(Date.now() - 120000),
      });
      await expect(
        authenticate(
          { headers: { cookie: "oxytype.session_token=stale" } },
          { requireFreshToken: true },
        ),
      ).rejects.toThrow("This endpoint requires a fresh token");
    });
    it("should allow the request without authentication on public endpoint", async () => {
      //WHEN
      const result = await authenticate({ headers: {} }, { isPublic: true });

      //THEN
      const decodedToken = result.decodedToken;
      expect(decodedToken?.type).toBe("None");
      expect(decodedToken?.email).toBe("");
      expect(decodedToken?.uid).toBe("");
      expect(nextFunction).toHaveBeenCalledTimes(1);

      expect(prometheusIncrementAuthMock).toHaveBeenCalledWith("None");
      expect(prometheusRecordAuthTimeMock).toHaveBeenCalledOnce();
    });
    it("should allow the request with apeKey on public endpoint", async () => {
      //WHEN
      const result = await authenticate(
        { headers: { authorization: "ApeKey aWQua2V5" } },
        { isPublic: true },
      );

      //THEN
      const decodedToken = result.decodedToken;
      expect(decodedToken?.type).toBe("ApeKey");
      expect(decodedToken?.email).toBe("");
      expect(decodedToken?.uid).toBe("123");
      expect(nextFunction).toHaveBeenCalledTimes(1);

      expect(prometheusIncrementAuthMock).toHaveBeenCalledWith("ApeKey");
      expect(prometheusRecordAuthTimeMock).toHaveBeenCalledOnce();
    });
    it("should allow request with Uid on dev", async () => {
      //WHEN
      const result = await authenticate({
        headers: { authorization: "Uid 123" },
      });

      //THEN
      const decodedToken = result.decodedToken;
      expect(decodedToken?.type).toBe("Bearer");
      expect(decodedToken?.email).toBe("");
      expect(decodedToken?.uid).toBe("123");
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });
    it("should allow request with Uid and email on dev", async () => {
      const result = await authenticate({
        headers: { authorization: "Uid 123|test@example.com" },
      });

      //THEN
      const decodedToken = result.decodedToken;
      expect(decodedToken?.type).toBe("Bearer");
      expect(decodedToken?.email).toBe("test@example.com");
      expect(decodedToken?.uid).toBe("123");
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });
    it("should fail request with Uid on non-dev", async () => {
      //GIVEN
      isDevModeMock.mockReturnValue(false);

      //WHEN / THEN
      await expect(async () =>
        authenticate({ headers: { authorization: "Uid 123" } }),
      ).rejects.toMatchMonkeyError(
        new MonkeyError(401, "Bearer type uid is not supported"),
      );
    });
    it("should fail without authentication", async () => {
      await expect(async () => authenticate({ headers: {} })).rejects.toThrow(
        "Unauthorized\nStack: endpoint: /api/v1 no authorization header found",
      );

      //THEH
      expect(prometheusIncrementAuthMock).not.toHaveBeenCalled();
      expect(prometheusRecordAuthTimeMock).toHaveBeenCalledWith(
        "None",
        "failure",
        expect.anything(),
        expect.anything(),
      );
    });
    it("should fail with empty authentication", async () => {
      await expect(async () =>
        authenticate({ headers: { authorization: "" } }),
      ).rejects.toThrow(
        "Unauthorized\nStack: endpoint: /api/v1 no authorization header found",
      );

      //THEH
      expect(prometheusIncrementAuthMock).not.toHaveBeenCalled();
      expect(prometheusRecordAuthTimeMock).toHaveBeenCalledWith(
        "",
        "failure",
        expect.anything(),
        expect.anything(),
      );
    });
    it("should fail with missing authentication token", async () => {
      await expect(async () =>
        authenticate({ headers: { authorization: "Bearer" } }),
      ).rejects.toThrow(
        "Missing authentication token\nStack: authenticateWithAuthHeader",
      );

      //THEH
      expect(prometheusIncrementAuthMock).not.toHaveBeenCalled();
      expect(prometheusRecordAuthTimeMock).toHaveBeenCalledWith(
        "Bearer",
        "failure",
        expect.anything(),
        expect.anything(),
      );
    });
    it("should fail with unknown authentication scheme", async () => {
      await expect(async () =>
        authenticate({ headers: { authorization: "unknown format" } }),
      ).rejects.toThrow(
        'Unknown authentication scheme\nStack: The authentication scheme "unknown" is not implemented',
      );

      //THEH
      expect(prometheusIncrementAuthMock).not.toHaveBeenCalled();
      expect(prometheusRecordAuthTimeMock).toHaveBeenCalledWith(
        "unknown",
        "failure",
        expect.anything(),
        expect.anything(),
      );
    });
    it("should record country if provided", async () => {
      const prometheusRecordRequestCountryMock = vi.spyOn(
        Prometheus,
        "recordRequestCountry",
      );

      await authenticate(
        { headers: { "cf-ipcountry": "gb" } },
        { isPublic: true },
      );

      //THEN
      expect(prometheusRecordRequestCountryMock).toHaveBeenCalledWith(
        "gb",
        expect.anything(),
      );
    });
    it("should allow the request with authentation on dev public endpoint", async () => {
      //WHEN
      const result = await authenticate({}, { isPublicOnDev: true });

      //THEN
      const decodedToken = result.decodedToken;
      expect(decodedToken?.type).toBe("Bearer");
      expect(decodedToken?.email).toBe(mockDecodedToken.email);
      expect(decodedToken?.uid).toBe(mockDecodedToken.uid);
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });
    it("should allow the request without authentication on dev public endpoint", async () => {
      //WHEN
      const result = await authenticate(
        { headers: {} },
        { isPublicOnDev: true },
      );

      //THEN
      const decodedToken = result.decodedToken;
      expect(decodedToken?.type).toBe("None");
      expect(decodedToken?.email).toBe("");
      expect(decodedToken?.uid).toBe("");
      expect(nextFunction).toHaveBeenCalledTimes(1);

      expect(prometheusIncrementAuthMock).toHaveBeenCalledWith("None");
      expect(prometheusRecordAuthTimeMock).toHaveBeenCalledOnce();
    });
    it("should allow the request with apeKey on dev public endpoint", async () => {
      //WHEN
      const result = await authenticate(
        { headers: { authorization: "ApeKey aWQua2V5" } },
        { acceptApeKeys: true, isPublicOnDev: true },
      );

      //THEN
      const decodedToken = result.decodedToken;
      expect(decodedToken?.type).toBe("ApeKey");
      expect(decodedToken?.email).toBe("");
      expect(decodedToken?.uid).toBe("123");
      expect(nextFunction).toHaveBeenCalledTimes(1);

      expect(prometheusIncrementAuthMock).toHaveBeenCalledWith("ApeKey");
      expect(prometheusRecordAuthTimeMock).toHaveBeenCalledOnce();
    });
    it("should allow with apeKey if apeKeys are disabled on dev public endpoint", async () => {
      //GIVEN
      (mockRequest.ctx as Context).configuration.apeKeys.acceptKeys = false;

      //WHEN
      const result = await authenticate(
        { headers: { authorization: "ApeKey aWQua2V5" } },
        { acceptApeKeys: true, isPublicOnDev: true },
      );

      //THEN
      const decodedToken = result.decodedToken;
      expect(decodedToken?.type).toBe("ApeKey");
      expect(decodedToken?.email).toBe("");
      expect(decodedToken?.uid).toBe("123");
      expect(nextFunction).toHaveBeenCalledTimes(1);

      expect(prometheusIncrementAuthMock).toHaveBeenCalledWith("ApeKey");
      expect(prometheusRecordAuthTimeMock).toHaveBeenCalledOnce();
    });
    it("should allow the request with authentation on dev public endpoint in production", async () => {
      //WHEN
      isDevModeMock.mockReturnValue(false);
      const result = await authenticate({}, { isPublicOnDev: true });

      //THEN
      const decodedToken = result.decodedToken;
      expect(decodedToken?.type).toBe("Bearer");
      expect(decodedToken?.email).toBe(mockDecodedToken.email);
      expect(decodedToken?.uid).toBe(mockDecodedToken.uid);
      expect(nextFunction).toHaveBeenCalledTimes(1);
    });
    it("should fail without authentication on dev public endpoint in production", async () => {
      //WHEN
      isDevModeMock.mockReturnValue(false);

      //THEN
      await expect(async () =>
        authenticate({ headers: {} }, { isPublicOnDev: true }),
      ).rejects.toThrow("Unauthorized");
    });
    it("should allow with apeKey on dev public endpoint in production", async () => {
      //WHEN
      isDevModeMock.mockReturnValue(false);
      const result = await authenticate(
        { headers: { authorization: "ApeKey aWQua2V5" } },
        { acceptApeKeys: true, isPublicOnDev: true },
      );

      //THEN
      const decodedToken = result.decodedToken;
      expect(decodedToken?.type).toBe("ApeKey");
      expect(decodedToken?.email).toBe("");
      expect(decodedToken?.uid).toBe("123");
      expect(nextFunction).toHaveBeenCalledTimes(1);

      expect(prometheusIncrementAuthMock).toHaveBeenCalledWith("ApeKey");
      expect(prometheusRecordAuthTimeMock).toHaveBeenCalledOnce();
    });
  });
});

async function authenticate(
  request: Partial<HttpRequest>,
  authenticationOptions?: RequestAuthenticationOptions,
): Promise<{ decodedToken: Auth.DecodedToken }> {
  const mergedRequest = {
    ...mockRequest,
    ...request,
    rawBody: request.rawBody ?? JSON.stringify(request.body ?? {}),
    tsRestRoute: {
      metadata: { authenticationOptions } as EndpointMetadata,
    },
  } as any;

  await invokeMiddleware(
    Auth.authenticateTsRestRequest(),
    mergedRequest,
    nextFunction,
  );

  return { decodedToken: mergedRequest.ctx.decodedToken };
}
