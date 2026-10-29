import type { Event, EventCallable, Store } from "effector";

import type { CallRole } from "@features/videoCall";

import type { ElsewhereReason, WebSocketClose } from "./webSocket.types";

export type SocketConnectionConfig = {
  path: string;
  role: CallRole;
  getToken: () => string | null;
  // Gets every parsed server message except the connection control ones.
  dispatch: (data: unknown) => void;
  reconnectDelayMs: number;
  // The tab became visible again.
  resumed: Event<void>;
  // The browser is online again.
  online: Event<void>;
  // The user opened this page for a call (tapped its notification): an explicit open, like a
  // take-over, so the call still ringing on another tab or device comes here.
  openedForCall: Event<unknown>;
  logLabel: string;
  // Close codes meaning the server revoked the token the socket used.
  revokedCloseCodes?: ReadonlySet<number>;
  // Runs once the reconnect delay passed; false ends reconnecting (the session is over).
  canResume?: (revokedToken: string | null) => boolean;
};

export type SocketOpenParams = {
  // An automatic reconnect: the server then keeps another tab's live socket.
  resume: boolean;
  // The tab's previous socket, closed before the new one opens.
  previous: WebSocket | null;
};

export type SocketClosedPayload = {
  ws: WebSocket;
  code: number;
  token: string;
};

export type CurrentSocketClosed = SocketClosedPayload & {
  // The server had registered the socket (connection_ready); otherwise it refused it.
  registered: boolean;
};

// connection_ready: the socket is registered; connection_waiting: another tab is in a call.
export type SocketControlMessage = "ready" | "waiting";

export type SocketReconnectUnits = {
  config: SocketConnectionConfig;
  openRequested: EventCallable<boolean>;
  reconnectRequested: Event<boolean>;
  disconnect: Event<void>;
  closed: Event<WebSocketClose>;
  tokenRenewed: EventCallable<void>;
  tokenRenewedHere: Event<void>;
  $isEnabled: Store<boolean>;
  $connection: Store<WebSocket | null>;
  $isConnected: Store<boolean>;
  $elsewhere: Store<ElsewhereReason | null>;
  $revokedToken: Store<string | null>;
  $isVisible: Store<boolean>;
};
