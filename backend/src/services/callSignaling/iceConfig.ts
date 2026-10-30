import type { IceServer } from "../../types";
import { isPublicProductionServer } from "../../utils";
import {
  DEFAULT_STUN_URL,
  DEFAULT_TURN_TTL_SECONDS,
  TURN_NOT_CONFIGURED_WARNING,
} from "./callSignaling.constants";
import { mintTurnCredentials, parseTurnUrls } from "./callSignaling.helpers";
import type { CallParticipant, TurnConfig } from "./callSignaling.types";

const getTurnConfig = (): TurnConfig | null => {
  const urls = parseTurnUrls(process.env.TURN_URL);
  const secret = process.env.TURN_SECRET?.trim();
  if (urls.length === 0 || !secret) return null;
  return { urls, secret };
};

export const isTurnConfigured = (): boolean => getTurnConfig() !== null;

export const buildIceServers = (participant: CallParticipant): IceServer[] => {
  const iceServers: IceServer[] = [{ urls: process.env.STUN_URL || DEFAULT_STUN_URL }];

  const turn = getTurnConfig();
  if (!turn) return iceServers;

  const ttl = Number(process.env.TURN_CREDENTIAL_TTL) || DEFAULT_TURN_TTL_SECONDS;
  const { username, credential } = mintTurnCredentials(turn.secret, ttl, participant);
  return [...iceServers, ...turn.urls.map((urls) => ({ urls, username, credential }))];
};

export const warnIfTurnNotConfigured = (): void => {
  if (isPublicProductionServer() && !isTurnConfigured()) {
    console.warn(TURN_NOT_CONFIGURED_WARNING);
  }
};
