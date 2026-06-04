import { createHmac } from "crypto";
import type { IceServer } from "../../types";

const DEFAULT_STUN_URL = "stun:stun.l.google.com:19302";
const DEFAULT_TURN_TTL_SECONDS = 86400;

const mintTurnCredentials = (
  secret: string,
  ttlSeconds: number
): { username: string; credential: string } => {
  const expiry = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = String(expiry);
  const credential = createHmac("sha1", secret)
    .update(username)
    .digest("base64");
  return { username, credential };
};

export const buildIceServers = (): IceServer[] => {
  const iceServers: IceServer[] = [
    { urls: process.env.STUN_URL || DEFAULT_STUN_URL },
  ];

  const turnUrl = process.env.TURN_URL;
  const turnSecret = process.env.TURN_SECRET;

  if (turnUrl && turnSecret) {
    const ttl = Number(process.env.TURN_CREDENTIAL_TTL) || DEFAULT_TURN_TTL_SECONDS;
    const { username, credential } = mintTurnCredentials(turnSecret, ttl);
    iceServers.push({ urls: turnUrl, username, credential });
  }

  return iceServers;
};
