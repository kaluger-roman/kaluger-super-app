import type { IceServer } from "../../types";
import { DEFAULT_STUN_URL, DEFAULT_TURN_TTL_SECONDS } from "./callSignaling.constants";
import { mintTurnCredentials } from "./callSignaling.helpers";
import type { CallParticipant } from "./callSignaling.types";

export const buildIceServers = (participant: CallParticipant): IceServer[] => {
  const iceServers: IceServer[] = [{ urls: process.env.STUN_URL || DEFAULT_STUN_URL }];

  const turnUrl = process.env.TURN_URL;
  const turnSecret = process.env.TURN_SECRET;

  if (turnUrl && turnSecret) {
    const ttl = Number(process.env.TURN_CREDENTIAL_TTL) || DEFAULT_TURN_TTL_SECONDS;
    const { username, credential } = mintTurnCredentials(turnSecret, ttl, participant);
    iceServers.push({ urls: turnUrl, username, credential });
  }

  return iceServers;
};
