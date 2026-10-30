const DEFAULT_LISTEN_HOST = "127.0.0.1";

// Loopback by default: with trust proxy 1 a client that reaches the port directly,
// bypassing nginx, sets X-Forwarded-For and so its own req.ip for rate limiting (#190).
// A container behind a proxy on another host sets HOST=0.0.0.0.
export const getListenHost = (): string => process.env.HOST?.trim() || DEFAULT_LISTEN_HOST;
