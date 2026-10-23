import { createEffect, createEvent, createStore, sample, scopeBind } from "effector";

import { callModel, clearCallTransport, setCallTransport } from "@features/videoCall";
import type { CallRole } from "@features/videoCall";

import {
  buildSocketUrl,
  parseSocketMessage,
  toControlMessage,
  toSocketClose,
} from "./socketConnection.helpers";
import type {
  SocketClosedPayload,
  SocketConnectionConfig,
  SocketOpenParams,
} from "./socketConnection.types";
import * as socketReconnectModel from "./socketReconnect.model";
import { NO_REVOKED_CLOSE_CODES } from "./webSocket.constants";
import type { ElsewhereReason, WebSocketClose } from "./webSocket.types";

// One session-scoped socket of the tab: hands over between tabs and feeds the call transport.
export const createSocketConnection = (config: SocketConnectionConfig) => {
  const revokedCloseCodes = config.revokedCloseCodes ?? NO_REVOKED_CLOSE_CODES;

  const $connection = createStore<WebSocket | null>(null);
  const $isConnected = createStore(false);
  const $isEnabled = createStore(false);
  // Another tab or device of the same user holds the connection; this tab waits to get it back.
  const $elsewhere = createStore<ElsewhereReason | null>(null);
  const $revokedToken = createStore<string | null>(null);

  const connect = createEvent();
  const disconnect = createEvent();
  const ready = createEvent();
  const closed = createEvent<WebSocketClose>();
  // Another tab of the browser replaced the stored token.
  const tokenRenewed = createEvent();
  // This tab replaced the stored token itself (own password or email change).
  const tokenRenewedHere = createEvent();
  // true for an automatic reconnect, false for an explicit connect.
  const openRequested = createEvent<boolean>();
  const socketCreated = createEvent<WebSocket>();
  const socketReady = createEvent<WebSocket>();
  const socketWaiting = createEvent<WebSocket>();
  const socketClosed = createEvent<SocketClosedPayload>();

  const connectFx = createEffect(({ resume, previous }: SocketOpenParams): WebSocket | null => {
    previous?.close();
    const token = config.getToken();
    if (!token) return null;

    const onReady = scopeBind(socketReady, { safe: true });
    const onWaiting = scopeBind(socketWaiting, { safe: true });
    const onClosed = scopeBind(socketClosed, { safe: true });
    const ws = new WebSocket(buildSocketUrl(config.path, token, resume));
    ws.onmessage = (event) => {
      const data = parseSocketMessage(event.data, config.logLabel);
      const control = toControlMessage(data);
      if (control === "ready") onReady(ws);
      else if (control === "waiting") onWaiting(ws);
      else if (data !== undefined) config.dispatch(data);
    };
    ws.onclose = (event) => {
      console.log(`${config.logLabel} disconnected`);
      onClosed({ ws, code: event.code, token });
    };
    ws.onerror = (error) => {
      console.error(`${config.logLabel} error:`, error);
    };
    // Stored before the handshake, so an early disconnect still closes this socket.
    socketCreated(ws);
    return ws;
  });

  const attachTransportFx = createEffect((ws: WebSocket) => {
    console.log(`${config.logLabel} connected`);
    setCallTransport(config.role, (message) => ws.send(JSON.stringify(message)), ws);
  });

  // The transport registry knows which socket carries a role, so any closed socket may detach.
  const detachTransportFx = createEffect((ws: WebSocket): CallRole | null =>
    clearCallTransport(ws)
  );

  const disconnectFx = createEffect((ws: WebSocket | null) => {
    ws?.close();
  });

  sample({ clock: connect, fn: () => true, target: $isEnabled });
  sample({ clock: disconnect, fn: () => false, target: $isEnabled });
  sample({ clock: connect, fn: () => false, target: openRequested });
  sample({
    clock: openRequested,
    source: $connection,
    fn: (previous, resume): SocketOpenParams => ({ resume, previous }),
    target: connectFx,
  });
  sample({ clock: socketCreated, target: $connection });
  sample({ clock: disconnect, source: $connection, target: disconnectFx });
  sample({ clock: disconnectFx.done, fn: () => null, target: $connection });

  sample({ clock: socketClosed, fn: ({ ws }) => ws, target: detachTransportFx });
  sample({
    clock: detachTransportFx.doneData,
    filter: (role): role is CallRole => role !== null,
    target: callModel.transportDisconnected,
  });

  // Events of a socket this tab already replaced must not touch the state of the current one.
  const currentReady = sample({
    clock: socketReady,
    source: $connection,
    filter: (current, ws) => current === ws,
    fn: (_, ws) => ws,
  });
  sample({ clock: currentReady, target: attachTransportFx });
  sample({ clock: currentReady, fn: () => undefined, target: ready });
  sample({
    clock: socketWaiting,
    source: $connection,
    filter: (current, ws) => current === ws,
    fn: (): ElsewhereReason => "call",
    target: $elsewhere,
  });
  sample({
    clock: socketClosed,
    source: { current: $connection, elsewhere: $elsewhere },
    filter: ({ current }, { ws }) => current === ws,
    fn: ({ elsewhere }, payload) => toSocketClose(payload, revokedCloseCodes, elsewhere),
    target: closed,
  });

  sample({ clock: ready, fn: () => true, target: $isConnected });
  sample({ clock: [closed, socketCreated, disconnect], fn: () => false, target: $isConnected });
  sample({ clock: closed, fn: () => null, target: $connection });
  // Cleared only once this tab holds the connection again, so a refused retry does not flicker.
  sample({ clock: closed, fn: ({ elsewhere }) => elsewhere, target: $elsewhere });
  sample({ clock: [ready, disconnect], fn: () => null, target: $elsewhere });
  sample({ clock: closed, fn: ({ revokedToken }) => revokedToken, target: $revokedToken });
  sample({ clock: openRequested, fn: () => null, target: $revokedToken });

  socketReconnectModel.attachSocketReconnect({
    config,
    openRequested,
    disconnect,
    closed,
    tokenRenewed,
    tokenRenewedHere,
    $isEnabled,
    $elsewhere,
    $revokedToken,
  });

  return {
    connect,
    disconnect,
    ready,
    closed,
    tokenRenewed,
    tokenRenewedHere,
    connectFx,
    $connection,
    $isConnected,
    $isEnabled,
    $elsewhere,
  };
};
