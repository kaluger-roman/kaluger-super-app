// The server's reconnect grace period (3 min) plus a margin: a call not restored by then is over.
export const LOCAL_GRACE_TIMEOUT_MS = 190_000;
// The server's ring timeout (40 s) plus a margin: a call that still rang when its socket was lost
// has rung out by then. One the callee answered meanwhile comes back with the next snapshot.
export const RINGING_GRACE_TIMEOUT_MS = 45_000;
