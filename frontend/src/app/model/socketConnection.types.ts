import type { Event, EventCallable, Store } from "effector";

import type { CallRole } from "@features/videoCall";

import type { ElsewhereReason, WebSocketClose } from "./webSocket.types";

export type SocketConnectionConfig = {
  path: string;
  role: CallRole;
  getToken: () => string | null;
  dispatch: (raw: string) => void;
  reconnectDelayMs: number;
  // The tab became visible again.
  resumed: Event<void>;
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

export type SocketReconnectUnits = {
  config: SocketConnectionConfig;
  openRequested: EventCallable<boolean>;
  disconnect: Event<void>;
  closed: Event<WebSocketClose>;
  tokenRenewed: EventCallable<void>;
  $isEnabled: Store<boolean>;
  $elsewhere: Store<ElsewhereReason | null>;
  $revokedToken: Store<string | null>;
};
