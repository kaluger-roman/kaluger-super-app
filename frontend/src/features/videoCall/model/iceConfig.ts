import type { IceServerPayload } from "./call.types";

export const buildRtcConfiguration = (
  iceServers: IceServerPayload[]
): RTCConfiguration => ({
  iceServers: iceServers.map((server) => ({
    urls: server.urls,
    ...(server.username ? { username: server.username } : {}),
    ...(server.credential ? { credential: server.credential } : {}),
  })),
  iceTransportPolicy: "all",
});
