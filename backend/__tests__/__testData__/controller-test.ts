import { getRequestListener } from "@hono/node-server";
import request from "supertest";
import app from "../../src/app";
import { newId } from "../../src/utils/id";
import { BearerAuthenticationMock, mockBearerAuthentication } from "./auth";
import { beforeEach } from "vite-plus/test";
import TestAgent from "supertest/lib/agent";

export function setup(): {
  mockApp: TestAgent;
  uid: string;
  mockAuth: BearerAuthenticationMock;
} {
  const mockApp = request(getRequestListener(app.fetch));
  const uid = newId();
  const mockAuth = mockBearerAuthentication(uid);

  beforeEach(() => {
    mockAuth.beforeEach();
  });

  return { mockApp, uid, mockAuth };
}
