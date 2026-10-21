export const TUTOR_WS_PATH = "/ws";
export const STUDENT_WS_PATH = "/ws/student";

export const REPLACED_CLOSE_CODE = 4000;
export const TOKEN_REVOKED_CLOSE_CODE = 4001;
// Sent to the sockets that waited for the user's call in another tab to end.
export const CALL_ENDED_CLOSE_CODE = 4003;
// A client that never answers the close frame would otherwise hold the socket for ws's 30 s.
export const REVOKED_SOCKET_TERMINATE_MS = 1000;

// A socket that has not answered the previous ping is dead (network switch, sleep) and is
// terminated, so it stops holding the connection for its user.
export const HEARTBEAT_INTERVAL_MS = 30_000;

export const TAB_ID_PATTERN = /^[A-Za-z0-9-]{1,64}$/;

// Tabs opened while the user is in a call wait for it to end; a few are enough, the oldest goes.
export const MAX_WAITING_SOCKETS_PER_USER = 4;

// Sent once the socket is registered; a refused socket is closed without it.
export const CONNECTION_READY_MESSAGE = JSON.stringify({ type: "connection_ready" });
// Sent to a socket kept open, unregistered, while the user's call goes on in another tab.
export const CONNECTION_WAITING_MESSAGE = JSON.stringify({
  type: "connection_waiting",
  reason: "call",
});
