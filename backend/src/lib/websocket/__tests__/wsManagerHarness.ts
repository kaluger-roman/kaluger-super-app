import { EventEmitter } from "events";
import { createServer } from "http";
import type { IncomingMessage, Server } from "http";
import { WebSocket } from "ws";

import { createCallPair, deleteCallPair } from "../../../__tests__/helpers";
import type { CallPair } from "../../../__tests__/helpers";
import type { CallerKindValue } from "../../../types";
import { prisma } from "../../prisma";
import { setWebSocketManager } from "../../wsManager";
import * as auth from "../auth";
import * as studentAuth from "../studentAuth";
import type { AuthenticatedStudentWebSocket, AuthenticatedWebSocket } from "../types";
import { WebSocketManager } from "../webSocketManager";

export type SocketStub = EventEmitter & {
  readyState: number;
  close: jest.Mock;
  send: jest.Mock<void, [string]>;
  ping: jest.Mock;
  terminate: jest.Mock;
};

export type SentMessage = { type: string; [key: string]: unknown };

// `closeOnTerminate` makes terminate() close the socket, as ws does. Off by default: with real
// timers a holder probe may fire after its test and must not report a call participant gone.
export const makeSocket = ({ closeOnTerminate = false } = {}): SocketStub => {
  const emitter = new EventEmitter() as SocketStub;
  emitter.readyState = WebSocket.OPEN;
  emitter.close = jest.fn();
  emitter.send = jest.fn();
  emitter.ping = jest.fn();
  emitter.terminate = jest.fn(() => {
    if (!closeOnTerminate) return;
    emitter.readyState = WebSocket.CLOSED;
    emitter.emit("close");
  });
  return emitter;
};

export const messagesOf = (ws: SocketStub): SentMessage[] =>
  ws.send.mock.calls.map(([raw]) => JSON.parse(raw));

// The connection is lost: the close handler reports it, and the call flow it starts settles.
export const dropSocket = async (ws: SocketStub): Promise<void> => {
  ws.readyState = WebSocket.CLOSED;
  ws.emit("close");
  await new Promise((resolve) => setImmediate(resolve));
};

// The ws server hands every upgraded socket to these private handlers; tests call them directly,
// and only here. Bracket access keeps the call type-checked against the handlers' signatures.
export const connectSocket = (
  manager: WebSocketManager,
  kind: CallerKindValue,
  ws: SocketStub,
  url?: string
): Promise<void> => {
  const request = { url } as IncomingMessage;
  return kind === "tutor"
    ? manager["handleConnection"](ws as unknown as AuthenticatedWebSocket, request)
    : manager["handleStudentConnection"](ws as unknown as AuthenticatedStudentWebSocket, request);
};

export const openSocket = async (
  manager: WebSocketManager,
  kind: CallerKindValue,
  url: string
): Promise<SocketStub> => {
  const ws = makeSocket();
  await connectSocket(manager, kind, ws, url);
  return ws;
};

export type CallPairManager = CallPair & { manager: WebSocketManager };

// A real manager and call flow for a seeded tutor–student pair; any token authenticates as them.
// The returned object is filled in by the hooks.
export const useCallPairManager = (): CallPairManager => {
  const harness = {} as CallPairManager;
  let server: Server;

  beforeAll(async () => {
    Object.assign(harness, await createCallPair());
  });

  beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    jest
      .spyOn(auth, "authenticateWebSocket")
      .mockResolvedValue({ userId: harness.tutorId, email: "t@e.com", tokenVersion: 0 });
    jest
      .spyOn(studentAuth, "authenticateStudentWebSocket")
      .mockResolvedValue({ studentUserId: harness.studentUserId, email: "s@e.com" });
    server = createServer();
    harness.manager = new WebSocketManager(server);
    setWebSocketManager(harness.manager);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await prisma.callRecord.deleteMany({ where: { tutorId: harness.tutorId } });
  });

  afterAll(() => deleteCallPair(harness));

  return harness;
};
