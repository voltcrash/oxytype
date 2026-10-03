import { getRequestListener } from "@hono/node-server";
import request from "supertest";
import app from "../../src/app";
import { ObjectId } from "mongodb";
import { BearerAuthenticationMock, mockBearerAuthentication } from "./auth";
import { beforeEach } from "vite-plus/test";
import TestAgent from "supertest/lib/agent";

export function setup(): {
  mockApp: TestAgent;
  uid: string;
  mockAuth: BearerAuthenticationMock;
} {
  const mockApp = request(getRequestListener(app.fetch));
  const uid = new ObjectId().toString();
  const mockAuth = mockBearerAuthentication(uid);

  beforeEach(() => {
    mockAuth.beforeEach();
  });

  return { mockApp, uid, mockAuth };
}
